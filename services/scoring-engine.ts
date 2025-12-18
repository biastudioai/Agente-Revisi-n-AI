
import { ExtractedData, ScoringRule, ScoringResult } from "../types";

export const DEFAULT_SCORING_RULES: ScoringRule[] = [
  // ==========================================
  // REGLAS GLOBALES (CRÍTICAS)
  // ==========================================
  {
    id: 'diag_falta',
    name: 'Diagnóstico faltante',
    level: 'CRÍTICO',
    points: 25,
    description: 'El diagnóstico definitivo es la base de la reclamación.',
    providerTarget: 'ALL',
    validator: (data) => !data.diagnostico?.diagnostico_definitivo?.trim(),
    affectedFields: ['diagnostico.diagnostico_definitivo']
  },
  {
    id: 'cie_incoherencia',
    name: 'Discrepancia CIE-10',
    level: 'IMPORTANTE',
    points: 15,
    description: 'El código CIE-10 no corresponde al diagnóstico escrito.',
    providerTarget: 'ALL',
    validator: (data) => data.diagnostico?.cie_coherente_con_texto === false,
    affectedFields: ['diagnostico.codigo_cie']
  },

  // ==========================================
  // REGLAS ESPECÍFICAS METLIFE
  // ==========================================
  {
    id: 'metlife_rfc',
    name: 'RFC Médico Obligatorio',
    level: 'CRÍTICO',
    points: 20,
    description: 'MetLife requiere el RFC para validación de honorarios.',
    providerTarget: 'METLIFE',
    validator: (data) => !data.medico_tratante?.rfc?.trim(),
    affectedFields: ['medico_tratante.rfc']
  },
  {
    id: 'metlife_secciones',
    name: 'Secciones Incompletas',
    level: 'MODERADO',
    points: 10,
    description: 'Faltan datos en secciones clave (Antecedentes o Padecimiento).',
    providerTarget: 'METLIFE',
    validator: (data) => !data.antecedentes?.historia_clinica_breve?.trim() || !data.padecimiento_actual?.descripcion?.trim(),
    affectedFields: ['antecedentes.historia_clinica_breve']
  },

  // ==========================================
  // REGLAS ESPECÍFICAS GNP
  // ==========================================
  {
    id: 'gnp_signos',
    name: 'Signos Vitales Incompletos',
    level: 'IMPORTANTE',
    points: 10,
    description: 'GNP requiere signos vitales (Presión/Temperatura) para el dictamen.',
    providerTarget: 'GNP',
    validator: (data) => !data.signos_vitales?.presion_arterial || !data.signos_vitales?.temperatura,
    affectedFields: ['signos_vitales.presion_arterial']
  }
];

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
