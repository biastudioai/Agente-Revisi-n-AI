import { ScoringRule } from "../types";

export const REGLAS_GNP: ScoringRule[] = [
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
  {
    id: 'gnp_cedula',
    name: 'Cédula Profesional Inválida',
    level: 'CRÍTICO',
    points: 15,
    description: 'GNP requiere cédula profesional válida de 7-8 dígitos.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_gnp_cedula_1',
        field: 'medico_tratante.cedula_profesional',
        operator: 'IS_EMPTY'
      },
      {
        id: 'cond_gnp_cedula_2',
        field: 'medico_tratante.cedula_profesional',
        operator: 'REGEX',
        value: '^\\d{7,8}$'
      }
    ],
    logicOperator: 'OR',
    affectedFields: ['medico_tratante.cedula_profesional']
  },
  {
    id: 'gnp_fechas_hospital',
    name: 'Fechas de Hospitalización Incompletas',
    level: 'MODERADO',
    points: 8,
    description: 'GNP requiere fecha de ingreso y egreso para casos hospitalarios.',
    providerTarget: 'GNP',
    isCustom: false,
    conditions: [
      {
        id: 'cond_gnp_fechas_1',
        field: 'hospital.fecha_ingreso',
        operator: 'IS_EMPTY'
      },
      {
        id: 'cond_gnp_fechas_2',
        field: 'hospital.fecha_egreso',
        operator: 'IS_EMPTY'
      }
    ],
    logicOperator: 'OR',
    affectedFields: ['hospital.fecha_ingreso', 'hospital.fecha_egreso', 'hospital.tipo_estancia']
  }
];
