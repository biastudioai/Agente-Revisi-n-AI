import { Router, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { z } from 'zod';
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  requestPasswordReset, 
  resetPassword,
  validateSession,
  NoSubscriptionError
} from '../services/authService';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { createAuditLog, getClientIP } from '../middlewares/audit';
import { sendPasswordResetEmail } from '../services/emailService';
import prisma from '../config/database';
import { 
  registerSchema, 
  loginSchema, 
  passwordResetRequestSchema, 
  passwordResetConfirmSchema 
} from '../schemas/auth';

const router = Router();
const isProduction = process.env.NODE_ENV === 'production';

const getCookieOptions = (expiresAt: Date) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'strict' as const : 'lax' as const,
  expires: expiresAt,
  path: '/',
});

router.post('/register', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = registerSchema.safeParse(req.body);
  
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    res.status(400).json({ error: firstError.message });
    return;
  }

  const { email, password, nombre, rol } = parseResult.data;

  try {
    const result = await registerUser({ email, password, nombre, rol });

    await createAuditLog({
      userId: result.user.id,
      action: 'REGISTER',
      entityId: result.user.id,
      entityType: 'User',
      ipAddress: getClientIP(req),
    });

    res.cookie('session_token', result.sessionToken, getCookieOptions(result.expiresAt));

    res.status(201).json({
      message: 'User registered successfully',
      user: result.user,
    });
  } catch (error) {
    if ((error as Error).message === 'Email already registered') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    throw error;
  }
}));

router.post('/login', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = loginSchema.safeParse(req.body);
  
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    res.status(400).json({ error: firstError.message });
    return;
  }

  const { email, password } = parseResult.data;

  try {
    const ipAddress = getClientIP(req);
    const userAgent = req.headers['user-agent'] || undefined;
    
    const result = await loginUser({ email, password, ipAddress, userAgent });

    await createAuditLog({
      userId: result.user.id,
      action: 'LOGIN',
      entityId: result.user.id,
      entityType: 'User',
      ipAddress,
      metadata: { singleSessionEnforced: true } as any,
    });

    res.cookie('session_token', result.sessionToken, getCookieOptions(result.expiresAt));

    res.json({
      message: 'Login successful',
      user: result.user,
    });
  } catch (error) {
    if (error instanceof NoSubscriptionError) {
      res.cookie('session_token', error.sessionToken, getCookieOptions(error.expiresAt));
      
      res.status(403).json({ 
        error: error.message,
        code: error.code,
        user: error.user
      });
      return;
    }
    const errorMessage = (error as Error).message;
    if (errorMessage === 'Invalid credentials') {
      res.status(401).json({ error: 'Credenciales inválidas' });
      return;
    }
    if (errorMessage.includes('auditor') || errorMessage.includes('broker') || errorMessage.includes('plan')) {
      res.status(403).json({ error: errorMessage });
      return;
    }
    throw error;
  }
}));

router.post('/logout', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const sessionToken = req.cookies?.session_token || req.headers.authorization?.replace('Bearer ', '');

  if (sessionToken) {
    await logoutUser(sessionToken);
  }

  await createAuditLog({
    userId: req.user?.id,
    action: 'LOGOUT',
    entityId: req.user?.id,
    entityType: 'User',
    ipAddress: getClientIP(req),
  });

  res.clearCookie('session_token');
  res.json({ message: 'Logged out successfully' });
}));

router.post('/password-reset/request', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = passwordResetRequestSchema.safeParse(req.body);
  
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    res.status(400).json({ error: firstError.message });
    return;
  }

  const { email } = parseResult.data;
  const resetToken = await requestPasswordReset(email);

  let emailSent = false;
  let emailError: string | undefined;

  if (resetToken) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { nombre: true },
    });

    const result = await sendPasswordResetEmail(email, resetToken, user?.nombre || 'Usuario');
    emailSent = result.success;
    emailError = result.error;
  }

  await createAuditLog({
    userId: null,
    action: 'PASSWORD_RESET_REQUEST',
    entityType: 'User',
    ipAddress: getClientIP(req),
    metadata: { email, emailSent, emailError } as any,
  });

  if (resetToken && !emailSent) {
    res.status(500).json({ 
      error: 'No se pudo enviar el correo de recuperación. Por favor intenta más tarde.',
    });
    return;
  }

  res.json({ 
    message: 'Si el correo existe, recibirás un enlace para restablecer tu contraseña.',
  });
}));

router.post('/password-reset/confirm', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const parseResult = passwordResetConfirmSchema.safeParse(req.body);
  
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0];
    res.status(400).json({ error: firstError.message });
    return;
  }

  const { token, newPassword } = parseResult.data;
  const success = await resetPassword(token, newPassword);

  if (!success) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
    return;
  }

  await createAuditLog({
    userId: null,
    action: 'PASSWORD_RESET_COMPLETE',
    entityType: 'User',
    ipAddress: getClientIP(req),
  });

  res.json({ message: 'Password reset successfully' });
}));

router.get('/me', authMiddleware, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
}));

router.get('/validate', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const sessionToken = req.cookies?.session_token || req.headers.authorization?.replace('Bearer ', '');

  if (!sessionToken) {
    res.status(401).json({ valid: false });
    return;
  }

  const session = await validateSession(sessionToken);

  if (!session) {
    res.status(401).json({ valid: false });
    return;
  }

  const { UserRole, SubscriptionStatus } = await import('../generated/prisma');
  const { getPlanConfig } = await import('../config/plans');

  if (session.user.rol === UserRole.AUDITOR) {
    if (!session.user.isActive) {
      await prisma.session.delete({ where: { id: session.id } });
      res.clearCookie('session_token');
      res.status(403).json({ 
        valid: false, 
        error: 'Tu cuenta de auditor ha sido desactivada. Contacta a tu broker para más información.',
        code: 'AUDITOR_DEACTIVATED'
      });
      return;
    }

    if (session.user.parentId) {
      const brokerSubscription = await prisma.subscription.findFirst({
        where: {
          userId: session.user.parentId,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!brokerSubscription) {
        await prisma.session.delete({ where: { id: session.id } });
        res.clearCookie('session_token');
        res.status(403).json({ 
          valid: false, 
          error: 'El broker asociado a tu cuenta no tiene una suscripción activa.',
          code: 'BROKER_NO_SUBSCRIPTION'
        });
        return;
      }

      const planConfig = getPlanConfig(brokerSubscription.planType);
      if (planConfig.maxAuditors === 0) {
        await prisma.session.delete({ where: { id: session.id } });
        res.clearCookie('session_token');
        res.status(403).json({ 
          valid: false, 
          error: 'El plan actual de tu broker no incluye auditores.',
          code: 'PLAN_NO_AUDITORS'
        });
        return;
      }
    }
  }

  res.json({ valid: true, user: session.user, expiresAt: session.expiresAt });
}));

export default router;
