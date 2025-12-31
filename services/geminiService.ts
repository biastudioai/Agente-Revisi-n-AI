import { GoogleGenAI } from "@google/genai";
import { AnalysisReport, ExtractedData, ScoringRule } from "../types";
import { calculateScore, reEvaluateScore, DEFAULT_SCORING_RULES } from "./scoring-engine";
import { getProviderGeminiSchema, buildProviderSystemPrompt, ProviderType } from "../providers";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

export const analyzeReportImage = async (
    base64Data: string, 
    mimeType: string,
    provider: ProviderType,
    rules: ScoringRule[] = DEFAULT_SCORING_RULES
): Promise<AnalysisReport> => {
  try {
    console.log("Starting analysis with model:", MODEL_NAME);
    console.log("Selected provider:", provider);
    
    const responseSchema = getProviderGeminiSchema(provider);
    if (!responseSchema) {
      throw new Error(`No schema available for provider: ${provider}`);
    }
    
    const systemPrompt = buildProviderSystemPrompt(provider);
    console.log("Schema built for provider:", provider, "sending request to Gemini...");

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { text: systemPrompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: `Extrae toda la información del documento siguiendo el esquema JSON. Este es un documento de ${provider}. Valida el código CIE-10 contra el diagnóstico.` }
        ]
      },
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
    
    // Post-procesamiento para MetLife: validar tipo_atencion con tipo_atencion_audit
    if (provider === 'METLIFE' && jsonData.extracted?.medico_tratante?.tipo_atencion_audit) {
      const audit = jsonData.extracted.medico_tratante.tipo_atencion_audit;
      const correctedTipoAtencion: string[] = [];
      
      if (audit.medico_tratante_marcado === true) correctedTipoAtencion.push("Médico tratante");
      if (audit.cirujano_principal_marcado === true) correctedTipoAtencion.push("Cirujano principal");
      if (audit.interconsultante_marcado === true) correctedTipoAtencion.push("Interconsultante");
      if (audit.equipo_quirurgico_marcado === true) correctedTipoAtencion.push("Equipo quirúrgico");
      if (audit.segunda_valoracion_marcado === true) correctedTipoAtencion.push("Segunda valoración");
      
      // Comparar con lo que Gemini puso en tipo_atencion
      const originalTipoAtencion = jsonData.extracted.medico_tratante.tipo_atencion || [];
      if (JSON.stringify(originalTipoAtencion.sort()) !== JSON.stringify(correctedTipoAtencion.sort())) {
        console.log("⚠️ CORRECCIÓN tipo_atencion:");
        console.log("  Original de Gemini:", originalTipoAtencion);
        console.log("  Corregido por audit:", correctedTipoAtencion);
        jsonData.extracted.medico_tratante.tipo_atencion = correctedTipoAtencion;
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
  rules: ScoringRule[] = DEFAULT_SCORING_RULES
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
