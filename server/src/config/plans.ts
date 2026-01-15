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
    maxAuditors: 1,
    benefits: [
      '1 Usuario Broker',
      '1 Usuario Auditor',
      'Soporte por correo',
      'Acceso a reglas estándar'
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
    maxAuditors: 5,
    benefits: [
      '1 Usuario Broker',
      'Hasta 5 Usuarios Auditores',
      'Soporte prioritario',
      'Reglas personalizables',
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
    maxAuditors: 15,
    benefits: [
      '1 Usuario Broker',
      'Hasta 15 Usuarios Auditores',
      'Soporte 24/7 personalizado',
      'API access (próximamente)',
      'Capacitación inicial',
      'Reportes ejecutivos mensuales'
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
