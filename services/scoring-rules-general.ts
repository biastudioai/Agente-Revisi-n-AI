import { ScoringRule } from "../types";

export const REGLAS_GENERALES: ScoringRule[] = [
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
  }
];
