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
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_paciente_apellido_1', field: 'identificacion.primer_apellido', operator: 'IS_EMPTY' }],
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
    id: 'gen_paciente_sexo',
    name: 'Sexo del paciente obligatorio',
    level: 'CRÍTICO',
    points: 20,
    description: 'Debe seleccionarse un sexo válido (F o M).',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_paciente_sexo_1', field: 'identificacion.sexo', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['identificacion.sexo']
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
    providerTarget: 'ALL',
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
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [{ id: 'cond_medico_apellido_1', field: 'medico_tratante.primer_apellido', operator: 'IS_EMPTY' }],
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
    id: 'gnp_sexo_seleccion_unica',
    name: 'Solo puede seleccionar un sexo',
    level: 'CRÍTICO',
    points: 20,
    description: 'Solo puede seleccionar Femenino O Masculino, no ambos.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [],
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
  {
    id: 'metlife_rfc',
    name: 'RFC Médico Obligatorio',
    level: 'CRÍTICO',
    points: 20,
    description: 'MetLife requiere el RFC para validación de honorarios.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [{ id: 'cond_metlife_rfc_1', field: 'medico_tratante.rfc', operator: 'IS_EMPTY' }],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.rfc']
  },
  {
    id: 'metlife_secciones',
    name: 'Secciones Incompletas',
    level: 'MODERADO',
    points: 10,
    description: 'Faltan datos en secciones clave (Antecedentes o Padecimiento).',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_secciones_1', field: 'antecedentes.historia_clinica_breve', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_secciones_2', field: 'padecimiento_actual.descripcion', operator: 'IS_EMPTY' }
    ],
    logicOperator: 'OR',
    affectedFields: ['antecedentes.historia_clinica_breve', 'padecimiento_actual.descripcion']
  },
  {
    id: 'metlife_codigo_cie',
    name: 'Código CIE-10 Formato Inválido',
    level: 'IMPORTANTE',
    points: 12,
    description: 'MetLife requiere código CIE-10 en formato válido (ej: A00.0).',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      { id: 'cond_metlife_cie_1', field: 'diagnostico.codigo_cie', operator: 'IS_EMPTY' },
      { id: 'cond_metlife_cie_2', field: 'diagnostico.codigo_cie', operator: 'REGEX', value: '^[A-Z]\\d{2}(\\.\\d{1,2})?$' }
    ],
    logicOperator: 'OR',
    affectedFields: ['diagnostico.codigo_cie']
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

  const existingCount = await prisma.scoringRuleRecord.count();
  if (existingCount > 0) {
    console.log(`Found ${existingCount} existing rules. Clearing them first...`);
    await prisma.scoringRuleRecord.deleteMany();
  }

  const allRules = [
    ...REGLAS_GENERALES.map(r => ({ ...r, category: RuleCategory.GENERAL })),
    ...REGLAS_GNP.map(r => ({ ...r, category: RuleCategory.GNP })),
    ...REGLAS_METLIFE.map(r => ({ ...r, category: RuleCategory.METLIFE })),
  ];

  console.log(`Migrating ${allRules.length} rules...`);

  let successCount = 0;
  let errorCount = 0;

  for (const rule of allRules) {
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
          conditions: rule.conditions && rule.conditions.length > 0 ? rule.conditions : null,
          logicOperator: rule.logicOperator || null,
          affectedFields: rule.affectedFields,
          hasValidator,
          validatorKey,
        }
      });
      successCount++;
    } catch (error: any) {
      console.error(`Error migrating rule ${rule.id}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`  - Successfully migrated: ${successCount} rules`);
  console.log(`  - Errors: ${errorCount}`);

  const counts = await prisma.scoringRuleRecord.groupBy({
    by: ['category'],
    _count: true,
  });
  
  console.log('\nRules by category:');
  counts.forEach(c => {
    console.log(`  - ${c.category}: ${c._count}`);
  });

  return { success: successCount, errors: errorCount };
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
