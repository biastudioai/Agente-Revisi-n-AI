import { ScoringRule } from "../types";

export const REGLAS_GENERALES: ScoringRule[] = [
  // ========================================
  // BLOQUE 1: IDENTIFICACIÓN DEL PACIENTE
  // ========================================
  {
    id: 'gen_paciente_apellido',
    name: 'Apellido paterno del paciente obligatorio',
    level: 'CRÍTICO',
    points: 25,
    description: 'El primer apellido del asegurado es obligatorio.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      {
        id: 'cond_paciente_apellido_1',
        field: 'identificacion.primer_apellido',
        operator: 'IS_EMPTY'
      }
    ],
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
    conditions: [
      {
        id: 'cond_paciente_nombre_1',
        field: 'identificacion.nombres',
        operator: 'IS_EMPTY'
      }
    ],
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
    conditions: [
      {
        id: 'cond_paciente_sexo_1',
        field: 'identificacion.sexo',
        operator: 'IS_EMPTY'
      }
    ],
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
    conditions: [
      {
        id: 'cond_paciente_edad_1',
        field: 'identificacion.edad',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'OR',
    affectedFields: ['identificacion.edad']
  },

  // ========================================
  // BLOQUE 3: DIAGNÓSTICO
  // ========================================
  {
    id: 'diag_falta',
    name: 'Diagnóstico faltante',
    level: 'CRÍTICO',
    points: 25,
    description: 'El diagnóstico definitivo es la base de la reclamación.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      {
        id: 'cond_diag_falta_1',
        field: 'diagnostico.diagnostico_definitivo',
        operator: 'IS_EMPTY'
      }
    ],
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
    conditions: [
      {
        id: 'cond_cie_incoherencia_1',
        field: 'diagnostico.cie_coherente_con_texto',
        operator: 'EQUALS',
        value: 'false'
      }
    ],
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
    conditions: [
      {
        id: 'cond_fecha_diag_futura_1',
        field: 'diagnostico.fecha_diagnostico',
        operator: 'DATE_AFTER',
        value: 'TODAY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['diagnostico.fecha_diagnostico']
  },

  // ========================================
  // BLOQUE 4: SIGNOS VITALES
  // ========================================
  {
    id: 'gen_pulso_rango',
    name: 'Frecuencia de pulso fuera de rango',
    level: 'MODERADO',
    points: 5,
    description: 'Frecuencia de pulso fuera de rango fisiológico probable (30-220).',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      {
        id: 'cond_pulso_bajo',
        field: 'signos_vitales.pulso',
        operator: 'LESS_THAN',
        value: 30
      },
      {
        id: 'cond_pulso_alto',
        field: 'signos_vitales.pulso',
        operator: 'GREATER_THAN',
        value: 220
      }
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
      {
        id: 'cond_resp_bajo',
        field: 'signos_vitales.respiracion',
        operator: 'LESS_THAN',
        value: 8
      },
      {
        id: 'cond_resp_alto',
        field: 'signos_vitales.respiracion',
        operator: 'GREATER_THAN',
        value: 60
      }
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
      {
        id: 'cond_temp_bajo',
        field: 'signos_vitales.temperatura',
        operator: 'LESS_THAN',
        value: 34
      },
      {
        id: 'cond_temp_alto',
        field: 'signos_vitales.temperatura',
        operator: 'GREATER_THAN',
        value: 42
      }
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
      {
        id: 'cond_presion_formato_1',
        field: 'signos_vitales.presion_arterial',
        operator: 'NOT_EMPTY'
      },
      {
        id: 'cond_presion_formato_2',
        field: 'signos_vitales.presion_arterial',
        operator: 'REGEX',
        value: '^\\d{2,3}/\\d{2,3}$'
      }
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
      {
        id: 'cond_peso_invalido',
        field: 'signos_vitales.peso',
        operator: 'LESS_THAN_OR_EQUAL',
        value: 0
      },
      {
        id: 'cond_talla_invalido',
        field: 'signos_vitales.altura',
        operator: 'LESS_THAN_OR_EQUAL',
        value: 0
      }
    ],
    logicOperator: 'OR',
    affectedFields: ['signos_vitales.peso', 'signos_vitales.altura']
  },

  // ========================================
  // BLOQUE 6: DATOS DEL MÉDICO TRATANTE
  // ========================================
  {
    id: 'gen_medico_apellido',
    name: 'Apellido del médico obligatorio',
    level: 'CRÍTICO',
    points: 20,
    description: 'El primer apellido del médico tratante es obligatorio.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      {
        id: 'cond_medico_apellido_1',
        field: 'medico_tratante.primer_apellido',
        operator: 'IS_EMPTY'
      }
    ],
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
    conditions: [
      {
        id: 'cond_medico_nombre_1',
        field: 'medico_tratante.nombres',
        operator: 'IS_EMPTY'
      }
    ],
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
      {
        id: 'cond_tel_consultorio',
        field: 'medico_tratante.telefono_consultorio',
        operator: 'IS_EMPTY'
      },
      {
        id: 'cond_tel_celular',
        field: 'medico_tratante.celular',
        operator: 'IS_EMPTY'
      }
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
      {
        id: 'cond_email_no_vacio',
        field: 'medico_tratante.correo_electronico',
        operator: 'NOT_EMPTY'
      },
      {
        id: 'cond_email_formato',
        field: 'medico_tratante.correo_electronico',
        operator: 'IS_EMAIL'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.correo_electronico']
  },

  // ========================================
  // BLOQUE 9: CRONOLOGÍA ESTRICTA
  // ========================================
  {
    id: 'gen_crono_inicio_antes_diagnostico',
    name: 'Inicio síntomas posterior al diagnóstico',
    level: 'CRÍTICO',
    points: 20,
    description: 'Inconsistencia: El inicio de síntomas no puede ser posterior al diagnóstico.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      {
        id: 'cond_crono_inicio_diag',
        field: 'padecimiento_actual.fecha_inicio',
        operator: 'DATE_AFTER',
        compareField: 'diagnostico.fecha_diagnostico'
      }
    ],
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
    conditions: [
      {
        id: 'cond_crono_trat_diag',
        field: 'diagnostico.fecha_diagnostico',
        operator: 'DATE_AFTER',
        compareField: 'tratamiento.fecha_inicio'
      }
    ],
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
    conditions: [
      {
        id: 'cond_crono_hosp_diag',
        field: 'hospital.fecha_ingreso',
        operator: 'DATE_BEFORE',
        compareField: 'diagnostico.fecha_diagnostico'
      }
    ],
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
    conditions: [
      {
        id: 'cond_crono_firma_diag',
        field: 'firma.fecha',
        operator: 'DATE_BEFORE',
        compareField: 'diagnostico.fecha_diagnostico'
      }
    ],
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
    conditions: [
      {
        id: 'cond_firma_futura',
        field: 'firma.fecha',
        operator: 'DATE_AFTER',
        value: 'TODAY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['firma.fecha']
  },

  // ========================================
  // BLOQUE 10: INTEGRIDAD DOCUMENTAL
  // ========================================
  {
    id: 'firma_faltante',
    name: 'Firma del médico faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'El informe debe contener la firma autógrafa del médico tratante.',
    providerTarget: 'ALL',
    isCustom: false,
    conditions: [
      {
        id: 'cond_firma_faltante_1',
        field: 'firma.firma_autografa_detectada',
        operator: 'IS_EMPTY'
      },
      {
        id: 'cond_firma_faltante_2',
        field: 'firma.firma_autografa_detectada',
        operator: 'EQUALS',
        value: 'false'
      }
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
      {
        id: 'cond_lugar_firma',
        field: 'firma.lugar',
        operator: 'IS_EMPTY'
      },
      {
        id: 'cond_fecha_firma',
        field: 'firma.fecha',
        operator: 'IS_EMPTY'
      }
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
    conditions: [
      {
        id: 'cond_tachaduras',
        field: 'metadata.tachaduras_detectadas',
        operator: 'EQUALS',
        value: 'true'
      }
    ],
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
    conditions: [
      {
        id: 'cond_firma_coincide',
        field: 'metadata.firma_coincide_con_tratante',
        operator: 'EQUALS',
        value: 'false'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['firma.nombre_firma', 'medico_tratante.nombres']
  }
];
