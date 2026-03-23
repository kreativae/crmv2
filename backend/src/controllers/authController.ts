import { Request, Response } from 'express';
import axios from 'axios';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import { authService } from '../services/authService.js';
import { User } from '../models/User.js';
import { Organization } from '../models/Organization.js';
import { env } from '../config/env.js';
import { generateSlug } from '../utils/helpers.js';

type OAuthProvider = 'google' | 'microsoft' | 'apple';

const oauthCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 10 * 60 * 1000,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const createOAuthState = (): string => crypto.randomBytes(24).toString('hex');

const buildFrontendRedirect = (params: Record<string, string>): string => {
  const url = new URL(env.FRONTEND_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
};

const requireOAuthConfig = (provider: OAuthProvider) => {
  if (provider === 'google' && (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET)) {
    throw new AppError('Google OAuth não configurado no servidor', 503);
  }

  if (provider === 'microsoft' && (!env.MICROSOFT_CLIENT_ID || !env.MICROSOFT_CLIENT_SECRET)) {
    throw new AppError('Microsoft OAuth não configurado no servidor', 503);
  }

  if (provider === 'apple' && (!env.APPLE_SERVICE_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY)) {
    throw new AppError('Apple OAuth não configurado no servidor', 503);
  }
};

const validateOAuthState = (req: Request, provider: OAuthProvider, state?: string | null) => {
  const cookieKey = `oauth_state_${provider}`;
  const cookieState = req.cookies?.[cookieKey];
  if (!state || !cookieState || state !== cookieState) {
    throw new AppError('Estado OAuth inválido ou expirado', 400);
  }
};

const upsertOAuthUser = async (
  provider: OAuthProvider,
  profile: { email: string; name?: string }
) => {
  const email = profile.email.toLowerCase();
  const displayName = (profile.name || email.split('@')[0] || 'Usuário').trim();

  let user = await User.findOne({ email }).populate('organizationId');
  if (user) {
    if (user.status !== 'active') {
      throw new AppError('Usuário inativo', 403);
    }
    return user;
  }

  const slugBase = generateSlug(displayName || provider);
  const organization = await Organization.create({
    name: `${displayName} Workspace`,
    slug: `${slugBase}-${Date.now()}`,
    plan: 'starter',
    limits: {
      maxUsers: 5,
      maxLeads: 1000,
      maxStorage: 1073741824,
    },
  });

  user = await User.create({
    organizationId: organization._id,
    name: displayName,
    email,
    password: crypto.randomBytes(32).toString('hex'),
    role: 'owner',
    permissions: ['*'],
    status: 'active',
  });

  return user;
};

const finalizeOAuthLogin = async (
  res: Response,
  provider: OAuthProvider,
  profile: { email: string; name?: string }
) => {
  const user = await upsertOAuthUser(provider, profile);
  const organizationId =
    typeof user.organizationId === 'object' && 'toString' in user.organizationId
      ? user.organizationId.toString()
      : String(user.organizationId);

  const tokens = authService.generateTokens(
    user._id.toString(),
    organizationId,
    user.role
  );

  await User.findByIdAndUpdate(user._id, {
    lastLogin: new Date(),
    $push: { refreshTokens: { $each: [tokens.refreshToken], $slice: -5 } },
  });

  res.cookie('refreshToken', tokens.refreshToken, refreshCookieOptions);
  res.clearCookie(`oauth_state_${provider}`);

  const redirectUrl = buildFrontendRedirect({
    auth: 'success',
    accessToken: tokens.accessToken,
    provider,
  });

  return res.redirect(redirectUrl);
};

const handleOAuthError = (res: Response, provider: OAuthProvider, err: unknown) => {
  const message = err instanceof Error ? err.message : `Erro no login com ${provider}`;
  const redirectUrl = buildFrontendRedirect({
    auth: 'error',
    provider,
    message,
  });
  return res.redirect(redirectUrl);
};

export const authController = {
  // POST /api/auth/register
  register: asyncHandler(async (req: Request, res: Response) => {
    const { name, email, password, organizationName, plan } = req.body;

    const { user, tokens } = await authService.register({
      name,
      email,
      password,
      organizationName,
      plan,
    });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: 'Conta criada com sucesso',
      user,
      accessToken: tokens.accessToken,
    });
  }),

  // POST /api/auth/login
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const { user, tokens } = await authService.login({ email, password });

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Login realizado com sucesso',
      user,
      accessToken: tokens.accessToken,
    });
  }),

  // POST /api/auth/forgot-password
  forgotPassword: asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    await authService.forgotPassword(email);

    // Always return success to not reveal if email exists
    res.json({
      message: 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha',
    });
  }),

  // POST /api/auth/reset-password
  resetPassword: asyncHandler(async (req: Request, res: Response) => {
    const { token, password } = req.body;

    await authService.resetPassword(token, password);

    res.json({ message: 'Senha redefinida com sucesso' });
  }),

  // GET /api/auth/me
  getMe: asyncHandler(async (req: Request, res: Response) => {
    const user = await User.findById(req.user!._id).populate('organizationId');

    res.json({ user });
  }),

  // PUT /api/auth/me
  updateMe: asyncHandler(async (req: Request, res: Response) => {
    const { name, avatar, settings } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user!._id,
      { 
        ...(name && { name }),
        ...(avatar && { avatar }),
        ...(settings && { settings: { ...req.user!.settings, ...settings } }),
      },
      { new: true }
    );

    res.json({ user });
  }),

  // PUT /api/auth/change-password
  changePassword: asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(
      req.user!._id.toString(),
      currentPassword,
      newPassword
    );

    res.json({ message: 'Senha alterada com sucesso' });
  }),

  // POST /api/auth/logout
  logout: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;
    await authService.logout(req.user!._id.toString(), refreshToken);
    
    res.clearCookie('refreshToken');
    res.json({ message: 'Logout realizado com sucesso' });
  }),

  // POST /api/auth/refresh
  refreshToken: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new Error('Refresh token not found');
    }

    const tokens = await authService.refreshToken(refreshToken);

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Token renovado com sucesso',
      accessToken: tokens.accessToken,
    });
  }),

  // GET /api/auth/google
  googleAuth: asyncHandler(async (req: Request, res: Response) => {
    requireOAuthConfig('google');

    const state = createOAuthState();
    res.cookie('oauth_state_google', state, oauthCookieOptions);

    const redirectUri = `${env.API_URL}/auth/google/callback`;
    const params = new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      prompt: 'select_account',
    });

    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }),

  // GET /api/auth/google/callback
  googleCallback: asyncHandler(async (req: Request, res: Response) => {
    try {
      requireOAuthConfig('google');

      const code = String(req.query.code || '');
      const state = String(req.query.state || '');
      validateOAuthState(req, 'google', state);

      if (!code) {
        throw new AppError('Código OAuth do Google ausente', 400);
      }

      const redirectUri = `${env.API_URL}/auth/google/callback`;

      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          client_id: env.GOOGLE_CLIENT_ID!,
          client_secret: env.GOOGLE_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const googleAccessToken = tokenResponse.data?.access_token as string | undefined;
      if (!googleAccessToken) {
        throw new AppError('Falha ao obter token do Google', 400);
      }

      const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${googleAccessToken}`,
        },
      });

      const email = String(userInfoResponse.data?.email || '').toLowerCase();
      const name = String(userInfoResponse.data?.name || '');

      if (!email) {
        throw new AppError('Google não retornou email do usuário', 400);
      }

      await finalizeOAuthLogin(res, 'google', { email, name });
    } catch (err) {
      handleOAuthError(res, 'google', err);
    }
  }),

  // GET /api/auth/microsoft
  microsoftAuth: asyncHandler(async (req: Request, res: Response) => {
    requireOAuthConfig('microsoft');

    const state = createOAuthState();
    res.cookie('oauth_state_microsoft', state, oauthCookieOptions);

    const tenant = env.MICROSOFT_TENANT_ID || 'common';
    const redirectUri = `${env.API_URL}/auth/microsoft/callback`;

    const params = new URLSearchParams({
      client_id: env.MICROSOFT_CLIENT_ID!,
      response_type: 'code',
      redirect_uri: redirectUri,
      response_mode: 'query',
      scope: 'openid profile email offline_access User.Read',
      state,
    });

    res.redirect(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`);
  }),

  // GET /api/auth/microsoft/callback
  microsoftCallback: asyncHandler(async (req: Request, res: Response) => {
    try {
      requireOAuthConfig('microsoft');

      const code = String(req.query.code || '');
      const state = String(req.query.state || '');
      validateOAuthState(req, 'microsoft', state);

      if (!code) {
        throw new AppError('Código OAuth da Microsoft ausente', 400);
      }

      const tenant = env.MICROSOFT_TENANT_ID || 'common';
      const redirectUri = `${env.API_URL}/auth/microsoft/callback`;

      const tokenResponse = await axios.post(
        `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
        new URLSearchParams({
          client_id: env.MICROSOFT_CLIENT_ID!,
          client_secret: env.MICROSOFT_CLIENT_SECRET!,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      const microsoftAccessToken = tokenResponse.data?.access_token as string | undefined;
      if (!microsoftAccessToken) {
        throw new AppError('Falha ao obter token da Microsoft', 400);
      }

      const profileResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${microsoftAccessToken}`,
        },
      });

      const email = String(
        profileResponse.data?.mail || profileResponse.data?.userPrincipalName || ''
      ).toLowerCase();
      const name = String(profileResponse.data?.displayName || '');

      if (!email) {
        throw new AppError('Microsoft não retornou email do usuário', 400);
      }

      await finalizeOAuthLogin(res, 'microsoft', { email, name });
    } catch (err) {
      handleOAuthError(res, 'microsoft', err);
    }
  }),

  // GET/POST /api/auth/apple
  appleAuth: asyncHandler(async (req: Request, res: Response) => {
    requireOAuthConfig('apple');

    const state = createOAuthState();
    res.cookie('oauth_state_apple', state, oauthCookieOptions);

    const redirectUri = `${env.API_URL}/auth/apple/callback`;
    const params = new URLSearchParams({
      client_id: env.APPLE_SERVICE_ID!,
      redirect_uri: redirectUri,
      response_type: 'code id_token',
      response_mode: 'form_post',
      scope: 'name email',
      state,
    });

    const authUrl = `https://appleid.apple.com/auth/authorize?${params.toString()}`;
    if (req.method === 'POST') {
      res.json({ authUrl, state });
      return;
    }

    res.redirect(authUrl);
  }),

  // POST /api/auth/apple/callback
  appleCallback: asyncHandler(async (req: Request, res: Response) => {
    try {
      requireOAuthConfig('apple');

      const code = String(req.body?.code || req.query?.code || '');
      const state = String(req.body?.state || req.query?.state || '');
      const idToken = String(req.body?.id_token || req.query?.id_token || '');

      validateOAuthState(req, 'apple', state);

      if (!code) {
        throw new AppError('Código OAuth da Apple ausente', 400);
      }

      const redirectUri = `${env.API_URL}/auth/apple/callback`;
      const applePrivateKey = env.APPLE_PRIVATE_KEY!.replace(/\\n/g, '\n');
      const clientSecret = jwt.sign(
        {
          iss: env.APPLE_TEAM_ID,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 60 * 60,
          aud: 'https://appleid.apple.com',
          sub: env.APPLE_SERVICE_ID,
        },
        applePrivateKey,
        {
          algorithm: 'ES256',
          keyid: env.APPLE_KEY_ID,
        }
      );

      await axios.post(
        'https://appleid.apple.com/auth/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: env.APPLE_SERVICE_ID!,
          client_secret: clientSecret,
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      let email = '';
      let name = '';

      if (idToken) {
        const decoded = jwt.decode(idToken) as { email?: string; name?: string } | null;
        email = String(decoded?.email || '').toLowerCase();
        name = String(decoded?.name || '');
      }

      if (!email && req.body?.user) {
        try {
          const parsed = typeof req.body.user === 'string' ? JSON.parse(req.body.user) : req.body.user;
          email = String(parsed?.email || '').toLowerCase();
          const firstName = String(parsed?.name?.firstName || '');
          const lastName = String(parsed?.name?.lastName || '');
          name = `${firstName} ${lastName}`.trim();
        } catch {
          // ignore malformed Apple user payload
        }
      }

      if (!email) {
        throw new AppError('Apple não retornou email do usuário', 400);
      }

      await finalizeOAuthLogin(res, 'apple', { email, name });
    } catch (err) {
      handleOAuthError(res, 'apple', err);
    }
  }),
};
