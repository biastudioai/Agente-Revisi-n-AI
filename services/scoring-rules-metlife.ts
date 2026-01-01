import { ScoringRule } from "../types";

export const REGLAS_METLIFE: ScoringRule[] = [
  {
    id: 'metlife_rfc',
    name: 'RFC Médico Obligatorio',
    level: 'CRÍTICO',
    points: 20,
    description: 'MetLife requiere el RFC para validación de honorarios.',
    providerTarget: 'METLIFE',
    validator: (data) => !data.medico_tratante?.rfc?.trim(),
    affectedFields: ['medico_tratante.rfc']
  },
  {
    id: 'metlife_secciones',
    name: 'Secciones Incompletas',
    level: 'MODERADO',
    points: 10,
    description: 'Faltan datos en secciones clave (Antecedentes o Padecimiento).',
    providerTarget: 'METLIFE',
    validator: (data) => !data.antecedentes?.historia_clinica_breve?.trim() || !data.padecimiento_actual?.descripcion?.trim(),
    affectedFields: ['antecedentes.historia_clinica_breve', 'padecimiento_actual.descripcion']
  },
  {
    id: 'metlife_codigo_cie',
    name: 'Código CIE-10 Formato Inválido',
    level: 'IMPORTANTE',
    points: 12,
    description: 'MetLife requiere código CIE-10 en formato válido (ej: A00.0).',
    providerTarget: 'METLIFE',
    validator: (data) => {
      const codigo = data.diagnostico?.codigo_cie;
      if (!codigo) return true;
      return !/^[A-Z]\d{2}(\.\d{1,2})?$/.test(codigo);
    },
    affectedFields: ['diagnostico.codigo_cie']
  }
];
