import { Type } from "./schema-types";
import { ProviderConfig, ProviderRegistry, ProviderType, GeminiSchema } from "./types";
import { METLIFE_CONFIG } from "./metlife.config";
import { GNP_CONFIG } from "./gnp.config";
import { NYLIFE_CONFIG } from "./nylife.config";
import { AXA_2025_CONFIG } from "./axa-2025.config";
import { AXA_2018_CONFIG } from "./axa-2018.config";

const GENERAL_INTELLIGENCE_LAYER = `
═══════════════════════════════════════════════════════════════════════════════
🧠 CAPA DE INTELIGENCIA GENERAL - APLICA A TODOS LOS DOCUMENTOS
═══════════════════════════════════════════════════════════════════════════════

📋 CADENA DE VERIFICACIÓN (CoV) - PROCESO OBLIGATORIO PARA CAMPOS CRÍTICOS

Para los siguientes campos, debes realizar un proceso de pensamiento en 3 pasos:
- Nombres (paciente, médico): nombres, primer_apellido, segundo_apellido
- Diagnósticos: diagnostico_definitivo
- Códigos: codigo_cie  
- Medicamentos: tratamiento.descripcion

🔹 PASO 1 - CAPTURA VISUAL (extraccion_literal):
   Transcribe EXACTAMENTE los caracteres detectados, aunque no tengan sentido.
   Ejemplo: "Amoxisilina" o "Hipertencion" (con errores de ortografía)

🔹 PASO 2 - VALIDACIÓN SEMÁNTICA:
   a) MEDICAMENTOS: Compara contra Vademécum mexicano
      - "Amoxisilina" → "Amoxicilina" (corrección ortográfica)
      - "Metformna" → "Metformina"
      
   b) DIAGNÓSTICOS MÉDICOS: Compara contra CIE-10
      - "hipertencion arterial" → "Hipertensión arterial"
      - "diabetez mellitus" → "Diabetes mellitus"
      
   c) NOMBRES/APELLIDOS: Valida contra onomástica mexicana
      - "Gonzalez" → "González" (acentos)
      - "Peña" mantener como está (nombre común mexicano)
      - Apellidos extranjeros (franceses, alemanes): mantener grafía original si es legible
      
🔹 PASO 3 - FILTRO DE RUIDO (Gibberish):
   Si después del análisis contextual el texto NO tiene sentido fonético NI médico:
   - Marcar valor_final como "[ILEGIBLE]"
   - Ejemplos de gibberish: "x12$", "fkajsl", "///---"
   - NUNCA inventes palabras ni combines caracteres aleatorios

═══════════════════════════════════════════════════════════════════════════════
🎯 JERARQUÍA DE MÉTODOS DE SELECCIÓN (ORDEN DE PRIORIDAD)
═══════════════════════════════════════════════════════════════════════════════

🥇 PRIORIDAD MÁXIMA - CÍRCULO ENVOLVENTE:
   Si una opción de texto está RODEADA por un círculo manual dibujado alrededor,
   ESA opción es la seleccionada, ANULANDO cualquier otra marca (X, ✓) en recuadros.
   El círculo tiene JERARQUÍA MÁXIMA.
   
   Ejemplo visual: Si ves "⭕ Enfermedad ⭕" o texto claramente encerrado en círculo,
   esa es la opción seleccionada aunque haya una X en otra casilla.

🥈 PRIORIDAD 2 - TEXTO SUBRAYADO:
   Una línea horizontal DEBAJO del texto (no cruzando las letras) cuenta como selección.
   
   ⚠️ REGLA DE UNIDAD INDIVISIBLE:
   En opciones compuestas (ej: "Corta estancia / ambulatoria"):
   - Si SOLO "ambulatoria" está subrayada → TODA la opción se considera seleccionada
   - El subrayado de CUALQUIER parte = opción completa seleccionada
   
   📋 CÓMO IDENTIFICAR SUBRAYADO:
   - Línea horizontal debajo del texto (puede ser manuscrita o impresa)
   - NO confundir con texto tachado (línea que CRUZA las letras = anulación)

🥉 PRIORIDAD 3 - CHECKBOXES CON MARCA INTERNA:
   Identificar recuadros (☐, ☑, □, ■, [ ], [X]) con marca visual dentro.
   La opción marcada es la que está más cerca del checkbox marcado.

═══════════════════════════════════════════════════════════════════════════════
🚫 REGLA DE EXCLUSIVIDAD GEOGRÁFICA - NO TRASLADAR INFORMACIÓN
═══════════════════════════════════════════════════════════════════════════════

⚠️ REGLA CRÍTICA: Cada dato debe extraerse SOLO de su coordenada geográfica original.

NO traslades información entre secciones del documento:
- Si el recuadro de "Presión Arterial" en Signos Vitales está VACÍO,
  el campo signos_vitales.presion_arterial debe ser null,
  AUNQUE el dato aparezca escrito en el párrafo de "Exploración Física".

📋 EJEMPLOS:
❌ INCORRECTO: Ver "PA 120/80" en exploración física → llenar signos_vitales.presion_arterial
✅ CORRECTO: signos_vitales.presion_arterial = null (campo vacío en su ubicación)

Cada campo del JSON corresponde a una UBICACIÓN ESPECÍFICA en el formulario.
Respeta la geografía del documento.

═══════════════════════════════════════════════════════════════════════════════
📊 ESTRUCTURA DE AUDITORÍA (_audit) PARA CAMPOS CRÍTICOS
═══════════════════════════════════════════════════════════════════════════════

Para campos con validación semántica, el JSON debe incluir un objeto _audit hermano:

{
  "campo_nombre": "Valor final corregido",
  "campo_nombre_audit": {
    "extraccion_literal": "Lo que vi originalmente (con errores)",
    "correccion_realizada": true,
    "metodo_deteccion": "texto_manuscrito",
    "confianza": "alta"
  }
}

📋 VALORES PERMITIDOS:
- metodo_deteccion: "anclaje_izquierda", "circulo_envolvente", "subrayado", "texto_manuscrito", "checkbox"
- confianza: "alta", "media", "baja"
- correccion_realizada: true (si hubo cambios), false (extracción literal = valor final)

═══════════════════════════════════════════════════════════════════════════════
`;

export const PROVIDER_REGISTRY: ProviderRegistry = {
  METLIFE: METLIFE_CONFIG,
  GNP: GNP_CONFIG,
  NYLIFE: NYLIFE_CONFIG,
  AXA: AXA_2025_CONFIG,
  AXA_2018: AXA_2018_CONFIG
};

export function getProviderConfig(provider: ProviderType): ProviderConfig | null {
  if (provider === 'UNKNOWN') return null;
  return PROVIDER_REGISTRY[provider] || null;
}

export function getProviderTheme(provider: ProviderType) {
  const config = getProviderConfig(provider);
  if (!config) {
    return {
      primary: 'bg-gray-500',
      secondary: 'text-gray-600',
      border: 'border-gray-200',
      light: 'bg-gray-50',
      accent: 'gray'
    };
  }
  return config.theme;
}

function deepMergeSchemas(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const result = { ...target };
  
  for (const [key, value] of Object.entries(source)) {
    if (result[key] && typeof result[key] === 'object' && typeof value === 'object') {
      if (result[key].properties && value.properties) {
        result[key] = {
          ...result[key],
          properties: deepMergeSchemas(result[key].properties, value.properties)
        };
      } else if (!result[key].properties && value.properties) {
        result[key] = value;
      }
    } else if (!result[key]) {
      result[key] = value;
    }
  }
  
  return result;
}

export function buildCombinedGeminiSchema(): GeminiSchema {
  const combinedProperties: Record<string, any> = {
    provider: { 
      type: Type.STRING, 
      description: "Identificador del proveedor: METLIFE, GNP, NYLIFE, AXA, AXA_2018 o UNKNOWN" 
    }
  };

  Object.values(PROVIDER_REGISTRY).forEach(config => {
    const schemaProps = config.geminiSchema.properties.extracted.properties;
    
    Object.entries(schemaProps).forEach(([sectionKey, sectionValue]: [string, any]) => {
      if (sectionKey === 'provider') return;
      
      if (!combinedProperties[sectionKey]) {
        combinedProperties[sectionKey] = JSON.parse(JSON.stringify(sectionValue));
      } else if (sectionValue.properties) {
        combinedProperties[sectionKey] = {
          ...combinedProperties[sectionKey],
          properties: deepMergeSchemas(
            combinedProperties[sectionKey].properties || {},
            sectionValue.properties
          )
        };
      }
    });
  });

  return {
    type: Type.OBJECT,
    properties: {
      extracted: {
        type: Type.OBJECT,
        properties: combinedProperties,
        required: ["provider"]
      }
    },
    required: ["extracted"]
  };
}

export function buildSystemPrompt(): string {
  const identificationRules = Object.values(PROVIDER_REGISTRY)
    .map(config => `- ${config.displayName}: ${config.identificationRules.join(', ')}`)
    .join('\n');

  // Incluir NYLIFE en la descripción del proveedor

  const extractionInstructions = Object.values(PROVIDER_REGISTRY)
    .map(config => `\n### ${config.displayName.toUpperCase()}\n${config.extractionInstructions}`)
    .join('\n');

  return `
🏥 GEMINI: AUDITOR MÉDICO EXPERTO - MODO EXTRACCIÓN TOTAL

OBJETIVO:
Eres un auditor médico especializado en el mercado mexicano. Tu función es extraer datos de informes médicos y devolver un JSON estrictamente válido.

REGLAS DE IDENTIFICACIÓN DE PROVEEDOR:
${identificationRules}

INSTRUCCIONES DE EXTRACCIÓN POR PROVEEDOR:
${extractionInstructions}

REGLAS DE VALIDACIÓN IA:
- CIE-10: Verifica si el código extraído coincide semánticamente con el texto del diagnóstico. Si no coincide, pon 'cie_coherente_con_texto' en false y explica por qué.
- Fechas: Siempre en formato "DD/MM/AAAA".
- Booleanos: Extrae como true/false cuando veas casillas marcadas (Sí/No).

IMPORTANTE:
- No incluyas explicaciones fuera del JSON.
- Si un campo no existe en el documento, deja el valor como cadena vacía "" o null según el tipo.
- Para campos booleanos que no puedas determinar, usa null.
`;
}

export function getProviderGeminiSchema(provider: ProviderType): GeminiSchema | null {
  if (provider === 'UNKNOWN') return null;
  const config = PROVIDER_REGISTRY[provider];
  if (!config) return null;
  return config.geminiSchema;
}

export function getProviderExtractionInstructions(provider: ProviderType): string {
  if (provider === 'UNKNOWN') return '';
  const config = PROVIDER_REGISTRY[provider];
  if (!config) return '';
  return config.extractionInstructions;
}

export function buildProviderSystemPrompt(provider: ProviderType): string {
  const config = PROVIDER_REGISTRY[provider];
  if (!config) return buildSystemPrompt();

  return `
🏥 GEMINI: AUDITOR MÉDICO EXPERTO - MODO EXTRACCIÓN TOTAL

OBJETIVO:
Eres un auditor médico especializado en el mercado mexicano. Tu función es extraer datos de informes médicos y devolver un JSON estrictamente válido.

PROVEEDOR DETECTADO: ${config.displayName.toUpperCase()}

${GENERAL_INTELLIGENCE_LAYER}

INSTRUCCIONES DE EXTRACCIÓN:
${config.extractionInstructions}

PROTOCOLO DE TRANSCRIPCIÓN MANUSCRITA (OBLIGATORIO):
La precisión en la transcripción de texto manuscrito es crítica para la evaluación médica. Sigue este protocolo estrictamente:

1. ANÁLISIS CONTEXTUAL PREVIO:
   Antes de transcribir cualquier palabra manuscrita ambigua, identifica:
   - La especialidad médica del documento (oftalmología, cardiología, etc.)
   - Los diagnósticos mencionados en otras partes del documento
   - Los medicamentos o procedimientos relacionados
   - La sección del formulario donde aparece el texto (antecedentes, diagnóstico, tratamiento)
   
   Usa este contexto para interpretar correctamente palabras difíciles de leer.

2. VALIDACIÓN TERMINOLÓGICA ESTRICTA:
   - Los términos médicos extraídos DEBEN existir en terminología médica estándar mexicana o en la CIE-10.
   - Si transcribes algo como "celeruk" o "cingik", DETENTE. Estos no son términos médicos válidos.
   - Compara visualmente las letras manuscritas contra términos reales que encajen en el contexto.
   - Ejemplo: En un documento de oftalmología, "celeruk" probablemente es "catarata" y "cingik" es "cirugía".

3. PROCESO DE VERIFICACIÓN EN 3 PASOS:
   Paso 1 - TRANSCRIPCIÓN LITERAL: Lee el texto manuscrito e identifica cada carácter visible, aunque no formen palabras coherentes inicialmente.
   
   Paso 2 - CORRELACIÓN CONTEXTUAL: Pregúntate: "¿Este término tiene sentido en el contexto de este informe médico?" Si la respuesta es no, continúa al paso 3.
   
   Paso 3 - CORRECCIÓN FONÉTICA/VISUAL: Busca el término médico real más cercano que:
      a) Tenga una estructura visual similar (letras parecidas)
      b) Sea fonéticamente cercano
      c) Encaje lógicamente en el contexto del documento
      
   Ejemplo de aplicación:
   - Texto manuscrito difícil: "Cx ctrt FACO + LIO"
   - Paso 1: Identificas abreviaturas médicas
   - Paso 2: En contexto oftalmológico, tiene sentido
   - Paso 3: Transcripción correcta: "Cirugía catarata FACO + LIO"

4. MANEJO DE TEXTO ILEGIBLE:
   - Si después de aplicar los 3 pasos anteriores una palabra sigue siendo incomprensible, márcala como [ILEGIBLE].
   - NUNCA inventes palabras ni combines caracteres aleatorios.
   - Es preferible marcar [ILEGIBLE] que introducir términos incorrectos en el sistema.

5. AUTOCORRECCIÓN FINAL (FILTRO DE VALIDACIÓN):
   Antes de generar tu respuesta final, revisa cada término extraído:
   - ¿Existe este término en español médico?
   - ¿Tiene sentido en el contexto del informe?
   - ¿Los nombres de medicamentos corresponden a fármacos reales?
   - ¿Las abreviaturas médicas son estándar en México?
   
   Si detectas ruido visual o palabras sin sentido lingüístico, corrígelas basándote en la morfología de las letras visibles y el contexto clínico.

REGLAS DE RECONOCIMIENTO DE OPCIONES MARCADAS:
En campos de selección (checkboxes, opciones múltiples, botones de radio), sigue estas reglas estrictamente:

1. IDENTIFICACIÓN DE MARCAS DE SELECCIÓN:
   Una opción está seleccionada ÚNICAMENTE si tiene:
   - Un círculo dibujado alrededor del texto
   - Una marca de verificación (✓) dentro o junto a la casilla
   - Una "X" marcada en la casilla
   - La casilla/checkbox rellenada o sombreada
   - Texto subrayado o claramente resaltado
   
2. REGLA DE PROXIMIDAD:
   - NO confundas proximidad visual con selección.
   - Si dos opciones están cerca (ej: "Adquirido" y "Agudo"), analiza cada una individualmente.
   - Una marca en "Adquirido" NO significa que "Agudo" también esté seleccionado.

3. ANÁLISIS INDIVIDUAL:
   - Examina CADA opción por separado.
   - Verifica si tiene una marca clara y deliberada de selección.
   - Si no hay marca visible en una opción, NO la incluyas como seleccionada.

4. EJEMPLOS PRÁCTICOS:
   - "Congénito | (Adquirido) | Agudo | Crónico" → Solo "Adquirido" tiene círculo, respuesta: ["Adquirido"]
   - "✓ Urgencia | Hospitalaria | Corta estancia" → Solo "Urgencia" tiene check, respuesta: ["Urgencia"]
   - "M ☐ | F ☒" → Solo "F" está marcada, respuesta: ["F"]

5. EN CASO DE DUDA:
   - Si una marca es ambigua o podría aplicar a dos opciones cercanas, selecciona solo la opción que tenga la marca más centrada o directa.
   - Nunca asumas selección múltiple si solo hay una marca visible.

REGLAS DE VALIDACIÓN IA:
- CIE-10: Verifica si el código extraído coincide semánticamente con el texto del diagnóstico. Si no coincide, pon 'cie_coherente_con_texto' en false y explica por qué.
- Fechas: Siempre en formato "DD/MM/AAAA".
- Booleanos: Extrae como true/false cuando veas casillas marcadas (Sí/No).

IMPORTANTE:
- No incluyas explicaciones fuera del JSON.
- Si un campo no existe en el documento, deja el valor como cadena vacía "" o null según el tipo.
- Para campos booleanos que no puedas determinar, usa null.
`;
}

/**
 * Extrae recursivamente todos los paths válidos de un geminiSchema
 * @param schema - El geminiSchema de un proveedor
 * @returns Array de strings con todos los paths (ej: ['identificacion.nombres', 'signos_vitales.peso'])
 */
export function extractPathsFromGeminiSchema(schema: GeminiSchema): string[] {
  const paths: string[] = [];
  
  function extractFromProperties(properties: Record<string, any>, prefix: string = '') {
    for (const [key, value] of Object.entries(properties)) {
      if (key === 'provider') continue;
      
      const currentPath = prefix ? `${prefix}.${key}` : key;
      
      if (value.type === Type.OBJECT && value.properties) {
        extractFromProperties(value.properties, currentPath);
      } else if (value.type === Type.ARRAY && value.items?.properties) {
        // Para arrays de objetos, usar notación con índice [0] como representativo
        extractFromProperties(value.items.properties, `${currentPath}[0]`);
      } else {
        paths.push(currentPath);
      }
    }
  }
  
  const extractedProps = schema.properties?.extracted?.properties;
  if (extractedProps) {
    extractFromProperties(extractedProps);
  }
  
  return paths;
}

/**
 * Obtiene todos los paths disponibles por proveedor desde los geminiSchema reales
 * @returns Objeto con paths por proveedor { GNP: string[], METLIFE: string[] }
 */
export function getPathsByProvider(): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  
  for (const [providerId, config] of Object.entries(PROVIDER_REGISTRY)) {
    result[providerId] = extractPathsFromGeminiSchema(config.geminiSchema).sort();
  }
  
  return result;
}

export type { ProviderConfig, ProviderType, ProviderTheme } from "./types";
