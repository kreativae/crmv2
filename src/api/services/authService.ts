import api from '../client';
import { setAccessToken, getAccessToken } from '../client';
import type { User } from '../../types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  organizationName: string;
  plan?: 'starter' | 'business' | 'enterprise';
}

export interface AuthResponse {
  message: string;
  user: User;
  accessToken: string;
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', data);
    if (response.data.accessToken) {
      setAccessToken(response.data.accessToken);
    }
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    if (response.data.accessToken) {
      setAccessToken(response.data.accessToken);
    }
    return response.data;
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    // Refresh token is sent via httpOnly cookie automatically
    const response = await api.post('/auth/refresh');
    return response.data;
  },

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  async resetPassword(token: string, password: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  async getMe(): Promise<{ success: boolean; data: User }> {
    const response = await api.get('/auth/me');
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<{ success: boolean; data: User }> {
    const response = await api.put('/auth/me', data);
    return response.data;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    const response = await api.put('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore errors during logout
    }
    setAccessToken(null);
  },

  isAuthenticated(): boolean {
    return !!getAccessToken();
  },
};

export default authService;
