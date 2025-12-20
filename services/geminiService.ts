import { GoogleGenAI } from "@google/genai";
import { AnalysisReport, ExtractedData, ScoringRule } from "../types";
import { calculateScore, reEvaluateScore, DEFAULT_SCORING_RULES } from "./scoring-engine";
import { buildCombinedGeminiSchema, buildSystemPrompt } from "../providers";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-2.5-flash-preview-04-17";

export const analyzeReportImage = async (
    base64Data: string, 
    mimeType: string,
    rules: ScoringRule[] = DEFAULT_SCORING_RULES
): Promise<AnalysisReport> => {
  try {
    console.log("Starting analysis with model:", MODEL_NAME);
    const systemPrompt = buildSystemPrompt();
    const responseSchema = buildCombinedGeminiSchema();
    console.log("Schema built, sending request to Gemini...");

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
          { text: "Extrae toda la información siguiendo el esquema JSON. Identifica primero si es METLIFE o GNP basándote en el logotipo y formato del documento. Valida el código CIE-10 contra el diagnóstico." }
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
    const extractedData: ExtractedData = jsonData.extracted;
    console.log("Detected provider:", extractedData.provider);

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
