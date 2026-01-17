
export type ProviderType = 'GNP' | 'METLIFE' | 'NYLIFE' | 'UNKNOWN';

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
  sexo?: string; // Masculino, Femenino, Otro (normalizado)
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
  gineco_descripcion?: string; // Descripción adicional gineco-obstétrica
  
  perinatales?: string;
  historia_clinica_breve?: string;
  antecedentes_quirurgicos?: string;
  otras_afecciones?: string;
}

export interface PadecimientoActualData {
  descripcion?: string; // Signos y síntomas
  fecha_inicio?: string;
  tipo_padecimiento?: string; // Congénito, Adquirido, etc.
  tipo_padecimiento_congenito_adquirido?: string; // GNP: Congénito o Adquirido (casilla individual)
  tipo_padecimiento_agudo_cronico?: string; // GNP: Agudo o Crónico (casilla individual)
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
  convenio_gnp?: boolean; // GNP: ¿Está en convenio con GNP?
  convenio_aseguradora?: boolean; // MetLife
  se_ajusta_tabulador?: boolean; // GNP: ¿Se ajusta al tabulador?
  
  // Honorarios MetLife Breakdown
  honorarios_cirujano?: string;
  honorarios_anestesiologo?: string;
  honorarios_ayudante?: string;
  honorarios_otro_1?: string;
  honorarios_otro_2?: string;
  
  ppto_honorarios?: string; // GNP / Fallback

  telefono_consultorio?: string;
  domicilio_consultorio?: string; // MetLife
  celular?: string;
  correo_electronico?: string;
  rfc?: string; // MetLife
  tipo_participacion?: string; // GNP: Tratante, Cirujano, Otra
  tipo_participacion_otra?: string; // GNP: Si es Otra, especificar cuál
  hubo_interconsulta?: boolean; // GNP
  tipo_atencion?: string | string[]; // MetLife: array de checkboxes o string por compatibilidad
}

export interface MedicoInterconsultanteData {
  tipo_participacion?: string; // GNP: Interconsultante, Cirujano, Anestesiólogo, Ayudantía, Otra
  tipo_participacion_otra?: string; // GNP: Si es Otra, especificar cuál
  primer_apellido?: string;
  segundo_apellido?: string;
  nombres?: string;
  especialidad?: string;
  cedula_profesional?: string;
  cedula_especialidad?: string;
  ppto_honorarios?: string; // GNP: Presupuesto de honorarios
}

export interface FirmaData {
  lugar_fecha?: string; // Legacy GNP
  lugar?: string; // MetLife Split Header
  fecha?: string; // MetLife Split Header
  nombre_firma?: string; // MetLife Section 7
  firma_autografa_detectada?: boolean; // ¿Se detectó una firma autógrafa?
}

export interface ExtractedMetadata {
  existe_coherencia_clinica?: boolean;
  observacion_coherencia?: string;
  tachaduras_detectadas?: boolean;
  firma_coincide_con_tratante?: boolean;
  diagnostico_severidad?: 'leve' | 'moderado' | 'grave';
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

// Rule Condition Operators (28 total)
export type RuleOperator = 
  // Grupo 1: Validación de Existencia (5)
  | 'IS_EMPTY'           // Campo vacío
  | 'IS_NOT_EMPTY'       // Campo tiene valor
  | 'NOT_EMPTY'          // Alias de IS_NOT_EMPTY
  | 'REQUIRES'           // Bidireccional: Si A existe, B debe existir Y viceversa
  | 'IF_THEN'            // Unidireccional: Si A existe, entonces B debe existir
  // Grupo 2: Comparación de Valores (6)
  | 'EQUALS'             // Igual a valor específico
  | 'NOT_EQUALS'         // Diferente a valor
  | 'GREATER_THAN'       // Mayor que (numérico)
  | 'LESS_THAN'          // Menor que (numérico)
  | 'GREATER_THAN_OR_EQUAL' // Mayor o igual que (numérico)
  | 'LESS_THAN_OR_EQUAL' // Menor o igual que (numérico)
  // Grupo 3: Fechas (5)
  | 'DATE_MISSING'       // Fecha faltante
  | 'DATE_INVALID'       // Formato de fecha inválido
  | 'IS_DATE'            // Valida que sea fecha válida
  | 'DATE_BEFORE'        // Fecha A debe ser antes que Fecha B
  | 'DATE_AFTER'         // Fecha A debe ser después que Fecha B
  // Grupo 4: Formatos Específicos (5)
  | 'IS_NUMBER'          // Es numérico
  | 'IS_EMAIL'           // Formato email válido
  | 'IS_RFC'             // Formato RFC mexicano (13 caracteres alfanuméricos)
  | 'IS_PHONE'           // Formato teléfono (10 dígitos)
  | 'REGEX'              // Patrón regex custom
  // Grupo 5: Lógica Múltiple (3)
  | 'MUTUALLY_EXCLUSIVE' // Solo A o B puede existir, no ambos
  | 'ONE_OF_REQUIRED'    // Al menos 1 campo de una lista debe tener valor
  | 'ALL_REQUIRED'       // Todos los campos de una lista deben tener valor
  // Grupo 6: Strings (4)
  | 'CONTAINS'           // String contiene un substring
  | 'NOT_CONTAINS'       // String NO contiene un substring
  | 'LENGTH_LESS_THAN'   // Longitud del string menor que
  | 'LENGTH_GREATER_THAN'; // Longitud del string mayor que

export type LogicOperator = 'AND' | 'OR';

export interface RuleCondition {
  id: string;
  field: string;                    // ej: "diagnostico.diagnostico_definitivo"
  operator: RuleOperator;
  value?: string | number;          // Para operadores como EQUALS, GREATER_THAN, REGEX
  compareField?: string;            // Para operadores como DATE_BEFORE (comparar 2 campos)
  additionalFields?: string[];      // Para operadores como ONE_OF_REQUIRED, ALL_REQUIRED
}

// Tipo para mapeo de paths por aseguradora
export interface FieldMappings {
  [provider: string]: string[];
}

// Scoring Types
export interface ScoringRule {
  id: string;
  name: string;
  level: 'CRÍTICO' | 'IMPORTANTE' | 'MODERADO' | 'DISCRETO';
  points: number;
  description: string;
  
  // Sistema de múltiples aseguradoras (nuevo)
  providerTargets?: string[];
  fieldMappings?: FieldMappings;
  normalizedFieldName?: string; // Nombre normalizado para el campo mapeado entre aseguradoras
  
  // Retrocompatibilidad con reglas antiguas (único provider)
  providerTarget?: 'ALL' | 'GNP' | 'METLIFE';
  
  // Nueva estructura de condiciones (para reglas creadas desde UI)
  conditions?: RuleCondition[];
  logicOperator?: LogicOperator;
  
  // Compatibilidad con reglas antiguas (hardcoded)
  validator?: (data: ExtractedData) => boolean;
  affectedFields: string[];
  
  // Flag para identificar reglas personalizadas
  isCustom?: boolean;
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

export type AnalysisStatus = 'idle' | 'provider_selection' | 'analyzing' | 're-evaluating' | 'complete' | 'error';

// Interfaz para reportes guardados en localStorage
export interface SavedReport {
  id: string;                    // UUID único
  timestamp: number;             // Fecha de guardado (ms)
  fileName: string;              // Nombre del archivo original
  provider: ProviderType;        // GNP/METLIFE
  extractedData: ExtractedData;  // Datos FINALES (con ediciones del usuario)
  score: ScoringResult;          // Score final
  flags: Flag[];                 // Flags finales
  pdfUrl?: string | null;        // URL del primer archivo (compatibilidad)
  pdfUrls?: string[];            // URLs de todos los archivos asociados
  ruleVersionId?: string;        // ID de versión de reglas usada
  originalScore?: number;        // Score original al momento del procesamiento
}
