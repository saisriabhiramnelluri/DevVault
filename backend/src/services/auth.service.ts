import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { config } from '../config';
import { sendOTPEmail, sendLoginAlertEmail } from './email.service';

// ── OTP ────────────────────────────────────────────────────────────────────────

function generateOTP(): string {
  return String(crypto.randomInt(100000, 999999));
}

async function hashValue(value: string): Promise<string> {
  return bcrypt.hash(value, 10);
}

async function verifyHash(value: string, hash: string): Promise<boolean> {
  return bcrypt.compare(value, hash);
}

// ── Register ───────────────────────────────────────────────────────────────────

export async function registerUser(email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error('EMAIL_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  // Generate a per-user salt for PBKDF2 key derivation (sent to browser, not a secret)
  const pbkdf2Salt = crypto.randomBytes(32).toString('base64');

  const user = await prisma.user.create({
    data: { email, passwordHash, pbkdf2Salt },
  });

  try {
    // Generate and send OTP for first-time login
    const otp = generateOTP();
    const codeHash = await hashValue(otp);
    const expiresAt = new Date(Date.now() + config.otp.expiresMinutes * 60000);

    await prisma.oTP.create({
      data: { userId: user.id, codeHash, purpose: 'LOGIN', expiresAt },
    });

    await sendOTPEmail(email, otp, 'LOGIN');
  } catch (emailErr) {
    // Rollback user creation if email sending fails so email isn't left stuck in EMAIL_EXISTS state
    await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
    throw emailErr;
  }

  return { userId: user.id, email: user.email };
}

// ── Login Step 1: Password verification ────────────────────────────────────────

export async function initiateLogin(
  email: string,
  password: string,
  ipAddress?: string,
  deviceInfo?: string
) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('INVALID_CREDENTIALS');
  if (user.isLocked) throw new Error('ACCOUNT_LOCKED');
  if (!user.passwordHash) throw new Error('USE_GOOGLE_LOGIN');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const newAttempts = user.failedAttempts + 1;
    const shouldLock = newAttempts >= config.accountLock.maxAttempts;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: newAttempts,
        isLocked: shouldLock,
      },
    });
    throw new Error('INVALID_CREDENTIALS');
  }

  // Reset failed attempts on successful password
  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0 },
  });

  // Invalidate old LOGIN OTPs
  await prisma.oTP.updateMany({
    where: { userId: user.id, purpose: 'LOGIN', used: false },
    data: { used: true },
  });

  // Generate new OTP
  const otp = generateOTP();
  const codeHash = await hashValue(otp);
  const expiresAt = new Date(Date.now() + config.otp.expiresMinutes * 60000);

  await prisma.oTP.create({
    data: { userId: user.id, codeHash, purpose: 'LOGIN', expiresAt },
  });

  await sendOTPEmail(email, otp, 'LOGIN');

  return { userId: user.id };
}

// ── Login Step 2: OTP verification + session creation ─────────────────────────

export async function verifyLoginOTP(
  userId: string,
  code: string,
  ipAddress?: string,
  deviceInfo?: string
) {
  const otps = await prisma.oTP.findMany({
    where: { userId, purpose: 'LOGIN', used: false },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  if (!otps.length) throw new Error('OTP_NOT_FOUND');

  const otpRecord = otps[0];
  if (new Date() > otpRecord.expiresAt) throw new Error('OTP_EXPIRED');

  const valid = await verifyHash(code, otpRecord.codeHash);
  if (!valid) throw new Error('OTP_INVALID');

  // Mark OTP as used
  await prisma.oTP.update({
    where: { id: otpRecord.id },
    data: { used: true },
  });

  // Create session
  const sessionToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
  const expiresAt = new Date(Date.now() + config.session.expiresHours * 60 * 60000);

  await prisma.session.create({
    data: { userId, tokenHash, deviceInfo, ipAddress, expiresAt },
  });

  // Send login alert email (async, don't await to not block response)
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    sendLoginAlertEmail(user.email, ipAddress || 'Unknown', deviceInfo || 'Unknown').catch(() => {});
  }

  // Log audit
  await prisma.auditLog.create({
    data: { userId, action: 'LOGIN', ipAddress, userAgent: deviceInfo },
  });

  const token = jwt.sign({ userId, sessionToken }, config.jwtSecret, {
    expiresIn: '1h',
  });

  return { token, expiresAt };
}

// ── Forgot Password ─────────────────────────────────────────────────────────────

export async function initiateForgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond success (don't leak email existence)
  if (!user) return;

  // Invalidate old PASSWORD_RESET OTPs
  await prisma.oTP.updateMany({
    where: { userId: user.id, purpose: 'PASSWORD_RESET', used: false },
    data: { used: true },
  });

  const otp = generateOTP();
  const codeHash = await hashValue(otp);
  const expiresAt = new Date(Date.now() + config.otp.expiresMinutes * 60000);

  await prisma.oTP.create({
    data: { userId: user.id, codeHash, purpose: 'PASSWORD_RESET', expiresAt },
  });

  await sendOTPEmail(email, otp, 'PASSWORD_RESET');
}

// ── Reset Password ──────────────────────────────────────────────────────────────

export async function resetPassword(email: string, code: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('USER_NOT_FOUND');

  const otps = await prisma.oTP.findMany({
    where: { userId: user.id, purpose: 'PASSWORD_RESET', used: false },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  if (!otps.length) throw new Error('OTP_NOT_FOUND');

  const otpRecord = otps[0];
  if (new Date() > otpRecord.expiresAt) throw new Error('OTP_EXPIRED');

  const valid = await verifyHash(code, otpRecord.codeHash);
  if (!valid) throw new Error('OTP_INVALID');

  // Mark OTP as used
  await prisma.oTP.update({ where: { id: otpRecord.id }, data: { used: true } });

  // New password hash + new PBKDF2 salt (old encrypted data becomes inaccessible)
  const passwordHash = await bcrypt.hash(newPassword, 12);
  const pbkdf2Salt = crypto.randomBytes(32).toString('base64');

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, pbkdf2Salt, failedAttempts: 0, isLocked: false },
  });

  // Clear all encrypted secrets (they were encrypted with the old key)
  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    select: { id: true },
  });
  const projectIds = projects.map((p) => p.id);

  await prisma.envVariable.deleteMany({ where: { projectId: { in: projectIds } } });
  await prisma.account.deleteMany({ where: { projectId: { in: projectIds } } });

  // Revoke all sessions
  await prisma.session.deleteMany({ where: { userId: user.id } });

  // Audit log
  await prisma.auditLog.create({
    data: { userId: user.id, action: 'PASSWORD_RESET' },
  });
}

// ── Session helpers ────────────────────────────────────────────────────────────

export async function validateSession(token: string) {
  let payload: { userId: string; sessionToken: string };
  try {
    payload = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      sessionToken: string;
    };
  } catch {
    throw new Error('INVALID_TOKEN');
  }

  const tokenHash = crypto
    .createHash('sha256')
    .update(payload.sessionToken)
    .digest('hex');

  const session = await prisma.session.findUnique({ where: { tokenHash } });
  if (!session) throw new Error('SESSION_NOT_FOUND');
  if (new Date() > session.expiresAt) {
    await prisma.session.delete({ where: { id: session.id } });
    throw new Error('SESSION_EXPIRED');
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.isLocked) throw new Error('USER_NOT_FOUND');

  return { userId: session.userId, sessionId: session.id, user };
}

export async function logout(sessionId: string, userId: string) {
  await prisma.session.deleteMany({
    where: { id: sessionId, userId },
  });
  await prisma.auditLog.create({
    data: { userId, action: 'LOGOUT' },
  });
}

export async function getSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      deviceInfo: true,
      ipAddress: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}

export async function revokeSession(sessionId: string, userId: string) {
  const session = await prisma.session.findFirst({
    where: { id: sessionId, userId },
  });
  if (!session) throw new Error('SESSION_NOT_FOUND');
  await prisma.session.delete({ where: { id: sessionId } });
}

export async function getPbkdf2Salt(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pbkdf2Salt: true },
  });
  if (!user) throw new Error('USER_NOT_FOUND');
  return user.pbkdf2Salt;
}

// ── Google OAuth ───────────────────────────────────────────────────────────────

export async function handleGoogleLogin(
  googleId: string,
  email: string,
  ipAddress?: string,
  deviceInfo?: string
) {
  let user = await prisma.user.findFirst({
    where: { OR: [{ googleId }, { email }] },
  });

  if (user) {
    if (user.isLocked) throw new Error('ACCOUNT_LOCKED');

    // Link googleId if signed up with email before
    if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, authProvider: 'google' },
      });
    }
  } else {
    // Create new Google user
    const pbkdf2Salt = crypto.randomBytes(32).toString('base64');
    user = await prisma.user.create({
      data: {
        email,
        googleId,
        authProvider: 'google',
        pbkdf2Salt,
      },
    });
  }

  // Create session
  const sessionToken = crypto.randomBytes(64).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
  const expiresAt = new Date(Date.now() + config.session.expiresHours * 60 * 60000);

  await prisma.session.create({
    data: { userId: user.id, tokenHash, deviceInfo, ipAddress, expiresAt },
  });

  // Audit log
  await prisma.auditLog.create({
    data: { userId: user.id, action: 'LOGIN_GOOGLE', ipAddress, userAgent: deviceInfo },
  });

  const token = jwt.sign({ userId: user.id, sessionToken }, config.jwtSecret, {
    expiresIn: '1h',
  });

  return {
    token,
    expiresAt,
    user: {
      id: user.id,
      email: user.email,
      pbkdf2Salt: user.pbkdf2Salt,
      hasVaultPassword: !!(user.encryptedMasterKey || user.passwordHash),
      hasMasterKey: !!user.encryptedMasterKey,
    },
  };
}

// ── Vault Master & Recovery Key Management ─────────────────────────────────────

export async function setupVaultData(
  userId: string,
  params: {
    passwordHash?: string;
    encryptedMasterKey: string;
    masterKeyIv: string;
    recoveryEncryptedMasterKey: string;
    recoveryMasterKeyIv: string;
    recoverySalt: string;
  }
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');

  const updateData: any = {
    encryptedMasterKey: params.encryptedMasterKey,
    masterKeyIv: params.masterKeyIv,
    recoveryEncryptedMasterKey: params.recoveryEncryptedMasterKey,
    recoveryMasterKeyIv: params.recoveryMasterKeyIv,
    recoverySalt: params.recoverySalt,
  };

  if (params.passwordHash) {
    updateData.passwordHash = params.passwordHash;
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  await prisma.auditLog.create({
    data: { userId, action: 'VAULT_SETUP' },
  });
}

export async function getVaultDetails(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      pbkdf2Salt: true,
      encryptedMasterKey: true,
      masterKeyIv: true,
      recoveryEncryptedMasterKey: true,
      recoveryMasterKeyIv: true,
      recoverySalt: true,
      passwordHash: true,
    },
  });
  if (!user) throw new Error('USER_NOT_FOUND');

  return {
    pbkdf2Salt: user.pbkdf2Salt,
    encryptedMasterKey: user.encryptedMasterKey,
    masterKeyIv: user.masterKeyIv,
    recoveryEncryptedMasterKey: user.recoveryEncryptedMasterKey,
    recoveryMasterKeyIv: user.recoveryMasterKeyIv,
    recoverySalt: user.recoverySalt,
    hasMasterKey: !!user.encryptedMasterKey,
    hasPassword: !!user.passwordHash,
  };
}

export async function getRecoveryData(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      pbkdf2Salt: true,
      recoveryEncryptedMasterKey: true,
      recoveryMasterKeyIv: true,
      recoverySalt: true,
    },
  });

  if (!user || !user.recoveryEncryptedMasterKey || !user.recoverySalt) {
    throw new Error('RECOVERY_NOT_AVAILABLE');
  }

  return {
    email: user.email,
    pbkdf2Salt: user.pbkdf2Salt,
    recoveryEncryptedMasterKey: user.recoveryEncryptedMasterKey,
    recoveryMasterKeyIv: user.recoveryMasterKeyIv,
    recoverySalt: user.recoverySalt,
  };
}

export async function recoverVaultData(
  email: string,
  params: {
    passwordHash: string;
    encryptedMasterKey: string;
    masterKeyIv: string;
    newRecoveryEncryptedMasterKey: string;
    newRecoveryMasterKeyIv: string;
    newRecoverySalt: string;
  }
) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('USER_NOT_FOUND');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: params.passwordHash,
      encryptedMasterKey: params.encryptedMasterKey,
      masterKeyIv: params.masterKeyIv,
      recoveryEncryptedMasterKey: params.newRecoveryEncryptedMasterKey,
      recoveryMasterKeyIv: params.newRecoveryMasterKeyIv,
      recoverySalt: params.newRecoverySalt,
      failedAttempts: 0,
      isLocked: false,
    },
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: 'VAULT_RECOVERED' },
  });
}
