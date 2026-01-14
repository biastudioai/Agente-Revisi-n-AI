import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { requireAuth } from '../middlewares/auth';
import { usageService } from '../services/usageService';

const router = Router();

router.get(
  '/current',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    try {
      const usage = await usageService.getCurrentUsage(userId);
      res.json(usage);
    } catch (error) {
      console.error('Error fetching usage:', error);
      res.status(500).json({ error: 'Error al obtener uso' });
    }
  })
);

router.post(
  '/increment',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'No autorizado' });
      return;
    }

    try {
      const result = await usageService.incrementUsage(userId);

      if (!result.success) {
        res.status(403).json({ 
          error: result.error,
          usage: result.usage,
        });
        return;
      }

      res.json({
        success: true,
        isExtra: result.isExtra,
        extraChargeMxn: result.extraChargeMxn,
        ...result.usage,
      });
    } catch (error) {
      console.error('Error incrementing usage:', error);
      res.status(500).json({ error: 'Error al registrar uso' });
    }
  })
);

export default router;
