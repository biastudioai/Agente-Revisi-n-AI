import prisma from '../config/database';
import { PlanType, SubscriptionStatus, UserRole } from '../generated/prisma';
import { getUncachableStripeClient } from './stripeClient';
import { PLAN_CONFIGS, getReportsLimit, getExtraReportPrice } from '../config/plans';

const PLAN_ORDER: Record<PlanType, number> = {
  [PlanType.PLAN_1]: 1,
  [PlanType.PLAN_2]: 2,
  [PlanType.PLAN_3]: 3,
};

function isUpgrade(fromPlan: PlanType, toPlan: PlanType): boolean {
  return PLAN_ORDER[toPlan] > PLAN_ORDER[fromPlan];
}

function isDowngrade(fromPlan: PlanType, toPlan: PlanType): boolean {
  return PLAN_ORDER[toPlan] < PLAN_ORDER[fromPlan];
}

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
      allow_promotion_codes: true,
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

    // Check if this is an upgrade with reports transfer
    const metadata = subscription.metadata || {};
    const isUpgrade = metadata.isUpgrade === 'true';
    const reportsUsedTransfer = parseInt(metadata.reportsUsedTransfer || '0', 10);

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

    // If this is an upgrade, transfer the reports used from the previous period
    if (isUpgrade && reportsUsedTransfer > 0) {
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();
      const isInPromotion = now < promotionEndsAt;
      const newReportsLimit = getReportsLimit(planType, isInPromotion);

      // Create or update usage record with transferred reports
      await prisma.usageRecord.upsert({
        where: {
          userId_periodYear_periodMonth: {
            userId: stripeCustomer.userId,
            periodYear: currentYear,
            periodMonth: currentMonth,
          },
        },
        update: {
          reportsUsed: reportsUsedTransfer,
          reportsLimit: newReportsLimit,
        },
        create: {
          userId: stripeCustomer.userId,
          periodYear: currentYear,
          periodMonth: currentMonth,
          reportsUsed: reportsUsedTransfer,
          reportsLimit: newReportsLimit,
        },
      });

      console.log(`Transferred ${reportsUsedTransfer} reports used from previous plan to new subscription for user ${stripeCustomer.userId}`);
    }
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

    // Sync cancel_at_period_end from Stripe
    const cancelAtPeriodEnd = subscription.cancel_at_period_end || false;

    const updateData: any = {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      isInPromotion,
      cancelAtPeriodEnd,
    };

    // If the subscription was reactivated (cancel_at_period_end changed to false), clear scheduled changes
    if (!cancelAtPeriodEnd && existingSub.cancelAtPeriodEnd) {
      updateData.scheduledPlanType = null;
      updateData.scheduledChangeAt = null;
      console.log(`Subscription ${stripeSubscriptionId} was reactivated for user ${existingSub.userId}`);
    }

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

    // Get scheduled plan config if there's a downgrade scheduled
    const scheduledPlanConfig = subscription.scheduledPlanType 
      ? PLAN_CONFIGS[subscription.scheduledPlanType]
      : null;

    return {
      ...subscription,
      planConfig,
      reportsLimit,
      extraReportPrice,
      scheduledPlanConfig,
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

  async changePlan(
    userId: string,
    email: string,
    newPlanType: PlanType,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ type: 'checkout' | 'scheduled' | 'error'; url?: string; message?: string; scheduledAt?: Date }> {
    const stripe = await getUncachableStripeClient();
    
    const currentSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (!currentSubscription) {
      return { type: 'error', message: 'No tienes una suscripción activa.' };
    }

    const currentPlanType = currentSubscription.planType;

    if (currentPlanType === newPlanType) {
      return { type: 'error', message: 'Ya estás suscrito a este plan.' };
    }

    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId },
    });

    if (!stripeCustomer) {
      return { type: 'error', message: 'No se encontró tu información de cliente.' };
    }

    if (isUpgrade(currentPlanType, newPlanType)) {
      // UPGRADE: Cancel current subscription immediately and create new one
      // Transfer the reports used to the new subscription
      
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      // Get current usage to transfer
      const currentUsage = await prisma.usageRecord.findFirst({
        where: {
          userId,
          periodYear: currentYear,
          periodMonth: currentMonth,
        },
      });

      const reportsUsed = currentUsage?.reportsUsed || 0;

      // Cancel current subscription in Stripe immediately
      try {
        await stripe.subscriptions.cancel(currentSubscription.stripeSubscriptionId);
      } catch (error: any) {
        if (error.code !== 'resource_missing') {
          console.error(`Failed to cancel subscription for upgrade: ${error.message}`);
          return { type: 'error', message: 'Error al cancelar la suscripción anterior. Por favor intenta de nuevo.' };
        }
      }

      // Mark as canceled in database
      await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: { status: SubscriptionStatus.CANCELED },
      });

      // Store the reports used to transfer after checkout completes
      // We'll use metadata in the checkout session
      const planConfig = PLAN_CONFIGS[newPlanType];
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomer.stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'mxn',
            product_data: {
              name: planConfig.name,
              description: `Upgrade a ${planConfig.name}`,
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
          planType: newPlanType,
          isUpgrade: 'true',
          reportsUsedTransfer: reportsUsed.toString(),
          previousPlanType: currentPlanType,
        },
        subscription_data: {
          metadata: {
            userId,
            planType: newPlanType,
            isUpgrade: 'true',
            reportsUsedTransfer: reportsUsed.toString(),
            previousPlanType: currentPlanType,
          },
        },
      });

      return { type: 'checkout', url: session.url || undefined };

    } else if (isDowngrade(currentPlanType, newPlanType)) {
      // DOWNGRADE: Schedule the change for end of current period
      const periodEnd = currentSubscription.currentPeriodEnd;

      // Update our database to track the scheduled downgrade
      await prisma.subscription.update({
        where: { id: currentSubscription.id },
        data: {
          scheduledPlanType: newPlanType,
          scheduledChangeAt: periodEnd,
        },
      });

      // In Stripe, we use cancel_at_period_end and will create the new subscription
      // when the current one ends (handled via webhook)
      await stripe.subscriptions.update(currentSubscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
        metadata: {
          ...await this.getSubscriptionMetadata(currentSubscription.stripeSubscriptionId),
          scheduledDowngrade: newPlanType,
        },
      });

      return { 
        type: 'scheduled', 
        message: `Tu plan cambiará a ${PLAN_CONFIGS[newPlanType].name} el ${periodEnd.toLocaleDateString('es-MX')}. Hasta entonces, seguirás disfrutando de tu plan actual.`,
        scheduledAt: periodEnd,
      };
    }

    return { type: 'error', message: 'No se pudo determinar el tipo de cambio de plan.' };
  }

  private async getSubscriptionMetadata(stripeSubscriptionId: string): Promise<Record<string, string>> {
    try {
      const stripe = await getUncachableStripeClient();
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      return (subscription.metadata as Record<string, string>) || {};
    } catch {
      return {};
    }
  }

  async cancelSubscription(userId: string): Promise<{ success: boolean; message: string; cancelAt?: Date }> {
    const stripe = await getUncachableStripeClient();
    
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (!subscription) {
      return { success: false, message: 'No tienes una suscripción activa.' };
    }

    // If already scheduled for cancellation
    if (subscription.cancelAtPeriodEnd) {
      return { 
        success: false, 
        message: `Tu suscripción ya está programada para cancelarse el ${subscription.currentPeriodEnd.toLocaleDateString('es-MX')}.`,
        cancelAt: subscription.currentPeriodEnd,
      };
    }

    try {
      // Cancel at period end in Stripe
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update our database
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: true,
          scheduledPlanType: null,
          scheduledChangeAt: null,
        },
      });

      return { 
        success: true, 
        message: `Tu suscripción se cancelará el ${subscription.currentPeriodEnd.toLocaleDateString('es-MX')}. Hasta entonces, seguirás teniendo acceso completo a tu plan.`,
        cancelAt: subscription.currentPeriodEnd,
      };
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      return { success: false, message: 'Error al cancelar la suscripción. Por favor intenta de nuevo.' };
    }
  }

  async reactivateSubscription(userId: string): Promise<{ success: boolean; message: string }> {
    const stripe = await getUncachableStripeClient();
    
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    if (!subscription) {
      return { success: false, message: 'No tienes una suscripción activa.' };
    }

    if (!subscription.cancelAtPeriodEnd && !subscription.scheduledPlanType) {
      return { success: false, message: 'Tu suscripción no está programada para cancelarse o cambiar.' };
    }

    try {
      // Reactivate in Stripe
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
        metadata: {
          userId,
          planType: subscription.planType,
        },
      });

      // Update our database
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          cancelAtPeriodEnd: false,
          scheduledPlanType: null,
          scheduledChangeAt: null,
        },
      });

      return { 
        success: true, 
        message: 'Tu suscripción ha sido reactivada. Tu plan continuará renovándose normalmente.',
      };
    } catch (error: any) {
      console.error('Error reactivating subscription:', error);
      return { success: false, message: 'Error al reactivar la suscripción. Por favor intenta de nuevo.' };
    }
  }

  async handleScheduledDowngrade(stripeSubscriptionId: string): Promise<void> {
    // This is called when a subscription with a scheduled downgrade ends
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });

    if (!subscription || !subscription.scheduledPlanType) {
      return;
    }

    const stripe = await getUncachableStripeClient();
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId: subscription.userId },
    });

    if (!stripeCustomer) {
      console.error(`No Stripe customer found for user ${subscription.userId} during scheduled downgrade`);
      return;
    }

    const newPlanType = subscription.scheduledPlanType;
    const planConfig = PLAN_CONFIGS[newPlanType];

    try {
      // Deactivate excess auditors before applying the downgrade
      await this.deactivateExcessAuditors(subscription.userId, newPlanType);

      // Create product and price first, then create subscription
      const product = await stripe.products.create({
        name: planConfig.name,
        metadata: {
          planType: newPlanType,
        },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: planConfig.priceMonthlyMxn * 100,
        currency: 'mxn',
        recurring: {
          interval: 'month',
        },
      });

      // Create the new subscription with the downgraded plan
      const newSubscription = await stripe.subscriptions.create({
        customer: stripeCustomer.stripeCustomerId,
        items: [{
          price: price.id,
        }],
        metadata: {
          userId: subscription.userId,
          planType: newPlanType,
          isDowngrade: 'true',
          previousPlanType: subscription.planType,
        },
      });

      console.log(`Created new subscription ${newSubscription.id} for user ${subscription.userId} after scheduled downgrade from ${subscription.planType} to ${newPlanType}`);
    } catch (error: any) {
      console.error(`Error creating downgraded subscription: ${error.message}`);
    }
  }

  async deactivateExcessAuditors(userId: string, newPlanType: PlanType): Promise<{ deactivatedCount: number }> {
    const planConfig = PLAN_CONFIGS[newPlanType];
    const maxAuditors = planConfig.maxAuditors;

    // Get all active auditors ordered by creation date (oldest first)
    const activeAuditors = await prisma.user.findMany({
      where: {
        parentId: userId,
        rol: UserRole.AUDITOR,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true },
    });

    const currentActiveCount = activeAuditors.length;

    if (currentActiveCount <= maxAuditors) {
      return { deactivatedCount: 0 };
    }

    // Deactivate the excess auditors (keep the oldest ones active)
    const auditorsToDeactivate = activeAuditors.slice(maxAuditors);
    const auditorsToDeactivateIds = auditorsToDeactivate.map(a => a.id);

    await prisma.user.updateMany({
      where: {
        id: { in: auditorsToDeactivateIds },
      },
      data: { isActive: false },
    });

    // End their sessions immediately
    await prisma.session.deleteMany({
      where: {
        userId: { in: auditorsToDeactivateIds },
      },
    });

    console.log(`Auto-deactivated ${auditorsToDeactivate.length} auditors for broker ${userId} due to plan downgrade to ${newPlanType}. Deactivated: ${auditorsToDeactivate.map(a => a.email).join(', ')}`);

    return { deactivatedCount: auditorsToDeactivate.length };
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

  async handleInvoiceCreated(invoiceId: string, customerId: string, subscriptionId: string | null): Promise<void> {
    if (!subscriptionId) {
      console.log(`Invoice ${invoiceId} is not associated with a subscription, skipping extra charges`);
      return;
    }

    const stripe = await getUncachableStripeClient();
    
    const stripeCustomer = await prisma.stripeCustomer.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!stripeCustomer) {
      console.log(`Customer ${customerId} not found in database for invoice ${invoiceId}`);
      return;
    }

    const subscription = await prisma.subscription.findFirst({
      where: {
        stripeSubscriptionId: subscriptionId,
      },
    });

    if (!subscription) {
      console.log(`No subscription found with id ${subscriptionId}`);
      return;
    }

    const invoice = await stripe.invoices.retrieve(invoiceId);
    
    if (invoice.billing_reason !== 'subscription_cycle') {
      console.log(`Invoice ${invoiceId} billing_reason is ${invoice.billing_reason}, not subscription_cycle. Skipping extra charges.`);
      return;
    }

    // Get the period that just ended from the Stripe subscription
    const stripeSubscriptionResponse = await stripe.subscriptions.retrieve(subscriptionId);
    const stripeSubscription = stripeSubscriptionResponse as any;
    const currentPeriodStart = new Date(stripeSubscription.current_period_start * 1000);
    
    // Find unbilled usage records for CLOSED periods only (periodStart < currentPeriodStart)
    // This ensures we don't bill the period that just started
    const unbilledUsageRecords = await prisma.usageRecord.findMany({
      where: {
        userId: stripeCustomer.userId,
        extraReportsUsed: { gt: 0 },
        extraChargesBilled: false,
        periodStart: {
          lt: currentPeriodStart,
        },
      },
      orderBy: [
        { periodYear: 'asc' },
        { periodMonth: 'asc' },
      ],
    });

    if (unbilledUsageRecords.length === 0) {
      console.log(`No unbilled extra reports to charge for user ${stripeCustomer.userId}`);
      return;
    }

    // Calculate total extras from all unbilled periods
    let totalExtraReportsCount = 0;
    let totalExtraChargesMxn = 0;
    const recordsToMark: string[] = [];
    const periodDescriptions: string[] = [];

    for (const record of unbilledUsageRecords) {
      totalExtraReportsCount += record.extraReportsUsed;
      totalExtraChargesMxn += record.extraChargesMxn;
      recordsToMark.push(record.id);
      periodDescriptions.push(`${record.periodMonth}/${record.periodYear}`);
    }

    if (totalExtraChargesMxn <= 0) {
      console.log(`No extra charges amount to bill for user ${stripeCustomer.userId}`);
      return;
    }

    // IDEMPOTENCY: Mark records as billed FIRST, before calling Stripe
    // This prevents duplicate charges if webhook retries after Stripe call succeeds but before DB update
    try {
      await prisma.usageRecord.updateMany({
        where: { id: { in: recordsToMark } },
        data: { extraChargesBilled: true },
      });
    } catch (dbError: any) {
      console.error(`Error marking usage records as billed: ${dbError.message}`);
      return;
    }

    try {
      // Add a single invoice item for all extra reports
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoiceId,
        amount: Math.round(totalExtraChargesMxn * 100),
        currency: 'mxn',
        description: `${totalExtraReportsCount} informe(s) extra(s) (periodos: ${periodDescriptions.join(', ')})`,
      });

      console.log(`Added ${totalExtraReportsCount} extra reports ($${totalExtraChargesMxn} MXN) to invoice ${invoiceId} for user ${stripeCustomer.userId} from periods: ${periodDescriptions.join(', ')}`);
    } catch (error: any) {
      // Check if this is a duplicate (invoice already finalized/paid) - this is OK
      if (error.message?.includes('already finalized') || error.message?.includes('already paid')) {
        console.log(`Invoice ${invoiceId} already processed, charges were marked but item not added (OK)`);
        return;
      }
      
      // If Stripe call failed for other reasons, revert the billed flag
      console.error(`Error adding invoice item for extra reports: ${error.message}. Reverting billed flag.`);
      await prisma.usageRecord.updateMany({
        where: { id: { in: recordsToMark } },
        data: { extraChargesBilled: false },
      });
    }
  }

  async handleInvoicePaymentSucceeded(invoiceId: string, customerId: string, subscriptionId: string | null): Promise<void> {
    if (!subscriptionId) {
      return;
    }

    const stripeCustomer = await prisma.stripeCustomer.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (!stripeCustomer) {
      return;
    }

    console.log(`Invoice ${invoiceId} payment succeeded for user ${stripeCustomer.userId}`);
  }

  async handleSubscriptionCancellationWithExtras(userId: string): Promise<{ 
    success: boolean; 
    extraChargesMxn: number; 
    extraReportsCount: number;
    invoiceId?: string;
  }> {
    const stripe = await getUncachableStripeClient();
    
    const stripeCustomer = await prisma.stripeCustomer.findUnique({
      where: { userId },
    });

    if (!stripeCustomer) {
      return { success: false, extraChargesMxn: 0, extraReportsCount: 0 };
    }

    // Find ALL unbilled usage records for this user with extra charges
    const unbilledUsageRecords = await prisma.usageRecord.findMany({
      where: {
        userId,
        extraReportsUsed: { gt: 0 },
        extraChargesBilled: false,
      },
      orderBy: [
        { periodYear: 'asc' },
        { periodMonth: 'asc' },
      ],
    });

    if (unbilledUsageRecords.length === 0) {
      return { success: true, extraChargesMxn: 0, extraReportsCount: 0 };
    }

    // Calculate totals from all unbilled periods
    let totalExtraReportsCount = 0;
    let totalExtraChargesMxn = 0;
    const recordsToMark: string[] = [];
    const periodDescriptions: string[] = [];

    for (const record of unbilledUsageRecords) {
      totalExtraReportsCount += record.extraReportsUsed;
      totalExtraChargesMxn += record.extraChargesMxn;
      recordsToMark.push(record.id);
      periodDescriptions.push(`${record.periodMonth}/${record.periodYear}`);
    }

    if (totalExtraChargesMxn <= 0) {
      return { success: true, extraChargesMxn: 0, extraReportsCount: 0 };
    }

    // IDEMPOTENCY: Mark records as billed FIRST, before calling Stripe
    try {
      await prisma.usageRecord.updateMany({
        where: { id: { in: recordsToMark } },
        data: { extraChargesBilled: true },
      });
    } catch (dbError: any) {
      console.error(`Error marking usage records as billed for cancellation: ${dbError.message}`);
      return { success: false, extraChargesMxn: totalExtraChargesMxn, extraReportsCount: totalExtraReportsCount };
    }

    try {
      await stripe.invoiceItems.create({
        customer: stripeCustomer.stripeCustomerId,
        amount: Math.round(totalExtraChargesMxn * 100),
        currency: 'mxn',
        description: `${totalExtraReportsCount} informe(s) extra(s) pendiente(s) - Cobro final por cancelación (periodos: ${periodDescriptions.join(', ')})`,
      });

      const invoice = await stripe.invoices.create({
        customer: stripeCustomer.stripeCustomerId,
        auto_advance: true,
        collection_method: 'charge_automatically',
        metadata: {
          userId,
          type: 'cancellation_extras',
        },
      });

      await stripe.invoices.finalizeInvoice(invoice.id);

      console.log(`Created final invoice ${invoice.id} for ${totalExtraReportsCount} extra reports ($${totalExtraChargesMxn} MXN) for user ${userId} from periods: ${periodDescriptions.join(', ')}`);

      return { 
        success: true, 
        extraChargesMxn: totalExtraChargesMxn, 
        extraReportsCount: totalExtraReportsCount,
        invoiceId: invoice.id,
      };
    } catch (error: any) {
      // If Stripe call failed, revert the billed flag
      console.error(`Error creating final invoice for extras: ${error.message}. Reverting billed flag.`);
      await prisma.usageRecord.updateMany({
        where: { id: { in: recordsToMark } },
        data: { extraChargesBilled: false },
      });
      return { success: false, extraChargesMxn: totalExtraChargesMxn, extraReportsCount: totalExtraReportsCount };
    }
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
