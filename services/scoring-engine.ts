import { ExtractedData, ScoringRule, ScoringResult, ProviderType } from "../types";
import { REGLAS_GENERALES } from './scoring-rules-general';
import { REGLAS_GNP } from './scoring-rules-gnp';
import { REGLAS_METLIFE } from './scoring-rules-metlife';

export function getReglasParaAseguradora(provider: ProviderType | 'ALL'): ScoringRule[] {
  if (provider === 'GNP') {
    return [...REGLAS_GENERALES, ...REGLAS_GNP];
  }
  if (provider === 'METLIFE') {
    return [...REGLAS_GENERALES, ...REGLAS_METLIFE];
  }
  return [...REGLAS_GENERALES, ...REGLAS_GNP, ...REGLAS_METLIFE];
}

export const DEFAULT_SCORING_RULES: ScoringRule[] = getReglasParaAseguradora('ALL');

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
        fails = rule.validator(data);
    } catch (e) { fails = false; }
    
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
