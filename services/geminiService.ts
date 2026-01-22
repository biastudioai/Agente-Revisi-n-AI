import { GoogleGenAI } from "@google/genai";
import { AnalysisReport, ExtractedData, ScoringRule } from "../types";
import { calculateScore, reEvaluateScore } from "./scoring-engine";
import { getProviderGeminiSchema, buildProviderSystemPrompt, ProviderType } from "../providers";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

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
  try {
    console.log("Starting analysis with model:", MODEL_NAME);
    console.log("Selected provider:", provider);
    console.log("Number of files to analyze:", files.length);
    
    const responseSchema = getProviderGeminiSchema(provider);
    if (!responseSchema) {
      throw new Error(`No schema available for provider: ${provider}`);
    }
    
    const systemPrompt = buildProviderSystemPrompt(provider);
    console.log("Schema built for provider:", provider, "sending request to Gemini...");

    const imageParts = files.map((file, index) => ({
      inlineData: {
        mimeType: file.mimeType,
        data: file.base64Data
      }
    }));

    const contextMessage = files.length > 1 
      ? `Extrae toda la información del documento de ${files.length} páginas/imágenes siguiendo el esquema JSON. Este es un documento de ${provider}. Las imágenes están en orden de página (1, 2, 3, etc.). Analiza todas las páginas como un solo documento continuo. Valida el código CIE-10 contra el diagnóstico.`
      : `Extrae toda la información del documento siguiendo el esquema JSON. Este es un documento de ${provider}. Valida el código CIE-10 contra el diagnóstico.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: "user",
          parts: [
            { text: systemPrompt },
            ...imageParts,
            { text: contextMessage }
          ]
        }
      ],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: responseSchema
      }
    });

    console.log("Response received from Gemini");
    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    console.log("Parsing JSON response...");
    const jsonData = JSON.parse(text);
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
    
    // POST-PROCESAMIENTO: causa_atencion_audit (MetLife)
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
    
    // POST-PROCESAMIENTO: sexo_audit (MetLife)
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
    
    // POST-PROCESAMIENTO: tipo_estancia_audit (MetLife)
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
    
    // POST-PROCESAMIENTO: causa_atencion_audit (GNP)
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
    
    // POST-PROCESAMIENTO: sexo_audit (GNP)
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
    
    // POST-PROCESAMIENTO: tipo_padecimiento_audit (GNP)
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
    
    // POST-PROCESAMIENTO: tipo_estancia_audit (GNP)
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

    const scoringResult = calculateScore(extractedData, undefined, rules);

    return {
      extracted: extractedData,
      score: scoringResult,
      flags: scoringResult.flags,
      raw_response: text
    };

  } catch (error: any) {
    console.error("Error analyzing report:", error);
    console.error("Error details:", error?.message || error);
    if (error?.response) {
      console.error("API Response error:", error.response);
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
