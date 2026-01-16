import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { UserRole, SubscriptionStatus } from '../generated/prisma';
import { getPlanConfig } from '../config/plans';

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

    if (session.user.rol === UserRole.AUDITOR) {
      if (!session.user.isActive) {
        await prisma.session.delete({ where: { id: session.id } });
        res.status(403).json({ 
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
          res.status(403).json({ 
            error: 'El broker asociado a tu cuenta no tiene una suscripción activa.',
            code: 'BROKER_NO_SUBSCRIPTION'
          });
          return;
        }

        const planConfig = getPlanConfig(brokerSubscription.planType);
        if (planConfig.maxAuditors === 0) {
          await prisma.session.delete({ where: { id: session.id } });
          res.status(403).json({ 
            error: 'El plan actual de tu broker no incluye auditores.',
            code: 'PLAN_NO_AUDITORS'
          });
          return;
        }
      }
    }

    if (session.user.rol === UserRole.BROKER) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId: session.user.id,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription) {
        await prisma.session.deleteMany({ where: { id: session.id } });
        res.status(403).json({ 
          error: 'No tienes una suscripción activa. Por favor, contrata un plan para acceder a la plataforma.',
          code: 'NO_SUBSCRIPTION'
        });
        return;
      }
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

export async function authMiddlewareAllowNoSubscription(
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
      await prisma.session.deleteMany({ where: { id: session.id } });
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

export const requireAuth = authMiddleware;
export const requireAuthAllowNoSubscription = authMiddlewareAllowNoSubscription;
export const requireAdmin = requireRole('ADMIN');
export const requireAseguradora = requireRole('ADMIN', 'ASEGURADORA');
export const requireBroker = requireRole('ADMIN', 'ASEGURADORA', 'BROKER');
export const requireAuditor = requireRole('ADMIN', 'ASEGURADORA', 'BROKER', 'AUDITOR');
