// Shared policy types for frontend and backend

// ===== Condiciones Generales (extracted from product PDF) =====

export interface PeriodoEspera {
  padecimiento_tipo: string;
  meses: number;
  codigos_cie_aplicables?: string[];
}

export interface CoaseguroRule {
  concepto: string;
  porcentaje_asegurado: number;
  tope_maximo?: number;
}

export interface PreexistenciasRegla {
  periodo_exclusion_meses: number;
  condiciones_excluidas_permanente: string[];
}

export interface ProcedimientoEspecial {
  nombre: string;
  requiere_autorizacion_previa: boolean;
  periodo_espera_meses?: number;
  excluido?: boolean;
}

export interface CondicionesGeneralesData {
  periodos_espera: PeriodoEspera[];
  exclusiones_generales: string[];
  coaseguro_rules: CoaseguroRule[];
  preexistencias_regla?: PreexistenciasRegla;
  procedimientos_especiales: ProcedimientoEspecial[];
  edad_maxima_ingreso?: number;
  edad_maxima_renovacion?: number;
  suma_asegurada_maxima?: number;
}

// ===== Patient Policy (extracted from policy cover page) =====

export interface CoberturaIncluida {
  nombre: string;
  sublimite?: string;
  incluida: boolean;
}

export interface Endoso {
  numero: string;
  descripcion: string;
  tipo: string;
}

export interface PatientPolicyData {
  numero_poliza?: string;
  vigencia_desde?: string;
  vigencia_hasta?: string;
  estado_poliza?: string;
  titular_nombre?: string;
  asegurado_nombre?: string;
  fecha_nacimiento?: string;
  fecha_antiguedad?: string;
  suma_asegurada?: number;
  moneda?: string;
  deducible?: number;
  deducible_tipo?: string;
  coaseguro_porcentaje?: number;
  tope_coaseguro?: number;
  coberturas_incluidas: CoberturaIncluida[];
  endosos: Endoso[];
  exclusiones_especificas: string[];
}

// ===== Policy Validation Findings =====

export type PolicyFindingType =
  | 'PERIODO_ESPERA'
  | 'EXCLUSION'
  | 'LIMITE_COBERTURA'
  | 'PREEXISTENCIA'
  | 'POLIZA_VENCIDA'
  | 'DEDUCIBLE'
  | 'COASEGURO'
  | 'EDAD_LIMITE'
  | 'AUTORIZACION_REQUERIDA'
  | 'INFORMATIVO';

export type PolicyFindingSeverity =
  | 'CRITICO'
  | 'IMPORTANTE'
  | 'MODERADO'
  | 'INFORMATIVO';

export type PolicyFindingSource =
  | 'CONDICIONES_GENERALES'
  | 'POLIZA_PACIENTE'
  | 'CROSS_REFERENCE';

export interface PolicyFinding {
  type: PolicyFindingType;
  severity: PolicyFindingSeverity;
  title: string;
  description: string;
  source: PolicyFindingSource;
  relatedFields?: string[];
  calculatedValues?: Record<string, string | number>;
}

// ===== Validation Summary =====

export interface PolicyValidationSummary {
  policyComplianceScore: number;
  combinedScore?: number;
  medicalReportScore?: number;
  findings: PolicyFinding[];
  deducibleEstimado?: number;
  coaseguroEstimado?: number;
  montoEstimadoPaciente?: number;
}

// ===== API Request/Response types =====

export interface UploadPolicyRequest {
  files: { base64Data: string; mimeType: string }[];
  aseguradoraCodigo: string;
  medicalFormId?: string;
}

export interface UploadCondicionesRequest {
  files: { base64Data: string; mimeType: string }[];
  aseguradoraCodigo: string;
  productName: string;
  version: string;
}

export interface RunPolicyValidationRequest {
  medicalFormId: string;
  patientPolicyId: string;
  condicionesGeneralesId?: string;
}

export interface CondicionesGeneralesRecord {
  id: string;
  aseguradoraCodigo: string;
  productName: string;
  version: string;
  isActive: boolean;
  conditionsData: CondicionesGeneralesData;
  sourceDocumentUrl?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PatientPolicyRecord {
  id: string;
  medicalFormId?: string;
  userId: string;
  policyNumber?: string;
  aseguradoraCodigo: string;
  policyData: PatientPolicyData;
  documentUrls: string[];
  createdAt: string;
  updatedAt: string;
}
