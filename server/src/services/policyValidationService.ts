import { getAIClient } from './geminiService';
import { ExtractedData } from '../types';
import {
  PatientPolicyData,
  CondicionesGeneralesData,
  PolicyFinding,
  PolicyFindingSeverity,
  PolicyValidationSummary,
} from '../../../types/policy-types';

const MODEL_NAME = "gemini-3-flash-preview";

// Severity deductions for policy score
const SEVERITY_DEDUCTIONS: Record<PolicyFindingSeverity, number> = {
  CRITICO: 25,
  IMPORTANTE: 15,
  MODERADO: 8,
  INFORMATIVO: 0,
};

function parseDateDDMMYYYY(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

// 1. Validate policy expiration
function checkPolicyExpiration(
  policyData: PatientPolicyData,
  extractedData: ExtractedData
): PolicyFinding | null {
  const vigenciaHasta = parseDateDDMMYYYY(policyData.vigencia_hasta);
  if (!vigenciaHasta) return null;

  const now = new Date();
  const fechaIngreso = parseDateDDMMYYYY(extractedData.hospital?.fecha_ingreso);
  const referenceDate = fechaIngreso || now;

  if (referenceDate > vigenciaHasta) {
    return {
      type: 'POLIZA_VENCIDA',
      severity: 'CRITICO',
      title: 'Póliza vencida',
      description: `La póliza venció el ${policyData.vigencia_hasta}. La fecha de ingreso/referencia es posterior a la vigencia.`,
      source: 'POLIZA_PACIENTE',
      relatedFields: ['hospital.fecha_ingreso'],
      calculatedValues: {
        vigencia_hasta: policyData.vigencia_hasta || '',
        fecha_referencia: fechaIngreso ? (extractedData.hospital?.fecha_ingreso || '') : now.toLocaleDateString('es-MX'),
      },
    };
  }
  return null;
}

// 2. Check waiting periods
function checkWaitingPeriods(
  policyData: PatientPolicyData,
  condicionesData: CondicionesGeneralesData | undefined,
  extractedData: ExtractedData
): PolicyFinding[] {
  const findings: PolicyFinding[] = [];
  if (!condicionesData || condicionesData.periodos_espera.length === 0) return findings;

  const fechaAntiguedad = parseDateDDMMYYYY(policyData.fecha_antiguedad);
  if (!fechaAntiguedad) return findings;

  const fechaIngreso = parseDateDDMMYYYY(extractedData.hospital?.fecha_ingreso);
  const referenceDate = fechaIngreso || new Date();
  const mesesAntiguedad = monthsBetween(fechaAntiguedad, referenceDate);

  const diagnostico = extractedData.diagnostico?.diagnostico_definitivo?.toLowerCase() || '';
  const codigoCie = extractedData.diagnostico?.codigo_cie?.toLowerCase() || '';

  for (const periodo of condicionesData.periodos_espera) {
    if (mesesAntiguedad < periodo.meses) {
      const padecimientoTipo = periodo.padecimiento_tipo.toLowerCase();
      // Check if the diagnosis type matches the waiting period type
      const matchesDiagnostico = diagnostico.includes(padecimientoTipo) ||
        padecimientoTipo.includes('todo') || padecimientoTipo.includes('general');

      const matchesCie = periodo.codigos_cie_aplicables?.some(
        cie => codigoCie.startsWith(cie.toLowerCase())
      );

      if (matchesDiagnostico || matchesCie) {
        findings.push({
          type: 'PERIODO_ESPERA',
          severity: 'CRITICO',
          title: `Periodo de espera no cumplido: ${periodo.padecimiento_tipo}`,
          description: `El paciente tiene ${mesesAntiguedad} meses de antigüedad, pero el periodo de espera para "${periodo.padecimiento_tipo}" es de ${periodo.meses} meses.`,
          source: 'CROSS_REFERENCE',
          relatedFields: ['diagnostico.diagnostico_definitivo'],
          calculatedValues: {
            meses_antiguedad: mesesAntiguedad,
            meses_requeridos: periodo.meses,
            faltan_meses: periodo.meses - mesesAntiguedad,
          },
        });
      }
    }
  }

  return findings;
}

// 3. Check preexisting conditions
function checkPreexistencias(
  policyData: PatientPolicyData,
  condicionesData: CondicionesGeneralesData | undefined,
  extractedData: ExtractedData
): PolicyFinding[] {
  const findings: PolicyFinding[] = [];
  const antecedentes = extractedData.antecedentes?.personales_patologicos;
  if (!antecedentes) return findings;

  const diagnostico = extractedData.diagnostico?.diagnostico_definitivo || '';

  if (condicionesData?.preexistencias_regla) {
    const regla = condicionesData.preexistencias_regla;
    for (const condExcluida of regla.condiciones_excluidas_permanente) {
      if (
        antecedentes.toLowerCase().includes(condExcluida.toLowerCase()) ||
        diagnostico.toLowerCase().includes(condExcluida.toLowerCase())
      ) {
        findings.push({
          type: 'PREEXISTENCIA',
          severity: 'IMPORTANTE',
          title: `Posible preexistencia: ${condExcluida}`,
          description: `Se detectó "${condExcluida}" en los antecedentes patológicos del paciente. Verificar si aplica como preexistencia según las condiciones generales.`,
          source: 'CROSS_REFERENCE',
          relatedFields: ['antecedentes.personales_patologicos', 'diagnostico.diagnostico_definitivo'],
        });
      }
    }
  }

  return findings;
}

// 4. Check coverage limits
function checkCoverageLimits(
  policyData: PatientPolicyData,
  extractedData: ExtractedData
): PolicyFinding | null {
  if (!policyData.suma_asegurada) return null;

  // Try to estimate costs from the medical report
  const honorarios = extractedData.medico_tratante;
  let estimatedCost = 0;

  if (honorarios?.ppto_honorarios) {
    const match = honorarios.ppto_honorarios.replace(/[,$]/g, '').match(/\d+/);
    if (match) estimatedCost += parseInt(match[0]);
  }
  if (honorarios?.honorarios_cirujano) {
    const match = honorarios.honorarios_cirujano.replace(/[,$]/g, '').match(/\d+/);
    if (match) estimatedCost += parseInt(match[0]);
  }
  if (honorarios?.honorarios_anestesiologo) {
    const match = honorarios.honorarios_anestesiologo.replace(/[,$]/g, '').match(/\d+/);
    if (match) estimatedCost += parseInt(match[0]);
  }

  if (estimatedCost > 0 && estimatedCost > policyData.suma_asegurada) {
    return {
      type: 'LIMITE_COBERTURA',
      severity: 'IMPORTANTE',
      title: 'Costos estimados exceden suma asegurada',
      description: `Los costos estimados ($${estimatedCost.toLocaleString()}) exceden la suma asegurada ($${policyData.suma_asegurada.toLocaleString()}).`,
      source: 'CROSS_REFERENCE',
      calculatedValues: {
        costos_estimados: estimatedCost,
        suma_asegurada: policyData.suma_asegurada,
        excedente: estimatedCost - policyData.suma_asegurada,
      },
    };
  }

  return null;
}

// 5. Calculate deductible/coinsurance
function calculateDeducibleCoaseguro(
  policyData: PatientPolicyData
): PolicyFinding | null {
  if (!policyData.deducible && !policyData.coaseguro_porcentaje) return null;

  const parts: string[] = [];
  if (policyData.deducible) {
    parts.push(`Deducible: $${policyData.deducible.toLocaleString()} (${policyData.deducible_tipo || 'por evento'})`);
  }
  if (policyData.coaseguro_porcentaje) {
    parts.push(`Coaseguro: ${policyData.coaseguro_porcentaje}%`);
    if (policyData.tope_coaseguro) {
      parts.push(`Tope coaseguro: $${policyData.tope_coaseguro.toLocaleString()}`);
    }
  }

  return {
    type: 'COASEGURO',
    severity: 'INFORMATIVO',
    title: 'Deducible y coaseguro aplicables',
    description: parts.join('. '),
    source: 'POLIZA_PACIENTE',
    calculatedValues: {
      deducible: policyData.deducible || 0,
      coaseguro_porcentaje: policyData.coaseguro_porcentaje || 0,
      tope_coaseguro: policyData.tope_coaseguro || 0,
    },
  };
}

// 6. Check age limits
function checkAgeLimits(
  policyData: PatientPolicyData,
  condicionesData: CondicionesGeneralesData | undefined,
  extractedData: ExtractedData
): PolicyFinding | null {
  if (!condicionesData?.edad_maxima_renovacion) return null;

  const edadStr = extractedData.identificacion?.edad;
  if (!edadStr) return null;
  const edad = typeof edadStr === 'number' ? edadStr : parseInt(String(edadStr));
  if (isNaN(edad)) return null;

  if (edad > condicionesData.edad_maxima_renovacion) {
    return {
      type: 'EDAD_LIMITE',
      severity: 'CRITICO',
      title: 'Edad excede límite de renovación',
      description: `El paciente tiene ${edad} años, pero la edad máxima de renovación del producto es ${condicionesData.edad_maxima_renovacion} años.`,
      source: 'CROSS_REFERENCE',
      relatedFields: ['identificacion.edad'],
      calculatedValues: {
        edad_paciente: edad,
        edad_maxima: condicionesData.edad_maxima_renovacion,
      },
    };
  }

  return null;
}

// 7. Check prior authorization requirements
function checkAuthorizationRequired(
  condicionesData: CondicionesGeneralesData | undefined,
  extractedData: ExtractedData
): PolicyFinding[] {
  const findings: PolicyFinding[] = [];
  if (!condicionesData?.procedimientos_especiales) return findings;

  const diagnostico = (extractedData.diagnostico?.diagnostico_definitivo || '').toLowerCase();
  const tratamiento = (extractedData.tratamiento?.descripcion || '').toLowerCase();
  const intervencion = (extractedData.intervencion_qx?.tecnica || '').toLowerCase();

  for (const proc of condicionesData.procedimientos_especiales) {
    if (proc.excluido) continue;
    if (!proc.requiere_autorizacion_previa) continue;

    const procNombre = proc.nombre.toLowerCase();
    if (diagnostico.includes(procNombre) || tratamiento.includes(procNombre) || intervencion.includes(procNombre)) {
      findings.push({
        type: 'AUTORIZACION_REQUERIDA',
        severity: 'IMPORTANTE',
        title: `Autorización previa requerida: ${proc.nombre}`,
        description: `El procedimiento "${proc.nombre}" requiere autorización previa según las condiciones generales.`,
        source: 'CONDICIONES_GENERALES',
        relatedFields: ['diagnostico.diagnostico_definitivo', 'tratamiento.descripcion'],
      });
    }
  }

  return findings;
}

// 8. Semantic exclusion matching with Gemini AI
async function checkExclusionMatch(
  diagnostico: string,
  codigoCie: string,
  exclusiones: string[]
): Promise<{ isExcluded: boolean; matchedExclusion?: string; confidence: number }> {
  if (exclusiones.length === 0 || !diagnostico) {
    return { isExcluded: false, confidence: 0 };
  }

  try {
    const ai = getAIClient();
    const prompt = `Como auditor de seguros de gastos médicos mayores experto en México, determina si el siguiente diagnóstico está excluido según la lista de exclusiones.

DIAGNÓSTICO: "${diagnostico}"
CÓDIGO CIE: "${codigoCie || 'No proporcionado'}"

EXCLUSIONES:
${exclusiones.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Responde en JSON con esta estructura:
{
  "is_excluded": boolean,
  "matched_exclusion": "texto de la exclusión que aplica o null",
  "confidence": number entre 0 y 1,
  "reasoning": "explicación breve"
}

Sé conservador: solo marca como excluido si hay una coincidencia clara o altamente probable.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ text: prompt }],
      config: {
        temperature: 0.0,
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return { isExcluded: false, confidence: 0 };

    const result = JSON.parse(text);
    return {
      isExcluded: result.is_excluded === true,
      matchedExclusion: result.matched_exclusion || undefined,
      confidence: result.confidence || 0,
    };
  } catch (error) {
    console.error('Error in semantic exclusion check:', error);
    return { isExcluded: false, confidence: 0 };
  }
}

// Main validation function
export async function validatePolicyCompliance(
  extractedData: ExtractedData,
  patientPolicyData: PatientPolicyData,
  condicionesGeneralesData?: CondicionesGeneralesData,
  medicalReportScore?: number
): Promise<PolicyValidationSummary> {
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("⏱️  INICIO VALIDACIÓN CRUZADA DE PÓLIZA");
  console.log("═══════════════════════════════════════════════════════════════");

  const startTime = Date.now();
  const findings: PolicyFinding[] = [];

  // 1. Policy expiration
  const expirationFinding = checkPolicyExpiration(patientPolicyData, extractedData);
  if (expirationFinding) findings.push(expirationFinding);

  // 2. Waiting periods
  const waitingPeriodFindings = checkWaitingPeriods(patientPolicyData, condicionesGeneralesData, extractedData);
  findings.push(...waitingPeriodFindings);

  // 3. Preexisting conditions
  const preexistenciaFindings = checkPreexistencias(patientPolicyData, condicionesGeneralesData, extractedData);
  findings.push(...preexistenciaFindings);

  // 4. Coverage limits
  const coverageFinding = checkCoverageLimits(patientPolicyData, extractedData);
  if (coverageFinding) findings.push(coverageFinding);

  // 5. Deductible/coinsurance info
  const deducibleFinding = calculateDeducibleCoaseguro(patientPolicyData);
  if (deducibleFinding) findings.push(deducibleFinding);

  // 6. Age limits
  const ageFinding = checkAgeLimits(patientPolicyData, condicionesGeneralesData, extractedData);
  if (ageFinding) findings.push(ageFinding);

  // 7. Prior authorization
  const authFindings = checkAuthorizationRequired(condicionesGeneralesData, extractedData);
  findings.push(...authFindings);

  // 8. Semantic exclusion matching (AI-based)
  const allExclusions = [
    ...(patientPolicyData.exclusiones_especificas || []),
    ...(condicionesGeneralesData?.exclusiones_generales || []),
  ];

  if (allExclusions.length > 0 && extractedData.diagnostico?.diagnostico_definitivo) {
    const exclusionResult = await checkExclusionMatch(
      extractedData.diagnostico.diagnostico_definitivo,
      extractedData.diagnostico.codigo_cie || '',
      allExclusions
    );

    if (exclusionResult.isExcluded && exclusionResult.confidence >= 0.7) {
      findings.push({
        type: 'EXCLUSION',
        severity: 'CRITICO',
        title: 'Diagnóstico posiblemente excluido',
        description: `El diagnóstico "${extractedData.diagnostico.diagnostico_definitivo}" coincide con la exclusión: "${exclusionResult.matchedExclusion}". Confianza: ${Math.round(exclusionResult.confidence * 100)}%.`,
        source: 'CROSS_REFERENCE',
        relatedFields: ['diagnostico.diagnostico_definitivo', 'diagnostico.codigo_cie'],
        calculatedValues: {
          confianza: Math.round(exclusionResult.confidence * 100),
          exclusion_match: exclusionResult.matchedExclusion || '',
        },
      });
    }
  }

  // Calculate policy compliance score
  let totalDeduction = 0;
  for (const finding of findings) {
    totalDeduction += SEVERITY_DEDUCTIONS[finding.severity] || 0;
  }
  const policyComplianceScore = Math.max(0, 100 - totalDeduction);

  // Calculate combined score
  let combinedScore: number | undefined;
  if (medicalReportScore !== undefined) {
    combinedScore = Math.round((medicalReportScore * 0.5) + (policyComplianceScore * 0.5));
  }

  // Calculate estimated patient costs
  let deducibleEstimado: number | undefined;
  let coaseguroEstimado: number | undefined;
  let montoEstimadoPaciente: number | undefined;

  if (patientPolicyData.deducible) {
    deducibleEstimado = patientPolicyData.deducible;
    montoEstimadoPaciente = deducibleEstimado;
  }

  const totalTime = Date.now() - startTime;
  console.log(`✅ VALIDACIÓN CRUZADA COMPLETADA en ${totalTime}ms`);
  console.log(`   📊 Score póliza: ${policyComplianceScore}/100`);
  console.log(`   📊 Findings: ${findings.length}`);
  if (combinedScore !== undefined) {
    console.log(`   📊 Score combinado: ${combinedScore}/100`);
  }

  return {
    policyComplianceScore,
    combinedScore,
    medicalReportScore,
    findings,
    deducibleEstimado,
    coaseguroEstimado,
    montoEstimadoPaciente,
  };
}
