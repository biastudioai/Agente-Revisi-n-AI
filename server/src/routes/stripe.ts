import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { requireAuth, requireAuthAllowNoSubscription } from '../middlewares/auth';
import { subscriptionService } from '../services/subscriptionService';
import { usageService } from '../services/usageService';
import { PLAN_CONFIGS } from '../config/plans';
import { PlanType } from '../generated/prisma';
import { getStripePublishableKey } from '../services/stripeClient';

const router = Router();

router.get(
  '/publishable-key',
  expressAsyncHandler(async (_req: Request, res: Response) => {
    const key = await getStripePublishableKey();
    res.json({ publishableKey: key });
  })
);

router.get(
  '/plans',
  expressAsyncHandler(async (_req: Request, res: Response) => {
    const plans = Object.values(PLAN_CONFIGS).map(plan => ({
      planType: plan.planType,
      name: plan.name,
      priceMonthlyMxn: plan.priceMonthlyMxn,
      reportsIncluded: plan.reportsIncluded,
      reportsIncludedPromotion: plan.reportsIncludedPromotion,
      extraReportPriceMxn: plan.extraReportPriceMxn,
      extraReportPricePromotionMxn: plan.extraReportPricePromotionMxn,
      promotionDurationMonths: plan.promotionDurationMonths,
      maxBrokers: plan.maxBrokers,
      maxAuditors: plan.maxAuditors,
      benefits: plan.benefits,
    }));
    res.json({ plans });
  })
);

router.get(
  '/subscription',
  requireAuthAllowNoSubscription,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.rol;
    
    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    let subscriptionUserId = userId;

    if (userRole === 'AUDITOR') {
      const prisma = (await import('../config/database')).default;
      const auditor = await prisma.user.findUnique({
        where: { id: userId },
        select: { parentId: true },
      });
      if (auditor?.parentId) {
        subscriptionUserId = auditor.parentId;
      }
    }

    const subscription = await subscriptionService.getActiveSubscription(subscriptionUserId);
    
    if (subscription && userRole === 'AUDITOR') {
      (subscription as any).isFromBroker = true;
    }

    res.json({ subscription });
  })
);

router.post(
  '/create-checkout',
  requireAuthAllowNoSubscription,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const email = (req as any).user?.email;
    const { planType } = req.body;

    if (!userId || !email) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    if (!planType || !Object.values(PlanType).includes(planType)) {
      res.status(400).json({ error: 'Plan inválido' });
      return;
    }

    const replitDomains = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || '';
    const primaryDomain = replitDomains.split(',')[0]?.trim();
    const baseUrl = primaryDomain ? `https://${primaryDomain}` : `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;

    try {
      const session = await subscriptionService.createCheckoutSession(
        userId,
        email,
        planType as PlanType,
        `${baseUrl}/?subscription=success`,
        `${baseUrl}/?subscription=cancelled`
      );

      res.json({ url: session.url });
    } catch (error: any) {
      // Return user-friendly error for active subscription
      if (error.message.includes('suscripción activa')) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  })
);

router.post(
  '/customer-portal',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const replitDomains = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || '';
    const primaryDomain = replitDomains.split(',')[0]?.trim();
    const baseUrl = primaryDomain ? `https://${primaryDomain}` : `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;

    try {
      const session = await subscriptionService.createCustomerPortalSession(
        userId,
        `${baseUrl}/`
      );
      res.json({ url: session.url });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

router.get(
  '/usage',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const usage = await usageService.getCurrentUsage(userId);
    res.json(usage);
  })
);

router.get(
  '/usage/history',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const months = parseInt(req.query.months as string) || 6;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const history = await usageService.getUsageHistory(userId, months);
    res.json({ history });
  })
);

router.post(
  '/sync-subscriptions',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userRol = (req as any).user?.rol;

    if (userRol !== 'ADMIN') {
      res.status(403).json({ error: 'Solo administradores pueden sincronizar suscripciones' });
      return;
    }

    const result = await subscriptionService.syncStripeSubscriptions();
    res.json(result);
  })
);

router.post(
  '/cancel-duplicates',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userRol = (req as any).user?.rol;

    if (userRol !== 'ADMIN') {
      res.status(403).json({ error: 'Solo administradores pueden cancelar suscripciones duplicadas' });
      return;
    }

    const result = await subscriptionService.cancelDuplicateStripeSubscriptions();
    res.json(result);
  })
);

router.post(
  '/change-plan',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const email = (req as any).user?.email;
    const { planType } = req.body;

    if (!userId || !email) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    if (!planType || !Object.values(PlanType).includes(planType)) {
      res.status(400).json({ error: 'Plan inválido' });
      return;
    }

    const replitDomains = process.env.REPLIT_DOMAINS || process.env.REPLIT_DEV_DOMAIN || '';
    const primaryDomain = replitDomains.split(',')[0]?.trim();
    const baseUrl = primaryDomain ? `https://${primaryDomain}` : `${req.headers['x-forwarded-proto'] || req.protocol}://${req.get('host')}`;

    const result = await subscriptionService.changePlan(
      userId,
      email,
      planType as PlanType,
      `${baseUrl}/?subscription=success`,
      `${baseUrl}/?subscription=cancelled`
    );

    if (result.type === 'error') {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json(result);
  })
);

router.post(
  '/cancel-subscription',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const result = await subscriptionService.cancelSubscription(userId);
    
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json(result);
  })
);

router.post(
  '/reactivate-subscription',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const result = await subscriptionService.reactivateSubscription(userId);
    
    if (!result.success) {
      res.status(400).json({ error: result.message });
      return;
    }

    res.json(result);
  })
);

export default router;
