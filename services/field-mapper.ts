import { AseguradoraConfig, NormalizationResult, StandardizedMedicalReport } from '../types/standardized-schema';
import { ASEGURADORAS_CONFIG } from '../config/aseguradora-configs';

export class FieldNormalizer {
  private config: AseguradoraConfig;
  
  constructor(aseguradora: string) {
    const config = ASEGURADORAS_CONFIG[aseguradora];
    if (!config) {
      throw new Error(
        `Aseguradora '${aseguradora}' no configurada. Disponibles: ${Object.keys(ASEGURADORAS_CONFIG).join(', ')}`
      );
    }
    this.config = config;
  }
  
  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }
    return current;
  }
  
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key]) current[key] = {};
      current = current[key];
    }
    current[keys[keys.length - 1]] = value;
  }
  
  normalize(rawData: any): NormalizationResult {
    const resultado: NormalizationResult = {
      exito: true,
      raw: rawData,
      datos: {
        paciente: { nombre: '', apellido_paterno: '', edad: 0, sexo: 'O' },
        poliza: { numero: '' },
        medico_tratante: { nombre: '', apellido_paterno: '', cedula_profesional: '', especialidad: '' },
        fecha: { informe: new Date() },
        atencion: { es_hospitalaria: false, es_urgencia: false, es_ambulatoria: false },
        diagnostico: { codigo_cie: '', descripcion: '' },
        firma_medico: false,
        _metadata: {
          aseguradora: this.config.codigo,
          fecha_normalizacion: new Date(),
          campos_mapeados: {},
          campos_faltantes: [],
          errores_mapeo: [],
        },
      },
      advertencias: [],
      errores: [],
    };
    
    for (const [campoEstandar, config] of Object.entries(this.config.mappings)) {
      const valor = this.getNestedValue(rawData, config.path);
      
      try {
        if (valor === undefined || valor === null || valor === '') {
          if (!config.opcional) {
            resultado.errores.push(`Campo obligatorio faltante: ${config.path}`);
            resultado.exito = false;
          } else {
            resultado.datos._metadata.campos_faltantes.push(config.path);
          }
          continue;
        }
        
        let valorProcesado = valor;
        if (config.parser) {
          valorProcesado = config.parser(valor);
        }
        
        if (config.validador && !config.validador(valorProcesado)) {
          resultado.errores.push(`Validación falló para ${config.path}: valor="${valor}"`);
          resultado.exito = false;
          continue;
        }
        
        this.setNestedValue(resultado.datos, campoEstandar, valorProcesado);
        resultado.datos._metadata.campos_mapeados[campoEstandar] = config.path;
        
      } catch (error: any) {
        resultado.datos._metadata.errores_mapeo.push({
          campo: config.path,
          error: error.message,
        });
        resultado.errores.push(`Error procesando ${config.path}: ${error.message}`);
        resultado.exito = false;
      }
    }
    
    if (resultado.datos.fecha.ingreso && resultado.datos.fecha.egreso) {
      resultado.datos.atencion.es_hospitalaria = true;
    }
    if (!resultado.datos.fecha.informe) {
      resultado.datos.fecha.informe = new Date();
    }
    
    return resultado;
  }
}
