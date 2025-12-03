
import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { AnalysisReport, ExtractedData, ScoringRule } from "../types";
import { calculateScore, reEvaluateScore, DEFAULT_SCORING_RULES } from "./scoring-engine";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

function extractJson(text: string): any {
  try {
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    }
    return null;
  } catch (e) {
    console.error("Failed to parse JSON from Gemini response", e);
    return null;
  }
}

export const analyzeReportImage = async (
    base64Data: string, 
    mimeType: string,
    rules: ScoringRule[] = DEFAULT_SCORING_RULES
): Promise<AnalysisReport> => {
  try {
    // 1. Gemini performs OCR and structure mapping ONLY
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { text: SYSTEM_PROMPT },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          },
          { text: "Extrae los datos." }
        ]
      },
      config: {
        temperature: 0.0, // Zero temperature for maximum determinism in extraction
      }
    });

    const text = response.text || "";
    const jsonData = extractJson(text);
    
    if (!jsonData || !jsonData.extracted) {
      throw new Error("No valid JSON found in response");
    }
    
    const extractedData: ExtractedData = jsonData.extracted;

    // 2. JavaScript Engine calculates score deterministically
    const scoringResult = calculateScore(extractedData, undefined, rules);

    return {
      extracted: extractedData,
      score: scoringResult,
      flags: scoringResult.flags,
      raw_response: text
    };

  } catch (error) {
    console.error("Error analyzing report:", error);
    throw error;
  }
};

export const reEvaluateReport = async (
  previousReport: AnalysisReport, 
  updatedData: ExtractedData,
  rules: ScoringRule[] = DEFAULT_SCORING_RULES
): Promise<AnalysisReport> => {
    // 1. JavaScript Engine recalculates score immediately (Sync)
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
