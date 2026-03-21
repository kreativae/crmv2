import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { User, IUser } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { generateSlug, generateToken } from '../utils/helpers.js';
import { emailService } from './emailService.js';
import { logger } from '../utils/logger.js';

// In-memory login attempt tracking (for brute-force protection)
const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  plan?: 'starter' | 'business' | 'enterprise';
}

interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  // Generate JWT tokens
  generateTokens(userId: string, organizationId: string, role: string): TokenPair {
    const accessToken = jwt.sign(
      { userId, organizationId, role },
      env.JWT_SECRET as string,
      { expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );

    const refreshToken = jwt.sign(
      { userId, organizationId, type: 'refresh' },
      env.JWT_REFRESH_SECRET as string,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );

    return { accessToken, refreshToken };
  }

  // Verify refresh token
  verifyRefreshToken(token: string): { userId: string; organizationId: string } | null {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as {
        userId: string;
        organizationId: string;
        type: string;
      };

      if (decoded.type !== 'refresh') {
        return null;
      }

      return { userId: decoded.userId, organizationId: decoded.organizationId };
    } catch {
      return null;
    }
  }

  // Register new user and organization
  async register(data: RegisterData): Promise<{
    user: IUser;
    tokens: TokenPair;
  }> {
    // Check if email already exists
    const existingUser = await User.findOne({ email: data.email.toLowerCase() });
    if (existingUser) {
      throw new Error('Email já cadastrado');
    }

    // Create organization
    const slug = generateSlug(data.organizationName);
    const organization = await Organization.create({
      name: data.organizationName,
      slug: `${slug}-${Date.now()}`,
      plan: data.plan || 'starter',
      limits: {
        maxUsers: data.plan === 'enterprise' ? 100 : data.plan === 'business' ? 25 : 5,
        maxLeads: data.plan === 'enterprise' ? 50000 : data.plan === 'business' ? 10000 : 1000,
        maxStorage: data.plan === 'enterprise' ? 10737418240 : data.plan === 'business' ? 5368709120 : 1073741824,
      },
    });

    // Create user as owner
    const user = await User.create({
      organizationId: organization._id,
      name: data.name,
      email: data.email.toLowerCase(),
      password: data.password,
      role: 'owner',
      permissions: ['*'], // Owner has all permissions
      status: 'active',
    });

    // Generate tokens
    const tokens = this.generateTokens(
      user._id.toString(),
      organization._id.toString(),
      user.role
    );

    // Store refresh token
    await User.findByIdAndUpdate(user._id, {
      $push: { refreshTokens: tokens.refreshToken },
    });

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.name);

    return { user, tokens };
  }

  // Login
  async login(data: LoginData): Promise<{
    user: IUser;
    tokens: TokenPair;
  }> {
    const emailKey = data.email.toLowerCase();
    
    // Check if account is locked due to too many failed attempts
    const attempts = loginAttempts.get(emailKey);
    if (attempts) {
      const now = Date.now();
      if (attempts.lockedUntil > now) {
        const remainingMinutes = Math.ceil((attempts.lockedUntil - now) / 60000);
        throw new Error(`Conta temporariamente bloqueada. Tente novamente em ${remainingMinutes} minutos.`);
      }
      // Reset if window expired
      if (now - attempts.lastAttempt > ATTEMPT_WINDOW_MS) {
        loginAttempts.delete(emailKey);
      }
    }

    // Find user with password
    const user = await User.findOne({ email: emailKey })
      .select('+password')
      .populate('organizationId');

    if (!user) {
      this.recordFailedAttempt(emailKey);
      throw new Error('Email ou senha inválidos');
    }

    if (user.status !== 'active') {
      throw new Error('Usuário inativo');
    }

    // Check password
    const isValidPassword = await user.comparePassword(data.password);
    if (!isValidPassword) {
      this.recordFailedAttempt(emailKey);
      throw new Error('Email ou senha inválidos');
    }

    // Login successful — clear attempts
    loginAttempts.delete(emailKey);

    // Generate tokens (use _id from populated org, not the full object)
    const orgId = typeof user.organizationId === 'object' && user.organizationId._id
      ? user.organizationId._id.toString()
      : user.organizationId.toString();

    const tokens = this.generateTokens(
      user._id.toString(),
      orgId,
      user.role
    );

    // Update last login and store refresh token
    await User.findByIdAndUpdate(user._id, {
      lastLogin: new Date(),
      $push: { refreshTokens: { $each: [tokens.refreshToken], $slice: -5 } }, // Keep last 5
    });

    // Remove password from response
    user.password = undefined as unknown as string;

    return { user, tokens };
  }

  // Refresh token
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    const decoded = this.verifyRefreshToken(refreshToken);
    if (!decoded) {
      throw new Error('Refresh token inválido');
    }

    // Find user and check if refresh token is valid
    const user = await User.findById(decoded.userId).select('+refreshTokens');
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      throw new Error('Refresh token inválido');
    }

    // Generate new tokens
    const tokens = this.generateTokens(
      user._id.toString(),
      decoded.organizationId,
      user.role
    );

    // Replace old refresh token with new one
    await User.findByIdAndUpdate(user._id, {
      $pull: { refreshTokens: refreshToken },
      $push: { refreshTokens: tokens.refreshToken },
    });

    return tokens;
  }

  // Logout
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      // Remove specific refresh token
      await User.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: refreshToken },
      });
    } else {
      // Remove all refresh tokens (logout from all devices)
      await User.findByIdAndUpdate(userId, {
        $set: { refreshTokens: [] },
      });
    }
  }

  // Request password reset
  async forgotPassword(email: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate reset token
    const resetToken = generateToken(32);
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Save token with expiry
    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: hashedToken,
      passwordResetExpires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    // Send reset email
    const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    await emailService.sendPasswordResetEmail(user.email, user.name, resetUrl);
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      throw new Error('Token inválido ou expirado');
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();

    // Send confirmation email
    await emailService.sendPasswordChangedEmail(user.email, user.name);
  }

  // Change password (authenticated)
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      throw new Error('Senha atual incorreta');
    }

    user.password = newPassword;
    user.refreshTokens = []; // Invalidate all sessions
    await user.save();
  }

  // Track failed login attempts for brute-force protection
  private recordFailedAttempt(email: string): void {
    const now = Date.now();
    const existing = loginAttempts.get(email);
    
    if (!existing) {
      loginAttempts.set(email, { count: 1, lastAttempt: now, lockedUntil: 0 });
      return;
    }
    
    existing.count++;
    existing.lastAttempt = now;
    
    if (existing.count >= MAX_LOGIN_ATTEMPTS) {
      existing.lockedUntil = now + LOCK_DURATION_MS;
      logger.warn(`Account locked due to ${existing.count} failed login attempts: ${email}`);
    }
  }
}

export const authService = new AuthService();
