import axios from 'axios';
import api from '../client';
import { setAccessToken, getAccessToken } from '../client';
import type { User } from '../../types';

const AUTH_TOKEN_KEY = 'nexcrm:accessToken';
const AUTH_USER_KEY = 'nexcrm:user';

const persistSession = (token: string, user: User) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
};

const clearPersistedSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
};

export const getPersistedSession = (): { token: string; user: User } | null => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const userRaw = localStorage.getItem(AUTH_USER_KEY);
  if (!token || !userRaw) return null;
  try {
    const user = JSON.parse(userRaw) as User;
    return { token, user };
  } catch {
    clearPersistedSession();
    return null;
  }
};

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
      persistSession(response.data.accessToken, response.data.user);
    }
    return response.data;
  },

  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/register', data);
    if (response.data.accessToken) {
      setAccessToken(response.data.accessToken);
      persistSession(response.data.accessToken, response.data.user);
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
      const persisted = getPersistedSession();
      if (persisted?.user) {
        persistSession(response.data.accessToken, persisted.user);
      }
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
    if (response.data?.user) {
      const token = getAccessToken();
      if (token) persistSession(token, response.data.user);
    }
    return response.data;
  },

  async updateProfile(data: Partial<User>): Promise<UserResponse> {
    const response = await api.put<UserResponse>('/auth/me', data);
    if (response.data?.user) {
      const token = getAccessToken();
      if (token) persistSession(token, response.data.user);
    }
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
    clearPersistedSession();
  },

  isAuthenticated(): boolean {
    return !!getAccessToken();
  },
};

export default authService;
