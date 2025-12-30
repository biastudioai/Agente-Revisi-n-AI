
import { CONFIG_GNP, CONFIG_METLIFE } from '../config/aseguradora-configs';
import { AseguradoraConfig } from '../types/standardized-schema';

// ============================================
// 📋 PASO 1: PEGA AQUÍ LOS JSONs REALES
// ============================================

// JSON REAL de GNP procesado por Gemini
const gnpRealJson = {
    "extracted": {
        "provider": "GNP",
        "antecedentes": {
            "gineco_obstetricos": "N/A",
            "perinatales": "N/A",
            "personales_no_patologicos": "No tabaquismo Alcohol 1 vez por semana",
            "personales_patologicos": "Diabetes desde hace 2 años"
        },
        "complicaciones": {
            "descripcion": "",
            "fecha_inicio": "",
            "presento_complicaciones": false
        },
        "diagnostico": {
            "cie_coherente_con_texto": false,
            "diagnostico_definitivo": "Apendicitis Aguda",
            "especifique_cual": "",
            "explicacion_incoherencia_cie": "No se proporcionó un código CIE-10 en el documento para verificar la coherencia.",
            "fecha_diagnostico": "03/12/2025",
            "relacionado_con_otro": false
        },
        "estudios": {
            "estudios_realizados": "Biometría hemática 03/12/25: Leucocitosis 15,800 con neutrofilia. Ultrasonido abdominal 03/12/2025: Apéndice inflamado de 9 mm, líquido periceal compatible con apendicitis aguda"
        },
        "exploracion_fisica": {
            "fecha": "",
            "resultados": "Abdomen doloroso a la palpación en Fosa iliaca derecha, signo de Rousing positivo, rebote positivo, defensa muscular localizada, Resto sin alteraciones"
        },
        "firma": {
            "firma_autografa_detectada": true,
            "lugar_fecha": "Ciudad de México 04/12/2025",
            "nombre_firma": "Dr Jose Luis Hernandez Morales"
        },
        "hospital": {
            "ciudad": "CDMX",
            "estado": "CDMX",
            "fecha_ingreso": "05/12/2025",
            "nombre_hospital": "Hospital Angeles Pedregal",
            "tipo_estancia": "Hospitalaria"
        },
        "identificacion": {
            "causa_atencion": "Enfermedad",
            "edad": "34",
            "nombres": "Luis Alberto",
            "primer_apellido": "Garcia",
            "segundo_apellido": "Ramirez",
            "sexo": "F"
        },
        "info_adicional": {
            "descripcion": "Paciente estable, indicación, quirúrgica urgente diferida a programada por respuesta parcial a antibióticos."
        },
        "intervencion_qx": {
            "equipo_especifico": "Equipo de laparoscopia (torre de video HD, trocares 5-10-12mm, clipadora, bolsa de extracción)",
            "fechas": "05/12/2025",
            "tecnica": ""
        },
        "medico_tratante": {
            "cedula_especialidad": "11234567",
            "cedula_profesional": "8765432",
            "celular": "55 12345678",
            "convenio_gnp": true,
            "correo_electronico": "dr.hernandez@cirugia.com",
            "especialidad": "Cirugia General",
            "hubo_interconsulta": false,
            "nombres": "Jose Luis",
            "ppto_honorarios": "$45,000",
            "primer_apellido": "Hernandez",
            "se_ajusta_tabulador": false,
            "segundo_apellido": "Morales",
            "telefono_consultorio": "558-555-1234",
            "tipo_participacion": "Cirujano",
            "tipo_participacion_otra": ""
        },
        "metadata": {
            "existe_coherencia_clinica": true,
            "observacion_coherencia": ""
        },
        "otros_medicos_texto": "Ana Karen Sanchez Gamer|Anestesiologia|49876543|$18,000; Miguel Angel Torres Vesa|Cirugia General|7654321|$12,000",
        "padecimiento_actual": {
            "descripcion": "Dolor abdominal intenso en Fosa Iliaca derecha de inicio súbito hace 48 hrs. Acompañado de náuseas, vómito y Fiebre de 38.5℃",
            "fecha_inicio": "02/12/2025",
            "tipo_padecimiento": [
                "Agudo"
            ]
        },
        "signos_vitales": {
            "altura": "1.75",
            "peso": "78",
            "presion_arterial": "130/85",
            "pulso": "96",
            "respiracion": "20",
            "temperatura": "38.4"
        },
        "tramite": {
            "indemnizacion": false,
            "numero_poliza": "",
            "programacion_cirugia": true,
            "programacion_medicamentos": false,
            "programacion_servicios": false,
            "reembolso": false,
            "reporte_hospitalario": false
        },
        "tratamiento": {
            "descripcion": "Apendicectomia laparoscópica Fecha inicio (cirugía): 05/12/2025 Medicamentos pre y postoperatorios: -Ceftriaxona 15 IV c/24hrs -Ketorolaco 30mg IV c/8hrs sos dolor -Metronidazol 500mg IV c/8hrs -Paracetamol 1g IV c/8hrs",
            "fecha_inicio": "05/12/2025"
        }
    }
};

// TODO: Reemplaza este objeto con el JSON REAL de MetLife que obtengas de Gemini
const metlifeRealJson = {
  extracted: {
    provider: "METLIFE",
    // PEGA AQUÍ EL JSON COMPLETO QUE DEVUELVE GEMINI PARA METLIFE
    identificacion: {},
    antecedentes: {},
    // ... resto de secciones
  }
};

// ============================================
// 🔍 FUNCIONES DE VALIDACIÓN
// ============================================

function getValueByPath(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

function validatePath(config: AseguradoraConfig, realJson: any): {
  campoEstandar: string;
  pathConfig: string;
  existe: boolean;
  valorEncontrado?: any;
} {
  const resultados: any[] = [];
  
  for (const [campoEstandar, mapping] of Object.entries(config.mappings)) {
    const pathCompleto = `extracted.${mapping.path}`;
    const valor = getValueByPath(realJson, pathCompleto);
    const existe = valor !== undefined;
    
    resultados.push({
      campoEstandar,
      pathConfig: mapping.path,
      existe,
      valorEncontrado: existe ? valor : undefined
    });
  }
  
  return resultados as any;
}

function getAllPathsFromJson(obj: any, prefix = ''): string[] {
  const paths: string[] = [];
  
  if (obj === null || typeof obj !== 'object') {
    return paths;
  }
  
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    
    const currentPath = prefix ? `${prefix}.${key}` : key;
    paths.push(currentPath);
    
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      paths.push(...getAllPathsFromJson(obj[key], currentPath));
    }
  }
  
  return paths;
}

function findUnmappedPaths(config: AseguradoraConfig, realJson: any): string[] {
  const mappedPaths = Object.values(config.mappings).map(m => m.path);
  const allPaths = getAllPathsFromJson(realJson.extracted);
  
  return allPaths.filter(path => !mappedPaths.includes(path));
}

// ============================================
// 📊 REPORTE VISUAL
// ============================================

function printReport(providerName: string, config: AseguradoraConfig, realJson: any) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 VALIDACIÓN DE PATHS - ${providerName}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const validaciones = validatePath(config, realJson);
  
  let correctos = 0;
  let incorrectos = 0;
  
  console.log('🔍 PATHS DEL CHECKLIST:\n');
  
  for (const val of validaciones) {
    const status = val.existe ? '✅' : '❌';
    const mensaje = val.existe 
      ? `${status} ${val.campoEstandar} → ${val.pathConfig}`
      : `${status} ${val.campoEstandar} → ${val.pathConfig} (NO EXISTE)`;
    
    console.log(mensaje);
    
    if (val.existe) {
      correctos++;
    } else {
      incorrectos++;
    }
  }
  
  console.log(`\n📊 RESUMEN:`);
  console.log(`   ✅ Paths correctos: ${correctos}/${validaciones.length}`);
  console.log(`   ❌ Paths faltantes: ${incorrectos}/${validaciones.length}`);
  
  const unmapped = findUnmappedPaths(config, realJson);
  
  if (unmapped.length > 0) {
    console.log(`\n⚠️  CAMPOS EN JSON REAL QUE NO ESTÁN MAPEADOS (${unmapped.length}):\n`);
    unmapped.forEach(path => console.log(`   • ${path}`));
  } else {
    console.log(`\n✅ Todos los campos del JSON están mapeados`);
  }
  
  console.log(`\n${'='.repeat(60)}\n`);
}

// ============================================
// 🚀 EJECUCIÓN
// ============================================

console.log('\n🔬 VALIDADOR DE PATHS - AUDITOR MÉDICO IA\n');

// Validar GNP
printReport('GNP', CONFIG_GNP, gnpRealJson);

// Validar MetLife
printReport('METLIFE', CONFIG_METLIFE, metlifeRealJson);

console.log('✅ Validación completada.\n');
console.log('📝 SIGUIENTE PASO:');
console.log('   1. Abre la consola del navegador');
console.log('   2. Procesa un documento GNP → copia el JSON completo');
console.log('   3. Pégalo en gnpRealJson (línea 10 de este archivo)');
console.log('   4. Repite para MetLife → pega en metlifeRealJson (línea 18)');
console.log('   5. Ejecuta: npx ts-node scripts/validate-paths.ts');
console.log('   6. Revisa qué paths marcan ❌');
console.log('   7. Corrige config/aseguradora-configs.ts\n');
