
import { ExtractedData, ScoringRule, ScoringResult } from "../types";

// Helper para parsear números que pueden venir con comas o texto extra
// Ej: "37,5 °C" -> 37.5
const parseNumber = (value: string | number | undefined | null): number => {
  if (value === undefined || value === null) return NaN;
  if (typeof value === 'number') return value;
  
  // Reemplazar coma decimal por punto y eliminar todo excepto números y puntos
  const cleanStr = value.toString().replace(',', '.').replace(/[^\d.-]/g, '');
  return parseFloat(cleanStr);
};

export const DEFAULT_SCORING_RULES: ScoringRule[] = [
  // ========== NIVEL CRÍTICO (-20 puntos c/u) ==========
  {
    id: 'diag_falta',
    name: 'Diagnóstico faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'El diagnóstico definitivo es obligatorio',
    validator: (data) => !data.diagnostico?.diagnostico_definitivo || 
                        data.diagnostico.diagnostico_definitivo.trim() === '',
    affectedFields: ['diagnostico.diagnostico_definitivo']
  },
  
  {
    id: 'medico_falta',
    name: 'Médico no identificado',
    level: 'CRÍTICO',
    points: 20,
    description: 'Falta nombre o apellidos del médico tratante',
    validator: (data) => {
      const med = data.medico_tratante;
      return !med || (!med.nombres?.trim() && (!med.primer_apellido?.trim() && !med.segundo_apellido?.trim()));
    },
    affectedFields: ['medico_tratante.nombres', 'medico_tratante.primer_apellido']
  },

  {
    id: 'cedula_falta',
    name: 'Cédula profesional faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'La cédula profesional es obligatoria',
    validator: (data) => !data.medico_tratante?.cedula_profesional || 
                        data.medico_tratante.cedula_profesional.trim() === '',
    affectedFields: ['medico_tratante.cedula_profesional']
  },

  {
    id: 'fecha_inicio_falta',
    name: 'Fecha inicio de padecimiento faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'La fecha de inicio del padecimiento es obligatoria',
    validator: (data) => !data.padecimiento_actual?.fecha_inicio || 
                        data.padecimiento_actual.fecha_inicio.trim() === '',
    affectedFields: ['padecimiento_actual.fecha_inicio']
  },

  {
    id: 'sexo_dx_incoherencia',
    name: 'Incoherencia sexo/diagnóstico',
    level: 'CRÍTICO',
    points: 20,
    description: 'El diagnóstico es incompatible con el sexo del paciente',
    validator: (data) => {
      const sexo = data.identificacion?.sexo?.toLowerCase() || '';
      const dx = data.diagnostico?.diagnostico_definitivo?.toLowerCase() || '';
      
      const ginecoDx = ['embarazo', 'cesárea', 'parto', 'ginecológico', 'endometrio', 'cervix'];
      const malechDx = ['próstata', 'testicular', 'testículo'];
      
      // Detectar Masculino (M, Masc, Hombre) vs Femenino (F, Fem, Mujer)
      const isMale = ['m', 'masculino', 'hombre'].some(v => sexo.includes(v));
      const isFemale = ['f', 'femenino', 'mujer'].some(v => sexo.includes(v));

      if (isMale && ginecoDx.some(g => dx.includes(g))) return true;
      if (isFemale && malechDx.some(m => dx.includes(m))) return true;
      
      return false;
    },
    affectedFields: ['identificacion.sexo', 'diagnostico.diagnostico_definitivo']
  },

  {
    id: 'poliza_faltante',
    name: 'Número de póliza faltante',
    level: 'CRÍTICO',
    points: 20,
    description: 'El número de póliza es obligatorio para el trámite',
    validator: (data) => !data.tramite?.numero_poliza || data.tramite.numero_poliza.trim() === '',
    affectedFields: ['tramite.numero_poliza']
  },

  // ========== NIVEL IMPORTANTE (-10 puntos c/u) ==========
  {
    id: 'temp_invalida',
    name: 'Temperatura fuera de rango',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Temperatura debe estar entre 35°C y 37.5°C',
    validator: (data) => {
      const tempNum = parseNumber(data.signos_vitales?.temperatura);
      if (isNaN(tempNum)) return false; // Si no es numero, no evaluamos rango (podría ser vacío)
      return tempNum < 35 || tempNum > 37.5;
    },
    affectedFields: ['signos_vitales.temperatura']
  },

  {
    id: 'ta_sistolica_invalida',
    name: 'Presión arterial sistólica anómala',
    level: 'IMPORTANTE',
    points: 10,
    description: 'TA Sistólica normal: 90-140 mmHg',
    validator: (data) => {
        let val = data.signos_vitales?.presion_arterial_sistolica;
        
        // Extracción desde string combinado "120/80"
        if (!val && data.signos_vitales?.presion_arterial) {
            const parts = data.signos_vitales.presion_arterial.toString().split('/');
            if (parts.length >= 1) val = parts[0];
        }

        const num = parseNumber(val);
        return !isNaN(num) && (num < 90 || num > 140);
    },
    affectedFields: ['signos_vitales.presion_arterial']
  },

  {
    id: 'ta_diastolica_invalida',
    name: 'Presión arterial diastólica anómala',
    level: 'IMPORTANTE',
    points: 10,
    description: 'TA Diastólica normal: 60-90 mmHg',
    validator: (data) => {
        let val = data.signos_vitales?.presion_arterial_diastolica;
        
        if (!val && data.signos_vitales?.presion_arterial) {
            const parts = data.signos_vitales.presion_arterial.toString().split('/');
            if (parts.length >= 2) val = parts[1];
        }

        const num = parseNumber(val);
        return !isNaN(num) && (num < 60 || num > 90);
    },
    affectedFields: ['signos_vitales.presion_arterial']
  },

  {
    id: 'fc_invalida',
    name: 'Frecuencia cardíaca anómala',
    level: 'IMPORTANTE',
    points: 10,
    description: 'FC normal: 60-100 lpm',
    validator: (data) => {
      const fcNum = parseNumber(data.signos_vitales?.pulso);
      return !isNaN(fcNum) && (fcNum < 60 || fcNum > 100);
    },
    affectedFields: ['signos_vitales.pulso']
  },

  {
    id: 'equipo_qx_falta',
    name: 'Equipo quirúrgico incompleto',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Si se programa cirugía, debe especificarse el equipo médico',
    validator: (data) => {
      // Si el trámite es programacion de cirugia
      const esCirugia = data.tramite?.programacion_cirugia === true;
      const tieneEquipo = data.intervencion_qx?.equipo_especifico && data.intervencion_qx.equipo_especifico.trim() !== '';
      
      return esCirugia && !tieneEquipo;
    },
    affectedFields: ['intervencion_qx.equipo_especifico']
  },

  {
    id: 'tratamiento_vago',
    name: 'Tratamiento sin detalles',
    level: 'IMPORTANTE',
    points: 10,
    description: 'El tratamiento debe incluir detalles (medicamento + dosis + frecuencia)',
    validator: (data) => {
      const tratamiento = data.tratamiento?.descripcion;
      if (!tratamiento) return false;
      
      const esVago = ['medicamentos', 'tratamiento', 'se prescribió', 'antibiotico', 'analgesico'].some(
        word => tratamiento.toLowerCase().trim() === word.toLowerCase()
      );
      
      return esVago;
    },
    affectedFields: ['tratamiento.descripcion']
  },

  {
    id: 'antecedentes_vacios',
    name: 'Antecedentes completamente vacíos',
    level: 'IMPORTANTE',
    points: 10,
    description: 'Es sospechoso que TODOS los antecedentes estén vacíos',
    validator: (data) => {
      const ant = data.antecedentes;
      if (!ant) return true;
      
      const allEmpty = [
        ant.personales_patologicos,
        ant.personales_no_patologicos,
        ant.gineco_obstetricos,
        ant.perinatales
      ].every(a => !a || a.trim() === '' || a.toLowerCase().includes('no referidos') || a.toLowerCase().includes('desconocidos'));
      
      return allEmpty;
    },
    affectedFields: ['antecedentes.personales_patologicos']
  },

  // ========== NIVEL MODERADO (-5 puntos c/u) ==========
  {
    id: 'contacto_medico_falta',
    name: 'Contacto del médico incompleto',
    level: 'MODERADO',
    points: 5,
    description: 'Falta teléfono o correo electrónico del médico',
    validator: (data) => {
      const med = data.medico_tratante;
      const hasPhone = med?.telefono_consultorio?.trim() || med?.celular?.trim();
      const hasEmail = med?.correo_electronico?.trim();
      
      return !hasPhone || !hasEmail;
    },
    affectedFields: ['medico_tratante.telefono_consultorio', 'medico_tratante.correo_electronico']
  },

  {
    id: 'peso_talla_falta',
    name: 'Peso y/o Talla faltante',
    level: 'MODERADO',
    points: 5,
    description: 'Datos antropométricos faltantes',
    validator: (data) => {
      const sv = data.signos_vitales;
      return !sv?.peso?.toString().trim() || !sv?.altura?.toString().trim();
    },
    affectedFields: ['signos_vitales.peso', 'signos_vitales.altura']
  },

  {
    id: 'hospital_estancia_incompleta',
    name: 'Datos hospitalarios incompletos',
    level: 'MODERADO',
    points: 5,
    description: 'Si hay reporte hospitalario, falta fecha de ingreso o nombre del hospital',
    validator: (data) => {
      if (!data.tramite?.reporte_hospitalario) return false;
      
      const hasHospital = data.hospital?.nombre_hospital?.trim();
      const hasDate = data.hospital?.fecha_ingreso?.trim();
      
      return !hasHospital || !hasDate;
    },
    affectedFields: ['hospital.fecha_ingreso', 'hospital.nombre_hospital']
  },

  {
    id: 'firma_ausente',
    name: 'Firma o fecha de firma ausente',
    level: 'MODERADO',
    points: 5,
    description: 'Falta nombre o fecha en la sección de firma',
    validator: (data) => {
      // Nota: El OCR a veces falla en firmas manuscritas, por eso es Moderado y no Crítico
      return !data.firma?.nombre_firma?.trim() || !data.firma?.lugar_fecha?.trim();
    },
    affectedFields: ['firma.nombre_firma']
  },

  // ========== NIVEL DISCRETO / NOTA (0 puntos - Solo informativo) ==========
  {
    id: 'medico_no_convenio',
    name: 'Médico sin convenio',
    level: 'DISCRETO',
    points: 0,
    description: 'El médico no tiene marcado el convenio GNP. Se procesará como reembolso fuera de red.',
    validator: (data) => data.medico_tratante?.convenio_gnp === false, // Check if explicitly false
    affectedFields: ['medico_tratante.convenio_gnp']
  },

  {
    id: 'cirugia_programada',
    name: 'Trámite de Cirugía',
    level: 'DISCRETO',
    points: 0,
    description: 'Trámite de Programación de Cirugía detectado. Requiere validación de presupuesto.',
    validator: (data) => data.tramite?.programacion_cirugia === true,
    affectedFields: ['tramite.programacion_cirugia']
  }
];

export function calculateScore(
  data: ExtractedData,
  previousScore?: number,
  rules: ScoringRule[] = DEFAULT_SCORING_RULES
): ScoringResult {
  const baseScore = 100;
  let totalDeducted = 0;
  const deductions: ScoringResult['deductions'] = [];
  const flags: ScoringResult['flags'] = [];

  for (const rule of rules) {
    let fails = false;
    try {
        fails = rule.validator(data);
    } catch (e) {
        console.warn(`Error validating rule ${rule.id}`, e);
    }
    
    deductions.push({
      rule,
      failed: fails,
      reason: fails ? `${rule.description}` : undefined
    });

    if (fails) {
      totalDeducted += rule.points;
      flags.push({
        type: rule.level === 'CRÍTICO' ? 'ERROR_CRÍTICO' : 
              rule.level === 'IMPORTANTE' ? 'ALERTA' :
              rule.level === 'MODERADO' ? 'OBSERVACIÓN' : 'NOTA',
        rule: rule.name,
        message: rule.description,
        fieldPath: rule.affectedFields[0]
      });
    }
  }

  const finalScore = Math.max(0, baseScore - totalDeducted);
  const delta = previousScore !== undefined ? finalScore - previousScore : 0;

  return {
    previousScore: previousScore || 0,
    baseScore,
    deductions,
    totalDeducted,
    finalScore,
    delta,
    flags
  };
}

export function reEvaluateScore(
  newData: ExtractedData,
  previousScore: number,
  rules: ScoringRule[] = DEFAULT_SCORING_RULES
): ScoringResult {
  return calculateScore(newData, previousScore, rules);
}
