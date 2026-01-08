import crypto from 'crypto';

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getSessionExpiry(days: number = 7): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}

export function getResetTokenExpiry(hours: number = 1): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + hours);
  return expiry;
}
