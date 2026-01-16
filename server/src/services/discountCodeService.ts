import prisma from '../config/database';
import { getUncachableStripeClient } from './stripeClient';
import { DiscountType, DiscountUsageType } from '../generated/prisma';

interface CreateDiscountCodeParams {
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  usageType: DiscountUsageType;
  maxRedemptions?: number;
  validFrom?: Date;
  validUntil?: Date;
}

class DiscountCodeService {
  async createDiscountCode(params: CreateDiscountCodeParams) {
    const stripe = await getUncachableStripeClient();

    const existingCode = await prisma.discountCode.findUnique({
      where: { code: params.code.toUpperCase() },
    });

    if (existingCode) {
      throw new Error('Ya existe un código con ese nombre');
    }

    const couponParams: any = {
      duration: 'once',
      name: params.description || params.code,
      currency: 'mxn',
    };

    if (params.discountType === 'PERCENTAGE') {
      couponParams.percent_off = params.discountValue;
    } else {
      couponParams.amount_off = params.discountValue * 100;
    }

    if (params.validUntil) {
      couponParams.redeem_by = Math.floor(params.validUntil.getTime() / 1000);
    }

    if (params.usageType === 'SINGLE_USE' && params.maxRedemptions) {
      couponParams.max_redemptions = params.maxRedemptions;
    }

    const coupon = await stripe.coupons.create(couponParams);

    const promoCodeParams: any = {
      coupon: coupon.id,
      code: params.code.toUpperCase(),
      restrictions: {
        first_time_transaction: true,
      },
    };

    if (params.usageType === 'SINGLE_USE' && params.maxRedemptions) {
      promoCodeParams.max_redemptions = params.maxRedemptions;
    }

    if (params.validUntil) {
      promoCodeParams.expires_at = Math.floor(params.validUntil.getTime() / 1000);
    }

    const promoCode = await stripe.promotionCodes.create(promoCodeParams);

    const discountCode = await prisma.discountCode.create({
      data: {
        code: params.code.toUpperCase(),
        description: params.description,
        discountType: params.discountType,
        discountValue: params.discountValue,
        usageType: params.usageType,
        maxRedemptions: params.maxRedemptions,
        validFrom: params.validFrom,
        validUntil: params.validUntil,
        stripeCouponId: coupon.id,
        stripePromoCodeId: promoCode.id,
      },
    });

    return discountCode;
  }

  async listDiscountCodes() {
    const codes = await prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { usages: true },
        },
      },
    });

    return codes.map(code => ({
      ...code,
      usageCount: code._count.usages,
    }));
  }

  async toggleDiscountCode(id: string, isActive: boolean) {
    const code = await prisma.discountCode.findUnique({
      where: { id },
    });

    if (!code) {
      throw new Error('Código no encontrado');
    }

    const stripe = await getUncachableStripeClient();

    await stripe.promotionCodes.update(code.stripePromoCodeId, {
      active: isActive,
    });

    return prisma.discountCode.update({
      where: { id },
      data: { isActive },
    });
  }

  async getDiscountCode(id: string) {
    return prisma.discountCode.findUnique({
      where: { id },
      include: {
        usages: {
          include: {
            user: {
              select: { id: true, email: true, nombre: true },
            },
          },
          orderBy: { usedAt: 'desc' },
          take: 50,
        },
      },
    });
  }

  async recordUsage(discountCodeId: string, userId: string, amountDiscounted?: number) {
    const existingUsage = await prisma.discountCodeUsage.findUnique({
      where: {
        discountCodeId_userId: {
          discountCodeId,
          userId,
        },
      },
    });

    if (existingUsage) {
      return existingUsage;
    }

    const [usage] = await prisma.$transaction([
      prisma.discountCodeUsage.create({
        data: {
          discountCodeId,
          userId,
          amountDiscounted,
        },
      }),
      prisma.discountCode.update({
        where: { id: discountCodeId },
        data: {
          timesRedeemed: { increment: 1 },
        },
      }),
    ]);

    return usage;
  }

  async findByStripePromoCodeId(stripePromoCodeId: string) {
    return prisma.discountCode.findFirst({
      where: { stripePromoCodeId },
    });
  }
}

export const discountCodeService = new DiscountCodeService();
