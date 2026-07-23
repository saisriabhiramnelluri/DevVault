import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import {
  registerSchema,
  loginSchema,
  verifyOTPSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  googleLoginSchema,
  setupVaultSchema,
  recoverVaultSchema,
} from '../validators/schemas';
import { config } from '../config';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: config.rateLimit.login.windowMs,
  max: config.rateLimit.login.max,
  message: { error: 'RATE_LIMITED', message: 'Too many attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: config.rateLimit.otp.windowMs,
  max: config.rateLimit.otp.max,
  message: { error: 'RATE_LIMITED', message: 'Too many OTP attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', loginLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/google', loginLimiter, validate(googleLoginSchema), authController.googleLogin);
router.post('/verify-otp', otpLimiter, validate(verifyOTPSchema), authController.verifyOTP);
router.post('/logout', authMiddleware, authController.logout);
router.post('/forgot-password', loginLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', loginLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Vault Master Key & Recovery Key routes
router.post('/vault/setup', authMiddleware, validate(setupVaultSchema), authController.setupVault);
router.get('/vault/details', authMiddleware, authController.getVaultDetails);
router.get('/vault/recovery-data', loginLimiter, authController.getRecoveryData);
router.post('/vault/recover', loginLimiter, validate(recoverVaultSchema), authController.recoverVault);

router.get('/me', authMiddleware, authController.getMe);
router.get('/pbkdf2-salt', authMiddleware, authController.getPbkdf2Salt);
router.get('/sessions', authMiddleware, authController.getSessions);
router.delete('/sessions/:id', authMiddleware, authController.revokeSession);

export default router;
