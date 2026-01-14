import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth';
import formsRoutes from './routes/forms';
import rulesRoutes from './routes/rules';
import usageRoutes from './routes/usage';
import stripeRoutes from './routes/stripe';
import billingRoutes from './routes/billing';
import prisma from './config/database';
import { registerObjectStorageRoutes } from '../replit_integrations/object_storage';
import { runMigrations } from 'stripe-replit-sync';
import { getStripeSync } from './services/stripeClient';
import { WebhookHandlers } from './services/webhookHandlers';
import { subscriptionService } from './services/subscriptionService';
import { PlanType } from './generated/prisma';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5000',
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
      
      if (event.type === 'customer.subscription.created') {
        const subscription = event.data.object;
        const planType = subscription.metadata?.planType as PlanType;
        if (planType) {
          await subscriptionService.handleSubscriptionCreated(
            subscription.id,
            subscription.customer,
            planType
          );
        }
      } else if (event.type === 'customer.subscription.updated') {
        await subscriptionService.handleSubscriptionUpdated(event.data.object.id);
      } else if (event.type === 'customer.subscription.deleted') {
        await subscriptionService.handleSubscriptionDeleted(event.data.object.id);
      } else if (event.type === 'invoice.payment_failed') {
        await subscriptionService.handleInvoicePaymentFailed(event.data.object.customer);
      }

      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error.message);
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

app.use('/api/auth', authRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/rules', rulesRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/billing', billingRoutes);

registerObjectStorageRoutes(app);

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
      databaseUrl,
      schema: 'stripe'
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
    await prisma.$connect();
    console.log('Database connected successfully');

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
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

startServer();
