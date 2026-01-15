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

export async function registerUser(data: RegisterData): Promise<AuthResult> {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });

  if (existingUser) {
    throw new Error('Email already registered');
  }

  const passwordHash = await hashPassword(data.password);
  
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      nombre: data.nombre,
      rol: data.rol || UserRole.BROKER,
      parentId: data.parentId,
      aseguradoraId: data.aseguradoraId,
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
    include: {
      parent: true,
    },
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
    },
    expiresAt: session.expiresAt,
  };
}
