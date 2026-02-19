import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middlewares/auth';
import { condicionesGeneralesService } from '../services/condicionesGeneralesService';
import { extractCondicionesGenerales } from '../services/policyExtractionService';
import { FileInput } from '../services/geminiService';

const router = Router();

// GET /api/condiciones — List, optionally filtered by aseguradora
router.get(
  '/',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const aseguradora = req.query.aseguradora as string | undefined;
    const results = await condicionesGeneralesService.list(aseguradora);
    res.json(results);
  })
);

// GET /api/condiciones/:id — Detail
router.get(
  '/:id',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const record = await condicionesGeneralesService.getById(req.params.id);
    if (!record) {
      res.status(404).json({ error: 'Condiciones generales no encontradas' });
      return;
    }
    res.json(record);
  })
);

// POST /api/condiciones/upload — Upload PDF, extract with Gemini, save. Requires ADMIN
router.post(
  '/upload',
  requireAuth,
  requireAdmin,
  expressAsyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { files, aseguradoraCodigo, productName, version, notes } = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: 'Se requiere al menos un archivo' });
      return;
    }

    if (!aseguradoraCodigo || !productName || !version) {
      res.status(400).json({ error: 'Se requiere aseguradoraCodigo, productName y version' });
      return;
    }

    try {
      const { data: conditionsData, rawResponse } = await extractCondicionesGenerales(files as FileInput[]);

      const record = await condicionesGeneralesService.create({
        aseguradoraCodigo,
        productName,
        version,
        conditionsData,
        extractionRawResponse: rawResponse,
        notes,
        createdBy: req.user?.id,
      });

      res.json(record);
    } catch (error: any) {
      console.error('Error extracting condiciones generales:', error);
      res.status(500).json({
        error: 'Error al extraer condiciones generales',
        details: error?.message || 'Error desconocido'
      });
    }
  })
);

// PUT /api/condiciones/:id — Edit extracted data (manual corrections). Requires ADMIN
router.put(
  '/:id',
  requireAuth,
  requireAdmin,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { conditionsData, notes, isActive } = req.body;

    const existing = await condicionesGeneralesService.getById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Condiciones generales no encontradas' });
      return;
    }

    const updated = await condicionesGeneralesService.update(req.params.id, {
      conditionsData,
      notes,
      isActive,
    });

    res.json(updated);
  })
);

// DELETE /api/condiciones/:id — Delete. Requires ADMIN
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const existing = await condicionesGeneralesService.getById(req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Condiciones generales no encontradas' });
      return;
    }

    await condicionesGeneralesService.delete(req.params.id);
    res.json({ success: true });
  })
);

export default router;
