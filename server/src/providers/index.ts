import { Type } from "./schema-types";
import { ProviderConfig, ProviderRegistry, ProviderType, GeminiSchema } from "./types";
import { METLIFE_CONFIG } from "./metlife.config";
import { GNP_CONFIG } from "./gnp.config";
import { NYLIFE_CONFIG } from "./nylife.config";

export const PROVIDER_REGISTRY: ProviderRegistry = {
  METLIFE: METLIFE_CONFIG,
  GNP: GNP_CONFIG,
  NYLIFE: NYLIFE_CONFIG
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
      description: "Identificador del proveedor: METLIFE, GNP, NYLIFE o UNKNOWN" 
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

INSTRUCCIONES DE EXTRACCIÓN:
${config.extractionInstructions}

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
