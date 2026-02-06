import { Type } from "./schema-types";

export type ProviderType = 'GNP' | 'METLIFE' | 'NYLIFE' | 'AXA' | 'UNKNOWN';

export interface ProviderTheme {
  primary: string;
  secondary: string;
  border: string;
  light: string;
  accent: string;
}

export interface FieldDefinition {
  key: string;
  type: typeof Type.STRING | typeof Type.BOOLEAN | typeof Type.NUMBER;
  description?: string;
  required?: boolean;
}

export interface SectionSchema {
  type: typeof Type.OBJECT;
  properties: Record<string, {
    type: typeof Type.STRING | typeof Type.BOOLEAN | typeof Type.NUMBER | typeof Type.OBJECT | typeof Type.ARRAY;
    description?: string;
    properties?: Record<string, any>;
    items?: any;
  }>;
  required?: string[];
}

export interface GeminiSchema {
  type: typeof Type.OBJECT;
  properties: {
    extracted: {
      type: typeof Type.OBJECT;
      properties: Record<string, any>;
      required: string[];
    };
  };
  required: string[];
}

export interface ProviderConfig {
  id: ProviderType;
  name: string;
  displayName: string;
  theme: ProviderTheme;
  identificationRules: string[];
  extractionInstructions: string;
  geminiSchema: GeminiSchema;
  requiredFields: string[];
}

export interface ProviderRegistry {
  GNP: ProviderConfig;
  METLIFE: ProviderConfig;
  NYLIFE: ProviderConfig;
  AXA: ProviderConfig;
  [key: string]: ProviderConfig;
}
