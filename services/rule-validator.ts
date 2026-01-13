import { ExtractedData, ScoringRule, RuleCondition, RuleOperator, FieldMappings } from "../types";

function getNestedField(obj: any, path: string): any {
  if (!path) return undefined;
  const keys = path.split('.');
  let result = obj;
  for (const key of keys) {
    if (result === null || result === undefined) return undefined;
    result = result[key];
  }
  return result;
}

function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function isValidDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date;
}

function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function isValidRFC(rfc: string): boolean {
  if (!rfc || typeof rfc !== 'string') return false;
  const rfcClean = rfc.trim().toUpperCase();
  const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
  return rfcRegex.test(rfcClean);
}

function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  const digitsOnly = phone.replace(/\D/g, '');
  return digitsOnly.length === 10;
}

function isNumeric(value: any): boolean {
  if (value === null || value === undefined || value === '') return false;
  return !isNaN(Number(value));
}

export function validateCondition(
  cond: RuleCondition, 
  data: ExtractedData,
  fieldMappings?: FieldMappings
): boolean {
  let fieldPath = cond.field;
  
  if (fieldMappings && data.provider && fieldMappings[data.provider]) {
    fieldPath = fieldMappings[data.provider][0] || cond.field;
  }
  
  const fieldValue = getNestedField(data, fieldPath);
  
  switch (cond.operator) {
    case 'IS_EMPTY':
      return isEmpty(fieldValue);
    
    case 'IS_NOT_EMPTY':
    case 'NOT_EMPTY':
      return !isEmpty(fieldValue);
    
    case 'REQUIRES': {
      const compareValue = cond.compareField ? getNestedField(data, cond.compareField) : undefined;
      const fieldExists = !isEmpty(fieldValue);
      const compareExists = !isEmpty(compareValue);
      if (fieldExists && !compareExists) return true;
      if (!fieldExists && compareExists) return true;
      return false;
    }
    
    case 'IF_THEN': {
      const compareValue = cond.compareField ? getNestedField(data, cond.compareField) : undefined;
      const fieldExists = !isEmpty(fieldValue);
      const compareExists = !isEmpty(compareValue);
      if (fieldExists && !compareExists) return true;
      return false;
    }
    
    case 'EQUALS':
      if (fieldValue === undefined || fieldValue === null) return false;
      const targetValue = String(cond.value).trim().toLowerCase();
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(v => String(v).trim().toLowerCase() === targetValue);
      }
      return String(fieldValue).trim().toLowerCase() === targetValue;
    
    case 'NOT_EQUALS':
      if (fieldValue === undefined || fieldValue === null) return true;
      const compareValue = String(cond.value).trim().toLowerCase();
      if (Array.isArray(fieldValue)) {
        return !fieldValue.some(v => String(v).trim().toLowerCase() === compareValue);
      }
      return String(fieldValue).trim().toLowerCase() !== compareValue;
    
    case 'GREATER_THAN': {
      if (!isNumeric(fieldValue) || !isNumeric(cond.value)) return false;
      return Number(fieldValue) > Number(cond.value);
    }
    
    case 'LESS_THAN': {
      if (!isNumeric(fieldValue) || !isNumeric(cond.value)) return false;
      return Number(fieldValue) < Number(cond.value);
    }
    
    case 'GREATER_THAN_OR_EQUAL': {
      if (!isNumeric(fieldValue) || !isNumeric(cond.value)) return false;
      return Number(fieldValue) >= Number(cond.value);
    }
    
    case 'LESS_THAN_OR_EQUAL': {
      if (!isNumeric(fieldValue) || !isNumeric(cond.value)) return false;
      return Number(fieldValue) <= Number(cond.value);
    }
    
    case 'DATE_MISSING':
      return isEmpty(fieldValue);
    
    case 'DATE_INVALID':
      if (isEmpty(fieldValue)) return false;
      return !isValidDate(String(fieldValue));
    
    case 'IS_DATE':
      if (isEmpty(fieldValue)) return false;
      return !isValidDate(String(fieldValue));
    
    case 'DATE_BEFORE': {
      const dateA = parseDate(String(fieldValue));
      let dateB: Date | null = null;
      if (cond.value === 'TODAY') {
        dateB = new Date();
      } else if (cond.compareField) {
        dateB = parseDate(String(getNestedField(data, cond.compareField)));
      } else if (cond.value) {
        dateB = parseDate(String(cond.value));
      }
      if (!dateA || !dateB) return false;
      return dateA < dateB;
    }
    
    case 'DATE_AFTER': {
      const dateA = parseDate(String(fieldValue));
      let dateB: Date | null = null;
      if (cond.value === 'TODAY') {
        dateB = new Date();
      } else if (cond.compareField) {
        dateB = parseDate(String(getNestedField(data, cond.compareField)));
      } else if (cond.value) {
        dateB = parseDate(String(cond.value));
      }
      if (!dateA || !dateB) return false;
      return dateA > dateB;
    }
    
    case 'IS_NUMBER':
      if (isEmpty(fieldValue)) return false;
      return !isNumeric(fieldValue);
    
    case 'IS_EMAIL':
      if (isEmpty(fieldValue)) return false;
      return !isValidEmail(String(fieldValue));
    
    case 'IS_RFC':
      if (isEmpty(fieldValue)) return false;
      return !isValidRFC(String(fieldValue));
    
    case 'IS_PHONE':
      if (isEmpty(fieldValue)) return false;
      return !isValidPhone(String(fieldValue));
    
    case 'REGEX': {
      if (isEmpty(fieldValue) || !cond.value) return false;
      try {
        const regex = new RegExp(String(cond.value), 'i');
        return !regex.test(String(fieldValue));
      } catch {
        return false;
      }
    }
    
    case 'CONTAINS': {
      if (isEmpty(fieldValue) || !cond.value) return false;
      const searchValue = String(cond.value).toLowerCase();
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(v => String(v).toLowerCase().includes(searchValue));
      }
      return String(fieldValue).toLowerCase().includes(searchValue);
    }
    
    case 'NOT_CONTAINS': {
      if (isEmpty(fieldValue) || !cond.value) return true;
      const searchValue = String(cond.value).toLowerCase();
      if (Array.isArray(fieldValue)) {
        return !fieldValue.some(v => String(v).toLowerCase().includes(searchValue));
      }
      return !String(fieldValue).toLowerCase().includes(searchValue);
    }
    
    case 'LENGTH_LESS_THAN': {
      if (isEmpty(fieldValue)) return true;
      const strValue = String(fieldValue);
      return strValue.length < Number(cond.value);
    }
    
    case 'LENGTH_GREATER_THAN': {
      if (isEmpty(fieldValue)) return false;
      const strValue = String(fieldValue);
      return strValue.length > Number(cond.value);
    }
    
    case 'MUTUALLY_EXCLUSIVE': {
      const compareValue = cond.compareField ? getNestedField(data, cond.compareField) : undefined;
      const fieldExists = !isEmpty(fieldValue);
      const compareExists = !isEmpty(compareValue);
      return fieldExists && compareExists;
    }
    
    case 'ONE_OF_REQUIRED': {
      const fields = [cond.field, ...(cond.additionalFields || [])];
      return !fields.some(f => !isEmpty(getNestedField(data, f)));
    }
    
    case 'ALL_REQUIRED': {
      const fields = [cond.field, ...(cond.additionalFields || [])];
      return !fields.every(f => !isEmpty(getNestedField(data, f)));
    }
    
    default:
      return true;
  }
}

export function validateRule(rule: ScoringRule, data: ExtractedData): boolean {
  if (rule.validator) {
    try {
      return rule.validator(data);
    } catch {
      return false;
    }
  }
  
  if (!rule.conditions || rule.conditions.length === 0) {
    return false;
  }
  
  const results = rule.conditions.map(cond => 
    validateCondition(cond, data, rule.fieldMappings)
  );
  
  if (rule.logicOperator === 'OR') {
    return results.some(r => r);
  } else {
    return results.every(r => r);
  }
}

export function getPreviewResult(rule: Partial<ScoringRule>, data: ExtractedData | null): {
  passes: boolean;
  message: string;
  details?: string[];
} {
  if (!data) {
    return {
      passes: false,
      message: 'Sube un reporte para previsualizar',
      details: []
    };
  }
  
  if (!rule.conditions || rule.conditions.length === 0) {
    return {
      passes: false,
      message: 'Agrega al menos una condición',
      details: []
    };
  }
  
  const details: string[] = [];
  const conditionResults = rule.conditions.map(cond => {
    const result = validateCondition(cond, data, rule.fieldMappings);
    
    let fieldPath = cond.field;
    if (rule.fieldMappings && data.provider && rule.fieldMappings[data.provider]) {
      fieldPath = rule.fieldMappings[data.provider][0] || cond.field;
    }
    
    const fieldValue = getNestedField(data, fieldPath);
    const displayValue = isEmpty(fieldValue) ? '(vacío)' : String(fieldValue).substring(0, 50);
    details.push(`${fieldPath}: ${displayValue} → ${result ? '⚠️ DETECTADO' : '✓ OK'}`);
    return result;
  });
  
  let passes: boolean;
  if (rule.logicOperator === 'OR') {
    passes = conditionResults.some(r => r);
  } else {
    passes = conditionResults.every(r => r);
  }
  
  return {
    passes: !passes,
    message: passes ? 'La regla FALLA (generará deducción de puntos)' : 'La regla se cumple (no generará deducción)',
    details
  };
}

export const AVAILABLE_FIELDS: string[] = [
  'provider',
  'tramite.reembolso',
  'tramite.programacion_cirugia',
  'tramite.programacion_medicamentos',
  'tramite.programacion_servicios',
  'tramite.indemnizacion',
  'tramite.reporte_hospitalario',
  'tramite.numero_poliza',
  'identificacion.primer_apellido',
  'identificacion.segundo_apellido',
  'identificacion.nombres',
  'identificacion.edad',
  'identificacion.sexo',
  'identificacion.causa_atencion',
  'identificacion.peso',
  'identificacion.talla',
  'identificacion.fecha_primera_atencion',
  'antecedentes.personales_patologicos',
  'antecedentes.personales_no_patologicos',
  'antecedentes.gineco_obstetricos',
  'antecedentes.gineco_g',
  'antecedentes.gineco_p',
  'antecedentes.gineco_a',
  'antecedentes.gineco_c',
  'antecedentes.gineco_descripcion',
  'antecedentes.perinatales',
  'antecedentes.historia_clinica_breve',
  'antecedentes.antecedentes_quirurgicos',
  'antecedentes.otras_afecciones',
  'padecimiento_actual.descripcion',
  'padecimiento_actual.fecha_inicio',
  'padecimiento_actual.tipo_padecimiento',
  'padecimiento_actual.tipo_padecimiento_congenito_adquirido',
  'padecimiento_actual.tipo_padecimiento_agudo_cronico',
  'padecimiento_actual.tiempo_evolucion',
  'padecimiento_actual.causa_etiologia',
  'padecimiento_actual.estado_actual',
  'padecimiento_actual.seguira_tratamiento',
  'padecimiento_actual.plan_tratamiento',
  'padecimiento_actual.fecha_probable_alta',
  'diagnostico.diagnostico_definitivo',
  'diagnostico.fecha_diagnostico',
  'diagnostico.tipo_padecimiento',
  'diagnostico.relacionado_con_otro',
  'diagnostico.especifique_cual',
  'diagnostico.codigo_cie',
  'diagnostico.fecha_inicio_tratamiento',
  'diagnostico.cie_coherente_con_texto',
  'signos_vitales.pulso',
  'signos_vitales.respiracion',
  'signos_vitales.temperatura',
  'signos_vitales.presion_arterial',
  'signos_vitales.presion_arterial_sistolica',
  'signos_vitales.presion_arterial_diastolica',
  'signos_vitales.peso',
  'signos_vitales.altura',
  'exploracion_fisica.resultados',
  'exploracion_fisica.fecha',
  'exploracion_fisica.estudios_laboratorio_gabinete',
  'estudios.estudios_realizados',
  'complicaciones.presento_complicaciones',
  'complicaciones.fecha_inicio',
  'complicaciones.descripcion',
  'tratamiento.descripcion',
  'tratamiento.fecha_inicio',
  'intervencion_qx.equipo_especifico',
  'intervencion_qx.fechas',
  'intervencion_qx.tecnica',
  'intervencion_qx.utilizo_equipo_especial',
  'intervencion_qx.detalle_equipo_especial',
  'intervencion_qx.utilizo_insumos',
  'intervencion_qx.detalle_insumos',
  'info_adicional.descripcion',
  'hospital.nombre_hospital',
  'hospital.ciudad',
  'hospital.estado',
  'hospital.tipo_estancia',
  'hospital.fecha_ingreso',
  'hospital.fecha_intervencion',
  'hospital.fecha_egreso',
  'medico_tratante.primer_apellido',
  'medico_tratante.segundo_apellido',
  'medico_tratante.nombres',
  'medico_tratante.especialidad',
  'medico_tratante.cedula_profesional',
  'medico_tratante.cedula_especialidad',
  'medico_tratante.convenio_gnp',
  'medico_tratante.convenio_aseguradora',
  'medico_tratante.se_ajusta_tabulador',
  'medico_tratante.honorarios_cirujano',
  'medico_tratante.honorarios_anestesiologo',
  'medico_tratante.honorarios_ayudante',
  'medico_tratante.ppto_honorarios',
  'medico_tratante.telefono_consultorio',
  'medico_tratante.domicilio_consultorio',
  'medico_tratante.celular',
  'medico_tratante.correo_electronico',
  'medico_tratante.rfc',
  'medico_tratante.tipo_participacion',
  'medico_tratante.hubo_interconsulta',
  'medico_tratante.tipo_atencion',
  'otros_medicos[0].tipo_participacion',
  'otros_medicos[0].tipo_participacion_otra',
  'otros_medicos[0].primer_apellido',
  'otros_medicos[0].segundo_apellido',
  'otros_medicos[0].nombres',
  'otros_medicos[0].especialidad',
  'otros_medicos[0].cedula_profesional',
  'otros_medicos[0].cedula_especialidad',
  'otros_medicos[0].ppto_honorarios',
  'otros_medicos[1].tipo_participacion',
  'otros_medicos[1].tipo_participacion_otra',
  'otros_medicos[1].primer_apellido',
  'otros_medicos[1].segundo_apellido',
  'otros_medicos[1].nombres',
  'otros_medicos[1].especialidad',
  'otros_medicos[1].cedula_profesional',
  'otros_medicos[1].cedula_especialidad',
  'otros_medicos[1].ppto_honorarios',
  'otros_medicos[2].tipo_participacion',
  'otros_medicos[2].tipo_participacion_otra',
  'otros_medicos[2].primer_apellido',
  'otros_medicos[2].segundo_apellido',
  'otros_medicos[2].nombres',
  'otros_medicos[2].especialidad',
  'otros_medicos[2].cedula_profesional',
  'otros_medicos[2].cedula_especialidad',
  'otros_medicos[2].ppto_honorarios',
  'equipo_quirurgico_metlife.anestesiologo.nombre',
  'equipo_quirurgico_metlife.anestesiologo.cedula_especialidad',
  'equipo_quirurgico_metlife.anestesiologo.celular',
  'equipo_quirurgico_metlife.anestesiologo.rfc',
  'equipo_quirurgico_metlife.anestesiologo.email',
  'equipo_quirurgico_metlife.primer_ayudante.nombre',
  'equipo_quirurgico_metlife.primer_ayudante.cedula_especialidad',
  'equipo_quirurgico_metlife.primer_ayudante.celular',
  'equipo_quirurgico_metlife.primer_ayudante.rfc',
  'equipo_quirurgico_metlife.primer_ayudante.email',
  'equipo_quirurgico_metlife.otro_1.nombre',
  'equipo_quirurgico_metlife.otro_1.cedula_especialidad',
  'equipo_quirurgico_metlife.otro_1.celular',
  'equipo_quirurgico_metlife.otro_1.rfc',
  'equipo_quirurgico_metlife.otro_1.email',
  'equipo_quirurgico_metlife.otro_1.especialidad',
  'equipo_quirurgico_metlife.otro_2.nombre',
  'equipo_quirurgico_metlife.otro_2.cedula_especialidad',
  'equipo_quirurgico_metlife.otro_2.celular',
  'equipo_quirurgico_metlife.otro_2.rfc',
  'equipo_quirurgico_metlife.otro_2.email',
  'equipo_quirurgico_metlife.otro_2.especialidad',
  'firma.lugar_fecha',
  'firma.lugar',
  'firma.fecha',
  'firma.nombre_firma',
  'firma.firma_autografa_detectada',
  'metadata.existe_coherencia_clinica',
  'metadata.observacion_coherencia',
  'metadata.tachaduras_detectadas',
  'metadata.firma_coincide_con_tratante',
  'metadata.diagnostico_severidad',
  'otros_medicos'
];

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  'IS_EMPTY': 'Está vacío (falta valor)',
  'IS_NOT_EMPTY': 'Tiene valor (no debería)',
  'NOT_EMPTY': 'Tiene valor (alias)',
  'REQUIRES': 'Requiere par (bidireccional)',
  'IF_THEN': 'Si A existe, B falta',
  'EQUALS': 'Es igual a',
  'NOT_EQUALS': 'Es diferente a',
  'GREATER_THAN': 'Mayor que',
  'LESS_THAN': 'Menor que',
  'GREATER_THAN_OR_EQUAL': 'Mayor o igual que',
  'LESS_THAN_OR_EQUAL': 'Menor o igual que',
  'DATE_MISSING': 'Fecha faltante',
  'DATE_INVALID': 'Fecha inválida',
  'IS_DATE': 'No es fecha válida',
  'DATE_BEFORE': 'Fecha debería ser antes de',
  'DATE_AFTER': 'Fecha debería ser después de',
  'IS_NUMBER': 'No es número válido',
  'IS_EMAIL': 'No es email válido',
  'IS_RFC': 'No es RFC válido',
  'IS_PHONE': 'No es teléfono válido',
  'REGEX': 'Cumple patrón (regex)',
  'MUTUALLY_EXCLUSIVE': 'Ambos existen (excluyentes)',
  'ONE_OF_REQUIRED': 'Ninguno de la lista tiene valor',
  'ALL_REQUIRED': 'No todos tienen valor',
  'CONTAINS': 'Contiene texto',
  'NOT_CONTAINS': 'No contiene texto',
  'LENGTH_LESS_THAN': 'Longitud menor que',
  'LENGTH_GREATER_THAN': 'Longitud mayor que'
};

export const OPERATOR_GROUPS: { name: string; operators: RuleOperator[] }[] = [
  {
    name: 'Existencia',
    operators: ['IS_EMPTY', 'IS_NOT_EMPTY', 'NOT_EMPTY', 'REQUIRES', 'IF_THEN']
  },
  {
    name: 'Comparación',
    operators: ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL']
  },
  {
    name: 'Fechas',
    operators: ['DATE_MISSING', 'DATE_INVALID', 'IS_DATE', 'DATE_BEFORE', 'DATE_AFTER']
  },
  {
    name: 'Formatos',
    operators: ['IS_NUMBER', 'IS_EMAIL', 'IS_RFC', 'IS_PHONE', 'REGEX']
  },
  {
    name: 'Strings',
    operators: ['CONTAINS', 'NOT_CONTAINS', 'LENGTH_LESS_THAN', 'LENGTH_GREATER_THAN']
  },
  {
    name: 'Lógica Múltiple',
    operators: ['MUTUALLY_EXCLUSIVE', 'ONE_OF_REQUIRED', 'ALL_REQUIRED']
  }
];

export function operatorNeedsValue(op: RuleOperator): boolean {
  return ['EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL', 'REGEX', 'CONTAINS', 'NOT_CONTAINS', 'LENGTH_LESS_THAN', 'LENGTH_GREATER_THAN'].includes(op);
}

export function operatorNeedsCompareField(op: RuleOperator): boolean {
  return ['REQUIRES', 'IF_THEN', 'DATE_BEFORE', 'DATE_AFTER', 'MUTUALLY_EXCLUSIVE'].includes(op);
}

export function operatorNeedsAdditionalFields(op: RuleOperator): boolean {
  return ['ONE_OF_REQUIRED', 'ALL_REQUIRED'].includes(op);
}
