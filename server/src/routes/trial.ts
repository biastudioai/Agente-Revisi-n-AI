import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { requireAuth, requireAdmin } from '../middlewares/auth';
import prisma from '../config/database';
import { SubscriptionStatus } from '../generated/prisma';

const router = Router();

router.get(
  '/dashboard',
  requireAuth,
  requireAdmin,
  expressAsyncHandler(async (_req: Request, res: Response) => {
    const trialUsers = await prisma.user.findMany({
      where: {
        OR: [
          { isTrial: true },
          { trialConvertedAt: { not: null } },
        ],
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        isTrial: true,
        freeReportsUsed: true,
        freeReportsLimit: true,
        trialExpiresAt: true,
        trialConvertedAt: true,
        createdAt: true,
        subscriptions: {
          where: {
            status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
          },
          select: {
            planType: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const users = trialUsers.map(u => {
      let status: 'active' | 'expired' | 'converted';
      if (u.trialConvertedAt || (!u.isTrial && u.subscriptions.length > 0)) {
        status = 'converted';
      } else if (
        (u.trialExpiresAt && now >= u.trialExpiresAt) ||
        u.freeReportsUsed >= u.freeReportsLimit
      ) {
        status = 'expired';
      } else {
        status = 'active';
      }

      return {
        id: u.id,
        email: u.email,
        nombre: u.nombre,
        freeReportsUsed: u.freeReportsUsed,
        freeReportsLimit: u.freeReportsLimit,
        trialExpiresAt: u.trialExpiresAt?.toISOString() || null,
        trialConvertedAt: u.trialConvertedAt?.toISOString() || null,
        createdAt: u.createdAt.toISOString(),
        status,
        convertedPlan: u.subscriptions[0]?.planType || null,
      };
    });

    const totalTrialUsers = users.length;
    const activeTrials = users.filter(u => u.status === 'active').length;
    const expiredTrials = users.filter(u => u.status === 'expired').length;
    const convertedTrials = users.filter(u => u.status === 'converted').length;
    const conversionRate = totalTrialUsers > 0 
      ? Math.round((convertedTrials / totalTrialUsers) * 100) 
      : 0;
    const avgReportsUsed = totalTrialUsers > 0
      ? Math.round((users.reduce((sum, u) => sum + u.freeReportsUsed, 0) / totalTrialUsers) * 10) / 10
      : 0;

    res.json({
      users,
      metrics: {
        totalTrialUsers,
        activeTrials,
        expiredTrials,
        convertedTrials,
        conversionRate,
        avgReportsUsed,
      },
    });
  })
);

export default router;
