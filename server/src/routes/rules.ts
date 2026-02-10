import { Router, Request, Response } from 'express';
import expressAsyncHandler from 'express-async-handler';
import { requireAuth } from '../middlewares/auth';
import {
  getAllActiveRules,
  getRulesForAseguradora,
  getRulesByProvider,
  getRuleById,
  createRule,
  updateRule,
  deactivateRule,
  activateRule,
  countRules,
  ScoringRuleInput,
} from '../services/rulesService';
import {
  getCurrentRulesVersion,
  getVersionByNumber,
  getVersionById,
  getAllVersions,
  createRulesVersion,
  ensureInitialVersion,
  getRecentChangeLogs,
  getChangeLogForRule,
  checkIfRulesChanged,
  getChangesBetweenVersions,
} from '../services/ruleVersioningService';

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
    const validProviders = ['GNP', 'METLIFE', 'NYLIFE', 'AXA'];
    
    if (!validProviders.includes(provider.toUpperCase())) {
      res.status(400).json({ 
        success: false, 
        error: `Proveedor inválido. Valores válidos: ${validProviders.join(', ')}` 
      });
      return;
    }

    try {
      const rules = await getRulesByProvider(provider.toUpperCase());
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

router.get(
  '/versions/current',
  expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const version = await getCurrentRulesVersion();
      if (!version) {
        const newVersion = await ensureInitialVersion();
        res.json({ success: true, data: newVersion });
        return;
      }
      res.json({ success: true, data: version });
    } catch (error: any) {
      console.error('Error fetching current version:', error);
      res.status(500).json({ success: false, error: 'Error al obtener versión actual' });
    }
  })
);

router.get(
  '/versions/all',
  expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const versions = await getAllVersions();
      res.json({ success: true, data: versions, count: versions.length });
    } catch (error: any) {
      console.error('Error fetching all versions:', error);
      res.status(500).json({ success: false, error: 'Error al obtener versiones' });
    }
  })
);

router.get(
  '/versions/by-number/:versionNumber',
  expressAsyncHandler(async (req: Request, res: Response) => {
    const versionNumber = parseInt(req.params.versionNumber, 10);
    
    if (isNaN(versionNumber)) {
      res.status(400).json({ success: false, error: 'Número de versión inválido' });
      return;
    }

    try {
      const version = await getVersionByNumber(versionNumber);
      if (!version) {
        res.status(404).json({ success: false, error: 'Versión no encontrada' });
        return;
      }
      res.json({ success: true, data: version });
    } catch (error: any) {
      console.error('Error fetching version by number:', error);
      res.status(500).json({ success: false, error: 'Error al obtener versión' });
    }
  })
);

router.get(
  '/versions/by-id/:versionId',
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { versionId } = req.params;

    try {
      const version = await getVersionById(versionId);
      if (!version) {
        res.status(404).json({ success: false, error: 'Versión no encontrada' });
        return;
      }
      res.json({ success: true, data: version });
    } catch (error: any) {
      console.error('Error fetching version by id:', error);
      res.status(500).json({ success: false, error: 'Error al obtener versión' });
    }
  })
);

router.post(
  '/versions/create',
  requireAuth,
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { description } = req.body;

    try {
      const version = await createRulesVersion(description);
      res.status(201).json({ success: true, data: version });
    } catch (error: any) {
      console.error('Error creating version:', error);
      res.status(500).json({ success: false, error: 'Error al crear versión' });
    }
  })
);

router.get(
  '/versions/check-changes/:versionId',
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { versionId } = req.params;

    try {
      const result = await checkIfRulesChanged(versionId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Error checking changes:', error);
      res.status(500).json({ success: false, error: 'Error al verificar cambios' });
    }
  })
);

router.get(
  '/versions/changes-between/:fromVersion/:toVersion',
  expressAsyncHandler(async (req: Request, res: Response) => {
    const fromVersion = parseInt(req.params.fromVersion, 10);
    const toVersion = parseInt(req.params.toVersion, 10);
    
    if (isNaN(fromVersion) || isNaN(toVersion)) {
      res.status(400).json({ success: false, error: 'Números de versión inválidos' });
      return;
    }

    try {
      const changes = await getChangesBetweenVersions(fromVersion, toVersion);
      res.json({ success: true, data: changes, count: changes.length });
    } catch (error: any) {
      console.error('Error fetching changes between versions:', error);
      res.status(500).json({ success: false, error: 'Error al obtener cambios' });
    }
  })
);

router.get(
  '/changelog/recent',
  expressAsyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 50;

    try {
      const logs = await getRecentChangeLogs(limit);
      res.json({ success: true, data: logs, count: logs.length });
    } catch (error: any) {
      console.error('Error fetching recent changelog:', error);
      res.status(500).json({ success: false, error: 'Error al obtener historial' });
    }
  })
);

router.get(
  '/changelog/rule/:ruleId',
  expressAsyncHandler(async (req: Request, res: Response) => {
    const { ruleId } = req.params;

    try {
      const logs = await getChangeLogForRule(ruleId);
      res.json({ success: true, data: logs, count: logs.length });
    } catch (error: any) {
      console.error('Error fetching rule changelog:', error);
      res.status(500).json({ success: false, error: 'Error al obtener historial de regla' });
    }
  })
);

export default router;
