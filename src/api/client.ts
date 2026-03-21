import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

// API Base URL - configure VITE_API_URL in .env for production
// @ts-ignore - Vite env typing
const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:3001/api';

// Warn in production if using fallback URL
// @ts-ignore - Vite env typing
if (import.meta.env?.PROD && !import.meta.env?.VITE_API_URL) {
  // This will be visible in browser console — intentional for debugging misconfigured deploys
  console.warn('[NexCRM] VITE_API_URL not set — API calls will fail in production');
}

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  withCredentials: true, // Send cookies (httpOnly refresh token)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management — only accessToken in memory, refreshToken in httpOnly cookie
let accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request interceptor - add auth token from memory
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401 - token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Refresh token is sent automatically via httpOnly cookie (withCredentials: true)
        const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
          withCredentials: true,
        });

        const { accessToken: newAccessToken } = response.data;

        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError as Error, null);
        setAccessToken(null);
        window.location.href = '/';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Helper to check if API is available
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    await api.get('/health');
    return true;
  } catch {
    return false;
  }
};

// Generic API response type
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Error type
export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string>;
}

export default api;
