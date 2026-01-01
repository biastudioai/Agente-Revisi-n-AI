export interface StandardizedMedicalReport {
  
  paciente: {
    nombre: string;
    apellido_paterno: string;
    apellido_materno?: string;
    edad: number;
    sexo: 'Masculino' | 'Femenino' | 'Otro';
    fecha_nacimiento?: Date;
  };
  
  poliza: {
    numero: string;
    certificado?: string;
    asegurado_titular?: boolean;
  };
  
  medico_tratante: {
    nombre: string;
    apellido_paterno: string;
    apellido_materno?: string;
    cedula_profesional: string;
    especialidad: string;
    telefono?: string;
    correo?: string;
    domicilio?: string;
    rfc?: string;
  };
  
  fecha: {
    ingreso?: Date;
    egreso?: Date;
    diagnostico?: Date;
    cirugia?: Date;
    informe?: Date;
  };
  
  atencion: {
    es_hospitalaria: boolean;
    es_urgencia: boolean;
    es_ambulatoria: boolean;
  };
  
  diagnostico: {
    codigo_cie: string;
    descripcion: string;
    codigo_cie_secundario?: string[];
  };
  
  intervencion_qx?: {
    hubo_cirugia: boolean;
    tipo_anestesia?: string;
    descripcion?: string;
    tecnica?: string;
  };
  
  signos_vitales?: {
    temperatura?: number;
    frecuencia_cardiaca?: number;
    presion_sistolica?: number;
    presion_diastolica?: number;
    respiracion?: number;
  };
  
  firma_medico: boolean;
  sello_hospital?: boolean;
  
  _metadata: {
    aseguradora: string;
    fecha_normalizacion: Date;
    campos_mapeados: Record<string, string>;
    campos_faltantes: string[];
    errores_mapeo: Array<{ campo: string; error: string }>;
  };
}

export interface NormalizationResult {
  exito: boolean;
  raw: any;
  datos: StandardizedMedicalReport;
  advertencias: string[];
  errores: string[];
}

export interface AseguradoraConfig {
  codigo: string;
  nombre_completo: string;
  
  mappings: {
    [campo_estandar: string]: {
      path: string;
      opcional?: boolean;
      parser?: (valor: any) => any;
      validador?: (valor: any) => boolean;
    };
  };
}
