import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthenticatedRequest } from './auth';
import { Prisma } from '../generated/prisma';

export type AuditAction = 
  | 'LOGIN'
  | 'LOGOUT'
  | 'REGISTER'
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET_COMPLETE'
  | 'VIEW_FORM'
  | 'CREATE_FORM'
  | 'EDIT_JSON'
  | 'UPDATE_FORM_STATUS'
  | 'DELETE_FORM'
  | 'UPLOAD_PDF'
  | 'DELETE_PDF';

interface AuditLogParams {
  userId?: string | null;
  action: AuditAction;
  entityId?: string;
  entityType?: string;
  ipAddress?: string;
  metadata?: Prisma.InputJsonValue | null;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        entityId: params.entityId || null,
        entityType: params.entityType || null,
        ipAddress: params.ipAddress || null,
        metadata: params.metadata || null,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}

export function getClientIP(req: AuthenticatedRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

export function auditMiddleware(action: AuditAction, entityType?: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const originalJson = res.json.bind(res);

    res.json = function (body: unknown) {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = (req.params?.id || (body as Record<string, unknown>)?.id) as string | undefined;
        
        createAuditLog({
          userId: req.user?.id,
          action,
          entityId,
          entityType,
          ipAddress: getClientIP(req),
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
          } as Prisma.InputJsonValue,
        });
      }
      return originalJson(body);
    };

    next();
  };
}
