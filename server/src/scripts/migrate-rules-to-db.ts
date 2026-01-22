import prisma from '../config/database';
import { RuleLevel, RuleCategory } from '../generated/prisma';

interface RuleCondition {
  id: string;
  field: string;
  operator: string;
  value?: string | number;
  compareField?: string;
  additionalFields?: string[];
}

interface RawScoringRule {
  id: string;
  name: string;
  level: 'CRÍTICO' | 'IMPORTANTE' | 'MODERADO' | 'DISCRETO';
  points: number;
  description: string;
  providerTarget: string;
  isCustom?: boolean;
  conditions?: RuleCondition[];
  logicOperator?: string;
  affectedFields: string[];
  validator?: any;
}

function mapLevelToEnum(level: string): RuleLevel {
  const mapping: Record<string, RuleLevel> = {
    'CRÍTICO': RuleLevel.CRITICO,
    'CRITICO': RuleLevel.CRITICO,
    'IMPORTANTE': RuleLevel.IMPORTANTE,
    'MODERADO': RuleLevel.MODERADO,
    'DISCRETO': RuleLevel.DISCRETO,
  };
  return mapping[level.toUpperCase()] || RuleLevel.MODERADO;
}

const REGLAS_GENERALES: RawScoringRule[] = [
  {
    id: 'gen_paciente_apellido',
    name: 'Apellido paterno del paciente obligatorio',
    level: 'CRÍTICO',
    points: 25,
    description: 'El primer apellido del asegurado es obligatorio.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_paciente_apellido_1', field: 'identificacion.primer_apellido', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.primer_apellido']
  },
  {
    id: 'nylife_paciente_apellido',
    name: 'Apellido paterno del paciente obligatorio',
    level: 'CRÍTICO',
    points: 25,
    description: 'El primer apellido del asegurado es obligatorio.',
    providerTarget: 'NY_LIFE',
    isCustom: false,
    conditions: [{ id: 'cond_nylife_paciente_apellido', field: 'identificacion.primer_apellido', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.primer_apellido']
  },
  {
    id: 'gen_paciente_nombre',
    name: 'Nombre del paciente obligatorio',
    level: 'CRÍTICO',
    points: 25,
    description: 'El nombre del asegurado es obligatorio.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_paciente_nombre_1', field: 'identificacion.nombres', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.nombres']
  },
  {
    id: 'gen_paciente_edad_valida',
    name: 'Edad del paciente válida',
    level: 'CRÍTICO',
    points: 20,
    description: 'Ingrese una edad válida para el asegurado (0-110).',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_paciente_edad_1', field: 'identificacion.edad', operator: 'IS_EMPTY' }],
    logicOperator: 'OR',
    affectedFields: ['identificacion.edad']
  },
  {
    id: 'diag_falta',
    name: 'Diagnóstico faltante',
    level: 'CRÍTICO',
    points: 25,
    description: 'El diagnóstico definitivo es la base de la reclamación.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_diag_falta_1', field: 'diagnostico.diagnostico_definitivo', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['diagnostico.diagnostico_definitivo']
  },
  {
    id: 'cie_incoherencia',
    name: 'Discrepancia CIE-10',
    level: 'IMPORTANTE',
    points: 15,
    description: 'El código CIE-10 no corresponde al diagnóstico escrito.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_cie_incoherencia_1', field: 'diagnostico.cie_coherente_con_texto', operator: 'EQUALS', value: 'false' }],
    logicOperator: 'AND',
    affectedFields: ['diagnostico.codigo_cie', 'diagnostico.diagnostico_definitivo']
  },
  {
    id: 'gen_fecha_diagnostico_futura',
    name: 'Fecha de diagnóstico futura',
    level: 'CRÍTICO',
    points: 20,
    description: 'La fecha de diagnóstico no puede ser una fecha futura.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_fecha_diag_futura_1', field: 'diagnostico.fecha_diagnostico', operator: 'DATE_AFTER', value: 'TODAY' }],
    logicOperator: 'AND',
    affectedFields: ['diagnostico.fecha_diagnostico']
  },
  {
    id: 'gen_pulso_rango',
    name: 'Frecuencia de pulso fuera de rango',
    level: 'MODERADO',
    points: 5,
    description: 'Frecuencia de pulso fuera de rango fisiológico probable (30-220).',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      { id: 'cond_pulso_bajo', field: 'signos_vitales.pulso', operator: 'LESS_THAN', value: 30 },
      { id: 'cond_pulso_alto', field: 'signos_vitales.pulso', operator: 'GREATER_THAN', value: 220 }
    ],
    logicOperator: 'OR',
    affectedFields: ['signos_vitales.pulso']
  },
  {
    id: 'gen_respiracion_rango',
    name: 'Frecuencia respiratoria fuera de rango',
    level: 'MODERADO',
    points: 5,
    description: 'Frecuencia respiratoria fuera de rango fisiológico probable (8-60).',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      { id: 'cond_resp_bajo', field: 'signos_vitales.respiracion', operator: 'LESS_THAN', value: 8 },
      { id: 'cond_resp_alto', field: 'signos_vitales.respiracion', operator: 'GREATER_THAN', value: 60 }
    ],
    logicOperator: 'OR',
    affectedFields: ['signos_vitales.respiracion']
  },
  {
    id: 'gen_temperatura_rango',
    name: 'Temperatura fuera de rango',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Temperatura fuera de rango fisiológico (34-42°C).',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      { id: 'cond_temp_bajo', field: 'signos_vitales.temperatura', operator: 'LESS_THAN', value: 34 },
      { id: 'cond_temp_alto', field: 'signos_vitales.temperatura', operator: 'GREATER_THAN', value: 42 }
    ],
    logicOperator: 'OR',
    affectedFields: ['signos_vitales.temperatura']
  },
  {
    id: 'gen_presion_formato',
    name: 'Formato de presión arterial inválido',
    level: 'CRÍTICO',
    points: 15,
    description: 'Use el formato XXX/XX para la presión arterial.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      { id: 'cond_presion_formato_1', field: 'signos_vitales.presion_arterial', operator: 'NOT_EMPTY' },
      { id: 'cond_presion_formato_2', field: 'signos_vitales.presion_arterial', operator: 'REGEX', value: '^\\d{2,3}/\\d{2,3}$' }
    ],
    logicOperator: 'AND',
    affectedFields: ['signos_vitales.presion_arterial']
  },
  {
    id: 'gen_peso_talla_validos',
    name: 'Peso y talla inválidos',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Ingrese valores de peso y talla válidos (mayores a cero).',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      { id: 'cond_peso_invalido', field: 'signos_vitales.peso', operator: 'LESS_THAN_OR_EQUAL', value: 0 },
      { id: 'cond_talla_invalido', field: 'signos_vitales.altura', operator: 'LESS_THAN_OR_EQUAL', value: 0 }
    ],
    logicOperator: 'OR',
    affectedFields: ['signos_vitales.peso', 'signos_vitales.altura']
  },
  {
    id: 'gen_medico_apellido',
    name: 'Apellido del médico obligatorio',
    level: 'CRÍTICO',
    points: 20,
    description: 'El primer apellido del médico tratante es obligatorio.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_medico_apellido_1', field: 'medico_tratante.primer_apellido', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.primer_apellido']
  },
  {
    id: 'nylife_medico_apellido',
    name: 'Apellido del médico obligatorio',
    level: 'CRÍTICO',
    points: 20,
    description: 'El primer apellido del médico tratante es obligatorio.',
    providerTarget: 'NY_LIFE',
    isCustom: false,
    conditions: [{ id: 'cond_nylife_medico_apellido', field: 'medico_tratante.primer_apellido', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.primer_apellido']
  },
  {
    id: 'gen_medico_nombre',
    name: 'Nombre del médico obligatorio',
    level: 'CRÍTICO',
    points: 20,
    description: 'El nombre del médico tratante es obligatorio.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_medico_nombre_1', field: 'medico_tratante.nombres', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.nombres']
  },
  {
    id: 'gen_medico_telefono',
    name: 'Teléfono del médico faltante',
    level: 'CRÍTICO',
    points: 15,
    description: 'Debe proporcionar al menos un teléfono de contacto del médico.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      { id: 'cond_tel_consultorio', field: 'medico_tratante.telefono_consultorio', operator: 'IS_EMPTY' },
      { id: 'cond_tel_celular', field: 'medico_tratante.celular', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.telefono_consultorio', 'medico_tratante.celular']
  },
  {
    id: 'gen_medico_email_formato',
    name: 'Correo electrónico inválido',
    level: 'IMPORTANTE',
    points: 10,
    description: 'El formato del correo electrónico del médico es inválido.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      { id: 'cond_email_no_vacio', field: 'medico_tratante.correo_electronico', operator: 'NOT_EMPTY' },
      { id: 'cond_email_formato', field: 'medico_tratante.correo_electronico', operator: 'IS_EMAIL' }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.correo_electronico']
  },
  {
    id: 'gen_crono_inicio_antes_diagnostico',
    name: 'Inicio síntomas posterior al diagnóstico',
    level: 'CRÍTICO',
    points: 20,
    description: 'Inconsistencia: El inicio de síntomas no puede ser posterior al diagnóstico.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_crono_inicio_diag', field: 'padecimiento_actual.fecha_inicio', operator: 'DATE_AFTER', compareField: 'diagnostico.fecha_diagnostico' }],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.fecha_inicio', 'diagnostico.fecha_diagnostico']
  },
  {
    id: 'gen_crono_tratamiento_antes_diagnostico',
    name: 'Tratamiento iniciado antes del diagnóstico',
    level: 'CRÍTICO',
    points: 20,
    description: 'Inconsistencia: El tratamiento no puede haber iniciado antes del diagnóstico.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_crono_trat_diag', field: 'diagnostico.fecha_diagnostico', operator: 'DATE_AFTER', compareField: 'tratamiento.fecha_inicio' }],
    logicOperator: 'AND',
    affectedFields: ['diagnostico.fecha_diagnostico', 'tratamiento.fecha_inicio']
  },
  {
    id: 'gen_crono_ingreso_antes_diagnostico',
    name: 'Ingreso hospitalario antes del diagnóstico',
    level: 'CRÍTICO',
    points: 20,
    description: 'Inconsistencia: El ingreso hospitalario es previo a la fecha de diagnóstico.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_crono_hosp_diag', field: 'hospital.fecha_ingreso', operator: 'DATE_BEFORE', compareField: 'diagnostico.fecha_diagnostico' }],
    logicOperator: 'AND',
    affectedFields: ['hospital.fecha_ingreso', 'diagnostico.fecha_diagnostico']
  },
  {
    id: 'gen_crono_informe_antes_diagnostico',
    name: 'Informe anterior al diagnóstico',
    level: 'CRÍTICO',
    points: 20,
    description: 'El informe médico no puede tener fecha anterior a la del diagnóstico.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_crono_firma_diag', field: 'firma.fecha', operator: 'DATE_BEFORE', compareField: 'diagnostico.fecha_diagnostico' }],
    logicOperator: 'AND',
    affectedFields: ['firma.fecha', 'diagnostico.fecha_diagnostico']
  },
  {
    id: 'gen_crono_informe_futuro',
    name: 'Fecha de informe futura',
    level: 'CRÍTICO',
    points: 20,
    description: 'La fecha de emisión del informe no puede ser una fecha futura.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_firma_futura', field: 'firma.fecha', operator: 'DATE_AFTER', value: 'TODAY' }],
    logicOperator: 'AND',
    affectedFields: ['firma.fecha']
  },
  {
    id: 'firma_faltante',
    name: 'Firma del médico faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'El informe debe contener la firma autógrafa del médico tratante.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      { id: 'cond_firma_faltante_1', field: 'firma.firma_autografa_detectada', operator: 'IS_EMPTY' },
      { id: 'cond_firma_faltante_2', field: 'firma.firma_autografa_detectada', operator: 'EQUALS', value: 'false' }
    ],
    logicOperator: 'OR',
    affectedFields: ['firma.firma_autografa_detectada', 'firma.nombre_firma']
  },
  {
    id: 'gen_lugar_fecha_firma',
    name: 'Lugar y fecha de firma faltante',
    level: 'CRÍTICO',
    points: 15,
    description: 'Falta el lugar y la fecha de la firma al final del informe.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      { id: 'cond_lugar_firma', field: 'firma.lugar', operator: 'IS_EMPTY' },
      { id: 'cond_fecha_firma', field: 'firma.fecha', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'OR',
    affectedFields: ['firma.lugar', 'firma.fecha']
  },
  {
    id: 'gen_tachaduras_detectadas',
    name: 'Documento con tachaduras',
    level: 'CRÍTICO',
    points: 25,
    description: 'El documento no es válido porque presenta tachaduras o enmendaduras.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_tachaduras', field: 'metadata.tachaduras_detectadas', operator: 'EQUALS', value: 'true' }],
    logicOperator: 'AND',
    affectedFields: ['metadata.tachaduras_detectadas']
  },
  {
    id: 'gen_medico_firma_coincide',
    name: 'Médico firmante no coincide',
    level: 'IMPORTANTE',
    points: 15,
    description: 'El médico que firma el documento no coincide con el tratante declarado.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_firma_coincide', field: 'metadata.firma_coincide_con_tratante', operator: 'EQUALS', value: 'false' }],
    logicOperator: 'AND',
    affectedFields: ['firma.nombre_firma', 'medico_tratante.nombres']
  },
  {
    id: 'gen_uniformidad_tinta',
    name: 'Documento con múltiples tintas',
    level: 'CRÍTICO',
    points: 25,
    description: 'El llenado debe ser con una sola tinta en todo el documento o mismo color de escritura.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_uniformidad_tinta', field: 'metadata.uniformidad_tinta', operator: 'EQUALS', value: 'false' }],
    logicOperator: 'AND',
    affectedFields: ['metadata.uniformidad_tinta']
  }
];

const REGLAS_GNP: RawScoringRule[] = [
  {
    id: 'gnp_tramite_seleccionado',
    name: 'Trámite no seleccionado',
    level: 'CRÍTICO',
    points: 20,
    description: 'Debe seleccionar al menos un trámite solicitado.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      { id: 'cond_tramite_1', field: 'tramite.reembolso', operator: 'EQUALS', value: 'false' },
      { id: 'cond_tramite_2', field: 'tramite.programacion_cirugia', operator: 'EQUALS', value: 'false' },
      { id: 'cond_tramite_3', field: 'tramite.programacion_medicamentos', operator: 'EQUALS', value: 'false' },
      { id: 'cond_tramite_4', field: 'tramite.programacion_servicios', operator: 'EQUALS', value: 'false' },
      { id: 'cond_tramite_5', field: 'tramite.indemnizacion', operator: 'EQUALS', value: 'false' },
      { id: 'cond_tramite_6', field: 'tramite.reporte_hospitalario', operator: 'EQUALS', value: 'false' }
    ],
    logicOperator: 'AND',
    affectedFields: ['tramite.reembolso', 'tramite.programacion_cirugia', 'tramite.programacion_medicamentos', 'tramite.programacion_servicios', 'tramite.indemnizacion', 'tramite.reporte_hospitalario']
  },
  {
    id: 'gnp_poliza_numerica',
    name: 'Número de póliza inválido',
    level: 'CRÍTICO',
    points: 20,
    description: 'El número de póliza debe contener solo dígitos.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      { id: 'cond_poliza_no_vacia', field: 'tramite.numero_poliza', operator: 'NOT_EMPTY' },
      { id: 'cond_poliza_numerica', field: 'tramite.numero_poliza', operator: 'IS_NUMBER' }
    ],
    logicOperator: 'AND',
    affectedFields: ['tramite.numero_poliza']
  },
  {
    id: 'gnp_apellido_materno_nota',
    name: 'Segundo apellido del paciente faltante',
    level: 'DISCRETO',
    points: 2,
    description: 'Falta segundo apellido del paciente. Se recomienda "N/A" si no tiene.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_apellido_materno', field: 'identificacion.segundo_apellido', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.segundo_apellido']
  },
  {
    id: 'gnp_causa_atencion',
    name: 'Causa de atención no seleccionada',
    level: 'CRÍTICO',
    points: 20,
    description: 'Seleccione una sola causa (Accidente/Enfermedad/Embarazo).',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_causa_vacia', field: 'identificacion.causa_atencion', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.causa_atencion']
  },
  {
    id: 'gnp_antecedentes_patologicos',
    name: 'Antecedentes patológicos faltantes',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Indique antecedentes patológicos o "Ninguno".',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_ant_pat', field: 'antecedentes.personales_patologicos', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['antecedentes.personales_patologicos']
  },
  {
    id: 'gnp_antecedentes_no_patologicos',
    name: 'Antecedentes no patológicos faltantes',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Indique antecedentes no patológicos o "Ninguno".',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_ant_no_pat', field: 'antecedentes.personales_no_patologicos', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['antecedentes.personales_no_patologicos']
  },
  {
    id: 'gnp_gineco_obstetricos_mujer',
    name: 'Antecedentes G.O. faltantes para mujer',
    level: 'CRÍTICO',
    points: 20,
    description: 'Descripción de G.O. obligatoria para mujeres.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      { id: 'cond_sexo_f', field: 'identificacion.sexo', operator: 'CONTAINS', value: 'F' },
      { id: 'cond_gineco_vacio', field: 'antecedentes.gineco_obstetricos', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['antecedentes.gineco_obstetricos', 'identificacion.sexo']
  },
  {
    id: 'gnp_perinatales_menor',
    name: 'Antecedentes perinatales faltantes para menor',
    level: 'CRÍTICO',
    points: 20,
    description: 'Antecedentes perinatales obligatorios para menores de edad.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      { id: 'cond_edad_menor', field: 'identificacion.edad', operator: 'LESS_THAN', value: 18 },
      { id: 'cond_perinatales_vacio', field: 'antecedentes.perinatales', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['antecedentes.perinatales', 'identificacion.edad']
  },
  {
    id: 'gnp_padecimiento_insuficiente',
    name: 'Descripción del padecimiento insuficiente',
    level: 'CRÍTICO',
    points: 20,
    description: 'La descripción del padecimiento actual es insuficiente (mínimo 15 caracteres).',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_padecimiento_corto', field: 'padecimiento_actual.descripcion', operator: 'LENGTH_LESS_THAN', value: 15 }],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.descripcion']
  },
  {
    id: 'gnp_fecha_inicio_sintomas',
    name: 'Fecha de inicio de síntomas faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'Fecha de inicio de síntomas inválida o vacía.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_fecha_inicio_vacia', field: 'padecimiento_actual.fecha_inicio', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.fecha_inicio']
  },
  {
    id: 'gnp_fecha_tratamiento_obligatoria',
    name: 'Fecha de tratamiento faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'Fecha de inicio del tratamiento obligatoria si se detalla uno.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      { id: 'cond_trat_no_vacio', field: 'tratamiento.descripcion', operator: 'NOT_EMPTY' },
      { id: 'cond_fecha_trat_vacia', field: 'tratamiento.fecha_inicio', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['tratamiento.fecha_inicio', 'tratamiento.descripcion']
  },
  {
    id: 'gnp_tratamiento_con_diagnostico',
    name: 'Tratamiento faltante con diagnóstico',
    level: 'CRÍTICO',
    points: 20,
    description: 'Descripción del tratamiento obligatoria si hay un diagnóstico.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      { id: 'cond_diag_no_vacio', field: 'diagnostico.diagnostico_definitivo', operator: 'NOT_EMPTY' },
      { id: 'cond_trat_vacio', field: 'tratamiento.descripcion', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['tratamiento.descripcion', 'diagnostico.diagnostico_definitivo']
  },
  {
    id: 'gnp_tipo_padecimiento_congenito_adquirido',
    name: 'Congénito/Adquirido no seleccionado',
    level: 'CRÍTICO',
    points: 15,
    description: 'Elija exactamente entre Congénito o Adquirido.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_congenito_adquirido', field: 'padecimiento_actual.tipo_padecimiento_congenito_adquirido', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.tipo_padecimiento_congenito_adquirido']
  },
  {
    id: 'gnp_tipo_padecimiento_agudo_cronico',
    name: 'Agudo/Crónico no seleccionado',
    level: 'CRÍTICO',
    points: 15,
    description: 'Elija exactamente entre Agudo o Crónico.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_agudo_cronico', field: 'padecimiento_actual.tipo_padecimiento_agudo_cronico', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.tipo_padecimiento_agudo_cronico']
  },
  {
    id: 'gnp_origen_mutuamente_excluyente',
    name: 'Congénito y Adquirido son mutuamente excluyentes',
    level: 'CRÍTICO',
    points: 20,
    description: 'Solo puede seleccionar Congénito O Adquirido, no ambos al mismo tiempo.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.tipo_padecimiento']
  },
  {
    id: 'gnp_evolucion_mutuamente_excluyente',
    name: 'Agudo y Crónico son mutuamente excluyentes',
    level: 'CRÍTICO',
    points: 20,
    description: 'Solo puede seleccionar Agudo O Crónico, no ambos al mismo tiempo.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.tipo_padecimiento']
  },
  {
    id: 'gnp_sexo_vacio',
    name: 'Sexo del paciente no seleccionado',
    level: 'CRÍTICO',
    points: 20,
    description: 'Debe marcarse al menos una opción: Femenino o Masculino.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_gnp_sexo_vacio', field: 'identificacion.sexo', operator: 'ARRAY_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.sexo']
  },
  {
    id: 'gnp_sexo_seleccion_unica',
    name: 'Solo puede seleccionar un sexo',
    level: 'CRÍTICO',
    points: 20,
    description: 'Solo puede seleccionar Femenino O Masculino, no ambos.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_gnp_sexo_unica', field: 'identificacion.sexo', operator: 'ARRAY_LENGTH_GREATER_THAN', value: 1 }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.sexo']
  },
  {
    id: 'gnp_causa_atencion_seleccion_unica',
    name: 'Solo puede seleccionar una causa de atención',
    level: 'CRÍTICO',
    points: 20,
    description: 'Solo puede seleccionar Accidente, Enfermedad O Embarazo, no múltiples.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [],
    logicOperator: 'AND',
    affectedFields: ['identificacion.causa_atencion']
  },
  {
    id: 'gnp_complicaciones_seleccion_unica',
    name: 'Solo puede seleccionar Sí o No en complicaciones',
    level: 'CRÍTICO',
    points: 20,
    description: 'Solo puede seleccionar Sí O No para complicaciones, no ambos.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [],
    logicOperator: 'AND',
    affectedFields: ['complicaciones.presento_complicaciones']
  },
  {
    id: 'gnp_tipo_estancia_seleccion_unica',
    name: 'Solo puede seleccionar un tipo de estancia',
    level: 'CRÍTICO',
    points: 20,
    description: 'Solo puede seleccionar un tipo de estancia: Urgencia, Hospitalaria o Corta estancia.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [],
    logicOperator: 'AND',
    affectedFields: ['hospital.tipo_estancia']
  },
  {
    id: 'gnp_relacionado_otro_padecimiento',
    name: 'Relación con otro padecimiento no indicada',
    level: 'CRÍTICO',
    points: 15,
    description: 'Marque "Sí" o "No" en relación con otro padecimiento.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_relacionado', field: 'diagnostico.relacionado_con_otro', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['diagnostico.relacionado_con_otro']
  },
  {
    id: 'gnp_signos',
    name: 'Signos Vitales Incompletos',
    level: 'IMPORTANTE',
    points: 10,
    description: 'GNP requiere signos vitales (Presión/Temperatura) para el dictamen.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      { id: 'cond_gnp_signos_1', field: 'signos_vitales.presion_arterial', operator: 'IS_EMPTY' },
      { id: 'cond_gnp_signos_2', field: 'signos_vitales.temperatura', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'OR',
    affectedFields: ['signos_vitales.presion_arterial', 'signos_vitales.temperatura']
  },
  {
    id: 'gnp_exploracion_fisica',
    name: 'Exploración física faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'Los hallazgos de exploración física son obligatorios.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_exploracion', field: 'exploracion_fisica.resultados', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['exploracion_fisica.resultados']
  },
  {
    id: 'gnp_estudios_realizados',
    name: 'Estudios realizados faltantes',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Mencione estudios realizados o escriba "Ninguno".',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_estudios', field: 'estudios.estudios_realizados', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['estudios.estudios_realizados']
  },
  {
    id: 'gnp_tipo_estancia',
    name: 'Tipo de estancia no seleccionado',
    level: 'CRÍTICO',
    points: 15,
    description: 'Seleccione exactamente un tipo de estancia.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [{ id: 'cond_tipo_estancia', field: 'hospital.tipo_estancia', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['hospital.tipo_estancia']
  },
  {
    id: 'gnp_hospital_nombre',
    name: 'Nombre de hospital faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'Nombre del hospital obligatorio para Urgencia u Hospitalización.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      { id: 'cond_estancia_no_corta', field: 'hospital.tipo_estancia', operator: 'NOT_EQUALS', value: 'Corta estancia / ambulatoria' },
      { id: 'cond_hospital_vacio', field: 'hospital.nombre_hospital', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['hospital.nombre_hospital', 'hospital.tipo_estancia']
  },
  {
    id: 'gnp_hospital_ubicacion',
    name: 'Ubicación de hospital faltante',
    level: 'CRÍTICO',
    points: 15,
    description: 'Ciudad y Estado del hospital son obligatorios para esta estancia.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      { id: 'cond_estancia_no_corta_2', field: 'hospital.tipo_estancia', operator: 'NOT_EQUALS', value: 'Corta estancia / ambulatoria' },
      { id: 'cond_ciudad_vacia', field: 'hospital.ciudad', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['hospital.ciudad', 'hospital.estado', 'hospital.tipo_estancia']
  },
  {
    id: 'gnp_fechas_hospital',
    name: 'Fecha de Ingreso Incompleta',
    level: 'CRÍTICO',
    points: 15,
    description: 'Fecha de ingreso hospitalario obligatoria para estancias que no son cortas.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      { id: 'cond_estancia_no_corta_3', field: 'hospital.tipo_estancia', operator: 'NOT_EQUALS', value: 'Corta estancia / ambulatoria' },
      { id: 'cond_gnp_fechas_1', field: 'hospital.fecha_ingreso', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['hospital.fecha_ingreso', 'hospital.tipo_estancia']
  }
];

const REGLAS_METLIFE: RawScoringRule[] = [
  // ========== I. VALIDEZ DOCUMENTAL ==========
  // GEN-001 (Tachaduras) ya existe como regla general gen_tachaduras_detectadas
  // GEN-002 (Uniformidad tinta) ya existe como regla general gen_uniformidad_tinta
  
  {
    id: 'metlife_vigencia_informe',
    name: 'Informe médico con más de 6 meses de antigüedad',
    level: 'CRÍTICO',
    points: 25,
    description: 'La fecha de cabecera no debe ser mayor a 6 meses respecto a la fecha actual. Solo aplica si hay fecha de firma.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_vigencia_existe', field: 'firma.fecha', operator: 'NOT_EMPTY' },
      { id: 'cond_metlife_vigencia_antigua', field: 'firma.fecha', operator: 'DATE_OLDER_THAN_MONTHS', value: 6 }
    ],
    logicOperator: 'AND',
    affectedFields: ['firma.fecha']
  },
  {
    id: 'metlife_campos_vacios',
    name: 'Campos vacíos sin N/A',
    level: 'CRÍTICO',
    points: 20,
    description: 'No se permiten campos vacíos. Si un dato no aplica, debe decir "N/A" o "No aplica".',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_vacios_1', field: 'antecedentes.historia_clinica_breve', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_vacios_2', field: 'padecimiento_actual.descripcion', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'OR',
    affectedFields: ['antecedentes.historia_clinica_breve', 'padecimiento_actual.descripcion']
  },
  {
    id: 'metlife_informe_individual',
    name: 'Médico tratante no identificado',
    level: 'CRÍTICO',
    points: 20,
    description: 'Se requiere un informe independiente por cada médico tratante o interconsultante.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_medico', field: 'medico_tratante.nombres', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.nombres']
  },

  // ========== II. IDENTIFICACIÓN Y ANTECEDENTES ==========
  {
    id: 'metlife_datos_identidad',
    name: 'Datos de identidad del paciente incompletos',
    level: 'CRÍTICO',
    points: 25,
    description: 'El lugar, fecha, nombre, edad, peso y talla del paciente son obligatorios.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_nombre', field: 'identificacion.nombres', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_edad', field: 'identificacion.edad', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_peso', field: 'identificacion.peso', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_talla', field: 'identificacion.talla', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'OR',
    affectedFields: ['identificacion.nombres', 'identificacion.edad', 'identificacion.peso', 'identificacion.talla']
  },
  {
    id: 'metlife_sexo_vacio',
    name: 'Sexo del paciente no seleccionado',
    level: 'CRÍTICO',
    points: 20,
    description: 'Debe marcarse al menos una opción: Masculino, Femenino u Otro.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_sexo_vacio', field: 'identificacion.sexo', operator: 'ARRAY_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.sexo']
  },
  {
    id: 'metlife_causa_atencion',
    name: 'Causa de atención no marcada',
    level: 'CRÍTICO',
    points: 20,
    description: 'Debe marcarse al menos una opción de causa (Accidente, Enfermedad, Embarazo o Segunda valoración).',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_causa', field: 'identificacion.causa_atencion', operator: 'ARRAY_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.causa_atencion']
  },
  {
    id: 'metlife_fecha_primera_atencion',
    name: 'Fecha de primera atención faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'La fecha en que se atendió al paciente por primera vez es obligatoria (DD/MM/AAAA).',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_primera_atencion', field: 'identificacion.fecha_primera_atencion', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.fecha_primera_atencion']
  },
  {
    id: 'metlife_antecedentes_clinicos',
    name: 'Antecedentes clínicos incompletos',
    level: 'IMPORTANTE',
    points: 15,
    description: 'La historia clínica, antecedentes patológicos y quirúrgicos son obligatorios (admite "Ninguno").',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_historia', field: 'antecedentes.historia_clinica_breve', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_patologicos', field: 'antecedentes.personales_patologicos', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'OR',
    affectedFields: ['antecedentes.historia_clinica_breve', 'antecedentes.personales_patologicos']
  },
  {
    id: 'metlife_datos_go_condicional',
    name: 'Datos gineco-obstétricos incompletos',
    level: 'IMPORTANTE',
    points: 15,
    description: 'Si el sexo es Femenino o la causa es Embarazo, los campos G, P, A, C deben ser numéricos.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_go_sexo', field: 'identificacion.sexo', operator: 'EQUALS', value: 'Femenino' },
      { id: 'cond_metlife_go_g', field: 'antecedentes.gineco_g', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['antecedentes.gineco_g', 'antecedentes.gineco_p', 'antecedentes.gineco_a', 'antecedentes.gineco_c']
  },
  {
    id: 'metlife_datos_go_embarazo',
    name: 'Datos gineco-obstétricos faltantes por embarazo',
    level: 'IMPORTANTE',
    points: 15,
    description: 'Si la causa es Embarazo, los campos G, P, A, C deben estar completos.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_go_emb', field: 'identificacion.causa_atencion', operator: 'EQUALS', value: 'Embarazo' },
      { id: 'cond_metlife_go_emb_g', field: 'antecedentes.gineco_g', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['antecedentes.gineco_g', 'antecedentes.gineco_p', 'antecedentes.gineco_a', 'antecedentes.gineco_c']
  },

  // ========== III. DIAGNÓSTICO Y MANEJO MÉDICO ==========
  {
    id: 'metlife_descripcion_padecimiento',
    name: 'Descripción del padecimiento faltante',
    level: 'CRÍTICO',
    points: 25,
    description: 'Los signos, síntomas y tiempo de evolución son obligatorios.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_desc_pad', field: 'padecimiento_actual.descripcion', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_tiempo_evol', field: 'padecimiento_actual.tiempo_evolucion', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'OR',
    affectedFields: ['padecimiento_actual.descripcion', 'padecimiento_actual.tiempo_evolucion']
  },
  {
    id: 'metlife_evolucion_estado',
    name: 'Causa/etiología o estado actual faltante',
    level: 'IMPORTANTE',
    points: 15,
    description: 'La causa/etiología y el estado actual del paciente son obligatorios.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_etiologia', field: 'padecimiento_actual.causa_etiologia', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_estado', field: 'padecimiento_actual.estado_actual', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'OR',
    affectedFields: ['padecimiento_actual.causa_etiologia', 'padecimiento_actual.estado_actual']
  },
  {
    id: 'metlife_tipo_padecimiento_vacio',
    name: 'Tipo de padecimiento no seleccionado',
    level: 'CRÍTICO',
    points: 20,
    description: 'Es obligatorio marcar al menos una opción: Congénito, Adquirido, Agudo o Crónico.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_tipo_pad_vacio', field: 'padecimiento_actual.tipo_padecimiento', operator: 'ARRAY_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.tipo_padecimiento']
  },
  {
    id: 'metlife_tipo_padecimiento_sin_origen',
    name: 'Origen del padecimiento no seleccionado',
    level: 'CRÍTICO',
    points: 20,
    description: 'Debe marcar si el padecimiento es Congénito o Adquirido.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_sin_origen', field: 'padecimiento_actual.tipo_padecimiento', operator: 'ARRAY_CONTAINS_NONE', value: 'Congénito,Adquirido' }],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.tipo_padecimiento']
  },
  {
    id: 'metlife_tipo_padecimiento_sin_curso',
    name: 'Curso del padecimiento no seleccionado',
    level: 'CRÍTICO',
    points: 20,
    description: 'Debe marcar si el padecimiento es Agudo o Crónico.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_sin_curso', field: 'padecimiento_actual.tipo_padecimiento', operator: 'ARRAY_CONTAINS_NONE', value: 'Agudo,Crónico' }],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.tipo_padecimiento']
  },
  {
    id: 'metlife_tipo_padecimiento_origen_dual',
    name: 'Origen del padecimiento contradictorio',
    level: 'IMPORTANTE',
    points: 15,
    description: 'No puede ser Congénito y Adquirido al mismo tiempo. Seleccione solo uno.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_origen_dual', field: 'padecimiento_actual.tipo_padecimiento', operator: 'ARRAY_MUTUALLY_EXCLUSIVE', value: 'Congénito,Adquirido' }],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.tipo_padecimiento']
  },
  {
    id: 'metlife_tipo_padecimiento_curso_dual',
    name: 'Curso del padecimiento contradictorio',
    level: 'IMPORTANTE',
    points: 15,
    description: 'No puede ser Agudo y Crónico al mismo tiempo. Seleccione solo uno.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_curso_dual', field: 'padecimiento_actual.tipo_padecimiento', operator: 'ARRAY_MUTUALLY_EXCLUSIVE', value: 'Agudo,Crónico' }],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.tipo_padecimiento']
  },
  {
    id: 'metlife_diagnostico_cie',
    name: 'Diagnóstico o código CIE-10 faltante',
    level: 'CRÍTICO',
    points: 25,
    description: 'El diagnóstico etiológico definitivo y su código CIE-10 son obligatorios.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_diag', field: 'diagnostico.diagnostico_definitivo', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_cie', field: 'diagnostico.codigo_cie', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'OR',
    affectedFields: ['diagnostico.diagnostico_definitivo', 'diagnostico.codigo_cie']
  },
  {
    id: 'metlife_evidencia_medica',
    name: 'Resultados de exploración física faltantes',
    level: 'CRÍTICO',
    points: 20,
    description: 'Los resultados de exploración física y estudios practicados son obligatorios.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_exploracion', field: 'exploracion_fisica.resultados', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['exploracion_fisica.resultados']
  },
  {
    id: 'metlife_cronologia_medica',
    name: 'Fechas de cronología médica incompletas',
    level: 'CRÍTICO',
    points: 20,
    description: 'Las fechas de inicio de síntomas, diagnóstico e inicio de tratamiento son obligatorias.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_fecha_inicio', field: 'padecimiento_actual.fecha_inicio', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_fecha_diag', field: 'diagnostico.fecha_diagnostico', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_fecha_trat', field: 'diagnostico.fecha_inicio_tratamiento', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'OR',
    affectedFields: ['padecimiento_actual.fecha_inicio', 'diagnostico.fecha_diagnostico', 'diagnostico.fecha_inicio_tratamiento']
  },
  {
    id: 'metlife_detalle_tratamiento',
    name: 'Detalle de tratamiento faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'Si el paciente seguirá recibiendo tratamiento, la descripción del plan es obligatoria.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_seguira_trat', field: 'padecimiento_actual.seguira_tratamiento', operator: 'EQUALS', value: 'true' },
      { id: 'cond_metlife_plan_trat', field: 'padecimiento_actual.plan_tratamiento', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.seguira_tratamiento', 'padecimiento_actual.plan_tratamiento']
  },
  {
    id: 'metlife_detalle_equipo_insumos',
    name: 'Detalle de equipo/insumos faltante',
    level: 'IMPORTANTE',
    points: 15,
    description: 'Si marcó "Sí" en equipo especial o insumos, es obligatorio llenar el cuadro de detalle.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_equipo_si', field: 'intervencion_qx.utilizo_equipo_especial', operator: 'EQUALS', value: 'true' },
      { id: 'cond_metlife_equipo_detalle', field: 'intervencion_qx.detalle_equipo_especial', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['intervencion_qx.utilizo_equipo_especial', 'intervencion_qx.detalle_equipo_especial']
  },
  {
    id: 'metlife_detalle_insumos',
    name: 'Detalle de insumos faltante',
    level: 'IMPORTANTE',
    points: 15,
    description: 'Si marcó "Sí" en insumos/materiales, es obligatorio llenar el detalle.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_insumos_si', field: 'intervencion_qx.utilizo_insumos', operator: 'EQUALS', value: 'true' },
      { id: 'cond_metlife_insumos_detalle', field: 'intervencion_qx.detalle_insumos', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['intervencion_qx.utilizo_insumos', 'intervencion_qx.detalle_insumos']
  },
  {
    id: 'metlife_fecha_alta',
    name: 'Fecha probable de alta faltante',
    level: 'MODERADO',
    points: 10,
    description: 'Si el tratamiento continuará, la fecha probable de alta es obligatoria (DD/MM/AAAA).',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_sigue_trat', field: 'padecimiento_actual.seguira_tratamiento', operator: 'EQUALS', value: 'true' },
      { id: 'cond_metlife_fecha_alta', field: 'padecimiento_actual.fecha_probable_alta', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.seguira_tratamiento', 'padecimiento_actual.fecha_probable_alta']
  },

  // ========== IV. HOSPITALIZACIÓN Y EQUIPO ==========
  {
    id: 'metlife_datos_estancia',
    name: 'Datos de hospitalización incompletos',
    level: 'CRÍTICO',
    points: 20,
    description: 'Si hay hospital, debe marcar el Tipo de ingreso y llenar las fechas de ingreso y egreso.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_hosp_nombre', field: 'hospital.nombre_hospital', operator: 'NOT_EMPTY' },
      { id: 'cond_metlife_hosp_tipo', field: 'hospital.tipo_estancia', operator: 'ARRAY_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['hospital.nombre_hospital', 'hospital.tipo_estancia', 'hospital.fecha_ingreso', 'hospital.fecha_egreso']
  },
  {
    id: 'metlife_fecha_intervencion',
    name: 'Fecha de intervención quirúrgica faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'Si se realizó una cirugía, la fecha de intervención es obligatoria (DD/MM/AAAA).',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_cirugia', field: 'intervencion_qx.tecnica', operator: 'NOT_EMPTY' },
      { id: 'cond_metlife_fecha_cirugia', field: 'hospital.fecha_intervencion', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['intervencion_qx.tecnica', 'hospital.fecha_intervencion']
  },
  {
    id: 'metlife_observaciones',
    name: 'Sección de observaciones vacía',
    level: 'MODERADO',
    points: 10,
    description: 'La sección de observaciones y comentarios adicionales es obligatoria (admite "Ninguna").',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_obs', field: 'info_adicional.descripcion', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['info_adicional.descripcion']
  },
  {
    id: 'metlife_equipo_quirurgico_anest',
    name: 'Datos del anestesiólogo incompletos',
    level: 'IMPORTANTE',
    points: 15,
    description: 'Si registra anestesiólogo, su RFC (13 caracteres), Cédula y Email son obligatorios.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_anest_nombre', field: 'equipo_quirurgico_metlife.anestesiologo.nombre', operator: 'NOT_EMPTY' },
      { id: 'cond_metlife_anest_rfc', field: 'equipo_quirurgico_metlife.anestesiologo.rfc', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['equipo_quirurgico_metlife.anestesiologo.nombre', 'equipo_quirurgico_metlife.anestesiologo.rfc', 'equipo_quirurgico_metlife.anestesiologo.cedula_especialidad', 'equipo_quirurgico_metlife.anestesiologo.email']
  },
  {
    id: 'metlife_equipo_quirurgico_ayudante',
    name: 'Datos del primer ayudante incompletos',
    level: 'IMPORTANTE',
    points: 15,
    description: 'Si registra primer ayudante, su RFC (13 caracteres), Cédula y Email son obligatorios.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_ayud_nombre', field: 'equipo_quirurgico_metlife.primer_ayudante.nombre', operator: 'NOT_EMPTY' },
      { id: 'cond_metlife_ayud_rfc', field: 'equipo_quirurgico_metlife.primer_ayudante.rfc', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['equipo_quirurgico_metlife.primer_ayudante.nombre', 'equipo_quirurgico_metlife.primer_ayudante.rfc', 'equipo_quirurgico_metlife.primer_ayudante.cedula_especialidad', 'equipo_quirurgico_metlife.primer_ayudante.email']
  },

  // ========== V. DATOS DEL MÉDICO Y HONORARIOS ==========
  {
    id: 'metlife_info_fiscal',
    name: 'Información fiscal del médico incompleta',
    level: 'CRÍTICO',
    points: 25,
    description: 'Nombre, Cédula, RFC (13 caracteres), Teléfono y Email (formato válido) son obligatorios.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_med_nombre', field: 'medico_tratante.nombres', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_med_cedula', field: 'medico_tratante.cedula_profesional', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_med_rfc', field: 'medico_tratante.rfc', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_med_celular', field: 'medico_tratante.celular', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_med_email', field: 'medico_tratante.correo_electronico', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'OR',
    affectedFields: ['medico_tratante.nombres', 'medico_tratante.cedula_profesional', 'medico_tratante.rfc', 'medico_tratante.celular', 'medico_tratante.correo_electronico']
  },
  {
    id: 'metlife_rfc_formato',
    name: 'Formato de RFC inválido',
    level: 'CRÍTICO',
    points: 20,
    description: 'El RFC debe tener exactamente 13 caracteres alfanuméricos.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_rfc_no_vacio', field: 'medico_tratante.rfc', operator: 'NOT_EMPTY' },
      { id: 'cond_metlife_rfc_formato', field: 'medico_tratante.rfc', operator: 'REGEX', value: '^[A-Z]{4}\\d{6}[A-Z0-9]{3}$' }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.rfc']
  },
  {
    id: 'metlife_celular_formato',
    name: 'Formato de celular inválido',
    level: 'IMPORTANTE',
    points: 15,
    description: 'El número celular debe tener exactamente 10 dígitos.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_cel_no_vacio', field: 'medico_tratante.celular', operator: 'NOT_EMPTY' },
      { id: 'cond_metlife_cel_formato', field: 'medico_tratante.celular', operator: 'REGEX', value: '^\\d{10}$' }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.celular']
  },
  {
    id: 'metlife_tipo_atencion_vacio',
    name: 'Tipo de atención no seleccionado',
    level: 'CRÍTICO',
    points: 20,
    description: 'Debe marcar visualmente su rol (Médico Tratante, Cirujano, etc.) en las casillas.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_tipo_aten_vacio', field: 'medico_tratante.tipo_atencion', operator: 'ARRAY_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.tipo_atencion']
  },
  {
    id: 'metlife_tipo_atencion_multiple',
    name: 'Múltiples tipos de atención seleccionados',
    level: 'IMPORTANTE',
    points: 15,
    description: 'Se recomienda seleccionar solo un tipo de atención (Médico Tratante, Cirujano, etc.).',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_tipo_aten_multi', field: 'medico_tratante.tipo_atencion', operator: 'ARRAY_LENGTH_GREATER_THAN', value: 1 }],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.tipo_atencion']
  },
  {
    id: 'metlife_convenio_tabulador',
    name: 'Convenio y tabulador no seleccionados',
    level: 'IMPORTANTE',
    points: 15,
    description: 'La selección de "Sí" o "No" en Convenio y Aceptación de Tabuladores es obligatoria.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_convenio_null', field: 'medico_tratante.convenio_aseguradora', operator: 'IS_NULL' },
      { id: 'cond_metlife_tabulador_null', field: 'medico_tratante.se_ajusta_tabulador', operator: 'IS_NULL' }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.convenio_aseguradora', 'medico_tratante.se_ajusta_tabulador']
  },
  {
    id: 'metlife_monto_honorarios',
    name: 'Monto de honorarios faltante o inválido',
    level: 'IMPORTANTE',
    points: 15,
    description: 'El monto de honorarios según su rol debe ser numérico y mayor a 0.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_hon_cirug', field: 'medico_tratante.honorarios_cirujano', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_hon_anest', field: 'medico_tratante.honorarios_anestesiologo', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_hon_ayud', field: 'medico_tratante.honorarios_ayudante', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.honorarios_cirujano', 'medico_tratante.honorarios_anestesiologo', 'medico_tratante.honorarios_ayudante']
  },

  // ========== VI. LÓGICA Y CIERRE ==========
  {
    id: 'metlife_secuencia_sintomas',
    name: 'Secuencia de fechas incoherente',
    level: 'CRÍTICO',
    points: 20,
    description: 'La fecha de inicio de síntomas debe ser anterior o igual al diagnóstico y tratamiento.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_sec_sint', field: 'padecimiento_actual.fecha_inicio', operator: 'DATE_AFTER', compareField: 'diagnostico.fecha_diagnostico' }],
    logicOperator: 'AND',
    affectedFields: ['padecimiento_actual.fecha_inicio', 'diagnostico.fecha_diagnostico', 'diagnostico.fecha_inicio_tratamiento']
  },
  {
    id: 'metlife_periodo_hospitalario',
    name: 'Período hospitalario incoherente',
    level: 'CRÍTICO',
    points: 20,
    description: 'La fecha de ingreso debe ser anterior o igual a la de intervención y ésta al egreso.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_hosp_fechas', field: 'hospital.fecha_ingreso', operator: 'DATE_AFTER', compareField: 'hospital.fecha_egreso' }],
    logicOperator: 'AND',
    affectedFields: ['hospital.fecha_ingreso', 'hospital.fecha_intervencion', 'hospital.fecha_egreso']
  },
  {
    id: 'metlife_consistencia_firma',
    name: 'Fecha posterior a firma del documento',
    level: 'CRÍTICO',
    points: 20,
    description: 'Ninguna fecha del informe puede ser posterior a la fecha de firma del documento.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_firma_post', field: 'diagnostico.fecha_diagnostico', operator: 'DATE_AFTER', compareField: 'firma.fecha' }],
    logicOperator: 'AND',
    affectedFields: ['firma.fecha', 'diagnostico.fecha_diagnostico']
  },
  {
    id: 'metlife_firma_nombre',
    name: 'Firma o nombre del médico faltante',
    level: 'CRÍTICO',
    points: 25,
    description: 'El informe debe incluir el nombre completo y la firma autógrafa del médico tratante.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_firma_nombre', field: 'firma.nombre_firma', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_firma_auto', field: 'firma.firma_autografa_detectada', operator: 'EQUALS', value: 'false' }
    ],
    logicOperator: 'OR',
    affectedFields: ['firma.nombre_firma', 'firma.firma_autografa_detectada']
  },

  // ========== VII. REGLAS DE SELECCIÓN ÚNICA (CHECKBOXES) ==========
  {
    id: 'metlife_causa_atencion_seleccion_unica',
    name: 'Solo puede seleccionar una causa de atención',
    level: 'CRÍTICO',
    points: 20,
    description: 'Solo puede seleccionar una opción: Accidente, Enfermedad, Embarazo o Segunda valoración, no múltiples.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_causa_unica', field: 'identificacion.causa_atencion', operator: 'ARRAY_LENGTH_GREATER_THAN', value: 1 }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.causa_atencion']
  },
  {
    id: 'metlife_tipo_estancia_seleccion_unica',
    name: 'Solo puede seleccionar un tipo de estancia',
    level: 'CRÍTICO',
    points: 20,
    description: 'Solo puede seleccionar una opción: Urgencia, Ingreso hospitalario o Corta estancia ambulatoria, no múltiples.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_estancia_unica', field: 'hospital.tipo_estancia', operator: 'ARRAY_LENGTH_GREATER_THAN', value: 1 }],
    logicOperator: 'AND',
    affectedFields: ['hospital.tipo_estancia']
  },
  {
    id: 'metlife_sexo_seleccion_unica',
    name: 'Solo puede seleccionar un sexo',
    level: 'CRÍTICO',
    points: 20,
    description: 'Solo puede seleccionar Masculino, Femenino u Otro, no múltiples.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_sexo_unica', field: 'identificacion.sexo', operator: 'ARRAY_LENGTH_GREATER_THAN', value: 1 }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.sexo']
  },

  // ========== VIII. REGLAS NYLIFE - SEXO ==========
  {
    id: 'nylife_sexo_vacio',
    name: 'Sexo del paciente no seleccionado',
    level: 'CRÍTICO',
    points: 20,
    description: 'Debe marcarse al menos una opción: Femenino o Masculino.',
    providerTarget: 'NYLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_nylife_sexo_vacio', field: 'identificacion.sexo', operator: 'ARRAY_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.sexo']
  },
  {
    id: 'nylife_sexo_seleccion_unica',
    name: 'Solo puede seleccionar un sexo',
    level: 'CRÍTICO',
    points: 20,
    description: 'Solo puede seleccionar Femenino O Masculino, no ambos.',
    providerTarget: 'NYLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_nylife_sexo_unica', field: 'identificacion.sexo', operator: 'ARRAY_LENGTH_GREATER_THAN', value: 1 }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.sexo']
  }
];

function getCategoryFromProvider(providerTarget: string): RuleCategory {
  if (providerTarget === 'ALL' || providerTarget === 'GENERAL') return RuleCategory.GENERAL;
  if (providerTarget === 'GNP') return RuleCategory.GNP;
  if (providerTarget === 'METLIFE') return RuleCategory.METLIFE;
  if (providerTarget === 'NYLIFE') return RuleCategory.NYLIFE;
  return RuleCategory.GENERAL;
}

async function migrateRulesToDatabase() {
  console.log('Starting rules migration to database...');
  console.log('Mode: SAFE - Only adding new rules, preserving existing modifications\n');

  const existingRules = await prisma.scoringRuleRecord.findMany({
    select: { ruleId: true }
  });
  const existingRuleIds = new Set(existingRules.map(r => r.ruleId));
  
  console.log(`Found ${existingRuleIds.size} existing rules in database.`);

  const allRules = [
    ...REGLAS_GENERALES.map(r => ({ ...r, category: RuleCategory.GENERAL })),
    ...REGLAS_GNP.map(r => ({ ...r, category: RuleCategory.GNP })),
    ...REGLAS_METLIFE.map(r => ({ ...r, category: RuleCategory.METLIFE })),
  ];

  const newRules = allRules.filter(r => !existingRuleIds.has(r.id));
  
  if (newRules.length === 0) {
    console.log('No new rules to add. All rules already exist in the database.');
    console.log('Existing rules and their modifications have been preserved.');
    return { success: 0, errors: 0, skipped: allRules.length };
  }

  console.log(`Adding ${newRules.length} new rules (skipping ${allRules.length - newRules.length} existing)...`);

  let successCount = 0;
  let errorCount = 0;

  for (const rule of newRules) {
    try {
      const hasValidator = !!rule.validator;
      const validatorKey = hasValidator ? rule.id : null;

      await prisma.scoringRuleRecord.create({
        data: {
          ruleId: rule.id,
          name: rule.name,
          level: mapLevelToEnum(rule.level),
          points: rule.points,
          description: rule.description,
          providerTarget: rule.providerTarget,
          category: rule.category,
          isCustom: rule.isCustom || false,
          conditions: rule.conditions && rule.conditions.length > 0 ? JSON.parse(JSON.stringify(rule.conditions)) : undefined,
          logicOperator: rule.logicOperator || null,
          affectedFields: rule.affectedFields,
          hasValidator,
          validatorKey,
        }
      });
      console.log(`  + Added: ${rule.name}`);
      successCount++;
    } catch (error: any) {
      console.error(`  ! Error adding rule ${rule.id}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`  - New rules added: ${successCount}`);
  console.log(`  - Errors: ${errorCount}`);
  console.log(`  - Existing rules preserved: ${existingRuleIds.size}`);

  const counts = await prisma.scoringRuleRecord.groupBy({
    by: ['category'],
    _count: true,
  });
  
  console.log('\nTotal rules by category:');
  counts.forEach(c => {
    console.log(`  - ${c.category}: ${c._count}`);
  });

  return { success: successCount, errors: errorCount, skipped: allRules.length - newRules.length };
}

if (require.main === module) {
  migrateRulesToDatabase()
    .then(() => {
      console.log('\nMigration script finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { migrateRulesToDatabase };
