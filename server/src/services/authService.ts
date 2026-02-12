import prisma from '../config/database';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateSessionToken, generateResetToken, hashToken, getSessionExpiry, getResetTokenExpiry } from '../utils/token';
import { UserRole, SubscriptionStatus } from '../generated/prisma';
import { getPlanConfig } from '../config/plans';

export interface RegisterData {
  email: string;
  password: string;
  nombre: string;
  rol?: UserRole;
  parentId?: string;
  aseguradoraId?: string;
}

export interface LoginData {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthResult {
  user: {
    id: string;
    email: string;
    nombre: string;
    rol: string;
  };
  sessionToken: string;
  expiresAt: Date;
}

export class NoSubscriptionError extends Error {
  user: {
    id: string;
    email: string;
    nombre: string;
    rol: string;
  };
  sessionToken: string;
  expiresAt: Date;
  code: string = 'NO_SUBSCRIPTION';
  
  constructor(
    user: { id: string; email: string; nombre: string; rol: string },
    sessionToken: string,
    expiresAt: Date
  ) {
    super('No tienes una suscripción activa. Por favor, contrata un plan para acceder a la plataforma.');
    this.user = user;
    this.sessionToken = sessionToken;
    this.expiresAt = expiresAt;
    this.name = 'NoSubscriptionError';
  }
}

export async function registerUser(data: RegisterData): Promise<AuthResult> {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  const passwordHash = await hashPassword(data.password);
  
  const isBrokerRole = !data.rol || data.rol === UserRole.BROKER;
  const trialExpiresAt = isBrokerRole ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined;
  
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      nombre: data.nombre,
      rol: data.rol || UserRole.BROKER,
      parentId: data.parentId,
      aseguradoraId: data.aseguradoraId,
      isTrial: isBrokerRole,
      freeReportsUsed: 0,
      freeReportsLimit: 10,
      trialExpiresAt,
    },
  });

  const sessionToken = generateSessionToken();
  const expiresAt = getSessionExpiry(7);

  await prisma.session.create({
    data: {
      userId: user.id,
      sessionToken,
      expiresAt,
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    },
    sessionToken,
    expiresAt,
  };
}

export async function loginUser(data: LoginData): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValidPassword = await verifyPassword(data.password, user.passwordHash);
  
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  if (user.rol === UserRole.AUDITOR) {
    if (!user.isActive) {
      throw new Error('Tu cuenta de auditor ha sido desactivada. Contacta a tu broker para más información.');
    }

    if (user.parentId) {
      const brokerSubscription = await prisma.subscription.findFirst({
        where: {
          userId: user.parentId,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!brokerSubscription) {
        throw new Error('El broker asociado a tu cuenta no tiene una suscripción activa.');
      }

      const planConfig = getPlanConfig(brokerSubscription.planType);
      if (planConfig.maxAuditors === 0) {
        throw new Error('El plan actual de tu broker no incluye auditores. No puedes acceder a tu cuenta.');
      }
    }
  }

  if (user.rol === UserRole.BROKER) {
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: user.id,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription && !user.isTrial) {
      const sessionToken = generateSessionToken();
      const expiresAt = getSessionExpiry(7);

      await prisma.$transaction(async (tx) => {
        await tx.session.deleteMany({
          where: { userId: user.id },
        });
        await tx.session.create({
          data: {
            userId: user.id,
            sessionToken,
            expiresAt,
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
          },
        });
      });

      throw new NoSubscriptionError(
        {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
        },
        sessionToken,
        expiresAt
      );
    }
  }

  // SINGLE SESSION ENFORCEMENT: Delete all previous sessions and create new one in a transaction
  // This ensures atomic operation - only one active session per user at any time
  // Even under concurrent login attempts, only one session will survive
  const sessionToken = generateSessionToken();
  const expiresAt = getSessionExpiry(7);

  await prisma.$transaction(async (tx) => {
    // Delete all existing sessions for this user
    await tx.session.deleteMany({
      where: { userId: user.id },
    });
    
    // Create the new session
    await tx.session.create({
      data: {
        userId: user.id,
        sessionToken,
        expiresAt,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    },
    sessionToken,
    expiresAt,
  };
}

export async function logoutUser(sessionToken: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { sessionToken },
  });
}

export async function logoutAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({
    where: { userId },
  });
}

export async function requestPasswordReset(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    return null;
  }

  await prisma.passwordReset.deleteMany({
    where: { userId: user.id },
  });

  const resetToken = generateResetToken();
  const tokenHash = hashToken(resetToken);
  const expiresAt = getResetTokenExpiry(1);

  await prisma.passwordReset.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  return resetToken;
}

export async function resetPassword(token: string, newPassword: string): Promise<boolean> {
  const tokenHash = hashToken(token);
  
  const resetRecord = await prisma.passwordReset.findFirst({
    where: {
      tokenHash,
      expiresAt: { gt: new Date() },
    },
  });

  if (!resetRecord) {
    return false;
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordReset.delete({
      where: { id: resetRecord.id },
    }),
    prisma.session.deleteMany({
      where: { userId: resetRecord.userId },
    }),
  ]);

  return true;
}

export async function validateSession(sessionToken: string) {
  const session = await prisma.session.findUnique({
    where: { sessionToken },
    include: { user: true },
  });

  if (!session || new Date() > session.expiresAt) {
    return null;
  }

  return {
    id: session.id,
    sessionToken: session.sessionToken,
    user: {
      id: session.user.id,
      email: session.user.email,
      nombre: session.user.nombre,
      rol: session.user.rol,
      isActive: session.user.isActive,
      parentId: session.user.parentId,
      isTrial: session.user.isTrial,
      freeReportsUsed: session.user.freeReportsUsed,
      freeReportsLimit: session.user.freeReportsLimit,
      trialExpiresAt: session.user.trialExpiresAt,
    },
    expiresAt: session.expiresAt,
  };
}
