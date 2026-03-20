import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authService } from '../services/authService.js';
import { User } from '../models/User.js';

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

  // POST /api/auth/refresh
  refresh: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      res.status(401).json({ error: 'Refresh token não fornecido' });
      return;
    }

    const tokens = await authService.refreshToken(refreshToken);

    // Set new refresh token
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken: tokens.accessToken,
    });
  }),

  // POST /api/auth/logout
  logout: asyncHandler(async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (req.user) {
      await authService.logout(req.user._id.toString(), refreshToken);
    }

    res.clearCookie('refreshToken');
    res.json({ message: 'Logout realizado com sucesso' });
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
};
