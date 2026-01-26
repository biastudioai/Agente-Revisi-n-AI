import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { requireAuth } from '../middlewares/auth';
import { analyzeReportImages, reEvaluateReport, FileInput } from '../services/geminiService';
import { ProviderType } from '../providers';
import { ScoringRule, ExtractedData, AnalysisReport } from '../types';

const router = Router();

interface AnalyzeRequest {
  files: FileInput[];
  provider: ProviderType;
  rules: ScoringRule[];
}

interface ReEvaluateRequest {
  previousReport: AnalysisReport;
  updatedData: ExtractedData;
  rules: ScoringRule[];
}

const VALID_PROVIDERS = ['GNP', 'METLIFE', 'NYLIFE', 'UNKNOWN'];

function validateFiles(files: any[]): string | null {
  if (!Array.isArray(files)) {
    return 'El campo files debe ser un array';
  }
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.base64Data || typeof file.base64Data !== 'string') {
      return `El archivo ${i + 1} no tiene base64Data válido`;
    }
    if (!file.mimeType || typeof file.mimeType !== 'string') {
      return `El archivo ${i + 1} no tiene mimeType válido`;
    }
  }
  return null;
}

function validateRules(rules: any[]): string | null {
  if (!Array.isArray(rules)) {
    return 'El campo rules debe ser un array';
  }
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (!rule.id || !rule.name) {
      return `La regla ${i + 1} no tiene id o name válidos`;
    }
  }
  return null;
}

router.post(
  '/images',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { files, provider, rules } = req.body as AnalyzeRequest;

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No se proporcionaron archivos para analizar' });
      return;
    }

    const filesError = validateFiles(files);
    if (filesError) {
      res.status(400).json({ error: filesError });
      return;
    }

    if (!provider) {
      res.status(400).json({ error: 'No se proporcionó el proveedor' });
      return;
    }

    if (!VALID_PROVIDERS.includes(provider)) {
      res.status(400).json({ error: `Proveedor no válido: ${provider}. Válidos: ${VALID_PROVIDERS.join(', ')}` });
      return;
    }

    if (!rules || rules.length === 0) {
      res.status(400).json({ error: 'No se proporcionaron reglas de validación' });
      return;
    }

    const rulesError = validateRules(rules);
    if (rulesError) {
      res.status(400).json({ error: rulesError });
      return;
    }

    try {
      console.log(`Analyzing ${files.length} files for provider ${provider}`);
      const result = await analyzeReportImages(files, provider, rules);
      res.json(result);
    } catch (error: any) {
      console.error('Error analyzing images:', error);
      
      if (error.message?.includes('GOOGLE_PROJECT_ID')) {
        res.status(503).json({ 
          error: 'El servicio de análisis no está configurado correctamente',
          details: 'Contacta al administrador para configurar las credenciales de Vertex AI'
        });
        return;
      }
      
      res.status(500).json({ 
        error: 'Error al analizar las imágenes',
        details: error?.message || 'Error desconocido'
      });
    }
  })
);

router.post(
  '/re-evaluate',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { previousReport, updatedData, rules } = req.body as ReEvaluateRequest;

    if (!previousReport || !updatedData || !rules) {
      res.status(400).json({ error: 'Faltan datos requeridos para re-evaluar' });
      return;
    }

    try {
      const result = await reEvaluateReport(previousReport, updatedData, rules);
      res.json(result);
    } catch (error: any) {
      console.error('Error re-evaluating report:', error);
      res.status(500).json({ 
        error: 'Error al re-evaluar el informe',
        details: error?.message || 'Error desconocido'
      });
    }
  })
);

export default router;
