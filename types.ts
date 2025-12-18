
export type ProviderType = 'GNP' | 'METLIFE' | 'UNKNOWN';

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
  nombres?: string; // En MetLife este campo contendrá el "Nombre Completo"
  edad?: string | number;
  sexo?: string; // M, F, Otro
  causa_atencion?: string; // Accidente, Enfermedad, Embarazo, Segunda Valoración
  // MetLife specific
  peso?: string | number;
  talla?: string | number;
  fecha_primera_atencion?: string;
}

export interface AntecedentesData {
  personales_patologicos?: string;
  personales_no_patologicos?: string;
  gineco_obstetricos?: string; // Texto general o resumen
  // MetLife specific breakdown
  gineco_g?: string | number;
  gineco_p?: string | number;
  gineco_a?: string | number;
  gineco_c?: string | number;
  
  perinatales?: string;
  historia_clinica_breve?: string;
  antecedentes_quirurgicos?: string;
  otras_afecciones?: string;
}

export interface PadecimientoActualData {
  descripcion?: string; // Signos y síntomas
  fecha_inicio?: string;
  tipo_padecimiento?: string; // Congénito, Adquirido, etc.
  tiempo_evolucion?: string;
  causa_etiologia?: string; // MetLife
  estado_actual?: string; // MetLife
  
  // MetLife Tratamiento Futuro
  seguira_tratamiento?: boolean;
  plan_tratamiento?: string; // Descripción del tratamiento y duración
  fecha_probable_alta?: string; // MetLife
}

export interface DiagnosticoData {
  diagnostico_definitivo?: string; // o Diagnóstico Etiológico (MetLife)
  fecha_diagnostico?: string;
  tipo_padecimiento?: string; // Redundante con PadecimientoActual pero GNP lo tiene aquí
  relacionado_con_otro?: boolean;
  especifique_cual?: string;
  codigo_cie?: string; // MetLife
  fecha_inicio_tratamiento?: string; // MetLife
  
  // NEW: Validación Semántica IA
  cie_coherente_con_texto?: boolean;
  explicacion_incoherencia_cie?: string;
}

export interface SignosVitalesData {
  pulso?: string | number;
  respiracion?: string | number;
  temperatura?: string | number;
  presion_arterial?: string;
  presion_arterial_sistolica?: string | number;
  presion_arterial_diastolica?: string | number;
  peso?: string | number;
  altura?: string | number;
}

export interface ExploracionFisicaData {
  resultados?: string;
  fecha?: string;
  estudios_laboratorio_gabinete?: string; // MetLife combined
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
  equipo_especifico?: string; // GNP General
  fechas?: string;
  tecnica?: string;
  // MetLife Specifics
  utilizo_equipo_especial?: boolean;
  detalle_equipo_especial?: string;
  utilizo_insumos?: boolean;
  detalle_insumos?: string;
}

export interface InfoAdicionalData {
  descripcion?: string; // Seccion 5 MetLife
}

export interface HospitalData {
  nombre_hospital?: string;
  ciudad?: string;
  estado?: string;
  tipo_estancia?: string; // Urgencia, Ingreso, Corta estancia
  fecha_ingreso?: string;
  // MetLife specific
  fecha_intervencion?: string;
  fecha_egreso?: string;
}

// MetLife Detailed Surgical Team
export interface PersonalQuirurgico {
  nombre?: string;
  cedula_especialidad?: string;
  celular?: string;
  rfc?: string;
  email?: string;
  especialidad?: string; // Para "Otros"
}

export interface EquipoQuirurgicoMetLife {
  anestesiologo?: PersonalQuirurgico;
  primer_ayudante?: PersonalQuirurgico;
  otro_1?: PersonalQuirurgico;
  otro_2?: PersonalQuirurgico;
}

export interface MedicoTratanteData {
  primer_apellido?: string;
  segundo_apellido?: string;
  nombres?: string;
  especialidad?: string;
  cedula_profesional?: string;
  cedula_especialidad?: string;
  convenio_gnp?: boolean; // Legacy GNP
  convenio_aseguradora?: boolean; // MetLife
  se_ajusta_tabulador?: boolean;
  
  // Honorarios MetLife Breakdown
  honorarios_cirujano?: string;
  honorarios_anestesiologo?: string;
  honorarios_ayudante?: string;
  honorarios_otro_1?: string;
  honorarios_otro_2?: string;
  
  ppto_honorarios?: string; // Legacy / Fallback

  telefono_consultorio?: string;
  domicilio_consultorio?: string; // MetLife
  celular?: string;
  correo_electronico?: string;
  rfc?: string; // MetLife
  tipo_participacion?: string; // Tratante, Cirujano, etc.
  hubo_interconsulta?: boolean;
  tipo_atencion?: string; // MetLife selection
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
  lugar_fecha?: string; // Legacy GNP
  lugar?: string; // MetLife Split Header
  fecha?: string; // MetLife Split Header
  nombre_firma?: string; // MetLife Section 7
}

export interface ExtractedMetadata {
  existe_coherencia_clinica?: boolean;
  observacion_coherencia?: string;
}

export interface ExtractedData {
  provider: ProviderType; // NEW: Auto-detected provider
  tramite?: TramiteData;
  identificacion?: IdentificacionData;
  antecedentes?: AntecedentesData;
  padecimiento_actual?: PadecimientoActualData;
  diagnostico?: DiagnosticoData;
  signos_vitales?: SignosVitalesData; // GNP has specific section, MetLife in Patient Data
  exploracion_fisica?: ExploracionFisicaData;
  estudios?: EstudiosData;
  complicaciones?: ComplicacionesData;
  tratamiento?: TratamientoData;
  intervencion_qx?: IntervencionQxData;
  info_adicional?: InfoAdicionalData;
  hospital?: HospitalData;
  medico_tratante?: MedicoTratanteData;
  otros_medicos?: MedicoInterconsultanteData[]; // GNP style list
  equipo_quirurgico_metlife?: EquipoQuirurgicoMetLife; // MetLife style structured
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
  providerTarget: 'ALL' | 'GNP' | 'METLIFE'; // NEW: Target specific provider
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
