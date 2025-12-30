import { AseguradoraConfig } from '../types/standardized-schema';

export const CONFIG_GNP: AseguradoraConfig = {
  codigo: 'GNP',
  nombre_completo: 'Grupo Nacional Provincial',
  mappings: {
    'paciente.nombre': { path: 'paciente.nombres', parser: (v) => v?.trim() || '' },
    'paciente.apellido_paterno': { path: 'paciente.apellido_paterno', parser: (v) => v?.trim() || '' },
    'paciente.apellido_materno': { path: 'paciente.apellido_materno', opcional: true, parser: (v) => v?.trim() },
    'paciente.edad': { path: 'paciente.edad', parser: (v) => parseInt(v, 10), validador: (v) => !isNaN(v) && v >= 0 && v <= 120 },
    'paciente.sexo': { path: 'paciente.sexo', validador: (v) => ['M', 'F', 'O'].includes(v) },
    
    'poliza.numero': { path: 'poliza.numero', parser: (v) => v?.trim() || '' },
    
    'medico_tratante.nombre': { path: 'medico.nombres', parser: (v) => v?.trim() || '' },
    'medico_tratante.apellido_paterno': { path: 'medico.apellido_paterno', parser: (v) => v?.trim() || '' },
    'medico_tratante.apellido_materno': { path: 'medico.apellido_materno', opcional: true, parser: (v) => v?.trim() },
    'medico_tratante.cedula_profesional': { path: 'medico.cedula', validador: (v) => /^\d{7,8}$/.test(v) },
    'medico_tratante.especialidad': { path: 'medico.especialidad', parser: (v) => v?.trim() || '' },
    'medico_tratante.telefono': { path: 'medico.telefono', opcional: true },
    'medico_tratante.correo': { path: 'medico.email', opcional: true },
    
    'fecha.ingreso': { path: 'hospitalizacion.fecha_ingreso', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.egreso': { path: 'hospitalizacion.fecha_egreso', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.diagnostico': { path: 'diagnostico.fecha', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.cirugia': { path: 'cirugia.fecha_cirugia', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    
    'diagnostico.codigo_cie': { path: 'diagnostico.codigo_cie10', validador: (v) => /^[A-Z]\d{2}(\.\d{1,2})?$/.test(v) },
    'diagnostico.descripcion': { path: 'diagnostico.descripcion_texto', parser: (v) => v?.trim() || '' },
    
    'intervencion_qx.hubo_cirugia': { path: 'cirugia.realizada', opcional: true, parser: (v) => Boolean(v) },
    'intervencion_qx.tipo_anestesia': { path: 'cirugia.tipo_anestesia', opcional: true },
    'intervencion_qx.descripcion': { path: 'cirugia.descripcion_procedimiento', opcional: true },
    
    'signos_vitales.temperatura': { path: 'signos_vitales.temperatura', opcional: true, parser: (v) => parseFloat(v) },
    'signos_vitales.frecuencia_cardiaca': { path: 'signos_vitales.pulso', opcional: true, parser: (v) => parseInt(v, 10) },
    'signos_vitales.presion_sistolica': { path: 'signos_vitales.presion_sistolica_calculada', opcional: true, parser: (v) => parseInt(v, 10) },
    
    'firma_medico': { path: 'medico.firma_presente', parser: (v) => Boolean(v) },
  },
};

export const CONFIG_METLIFE: AseguradoraConfig = {
  codigo: 'METLIFE',
  nombre_completo: 'MetLife México',
  mappings: {
    'paciente.nombre': { path: 'identificacion.nombre_completo', parser: (v) => v?.trim().split(' ')[0] || '' },
    'paciente.apellido_paterno': { path: 'identificacion.apellido_paterno', parser: (v) => v?.trim() || '' },
    'paciente.apellido_materno': { path: 'identificacion.apellido_materno', opcional: true, parser: (v) => v?.trim() },
    'paciente.edad': { path: 'identificacion.edad', parser: (v) => parseInt(v, 10), validador: (v) => !isNaN(v) && v >= 0 && v <= 120 },
    'paciente.sexo': { path: 'identificacion.sexo', validador: (v) => ['M', 'F', 'O'].includes(v) },
    
    'poliza.numero': { path: 'poliza.numero_poliza', parser: (v) => v?.trim() || '' },
    
    'medico_tratante.nombre': { path: 'medico.nombre_completo', parser: (v) => v?.trim().split(' ')[0] || '' },
    'medico_tratante.apellido_paterno': { path: 'medico.apellido_paterno', parser: (v) => v?.trim() || '' },
    'medico_tratante.cedula_profesional': { path: 'medico.cedula_profesional', validador: (v) => /^\d{7,8}$/.test(v) },
    'medico_tratante.especialidad': { path: 'medico.especialidad_medica', parser: (v) => v?.trim() || '' },
    'medico_tratante.telefono': { path: 'medico.telefono_consultorio', opcional: true },
    'medico_tratante.correo': { path: 'medico.correo_electronico', opcional: true },
    
    'fecha.ingreso': { path: 'hospitalizacion.fecha_entrada_hospital', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.egreso': { path: 'hospitalizacion.fecha_salida_hospital', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.diagnostico': { path: 'diagnostico.fecha_diagnostico', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    'fecha.cirugia': { path: 'procedimiento_quirurgico.fecha_procedimiento', opcional: true, parser: (v) => v ? new Date(v) : undefined },
    
    'diagnostico.codigo_cie': { path: 'diagnostico.cie10_principal', validador: (v) => /^[A-Z]\d{2}(\.\d{1,2})?$/.test(v) },
    'diagnostico.descripcion': { path: 'diagnostico.descripcion_diagnostico', parser: (v) => v?.trim() || '' },
    
    'intervencion_qx.hubo_cirugia': { path: 'procedimiento_quirurgico.realizado', opcional: true, parser: (v) => Boolean(v) },
    'intervencion_qx.tipo_anestesia': { path: 'procedimiento_quirurgico.tipo_anestesia_aplicada', opcional: true },
    'intervencion_qx.descripcion': { path: 'procedimiento_quirurgico.descripcion_procedimiento', opcional: true },
    
    'signos_vitales.temperatura': { path: 'exploracion_fisica.temperatura_corporal', opcional: true, parser: (v) => parseFloat(v) },
    'signos_vitales.frecuencia_cardiaca': { path: 'exploracion_fisica.frecuencia_cardiaca', opcional: true, parser: (v) => parseInt(v, 10) },
    'signos_vitales.presion_sistolica': { path: 'exploracion_fisica.presion_arterial_sistolica', opcional: true, parser: (v) => parseInt(v, 10) },
    
    'firma_medico': { path: 'documentacion.firma_medico_presente', parser: (v) => Boolean(v) },
  },
};

export const ASEGURADORAS_CONFIG: Record<string, AseguradoraConfig> = {
  'GNP': CONFIG_GNP,
  'METLIFE': CONFIG_METLIFE,
};
