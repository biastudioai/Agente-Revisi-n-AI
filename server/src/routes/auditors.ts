import { Router, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { authMiddleware, AuthenticatedRequest, requireBroker } from '../middlewares/auth';
import { createAuditLog, getClientIP } from '../middlewares/audit';
import prisma from '../config/database';
import bcrypt from 'bcrypt';
import { UserRole, PlanType } from '../generated/prisma';
import { getPlanConfig, PLAN_CONFIGS } from '../config/plans';

const router = Router();

router.get('/', authMiddleware, requireBroker, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.rol;

  let auditors;
  
  if (userRole === 'ADMIN') {
    auditors = await prisma.user.findMany({
      where: { rol: UserRole.AUDITOR },
      select: {
        id: true,
        email: true,
        nombre: true,
        createdAt: true,
        parentId: true,
        parent: {
          select: {
            id: true,
            nombre: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    auditors = await prisma.user.findMany({
      where: {
        parentId: userId,
        rol: UserRole.AUDITOR,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  res.json({ auditors });
}));

router.get('/usage', authMiddleware, requireBroker, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.rol;

  const now = new Date();
  const periodYear = now.getFullYear();
  const periodMonth = now.getMonth() + 1;

  let auditorIds: string[];

  if (userRole === 'ADMIN') {
    const auditors = await prisma.user.findMany({
      where: { rol: UserRole.AUDITOR },
      select: { id: true },
    });
    auditorIds = auditors.map(a => a.id);
  } else {
    const auditors = await prisma.user.findMany({
      where: {
        parentId: userId,
        rol: UserRole.AUDITOR,
      },
      select: { id: true },
    });
    auditorIds = auditors.map(a => a.id);
  }

  const usageRecords = await prisma.usageRecord.findMany({
    where: {
      userId: { in: auditorIds },
      periodYear,
      periodMonth,
    },
    include: {
      user: {
        select: {
          id: true,
          nombre: true,
          email: true,
        }
      }
    }
  });

  const formCounts = await prisma.medicalForm.groupBy({
    by: ['userId'],
    where: {
      userId: { in: auditorIds },
      createdAt: {
        gte: new Date(periodYear, periodMonth - 1, 1),
        lt: new Date(periodYear, periodMonth, 1),
      }
    },
    _count: { id: true },
  });

  const formCountMap = new Map(formCounts.map(fc => [fc.userId, fc._count.id]));

  const auditorUsage = usageRecords.map(record => ({
    userId: record.userId,
    nombre: record.user.nombre,
    email: record.user.email,
    reportsUsed: record.reportsUsed,
    reportsFromForms: formCountMap.get(record.userId) || 0,
  }));

  const auditorsWithNoUsage = auditorIds.filter(id => !usageRecords.find(r => r.userId === id));
  for (const auditorId of auditorsWithNoUsage) {
    const auditor = await prisma.user.findUnique({
      where: { id: auditorId },
      select: { id: true, nombre: true, email: true },
    });
    if (auditor) {
      auditorUsage.push({
        userId: auditor.id,
        nombre: auditor.nombre,
        email: auditor.email,
        reportsUsed: 0,
        reportsFromForms: formCountMap.get(auditorId) || 0,
      });
    }
  }

  res.json({
    periodYear,
    periodMonth,
    auditorUsage,
  });
}));

router.get('/limits', authMiddleware, requireBroker, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const userRole = req.user!.rol;

  if (userRole === 'ADMIN') {
    res.json({ maxAuditors: -1, currentAuditors: 0, canAddMore: true, isAdmin: true });
    return;
  }

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['active', 'trialing'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  let maxAuditors = 0;
  let planName = 'Sin plan';

  if (subscription) {
    const planConfig = getPlanConfig(subscription.planType);
    maxAuditors = planConfig.maxAuditors;
    planName = planConfig.name;
  }

  const currentAuditors = await prisma.user.count({
    where: {
      parentId: userId,
      rol: UserRole.AUDITOR,
    },
  });

  res.json({
    maxAuditors,
    currentAuditors,
    canAddMore: currentAuditors < maxAuditors,
    planName,
    isAdmin: false,
  });
}));

router.post('/', authMiddleware, requireBroker, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, nombre } = req.body;
  const parentId = req.user!.id;
  const userRole = req.user!.rol;

  if (!email || !password || !nombre) {
    res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    return;
  }

  if (userRole !== 'ADMIN') {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: parentId,
        status: { in: ['active', 'trialing'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    let maxAuditors = 0;
    if (subscription) {
      const planConfig = getPlanConfig(subscription.planType);
      maxAuditors = planConfig.maxAuditors;
    }

    const currentAuditors = await prisma.user.count({
      where: {
        parentId,
        rol: UserRole.AUDITOR,
      },
    });

    if (currentAuditors >= maxAuditors) {
      res.status(403).json({ 
        error: maxAuditors === 0 
          ? 'Tu plan actual no incluye auditores. Actualiza a Plan Profesional o Empresarial para agregar auditores.'
          : `Has alcanzado el límite de ${maxAuditors} auditores de tu plan. Actualiza tu plan para agregar más.`
      });
      return;
    }
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    res.status(409).json({ error: 'El email ya está registrado' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const auditor = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      nombre,
      rol: UserRole.AUDITOR,
      parentId,
    },
    select: {
      id: true,
      email: true,
      nombre: true,
      createdAt: true,
    },
  });

  await createAuditLog({
    userId: parentId,
    action: 'AUDITOR_CREATED',
    entityId: auditor.id,
    entityType: 'User',
    ipAddress: getClientIP(req),
    metadata: { auditorEmail: auditor.email } as any,
  });

  res.status(201).json({ auditor });
}));

router.put('/:id', authMiddleware, requireBroker, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { nombre, email, password } = req.body;
  const userId = req.user!.id;
  const userRole = req.user!.rol;

  const auditor = await prisma.user.findUnique({
    where: { id },
  });

  if (!auditor) {
    res.status(404).json({ error: 'Auditor no encontrado' });
    return;
  }

  if (userRole !== 'ADMIN' && auditor.parentId !== userId) {
    res.status(403).json({ error: 'No tienes permiso para editar este auditor' });
    return;
  }

  if (auditor.rol !== UserRole.AUDITOR) {
    res.status(400).json({ error: 'Solo puedes editar usuarios con rol de auditor' });
    return;
  }

  const updateData: any = {};
  
  if (nombre) updateData.nombre = nombre;
  
  if (email && email.toLowerCase() !== auditor.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      res.status(409).json({ error: 'El email ya está en uso' });
      return;
    }
    updateData.email = email.toLowerCase();
  }
  
  if (password) {
    if (password.length < 8) {
      res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }
    updateData.passwordHash = await bcrypt.hash(password, 10);
  }

  const updatedAuditor = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      nombre: true,
      createdAt: true,
    },
  });

  await createAuditLog({
    userId,
    action: 'AUDITOR_UPDATED',
    entityId: id,
    entityType: 'User',
    ipAddress: getClientIP(req),
    metadata: { updatedFields: Object.keys(updateData) } as any,
  });

  res.json({ auditor: updatedAuditor });
}));

router.delete('/:id', authMiddleware, requireBroker, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.rol;

  const auditor = await prisma.user.findUnique({
    where: { id },
  });

  if (!auditor) {
    res.status(404).json({ error: 'Auditor no encontrado' });
    return;
  }

  if (userRole !== 'ADMIN' && auditor.parentId !== userId) {
    res.status(403).json({ error: 'No tienes permiso para eliminar este auditor' });
    return;
  }

  if (auditor.rol !== UserRole.AUDITOR) {
    res.status(400).json({ error: 'Solo puedes eliminar usuarios con rol de auditor' });
    return;
  }

  await prisma.user.delete({
    where: { id },
  });

  await createAuditLog({
    userId,
    action: 'AUDITOR_DELETED',
    entityId: id,
    entityType: 'User',
    ipAddress: getClientIP(req),
    metadata: { auditorEmail: auditor.email } as any,
  });

  res.json({ message: 'Auditor eliminado correctamente' });
}));

export default router;
