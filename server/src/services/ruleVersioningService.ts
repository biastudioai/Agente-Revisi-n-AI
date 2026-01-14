import prisma from '../config/database';
import { RuleChangeType, RuleLevel, RuleCategory } from '../generated/prisma';
import { createHash } from 'crypto';

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

function mapEnumToLevel(level: RuleLevel): 'CRÍTICO' | 'IMPORTANTE' | 'MODERADO' | 'DISCRETO' {
  const mapping: Record<RuleLevel, 'CRÍTICO' | 'IMPORTANTE' | 'MODERADO' | 'DISCRETO'> = {
    [RuleLevel.CRITICO]: 'CRÍTICO',
    [RuleLevel.IMPORTANTE]: 'IMPORTANTE',
    [RuleLevel.MODERADO]: 'MODERADO',
    [RuleLevel.DISCRETO]: 'DISCRETO',
  };
  return mapping[level];
}

function mapEnumToCategory(category: RuleCategory): 'GENERAL' | 'GNP' | 'METLIFE' | 'NYLIFE' {
  return category as 'GENERAL' | 'GNP' | 'METLIFE' | 'NYLIFE';
}

async function getAllActiveRulesInternal(): Promise<ScoringRuleOutput[]> {
  const rules = await prisma.scoringRuleRecord.findMany({
    where: { isActive: true },
    orderBy: [{ category: 'asc' }, { points: 'desc' }],
  });
  return rules.map(record => ({
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
  }));
}

export interface RuleVersionOutput {
  id: string;
  versionNumber: number;
  rulesSnapshot: ScoringRuleOutput[];
  rulesHash: string;
  description: string | null;
  createdAt: Date;
}

export interface RuleChangeLogOutput {
  id: string;
  ruleId: string;
  ruleName: string;
  changeType: 'CREATED' | 'UPDATED' | 'DELETED' | 'ACTIVATED' | 'DEACTIVATED';
  previousValue: any;
  newValue: any;
  changedBy: string | null;
  changeReason: string | null;
  versionNumber: number;
  createdAt: Date;
}

function generateRulesHash(rules: ScoringRuleOutput[]): string {
  const sortedRules = [...rules].sort((a, b) => a.ruleId.localeCompare(b.ruleId));
  const rulesString = JSON.stringify(sortedRules.map(r => ({
    ruleId: r.ruleId,
    name: r.name,
    level: r.level,
    points: r.points,
    description: r.description,
    conditions: r.conditions,
    logicOperator: r.logicOperator,
    affectedFields: r.affectedFields,
    isActive: r.isActive,
  })));
  return createHash('sha256').update(rulesString).digest('hex').substring(0, 16);
}

export async function getCurrentRulesVersion(): Promise<RuleVersionOutput | null> {
  const version = await prisma.ruleVersion.findFirst({
    orderBy: { versionNumber: 'desc' },
  });
  
  if (!version) return null;
  
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    rulesSnapshot: version.rulesSnapshot as ScoringRuleOutput[],
    rulesHash: version.rulesHash,
    description: version.description,
    createdAt: version.createdAt,
  };
}

export async function getVersionByNumber(versionNumber: number): Promise<RuleVersionOutput | null> {
  const version = await prisma.ruleVersion.findUnique({
    where: { versionNumber },
  });
  
  if (!version) return null;
  
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    rulesSnapshot: version.rulesSnapshot as ScoringRuleOutput[],
    rulesHash: version.rulesHash,
    description: version.description,
    createdAt: version.createdAt,
  };
}

export async function getVersionById(versionId: string): Promise<RuleVersionOutput | null> {
  const version = await prisma.ruleVersion.findUnique({
    where: { id: versionId },
  });
  
  if (!version) return null;
  
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    rulesSnapshot: version.rulesSnapshot as ScoringRuleOutput[],
    rulesHash: version.rulesHash,
    description: version.description,
    createdAt: version.createdAt,
  };
}

export async function createRulesVersion(description?: string): Promise<RuleVersionOutput> {
  const currentRules = await getAllActiveRulesInternal();
  const rulesHash = generateRulesHash(currentRules);
  
  const existingVersion = await prisma.ruleVersion.findFirst({
    where: { rulesHash },
    orderBy: { versionNumber: 'desc' },
  });
  
  if (existingVersion) {
    return {
      id: existingVersion.id,
      versionNumber: existingVersion.versionNumber,
      rulesSnapshot: existingVersion.rulesSnapshot as ScoringRuleOutput[],
      rulesHash: existingVersion.rulesHash,
      description: existingVersion.description,
      createdAt: existingVersion.createdAt,
    };
  }
  
  const latestVersion = await prisma.ruleVersion.findFirst({
    orderBy: { versionNumber: 'desc' },
  });
  
  const newVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;
  
  const version = await prisma.ruleVersion.create({
    data: {
      versionNumber: newVersionNumber,
      rulesSnapshot: currentRules as any,
      rulesHash,
      description: description || `Versión ${newVersionNumber} - ${new Date().toLocaleDateString('es-MX')}`,
    },
  });
  
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    rulesSnapshot: version.rulesSnapshot as ScoringRuleOutput[],
    rulesHash: version.rulesHash,
    description: version.description,
    createdAt: version.createdAt,
  };
}

export async function ensureInitialVersion(): Promise<RuleVersionOutput> {
  const existingVersion = await getCurrentRulesVersion();
  if (existingVersion) {
    return existingVersion;
  }
  return createRulesVersion('Versión inicial de reglas');
}

export async function logRuleChange(
  ruleId: string,
  ruleName: string,
  changeType: 'CREATED' | 'UPDATED' | 'DELETED' | 'ACTIVATED' | 'DEACTIVATED',
  previousValue: any,
  newValue: any,
  changedBy?: string,
  changeReason?: string
): Promise<RuleChangeLogOutput> {
  const latestVersion = await prisma.ruleVersion.findFirst({
    orderBy: { versionNumber: 'desc' },
  });
  
  const versionNumber = (latestVersion?.versionNumber ?? 0) + 1;
  
  const changeTypeMap: Record<string, RuleChangeType> = {
    'CREATED': RuleChangeType.CREATED,
    'UPDATED': RuleChangeType.UPDATED,
    'DELETED': RuleChangeType.DELETED,
    'ACTIVATED': RuleChangeType.ACTIVATED,
    'DEACTIVATED': RuleChangeType.DEACTIVATED,
  };
  
  const log = await prisma.ruleChangeLog.create({
    data: {
      ruleId,
      ruleName,
      changeType: changeTypeMap[changeType],
      previousValue: previousValue || null,
      newValue: newValue || null,
      changedBy: changedBy || null,
      changeReason: changeReason || null,
      versionNumber,
    },
  });
  
  return {
    id: log.id,
    ruleId: log.ruleId,
    ruleName: log.ruleName,
    changeType: changeType,
    previousValue: log.previousValue,
    newValue: log.newValue,
    changedBy: log.changedBy,
    changeReason: log.changeReason,
    versionNumber: log.versionNumber,
    createdAt: log.createdAt,
  };
}

export async function getChangeLogForRule(ruleId: string): Promise<RuleChangeLogOutput[]> {
  const logs = await prisma.ruleChangeLog.findMany({
    where: { ruleId },
    orderBy: { createdAt: 'desc' },
  });
  
  const changeTypeReverseMap: Record<RuleChangeType, 'CREATED' | 'UPDATED' | 'DELETED' | 'ACTIVATED' | 'DEACTIVATED'> = {
    [RuleChangeType.CREATED]: 'CREATED',
    [RuleChangeType.UPDATED]: 'UPDATED',
    [RuleChangeType.DELETED]: 'DELETED',
    [RuleChangeType.ACTIVATED]: 'ACTIVATED',
    [RuleChangeType.DEACTIVATED]: 'DEACTIVATED',
  };
  
  return logs.map(log => ({
    id: log.id,
    ruleId: log.ruleId,
    ruleName: log.ruleName,
    changeType: changeTypeReverseMap[log.changeType],
    previousValue: log.previousValue,
    newValue: log.newValue,
    changedBy: log.changedBy,
    changeReason: log.changeReason,
    versionNumber: log.versionNumber,
    createdAt: log.createdAt,
  }));
}

export async function getRecentChangeLogs(limit: number = 50): Promise<RuleChangeLogOutput[]> {
  const logs = await prisma.ruleChangeLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  
  const changeTypeReverseMap: Record<RuleChangeType, 'CREATED' | 'UPDATED' | 'DELETED' | 'ACTIVATED' | 'DEACTIVATED'> = {
    [RuleChangeType.CREATED]: 'CREATED',
    [RuleChangeType.UPDATED]: 'UPDATED',
    [RuleChangeType.DELETED]: 'DELETED',
    [RuleChangeType.ACTIVATED]: 'ACTIVATED',
    [RuleChangeType.DEACTIVATED]: 'DEACTIVATED',
  };
  
  return logs.map(log => ({
    id: log.id,
    ruleId: log.ruleId,
    ruleName: log.ruleName,
    changeType: changeTypeReverseMap[log.changeType],
    previousValue: log.previousValue,
    newValue: log.newValue,
    changedBy: log.changedBy,
    changeReason: log.changeReason,
    versionNumber: log.versionNumber,
    createdAt: log.createdAt,
  }));
}

export async function getAllVersions(): Promise<RuleVersionOutput[]> {
  const versions = await prisma.ruleVersion.findMany({
    orderBy: { versionNumber: 'desc' },
  });
  
  return versions.map(v => ({
    id: v.id,
    versionNumber: v.versionNumber,
    rulesSnapshot: v.rulesSnapshot as ScoringRuleOutput[],
    rulesHash: v.rulesHash,
    description: v.description,
    createdAt: v.createdAt,
  }));
}

export async function checkIfRulesChanged(fromVersionId: string): Promise<{
  changed: boolean;
  currentVersion: RuleVersionOutput | null;
  originalVersion: RuleVersionOutput | null;
  changeCount: number;
}> {
  const originalVersion = await getVersionById(fromVersionId);
  if (!originalVersion) {
    return { changed: false, currentVersion: null, originalVersion: null, changeCount: 0 };
  }
  
  const currentRules = await getAllActiveRulesInternal();
  const currentHash = generateRulesHash(currentRules);
  
  const changed = originalVersion.rulesHash !== currentHash;
  
  let changeCount = 0;
  if (changed) {
    const logs = await prisma.ruleChangeLog.count({
      where: {
        versionNumber: { gt: originalVersion.versionNumber },
      },
    });
    changeCount = logs;
  }
  
  const currentVersion = await getCurrentRulesVersion();
  
  return {
    changed,
    currentVersion,
    originalVersion,
    changeCount,
  };
}

export async function getChangesBetweenVersions(
  fromVersion: number,
  toVersion: number
): Promise<RuleChangeLogOutput[]> {
  const logs = await prisma.ruleChangeLog.findMany({
    where: {
      versionNumber: {
        gt: fromVersion,
        lte: toVersion,
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  
  const changeTypeReverseMap: Record<RuleChangeType, 'CREATED' | 'UPDATED' | 'DELETED' | 'ACTIVATED' | 'DEACTIVATED'> = {
    [RuleChangeType.CREATED]: 'CREATED',
    [RuleChangeType.UPDATED]: 'UPDATED',
    [RuleChangeType.DELETED]: 'DELETED',
    [RuleChangeType.ACTIVATED]: 'ACTIVATED',
    [RuleChangeType.DEACTIVATED]: 'DEACTIVATED',
  };
  
  return logs.map(log => ({
    id: log.id,
    ruleId: log.ruleId,
    ruleName: log.ruleName,
    changeType: changeTypeReverseMap[log.changeType],
    previousValue: log.previousValue,
    newValue: log.newValue,
    changedBy: log.changedBy,
    changeReason: log.changeReason,
    versionNumber: log.versionNumber,
    createdAt: log.createdAt,
  }));
}
