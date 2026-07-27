import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyOTPSchema = z.object({
  userId: z.string().uuid(),
  code: z.string().length(6),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});
export const googleLoginSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
});

export const setupVaultSchema = z.object({
  passwordHash: z.string().optional(),
  encryptedMasterKey: z.string().min(1),
  masterKeyIv: z.string().min(1),
  recoveryEncryptedMasterKey: z.string().min(1),
  recoveryMasterKeyIv: z.string().min(1),
  recoverySalt: z.string().min(1),
});

export const recoverVaultSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string().min(1),
  encryptedMasterKey: z.string().min(1),
  masterKeyIv: z.string().min(1),
  newRecoveryEncryptedMasterKey: z.string().min(1),
  newRecoveryMasterKeyIv: z.string().min(1),
  newRecoverySalt: z.string().min(1),
});
export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  stack: z.array(z.string()).optional(),
});

export const createEnvVarSchema = z.object({
  key: z.string().min(1).max(255).regex(/^[A-Z0-9_]+$/i, 'Key must be alphanumeric with underscores'),
  ciphertext: z.string().min(1),
  iv: z.string().min(1),
  environment: z.enum(['PRODUCTION', 'DEVELOPMENT', 'STAGING', 'TESTING']).optional(),
  category: z.enum(['DATABASE', 'AUTHENTICATION', 'CLOUD', 'PAYMENTS', 'EMAIL', 'STORAGE', 'API', 'OTHER']).optional(),
});

export const bulkEnvVarSchema = z.object({
  variables: z.array(z.object({
    key: z.string().min(1),
    ciphertext: z.string().min(1),
    iv: z.string().min(1),
    environment: z.enum(['PRODUCTION', 'DEVELOPMENT', 'STAGING', 'TESTING']).optional(),
    category: z.enum(['DATABASE', 'AUTHENTICATION', 'CLOUD', 'PAYMENTS', 'EMAIL', 'STORAGE', 'API', 'OTHER']).optional(),
  })).min(1),
});

export const createAccountSchema = z.object({
  serviceName: z.string().min(1).max(100),
  email: z.string().email(),
  username: z.string().max(100).optional(),
  notesCiphertext: z.string().optional(),
  notesIv: z.string().optional(),
});

export const createCommandSchema = z.object({
  title: z.string().min(1).max(100),
  command: z.string().min(1),
  description: z.string().max(500).optional(),
  order: z.number().int().min(0).optional(),
});

export const createDiaryEntrySchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(10000),
  pinned: z.boolean().optional(),
});
