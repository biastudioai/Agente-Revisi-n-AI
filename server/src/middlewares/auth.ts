import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    nombre: string;
    rol: string;
  };
  sessionId?: string;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionToken = req.cookies?.session_token || req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      res.status(401).json({ error: 'No session token provided' });
      return;
    }

    const session = await prisma.session.findUnique({
      where: { sessionToken },
      include: { user: true },
    });

    if (!session) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

    if (new Date() > session.expiresAt) {
      await prisma.session.delete({ where: { id: session.id } });
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      nombre: session.user.nombre,
      rol: session.user.rol,
    };
    req.sessionId = session.id;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    if (!roles.includes(req.user.rol)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
