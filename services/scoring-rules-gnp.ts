import { ScoringRule } from "../types";

export const REGLAS_GNP: ScoringRule[] = [
  {
    id: 'gnp_signos',
    name: 'Signos Vitales Incompletos',
    level: 'IMPORTANTE',
    points: 10,
    description: 'GNP requiere signos vitales (Presión/Temperatura) para el dictamen.',
    providerTarget: 'GNP',
    validator: (data) => !data.signos_vitales?.presion_arterial || !data.signos_vitales?.temperatura,
    affectedFields: ['signos_vitales.presion_arterial']
  },
  {
    id: 'gnp_cedula',
    name: 'Cédula Profesional Inválida',
    level: 'CRÍTICO',
    points: 15,
    description: 'GNP requiere cédula profesional válida de 7-8 dígitos.',
    providerTarget: 'GNP',
    validator: (data) => {
      const cedula = data.medico_tratante?.cedula_profesional;
      return !cedula || !/^\d{7,8}$/.test(cedula);
    },
    affectedFields: ['medico_tratante.cedula_profesional']
  },
  {
    id: 'gnp_fechas_hospital',
    name: 'Fechas de Hospitalización Incompletas',
    level: 'MODERADO',
    points: 8,
    description: 'GNP requiere fecha de ingreso y egreso para casos hospitalarios.',
    providerTarget: 'GNP',
    validator: (data) => {
      const tipoEstancia = data.hospital?.tipo_estancia?.toLowerCase();
      const esHospitalario = tipoEstancia?.includes('ingreso') || tipoEstancia?.includes('hospital');
      if (!esHospitalario) return false;
      return !data.hospital?.fecha_ingreso || !data.hospital?.fecha_egreso;
    },
    affectedFields: ['hospital.fecha_ingreso', 'hospital.fecha_egreso']
  }
];
