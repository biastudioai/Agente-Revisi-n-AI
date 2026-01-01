import { ScoringRule } from "../types";

export const REGLAS_METLIFE: ScoringRule[] = [
  {
    id: 'metlife_rfc',
    name: 'RFC Médico Obligatorio',
    level: 'CRÍTICO',
    points: 20,
    description: 'MetLife requiere el RFC para validación de honorarios.',
    providerTarget: 'METLIFE',
    isCustom: false,
    conditions: [
      {
        id: 'cond_metlife_rfc_1',
        field: 'medico_tratante.rfc',
        operator: 'IS_EMPTY'
      }
    ],
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
      {
        id: 'cond_metlife_secciones_1',
        field: 'antecedentes.historia_clinica_breve',
        operator: 'IS_EMPTY'
      },
      {
        id: 'cond_metlife_secciones_2',
        field: 'padecimiento_actual.descripcion',
        operator: 'IS_EMPTY'
      }
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
      {
        id: 'cond_metlife_cie_1',
        field: 'diagnostico.codigo_cie',
        operator: 'IS_EMPTY'
      },
      {
        id: 'cond_metlife_cie_2',
        field: 'diagnostico.codigo_cie',
        operator: 'REGEX',
        value: '^[A-Z]\\d{2}(\\.\\d{1,2})?$'
      }
    ],
    logicOperator: 'OR',
    affectedFields: ['diagnostico.codigo_cie']
  }
];
