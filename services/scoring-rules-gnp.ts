import { ScoringRule } from "../types";

export const REGLAS_GNP: ScoringRule[] = [
  // ========================================
  // BLOQUE 1: IDENTIFICACIÓN DEL ASEGURADO (GNP)
  // ========================================
  {
    id: 'gnp_tramite_seleccionado',
    name: 'Trámite no seleccionado',
    level: 'CRÍTICO',
    points: 20,
    description: 'Debe seleccionar al menos un trámite solicitado.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_tramite_1',
        field: 'tramite.reembolso',
        operator: 'EQUALS',
        value: 'false'
      },
      {
        id: 'cond_tramite_2',
        field: 'tramite.programacion_cirugia',
        operator: 'EQUALS',
        value: 'false'
      },
      {
        id: 'cond_tramite_3',
        field: 'tramite.programacion_medicamentos',
        operator: 'EQUALS',
        value: 'false'
      },
      {
        id: 'cond_tramite_4',
        field: 'tramite.programacion_servicios',
        operator: 'EQUALS',
        value: 'false'
      },
      {
        id: 'cond_tramite_5',
        field: 'tramite.indemnizacion',
        operator: 'EQUALS',
        value: 'false'
      },
      {
        id: 'cond_tramite_6',
        field: 'tramite.reporte_hospitalario',
        operator: 'EQUALS',
        value: 'false'
      }
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
      {
        id: 'cond_poliza_no_vacia',
        field: 'tramite.numero_poliza',
        operator: 'NOT_EMPTY'
      },
      {
        id: 'cond_poliza_numerica',
        field: 'tramite.numero_poliza',
        operator: 'IS_NUMBER'
      }
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
    conditions: [
      {
        id: 'cond_apellido_materno',
        field: 'identificacion.segundo_apellido',
        operator: 'IS_EMPTY'
      }
    ],
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
    conditions: [
      {
        id: 'cond_causa_vacia',
        field: 'identificacion.causa_atencion',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['identificacion.causa_atencion']
  },

  // ========================================
  // BLOQUE 2: HISTORIA CLÍNICA (GNP)
  // ========================================
  {
    id: 'gnp_antecedentes_patologicos',
    name: 'Antecedentes patológicos faltantes',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Indique antecedentes patológicos o "Ninguno".',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_ant_pat',
        field: 'antecedentes.personales_patologicos',
        operator: 'IS_EMPTY'
      }
    ],
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
    conditions: [
      {
        id: 'cond_ant_no_pat',
        field: 'antecedentes.personales_no_patologicos',
        operator: 'IS_EMPTY'
      }
    ],
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
      {
        id: 'cond_sexo_f',
        field: 'identificacion.sexo',
        operator: 'CONTAINS',
        value: 'F'
      },
      {
        id: 'cond_gineco_vacio',
        field: 'antecedentes.gineco_obstetricos',
        operator: 'IS_EMPTY'
      }
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
      {
        id: 'cond_edad_menor',
        field: 'identificacion.edad',
        operator: 'LESS_THAN',
        value: 18
      },
      {
        id: 'cond_perinatales_vacio',
        field: 'antecedentes.perinatales',
        operator: 'IS_EMPTY'
      }
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
    conditions: [
      {
        id: 'cond_padecimiento_corto',
        field: 'padecimiento_actual.descripcion',
        operator: 'LENGTH_LESS_THAN',
        value: 15
      }
    ],
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
    conditions: [
      {
        id: 'cond_fecha_inicio_vacia',
        field: 'padecimiento_actual.fecha_inicio',
        operator: 'IS_EMPTY'
      }
    ],
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
      {
        id: 'cond_trat_no_vacio',
        field: 'tratamiento.descripcion',
        operator: 'NOT_EMPTY'
      },
      {
        id: 'cond_fecha_trat_vacia',
        field: 'tratamiento.fecha_inicio',
        operator: 'IS_EMPTY'
      }
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
      {
        id: 'cond_diag_no_vacio',
        field: 'diagnostico.diagnostico_definitivo',
        operator: 'NOT_EMPTY'
      },
      {
        id: 'cond_trat_vacio',
        field: 'tratamiento.descripcion',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['tratamiento.descripcion', 'diagnostico.diagnostico_definitivo']
  },

  // ========================================
  // BLOQUE 3: DIAGNÓSTICO (GNP)
  // ========================================
  {
    id: 'gnp_tipo_padecimiento_congenito_adquirido',
    name: 'Congénito/Adquirido no seleccionado',
    level: 'CRÍTICO',
    points: 15,
    description: 'Elija exactamente entre Congénito o Adquirido.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_congenito_adquirido',
        field: 'padecimiento_actual.tipo_padecimiento_congenito_adquirido',
        operator: 'IS_EMPTY'
      }
    ],
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
    conditions: [
      {
        id: 'cond_agudo_cronico',
        field: 'padecimiento_actual.tipo_padecimiento_agudo_cronico',
        operator: 'IS_EMPTY'
      }
    ],
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
    affectedFields: ['padecimiento_actual.tipo_padecimiento'],
    validator: (data) => {
      const tipoPad = data.padecimiento_actual?.tipo_padecimiento;
      if (!tipoPad || !Array.isArray(tipoPad)) return false;
      const valores = tipoPad.map(v => v.toLowerCase());
      const tieneCongenito = valores.includes('congénito') || valores.includes('congenito');
      const tieneAdquirido = valores.includes('adquirido');
      return tieneCongenito && tieneAdquirido;
    }
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
    affectedFields: ['padecimiento_actual.tipo_padecimiento'],
    validator: (data) => {
      const tipoPad = data.padecimiento_actual?.tipo_padecimiento;
      if (!tipoPad || !Array.isArray(tipoPad)) return false;
      const valores = tipoPad.map(v => v.toLowerCase());
      const tieneAgudo = valores.includes('agudo');
      const tieneCronico = valores.includes('crónico') || valores.includes('cronico');
      return tieneAgudo && tieneCronico;
    }
  },
  {
    id: 'gnp_relacionado_otro_padecimiento',
    name: 'Relación con otro padecimiento no indicada',
    level: 'CRÍTICO',
    points: 15,
    description: 'Marque "Sí" o "No" en relación con otro padecimiento.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_relacionado',
        field: 'diagnostico.relacionado_con_otro',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['diagnostico.relacionado_con_otro']
  },
  {
    id: 'gnp_diagnostico_grave_sin_tratamiento',
    name: 'Diagnóstico grave sin tratamiento',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Diagnóstico grave sin tratamiento documentado. Verificar coherencia.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_diag_grave',
        field: 'metadata.diagnostico_severidad',
        operator: 'EQUALS',
        value: 'grave'
      },
      {
        id: 'cond_sin_tratamiento',
        field: 'tratamiento.descripcion',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['metadata.diagnostico_severidad', 'tratamiento.descripcion']
  },

  // ========================================
  // BLOQUE 4: SIGNOS VITALES (GNP)
  // ========================================
  {
    id: 'gnp_signos',
    name: 'Signos Vitales Incompletos',
    level: 'IMPORTANTE',
    points: 10,
    description: 'GNP requiere signos vitales (Presión/Temperatura) para el dictamen.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_gnp_signos_1',
        field: 'signos_vitales.presion_arterial',
        operator: 'IS_EMPTY'
      },
      {
        id: 'cond_gnp_signos_2',
        field: 'signos_vitales.temperatura',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'OR',
    affectedFields: ['signos_vitales.presion_arterial', 'signos_vitales.temperatura']
  },

  // ========================================
  // BLOQUE 5: HOSPITALIZACIÓN Y EXPLORACIÓN (GNP)
  // ========================================
  {
    id: 'gnp_exploracion_fisica',
    name: 'Exploración física faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'Los hallazgos de exploración física son obligatorios.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_exploracion',
        field: 'exploracion_fisica.resultados',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['exploracion_fisica.resultados']
  },
  {
    id: 'gnp_info_adicional_nota',
    name: 'Información adicional vacía',
    level: 'DISCRETO',
    points: 2,
    description: 'Se recomienda llenar información adicional si el caso lo amerita.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_info_adicional',
        field: 'info_adicional.descripcion',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['info_adicional.descripcion']
  },
  {
    id: 'gnp_estudios_realizados',
    name: 'Estudios realizados faltantes',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Mencione estudios realizados o escriba "Ninguno".',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_estudios',
        field: 'estudios.estudios_realizados',
        operator: 'IS_EMPTY'
      }
    ],
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
    conditions: [
      {
        id: 'cond_tipo_estancia',
        field: 'hospital.tipo_estancia',
        operator: 'IS_EMPTY'
      }
    ],
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
      {
        id: 'cond_estancia_no_corta',
        field: 'hospital.tipo_estancia',
        operator: 'NOT_EQUALS',
        value: 'Corta estancia / ambulatoria'
      },
      {
        id: 'cond_hospital_vacio',
        field: 'hospital.nombre_hospital',
        operator: 'IS_EMPTY'
      }
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
      {
        id: 'cond_estancia_no_corta_2',
        field: 'hospital.tipo_estancia',
        operator: 'NOT_EQUALS',
        value: 'Corta estancia / ambulatoria'
      },
      {
        id: 'cond_ciudad_vacia',
        field: 'hospital.ciudad',
        operator: 'IS_EMPTY'
      }
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
      {
        id: 'cond_estancia_no_corta_3',
        field: 'hospital.tipo_estancia',
        operator: 'NOT_EQUALS',
        value: 'Corta estancia / ambulatoria'
      },
      {
        id: 'cond_gnp_fechas_1',
        field: 'hospital.fecha_ingreso',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['hospital.fecha_ingreso', 'hospital.tipo_estancia']
  },

  // ========================================
  // BLOQUE 6: DATOS DEL MÉDICO TRATANTE (GNP)
  // ========================================
  {
    id: 'gnp_medico_apellido_materno_nota',
    name: 'Segundo apellido del médico faltante',
    level: 'DISCRETO',
    points: 2,
    description: 'Falta el segundo apellido del médico (Recomendado).',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_medico_apellido_materno',
        field: 'medico_tratante.segundo_apellido',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.segundo_apellido']
  },
  {
    id: 'gnp_cedula',
    name: 'Cédula Profesional Inválida',
    level: 'CRÍTICO',
    points: 15,
    description: 'GNP requiere cédula profesional válida (numérica).',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_gnp_cedula_1',
        field: 'medico_tratante.cedula_profesional',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'OR',
    affectedFields: ['medico_tratante.cedula_profesional']
  },
  {
    id: 'gnp_convenio',
    name: 'Convenio GNP no indicado',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Indique obligatoriamente si el médico tiene convenio con GNP.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_convenio',
        field: 'medico_tratante.convenio_gnp',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.convenio_gnp']
  },
  {
    id: 'gnp_tabulador',
    name: 'Ajuste a tabulador no indicado',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Indique si el médico se ajusta al tabulador de la póliza.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_tabulador',
        field: 'medico_tratante.se_ajusta_tabulador',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.se_ajusta_tabulador']
  },
  {
    id: 'gnp_presupuesto_cirujano',
    name: 'Presupuesto de cirujano faltante',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Presupuesto de honorarios requerido si participa como Cirujano.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_participacion_cirujano',
        field: 'medico_tratante.tipo_participacion',
        operator: 'CONTAINS',
        value: 'Cirujano'
      },
      {
        id: 'cond_ppto_vacio',
        field: 'medico_tratante.ppto_honorarios',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.ppto_honorarios', 'medico_tratante.tipo_participacion']
  },
  {
    id: 'gnp_cedula_especialidad',
    name: 'Cédula de especialidad faltante',
    level: 'CRÍTICO',
    points: 15,
    description: 'Cédula de especialidad requerida si se declara una especialidad.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_especialidad_no_vacia',
        field: 'medico_tratante.especialidad',
        operator: 'NOT_EMPTY'
      },
      {
        id: 'cond_cedula_esp_vacia',
        field: 'medico_tratante.cedula_especialidad',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.cedula_especialidad', 'medico_tratante.especialidad']
  },
  {
    id: 'gnp_participacion_medico',
    name: 'Participación del médico no indicada',
    level: 'CRÍTICO',
    points: 15,
    description: 'Seleccione al menos un rol de participación para el médico.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_participacion',
        field: 'medico_tratante.tipo_participacion',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.tipo_participacion']
  },

  // ========================================
  // BLOQUE 7: MÉDICOS INTERCONSULTANTES (GNP)
  // ========================================
  {
    id: 'gnp_interconsulta_indicada',
    name: 'Interconsulta no indicada',
    level: 'CRÍTICO',
    points: 15,
    description: 'Indique "Sí" o "No" en el campo de interconsultas.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_interconsulta',
        field: 'medico_tratante.hubo_interconsulta',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.hubo_interconsulta']
  },
  {
    id: 'gnp_interconsulta_sin_medicos',
    name: 'Interconsulta declarada sin médicos',
    level: 'CRÍTICO',
    points: 20,
    description: 'Declaró interconsulta pero la tabla de médicos está vacía.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_interconsulta_si',
        field: 'medico_tratante.hubo_interconsulta',
        operator: 'EQUALS',
        value: 'true'
      },
      {
        id: 'cond_lista_vacia',
        field: 'otros_medicos',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.hubo_interconsulta', 'otros_medicos']
  },

  // ========================================
  // BLOQUE 8: DEPENDENCIAS Y COMPLICACIONES (GNP)
  // ========================================
  {
    id: 'gnp_padecimiento_relacionado_detalle',
    name: 'Padecimiento relacionado sin detalle',
    level: 'CRÍTICO',
    points: 15,
    description: 'Especifique detalladamente el padecimiento relacionado.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_relacionado_si',
        field: 'diagnostico.relacionado_con_otro',
        operator: 'EQUALS',
        value: 'true'
      },
      {
        id: 'cond_especificacion_vacia',
        field: 'diagnostico.especifique_cual',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['diagnostico.especifique_cual', 'diagnostico.relacionado_con_otro']
  },
  {
    id: 'gnp_complicaciones_indicadas',
    name: 'Complicaciones no indicadas',
    level: 'CRÍTICO',
    points: 15,
    description: 'Debe marcar obligatoriamente si hubo o no complicaciones.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_complicaciones',
        field: 'complicaciones.presento_complicaciones',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['complicaciones.presento_complicaciones']
  },
  {
    id: 'gnp_complicaciones_sin_detalle',
    name: 'Complicaciones sin descripción',
    level: 'CRÍTICO',
    points: 15,
    description: 'Si hay complicaciones, es obligatorio describirlas y poner la fecha.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_complicaciones_si',
        field: 'complicaciones.presento_complicaciones',
        operator: 'EQUALS',
        value: 'true'
      },
      {
        id: 'cond_desc_comp_vacia',
        field: 'complicaciones.descripcion',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['complicaciones.descripcion', 'complicaciones.fecha_inicio', 'complicaciones.presento_complicaciones']
  },
  {
    id: 'gnp_participacion_otra_sin_especificar',
    name: 'Participación "Otra" sin especificar',
    level: 'CRÍTICO',
    points: 15,
    description: 'Especifique detalladamente el rol del médico en "Otra".',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_participacion_otra',
        field: 'medico_tratante.tipo_participacion',
        operator: 'EQUALS',
        value: 'Otra'
      },
      {
        id: 'cond_otra_vacia',
        field: 'medico_tratante.tipo_participacion_otra',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['medico_tratante.tipo_participacion', 'medico_tratante.tipo_participacion_otra']
  },
  {
    id: 'gnp_cirugia_equipo',
    name: 'Cirugía sin equipo especificado',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Se menciona cirugía: describa el equipo o técnica utilizada.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_cirugia_mencionada',
        field: 'tratamiento.descripcion',
        operator: 'REGEX',
        value: '(quir|cirugía|intervención|cirugia)'
      },
      {
        id: 'cond_equipo_vacio',
        field: 'intervencion_qx.equipo_especifico',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'AND',
    affectedFields: ['intervencion_qx.equipo_especifico', 'tratamiento.descripcion']
  }
];
