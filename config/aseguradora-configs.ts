import { AseguradoraConfig } from '../types/standardized-schema';

export const CONFIG_GNP: AseguradoraConfig = {
  codigo: 'GNP',
  nombre_completo: 'Grupo Nacional Provincial',
  mappings: {
    // PACIENTE (6 campos)
    'paciente.nombre': { path: 'identificacion.nombres', parser: (v) => v?.trim() || '' },
    'paciente.apellido_paterno': { path: 'identificacion.primer_apellido', parser: (v) => v?.trim() || '' },
    'paciente.apellido_materno': { path: 'identificacion.segundo_apellido', opcional: true, parser: (v) => v?.trim() },
    'paciente.edad': { path: 'identificacion.edad', parser: (v) => parseInt(v, 10), validador: (v) => !isNaN(v) && v >= 0 && v <= 120 },
    'paciente.sexo': { 
      path: 'identificacion.sexo', 
      parser: (v) => {
        const normalized = v?.toLowerCase().trim();
        if (normalized === 'm' || normalized === 'masculino') return 'Masculino';
        if (normalized === 'f' || normalized === 'femenino') return 'Femenino';
        return 'Otro';
      },
      validador: (v) => ['Masculino', 'Femenino', 'Otro'].includes(v)
    },
    'paciente.fecha_nacimiento': { path: 'identificacion.fecha_nacimiento', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    
    // PÓLIZA (3 campos)
    'poliza.numero': { path: 'tramite.numero_poliza', parser: (v) => v?.trim() || '' },
    'poliza.certificado': { path: 'tramite.numero_certificado', opcional: true, parser: (v) => v?.trim() || '' },
    'poliza.asegurado_titular': { path: 'tramite.es_titular', opcional: true, parser: (v) => Boolean(v) },
    
    // MÉDICO TRATANTE (8 campos)
    'medico_tratante.nombre': { path: 'medico_tratante.nombres', parser: (v) => v?.trim() || '' },
    'medico_tratante.apellido_paterno': { path: 'medico_tratante.primer_apellido', parser: (v) => v?.trim() || '' },
    'medico_tratante.apellido_materno': { path: 'medico_tratante.segundo_apellido', opcional: true, parser: (v) => v?.trim() },
    'medico_tratante.cedula_profesional': { path: 'medico_tratante.cedula_profesional', validador: (v) => /^\d{7,8}$/.test(v) },
    'medico_tratante.especialidad': { path: 'medico_tratante.especialidad', parser: (v) => v?.trim() || '' },
    'medico_tratante.telefono': { path: 'medico_tratante.telefono_consultorio', opcional: true },
    'medico_tratante.correo': { path: 'medico_tratante.correo_electronico', opcional: true },
    'medico_tratante.rfc': { path: 'medico_tratante.rfc', opcional: true },
    
    // FECHAS (5 campos)
    'fecha.ingreso': { path: 'hospital.fecha_ingreso', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.egreso': { path: 'hospital.fecha_egreso', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.diagnostico': { path: 'diagnostico.fecha_diagnostico', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.cirugia': { path: 'intervencion_qx.fechas', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.informe': { path: 'firma.fecha_informe', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    
    // DIAGNÓSTICO (3 campos)
    'diagnostico.codigo_cie': { path: 'diagnostico.codigo_cie', opcional: true, validador: (v) => typeof v === 'string' && v.length > 0 },
    'diagnostico.descripcion': { path: 'diagnostico.diagnostico_definitivo', parser: (v) => v?.trim() || '' },
    'diagnostico.codigo_cie_secundario': { path: 'diagnostico.codigos_secundarios', opcional: true, parser: (v) => Array.isArray(v) ? v : [] },
    
    // INTERVENCIÓN QUIRÚRGICA (3 campos)
    'intervencion_qx.hubo_cirugia': { path: 'intervencion_qx.tecnica', opcional: true, parser: (v) => Boolean(v) },
    'intervencion_qx.tipo_anestesia': { path: 'intervencion_qx.equipo_especifico', opcional: true },
    'intervencion_qx.descripcion': { path: 'intervencion_qx.tecnica', opcional: true },
    
    // SIGNOS VITALES (2 campos - SOLO GNP los captura)
    'signos_vitales.temperatura': { path: 'signos_vitales.temperatura', opcional: true, parser: (v) => parseFloat(v) },
    'signos_vitales.presion_sistolica': { path: 'signos_vitales.presion_arterial', opcional: true, parser: (v) => parseInt(v, 10) },
    
    // FIRMA
    'firma_medico': { path: 'firma.firma_autografa_detectada', parser: (v) => Boolean(v) },
  },
};

export const CONFIG_METLIFE: AseguradoraConfig = {
  codigo: 'METLIFE',
  nombre_completo: 'MetLife México',
  mappings: {
    // PACIENTE (6 campos)
    'paciente.nombre': { path: 'identificacion.nombres', parser: (v) => v?.trim().split(' ')[0] || '' },
    'paciente.apellido_paterno': { path: 'identificacion.nombres', parser: (v) => v?.trim().split(' ')[1] || '' },
    'paciente.apellido_materno': { path: 'identificacion.nombres', opcional: true, parser: (v) => v?.trim().split(' ')[2] || '' },
    'paciente.edad': { path: 'identificacion.edad', parser: (v) => parseInt(v, 10), validador: (v) => !isNaN(v) && v >= 0 && v <= 120 },
    'paciente.sexo': { 
      path: 'identificacion.sexo', 
      parser: (v) => {
        const normalized = v?.toLowerCase().trim();
        if (normalized === 'm' || normalized === 'masculino') return 'Masculino';
        if (normalized === 'f' || normalized === 'femenino') return 'Femenino';
        return 'Otro';
      }
    },
    'paciente.fecha_nacimiento': { path: 'identificacion.fecha_nacimiento', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    
    // PÓLIZA (3 campos)
    'poliza.numero': { path: 'tramite.numero_poliza', opcional: true, parser: (v) => v?.trim() || '' },
    'poliza.certificado': { path: 'tramite.numero_certificado', opcional: true, parser: (v) => v?.trim() || '' },
    'poliza.asegurado_titular': { path: 'tramite.es_titular', opcional: true, parser: (v) => Boolean(v) },
    
    // MÉDICO TRATANTE (8 campos - RFC obligatorio para MetLife)
    'medico_tratante.nombre': { path: 'medico_tratante.nombres', parser: (v) => v?.trim().split(' ')[0] || '' },
    'medico_tratante.apellido_paterno': { path: 'medico_tratante.nombres', parser: (v) => v?.trim().split(' ')[1] || '' },
    'medico_tratante.apellido_materno': { path: 'medico_tratante.nombres', opcional: true, parser: (v) => v?.trim().split(' ')[2] || '' },
    'medico_tratante.cedula_profesional': { path: 'medico_tratante.cedula_profesional', validador: (v) => /^\d{7,10}$/.test(v) },
    'medico_tratante.especialidad': { path: 'medico_tratante.especialidad', parser: (v) => v?.trim() || '' },
    'medico_tratante.telefono': { path: 'medico_tratante.telefono_consultorio', opcional: true },
    'medico_tratante.correo': { path: 'medico_tratante.correo_electronico', opcional: true },
    'medico_tratante.rfc': { path: 'medico_tratante.rfc', validador: (v) => /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/i.test(v) },
    
    // FECHAS (5 campos)
    'fecha.ingreso': { path: 'hospital.fecha_ingreso', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.egreso': { path: 'hospital.fecha_egreso', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.diagnostico': { path: 'diagnostico.fecha_diagnostico', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.cirugia': { path: 'hospital.fecha_intervencion', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.informe': { path: 'firma.fecha_informe', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    
    // DIAGNÓSTICO (3 campos)
    'diagnostico.codigo_cie': { path: 'diagnostico.codigo_cie', validador: (v) => /^[A-Z]\d{2}(\.\d{1,2})?$/.test(v) },
    'diagnostico.descripcion': { path: 'diagnostico.diagnostico_definitivo', parser: (v) => v?.trim() || '' },
    'diagnostico.codigo_cie_secundario': { path: 'diagnostico.codigos_secundarios', opcional: true, parser: (v) => Array.isArray(v) ? v : [] },
    
    // INTERVENCIÓN QUIRÚRGICA (3 campos)
    'intervencion_qx.hubo_cirugia': { path: 'intervencion_qx.tecnica', opcional: true, parser: (v) => Boolean(v) },
    'intervencion_qx.tipo_anestesia': { path: 'intervencion_qx.equipo_especifico', opcional: true },
    'intervencion_qx.descripcion': { path: 'intervencion_qx.tecnica', opcional: true },
    
    // NOTA: MetLife NO captura signos vitales clínicos (temperatura, FC, PA) en su formulario estándar
    // Solo registra peso y talla en identificacion.peso e identificacion.talla
    
    // FIRMA
    'firma_medico': { path: 'firma.firma_autografa_detectada', parser: (v) => Boolean(v) },
  },
};

export const ASEGURADORAS_CONFIG: Record<string, AseguradoraConfig> = {
  'GNP': CONFIG_GNP,
  'METLIFE': CONFIG_METLIFE,
};
