import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { authLoginRateLimiter, authRefreshRateLimiter } from '../middleware/rateLimit';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '../utils/validators';

const router = Router();

// Public routes — with auth-specific rate limiter (10 attempts / 15min)
router.post('/register', authLoginRateLimiter, validate(registerSchema), authController.register);
router.post('/login', authLoginRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authRefreshRateLimiter, authController.refreshToken);
router.post('/forgot-password', authLoginRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLoginRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.put('/me', authenticate, authController.updateMe);
router.put('/change-password', authenticate, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

// OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.get('/microsoft', authController.microsoftAuth);
router.get('/microsoft/callback', authController.microsoftCallback);
router.get('/apple', authController.appleAuth);
router.get('/apple/callback', authController.appleCallback);
router.post('/apple', authController.appleAuth);
router.post('/apple/callback', authController.appleCallback);

export default router;
