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
    'poliza.numero': { path: 'tramite.numero_poliza', parser: (v) => v?.trim().replace(/\s/g, '') || '' },
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
    'poliza.numero': { path: 'tramite.numero_poliza', opcional: true, parser: (v) => v?.trim().replace(/\s/g, '') || '' },
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

export const CONFIG_NYLIFE: AseguradoraConfig = {
  codigo: 'NYLIFE',
  nombre_completo: 'Seguros Monterrey New York Life',
  mappings: {
    // PACIENTE - Estructura híbrida con arrays para captura raw
    'paciente.nombre': { path: 'identificacion.nombres', parser: (v) => v?.trim() || '' },
    'paciente.apellido_paterno': { path: 'identificacion.apellido_paterno', parser: (v) => v?.trim() || '' },
    'paciente.apellido_materno': { path: 'identificacion.apellido_materno', opcional: true, parser: (v) => v?.trim() },
    'paciente.edad': { path: 'identificacion.edad', parser: (v) => parseInt(v, 10), validador: (v) => !isNaN(v) && v >= 0 && v <= 120 },
    'paciente.sexo': { 
      path: 'identificacion.sexo', 
      parser: (v) => {
        if (Array.isArray(v)) {
          if (v.includes('Femenino')) return 'Femenino';
          if (v.includes('Masculino')) return 'Masculino';
          return v[0] || 'Otro';
        }
        const normalized = v?.toLowerCase().trim();
        if (normalized === 'femenino' || normalized === 'm' || normalized === 'mujer') return 'Femenino';
        if (normalized === 'masculino' || normalized === 'h' || normalized === 'hombre') return 'Masculino';
        return 'Otro';
      },
      validador: (v) => ['Masculino', 'Femenino', 'Otro'].includes(v)
    },
    'paciente.sexo_raw': { path: 'identificacion.sexo', opcional: true, parser: (v) => Array.isArray(v) ? v : [v] },
    'paciente.tipo_evento': { 
      path: 'identificacion.tipo_evento', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v[0] || '' : v?.trim() || '' 
    },
    'paciente.tipo_evento_raw': { path: 'identificacion.tipo_evento', opcional: true, parser: (v) => Array.isArray(v) ? v : [v] },
    
    // PÓLIZA
    'poliza.numero': { path: 'tramite.numero_poliza', opcional: true, parser: (v) => v?.trim().replace(/\s/g, '') || '' },
    'poliza.certificado': { path: 'tramite.numero_certificado', opcional: true, parser: (v) => v?.trim() || '' },
    
    // MÉDICO TRATANTE - Con campos específicos de NY Life
    'medico_tratante.nombre_completo': { path: 'medico_tratante.nombre_completo', parser: (v) => v?.trim() || '' },
    'medico_tratante.nombre': { path: 'medico_tratante.nombres', parser: (v) => v?.trim() || '' },
    'medico_tratante.apellido_paterno': { path: 'medico_tratante.apellido_paterno', parser: (v) => v?.trim() || '' },
    'medico_tratante.apellido_materno': { path: 'medico_tratante.apellido_materno', opcional: true, parser: (v) => v?.trim() },
    'medico_tratante.cedula_profesional': { path: 'medico_tratante.cedula_profesional', validador: (v) => /^\d{7,10}$/.test(v) },
    'medico_tratante.cedula_especialidad': { path: 'medico_tratante.cedula_especialidad', opcional: true },
    'medico_tratante.especialidad': { path: 'medico_tratante.especialidad', parser: (v) => v?.trim() || '' },
    'medico_tratante.telefono': { path: 'medico_tratante.telefono_consultorio', opcional: true },
    'medico_tratante.telefono_movil': { path: 'medico_tratante.telefono_movil', opcional: true },
    'medico_tratante.correo': { path: 'medico_tratante.correo_electronico', opcional: true },
    'medico_tratante.rfc': { path: 'medico_tratante.rfc', opcional: true, validador: (v) => !v || /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/i.test(v) },
    'medico_tratante.numero_proveedor': { path: 'medico_tratante.numero_proveedor', opcional: true },
    'medico_tratante.convenio_red': { 
      path: 'medico_tratante.convenio_red', 
      opcional: true, 
      parser: (v) => {
        if (Array.isArray(v)) return v.includes('Sí');
        return v === 'Sí';
      }
    },
    'medico_tratante.acepta_tabulador': { 
      path: 'medico_tratante.acepta_tabulador', 
      opcional: true, 
      parser: (v) => {
        if (Array.isArray(v)) return v.includes('Sí');
        return v === 'Sí';
      }
    },
    
    // FECHAS - Estructura robusta con objetos día/mes/año
    'fecha.primeros_sintomas': { 
      path: 'padecimiento_actual.fecha_primeros_sintomas.formatted', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.primera_consulta': { 
      path: 'padecimiento_actual.fecha_primera_consulta.formatted', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.diagnostico': { 
      path: 'padecimiento_actual.fecha_diagnostico.formatted', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.ingreso': { 
      path: 'tratamiento_y_hospital.hospital.ingreso.formatted', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.egreso': { 
      path: 'tratamiento_y_hospital.hospital.egreso.formatted', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.informe': { 
      path: 'firma_cierre.fecha.formatted', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    
    // DIAGNÓSTICO - Array de diagnósticos
    'diagnostico.descripcion': { 
      path: 'padecimiento_actual.diagnosticos', 
      parser: (v) => Array.isArray(v) ? v[0] || '' : v?.trim() || '' 
    },
    'diagnostico.descripcion_2': { 
      path: 'padecimiento_actual.diagnosticos', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v[1] || '' : '' 
    },
    'diagnostico.descripcion_3': { 
      path: 'padecimiento_actual.diagnosticos', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v[2] || '' : '' 
    },
    'diagnostico.tipo_padecimiento': { 
      path: 'padecimiento_actual.tipo_padecimiento', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    
    // TRATAMIENTO Y HOSPITAL
    'tratamiento.modalidad': { 
      path: 'tratamiento_y_hospital.modalidad', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    'tratamiento.detalle': { path: 'tratamiento_y_hospital.detalle_tratamiento', opcional: true },
    'tratamiento.estatus': { 
      path: 'tratamiento_y_hospital.estatus_tratamiento', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    'tratamiento.hubo_complicaciones': { 
      path: 'tratamiento_y_hospital.complicaciones.marcada', 
      opcional: true, 
      parser: (v) => {
        if (Array.isArray(v)) return v.includes('Sí');
        return false;
      }
    },
    'tratamiento.complicaciones_detalle': { path: 'tratamiento_y_hospital.complicaciones.detalle', opcional: true },
    'hospital.nombre': { path: 'tratamiento_y_hospital.hospital.nombre', opcional: true },
    'hospital.ciudad': { path: 'tratamiento_y_hospital.hospital.ciudad', opcional: true },
    'hospital.tipo_estancia': { 
      path: 'tratamiento_y_hospital.hospital.tipo_estancia', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    
    // EXPLORACIÓN FÍSICA
    'exploracion_fisica.talla': { path: 'exploracion_fisica.talla', opcional: true },
    'exploracion_fisica.peso': { path: 'exploracion_fisica.peso', opcional: true },
    'exploracion_fisica.resultados': { path: 'exploracion_fisica.resultados', opcional: true },
    
    // ANTECEDENTES PATOLÓGICOS - Modelo híbrido (raw + granular)
    'antecedentes.patologicos.captura_raw': { 
      path: 'antecedentes_patologicos.captura_raw_marcas', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    'antecedentes.patologicos.cardiacos': { 
      path: 'antecedentes_patologicos.cardiacos', 
      opcional: true, 
      parser: (v) => v === 'Sí' 
    },
    'antecedentes.patologicos.hipertensivos': { 
      path: 'antecedentes_patologicos.hipertensivos', 
      opcional: true, 
      parser: (v) => v === 'Sí' 
    },
    'antecedentes.patologicos.diabetes': { 
      path: 'antecedentes_patologicos.diabetes_mellitus', 
      opcional: true, 
      parser: (v) => v === 'Sí' 
    },
    'antecedentes.patologicos.vih_sida': { 
      path: 'antecedentes_patologicos.vih_sida', 
      opcional: true, 
      parser: (v) => v === 'Sí' 
    },
    'antecedentes.patologicos.cancer': { 
      path: 'antecedentes_patologicos.cancer', 
      opcional: true, 
      parser: (v) => v === 'Sí' 
    },
    'antecedentes.patologicos.hepaticos': { 
      path: 'antecedentes_patologicos.hepaticos', 
      opcional: true, 
      parser: (v) => v === 'Sí' 
    },
    'antecedentes.patologicos.convulsivos': { 
      path: 'antecedentes_patologicos.convulsivos', 
      opcional: true, 
      parser: (v) => v === 'Sí' 
    },
    'antecedentes.patologicos.cirugias': { 
      path: 'antecedentes_patologicos.cirugias', 
      opcional: true, 
      parser: (v) => v === 'Sí' 
    },
    'antecedentes.patologicos.detalle_narrativo': { 
      path: 'antecedentes_patologicos.detalle_narrativo', 
      opcional: true 
    },
    
    // ANTECEDENTES NO PATOLÓGICOS - Modelo híbrido
    'antecedentes.no_patologicos.captura_raw': { 
      path: 'antecedentes_no_patologicos.captura_raw_marcas', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    'antecedentes.no_patologicos.fuma': { path: 'antecedentes_no_patologicos.fuma', opcional: true },
    'antecedentes.no_patologicos.alcohol': { path: 'antecedentes_no_patologicos.alcohol', opcional: true },
    'antecedentes.no_patologicos.drogas': { path: 'antecedentes_no_patologicos.drogas', opcional: true },
    'antecedentes.no_patologicos.perdida_peso': { path: 'antecedentes_no_patologicos.perdida_peso', opcional: true },
    'antecedentes.no_patologicos.perinatales': { path: 'antecedentes_no_patologicos.perinatales', opcional: true },
    'antecedentes.no_patologicos.gineco_obstetricos': { path: 'antecedentes_no_patologicos.gineco_obstetricos', opcional: true },
    
    // DISCAPACIDAD
    'discapacidad.tiene': { 
      path: 'padecimiento_actual.discapacidad.marcada', 
      opcional: true, 
      parser: (v) => {
        if (Array.isArray(v)) return v.includes('Sí');
        return false;
      }
    },
    'discapacidad.tipo': { 
      path: 'padecimiento_actual.discapacidad.tipo', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    'discapacidad.desde': { path: 'padecimiento_actual.discapacidad.desde', opcional: true },
    'discapacidad.hasta': { path: 'padecimiento_actual.discapacidad.hasta', opcional: true },
    
    // EQUIPO QUIRÚRGICO - Array de objetos
    'equipo_quirurgico': { 
      path: 'equipo_quirurgico', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    
    // FIRMA
    'firma.lugar': { path: 'firma_cierre.lugar', opcional: true },
    'firma.nombre': { path: 'firma_cierre.nombre_firma', opcional: true },
    'firma_medico': { 
      path: 'firma_cierre.firma_autografa_detectada', 
      parser: (v) => v === 'Detectada' 
    },
    
    // METADATA
    'metadata.coherencia_clinica': { 
      path: 'metadata.existe_coherencia_clinica', 
      opcional: true, 
      parser: (v) => v === 'Sí' 
    },
    'metadata.observaciones': { path: 'metadata.observaciones', opcional: true },
  },
};

export const CONFIG_AXA: AseguradoraConfig = {
  codigo: 'AXA',
  nombre_completo: 'AXA Seguros S.A. de C.V.',
  mappings: {
    'paciente.nombre': { path: 'identificacion.nombres', parser: (v) => v?.trim() || '' },
    'paciente.apellido_paterno': { path: 'identificacion.apellido_paterno', parser: (v) => v?.trim() || '' },
    'paciente.apellido_materno': { path: 'identificacion.apellido_materno', opcional: true, parser: (v) => v?.trim() },
    'paciente.edad': { path: 'identificacion.edad', parser: (v) => parseInt(v, 10), validador: (v) => !isNaN(v) && v >= 0 && v <= 120 },
    'paciente.sexo': { 
      path: 'identificacion.sexo', 
      parser: (v) => {
        if (Array.isArray(v)) {
          if (v.includes('Femenino')) return 'Femenino';
          if (v.includes('Masculino')) return 'Masculino';
          return v[0] || 'Otro';
        }
        const normalized = v?.toLowerCase().trim();
        if (normalized === 'm' || normalized === 'masculino') return 'Masculino';
        if (normalized === 'f' || normalized === 'femenino') return 'Femenino';
        return 'Otro';
      },
      validador: (v) => ['Masculino', 'Femenino', 'Otro'].includes(v)
    },
    'paciente.fecha_nacimiento': { path: 'identificacion.fecha_nacimiento', opcional: true, parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined },
    'paciente.talla': { path: 'identificacion.talla', opcional: true },
    'paciente.peso': { path: 'identificacion.peso', opcional: true },
    'paciente.tension_arterial': { path: 'identificacion.tension_arterial', opcional: true },

    'poliza.motivo_atencion': { 
      path: 'motivo_atencion', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    'poliza.tipo_estancia': { 
      path: 'tipo_estancia', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },

    'medico_tratante.nombre': { path: 'medico_principal.nombre', parser: (v) => v?.trim() || '' },
    'medico_tratante.especialidad': { path: 'medico_principal.especialidad', parser: (v) => v?.trim() || '' },
    'medico_tratante.cedula_profesional': { path: 'medico_principal.cedula_profesional', validador: (v) => /^\d{7,10}$/.test(v) },
    'medico_tratante.cedula_especialidad': { path: 'medico_principal.cedula_especialidad', opcional: true },
    'medico_tratante.rfc': { path: 'medico_principal.rfc', opcional: true, validador: (v) => !v || /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/i.test(v) },
    'medico_tratante.domicilio': { path: 'medico_principal.domicilio', opcional: true },
    'medico_tratante.telefono': { path: 'medico_principal.telefono', opcional: true },
    'medico_tratante.tipo_participacion': { path: 'medico_principal.tipo_participacion', opcional: true },

    'fecha.padecimiento': { 
      path: 'diagnostico.fecha_padecimiento', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.diagnostico': { 
      path: 'diagnostico.fecha_diagnostico', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.cirugia': { 
      path: 'tratamiento.fecha_cirugia', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.hospitalizacion': { 
      path: 'tratamiento.fecha_hospitalizacion', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.alta': { 
      path: 'tratamiento.fecha_alta', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.informe': { 
      path: 'firma.lugar_fecha', 
      opcional: true 
    },

    'diagnostico.descripcion': { path: 'diagnostico.diagnostico_texto', parser: (v) => v?.trim() || '' },
    'diagnostico.padecimiento_actual': { path: 'diagnostico.padecimiento_actual', opcional: true },
    'diagnostico.codigo_icd': { path: 'diagnostico.codigo_icd', opcional: true },
    'diagnostico.tipo_padecimiento': { 
      path: 'diagnostico.tipo_padecimiento', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    'diagnostico.es_cancer': { 
      path: 'diagnostico.es_cancer', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v.includes('Sí') : false 
    },
    'diagnostico.causa_etiologia': { path: 'diagnostico.causa_etiologia', opcional: true },
    'diagnostico.exploracion_fisica': { path: 'diagnostico.exploracion_fisica', opcional: true },
    'diagnostico.estudios_laboratorio': { path: 'diagnostico.estudios_laboratorio', opcional: true },

    'tratamiento.propuesto': { path: 'tratamiento.tratamiento_propuesto', opcional: true },
    'tratamiento.sitio_procedimiento': { 
      path: 'tratamiento.sitio_procedimiento', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    'tratamiento.nombre_hospital': { path: 'tratamiento.nombre_hospital', opcional: true },
    'tratamiento.complicaciones': { 
      path: 'tratamiento.complicaciones', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v.includes('Sí') : false 
    },
    'tratamiento.complicaciones_descripcion': { path: 'tratamiento.complicaciones_descripcion', opcional: true },
    'tratamiento.tratamiento_futuro': { 
      path: 'tratamiento.tratamiento_futuro', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v.includes('Sí') : false 
    },

    'medicamentos': { 
      path: 'tabla_medicamentos', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },

    'antecedentes.patologicos.cardiacos': { path: 'antecedentes_patologicos.cardiacos', opcional: true, parser: (v) => Boolean(v) },
    'antecedentes.patologicos.diabetes': { path: 'antecedentes_patologicos.diabetes_mellitus', opcional: true, parser: (v) => Boolean(v) },
    'antecedentes.patologicos.cancer': { path: 'antecedentes_patologicos.cancer', opcional: true, parser: (v) => Boolean(v) },
    'antecedentes.patologicos.convulsivos': { path: 'antecedentes_patologicos.convulsivos', opcional: true, parser: (v) => Boolean(v) },
    'antecedentes.patologicos.hipertensivos': { path: 'antecedentes_patologicos.hipertensivos', opcional: true, parser: (v) => Boolean(v) },
    'antecedentes.patologicos.vih_sida': { path: 'antecedentes_patologicos.vih_sida', opcional: true, parser: (v) => Boolean(v) },
    'antecedentes.patologicos.hepaticos': { path: 'antecedentes_patologicos.hepaticos', opcional: true, parser: (v) => Boolean(v) },

    'antecedentes.no_patologicos.fuma': { path: 'antecedentes_no_patologicos.fuma', opcional: true, parser: (v) => Boolean(v) },
    'antecedentes.no_patologicos.alcohol': { path: 'antecedentes_no_patologicos.alcohol', opcional: true, parser: (v) => Boolean(v) },
    'antecedentes.no_patologicos.drogas': { path: 'antecedentes_no_patologicos.drogas', opcional: true, parser: (v) => Boolean(v) },

    'antecedentes.gineco_obstetricos.gestacion': { path: 'antecedentes_gineco_obstetricos.gestacion', opcional: true },
    'antecedentes.gineco_obstetricos.partos': { path: 'antecedentes_gineco_obstetricos.partos', opcional: true },
    'antecedentes.gineco_obstetricos.abortos': { path: 'antecedentes_gineco_obstetricos.abortos', opcional: true },
    'antecedentes.gineco_obstetricos.cesareas': { path: 'antecedentes_gineco_obstetricos.cesareas', opcional: true },

    'rehabilitacion.dias': { path: 'rehabilitacion_fisica.dias', opcional: true },
    'rehabilitacion.sesiones': { path: 'rehabilitacion_fisica.numero_sesiones', opcional: true },

    'enfermeria.dias': { path: 'enfermeria.dias_requeridos', opcional: true },
    'enfermeria.turno': { 
      path: 'enfermeria.turno', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },

    'firma.lugar_fecha': { path: 'firma.lugar_fecha', opcional: true },
    'firma_medico': { 
      path: 'firma.firma_medico', 
      parser: (v) => v === 'Detectada' || v === 'detected' 
    },

    'firma_asegurado_transferencia': {
      path: 'transferencia_datos.firma_asegurado_1',
      opcional: true,
      parser: (v) => v === 'Detectada' || v === 'detected'
    },
    'firma_asegurado_programas': {
      path: 'transferencia_datos.firma_asegurado_2',
      opcional: true,
      parser: (v) => v === 'Detectada' || v === 'detected'
    },

    'metadata.coherencia_clinica': { 
      path: 'metadata.existe_coherencia_clinica', 
      opcional: true, 
      parser: (v) => Boolean(v) 
    },
    'metadata.observaciones': { path: 'observaciones.observaciones', opcional: true },
  },
};

export const CONFIG_AXA_2025: AseguradoraConfig = {
  codigo: 'AXA',
  nombre_completo: 'AXA Seguros S.A. de C.V. (2025)',
  mappings: {
    'paciente.nombre': { path: 'identificacion.nombres', parser: (v) => v?.trim() || '' },
    'paciente.apellido_paterno': { path: 'identificacion.apellido_paterno', parser: (v) => v?.trim() || '' },
    'paciente.apellido_materno': { path: 'identificacion.apellido_materno', opcional: true, parser: (v) => v?.trim() },
    'paciente.edad': { path: 'identificacion.edad', parser: (v) => parseInt(v, 10), validador: (v) => !isNaN(v) && v >= 0 && v <= 120 },
    'paciente.sexo': { 
      path: 'identificacion.sexo', 
      parser: (v) => {
        if (Array.isArray(v)) {
          if (v.includes('Femenino')) return 'Femenino';
          if (v.includes('Masculino')) return 'Masculino';
          return v[0] || 'Otro';
        }
        const normalized = v?.toLowerCase().trim();
        if (normalized === 'm' || normalized === 'masculino') return 'Masculino';
        if (normalized === 'f' || normalized === 'femenino') return 'Femenino';
        return 'Otro';
      },
      validador: (v) => ['Masculino', 'Femenino', 'Otro'].includes(v)
    },
    'paciente.fecha_nacimiento': { path: 'identificacion.fecha_nacimiento', opcional: true, parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined },
    'paciente.talla': { path: 'identificacion.talla', opcional: true },
    'paciente.peso': { path: 'identificacion.peso', opcional: true },
    'paciente.tension_arterial': { path: 'identificacion.tension_arterial', opcional: true },

    'poliza.motivo_atencion': { 
      path: 'motivo_atencion', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    'poliza.tipo_estancia': { 
      path: 'tipo_estancia', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },

    'medico_tratante.nombre': { path: 'medico_principal.nombre', parser: (v) => v?.trim() || '' },
    'medico_tratante.especialidad': { path: 'medico_principal.especialidad', parser: (v) => v?.trim() || '' },
    'medico_tratante.cedula_profesional': { path: 'medico_principal.cedula_profesional', validador: (v) => /^\d{7,10}$/.test(v) },
    'medico_tratante.cedula_especialidad': { path: 'medico_principal.cedula_especialidad', opcional: true },
    'medico_tratante.rfc': { path: 'medico_principal.rfc', opcional: true, validador: (v) => !v || /^[A-Z]{4}\d{6}[A-Z0-9]{3}$/i.test(v) },
    'medico_tratante.domicilio': { path: 'medico_principal.domicilio', opcional: true },
    'medico_tratante.telefono': { path: 'medico_principal.telefono', opcional: true },
    'medico_tratante.tipo_participacion': { path: 'medico_principal.tipo_participacion', opcional: true },
    'medico_tratante.ajusta_tabulador': { 
      path: 'medico_principal.ajusta_tabulador', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v.includes('Sí') : false 
    },
    'medico_tratante.persona_moral_nombre': { path: 'medico_principal.persona_moral_nombre_comun', opcional: true },
    'medico_tratante.persona_moral_razon_social': { path: 'medico_principal.persona_moral_razon_social', opcional: true },

    'fecha.padecimiento': { 
      path: 'diagnostico.fecha_padecimiento', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.diagnostico': { 
      path: 'diagnostico.fecha_diagnostico', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.cirugia': { 
      path: 'tratamiento.fecha_cirugia', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.hospitalizacion': { 
      path: 'tratamiento.fecha_hospitalizacion', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.alta': { 
      path: 'tratamiento.fecha_alta', 
      opcional: true, 
      parser: (v) => v ? new Date(v.split('/').reverse().join('-')) : undefined 
    },
    'fecha.informe': { 
      path: 'firma.lugar_fecha', 
      opcional: true 
    },

    'diagnostico.descripcion': { path: 'diagnostico.diagnostico_texto', parser: (v) => v?.trim() || '' },
    'diagnostico.padecimiento_actual': { path: 'diagnostico.padecimiento_actual', opcional: true },
    'diagnostico.codigo_icd': { path: 'diagnostico.codigo_icd', opcional: true },
    'diagnostico.tipo_padecimiento': { 
      path: 'diagnostico.tipo_padecimiento', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    'diagnostico.es_cancer': { 
      path: 'diagnostico.es_cancer', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v.includes('Sí') : false 
    },
    'diagnostico.estadificacion_tnm': { path: 'diagnostico.estadificacion_tnm', opcional: true },
    'diagnostico.causa_etiologia': { path: 'diagnostico.causa_etiologia', opcional: true },
    'diagnostico.exploracion_fisica': { path: 'diagnostico.exploracion_fisica', opcional: true },
    'diagnostico.estudios_laboratorio': { path: 'diagnostico.estudios_laboratorio', opcional: true },

    'tratamiento.propuesto': { path: 'tratamiento.tratamiento_propuesto', opcional: true },
    'tratamiento.sitio_procedimiento': { 
      path: 'tratamiento.sitio_procedimiento', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    'tratamiento.nombre_hospital': { path: 'tratamiento.nombre_hospital', opcional: true },
    'tratamiento.complicaciones': { 
      path: 'tratamiento.complicaciones', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v.includes('Sí') : false 
    },
    'tratamiento.complicaciones_descripcion': { path: 'tratamiento.complicaciones_descripcion', opcional: true },
    'tratamiento.tratamiento_futuro': { 
      path: 'tratamiento.tratamiento_futuro', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v.includes('Sí') : false 
    },

    'medicamentos': { 
      path: 'tabla_medicamentos', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },

    'antecedentes.patologicos_tabla': { 
      path: 'antecedentes_patologicos', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },

    'antecedentes.no_patologicos.fuma': { path: 'antecedentes_no_patologicos.fuma', opcional: true, parser: (v) => Boolean(v) },
    'antecedentes.no_patologicos.alcohol': { path: 'antecedentes_no_patologicos.alcohol', opcional: true, parser: (v) => Boolean(v) },
    'antecedentes.no_patologicos.drogas': { path: 'antecedentes_no_patologicos.drogas', opcional: true, parser: (v) => Boolean(v) },

    'antecedentes.gineco_obstetricos.gestacion': { path: 'antecedentes_gineco_obstetricos.gestacion', opcional: true },
    'antecedentes.gineco_obstetricos.partos': { path: 'antecedentes_gineco_obstetricos.partos', opcional: true },
    'antecedentes.gineco_obstetricos.abortos': { path: 'antecedentes_gineco_obstetricos.abortos', opcional: true },
    'antecedentes.gineco_obstetricos.cesareas': { path: 'antecedentes_gineco_obstetricos.cesareas', opcional: true },

    'rehabilitacion.dias': { path: 'rehabilitacion_fisica.dias', opcional: true },
    'rehabilitacion.sesiones': { path: 'rehabilitacion_fisica.numero_sesiones', opcional: true },

    'enfermeria.dias': { path: 'enfermeria.dias_requeridos', opcional: true },
    'enfermeria.turno': { 
      path: 'enfermeria.turno', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },
    'enfermeria.descripcion_actividades': { path: 'enfermeria.descripcion_actividades', opcional: true },

    'plan_terapeutico.tecnica_detallada': { path: 'plan_terapeutico.tecnica_detallada', opcional: true },
    'plan_terapeutico.tiempo_hospitalizacion': { path: 'plan_terapeutico.tiempo_esperado_hospitalizacion', opcional: true },

    'solicitud_material': { 
      path: 'solicitud_material', 
      opcional: true, 
      parser: (v) => Array.isArray(v) ? v : [] 
    },

    'firma.lugar_fecha': { path: 'firma.lugar_fecha', opcional: true },
    'firma_medico': { 
      path: 'firma.firma_medico', 
      parser: (v) => v === 'Detectada' || v === 'detected' 
    },

    'firma_asegurado': {
      path: 'aviso_privacidad.firma_asegurado',
      opcional: true,
      parser: (v) => v === 'Detectada' || v === 'detected'
    },

    'metadata.coherencia_clinica': { 
      path: 'metadata.existe_coherencia_clinica', 
      opcional: true, 
      parser: (v) => Boolean(v) 
    },
    'metadata.observaciones': { path: 'observaciones.observaciones', opcional: true },
  },
};

export const CONFIG_AXA_2018: AseguradoraConfig = {
  ...CONFIG_AXA,
  codigo: 'AXA_2018',
  nombre_completo: 'AXA Seguros S.A. de C.V. (2018)',
};

export const ASEGURADORAS_CONFIG: Record<string, AseguradoraConfig> = {
  'GNP': CONFIG_GNP,
  'METLIFE': CONFIG_METLIFE,
  'NYLIFE': CONFIG_NYLIFE,
  'AXA': CONFIG_AXA_2025,
  'AXA_2018': CONFIG_AXA_2018,
};
