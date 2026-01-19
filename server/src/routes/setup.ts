import { Router, Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import { hashPassword } from '../utils/password';
import prisma from '../config/database';
import { UserRole } from '../generated/prisma';

const router = Router();

const adminSetupSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
});

const validateAdminToken = (req: Request, res: Response, next: Function) => {
  const token = req.headers['x-admin-token'];
  const expectedToken = process.env.ADMIN_SETUP_TOKEN;

  if (!expectedToken) {
    res.status(500).json({ error: 'ADMIN_SETUP_TOKEN no configurado en el servidor' });
    return;
  }

  if (!token || token !== expectedToken) {
    res.status(401).json({ error: 'Token de administrador inválido o no proporcionado' });
    return;
  }

  next();
};

router.post('/admin', validateAdminToken, asyncHandler(async (req: Request, res: Response) => {
  const parseResult = adminSetupSchema.safeParse(req.body);

  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    res.status(400).json({ error: firstError.message });
    return;
  }

  const { email, password, nombre } = parseResult.data;

  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    res.status(409).json({ error: 'Este email ya está registrado' });
    return;
  }

  const passwordHash = await hashPassword(password);

  const admin = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      nombre,
      rol: UserRole.ADMIN,
      isActive: true,
    },
  });

  res.status(201).json({
    message: 'Administrador creado exitosamente',
    admin: {
      id: admin.id,
      email: admin.email,
      nombre: admin.nombre,
      rol: admin.rol,
    },
  });
}));

export default router;
