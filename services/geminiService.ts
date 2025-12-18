
import { GoogleGenAI, Type } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { AnalysisReport, ExtractedData, ScoringRule } from "../types";
import { calculateScore, reEvaluateScore, DEFAULT_SCORING_RULES } from "./scoring-engine";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-3-flash-preview";

export const analyzeReportImage = async (
    base64Data: string, 
    mimeType: string,
    rules: ScoringRule[] = DEFAULT_SCORING_RULES
): Promise<AnalysisReport> => {
  try {
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
          { text: "Extrae toda la información siguiendo el esquema JSON. Asegúrate de identificar si es METLIFE o GNP. Valida el código CIE-10." }
        ]
      },
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            extracted: {
              type: Type.OBJECT,
              properties: {
                provider: { type: Type.STRING, description: "METLIFE, GNP o UNKNOWN" },
                identificacion: {
                  type: Type.OBJECT,
                  properties: {
                    nombres: { type: Type.STRING },
                    edad: { type: Type.STRING },
                    sexo: { type: Type.STRING },
                    peso: { type: Type.STRING },
                    talla: { type: Type.STRING },
                    fecha_primera_atencion: { type: Type.STRING }
                  }
                },
                antecedentes: {
                  type: Type.OBJECT,
                  properties: {
                    historia_clinica_breve: { type: Type.STRING },
                    gineco_g: { type: Type.STRING },
                    gineco_p: { type: Type.STRING },
                    gineco_a: { type: Type.STRING },
                    gineco_c: { type: Type.STRING },
                    personales_patologicos: { type: Type.STRING }
                  }
                },
                padecimiento_actual: {
                  type: Type.OBJECT,
                  properties: {
                    descripcion: { type: Type.STRING },
                    fecha_inicio: { type: Type.STRING },
                    tipo_padecimiento: { type: Type.STRING },
                    causa_etiologia: { type: Type.STRING }
                  }
                },
                diagnostico: {
                  type: Type.OBJECT,
                  properties: {
                    diagnostico_definitivo: { type: Type.STRING },
                    codigo_cie: { type: Type.STRING },
                    fecha_diagnostico: { type: Type.STRING },
                    fecha_inicio_tratamiento: { type: Type.STRING },
                    cie_coherente_con_texto: { type: Type.BOOLEAN },
                    explicacion_incoherencia_cie: { type: Type.STRING }
                  }
                },
                hospital: {
                  type: Type.OBJECT,
                  properties: {
                    nombre_hospital: { type: Type.STRING },
                    ciudad: { type: Type.STRING },
                    estado: { type: Type.STRING },
                    fecha_ingreso: { type: Type.STRING },
                    fecha_intervencion: { type: Type.STRING },
                    fecha_egreso: { type: Type.STRING }
                  }
                },
                medico_tratante: {
                  type: Type.OBJECT,
                  properties: {
                    nombres: { type: Type.STRING },
                    especialidad: { type: Type.STRING },
                    rfc: { type: Type.STRING },
                    cedula_profesional: { type: Type.STRING },
                    honorarios_cirujano: { type: Type.STRING },
                    se_ajusta_tabulador: { type: Type.BOOLEAN }
                  }
                },
                firma: {
                  type: Type.OBJECT,
                  properties: {
                    lugar: { type: Type.STRING },
                    fecha: { type: Type.STRING },
                    nombre_firma: { type: Type.STRING }
                  }
                }
              },
              required: ["provider"]
            }
          },
          required: ["extracted"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    const jsonData = JSON.parse(text);
    const extractedData: ExtractedData = jsonData.extracted;

    // Calcular score usando el motor determinístico
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
