import { ExtractedData, ScoringRule, ScoringResult, ProviderType } from "../types";
import { REGLAS_GENERALES } from './scoring-rules-general';
import { REGLAS_GNP } from './scoring-rules-gnp';
import { REGLAS_METLIFE } from './scoring-rules-metlife';
import { validateRule } from './rule-validator';
import { fetchRulesFromDatabase, clearRulesCache } from './database-rules-loader';

export function getReglasParaAseguradoraLocal(provider: ProviderType | 'ALL'): ScoringRule[] {
  if (provider === 'GNP') {
    return [...REGLAS_GENERALES, ...REGLAS_GNP];
  }
  if (provider === 'METLIFE') {
    return [...REGLAS_GENERALES, ...REGLAS_METLIFE];
  }
  return [...REGLAS_GENERALES, ...REGLAS_GNP, ...REGLAS_METLIFE];
}

export async function getReglasParaAseguradora(provider: ProviderType | 'ALL'): Promise<ScoringRule[]> {
  try {
    const providerToFetch = provider === 'ALL' || provider === 'UNKNOWN' ? undefined : provider;
    const dbRules = await fetchRulesFromDatabase(providerToFetch as ProviderType | undefined);
    if (dbRules && dbRules.length > 0) {
      return dbRules;
    }
  } catch (error) {
    console.warn('Error loading rules from database, falling back to local rules:', error);
  }
  return getReglasParaAseguradoraLocal(provider);
}

export function getReglasParaAseguradoraSync(provider: ProviderType | 'ALL'): ScoringRule[] {
  return getReglasParaAseguradoraLocal(provider);
}

export const DEFAULT_SCORING_RULES: ScoringRule[] = getReglasParaAseguradoraLocal('ALL');

export { clearRulesCache };

export function calculateScore(
  data: ExtractedData,
  previousScore?: number,
  rules: ScoringRule[] = DEFAULT_SCORING_RULES
): ScoringResult {
  const baseScore = 100;
  let totalDeducted = 0;
  const deductions: ScoringResult['deductions'] = [];
  const flags: ScoringResult['flags'] = [];

  const provider = data.provider || 'UNKNOWN';

  for (const rule of rules) {
    if (rule.providerTarget !== 'ALL' && rule.providerTarget !== provider) continue;

    let fails = false;
    try {
      fails = validateRule(rule, data);
    } catch (e) { 
      fails = false; 
    }
    
    deductions.push({ rule, failed: fails });

    if (fails) {
      totalDeducted += rule.points;
      flags.push({
        type: rule.level === 'CRÍTICO' ? 'ERROR_CRÍTICO' : 
              rule.level === 'IMPORTANTE' ? 'ALERTA' : 'OBSERVACIÓN',
        rule: rule.name,
        message: rule.description,
        fieldPath: rule.affectedFields[0]
      });
    }
  }

  const finalScore = Math.max(0, baseScore - totalDeducted);
  return {
    previousScore: previousScore || 0,
    baseScore,
    deductions,
    totalDeducted,
    finalScore,
    delta: previousScore ? finalScore - previousScore : 0,
    flags
  };
}

export function reEvaluateScore(
  newData: ExtractedData,
  previousScore: number,
  rules: ScoringRule[] = DEFAULT_SCORING_RULES
): ScoringResult {
  return calculateScore(newData, previousScore, rules);
}

export { REGLAS_GENERALES, REGLAS_GNP, REGLAS_METLIFE };
