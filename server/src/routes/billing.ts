import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { requireAuth, requireAdmin } from '../middlewares/auth';
import { billingService } from '../services/billingService';

const router = Router();

router.get(
  '/summary',
  requireAuth,
  requireAdmin,
  expressAsyncHandler(async (_req: Request, res: Response) => {
    const summary = await billingService.getCurrentMonthSummary();
    res.json(summary);
  })
);

router.get(
  '/revenue',
  requireAuth,
  requireAdmin,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const months = parseInt(req.query.months as string) || 6;
    const revenue = await billingService.getMonthlyRevenue(months);
    res.json({ revenue });
  })
);

router.get(
  '/stats',
  requireAuth,
  requireAdmin,
  expressAsyncHandler(async (_req: Request, res: Response) => {
    const stats = await billingService.getSubscriptionStats();
    res.json(stats);
  })
);

router.get(
  '/subscribers',
  requireAuth,
  requireAdmin,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const subscribers = await billingService.getSubscribers(limit);
    res.json({ subscribers });
  })
);

export default router;
