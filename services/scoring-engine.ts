import { ExtractedData, ScoringRule, ScoringResult, ProviderType } from "../types";
import { validateRule } from './rule-validator';
import { fetchRulesFromDatabase, clearRulesCache } from './database-rules-loader';

export interface ScoringResultWithVersion extends ScoringResult {
  ruleVersionId?: string;
  ruleVersionNumber?: number;
}

export async function getReglasParaAseguradora(provider: ProviderType | 'ALL'): Promise<ScoringRule[]> {
  const providerToFetch = provider === 'ALL' || provider === 'UNKNOWN' ? undefined : provider;
  const dbRules = await fetchRulesFromDatabase(providerToFetch as ProviderType | undefined);
  
  if (!dbRules || dbRules.length === 0) {
    throw new Error('No se pudieron cargar las reglas de validación desde la base de datos');
  }
  
  return dbRules;
}

export { clearRulesCache };

export function calculateScore(
  data: ExtractedData,
  previousScore: number | undefined,
  rules: ScoringRule[]
): ScoringResult {
  if (!rules || rules.length === 0) {
    throw new Error('No se proporcionaron reglas de validación. Las reglas deben cargarse desde la base de datos.');
  }

  const baseScore = 100;
  let totalDeducted = 0;
  const deductions: ScoringResult['deductions'] = [];
  const flags: ScoringResult['flags'] = [];

  const provider = data.provider || 'UNKNOWN';

  for (const rule of rules) {
    if (rule.providerTarget !== 'ALL') {
      if (rule.providerTarget.includes(',')) {
        const targets = rule.providerTarget.split(',').map(t => t.trim());
        if (!targets.includes(provider)) continue;
      } else if (rule.providerTarget !== provider) {
        continue;
      }
    }

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
              rule.level === 'IMPORTANTE' ? 'ALERTA' : 
              rule.level === 'MODERADO' ? 'OBSERVACIÓN' : 'NOTA',
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
  rules: ScoringRule[]
): ScoringResult {
  return calculateScore(newData, previousScore, rules);
}
