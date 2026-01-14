import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { requireAuth } from '../middlewares/auth';
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
    }));
    res.json({ plans });
  })
);

router.get(
  '/subscription',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    const subscription = await subscriptionService.getActiveSubscription(userId);
    res.json({ subscription });
  })
);

router.post(
  '/create-checkout',
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

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    const session = await subscriptionService.createCheckoutSession(
      userId,
      email,
      planType as PlanType,
      `${baseUrl}/?subscription=success`,
      `${baseUrl}/?subscription=cancelled`
    );

    res.json({ url: session.url });
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

    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

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

export default router;
