

export interface TramiteData {
  reembolso?: boolean;
  programacion_cirugia?: boolean;
  programacion_medicamentos?: boolean;
  programacion_servicios?: boolean;
  indemnizacion?: boolean;
  reporte_hospitalario?: boolean;
  numero_poliza?: string;
  // Campos legacy opcionales por compatibilidad si es necesario
  tipo_tramite?: string;
}

export interface IdentificacionData {
  primer_apellido?: string;
  segundo_apellido?: string;
  nombres?: string;
  edad?: string | number;
  sexo?: string;
  causa_atencion?: string;
}

export interface AntecedentesData {
  personales_patologicos?: string;
  personales_no_patologicos?: string;
  gineco_obstetricos?: string;
  perinatales?: string;
}

export interface PadecimientoActualData {
  descripcion?: string;
  fecha_inicio?: string;
}

export interface DiagnosticoData {
  diagnostico_definitivo?: string;
  fecha_diagnostico?: string;
  tipo_padecimiento?: string;
  relacionado_con_otro?: boolean;
  especifique_cual?: string;
}

export interface SignosVitalesData {
  pulso?: string | number;
  respiracion?: string | number;
  temperatura?: string | number;
  presion_arterial?: string;
  // Estos pueden ser parseados en JS si la IA devuelve string "120/80"
  presion_arterial_sistolica?: string | number;
  presion_arterial_diastolica?: string | number;
  peso?: string | number;
  altura?: string | number;
}

export interface ExploracionFisicaData {
  resultados?: string;
  fecha?: string;
}

export interface EstudiosData {
  estudios_realizados?: string;
}

export interface ComplicacionesData {
  presento_complicaciones?: boolean;
  fecha_inicio?: string;
  descripcion?: string;
}

export interface TratamientoData {
  descripcion?: string;
  fecha_inicio?: string;
}

export interface IntervencionQxData {
  equipo_especifico?: string;
  fechas?: string;
  tecnica?: string;
}

export interface InfoAdicionalData {
  descripcion?: string;
}

export interface HospitalData {
  nombre_hospital?: string;
  ciudad?: string;
  estado?: string;
  tipo_estancia?: string;
  fecha_ingreso?: string;
}

export interface MedicoTratanteData {
  primer_apellido?: string;
  segundo_apellido?: string;
  nombres?: string;
  especialidad?: string;
  cedula_profesional?: string;
  cedula_especialidad?: string;
  convenio_gnp?: boolean;
  se_ajusta_tabulador?: boolean;
  ppto_honorarios?: string;
  telefono_consultorio?: string;
  celular?: string;
  correo_electronico?: string;
  tipo_participacion?: string;
  hubo_interconsulta?: boolean;
}

export interface MedicoInterconsultanteData {
  tipo_participacion?: string;
  primer_apellido?: string;
  segundo_apellido?: string;
  nombres?: string;
  especialidad?: string;
  cedula_profesional?: string;
  cedula_especialidad?: string;
  ppto_honorarios?: string;
}

export interface FirmaData {
  lugar_fecha?: string;
  nombre_firma?: string;
}

export interface ExtractedMetadata {
  existe_coherencia_clinica?: boolean;
  observacion_coherencia?: string;
}

export interface ExtractedData {
  tramite?: TramiteData;
  identificacion?: IdentificacionData;
  antecedentes?: AntecedentesData;
  padecimiento_actual?: PadecimientoActualData;
  diagnostico?: DiagnosticoData;
  signos_vitales?: SignosVitalesData;
  exploracion_fisica?: ExploracionFisicaData;
  estudios?: EstudiosData;
  complicaciones?: ComplicacionesData;
  tratamiento?: TratamientoData;
  intervencion_qx?: IntervencionQxData;
  info_adicional?: InfoAdicionalData;
  hospital?: HospitalData;
  medico_tratante?: MedicoTratanteData;
  otros_medicos?: MedicoInterconsultanteData[];
  firma?: FirmaData;
  metadata?: ExtractedMetadata;
}

// Scoring Types
export interface ScoringRule {
  id: string;
  name: string;
  level: 'CRÍTICO' | 'IMPORTANTE' | 'MODERADO' | 'DISCRETO';
  points: number;
  description: string;
  validator: (data: ExtractedData) => boolean;
  affectedFields: string[];
}

export interface ScoringDeduction {
  rule: ScoringRule;
  failed: boolean;
  reason?: string;
}

export interface Flag {
  type: "ERROR_CRÍTICO" | "ALERTA" | "OBSERVACIÓN" | "NOTA";
  rule: string;
  message: string;
  fieldPath?: string;
}

export interface ScoringResult {
  previousScore: number;
  baseScore: number;
  deductions: ScoringDeduction[];
  totalDeducted: number;
  finalScore: number;
  delta: number;
  flags: Flag[];
}

export interface AnalysisReport {
  extracted: ExtractedData;
  score: ScoringResult;
  flags: Flag[];
  raw_response?: string;
}

export type AnalysisStatus = 'idle' | 'analyzing' | 're-evaluating' | 'complete' | 'error';