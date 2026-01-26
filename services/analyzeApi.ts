import { AnalysisReport, ExtractedData, ScoringRule } from "../types";
import { ProviderType } from "../providers";

const API_BASE = '/api';

export interface FileInput {
  base64Data: string;
  mimeType: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
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
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE}/analyze/images`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ files, provider, rules })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || error.details || 'Error al analizar las imágenes');
  }

  return response.json();
};

export const reEvaluateReport = async (
  previousReport: AnalysisReport,
  updatedData: ExtractedData,
  rules: ScoringRule[]
): Promise<AnalysisReport> => {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_BASE}/analyze/re-evaluate`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({ previousReport, updatedData, rules })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
    throw new Error(error.error || error.details || 'Error al re-evaluar el informe');
  }

  return response.json();
};
