import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { requireAuth } from '../middlewares/auth';
import {
  getAllActiveRules,
  getRulesForAseguradora,
  getRuleById,
  createRule,
  updateRule,
  deactivateRule,
  activateRule,
  countRules,
  ScoringRuleInput,
} from '../services/rulesService';

const router = Router();

router.get(
  '/',
  expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const rules = await getAllActiveRules();
      res.json({ success: true, data: rules, count: rules.length });
    } catch (error: any) {
      console.error('Error fetching rules:', error);
      res.status(500).json({ success: false, error: 'Error al obtener reglas' });
    }
  })
);

router.get(
  '/aseguradora/:provider',
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { provider } = req.params;
    const validProviders = ['GNP', 'METLIFE', 'NYLIFE'];
    
    if (!validProviders.includes(provider.toUpperCase())) {
      res.status(400).json({ 
        success: false, 
        error: `Proveedor inválido. Valores válidos: ${validProviders.join(', ')}` 
      });
      return;
    }

    try {
      const rules = await getRulesForAseguradora(provider.toUpperCase() as 'GNP' | 'METLIFE' | 'NYLIFE');
      res.json({ success: true, data: rules, count: rules.length });
    } catch (error: any) {
      console.error('Error fetching rules for provider:', error);
      res.status(500).json({ success: false, error: 'Error al obtener reglas' });
    }
  })
);

router.get(
  '/stats',
  expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const stats = await countRules();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      console.error('Error fetching rule stats:', error);
      res.status(500).json({ success: false, error: 'Error al obtener estadísticas' });
    }
  })
);

router.get(
  '/:ruleId',
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { ruleId } = req.params;

    try {
      const rule = await getRuleById(ruleId);
      if (!rule) {
        res.status(404).json({ success: false, error: 'Regla no encontrada' });
        return;
      }
      res.json({ success: true, data: rule });
    } catch (error: any) {
      console.error('Error fetching rule:', error);
      res.status(500).json({ success: false, error: 'Error al obtener regla' });
    }
  })
);

router.post(
  '/',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const ruleData = req.body as ScoringRuleInput;

    if (!ruleData.ruleId || !ruleData.name || !ruleData.level || !ruleData.points) {
      res.status(400).json({ 
        success: false, 
        error: 'Faltan campos requeridos: ruleId, name, level, points' 
      });
      return;
    }

    try {
      const rule = await createRule({
        ...ruleData,
        isCustom: true,
      });
      res.status(201).json({ success: true, data: rule });
    } catch (error: any) {
      console.error('Error creating rule:', error);
      if (error.code === 'P2002') {
        res.status(409).json({ success: false, error: 'Ya existe una regla con ese ID' });
        return;
      }
      res.status(500).json({ success: false, error: 'Error al crear regla' });
    }
  })
);

router.put(
  '/:ruleId',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { ruleId } = req.params;
    const updates = req.body;

    try {
      const rule = await updateRule(ruleId, updates);
      if (!rule) {
        res.status(404).json({ success: false, error: 'Regla no encontrada' });
        return;
      }
      res.json({ success: true, data: rule });
    } catch (error: any) {
      console.error('Error updating rule:', error);
      res.status(500).json({ success: false, error: 'Error al actualizar regla' });
    }
  })
);

router.post(
  '/:ruleId/deactivate',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { ruleId } = req.params;

    try {
      const success = await deactivateRule(ruleId);
      if (!success) {
        res.status(404).json({ success: false, error: 'Regla no encontrada' });
        return;
      }
      res.json({ success: true, message: 'Regla desactivada' });
    } catch (error: any) {
      console.error('Error deactivating rule:', error);
      res.status(500).json({ success: false, error: 'Error al desactivar regla' });
    }
  })
);

router.post(
  '/:ruleId/activate',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { ruleId } = req.params;

    try {
      const success = await activateRule(ruleId);
      if (!success) {
        res.status(404).json({ success: false, error: 'Regla no encontrada' });
        return;
      }
      res.json({ success: true, message: 'Regla activada' });
    } catch (error: any) {
      console.error('Error activating rule:', error);
      res.status(500).json({ success: false, error: 'Error al activar regla' });
    }
  })
);

export default router;
