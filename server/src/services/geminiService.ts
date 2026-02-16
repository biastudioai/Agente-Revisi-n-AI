import { GoogleGenAI } from "@google/genai";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { AnalysisReport, ExtractedData, ScoringRule } from "../types";
import { calculateScore, reEvaluateScore } from "./scoring-engine";
import { getProviderGeminiSchema, buildProviderSystemPrompt, ProviderType } from "../providers";

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
const LOCATION = process.env.GOOGLE_LOCATION || "us-central1";
const MODEL_NAME = "gemini-3-flash-preview";

let credentialsSetup = false;

function setupCredentials(): void {
  const credentialsEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!credentialsEnv) {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS no está configurado.");
  }
  
  if (credentialsEnv.startsWith('{')) {
    const tempDir = os.tmpdir();
    const credentialsFilePath = path.join(tempDir, 'gcp-credentials.json');
    fs.writeFileSync(credentialsFilePath, credentialsEnv, 'utf8');
    process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsFilePath;
    console.log("Credenciales de GCP escritas a archivo temporal");
  }
}

function validateConfig(): void {
  if (!PROJECT_ID) {
    throw new Error("GOOGLE_PROJECT_ID no está configurado. Por favor configura esta variable de entorno con el ID de tu proyecto de Google Cloud.");
  }
}

let aiClient: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  validateConfig();
  
  if (!credentialsSetup) {
    setupCredentials();
    credentialsSetup = true;
  }
  
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      vertexai: true,
      project: PROJECT_ID!,
      location: LOCATION,
    });
  }
  
  return aiClient;
}

export interface FileInput {
  base64Data: string;
  mimeType: string;
}

export const analyzeReportImage = async (
    base64Data: string, 
    mimeType: string,
    provider: ProviderType,
    rules: ScoringRule[]
): Promise<AnalysisReport> => {
  return analyzeReportImages([{ base64Data, mimeType }], provider, rules);
};

export const analyzeReportImages = async (
    files: FileInput[],
    provider: ProviderType,
    rules: ScoringRule[]
): Promise<AnalysisReport> => {
  const startTime = Date.now();
  try {
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("⏱️  INICIO PROCESAMIENTO DE INFORME");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("Starting analysis with Vertex AI model:", MODEL_NAME);
    console.log("Project:", PROJECT_ID, "Location:", LOCATION);
    console.log("Selected provider:", provider);
    console.log("Number of files to analyze:", files.length);
    
    const schemaStartTime = Date.now();
    const responseSchema = getProviderGeminiSchema(provider);
    if (!responseSchema) {
      throw new Error(`No schema available for provider: ${provider}`);
    }
    
    const systemPrompt = buildProviderSystemPrompt(provider);
    const schemaTime = Date.now() - schemaStartTime;
    console.log(`⏱️  Schema y prompt construidos en: ${schemaTime}ms`);
    console.log("Schema built for provider:", provider, "sending request to Vertex AI...");

    const imageParts = files.map((file) => ({
      inlineData: {
        mimeType: file.mimeType,
        data: file.base64Data
      }
    }));

    const contextMessage = files.length > 1 
      ? `Extrae toda la información del documento de ${files.length} páginas/imágenes siguiendo el esquema JSON. Este es un documento de ${provider}. Las imágenes están en orden de página (1, 2, 3, etc.). Analiza todas las páginas como un solo documento continuo.`
      : `Extrae toda la información del documento siguiendo el esquema JSON. Este es un documento de ${provider}.`;

    const contents = [
      { text: systemPrompt },
      ...imageParts,
      { text: contextMessage }
    ];

    const ai = getAIClient();
    const geminiStartTime = Date.now();
    console.log("⏱️  Enviando solicitud a Gemini...");
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents as any,
      config: {
        temperature: 0.0,
        responseMimeType: "application/json",
        responseSchema: responseSchema as any
      }
    });
    const geminiTime = Date.now() - geminiStartTime;
    console.log(`⏱️  Respuesta de Gemini recibida en: ${geminiTime}ms (${(geminiTime/1000).toFixed(2)}s)`);

    console.log("Response received from Gemini");
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const parseStartTime = Date.now();
    console.log("Parsing JSON response...");
    const jsonData = JSON.parse(text);
    const parseTime = Date.now() - parseStartTime;
    console.log(`⏱️  JSON parseado en: ${parseTime}ms`);
    console.log("📦 JSON COMPLETO DE GEMINI:", jsonData);
    
    if (provider === 'METLIFE' && jsonData.extracted?.medico_tratante?.tipo_atencion_audit) {
      const audit = jsonData.extracted.medico_tratante.tipo_atencion_audit;
      const correctedTipoAtencion: string[] = [];
      
      if (audit.medico_tratante_marcado === true) correctedTipoAtencion.push("Médico tratante");
      if (audit.cirujano_principal_marcado === true) correctedTipoAtencion.push("Cirujano principal");
      if (audit.interconsultante_marcado === true) correctedTipoAtencion.push("Interconsultante");
      if (audit.equipo_quirurgico_marcado === true) correctedTipoAtencion.push("Equipo quirúrgico");
      if (audit.segunda_valoracion_marcado === true) correctedTipoAtencion.push("Segunda valoración");
      
      const originalTipoAtencion = jsonData.extracted.medico_tratante.tipo_atencion || [];
      if (JSON.stringify(originalTipoAtencion.sort()) !== JSON.stringify(correctedTipoAtencion.sort())) {
        console.log("⚠️ CORRECCIÓN tipo_atencion:");
        console.log("  Original de Gemini:", originalTipoAtencion);
        console.log("  Corregido por audit:", correctedTipoAtencion);
        jsonData.extracted.medico_tratante.tipo_atencion = correctedTipoAtencion;
      }
    }
    
    if (provider === 'METLIFE' && jsonData.extracted?.padecimiento_actual?.tipo_padecimiento_audit) {
      const audit = jsonData.extracted.padecimiento_actual.tipo_padecimiento_audit;
      const correctedTipoPadecimiento: string[] = [];
      
      if (audit.congenito_marcado === true) correctedTipoPadecimiento.push("Congénito");
      if (audit.adquirido_marcado === true) correctedTipoPadecimiento.push("Adquirido");
      if (audit.agudo_marcado === true) correctedTipoPadecimiento.push("Agudo");
      if (audit.cronico_marcado === true) correctedTipoPadecimiento.push("Crónico");
      
      const originalTipoPadecimiento = jsonData.extracted.padecimiento_actual.tipo_padecimiento || [];
      if (JSON.stringify(originalTipoPadecimiento.sort()) !== JSON.stringify(correctedTipoPadecimiento.sort())) {
        console.log("⚠️ CORRECCIÓN tipo_padecimiento:");
        console.log("  Original de Gemini:", originalTipoPadecimiento);
        console.log("  Corregido por audit:", correctedTipoPadecimiento);
        jsonData.extracted.padecimiento_actual.tipo_padecimiento = correctedTipoPadecimiento;
      }
    }
    
    if (provider === 'METLIFE' && jsonData.extracted?.identificacion?.causa_atencion_audit) {
      const audit = jsonData.extracted.identificacion.causa_atencion_audit;
      const correctedCausaAtencion: string[] = [];
      
      if (audit.accidente_marcado === true) correctedCausaAtencion.push("Accidente");
      if (audit.enfermedad_marcado === true) correctedCausaAtencion.push("Enfermedad");
      if (audit.embarazo_marcado === true) correctedCausaAtencion.push("Embarazo");
      if (audit.segunda_valoracion_marcado === true) correctedCausaAtencion.push("Segunda valoración");
      
      const originalCausaAtencion = jsonData.extracted.identificacion.causa_atencion || [];
      if (JSON.stringify(originalCausaAtencion.sort()) !== JSON.stringify(correctedCausaAtencion.sort())) {
        console.log("⚠️ CORRECCIÓN causa_atencion (MetLife):");
        console.log("  Original de Gemini:", originalCausaAtencion);
        console.log("  Corregido por audit:", correctedCausaAtencion);
        jsonData.extracted.identificacion.causa_atencion = correctedCausaAtencion;
      }
    }
    
    if (provider === 'METLIFE' && jsonData.extracted?.identificacion?.sexo_audit) {
      const audit = jsonData.extracted.identificacion.sexo_audit;
      const correctedSexo: string[] = [];
      
      if (audit.masculino_marcado === true) correctedSexo.push("Masculino");
      if (audit.femenino_marcado === true) correctedSexo.push("Femenino");
      if (audit.otro_marcado === true) correctedSexo.push("Otro");
      
      const originalSexo = jsonData.extracted.identificacion.sexo || [];
      if (JSON.stringify(originalSexo.sort()) !== JSON.stringify(correctedSexo.sort())) {
        console.log("⚠️ CORRECCIÓN sexo (MetLife):");
        console.log("  Original de Gemini:", originalSexo);
        console.log("  Corregido por audit:", correctedSexo);
        jsonData.extracted.identificacion.sexo = correctedSexo;
      }
    }
    
    if (provider === 'METLIFE' && jsonData.extracted?.hospital?.tipo_estancia_audit) {
      const audit = jsonData.extracted.hospital.tipo_estancia_audit;
      const correctedTipoEstancia: string[] = [];
      
      if (audit.urgencia_marcado === true) correctedTipoEstancia.push("Urgencia");
      if (audit.ingreso_hospitalario_marcado === true) correctedTipoEstancia.push("Ingreso hospitalario");
      if (audit.corta_estancia_marcado === true) correctedTipoEstancia.push("Corta estancia ambulatoria");
      
      const originalTipoEstancia = jsonData.extracted.hospital.tipo_estancia || [];
      if (JSON.stringify(originalTipoEstancia.sort()) !== JSON.stringify(correctedTipoEstancia.sort())) {
        console.log("⚠️ CORRECCIÓN tipo_estancia (MetLife):");
        console.log("  Original de Gemini:", originalTipoEstancia);
        console.log("  Corregido por audit:", correctedTipoEstancia);
        jsonData.extracted.hospital.tipo_estancia = correctedTipoEstancia;
      }
    }
    
    if (provider === 'GNP' && jsonData.extracted?.identificacion?.causa_atencion_audit) {
      const audit = jsonData.extracted.identificacion.causa_atencion_audit;
      const correctedCausaAtencion: string[] = [];
      
      if (audit.accidente_marcado === true) correctedCausaAtencion.push("Accidente");
      if (audit.enfermedad_marcado === true) correctedCausaAtencion.push("Enfermedad");
      if (audit.embarazo_marcado === true) correctedCausaAtencion.push("Embarazo");
      
      const originalCausaAtencion = jsonData.extracted.identificacion.causa_atencion || [];
      if (JSON.stringify(originalCausaAtencion.sort()) !== JSON.stringify(correctedCausaAtencion.sort())) {
        console.log("⚠️ CORRECCIÓN causa_atencion (GNP):");
        console.log("  Original de Gemini:", originalCausaAtencion);
        console.log("  Corregido por audit:", correctedCausaAtencion);
        jsonData.extracted.identificacion.causa_atencion = correctedCausaAtencion;
      }
    }
    
    if (provider === 'GNP' && jsonData.extracted?.identificacion?.sexo_audit) {
      const audit = jsonData.extracted.identificacion.sexo_audit;
      const correctedSexo: string[] = [];
      
      if (audit.masculino_marcado === true) correctedSexo.push("M");
      if (audit.femenino_marcado === true) correctedSexo.push("F");
      
      const originalSexo = jsonData.extracted.identificacion.sexo || [];
      if (JSON.stringify(originalSexo.sort()) !== JSON.stringify(correctedSexo.sort())) {
        console.log("⚠️ CORRECCIÓN sexo (GNP):");
        console.log("  Original de Gemini:", originalSexo);
        console.log("  Corregido por audit:", correctedSexo);
        jsonData.extracted.identificacion.sexo = correctedSexo;
      }
    }
    
    if (provider === 'GNP' && jsonData.extracted?.padecimiento_actual?.tipo_padecimiento_audit) {
      const audit = jsonData.extracted.padecimiento_actual.tipo_padecimiento_audit;
      const correctedTipoPadecimiento: string[] = [];
      
      if (audit.congenito_marcado === true) correctedTipoPadecimiento.push("Congénito");
      if (audit.adquirido_marcado === true) correctedTipoPadecimiento.push("Adquirido");
      if (audit.agudo_marcado === true) correctedTipoPadecimiento.push("Agudo");
      if (audit.cronico_marcado === true) correctedTipoPadecimiento.push("Crónico");
      
      const originalTipoPadecimiento = jsonData.extracted.padecimiento_actual.tipo_padecimiento || [];
      if (JSON.stringify(originalTipoPadecimiento.sort()) !== JSON.stringify(correctedTipoPadecimiento.sort())) {
        console.log("⚠️ CORRECCIÓN tipo_padecimiento (GNP):");
        console.log("  Original de Gemini:", originalTipoPadecimiento);
        console.log("  Corregido por audit:", correctedTipoPadecimiento);
        jsonData.extracted.padecimiento_actual.tipo_padecimiento = correctedTipoPadecimiento;
      }
    }
    
    if (provider === 'GNP' && jsonData.extracted?.hospital?.tipo_estancia_audit) {
      const audit = jsonData.extracted.hospital.tipo_estancia_audit;
      const correctedTipoEstancia: string[] = [];
      
      if (audit.urgencia_marcado === true) correctedTipoEstancia.push("Urgencia");
      if (audit.hospitalaria_marcado === true) correctedTipoEstancia.push("Hospitalaria");
      if (audit.corta_estancia_marcado === true) correctedTipoEstancia.push("Corta estancia / ambulatoria");
      
      const originalTipoEstancia = jsonData.extracted.hospital.tipo_estancia || [];
      if (JSON.stringify(originalTipoEstancia.sort()) !== JSON.stringify(correctedTipoEstancia.sort())) {
        console.log("⚠️ CORRECCIÓN tipo_estancia (GNP):");
        console.log("  Original de Gemini:", originalTipoEstancia);
        console.log("  Corregido por audit:", correctedTipoEstancia);
        jsonData.extracted.hospital.tipo_estancia = correctedTipoEstancia;
      }
    }
    
    const extractedData: ExtractedData = { ...jsonData.extracted, provider };
    console.log("Provider:", extractedData.provider);

    const scoringStartTime = Date.now();
    const scoringResult = calculateScore(extractedData, undefined, rules);
    const scoringTime = Date.now() - scoringStartTime;
    console.log(`⏱️  Cálculo de puntuación en: ${scoringTime}ms`);

    const totalTime = Date.now() - startTime;
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`✅ PROCESAMIENTO COMPLETADO`);
    console.log(`⏱️  TIEMPO TOTAL: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    console.log("───────────────────────────────────────────────────────────────");
    console.log(`   📊 Desglose de tiempos:`);
    console.log(`      - Gemini API: ${geminiTime}ms (${((geminiTime/totalTime)*100).toFixed(1)}%)`);
    console.log(`      - Parsing JSON: ${parseTime}ms`);
    console.log(`      - Scoring: ${scoringTime}ms`);
    console.log(`   📄 Archivos procesados: ${files.length}`);
    console.log(`   🏢 Proveedor: ${provider}`);
    console.log(`   📈 Score final: ${scoringResult.finalScore}/100`);
    console.log("═══════════════════════════════════════════════════════════════");

    return {
      extracted: extractedData,
      score: scoringResult,
      flags: scoringResult.flags,
      raw_response: text
    };

  } catch (error: any) {
    const errorTime = Date.now() - startTime;
    console.error("═══════════════════════════════════════════════════════════════");
    console.error(`❌ ERROR EN PROCESAMIENTO (después de ${errorTime}ms)`);
    console.error(`❌ Provider: ${provider}`);
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    if (error?.response) {
      console.error("API Response error:", JSON.stringify(error.response, null, 2));
    }
    if (error?.errorDetails) {
      console.error("Error details:", JSON.stringify(error.errorDetails, null, 2));
    }
    if (error?.statusDetails) {
      console.error("Status details:", JSON.stringify(error.statusDetails, null, 2));
    }
    throw error;
  }
};

export const analyzeReportWithVisionOcr = async (
    ocrText: string,
    provider: ProviderType,
    rules: ScoringRule[]
): Promise<AnalysisReport> => {
  const startTime = Date.now();
  try {
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("⏱️  INICIO PROCESAMIENTO HÍBRIDO (Vision OCR + Gemini)");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("Starting structured extraction with Vertex AI model:", MODEL_NAME);
    console.log("Project:", PROJECT_ID, "Location:", LOCATION);
    console.log("Selected provider:", provider);
    console.log("OCR text length:", ocrText.length, "characters");
    
    const schemaStartTime = Date.now();
    const responseSchema = getProviderGeminiSchema(provider);
    if (!responseSchema) {
      throw new Error(`No schema available for provider: ${provider}`);
    }
    
    const systemPrompt = buildProviderSystemPrompt(provider);
    const schemaTime = Date.now() - schemaStartTime;
    console.log(`⏱️  Schema y prompt construidos en: ${schemaTime}ms`);

    const contextMessage = `A continuación se presenta el texto extraído mediante OCR de un documento médico de ${provider}. Analiza el texto y extrae toda la información siguiendo el esquema JSON. El texto fue extraído de las imágenes/páginas del documento original.\n\n--- TEXTO OCR EXTRAÍDO ---\n${ocrText}\n--- FIN TEXTO OCR ---\n\nExtrae toda la información disponible del texto anterior siguiendo el esquema JSON proporcionado.`;

    const contents = [
      { text: systemPrompt },
      { text: contextMessage }
    ];

    const ai = getAIClient();
    const geminiStartTime = Date.now();
    console.log("⏱️  Enviando texto OCR a Gemini para estructuración...");
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: contents,
      config: {
        temperature: 0.0,
        responseMimeType: "application/json",
        responseSchema: responseSchema as any
      }
    });
    const geminiTime = Date.now() - geminiStartTime;
    console.log(`⏱️  Respuesta de Gemini recibida en: ${geminiTime}ms (${(geminiTime/1000).toFixed(2)}s)`);

    console.log("Response received from Gemini");
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const parseStartTime = Date.now();
    console.log("Parsing JSON response...");
    const jsonData = JSON.parse(text);
    const parseTime = Date.now() - parseStartTime;
    console.log(`⏱️  JSON parseado en: ${parseTime}ms`);
    console.log("📦 JSON COMPLETO DE GEMINI (Híbrido):", jsonData);
    
    const extractedData: ExtractedData = { ...jsonData.extracted, provider };
    console.log("Provider:", extractedData.provider);

    const scoringStartTime = Date.now();
    const scoringResult = calculateScore(extractedData, undefined, rules);
    const scoringTime = Date.now() - scoringStartTime;
    console.log(`⏱️  Cálculo de puntuación en: ${scoringTime}ms`);

    const totalTime = Date.now() - startTime;
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`✅ PROCESAMIENTO HÍBRIDO COMPLETADO`);
    console.log(`⏱️  TIEMPO TOTAL: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    console.log("───────────────────────────────────────────────────────────────");
    console.log(`   📊 Desglose de tiempos:`);
    console.log(`      - Gemini API (estructuración): ${geminiTime}ms (${((geminiTime/totalTime)*100).toFixed(1)}%)`);
    console.log(`      - Parsing JSON: ${parseTime}ms`);
    console.log(`      - Scoring: ${scoringTime}ms`);
    console.log(`   🏢 Proveedor: ${provider}`);
    console.log(`   📈 Score final: ${scoringResult.finalScore}/100`);
    console.log("═══════════════════════════════════════════════════════════════");

    return {
      extracted: extractedData,
      score: scoringResult,
      flags: scoringResult.flags,
      raw_response: text
    };

  } catch (error: any) {
    const errorTime = Date.now() - startTime;
    console.error("═══════════════════════════════════════════════════════════════");
    console.error(`❌ ERROR EN PROCESAMIENTO HÍBRIDO (después de ${errorTime}ms)`);
    console.error(`❌ Provider: ${provider}`);
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    if (error?.response) {
      console.error("API Response error:", JSON.stringify(error.response, null, 2));
    }
    if (error?.errorDetails) {
      console.error("Error details:", JSON.stringify(error.errorDetails, null, 2));
    }
    if (error?.statusDetails) {
      console.error("Status details:", JSON.stringify(error.statusDetails, null, 2));
    }
    throw error;
  }
};

export const reEvaluateReport = async (
  previousReport: AnalysisReport, 
  updatedData: ExtractedData,
  rules: ScoringRule[]
): Promise<AnalysisReport> => {
    const newScoringResult = reEvaluateScore(
        updatedData, 
        previousReport.score.finalScore,
        rules
    );

    return {
      ...previousReport,
      extracted: updatedData,
      score: newScoringResult,
      flags: newScoringResult.flags
    };
};
