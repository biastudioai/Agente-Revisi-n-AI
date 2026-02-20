import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { requireAuth } from '../middlewares/auth';
import { analyzeReportImages, analyzeReportWithVisionOcr, reEvaluateReport, FileInput } from '../services/geminiService';
import { extractTextWithVisionOcr } from '../services/visionOcrService';
import { ProviderType } from '../providers';
import { ScoringRule, ExtractedData, AnalysisReport } from '../types';
import { validatePolicyCompliance } from '../services/policyValidationService';
import { patientPolicyService } from '../services/patientPolicyService';
import { condicionesGeneralesService } from '../services/condicionesGeneralesService';
import prisma from '../config/database';
import { PatientPolicyData, CondicionesGeneralesData } from '../../../types/policy-types';

const router = Router();

type OcrEngine = 'vertex' | 'vision-ocr';

interface AnalyzeRequest {
  files: FileInput[];
  provider: ProviderType;
  rules: ScoringRule[];
  ocrEngine?: OcrEngine;
}

interface ReEvaluateRequest {
  previousReport: AnalysisReport;
  updatedData: ExtractedData;
  rules: ScoringRule[];
}

const VALID_PROVIDERS = ['GNP', 'METLIFE', 'NYLIFE', 'AXA', 'AXA_2018', 'UNKNOWN'];

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
    const { files, provider, rules, ocrEngine } = req.body as AnalyzeRequest;

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

    const engine: OcrEngine = ocrEngine || 'vertex';

    try {
      let result: AnalysisReport;

      if (engine === 'vision-ocr') {
        console.log(`Analyzing ${files.length} files for provider ${provider} using Vision OCR + Gemini`);
        const ocrText = await extractTextWithVisionOcr(files);
        result = await analyzeReportWithVisionOcr(ocrText, provider, rules);
      } else {
        console.log(`Analyzing ${files.length} files for provider ${provider} using Vertex AI`);
        result = await analyzeReportImages(files, provider, rules);
      }

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

// POST /api/analyze/policy-validate — Cross-validate medical form vs policy
router.post(
  '/policy-validate',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { medicalFormId, patientPolicyId, condicionesGeneralesId } = req.body;

    if (!medicalFormId || !patientPolicyId) {
      res.status(400).json({ error: 'Se requiere medicalFormId y patientPolicyId' });
      return;
    }

    try {
      // Fetch medical form data
      const medicalForm = await prisma.medicalForm.findUnique({
        where: { id: medicalFormId },
      });

      if (!medicalForm) {
        res.status(404).json({ error: 'Formulario médico no encontrado' });
        return;
      }

      // Fetch patient policy
      const patientPolicy = await patientPolicyService.getById(patientPolicyId);
      if (!patientPolicy) {
        res.status(404).json({ error: 'Póliza del paciente no encontrada' });
        return;
      }

      // Optionally fetch condiciones generales
      let condicionesData: CondicionesGeneralesData | undefined;
      if (condicionesGeneralesId) {
        const condiciones = await condicionesGeneralesService.getById(condicionesGeneralesId);
        if (condiciones) {
          condicionesData = condiciones.conditionsData as unknown as CondicionesGeneralesData;
        }
      }

      // Extract data from the medical form
      const formData = medicalForm.formData as any;
      const extractedData: ExtractedData = formData.extracted || formData;
      const medicalReportScore = medicalForm.originalScore || undefined;

      // Run policy validation
      const result = await validatePolicyCompliance(
        extractedData,
        patientPolicy.policyData as unknown as PatientPolicyData,
        condicionesData,
        medicalReportScore
      );

      // Save the result
      const validationResult = await prisma.policyValidationResult.create({
        data: {
          medicalFormId,
          patientPolicyId,
          condicionesGeneralesId: condicionesGeneralesId || null,
          policyComplianceScore: result.policyComplianceScore,
          combinedScore: result.combinedScore ?? null,
          findings: result.findings as any,
        },
      });

      res.json({
        ...result,
        id: validationResult.id,
      });
    } catch (error: any) {
      console.error('Error in policy validation:', error);
      res.status(500).json({
        error: 'Error al validar póliza',
        details: error?.message || 'Error desconocido'
      });
    }
  })
);

export default router;
