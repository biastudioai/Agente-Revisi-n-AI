import prisma from '../config/database';
import { SubscriptionStatus, PlanType } from '../generated/prisma';
import { PLAN_CONFIGS } from '../config/plans';
import { getUncachableStripeClient } from './stripeClient';

export interface MonthlyRevenue {
  month: number;
  year: number;
  subscriptionRevenueMxn: number;
  extraReportsRevenueMxn: number;
  totalRevenueMxn: number;
  subscriptionsCount: number;
  actualRevenueMxn: number;
}

export interface SubscriptionStats {
  totalActive: number;
  byPlan: {
    planType: PlanType;
    planName: string;
    count: number;
    expectedMonthlyRevenueMxn: number;
    actualMonthlyRevenueMxn: number;
  }[];
  totalExpectedRecurringMxn: number;
  totalActualRecurringMxn: number;
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
  discountCode: string | null;
  discountCodeUsedAt: Date | null;
  discountCodeIsActive: boolean;
}

export interface DiscountCodeHistoryItem {
  code: string;
  usedAt: Date;
  amountDiscounted: number | null;
  discountType: string;
  discountValue: number;
}

export class BillingService {
  private async getStripeInvoicesForMonth(year: number, month: number): Promise<number> {
    try {
      const stripe = await getUncachableStripeClient();
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      
      let totalPaidMxn = 0;
      let hasMore = true;
      let startingAfter: string | undefined;

      while (hasMore) {
        const params: any = {
          limit: 100,
          status: 'paid',
          created: {
            gte: Math.floor(startOfMonth.getTime() / 1000),
            lte: Math.floor(endOfMonth.getTime() / 1000),
          },
        };
        
        if (startingAfter) {
          params.starting_after = startingAfter;
        }

        const invoices = await stripe.invoices.list(params);
        
        for (const invoice of invoices.data) {
          if (invoice.currency === 'mxn') {
            totalPaidMxn += (invoice.amount_paid || 0) / 100;
          }
        }

        hasMore = invoices.has_more;
        if (invoices.data.length > 0) {
          startingAfter = invoices.data[invoices.data.length - 1].id;
        }
      }

      return totalPaidMxn;
    } catch (error) {
      console.error('Error fetching Stripe invoices:', error);
      return 0;
    }
  }

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

      const actualRevenueMxn = await this.getStripeInvoicesForMonth(year, month);

      results.push({
        month,
        year,
        subscriptionRevenueMxn,
        extraReportsRevenueMxn,
        totalRevenueMxn: subscriptionRevenueMxn + extraReportsRevenueMxn,
        subscriptionsCount: activeSubscriptions.length,
        actualRevenueMxn,
      });
    }

    return results;
  }

  async getSubscriptionStats(): Promise<SubscriptionStats> {
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      include: {
        user: {
          include: {
            stripeCustomer: true,
          },
        },
      },
    });

    const byPlanMap = new Map<PlanType, { count: number; actualRevenue: number }>();
    
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    try {
      const stripe = await getUncachableStripeClient();
      
      for (const sub of activeSubscriptions) {
        const currentData = byPlanMap.get(sub.planType) || { count: 0, actualRevenue: 0 };
        currentData.count += 1;
        
        if (sub.user.stripeCustomer?.stripeCustomerId) {
          let hasMore = true;
          let startingAfter: string | undefined;
          
          while (hasMore) {
            const params: any = {
              customer: sub.user.stripeCustomer.stripeCustomerId,
              status: 'paid',
              created: {
                gte: Math.floor(startOfMonth.getTime() / 1000),
                lte: Math.floor(endOfMonth.getTime() / 1000),
              },
              limit: 100,
            };
            
            if (startingAfter) {
              params.starting_after = startingAfter;
            }
            
            const invoices = await stripe.invoices.list(params);
            
            for (const invoice of invoices.data) {
              if (invoice.currency === 'mxn') {
                currentData.actualRevenue += (invoice.amount_paid || 0) / 100;
              }
            }
            
            hasMore = invoices.has_more;
            if (invoices.data.length > 0) {
              startingAfter = invoices.data[invoices.data.length - 1].id;
            }
          }
        }
        
        byPlanMap.set(sub.planType, currentData);
      }
    } catch (error) {
      console.error('Error fetching Stripe data for stats:', error);
      for (const sub of activeSubscriptions) {
        const currentData = byPlanMap.get(sub.planType) || { count: 0, actualRevenue: 0 };
        currentData.count += 1;
        byPlanMap.set(sub.planType, currentData);
      }
    }

    const byPlan = Object.values(PlanType).map((planType) => {
      const config = PLAN_CONFIGS[planType];
      const data = byPlanMap.get(planType) || { count: 0, actualRevenue: 0 };
      return {
        planType,
        planName: config?.name || planType,
        count: data.count,
        expectedMonthlyRevenueMxn: data.count * (config?.priceMonthlyMxn || 0),
        actualMonthlyRevenueMxn: data.actualRevenue,
      };
    });

    const totalExpectedRecurringMxn = byPlan.reduce(
      (sum, plan) => sum + plan.expectedMonthlyRevenueMxn,
      0
    );

    const totalActualRecurringMxn = byPlan.reduce(
      (sum, plan) => sum + plan.actualMonthlyRevenueMxn,
      0
    );

    return {
      totalActive: activeSubscriptions.length,
      byPlan,
      totalExpectedRecurringMxn,
      totalActualRecurringMxn,
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
            discountCodeUsages: {
              include: {
                discountCode: true,
              },
              orderBy: { usedAt: 'desc' },
              take: 1,
            },
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
      
      const lastDiscountUsage = sub.user.discountCodeUsages[0];
      let discountCode: string | null = null;
      let discountCodeUsedAt: Date | null = null;
      let discountCodeIsActive = false;

      if (lastDiscountUsage) {
        const discount = lastDiscountUsage.discountCode;
        const usedAt = lastDiscountUsage.usedAt;
        
        const isStillActive = discount.usageType === 'TIME_PERIOD' 
          ? (!discount.validUntil || new Date(discount.validUntil) > now)
          : (usedAt.getMonth() === now.getMonth() && usedAt.getFullYear() === now.getFullYear());

        if (isStillActive) {
          discountCode = discount.code;
          discountCodeUsedAt = usedAt;
          discountCodeIsActive = true;
        }
      }

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
        discountCode,
        discountCodeUsedAt,
        discountCodeIsActive,
      });
    }

    return subscribers;
  }

  async getDiscountCodeHistory(userId: string): Promise<DiscountCodeHistoryItem[]> {
    const usages = await prisma.discountCodeUsage.findMany({
      where: { userId },
      include: {
        discountCode: true,
      },
      orderBy: { usedAt: 'desc' },
    });

    return usages.map(usage => ({
      code: usage.discountCode.code,
      usedAt: usage.usedAt,
      amountDiscounted: usage.amountDiscounted,
      discountType: usage.discountCode.discountType,
      discountValue: usage.discountCode.discountValue,
    }));
  }

  async getCurrentMonthSummary(): Promise<{
    totalRevenueMxn: number;
    subscriptionRevenueMxn: number;
    extraReportsRevenueMxn: number;
    newSubscriptions: number;
    totalReportsProcessed: number;
    extraReportsTotal: number;
    comparisonToPreviousMonth: number;
    actualRevenueMxn: number;
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

    const comparisonToPreviousMonth = previousMonthData.actualRevenueMxn > 0
      ? ((currentMonthData.actualRevenueMxn - previousMonthData.actualRevenueMxn) / 
         previousMonthData.actualRevenueMxn) * 100
      : 0;

    return {
      totalRevenueMxn: currentMonthData.totalRevenueMxn,
      subscriptionRevenueMxn: currentMonthData.subscriptionRevenueMxn,
      extraReportsRevenueMxn: currentMonthData.extraReportsRevenueMxn,
      newSubscriptions,
      totalReportsProcessed,
      extraReportsTotal,
      comparisonToPreviousMonth: Math.round(comparisonToPreviousMonth * 10) / 10,
      actualRevenueMxn: currentMonthData.actualRevenueMxn,
    };
  }
}

export const billingService = new BillingService();
