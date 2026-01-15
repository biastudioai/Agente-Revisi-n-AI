import { PlanType } from '../generated/prisma';

export interface PlanConfig {
  planType: PlanType;
  name: string;
  priceMonthlyMxn: number;
  reportsIncluded: number;
  reportsIncludedPromotion: number;
  extraReportPriceMxn: number;
  extraReportPricePromotionMxn: number;
  promotionDurationMonths: number;
  maxBrokers: number;
  maxAuditors: number;
  benefits: string[];
}

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  [PlanType.PLAN_1]: {
    planType: PlanType.PLAN_1,
    name: 'Plan Básico',
    priceMonthlyMxn: 499,
    reportsIncluded: 25,
    reportsIncludedPromotion: 50,
    extraReportPriceMxn: 30,
    extraReportPricePromotionMxn: 20,
    promotionDurationMonths: 3,
    maxBrokers: 1,
    maxAuditors: 0,
    benefits: [
      '1 Usuario Broker',
      'Soporte por correo'
    ],
  },
  [PlanType.PLAN_2]: {
    planType: PlanType.PLAN_2,
    name: 'Plan Profesional',
    priceMonthlyMxn: 999,
    reportsIncluded: 55,
    reportsIncludedPromotion: 110,
    extraReportPriceMxn: 25,
    extraReportPricePromotionMxn: 20,
    promotionDurationMonths: 3,
    maxBrokers: 1,
    maxAuditors: 3,
    benefits: [
      '1 Usuario Broker',
      'Hasta 3 Usuarios Auditores',
      'Soporte prioritario',
      'Dashboard de estadísticas'
    ],
  },
  [PlanType.PLAN_3]: {
    planType: PlanType.PLAN_3,
    name: 'Plan Empresarial',
    priceMonthlyMxn: 2999,
    reportsIncluded: 170,
    reportsIncludedPromotion: 340,
    extraReportPriceMxn: 20,
    extraReportPricePromotionMxn: 19,
    promotionDurationMonths: 3,
    maxBrokers: 1,
    maxAuditors: 10,
    benefits: [
      '1 Usuario Broker',
      'Hasta 10 Usuarios Auditores',
      'Soporte personalizado',
      'Capacitación inicial'
    ],
  },
};

export function getPlanConfig(planType: PlanType): PlanConfig {
  return PLAN_CONFIGS[planType];
}

export function getReportsLimit(planType: PlanType, isInPromotion: boolean): number {
  const config = PLAN_CONFIGS[planType];
  return isInPromotion ? config.reportsIncludedPromotion : config.reportsIncluded;
}

export function getExtraReportPrice(planType: PlanType, isInPromotion: boolean): number {
  const config = PLAN_CONFIGS[planType];
  return isInPromotion ? config.extraReportPricePromotionMxn : config.extraReportPriceMxn;
}
