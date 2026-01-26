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

router.post(
  '/images',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { files, provider, rules } = req.body as AnalyzeRequest;

    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No se proporcionaron archivos para analizar' });
      return;
    }

    if (!provider) {
      res.status(400).json({ error: 'No se proporcionó el proveedor' });
      return;
    }

    if (!rules || rules.length === 0) {
      res.status(400).json({ error: 'No se proporcionaron reglas de validación' });
      return;
    }

    try {
      console.log(`Analyzing ${files.length} files for provider ${provider}`);
      const result = await analyzeReportImages(files, provider, rules);
      res.json(result);
    } catch (error: any) {
      console.error('Error analyzing images:', error);
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
