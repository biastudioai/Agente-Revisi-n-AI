# Evaluador Médico IA

## Overview

This is an AI-powered medical report evaluator for Mexican insurance companies (GNP and MetLife). The application uses Google's Gemini AI to extract data from medical report images/PDFs, validate the extracted information against configurable scoring rules, and provide pre-approval recommendations for insurance claims.

The system processes medical forms by:
1. Detecting the insurance provider (GNP or MetLife) based on document formatting
2. Extracting structured data fields (patient info, diagnosis, treatment, hospitalization, etc.)
3. Validating extracted data against provider-specific and general scoring rules
4. Generating a compliance score with detailed flags for issues found
5. Allowing manual corrections with real-time re-evaluation

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 19 with TypeScript
- **Styling**: Tailwind CSS (loaded via CDN in index.html)
- **Icons**: Lucide React for consistent iconography
- **Build Tool**: Vite with React plugin

### Core Components
- `App.tsx` - Main application orchestrator managing state for file uploads, analysis results, and rule configuration
- `Dashboard.tsx` - Multi-tab form interface displaying extracted data organized by medical sections (patient ID, history, diagnosis, hospitalization, etc.)
- `FileUpload.tsx` - Handles PDF/image uploads with drag-and-drop support
- `PdfViewer.tsx` - PDF rendering with annotation capabilities using pdf.js and pdf-lib
- `ScoreCard.tsx` - Visual scoring display with categorized issue flags
- `RuleConfigurator.tsx` - Modal for adjusting scoring rule weights and levels

### Provider Registry Pattern
The application uses a config-driven architecture for multi-provider support:

- `providers/index.ts` - Central registry combining provider configurations
- `providers/types.ts` - TypeScript interfaces for provider configs, themes, and schemas
- `providers/metlife.config.ts` - MetLife-specific extraction instructions and Gemini schema
- `providers/gnp.config.ts` - GNP-specific extraction instructions and Gemini schema

This pattern allows adding new insurance providers by creating a new config file without modifying core logic.

### AI Integration
- `services/geminiService.ts` - Interfaces with Google Gemini AI for document analysis
- Uses structured JSON output with provider-specific response schemas
- Temperature set to 0.1 for consistent extractions
- Supports re-evaluation with updated data

### Scoring Engine
- `services/scoring-engine.ts` - Rule-based validation system with `getReglasParaAseguradora()` function
- Rules organized in separate files:
  - `services/scoring-rules-general.ts` - REGLAS_GENERALES (3 reglas para todas las aseguradoras)
  - `services/scoring-rules-gnp.ts` - REGLAS_GNP (3 reglas específicas GNP)
  - `services/scoring-rules-metlife.ts` - REGLAS_METLIFE (3 reglas específicas MetLife)
- Rules categorized by severity: CRÍTICO, IMPORTANTE, MODERADO, DISCRETO
- Provider-targeted rules (ALL, METLIFE, GNP)
- Calculates final score based on rule violations
- Returns detailed flags with affected fields for UI highlighting

### Rule Configuration UI
- `components/RuleConfigurator.tsx` - Modal mejorado con:
  - Tabs para alternar entre "Generales" y "Específicas"
  - Dropdown para seleccionar aseguradora (GNP/METLIFE) en tab Específicas
  - Badges visuales mostrando categoría de cada regla (GENERAL/GNP/METLIFE/CUSTOM)
  - Botón "Crear Nueva Regla" para agregar reglas personalizadas
  - Botones de editar/eliminar para reglas personalizadas (CUSTOM)

### Editable Rules System (NEW)
Sistema de reglas editables que permite crear y modificar reglas de validación desde la UI:

- `services/rule-validator.ts` - Motor de validación con:
  - 21 operadores agrupados en 5 categorías:
    - **Existencia**: IS_EMPTY, IS_NOT_EMPTY, REQUIRES, IF_THEN
    - **Comparación**: EQUALS, NOT_EQUALS, GREATER_THAN, LESS_THAN
    - **Fechas**: DATE_MISSING, DATE_INVALID, IS_DATE, DATE_BEFORE, DATE_AFTER
    - **Formatos**: IS_NUMBER, IS_EMAIL, IS_RFC, IS_PHONE, REGEX
    - **Multi-campo**: MUTUALLY_EXCLUSIVE, ONE_OF_REQUIRED, ALL_REQUIRED
  - Todos los operadores retornan `true` cuando detectan un PROBLEMA
  - Soporte para lógica AND/OR simple (sin anidamiento)
  - Preview en tiempo real contra datos actuales

- `components/RuleEditor.tsx` - Modal de edición con:
  - Campos de metadatos (nombre, descripción, nivel, penalización)
  - Constructor visual de condiciones
  - Selector de operador lógico (AND/OR)
  - Panel de preview con indicadores ⚠️ DETECTADO / ✓ OK
  - **Selector de múltiples aseguradoras** (checkboxes para GNP, METLIFE, TODAS)
  - **Mapeo de paths por aseguradora** (fieldMappings) cuando hay múltiples proveedores seleccionados
  - **Nombre de campo normalizado** con auto-población basada en paths comunes (respeta ediciones manuales del usuario)

### Multi-Provider Field Mapping System (NEW)
Sistema que permite crear reglas que aplican a múltiples aseguradoras con paths diferentes:

- **providerTargets**: Array de aseguradoras a las que aplica la regla (['GNP', 'METLIFE'])
- **fieldMappings**: Objeto que mapea cada aseguradora a su path específico
  ```typescript
  fieldMappings: {
    GNP: ['signos_vitales.peso'],
    METLIFE: ['identificacion.peso']
  }
  ```
- **Retrocompatibilidad**: Las reglas antiguas con `providerTarget` (string único) siguen funcionando
- **UI mejorada**: Checkboxes para selección múltiple, sección de mapeo de paths visible solo cuando hay múltiples proveedores
- **Validación inteligente**: El motor de validación usa el path correcto según el `data.provider` del informe
- **Autocomplete dinámico**: Los paths en el autocomplete se extraen directamente del geminiSchema real de cada aseguradora usando `extractPathsFromGeminiSchema()` y `getPathsByProvider()` en `providers/index.ts`, garantizando que solo se muestren paths válidos para cada proveedor
- **Nombre de campo normalizado**: Campo opcional `normalizedFieldName` que:
  - Se auto-genera basándose en segmentos comunes de los paths mapeados
  - Respeta ediciones manuales del usuario (no sobrescribe si fue editado)
  - Se limpia automáticamente al volver a un solo proveedor o ALL

- **Persistencia**: Reglas personalizadas guardadas en localStorage
- **Migración Completada**: Todas las 9 reglas del sistema (3 generales + 3 GNP + 3 MetLife) han sido migradas de funciones `validator` hardcodeadas a arrays de `conditions` editables
- **Badges**: Reglas del sistema muestran badge "SISTEMA", reglas personalizadas muestran "CUSTOM"
- **Edición Universal**: Todas las reglas (sistema y custom) pueden ser editadas desde la UI

### Data Flow
```
PDF/Image Upload → Provider Detection (PDF text extraction) → User Confirmation
→ Gemini Extraction (provider-specific schema) → Scoring Engine 
→ Dashboard Display → Manual Edits → Re-evaluation
```

### Provider Detection
- `services/providerDetection.ts` - Automatic provider detection from PDF text
  - Extracts text from first 2 pages using pdf.js
  - Searches for provider keywords (e.g., "MetLife", "GNP", "Grupo Nacional Provincial")
  - Returns confidence level (high/medium/low)
  - Falls back to manual selection for images or undetected providers

### Provider Selection UI
- `components/ProviderSelector.tsx` - Manual/automatic provider selection
  - Dynamically loads providers from PROVIDER_REGISTRY
  - Shows detection confidence when automatic detection succeeds
  - Requires explicit selection before analysis begins

### Type System
- `types.ts` - Comprehensive TypeScript interfaces for:
  - ExtractedData (all medical form fields)
  - ScoringRule and ScoringResult
  - Provider-specific structures (TramiteData, IdentificacionData, etc.)
  - AnalysisReport combining extraction + scoring

### Normalization Layer (Fase 1 - Infraestructura)
Sistema de normalización para mapear campos de diferentes aseguradoras a un schema estándar:

- `types/standardized-schema.ts` - Interfaces del schema estándar universal:
  - StandardizedMedicalReport (estructura normalizada)
  - NormalizationResult (resultado con raw + datos normalizados)
  - AseguradoraConfig (configuración de mapeo por aseguradora)

- `config/aseguradora-configs.ts` - Configuraciones de mapeo:
  - CONFIG_GNP: Mapeos de campos GNP → schema estándar
  - CONFIG_METLIFE: Mapeos de campos MetLife → schema estándar
  - ASEGURADORAS_CONFIG: Registro central de aseguradoras

- `services/field-mapper.ts` - Clase FieldNormalizer:
  - Normaliza JSON crudo a schema estándar
  - Retorna AMBOS: raw (compatibilidad) + datos normalizados
  - Incluye parsers, validadores y auditoría de mapeo

- `config/PATH_VALIDATION_CHECKLIST.md` - Checklist para validar paths contra documentos reales
- `MIGRATION_GUIDE.md` - Guía de migración de Fase 1 a Fase 2+
- `services/geminiService.EXAMPLE.ts` - Referencia para integración futura

**Estado**: Infraestructura lista, pendiente validación con documentos reales

## External Dependencies

### AI/ML Services
- **Google Gemini AI** (`@google/genai`) - Document analysis and structured data extraction
  - Requires `API_KEY` environment variable (Gemini API key)
  - Uses model `gemini-2.5-flash` (stable version)
  - Provider-specific schemas loaded dynamically to avoid schema size limits

### PDF Processing
- **pdf.js** (`pdfjs-dist@3.11.174`) - PDF rendering in browser
  - Worker loaded from CDN
- **pdf-lib** (`pdf-lib@1.17.1`) - PDF modification and annotation

### UI Dependencies
- **React** (`react@19.2.0`, `react-dom@19.2.0`) - Core UI framework
- **Lucide React** (`lucide-react@0.554.0`) - Icon library
- **Tailwind CSS** - Loaded via CDN, not as npm dependency

### Development
- **Vite** - Build tool and dev server (port 5000)
- **TypeScript** - Type checking with bundler module resolution