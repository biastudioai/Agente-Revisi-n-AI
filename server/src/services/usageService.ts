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

  private async getUserWithParent(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        rol: true, 
        parentId: true,
        parent: {
          select: { id: true, rol: true }
        }
      },
    });
  }

  private async getSubscriptionOwnerId(userId: string): Promise<string> {
    const user = await this.getUserWithParent(userId);
    if (user?.rol === 'AUDITOR' && user.parentId) {
      return user.parentId;
    }
    return userId;
  }

  private isSamePeriod(periodStart1: Date | null | undefined, periodStart2: Date | null | undefined): boolean {
    if (!periodStart1 || !periodStart2) return false;
    return periodStart1.getTime() === periodStart2.getTime();
  }

  async getCurrentUsage(userId: string): Promise<UsageInfo> {
    const now = new Date();
    const periodYear = now.getFullYear();
    const periodMonth = now.getMonth() + 1;

    const isAdmin = await this.isUserAdmin(userId);
    
    if (isAdmin) {
      const usageRecord = await prisma.usageRecord.findUnique({
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

    const subscriptionOwnerId = await this.getSubscriptionOwnerId(userId);
    const subscription = await subscriptionService.getActiveSubscription(subscriptionOwnerId);
    
    const hasActiveSubscription = !!subscription;
    const planType = subscription?.planType || null;
    const isInPromotion = subscription?.isInPromotion || false;
    const reportsLimit = subscription?.reportsLimit || 0;
    const extraReportPriceMxn = subscription?.extraReportPrice || 0;
    const currentPeriodStart = subscription?.currentPeriodStart || null;

    const usageRecord = await this.getOrCreateUsageRecord(
      subscriptionOwnerId,
      periodYear,
      periodMonth,
      reportsLimit,
      currentPeriodStart
    );

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

  private async getOrCreateUsageRecord(
    userId: string,
    periodYear: number,
    periodMonth: number,
    reportsLimit: number,
    currentPeriodStart: Date | null
  ) {
    return await prisma.$transaction(async (tx) => {
      let usageRecord = await tx.usageRecord.findUnique({
        where: {
          userId_periodYear_periodMonth: {
            userId,
            periodYear,
            periodMonth,
          },
        },
      });

      if (!usageRecord) {
        usageRecord = await tx.usageRecord.create({
          data: {
            userId,
            periodYear,
            periodMonth,
            periodStart: currentPeriodStart,
            reportsUsed: 0,
            reportsLimit,
            extraReportsUsed: 0,
            extraChargesMxn: 0,
          },
        });
      } else {
        const recordPeriodReference = usageRecord.periodStart || usageRecord.createdAt;
        const needsReset = currentPeriodStart && 
          currentPeriodStart.getTime() > recordPeriodReference.getTime();

        if (needsReset) {
          usageRecord = await tx.usageRecord.update({
            where: { id: usageRecord.id },
            data: {
              periodStart: currentPeriodStart,
              reportsUsed: 0,
              reportsLimit,
              extraReportsUsed: 0,
              extraChargesMxn: 0,
            },
          });
        } else if (!usageRecord.periodStart && currentPeriodStart) {
          usageRecord = await tx.usageRecord.update({
            where: { id: usageRecord.id },
            data: { 
              periodStart: currentPeriodStart,
              reportsLimit: usageRecord.reportsLimit !== reportsLimit ? reportsLimit : usageRecord.reportsLimit,
            },
          });
        } else if (usageRecord.reportsLimit !== reportsLimit) {
          usageRecord = await tx.usageRecord.update({
            where: { id: usageRecord.id },
            data: { reportsLimit },
          });
        }
      }

      return usageRecord;
    });
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

    const subscriptionOwnerId = await this.getSubscriptionOwnerId(userId);
    const subscription = await subscriptionService.getActiveSubscription(subscriptionOwnerId);

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
    const currentPeriodStart = subscription.currentPeriodStart;

    const result = await prisma.$transaction(async (tx) => {
      let usageRecord = await tx.usageRecord.findUnique({
        where: {
          userId_periodYear_periodMonth: {
            userId: subscriptionOwnerId,
            periodYear,
            periodMonth,
          },
        },
      });

      const recordPeriodReference = usageRecord 
        ? (usageRecord.periodStart || usageRecord.createdAt)
        : null;
      const needsReset = usageRecord && currentPeriodStart && recordPeriodReference &&
        currentPeriodStart.getTime() > recordPeriodReference.getTime();

      if (!usageRecord) {
        usageRecord = await tx.usageRecord.create({
          data: {
            userId: subscriptionOwnerId,
            periodYear,
            periodMonth,
            periodStart: currentPeriodStart,
            reportsUsed: 1,
            reportsLimit,
            extraReportsUsed: 0,
            extraChargesMxn: 0,
          },
        });
      } else if (needsReset) {
        usageRecord = await tx.usageRecord.update({
          where: { id: usageRecord.id },
          data: {
            periodStart: currentPeriodStart,
            reportsUsed: 1,
            reportsLimit,
            extraReportsUsed: 0,
            extraChargesMxn: 0,
          },
        });
      } else {
        const updateData: any = {
          reportsUsed: { increment: 1 },
        };
        if (!usageRecord.periodStart && currentPeriodStart) {
          updateData.periodStart = currentPeriodStart;
        }
        usageRecord = await tx.usageRecord.update({
          where: { id: usageRecord.id },
          data: updateData,
        });
      }

      const isExtra = usageRecord.reportsUsed > reportsLimit;
      let extraChargeMxn = 0;

      if (isExtra) {
        extraChargeMxn = extraReportPrice;
        
        usageRecord = await tx.usageRecord.update({
          where: { id: usageRecord.id },
          data: {
            extraReportsUsed: { increment: 1 },
            extraChargesMxn: { increment: extraReportPrice },
          },
        });
      }

      return { usageRecord, isExtra, extraChargeMxn };
    });

    const usage = await this.getCurrentUsage(userId);

    return {
      success: true,
      isExtra: result.isExtra,
      extraChargeMxn: result.extraChargeMxn,
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
