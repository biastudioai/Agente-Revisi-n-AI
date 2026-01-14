import prisma from '../config/database';
import { SubscriptionStatus, PlanType } from '../generated/prisma';
import { PLAN_CONFIGS } from '../config/plans';

export interface MonthlyRevenue {
  month: number;
  year: number;
  subscriptionRevenueMxn: number;
  extraReportsRevenueMxn: number;
  totalRevenueMxn: number;
  subscriptionsCount: number;
}

export interface SubscriptionStats {
  totalActive: number;
  byPlan: {
    planType: PlanType;
    planName: string;
    count: number;
    monthlyRevenueMxn: number;
  }[];
  totalMonthlyRecurringMxn: number;
}

export interface SubscriberInfo {
  id: string;
  email: string;
  nombre: string;
  planType: PlanType;
  planName: string;
  status: SubscriptionStatus;
  isInPromotion: boolean;
  currentPeriodEnd: Date;
  createdAt: Date;
  reportsUsedThisMonth: number;
  extraReportsThisMonth: number;
}

export class BillingService {
  async getMonthlyRevenue(months: number = 6): Promise<MonthlyRevenue[]> {
    const now = new Date();
    const results: MonthlyRevenue[] = [];

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth() + 1;

      const activeSubscriptions = await prisma.subscription.findMany({
        where: {
          status: SubscriptionStatus.ACTIVE,
        },
      });

      let subscriptionRevenueMxn = 0;
      for (const sub of activeSubscriptions) {
        const config = PLAN_CONFIGS[sub.planType];
        if (config) {
          subscriptionRevenueMxn += config.priceMonthlyMxn;
        }
      }

      const usageRecords = await prisma.usageRecord.findMany({
        where: {
          periodYear: year,
          periodMonth: month,
        },
      });

      const extraReportsRevenueMxn = usageRecords.reduce(
        (sum, record) => sum + record.extraChargesMxn,
        0
      );

      results.push({
        month,
        year,
        subscriptionRevenueMxn,
        extraReportsRevenueMxn,
        totalRevenueMxn: subscriptionRevenueMxn + extraReportsRevenueMxn,
        subscriptionsCount: activeSubscriptions.length,
      });
    }

    return results;
  }

  async getSubscriptionStats(): Promise<SubscriptionStats> {
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
    });

    const byPlanMap = new Map<PlanType, number>();
    
    for (const sub of activeSubscriptions) {
      const current = byPlanMap.get(sub.planType) || 0;
      byPlanMap.set(sub.planType, current + 1);
    }

    const byPlan = Object.values(PlanType).map((planType) => {
      const config = PLAN_CONFIGS[planType];
      const count = byPlanMap.get(planType) || 0;
      return {
        planType,
        planName: config?.name || planType,
        count,
        monthlyRevenueMxn: count * (config?.priceMonthlyMxn || 0),
      };
    });

    const totalMonthlyRecurringMxn = byPlan.reduce(
      (sum, plan) => sum + plan.monthlyRevenueMxn,
      0
    );

    return {
      totalActive: activeSubscriptions.length,
      byPlan,
      totalMonthlyRecurringMxn,
    };
  }

  async getSubscribers(limit: number = 50): Promise<SubscriberInfo[]> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const subscriptions = await prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            nombre: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const subscribers: SubscriberInfo[] = [];

    for (const sub of subscriptions) {
      const usageRecord = await prisma.usageRecord.findUnique({
        where: {
          userId_periodYear_periodMonth: {
            userId: sub.userId,
            periodYear: currentYear,
            periodMonth: currentMonth,
          },
        },
      });

      const config = PLAN_CONFIGS[sub.planType];

      subscribers.push({
        id: sub.user.id,
        email: sub.user.email,
        nombre: sub.user.nombre || '',
        planType: sub.planType,
        planName: config?.name || sub.planType,
        status: sub.status,
        isInPromotion: sub.isInPromotion,
        currentPeriodEnd: sub.currentPeriodEnd,
        createdAt: sub.createdAt,
        reportsUsedThisMonth: usageRecord?.reportsUsed || 0,
        extraReportsThisMonth: usageRecord?.extraReportsUsed || 0,
      });
    }

    return subscribers;
  }

  async getCurrentMonthSummary(): Promise<{
    totalRevenueMxn: number;
    subscriptionRevenueMxn: number;
    extraReportsRevenueMxn: number;
    newSubscriptions: number;
    totalReportsProcessed: number;
    extraReportsTotal: number;
    comparisonToPreviousMonth: number;
  }> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const monthlyRevenue = await this.getMonthlyRevenue(2);
    const currentMonthData = monthlyRevenue[0];
    const previousMonthData = monthlyRevenue[1];

    const usageRecords = await prisma.usageRecord.findMany({
      where: {
        periodYear: currentYear,
        periodMonth: currentMonth,
      },
    });

    const totalReportsProcessed = usageRecords.reduce(
      (sum, record) => sum + record.reportsUsed,
      0
    );
    const extraReportsTotal = usageRecords.reduce(
      (sum, record) => sum + record.extraReportsUsed,
      0
    );

    const newSubscriptions = await prisma.subscription.count({
      where: {
        createdAt: {
          gte: new Date(currentYear, currentMonth - 1, 1),
          lt: new Date(currentYear, currentMonth, 1),
        },
      },
    });

    const comparisonToPreviousMonth = previousMonthData.totalRevenueMxn > 0
      ? ((currentMonthData.totalRevenueMxn - previousMonthData.totalRevenueMxn) / 
         previousMonthData.totalRevenueMxn) * 100
      : 0;

    return {
      totalRevenueMxn: currentMonthData.totalRevenueMxn,
      subscriptionRevenueMxn: currentMonthData.subscriptionRevenueMxn,
      extraReportsRevenueMxn: currentMonthData.extraReportsRevenueMxn,
      newSubscriptions,
      totalReportsProcessed,
      extraReportsTotal,
      comparisonToPreviousMonth: Math.round(comparisonToPreviousMonth * 10) / 10,
    };
  }
}

export const billingService = new BillingService();
