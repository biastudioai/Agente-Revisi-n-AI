import { ScoringRule } from "../types";

export const REGLAS_GENERALES: ScoringRule[] = [
  {
    id: 'diag_falta',
    name: 'Diagnóstico faltante',
    level: 'CRÍTICO',
    points: 25,
    description: 'El diagnóstico definitivo es la base de la reclamación.',
    providerTarget: 'ALL',
    validator: (data) => !data.diagnostico?.diagnostico_definitivo?.trim(),
    affectedFields: ['diagnostico.diagnostico_definitivo']
  },
  {
    id: 'cie_incoherencia',
    name: 'Discrepancia CIE-10',
    level: 'IMPORTANTE',
    points: 15,
    description: 'El código CIE-10 no corresponde al diagnóstico escrito.',
    providerTarget: 'ALL',
    validator: (data) => data.diagnostico?.cie_coherente_con_texto === false,
    affectedFields: ['diagnostico.codigo_cie', 'diagnostico.diagnostico_definitivo']
  },
  {
    id: 'firma_faltante',
    name: 'Firma del médico faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'El informe debe contener la firma autógrafa del médico tratante.',
    providerTarget: 'ALL',
    validator: (data) => !data.firma?.firma_autografa_detectada,
    affectedFields: ['firma.firma_autografa_detectada', 'firma.nombre_firma']
  }
];
