import { useState, useCallback } from 'react';
import { authService } from '../api';
import { useStore } from '../store';
import type { User } from '../types';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    organizationName: string;
    plan?: 'starter' | 'business' | 'enterprise';
  }) => Promise<boolean>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
}

export function useAuth(): UseAuthReturn {
  const { 
    currentUser, 
    isAuthenticated, 
    login: storeLogin, 
    logout: storeLogout,
    setCurrentPage 
  } = useStore();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.login({ email, password });
      if (response.accessToken) {
        storeLogin(email, password, response.user);
        setCurrentPage('dashboard');
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Credenciais inválidas');
      return false;
    } finally {
      setLoading(false);
    }
  }, [storeLogin, setCurrentPage]);

  const register = useCallback(async (data: {
    name: string;
    email: string;
    password: string;
    organizationName: string;
    plan?: 'starter' | 'business' | 'enterprise';
  }): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.register(data);
      if (response.accessToken) {
        storeLogin(data.email, data.password, response.user);
        setCurrentPage('dashboard');
        return true;
      }
      return false;
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao criar conta');
      return false;
    } finally {
      setLoading(false);
    }
  }, [storeLogin, setCurrentPage]);

  const logout = useCallback(() => {
    authService.logout();
    storeLogout();
  }, [storeLogout]);

  const forgotPassword = useCallback(async (email: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      await authService.forgotPassword(email);
      return true;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (token: string, password: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.resetPassword(token, password);
      return response.success;
    } catch (err) {
      setError('Failed to reset password');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<User>): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      await authService.updateProfile(data);
      return true;
    } catch (err) {
      setError('Failed to update profile');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await authService.changePassword(currentPassword, newPassword);
      return response.success;
    } catch (err) {
      setError('Failed to change password');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    user: currentUser,
    isAuthenticated,
    loading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    changePassword,
  };
}

export default useAuth;
