import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { requireAuth, AuthenticatedRequest } from '../middlewares/auth';
import { patientPolicyService } from '../services/patientPolicyService';
import { extractPatientPolicy } from '../services/policyExtractionService';
import { FileInput } from '../services/geminiService';

const router = Router();

// POST /api/policies/upload — Upload patient policy, extract, save
router.post(
  '/upload',
  requireAuth,
  expressAsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { files, aseguradoraCodigo, medicalFormId } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: 'Se requiere al menos un archivo' });
      return;
    }

    if (!aseguradoraCodigo) {
      res.status(400).json({ error: 'Se requiere aseguradoraCodigo' });
      return;
    }

    try {
      const { data: policyData, rawResponse } = await extractPatientPolicy(files as FileInput[]);

      const record = await patientPolicyService.create({
        userId: req.user!.id,
        aseguradoraCodigo,
        policyData,
        medicalFormId,
        extractionRawResponse: rawResponse,
      });

      res.json(record);
    } catch (error: any) {
      console.error('Error extracting patient policy:', error);
      res.status(500).json({
        error: 'Error al extraer datos de la póliza',
        details: error?.message || 'Error desconocido'
      });
    }
  })
);

// GET /api/policies/:id — Get policy with extracted data
router.get(
  '/:id',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const record = await patientPolicyService.getById(req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Póliza no encontrada' });
      return;
    }
    res.json(record);
  })
);

// PUT /api/policies/:id — Edit extracted data (manual corrections)
router.put(
  '/:id',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { policyData, medicalFormId } = req.body;

    const existing = await patientPolicyService.getById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Póliza no encontrada' });
      return;
    }

    const updated = await patientPolicyService.update(req.params.id, {
      policyData,
      medicalFormId,
    });

    res.json(updated);
  })
);

// DELETE /api/policies/:id — Delete
router.delete(
  '/:id',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const existing = await patientPolicyService.getById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Póliza no encontrada' });
      return;
    }

    await patientPolicyService.delete(req.params.id);
    res.json({ success: true });
  })
);

export default router;
