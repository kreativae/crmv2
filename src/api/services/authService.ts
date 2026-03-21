import axios from 'axios';
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

type UserResponse = {
  user: User;
};

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
    const API_URL = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || 'http://localhost:3001/api';
    // Use raw axios here to avoid interceptor loops when no session exists
    const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
      withCredentials: true,
    });
    if (response.data?.accessToken) {
      setAccessToken(response.data.accessToken);
    }
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

  async getMe(): Promise<UserResponse> {
    const response = await api.get<UserResponse>('/auth/me');
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<UserResponse> {
    const response = await api.put<UserResponse>('/auth/me', data);
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
