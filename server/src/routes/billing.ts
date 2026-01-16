import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { requireAuth, requireAdmin } from '../middlewares/auth';
import { billingService } from '../services/billingService';
import { discountCodeService } from '../services/discountCodeService';
import { DiscountType, DiscountUsageType } from '../generated/prisma';

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

router.get(
  '/discount-codes',
  requireAuth,
  requireAdmin,
  expressAsyncHandler(async (_req: Request, res: Response) => {
    const codes = await discountCodeService.listDiscountCodes();
    res.json({ codes });
  })
);

router.post(
  '/discount-codes',
  requireAuth,
  requireAdmin,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { code, description, discountType, discountValue, usageType, maxRedemptions, validFrom, validUntil } = req.body;

    if (!code || !discountType || !discountValue || !usageType) {
      res.status(400).json({ error: 'Faltan campos requeridos' });
      return;
    }

    if (!Object.values(DiscountType).includes(discountType)) {
      res.status(400).json({ error: 'Tipo de descuento inválido' });
      return;
    }

    if (!Object.values(DiscountUsageType).includes(usageType)) {
      res.status(400).json({ error: 'Tipo de uso inválido' });
      return;
    }

    if (discountType === 'PERCENTAGE' && (discountValue < 1 || discountValue > 100)) {
      res.status(400).json({ error: 'El porcentaje debe estar entre 1 y 100' });
      return;
    }

    if (discountType === 'FIXED_AMOUNT' && discountValue < 1) {
      res.status(400).json({ error: 'El monto debe ser mayor a 0' });
      return;
    }

    try {
      const discountCode = await discountCodeService.createDiscountCode({
        code,
        description,
        discountType,
        discountValue,
        usageType,
        maxRedemptions: maxRedemptions ? parseInt(maxRedemptions) : undefined,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil ? new Date(validUntil) : undefined,
      });

      res.json({ discountCode });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

router.get(
  '/discount-codes/:id',
  requireAuth,
  requireAdmin,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const code = await discountCodeService.getDiscountCode(id);
    
    if (!code) {
      res.status(404).json({ error: 'Código no encontrado' });
      return;
    }

    res.json({ code });
  })
);

router.patch(
  '/discount-codes/:id/toggle',
  requireAuth,
  requireAdmin,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'Se requiere isActive (boolean)' });
      return;
    }

    try {
      const code = await discountCodeService.toggleDiscountCode(id, isActive);
      res.json({ code });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  })
);

export default router;
