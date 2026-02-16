import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import authRoutes from './routes/auth';
import formsRoutes from './routes/forms';
import rulesRoutes from './routes/rules';
import usageRoutes from './routes/usage';
import stripeRoutes from './routes/stripe';
import billingRoutes from './routes/billing';
import reportsRoutes from './routes/reports';
import auditorsRoutes from './routes/auditors';
import setupRoutes from './routes/setup';
import analyzeRoutes from './routes/analyze';
import trialRoutes from './routes/trial';
import { initializeDatabase, getPrisma, closeDatabaseConnection } from './config/database';
import { registerObjectStorageRoutes } from '../replit_integrations/object_storage';
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync, getUncachableStripeClient } from './services/stripeClient';
import { WebhookHandlers } from './services/webhookHandlers';
import { subscriptionService } from './services/subscriptionService';
import { discountCodeService } from './services/discountCodeService';
import { PlanType } from './generated/prisma';

const app = express();
app.set('trust proxy', 1);
const isProduction = process.env.NODE_ENV === 'production';
const PORT = isProduction ? (process.env.PORT || 5000) : 3001;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://js.stripe.com", "https://cdn.tailwindcss.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "blob:", "https://api.stripe.com", "https://*.replit.dev", "https://*.repl.co", "https://*.replit.app"],
      frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
      objectSrc: ["'none'"],
      workerSrc: ["'self'", "blob:", "https://cdnjs.cloudflare.com"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

const getAllowedOrigins = (): Set<string> => {
  const origins = new Set<string>();
  if (process.env.FRONTEND_URL) {
    try {
      const url = new URL(process.env.FRONTEND_URL);
      origins.add(url.origin);
    } catch {}
  }
  if (process.env.REPLIT_DOMAINS) {
    const domains = process.env.REPLIT_DOMAINS.split(',');
    domains.forEach(domain => {
      const trimmed = domain.trim();
      if (trimmed) {
        origins.add(`https://${trimmed}`);
      }
    });
  }
  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.add(`https://${process.env.REPLIT_DEV_DOMAIN.trim()}`);
  }
  if (!isProduction) {
    origins.add('http://localhost:5000');
    origins.add('http://localhost:3000');
  }
  return origins.size > 0 ? origins : new Set(['http://localhost:5000']);
};

const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return true;
  const allowedOrigins = getAllowedOrigins();
  try {
    const requestOrigin = new URL(origin).origin;
    return allowedOrigins.has(requestOrigin);
  } catch {
    return false;
  }
};

app.use(cors({
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
}));

app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature' });
    }

    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;

      if (!Buffer.isBuffer(req.body)) {
        console.error('STRIPE WEBHOOK ERROR: req.body is not a Buffer');
        return res.status(500).json({ error: 'Webhook processing error' });
      }

      await WebhookHandlers.processWebhook(req.body as Buffer, sig);

      const event = JSON.parse(req.body.toString());
      console.log(`Stripe webhook received: ${event.type}`);
      
      if (event.type === 'customer.subscription.created') {
        const subscription = event.data.object;
        const planType = subscription.metadata?.planType as PlanType;
        console.log(`Subscription created: ${subscription.id}, customer: ${subscription.customer}, planType: ${planType}`);
        if (planType) {
          await subscriptionService.handleSubscriptionCreated(
            subscription.id,
            subscription.customer,
            planType
          );
          console.log(`Subscription ${subscription.id} created successfully in database`);
          
          try {
            const prismaDb = (await import('./config/database')).default;
            const stripeCustomer = await prismaDb.stripeCustomer.findUnique({
              where: { stripeCustomerId: subscription.customer as string },
            });
            if (stripeCustomer) {
              const trialUser = await prismaDb.user.findUnique({
                where: { id: stripeCustomer.userId },
                select: { isTrial: true },
              });
              if (trialUser?.isTrial) {
                await prismaDb.user.update({
                  where: { id: stripeCustomer.userId },
                  data: { 
                    isTrial: false,
                    trialConvertedAt: new Date(),
                  },
                });
                console.log(`Trial user ${stripeCustomer.userId} converted to paid subscription`);
              }
            }
          } catch (convError) {
            console.error('Error converting trial user:', convError);
          }
        } else {
          console.warn(`No planType in subscription metadata for ${subscription.id}`);
        }
      } else if (event.type === 'customer.subscription.updated') {
        console.log(`Subscription updated: ${event.data.object.id}`);
        await subscriptionService.handleSubscriptionUpdated(event.data.object.id);
      } else if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        console.log(`Subscription deleted: ${subscription.id}`);
        
        // Check if there's a scheduled downgrade for this subscription
        const dbSub = await (await import('./config/database')).default.subscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });
        
        if (dbSub?.scheduledPlanType) {
          console.log(`Processing scheduled downgrade from ${dbSub.planType} to ${dbSub.scheduledPlanType} for user ${dbSub.userId}`);
          await subscriptionService.handleScheduledDowngrade(subscription.id);
        } else if (dbSub && !dbSub.scheduledPlanType) {
          // No scheduled downgrade, this is a real cancellation - charge any pending extras
          console.log(`Processing final extras charge for cancelled subscription of user ${dbSub.userId}`);
          const extrasResult = await subscriptionService.handleSubscriptionCancellationWithExtras(dbSub.userId);
          if (extrasResult.extraReportsCount > 0) {
            console.log(`Charged ${extrasResult.extraReportsCount} extra reports ($${extrasResult.extraChargesMxn} MXN) for user ${dbSub.userId}, invoice: ${extrasResult.invoiceId}`);
          }
        }
        
        await subscriptionService.handleSubscriptionDeleted(subscription.id);
      } else if (event.type === 'invoice.created') {
        const invoice = event.data.object;
        console.log(`Invoice created: ${invoice.id}, customer: ${invoice.customer}, subscription: ${invoice.subscription}`);
        await subscriptionService.handleInvoiceCreated(
          invoice.id,
          invoice.customer as string,
          invoice.subscription as string | null
        );
      } else if (event.type === 'invoice.payment_succeeded') {
        const invoice = event.data.object;
        console.log(`Invoice payment succeeded: ${invoice.id}, customer: ${invoice.customer}`);
        await subscriptionService.handleInvoicePaymentSucceeded(
          invoice.id,
          invoice.customer as string,
          invoice.subscription as string | null
        );
      } else if (event.type === 'invoice.payment_failed') {
        console.log(`Invoice payment failed for customer: ${event.data.object.customer}`);
        await subscriptionService.handleInvoicePaymentFailed(event.data.object.customer);
      } else if (event.type === 'checkout.session.completed') {
        const sessionFromEvent = event.data.object as any;
        console.log(`Checkout session completed: ${sessionFromEvent.id}`);
        
        // Retrieve the full session with expanded data to get discount info
        const stripe = await getUncachableStripeClient();
        const session = await stripe.checkout.sessions.retrieve(sessionFromEvent.id, {
          expand: ['discounts', 'total_details.breakdown'],
        });
        
        console.log(`Session discounts:`, JSON.stringify(session.discounts, null, 2));
        console.log(`Session total_details:`, JSON.stringify(session.total_details, null, 2));
        
        // Check for applied discounts - Stripe puts them in session.discounts array
        if (session.discounts && session.discounts.length > 0) {
          const discountObj = session.discounts[0] as any;
          // discountObj can be a string (promo code ID) or an object with promotion_code
          const promoCodeId = typeof discountObj === 'string' 
            ? discountObj 
            : (discountObj.promotion_code || discountObj);
          
          console.log(`Promo code ID from session: ${promoCodeId}, userId: ${session.metadata?.userId}`);
          
          if (promoCodeId && session.metadata?.userId) {
            try {
              const discountCode = await discountCodeService.findByStripePromoCodeId(promoCodeId);
              console.log(`Found discount code in DB:`, discountCode ? discountCode.code : 'not found');
              
              if (discountCode) {
                const amountDiscounted = (session.total_details as any)?.amount_discount || 0;
                await discountCodeService.recordUsage(
                  discountCode.id,
                  session.metadata.userId,
                  amountDiscounted
                );
                console.log(`Discount code usage recorded: ${discountCode.code} by user ${session.metadata.userId}`);
              }
            } catch (error: any) {
              console.error(`Error recording discount code usage: ${error.message}`);
            }
          }
        }
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message, error.stack);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ limit: '35mb', extended: true }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Por favor espera 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/validate' || req.path === '/me',
});

const strictAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de recuperación. Por favor espera 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/password-reset', strictAuthLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/auditors', auditorsRoutes);
app.use('/api/setup', setupRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/trial', trialRoutes);

registerObjectStorageRoutes(app);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

if (isProduction) {
  const distPath = path.join(__dirname, '..', '..', 'dist');
  const attachedAssetsPath = path.join(__dirname, '..', '..', 'attached_assets');
  app.use(express.static(distPath));
  app.use('/attached_assets', express.static(attachedAssetsPath));
  
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/objects')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' 
  });
});

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.warn('DATABASE_URL not set, skipping Stripe initialization');
    return;
  }

  try {
    console.log('Initializing Stripe schema...');
    await runMigrations({ 
      databaseUrl
    });
    console.log('Stripe schema ready');

    const stripeSync = await getStripeSync();

    console.log('Setting up managed webhook...');
    const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
    if (domains.length > 0 && domains[0]) {
      const webhookBaseUrl = `https://${domains[0]}`;
      try {
        const result = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        if (result?.webhook?.url) {
          console.log(`Webhook configured: ${result.webhook.url}`);
        } else {
          console.log('Webhook created but URL not available');
        }
      } catch (webhookError: any) {
        console.warn('Could not setup managed webhook:', webhookError.message);
      }
    } else {
      console.log('No REPLIT_DOMAINS found, skipping webhook setup');
    }

    console.log('Syncing Stripe data...');
    stripeSync.syncBackfill()
      .then(() => console.log('Stripe data synced'))
      .catch((err: any) => console.error('Error syncing Stripe data:', err));
  } catch (error) {
    console.error('Failed to initialize Stripe:', error);
  }
}

async function startServer() {
  try {
    await initializeDatabase();

    await initStripe();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDatabaseConnection();
  process.exit(0);
});

startServer();
