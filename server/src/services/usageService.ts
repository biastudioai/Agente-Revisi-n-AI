import prisma from '../config/database';
import { PlanType } from '../generated/prisma';
import { getReportsLimit, getExtraReportPrice, PLAN_CONFIGS } from '../config/plans';
import { subscriptionService } from './subscriptionService';

export interface UsageInfo {
  periodYear: number;
  periodMonth: number;
  reportsUsed: number;
  reportsLimit: number;
  remaining: number;
  extraReportsUsed: number;
  extraChargesMxn: number;
  planType: PlanType | null;
  isInPromotion: boolean;
  extraReportPriceMxn: number;
  hasActiveSubscription: boolean;
  isAdmin?: boolean;
}

const ADMIN_UNLIMITED_LIMIT = 999999;

export class UsageService {
  private async isUserAdmin(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { rol: true },
    });
    return user?.rol === 'ADMIN';
  }

  async getCurrentUsage(userId: string): Promise<UsageInfo> {
    const now = new Date();
    const periodYear = now.getFullYear();
    const periodMonth = now.getMonth() + 1;

    const isAdmin = await this.isUserAdmin(userId);
    
    if (isAdmin) {
      let usageRecord = await prisma.usageRecord.findUnique({
        where: {
          userId_periodYear_periodMonth: {
            userId,
            periodYear,
            periodMonth,
          },
        },
      });

      return {
        periodYear,
        periodMonth,
        reportsUsed: usageRecord?.reportsUsed || 0,
        reportsLimit: ADMIN_UNLIMITED_LIMIT,
        remaining: ADMIN_UNLIMITED_LIMIT,
        extraReportsUsed: 0,
        extraChargesMxn: 0,
        planType: null,
        isInPromotion: false,
        extraReportPriceMxn: 0,
        hasActiveSubscription: true,
        isAdmin: true,
      };
    }

    const subscription = await subscriptionService.getActiveSubscription(userId);
    
    const hasActiveSubscription = !!subscription;
    const planType = subscription?.planType || null;
    const isInPromotion = subscription?.isInPromotion || false;
    const reportsLimit = subscription?.reportsLimit || 0;
    const extraReportPriceMxn = subscription?.extraReportPrice || 0;

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
          reportsLimit,
          extraReportsUsed: 0,
          extraChargesMxn: 0,
        },
      });
    } else if (usageRecord.reportsLimit !== reportsLimit) {
      usageRecord = await prisma.usageRecord.update({
        where: { id: usageRecord.id },
        data: { reportsLimit },
      });
    }

    return {
      periodYear,
      periodMonth,
      reportsUsed: usageRecord.reportsUsed,
      reportsLimit: usageRecord.reportsLimit,
      remaining: Math.max(0, usageRecord.reportsLimit - usageRecord.reportsUsed),
      extraReportsUsed: usageRecord.extraReportsUsed,
      extraChargesMxn: usageRecord.extraChargesMxn,
      planType,
      isInPromotion,
      extraReportPriceMxn,
      hasActiveSubscription,
    };
  }

  async incrementUsage(userId: string): Promise<{
    success: boolean;
    isExtra: boolean;
    extraChargeMxn: number;
    usage: UsageInfo;
    error?: string;
  }> {
    const now = new Date();
    const periodYear = now.getFullYear();
    const periodMonth = now.getMonth() + 1;

    const isAdmin = await this.isUserAdmin(userId);
    
    if (isAdmin) {
      await prisma.usageRecord.upsert({
        where: {
          userId_periodYear_periodMonth: {
            userId,
            periodYear,
            periodMonth,
          },
        },
        update: {
          reportsUsed: { increment: 1 },
        },
        create: {
          userId,
          periodYear,
          periodMonth,
          reportsUsed: 1,
          reportsLimit: ADMIN_UNLIMITED_LIMIT,
          extraReportsUsed: 0,
          extraChargesMxn: 0,
        },
      });

      const usage = await this.getCurrentUsage(userId);
      return {
        success: true,
        isExtra: false,
        extraChargeMxn: 0,
        usage,
      };
    }

    const subscription = await subscriptionService.getActiveSubscription(userId);

    if (!subscription) {
      const usage = await this.getCurrentUsage(userId);
      return {
        success: false,
        isExtra: false,
        extraChargeMxn: 0,
        usage,
        error: 'No tienes una suscripción activa',
      };
    }

    const reportsLimit = subscription.reportsLimit;
    const extraReportPrice = subscription.extraReportPrice;

    let usageRecord = await prisma.usageRecord.upsert({
      where: {
        userId_periodYear_periodMonth: {
          userId,
          periodYear,
          periodMonth,
        },
      },
      update: {
        reportsUsed: { increment: 1 },
      },
      create: {
        userId,
        periodYear,
        periodMonth,
        reportsUsed: 1,
        reportsLimit,
        extraReportsUsed: 0,
        extraChargesMxn: 0,
      },
    });

    const isExtra = usageRecord.reportsUsed > reportsLimit;
    let extraChargeMxn = 0;

    if (isExtra) {
      extraChargeMxn = extraReportPrice;
      
      usageRecord = await prisma.usageRecord.update({
        where: { id: usageRecord.id },
        data: {
          extraReportsUsed: { increment: 1 },
          extraChargesMxn: { increment: extraReportPrice },
        },
      });
    }

    const usage = await this.getCurrentUsage(userId);

    return {
      success: true,
      isExtra,
      extraChargeMxn,
      usage,
    };
  }

  async getUsageHistory(userId: string, months: number = 6) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    return await prisma.usageRecord.findMany({
      where: {
        userId,
        OR: [
          { periodYear: { gt: startDate.getFullYear() } },
          {
            periodYear: startDate.getFullYear(),
            periodMonth: { gte: startDate.getMonth() + 1 },
          },
        ],
      },
      orderBy: [
        { periodYear: 'desc' },
        { periodMonth: 'desc' },
      ],
    });
  }
}

export const usageService = new UsageService();
