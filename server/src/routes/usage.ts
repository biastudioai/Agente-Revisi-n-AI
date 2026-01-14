import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import prisma from '../config/database';
import { requireAuth } from '../middlewares/auth';

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
      const now = new Date();
      const periodYear = now.getFullYear();
      const periodMonth = now.getMonth() + 1;

      let usageRecord = await prisma.usageRecord.findUnique({
        where: {
          userId_periodYear_periodMonth: {
            userId,
            periodYear,
            periodMonth,
          },
        },
      });

      if (!usageRecord) {
        usageRecord = await prisma.usageRecord.create({
          data: {
            userId,
            periodYear,
            periodMonth,
            reportsUsed: 0,
            reportsLimit: 20,
          },
        });
      }

      res.json({
        periodYear,
        periodMonth,
        reportsUsed: usageRecord.reportsUsed,
        reportsLimit: usageRecord.reportsLimit,
        remaining: usageRecord.reportsLimit - usageRecord.reportsUsed,
      });
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
      const now = new Date();
      const periodYear = now.getFullYear();
      const periodMonth = now.getMonth() + 1;

      const usageRecord = await prisma.usageRecord.upsert({
        where: {
          userId_periodYear_periodMonth: {
            userId,
            periodYear,
            periodMonth,
          },
        },
        update: {
          reportsUsed: {
            increment: 1,
          },
        },
        create: {
          userId,
          periodYear,
          periodMonth,
          reportsUsed: 1,
          reportsLimit: 20,
        },
      });

      if (usageRecord.reportsUsed > usageRecord.reportsLimit) {
        res.status(403).json({ 
          error: 'Límite de informes alcanzado',
          reportsUsed: usageRecord.reportsUsed - 1,
          reportsLimit: usageRecord.reportsLimit,
        });
        return;
      }

      res.json({
        success: true,
        periodYear,
        periodMonth,
        reportsUsed: usageRecord.reportsUsed,
        reportsLimit: usageRecord.reportsLimit,
        remaining: usageRecord.reportsLimit - usageRecord.reportsUsed,
      });
    } catch (error) {
      console.error('Error incrementing usage:', error);
      res.status(500).json({ error: 'Error al registrar uso' });
    }
  })
);

export default router;
