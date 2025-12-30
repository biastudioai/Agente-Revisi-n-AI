/**
 * EJEMPLO: Cómo usar normalización en geminiService
 * 
 * IMPORTANTE: Este archivo es SOLO REFERENCIA para implementación futura.
 * NO modifica geminiService.ts actual.
 * 
 * Mantiene retorno original + agrega normalized
 * El Dashboard sigue funcionando sin cambios
 */

/*
import { FieldNormalizer } from './field-mapper';
import type { NormalizationResult } from '../types/standardized-schema';

interface ExtractedDataWithNormalization {
  // Estructura existente (Dashboard la usa)
  paciente?: { nombres?: string; apellido_paterno?: string; apellido_materno?: string; edad?: number; sexo?: string };
  medico?: { nombres?: string; apellido_paterno?: string; cedula?: string; especialidad?: string };
  diagnostico?: { diagnostico_definitivo?: string; codigo_cie10?: string };
  
  // NUEVO: Datos normalizados (para reglas nuevas)
  _normalized?: NormalizationResult;
}

async function extractMedicalReport(
  imageBase64: string,
  selectedProvider: string
): Promise<ExtractedDataWithNormalization> {
  
  const result = await genAI.generateContent([...]);
  const extractedData = JSON.parse(result.response.text());
  
  // AGREGAR: Normalizar sin afectar datos existentes
  try {
    const normalizer = new FieldNormalizer(selectedProvider);
    const normalized = normalizer.normalize(extractedData);
    
    return {
      ...extractedData,  // Mantiene estructura original
      _normalized: normalized,  // Agrega datos normalizados
    };
  } catch (error) {
    console.warn('Normalización falló (no crítico):', error);
    return extractedData;  // Si falla, retorna original
  }
}
*/

export {};
