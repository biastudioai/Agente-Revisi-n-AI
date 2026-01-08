import { Router, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { 
  registerUser, 
  loginUser, 
  logoutUser, 
  requestPasswordReset, 
  resetPassword,
  validateSession
} from '../services/authService';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { createAuditLog, getClientIP } from '../middlewares/audit';

const router = Router();

router.post('/register', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, nombre, rol } = req.body;

  if (!email || !password || !nombre) {
    res.status(400).json({ error: 'Email, password, and nombre are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  try {
    const result = await registerUser({ email, password, nombre, rol });

    await createAuditLog({
      userId: result.user.id,
      action: 'REGISTER',
      entityId: result.user.id,
      entityType: 'User',
      ipAddress: getClientIP(req),
    });

    res.cookie('session_token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: result.expiresAt,
    });

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
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  try {
    const result = await loginUser({ email, password });

    await createAuditLog({
      userId: result.user.id,
      action: 'LOGIN',
      entityId: result.user.id,
      entityType: 'User',
      ipAddress: getClientIP(req),
    });

    res.cookie('session_token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: result.expiresAt,
    });

    res.json({
      message: 'Login successful',
      user: result.user,
    });
  } catch (error) {
    if ((error as Error).message === 'Invalid credentials') {
      res.status(401).json({ error: 'Invalid credentials' });
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
  const { email } = req.body;

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const resetToken = await requestPasswordReset(email);

  await createAuditLog({
    userId: null,
    action: 'PASSWORD_RESET_REQUEST',
    entityType: 'User',
    ipAddress: getClientIP(req),
    metadata: { email },
  });

  res.json({ 
    message: 'If the email exists, a reset link has been sent',
    ...(process.env.NODE_ENV === 'development' && resetToken ? { resetToken } : {}),
  });
}));

router.post('/password-reset/confirm', asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    res.status(400).json({ error: 'Token and new password are required' });
    return;
  }

  if (newPassword.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

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

  res.json({ valid: true, user: session.user, expiresAt: session.expiresAt });
}));

export default router;
