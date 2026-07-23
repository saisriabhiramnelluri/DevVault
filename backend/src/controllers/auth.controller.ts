import { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { param } from '../utils/param';

function getDeviceInfo(req: Request): string {
  return req.headers['user-agent'] || 'Unknown';
}

function getIpAddress(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'Unknown'
  );
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.registerUser(email, password);
    res.status(201).json({
      message: 'Registration successful. Check your email for OTP.',
      userId: result.userId,
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'EMAIL_EXISTS') {
      res.status(409).json({ error: 'EMAIL_EXISTS', message: 'Email already registered' });
      return;
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Registration failed' });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await authService.initiateLogin(
      email,
      password,
      getIpAddress(req),
      getDeviceInfo(req)
    );
    res.json({ message: 'OTP sent to your email', userId: result.userId });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'ACCOUNT_LOCKED') {
      res.status(423).json({ error: 'ACCOUNT_LOCKED', message: 'Account is locked due to too many failed attempts. Contact support.' });
      return;
    }
    if (err.message === 'USE_GOOGLE_LOGIN') {
      res.status(400).json({ error: 'USE_GOOGLE_LOGIN', message: 'This account was created using Google OAuth. Please sign in with Google.' });
      return;
    }
    res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
  }
}

export async function verifyOTP(req: Request, res: Response): Promise<void> {
  try {
    const { userId, code } = req.body;
    const result = await authService.verifyLoginOTP(
      userId,
      code,
      getIpAddress(req),
      getDeviceInfo(req)
    );
    res.json({
      message: 'Login successful',
      token: result.token,
      expiresAt: result.expiresAt,
    });
  } catch (error: unknown) {
    const err = error as Error;
    const errorMap: Record<string, { status: number; message: string }> = {
      OTP_NOT_FOUND: { status: 400, message: 'No pending OTP. Please login again.' },
      OTP_EXPIRED: { status: 400, message: 'OTP has expired. Please login again.' },
      OTP_INVALID: { status: 400, message: 'Invalid OTP code.' },
    };
    const mapped = errorMap[err.message];
    if (mapped) {
      res.status(mapped.status).json({ error: err.message, message: mapped.message });
      return;
    }
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Verification failed' });
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (req.sessionId && req.userId) {
      await authService.logout(req.sessionId, req.userId);
    }
    res.json({ message: 'Logged out successfully' });
  } catch {
    res.json({ message: 'Logged out' });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    await authService.initiateForgotPassword(req.body.email);
    // Always return success (don't leak email existence)
    res.json({ message: 'If that email exists, a reset code has been sent.' });
  } catch {
    res.json({ message: 'If that email exists, a reset code has been sent.' });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email, code, newPassword } = req.body;
    await authService.resetPassword(email, code, newPassword);
    res.json({
      message: 'Password reset successful. All encrypted data has been cleared. Please log in with your new password.',
    });
  } catch (error: unknown) {
    const err = error as Error;
    const errorMap: Record<string, { status: number; message: string }> = {
      USER_NOT_FOUND: { status: 404, message: 'User not found' },
      OTP_NOT_FOUND: { status: 400, message: 'No pending reset code. Please request again.' },
      OTP_EXPIRED: { status: 400, message: 'Reset code has expired. Please request again.' },
      OTP_INVALID: { status: 400, message: 'Invalid reset code.' },
    };
    const mapped = errorMap[err.message];
    if (mapped) {
      res.status(mapped.status).json({ error: err.message, message: mapped.message });
      return;
    }
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Password reset failed' });
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  res.json({ user: req.user });
}

export async function getPbkdf2Salt(req: AuthRequest, res: Response): Promise<void> {
  try {
    const salt = await authService.getPbkdf2Salt(req.userId!);
    res.json({ pbkdf2Salt: salt });
  } catch {
    res.status(404).json({ error: 'NOT_FOUND' });
  }
}

export async function getSessions(req: AuthRequest, res: Response): Promise<void> {
  const sessions = await authService.getSessions(req.userId!);
  res.json({ sessions });
}

export async function revokeSession(req: AuthRequest, res: Response): Promise<void> {
  try {
    await authService.revokeSession(param(req.params.id), req.userId!);
    res.json({ message: 'Session revoked' });
  } catch {
    res.status(404).json({ error: 'SESSION_NOT_FOUND' });
  }
}

import * as googleService from '../services/google.service';

export async function googleLogin(req: Request, res: Response): Promise<void> {
  try {
    const { code, redirectUri } = req.body;
    const googleUser = await googleService.exchangeCodeForGoogleUser(code, redirectUri);
    const result = await authService.handleGoogleLogin(
      googleUser.sub,
      googleUser.email,
      getIpAddress(req),
      getDeviceInfo(req)
    );
    res.json({
      message: 'Google login successful',
      token: result.token,
      expiresAt: result.expiresAt,
      user: result.user,
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Google login controller error:', err);
    res.status(401).json({ error: 'GOOGLE_AUTH_FAILED', message: 'Google authentication failed' });
  }
}

export async function setupVault(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    await authService.setupVaultData(userId, req.body);
    res.json({ message: 'Vault security setup completed successfully' });
  } catch (error: unknown) {
    console.error('Setup vault error:', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to complete vault setup' });
  }
}

export async function getVaultDetails(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.userId!;
    const details = await authService.getVaultDetails(userId);
    res.json(details);
  } catch (error: unknown) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Vault details not found' });
  }
}

export async function getRecoveryData(req: Request, res: Response): Promise<void> {
  try {
    const email = String(req.query.email || '');
    if (!email) {
      res.status(400).json({ error: 'INVALID_EMAIL', message: 'Email query parameter required' });
      return;
    }
    const data = await authService.getRecoveryData(email);
    res.json(data);
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message === 'RECOVERY_NOT_AVAILABLE') {
      res.status(404).json({ error: 'RECOVERY_NOT_AVAILABLE', message: 'No recovery key set up for this email.' });
      return;
    }
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Failed to fetch recovery details' });
  }
}

export async function recoverVault(req: Request, res: Response): Promise<void> {
  try {
    const {
      email,
      passwordHash,
      encryptedMasterKey,
      masterKeyIv,
      newRecoveryEncryptedMasterKey,
      newRecoveryMasterKeyIv,
      newRecoverySalt,
    } = req.body;

    await authService.recoverVaultData(email, {
      passwordHash,
      encryptedMasterKey,
      masterKeyIv,
      newRecoveryEncryptedMasterKey,
      newRecoveryMasterKeyIv,
      newRecoverySalt,
    });

    res.json({ message: 'Vault recovered successfully. You can now log in with your new vault password.' });
  } catch (error: unknown) {
    console.error('Recover vault error:', error);
    res.status(500).json({ error: 'SERVER_ERROR', message: 'Vault recovery failed' });
  }
}

