import { AseguradoraConfig } from '../types/standardized-schema';

export const CONFIG_GNP: AseguradoraConfig = {
  codigo: 'GNP',
  nombre_completo: 'Grupo Nacional Provincial',
  mappings: {
    'paciente.nombre': { path: 'identificacion.nombres', parser: (v) => v?.trim() || '' },
    'paciente.apellido_paterno': { path: 'identificacion.primer_apellido', parser: (v) => v?.trim() || '' },
    'paciente.apellido_materno': { path: 'identificacion.segundo_apellido', opcional: true, parser: (v) => v?.trim() },
    'paciente.edad': { path: 'identificacion.edad', parser: (v) => parseInt(v, 10), validador: (v) => !isNaN(v) && v >= 0 && v <= 120 },
    'paciente.sexo': { path: 'identificacion.sexo', validador: (v) => ['M', 'F', 'O'].includes(v) },
    
    'poliza.numero': { path: 'tramite.numero_poliza', parser: (v) => v?.trim() || '' },
    
    'medico_tratante.nombre': { path: 'medico_tratante.nombres', parser: (v) => v?.trim() || '' },
    'medico_tratante.apellido_paterno': { path: 'medico_tratante.primer_apellido', parser: (v) => v?.trim() || '' },
    'medico_tratante.apellido_materno': { path: 'medico_tratante.segundo_apellido', opcional: true, parser: (v) => v?.trim() },
    'medico_tratante.cedula_profesional': { path: 'medico_tratante.cedula_profesional', validador: (v) => /^\d{7,8}$/.test(v) },
    'medico_tratante.especialidad': { path: 'medico_tratante.especialidad', parser: (v) => v?.trim() || '' },
    'medico_tratante.telefono': { path: 'medico_tratante.telefono_consultorio', opcional: true },
    'medico_tratante.correo': { path: 'medico_tratante.correo_electronico', opcional: true },
    
    'fecha.ingreso': { path: 'hospital.fecha_ingreso', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.egreso': { path: 'hospital.fecha_egreso', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.diagnostico': { path: 'diagnostico.fecha_diagnostico', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.cirugia': { path: 'intervencion_qx.fechas', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    
    'diagnostico.codigo_cie': { path: 'diagnostico.diagnostico_definitivo', opcional: true, validador: (v) => typeof v === 'string' && v.length > 0 },
    'diagnostico.descripcion': { path: 'diagnostico.diagnostico_definitivo', parser: (v) => v?.trim() || '' },
    
    'intervencion_qx.hubo_cirugia': { path: 'intervencion_qx.tecnica', opcional: true, parser: (v) => Boolean(v) },
    'intervencion_qx.tipo_anestesia': { path: 'intervencion_qx.equipo_especifico', opcional: true },
    'intervencion_qx.descripcion': { path: 'intervencion_qx.tecnica', opcional: true },
    
    'signos_vitales.temperatura': { path: 'signos_vitales.temperatura', opcional: true, parser: (v) => parseFloat(v) },
    'signos_vitales.frecuencia_cardiaca': { path: 'signos_vitales.respiracion', opcional: true, parser: (v) => parseInt(v, 10) },
    'signos_vitales.presion_sistolica': { path: 'signos_vitales.presion_arterial', opcional: true, parser: (v) => parseInt(v, 10) },
    
    'firma_medico': { path: 'firma.firma_autografa_detectada', parser: (v) => Boolean(v) },
  },
};

export const CONFIG_METLIFE: AseguradoraConfig = {
  codigo: 'METLIFE',
  nombre_completo: 'MetLife México',
  mappings: {
    'paciente.nombre': { path: 'identificacion.nombres', parser: (v) => v?.trim().split(' ')[0] || '' },
    'paciente.apellido_paterno': { path: 'identificacion.nombres', parser: (v) => v?.trim().split(' ')[1] || '' },
    'paciente.apellido_materno': { path: 'identificacion.nombres', opcional: true, parser: (v) => v?.trim().split(' ')[2] || '' },
    'paciente.edad': { path: 'identificacion.edad', parser: (v) => parseInt(v, 10), validador: (v) => !isNaN(v) && v >= 0 && v <= 120 },
    'paciente.sexo': { path: 'identificacion.sexo', parser: (v) => v === 'Masculino' ? 'M' : v === 'Femenino' ? 'F' : 'O' },
    
    'poliza.numero': { path: 'tramite.numero_poliza', opcional: true, parser: (v) => v?.trim() || '' },
    
    'medico_tratante.nombre': { path: 'medico_tratante.nombres', parser: (v) => v?.trim().split(' ')[0] || '' },
    'medico_tratante.apellido_paterno': { path: 'medico_tratante.nombres', parser: (v) => v?.trim().split(' ')[1] || '' },
    'medico_tratante.cedula_profesional': { path: 'medico_tratante.cedula_profesional', validador: (v) => /^\d{7,10}$/.test(v) },
    'medico_tratante.especialidad': { path: 'medico_tratante.especialidad', parser: (v) => v?.trim() || '' },
    'medico_tratante.telefono': { path: 'medico_tratante.telefono_consultorio', opcional: true },
    'medico_tratante.correo': { path: 'medico_tratante.correo_electronico', opcional: true },
    
    'fecha.ingreso': { path: 'hospital.fecha_ingreso', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.egreso': { path: 'hospital.fecha_egreso', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.diagnostico': { path: 'diagnostico.fecha_diagnostico', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.cirugia': { path: 'hospital.fecha_intervencion', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    
    'diagnostico.codigo_cie': { path: 'diagnostico.codigo_cie', validador: (v) => /^[A-Z]\d{2}(\.\d{1,2})?$/.test(v) },
    'diagnostico.descripcion': { path: 'diagnostico.diagnostico_definitivo', parser: (v) => v?.trim() || '' },
    
    'intervencion_qx.hubo_cirugia': { path: 'intervencion_qx.tecnica', opcional: true, parser: (v) => Boolean(v) },
    'intervencion_qx.tipo_anestesia': { path: 'intervencion_qx.equipo_especifico', opcional: true },
    'intervencion_qx.descripcion': { path: 'intervencion_qx.tecnica', opcional: true },
    
    'signos_vitales.temperatura': { path: 'identificacion.talla', opcional: true, parser: (v) => parseFloat(v) },
    'signos_vitales.frecuencia_cardiaca': { path: 'identificacion.peso', opcional: true, parser: (v) => parseInt(v, 10) },
    'signos_vitales.presion_sistolica': { path: 'exploracion_fisica.resultados', opcional: true },
    
    'firma_medico': { path: 'firma.firma_autografa_detectada', parser: (v) => Boolean(v) },
  },
};

export const ASEGURADORAS_CONFIG: Record<string, AseguradoraConfig> = {
  'GNP': CONFIG_GNP,
  'METLIFE': CONFIG_METLIFE,
};
