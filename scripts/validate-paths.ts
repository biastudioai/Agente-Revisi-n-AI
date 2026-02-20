
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

const metlifeRealJson = {
    "extracted": {
        "provider": "METLIFE",
        "antecedentes": {
            "antecedentes_quirurgicos": "Ninguno",
            "gineco_a": "",
            "gineco_c": "",
            "gineco_descripcion": "",
            "gineco_g": "",
            "gineco_p": "",
            "historia_clinica_breve": "Dolor abdominal intenso en cuadrante inferior derecho, con náuseas y Fiebre.",
            "otras_afecciones": "",
            "personales_patologicos": "Hipertensión controlada con medicamento"
        },
        "complicaciones": {
            "descripcion": "Ninguna",
            "presento_complicaciones": false
        },
        "diagnostico": {
            "cie_coherente_con_texto": true,
            "codigo_cie": "K36",
            "diagnostico_definitivo": "Apendicitis Aguda",
            "especifique_cual": "",
            "explicacion_incoherencia_cie": "",
            "fecha_diagnostico": "11/12/25",
            "fecha_inicio_tratamiento": "11/12/2025",
            "relacionado_con_otro": false
        },
        "equipo_quirurgico_metlife": {
            "anestesiologo": {
                "cedula_especialidad": "1234567",
                "celular": "5551234567",
                "email": "ana.lopez@hospitalabc.mx",
                "nombre": "Any Lopez Garcia",
                "rfc": "LOGA800IUIABC"
            },
            "otro_1": {
                "cedula_especialidad": "1122334",
                "celular": "5554567890",
                "email": "laura@gmail.com",
                "especialidad": "Instrumentista",
                "nombre": "Laura Mendoza Ruiz",
                "rfc": "MERL900303GHI"
            },
            "otro_2": {
                "cedula_especialidad": "",
                "celular": "",
                "email": "",
                "especialidad": "N/A",
                "nombre": "",
                "rfc": ""
            },
            "primer_ayudante": {
                "cedula_especialidad": "7654321",
                "celular": "5559876543",
                "email": "carlos@hospitalabc.mx",
                "nombre": "Carlos Ramiver Soto",
                "rfc": "RASC850202UEF"
            }
        },
        "exploracion_fisica": {
            "estudios_laboratorio_gabinete": "Rebote positivo en fosa iliaca derecha. Labs: Leucocitosis 15,000/mm². Gabinete: Ultrasonido abdominal confirma apéndice inflamado.",
            "resultados": "Rebote positivo en fosa iliaca derecha. Labs: Leucocitosis 15,000/mm². Gabinete: Ultrasonido abdominal confirma apéndice inflamado."
        },
        "firma": {
            "fecha": "18/12/2025",
            "firma_autografa_detectada": true,
            "lugar": "Ciudad de México",
            "nombre_firma": "María Gonzalez Henrra"
        },
        "hospital": {
            "fecha_egreso": "15/12/2025",
            "fecha_ingreso": "11/12/2025",
            "fecha_intervencion": "10/12/2025",
            "nombre_hospital": "Hospital ABC México",
            "tipo_estancia": "Ingreso hospitalario"
        },
        "identificacion": {
            "causa_atencion": "",
            "edad": "35",
            "fecha_primera_atencion": "10/12/25",
            "nombres": "Juan Pérez Lopez",
            "peso": "80",
            "sexo": "Masculino",
            "talla": "175"
        },
        "info_adicional": {
            "descripcion": "Ninguna"
        },
        "intervencion_qx": {
            "detalle_equipo_especial": "Laparoscópico y Trocar",
            "detalle_insumos": "Grapas y Suturas absorbibles",
            "equipo_especifico": "Apendicectomía Laparoscópica (CPT: 44950)",
            "tecnica": "Incisiones mínimas, extracción de apéndice inflamado vía Laparoscópica",
            "utilizo_equipo_especial": true,
            "utilizo_insumos": true
        },
        "medico_tratante": {
            "cedula_especialidad": "9876543",
            "cedula_profesional": "9876543",
            "celular": "5551112222",
            "convenio_aseguradora": true,
            "correo_electronico": "maria.gonzalez@hospitalabc.mx",
            "domicilio_consultorio": "Av. Insurgentes",
            "especialidad": "Cirugía General",
            "honorarios_anestesiologo": "7,000",
            "honorarios_ayudante": "4,000",
            "honorarios_cirujano": "15,000",
            "honorarios_otro_1": "2,000",
            "honorarios_otro_2": "",
            "nombres": "María Gonzalez Henrra",
            "rfc": "GOHM750404JKL",
            "se_ajusta_tabulador": true,
            "telefono_consultorio": "",
            "tipo_atencion": [
                "Cirujano principal",
                "Médico tratante"
            ],
            "tipo_atencion_audit": {
                "cirujano_principal_marcado": true,
                "equipo_quirurgico_marcado": false,
                "interconsultante_marcado": false,
                "medico_tratante_marcado": true,
                "segunda_valoracion_marcado": false
            }
        },
        "padecimiento_actual": {
            "causa_etiologia": "Infección Bacteriana en apéndice",
            "descripcion": "Dolor abdominal agudo, Fiebre 38.5°C, vomito; evolucionó rápidamente a peritonitis localizada",
            "estado_actual": "Recuperado, sin dolor",
            "fecha_inicio": "10/12/2025",
            "fecha_probable_alta": "15/12/2025",
            "plan_tratamiento": "",
            "seguira_tratamiento": false,
            "tiempo_evolucion": "5 días",
            "tipo_padecimiento": [
                "Adquirido",
                "Agudo"
            ],
            "tipo_padecimiento_audit": {
                "adquirido_marcado": true,
                "agudo_marcado": true,
                "congenito_marcado": false,
                "cronico_marcado": false
            }
        }
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

function validatePath(config: AseguradoraConfig, realJson: any): Array<{
  campoEstandar: string;
  pathConfig: string;
  existe: boolean;
  valorEncontrado?: any;
}> {
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
