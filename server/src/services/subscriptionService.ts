import prisma from '../config/database';
import { PlanType, SubscriptionStatus } from '../generated/prisma';
import { getUncachableStripeClient } from './stripeClient';
import { PLAN_CONFIGS, getReportsLimit, getExtraReportPrice } from '../config/plans';

export class SubscriptionService {
  async createCustomer(email: string, userId: string) {
    const stripe = await getUncachableStripeClient();
    const customer = await stripe.customers.create({
      email,
      metadata: { userId },
    });

    await prisma.stripeCustomer.create({
      data: {
        userId,
        stripeCustomerId: customer.id,
      },
    });

    return customer;
  }

  async getOrCreateCustomer(userId: string, email: string) {
    const existing = await prisma.stripeCustomer.findUnique({
      where: { userId },
    });

    if (existing) {
      return existing.stripeCustomerId;
    }

    const customer = await this.createCustomer(email, userId);
    return customer.id;
  }

  async createCheckoutSession(
    userId: string, 
    email: string, 
    planType: PlanType,
    successUrl: string,
    cancelUrl: string
  ) {
    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (existingSubscription) {
      throw new Error('Ya tienes una suscripción activa. Por favor administra tu suscripción actual antes de crear una nueva.');
    }

    const stripe = await getUncachableStripeClient();
    const customerId = await this.getOrCreateCustomer(userId, email);
    const planConfig = PLAN_CONFIGS[planType];

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'mxn',
          product_data: {
            name: planConfig.name,
            description: `${planConfig.reportsIncludedPromotion} informes incluidos (primeros 3 meses)`,
          },
          unit_amount: planConfig.priceMonthlyMxn * 100,
          recurring: {
            interval: 'month',
          },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planType,
      },
      subscription_data: {
        metadata: {
          userId,
          planType,
        },
      },
    });

    return session;
  }

  async createCustomerPortalSession(userId: string, returnUrl: string) {
    const stripe = await getUncachableStripeClient();
    
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId },
    });

    if (!stripeCustomer) {
      throw new Error('No se encontró cliente de Stripe');
    }

    return await stripe.billingPortal.sessions.create({
      customer: stripeCustomer.stripeCustomerId,
      return_url: returnUrl,
    });
  }

  async handleSubscriptionCreated(stripeSubscriptionId: string, customerId: string, planType: PlanType) {
    const stripe = await getUncachableStripeClient();
    const subscriptionResponse = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const subscription = subscriptionResponse as any;
    
    const stripeCustomer = await prisma.stripeCustomer.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!stripeCustomer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    // Check if this exact subscription already exists in our database
    const existingThisSubscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });

    if (existingThisSubscription) {
      console.log(`Subscription ${stripeSubscriptionId} already exists in database, skipping creation`);
      return;
    }

    // Find and cancel any existing ACTIVE subscriptions for this user in Stripe
    const existingActiveSubscriptions = await prisma.subscription.findMany({
      where: {
        userId: stripeCustomer.userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    for (const existingSub of existingActiveSubscriptions) {
      try {
        // Cancel the old subscription in Stripe
        await stripe.subscriptions.cancel(existingSub.stripeSubscriptionId);
        console.log(`Cancelled previous Stripe subscription ${existingSub.stripeSubscriptionId} for user ${stripeCustomer.userId}`);
        
        // Update our database
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: { status: SubscriptionStatus.CANCELED },
        });
      } catch (error: any) {
        // If cancellation fails and it's not because the subscription is already canceled/missing, abort
        if (error.code !== 'resource_missing' && error.raw?.code !== 'resource_missing') {
          console.error(`Failed to cancel subscription ${existingSub.stripeSubscriptionId}: ${error.message}`);
          throw new Error(`No se pudo cancelar la suscripción anterior. Por favor contacte a soporte.`);
        }
        // If resource is missing, just mark it as canceled in our database
        await prisma.subscription.update({
          where: { id: existingSub.id },
          data: { status: SubscriptionStatus.CANCELED },
        });
        console.log(`Subscription ${existingSub.stripeSubscriptionId} already canceled in Stripe, marked as canceled in database`);
      }
    }

    const now = new Date();
    const promotionEndsAt = new Date(now);
    promotionEndsAt.setMonth(promotionEndsAt.getMonth() + 3);

    const periodStartTimestamp = subscription.current_period_start;
    const periodEndTimestamp = subscription.current_period_end;
    
    const currentPeriodStart = periodStartTimestamp && !isNaN(periodStartTimestamp) 
      ? new Date(periodStartTimestamp * 1000) 
      : now;
    
    const currentPeriodEnd = periodEndTimestamp && !isNaN(periodEndTimestamp) 
      ? new Date(periodEndTimestamp * 1000) 
      : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    console.log('Creating subscription with dates:', {
      periodStartTimestamp,
      periodEndTimestamp,
      currentPeriodStart,
      currentPeriodEnd
    });

    await prisma.subscription.create({
      data: {
        userId: stripeCustomer.userId,
        stripeSubscriptionId,
        planType,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart,
        currentPeriodEnd,
        promotionEndsAt,
        isInPromotion: true,
      },
    });
  }

  async handleSubscriptionUpdated(stripeSubscriptionId: string) {
    const stripe = await getUncachableStripeClient();
    const subscriptionResponse = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    const subscription = subscriptionResponse as any;
    
    const existingSub = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });

    if (!existingSub) {
      return;
    }

    const newPlanType = subscription.metadata?.planType as PlanType | undefined;
    const oldPlanType = existingSub.planType;

    const now = new Date();
    const isInPromotion = existingSub.promotionEndsAt 
      ? now < existingSub.promotionEndsAt 
      : false;

    let status: SubscriptionStatus;
    switch (subscription.status) {
      case 'active':
        status = SubscriptionStatus.ACTIVE;
        break;
      case 'canceled':
        status = SubscriptionStatus.CANCELED;
        break;
      case 'past_due':
        status = SubscriptionStatus.PAST_DUE;
        break;
      case 'trialing':
        status = SubscriptionStatus.TRIALING;
        break;
      case 'unpaid':
        status = SubscriptionStatus.UNPAID;
        break;
      case 'paused':
        status = SubscriptionStatus.CANCELED;
        break;
      default:
        status = SubscriptionStatus.ACTIVE;
    }

    const updateData: any = {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      isInPromotion,
    };

    if (newPlanType && newPlanType !== oldPlanType) {
      updateData.planType = newPlanType;
      console.log(`Plan type changed from ${oldPlanType} to ${newPlanType} for user ${existingSub.userId}`);
    }

    await prisma.subscription.update({
      where: { stripeSubscriptionId },
      data: updateData,
    });

    const effectivePlanType = newPlanType || oldPlanType;
    const planConfig = PLAN_CONFIGS[effectivePlanType];
    const maxAuditors = planConfig?.maxAuditors ?? 0;

    if (newPlanType && newPlanType !== oldPlanType) {
      const { UserRole } = await import('../generated/prisma');
      
      const activeAuditors = await prisma.user.findMany({
        where: {
          parentId: existingSub.userId,
          rol: UserRole.AUDITOR,
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true, email: true },
      });

      if (activeAuditors.length > maxAuditors) {
        const auditorsToDeactivate = activeAuditors.slice(maxAuditors);
        const idsToDeactivate = auditorsToDeactivate.map(a => a.id);

        await prisma.user.updateMany({
          where: { id: { in: idsToDeactivate } },
          data: { isActive: false },
        });

        await prisma.session.deleteMany({
          where: { userId: { in: idsToDeactivate } },
        });

        console.log(`Auto-deactivated ${auditorsToDeactivate.length} auditors for user ${existingSub.userId} due to plan downgrade from ${oldPlanType} to ${newPlanType}. Deactivated: ${auditorsToDeactivate.map(a => a.email).join(', ')}`);
      }
    }

    if (status === SubscriptionStatus.ACTIVE) {
      const reportsLimit = getReportsLimit(effectivePlanType, isInPromotion);
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      
      await prisma.usageRecord.updateMany({
        where: {
          userId: existingSub.userId,
          periodYear: currentYear,
          periodMonth: currentMonth,
        },
        data: {
          reportsLimit,
        },
      });
    }
  }

  async handleInvoicePaymentFailed(customerId: string) {
    const stripeCustomer = await prisma.stripeCustomer.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!stripeCustomer) return;

    await prisma.subscription.updateMany({
      where: {
        userId: stripeCustomer.userId,
        status: SubscriptionStatus.ACTIVE,
      },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });
  }

  async handleSubscriptionDeleted(stripeSubscriptionId: string) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId },
      data: {
        status: SubscriptionStatus.CANCELED,
      },
    });
  }

  async getActiveSubscription(userId: string) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      return null;
    }

    const now = new Date();
    const isInPromotion = subscription.promotionEndsAt 
      ? now < subscription.promotionEndsAt 
      : false;

    if (isInPromotion !== subscription.isInPromotion) {
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { isInPromotion },
      });
      subscription.isInPromotion = isInPromotion;
    }

    const planConfig = PLAN_CONFIGS[subscription.planType];
    const reportsLimit = getReportsLimit(subscription.planType, isInPromotion);
    const extraReportPrice = getExtraReportPrice(subscription.planType, isInPromotion);

    return {
      ...subscription,
      planConfig,
      reportsLimit,
      extraReportPrice,
    };
  }

  async chargeExtraReports(userId: string, extraReportsCount: number, pricePerReportMxn: number) {
    const stripe = await getUncachableStripeClient();
    
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId },
    });

    if (!stripeCustomer) {
      throw new Error('No se encontró cliente de Stripe');
    }

    const amountMxn = extraReportsCount * pricePerReportMxn;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountMxn * 100,
      currency: 'mxn',
      customer: stripeCustomer.stripeCustomerId,
      description: `${extraReportsCount} informes adicionales`,
      metadata: {
        userId,
        extraReportsCount: extraReportsCount.toString(),
        pricePerReport: pricePerReportMxn.toString(),
      },
    });

    await prisma.paymentHistory.create({
      data: {
        userId,
        stripePaymentIntentId: paymentIntent.id,
        amount: amountMxn * 100,
        currency: 'mxn',
        status: paymentIntent.status,
      },
    });

    return paymentIntent;
  }

  async cancelDuplicateStripeSubscriptions(): Promise<{ cancelled: number; errors: string[] }> {
    const stripe = await getUncachableStripeClient();
    const errors: string[] = [];
    let cancelled = 0;

    // Find all subscriptions marked as CANCELED in our database that might still be active in Stripe
    const canceledSubscriptions = await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.CANCELED,
      },
      select: {
        stripeSubscriptionId: true,
        userId: true,
      },
    });

    for (const sub of canceledSubscriptions) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
        
        // If the subscription is still active in Stripe, cancel it
        if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
          await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
          cancelled++;
          console.log(`Cancelled duplicate Stripe subscription ${sub.stripeSubscriptionId} for user ${sub.userId}`);
        }
      } catch (error: any) {
        // Subscription might not exist in Stripe anymore, which is fine
        if (error.code !== 'resource_missing') {
          errors.push(`Failed to cancel ${sub.stripeSubscriptionId}: ${error.message}`);
        }
      }
    }

    return { cancelled, errors };
  }

  async syncStripeSubscriptions(): Promise<{ synced: number; errors: string[] }> {
    const errors: string[] = [];
    let synced = 0;

    const stripeSubscriptions = await prisma.$queryRaw<Array<{
      id: string;
      customer: string;
      status: string;
      metadata: any;
      created: number;
      current_period_start: number | null;
      current_period_end: number | null;
    }>>`SELECT id, customer, status, metadata, created, current_period_start, current_period_end FROM stripe.subscriptions WHERE status = 'active'`;

    for (const stripeSub of stripeSubscriptions) {
      try {
        const existing = await prisma.subscription.findUnique({
          where: { stripeSubscriptionId: stripeSub.id },
        });

        if (existing) {
          continue;
        }

        const metadata = typeof stripeSub.metadata === 'string' 
          ? JSON.parse(stripeSub.metadata) 
          : stripeSub.metadata;

        const userId = metadata?.userId;
        const planType = metadata?.planType as PlanType;

        if (!userId || !planType) {
          errors.push(`Subscription ${stripeSub.id}: Missing userId or planType in metadata`);
          continue;
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
          errors.push(`Subscription ${stripeSub.id}: User ${userId} not found`);
          continue;
        }

        const createdAt = new Date(stripeSub.created * 1000);
        const periodStart = stripeSub.current_period_start 
          ? new Date(stripeSub.current_period_start * 1000) 
          : createdAt;
        const periodEnd = stripeSub.current_period_end 
          ? new Date(stripeSub.current_period_end * 1000) 
          : new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000);

        const promotionEndsAt = new Date(createdAt);
        promotionEndsAt.setMonth(promotionEndsAt.getMonth() + 3);

        const now = new Date();
        const isInPromotion = now < promotionEndsAt;

        await prisma.subscription.create({
          data: {
            userId,
            stripeSubscriptionId: stripeSub.id,
            planType,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            promotionEndsAt,
            isInPromotion,
          },
        });

        synced++;
        console.log(`Synced subscription ${stripeSub.id} for user ${userId}`);
      } catch (error: any) {
        errors.push(`Subscription ${stripeSub.id}: ${error.message}`);
      }
    }

    return { synced, errors };
  }
}

export const subscriptionService = new SubscriptionService();
