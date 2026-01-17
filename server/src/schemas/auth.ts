import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string()
    .email('Correo electrónico inválido')
    .max(255, 'El correo es demasiado largo')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña es demasiado larga')
    .regex(/[A-Za-z]/, 'La contraseña debe contener al menos una letra')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
  nombre: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre es demasiado largo')
    .trim(),
  rol: z.enum(['BROKER', 'AUDITOR']).optional().default('BROKER'),
});

export const loginSchema = z.object({
  email: z.string()
    .email('Correo electrónico inválido')
    .max(255, 'El correo es demasiado largo')
    .transform(val => val.toLowerCase().trim()),
  password: z.string()
    .min(1, 'La contraseña es requerida')
    .max(128, 'La contraseña es demasiado larga'),
});

export const passwordResetRequestSchema = z.object({
  email: z.string()
    .email('Correo electrónico inválido')
    .max(255, 'El correo es demasiado largo')
    .transform(val => val.toLowerCase().trim()),
});

export const passwordResetConfirmSchema = z.object({
  token: z.string()
    .min(1, 'Token es requerido')
    .max(256, 'Token inválido'),
  newPassword: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña es demasiado larga')
    .regex(/[A-Za-z]/, 'La contraseña debe contener al menos una letra')
    .regex(/[0-9]/, 'La contraseña debe contener al menos un número'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmSchema>;
