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
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    
    const stripeCustomer = await prisma.stripeCustomer.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!stripeCustomer) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    const now = new Date();
    const promotionEndsAt = new Date(now);
    promotionEndsAt.setMonth(promotionEndsAt.getMonth() + 3);

    await prisma.subscription.create({
      data: {
        userId: stripeCustomer.userId,
        stripeSubscriptionId,
        planType,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        promotionEndsAt,
        isInPromotion: true,
      },
    });
  }

  async handleSubscriptionUpdated(stripeSubscriptionId: string) {
    const stripe = await getUncachableStripeClient();
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    
    const existingSub = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });

    if (!existingSub) {
      return;
    }

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

    await prisma.subscription.update({
      where: { stripeSubscriptionId },
      data: {
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        isInPromotion,
      },
    });

    if (status === SubscriptionStatus.ACTIVE) {
      const reportsLimit = getReportsLimit(existingSub.planType, isInPromotion);
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
}

export const subscriptionService = new SubscriptionService();
