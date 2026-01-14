import prisma from '../config/database';
import { RuleLevel, RuleCategory, ScoringRuleRecord } from '../generated/prisma';
import { logRuleChange, createRulesVersion } from './ruleVersioningService';

export interface ScoringRuleInput {
  ruleId: string;
  name: string;
  level: 'CRÍTICO' | 'IMPORTANTE' | 'MODERADO' | 'DISCRETO';
  points: number;
  description: string;
  providerTarget: string;
  category: 'GENERAL' | 'GNP' | 'METLIFE' | 'NYLIFE';
  isCustom?: boolean;
  conditions?: any[];
  logicOperator?: string;
  affectedFields: string[];
  hasValidator?: boolean;
  validatorKey?: string;
}

export interface ScoringRuleOutput {
  id: string;
  ruleId: string;
  name: string;
  level: 'CRÍTICO' | 'IMPORTANTE' | 'MODERADO' | 'DISCRETO';
  points: number;
  description: string;
  providerTarget: string;
  category: 'GENERAL' | 'GNP' | 'METLIFE' | 'NYLIFE';
  isCustom: boolean;
  isActive: boolean;
  conditions: any[] | null;
  logicOperator: string | null;
  affectedFields: string[];
  hasValidator: boolean;
  validatorKey: string | null;
}

function mapLevelToEnum(level: string): RuleLevel {
  const mapping: Record<string, RuleLevel> = {
    'CRÍTICO': RuleLevel.CRITICO,
    'CRITICO': RuleLevel.CRITICO,
    'IMPORTANTE': RuleLevel.IMPORTANTE,
    'MODERADO': RuleLevel.MODERADO,
    'DISCRETO': RuleLevel.DISCRETO,
  };
  return mapping[level.toUpperCase()] || RuleLevel.MODERADO;
}

function mapEnumToLevel(level: RuleLevel): 'CRÍTICO' | 'IMPORTANTE' | 'MODERADO' | 'DISCRETO' {
  const mapping: Record<RuleLevel, 'CRÍTICO' | 'IMPORTANTE' | 'MODERADO' | 'DISCRETO'> = {
    [RuleLevel.CRITICO]: 'CRÍTICO',
    [RuleLevel.IMPORTANTE]: 'IMPORTANTE',
    [RuleLevel.MODERADO]: 'MODERADO',
    [RuleLevel.DISCRETO]: 'DISCRETO',
  };
  return mapping[level];
}

function mapCategoryToEnum(category: string): RuleCategory {
  const mapping: Record<string, RuleCategory> = {
    'GENERAL': RuleCategory.GENERAL,
    'GNP': RuleCategory.GNP,
    'METLIFE': RuleCategory.METLIFE,
    'NYLIFE': RuleCategory.NYLIFE,
  };
  return mapping[category.toUpperCase()] || RuleCategory.GENERAL;
}

function mapEnumToCategory(category: RuleCategory): 'GENERAL' | 'GNP' | 'METLIFE' | 'NYLIFE' {
  return category as 'GENERAL' | 'GNP' | 'METLIFE' | 'NYLIFE';
}

function transformToOutput(record: ScoringRuleRecord): ScoringRuleOutput {
  return {
    id: record.id,
    ruleId: record.ruleId,
    name: record.name,
    level: mapEnumToLevel(record.level),
    points: record.points,
    description: record.description,
    providerTarget: record.providerTarget,
    category: mapEnumToCategory(record.category),
    isCustom: record.isCustom,
    isActive: record.isActive,
    conditions: record.conditions as any[] | null,
    logicOperator: record.logicOperator,
    affectedFields: record.affectedFields,
    hasValidator: record.hasValidator,
    validatorKey: record.validatorKey,
  };
}

export async function getAllActiveRules(): Promise<ScoringRuleOutput[]> {
  const rules = await prisma.scoringRuleRecord.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { points: 'desc' }],
  });
  return rules.map(transformToOutput);
}

export async function getRulesByCategory(category: 'GENERAL' | 'GNP' | 'METLIFE' | 'NYLIFE'): Promise<ScoringRuleOutput[]> {
  const rules = await prisma.scoringRuleRecord.findMany({
    where: {
      isActive: true,
      category: mapCategoryToEnum(category),
    },
    orderBy: { points: 'desc' },
  });
  return rules.map(transformToOutput);
}

export async function getRulesByProvider(providerTarget: string): Promise<ScoringRuleOutput[]> {
  const rules = await prisma.scoringRuleRecord.findMany({
    where: {
      isActive: true,
      OR: [
        { providerTarget: 'ALL' },
        { providerTarget: providerTarget.toUpperCase() },
      ],
    },
    orderBy: { points: 'desc' },
  });
  return rules.map(transformToOutput);
}

export async function getRulesForAseguradora(aseguradora: 'GNP' | 'METLIFE' | 'NYLIFE'): Promise<ScoringRuleOutput[]> {
  const rules = await prisma.scoringRuleRecord.findMany({
    where: {
      isActive: true,
      OR: [
        { category: RuleCategory.GENERAL },
        { category: mapCategoryToEnum(aseguradora) },
      ],
    },
    orderBy: [{ category: 'asc' }, { points: 'desc' }],
  });
  return rules.map(transformToOutput);
}

export async function createRule(input: ScoringRuleInput, changedBy?: string): Promise<ScoringRuleOutput> {
  const rule = await prisma.scoringRuleRecord.create({
    data: {
      ruleId: input.ruleId,
      name: input.name,
      level: mapLevelToEnum(input.level),
      points: input.points,
      description: input.description,
      providerTarget: input.providerTarget.toUpperCase(),
      category: mapCategoryToEnum(input.category),
      isCustom: input.isCustom || false,
      conditions: input.conditions || null,
      logicOperator: input.logicOperator || null,
      affectedFields: input.affectedFields,
      hasValidator: input.hasValidator || false,
      validatorKey: input.validatorKey || null,
    },
  });
  
  const output = transformToOutput(rule);
  
  await logRuleChange(
    input.ruleId,
    input.name,
    'CREATED',
    null,
    output,
    changedBy
  );
  
  await createRulesVersion(`Nueva regla: ${input.name}`);
  
  return output;
}

export async function createManyRules(inputs: ScoringRuleInput[]): Promise<number> {
  const result = await prisma.scoringRuleRecord.createMany({
    data: inputs.map(input => ({
      ruleId: input.ruleId,
      name: input.name,
      level: mapLevelToEnum(input.level),
      points: input.points,
      description: input.description,
      providerTarget: input.providerTarget.toUpperCase(),
      category: mapCategoryToEnum(input.category),
      isCustom: input.isCustom || false,
      conditions: input.conditions || null,
      logicOperator: input.logicOperator || null,
      affectedFields: input.affectedFields,
      hasValidator: input.hasValidator || false,
      validatorKey: input.validatorKey || null,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

export async function updateRule(ruleId: string, updates: Partial<ScoringRuleInput>, changedBy?: string): Promise<ScoringRuleOutput | null> {
  const existing = await prisma.scoringRuleRecord.findUnique({
    where: { ruleId },
  });

  if (!existing) {
    return null;
  }

  const previousValue = transformToOutput(existing);

  const updateData: any = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.level !== undefined) updateData.level = mapLevelToEnum(updates.level);
  if (updates.points !== undefined) updateData.points = updates.points;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.providerTarget !== undefined) updateData.providerTarget = updates.providerTarget.toUpperCase();
  if (updates.category !== undefined) updateData.category = mapCategoryToEnum(updates.category);
  if (updates.isCustom !== undefined) updateData.isCustom = updates.isCustom;
  if (updates.conditions !== undefined) updateData.conditions = updates.conditions;
  if (updates.logicOperator !== undefined) updateData.logicOperator = updates.logicOperator;
  if (updates.affectedFields !== undefined) updateData.affectedFields = updates.affectedFields;
  if (updates.hasValidator !== undefined) updateData.hasValidator = updates.hasValidator;
  if (updates.validatorKey !== undefined) updateData.validatorKey = updates.validatorKey;

  const rule = await prisma.scoringRuleRecord.update({
    where: { ruleId },
    data: updateData,
  });
  
  const newValue = transformToOutput(rule);
  
  await logRuleChange(
    ruleId,
    newValue.name,
    'UPDATED',
    previousValue,
    newValue,
    changedBy
  );
  
  await createRulesVersion(`Regla actualizada: ${newValue.name}`);
  
  return newValue;
}

export async function deactivateRule(ruleId: string, changedBy?: string): Promise<boolean> {
  try {
    const existing = await prisma.scoringRuleRecord.findUnique({
      where: { ruleId },
    });
    
    if (!existing) return false;
    
    await prisma.scoringRuleRecord.update({
      where: { ruleId },
      data: { isActive: false },
    });
    
    await logRuleChange(
      ruleId,
      existing.name,
      'DEACTIVATED',
      { isActive: true },
      { isActive: false },
      changedBy
    );
    
    await createRulesVersion(`Regla desactivada: ${existing.name}`);
    
    return true;
  } catch {
    return false;
  }
}

export async function activateRule(ruleId: string, changedBy?: string): Promise<boolean> {
  try {
    const existing = await prisma.scoringRuleRecord.findUnique({
      where: { ruleId },
    });
    
    if (!existing) return false;
    
    await prisma.scoringRuleRecord.update({
      where: { ruleId },
      data: { isActive: true },
    });
    
    await logRuleChange(
      ruleId,
      existing.name,
      'ACTIVATED',
      { isActive: false },
      { isActive: true },
      changedBy
    );
    
    await createRulesVersion(`Regla activada: ${existing.name}`);
    
    return true;
  } catch {
    return false;
  }
}

export async function deleteRule(ruleId: string, changedBy?: string): Promise<boolean> {
  try {
    const existing = await prisma.scoringRuleRecord.findUnique({
      where: { ruleId },
    });
    
    if (!existing) return false;
    
    const previousValue = transformToOutput(existing);
    
    await prisma.scoringRuleRecord.delete({
      where: { ruleId },
    });
    
    await logRuleChange(
      ruleId,
      existing.name,
      'DELETED',
      previousValue,
      null,
      changedBy
    );
    
    await createRulesVersion(`Regla eliminada: ${existing.name}`);
    
    return true;
  } catch {
    return false;
  }
}

export async function getRuleById(ruleId: string): Promise<ScoringRuleOutput | null> {
  const rule = await prisma.scoringRuleRecord.findUnique({
    where: { ruleId },
  });
  return rule ? transformToOutput(rule) : null;
}

export async function countRules(): Promise<{ total: number; active: number; byCategory: Record<string, number> }> {
  const [total, active, general, gnp, metlife, nylife] = await Promise.all([
    prisma.scoringRuleRecord.count(),
    prisma.scoringRuleRecord.count({ where: { isActive: true } }),
    prisma.scoringRuleRecord.count({ where: { category: RuleCategory.GENERAL } }),
    prisma.scoringRuleRecord.count({ where: { category: RuleCategory.GNP } }),
    prisma.scoringRuleRecord.count({ where: { category: RuleCategory.METLIFE } }),
    prisma.scoringRuleRecord.count({ where: { category: RuleCategory.NYLIFE } }),
  ]);

  return {
    total,
    active,
    byCategory: { GENERAL: general, GNP: gnp, METLIFE: metlife, NYLIFE: nylife },
  };
}

export async function clearAllRules(): Promise<number> {
  const result = await prisma.scoringRuleRecord.deleteMany();
  return result.count;
}
