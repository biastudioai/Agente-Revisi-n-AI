
import { CONFIG_GNP, CONFIG_METLIFE } from '../config/aseguradora-configs';
import { AseguradoraConfig } from '../types/standardized-schema';

// ============================================
// 📋 PASO 1: PEGA AQUÍ LOS JSONs REALES
// ============================================

// TODO: Reemplaza este objeto con el JSON REAL de GNP que obtengas de Gemini
const gnpRealJson = {
  extracted: {
    provider: "GNP",
    // PEGA AQUÍ EL JSON COMPLETO QUE DEVUELVE GEMINI PARA GNP
    tramite: {},
    identificacion: {},
    antecedentes: {},
    // ... resto de secciones
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
