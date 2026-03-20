import api from '../client';
import type { User } from '../../types';
import type { SettingsUser, WebhookEndpoint, IntegrationConfig, AuditLog } from '../../store';

export interface Organization {
  _id: string;
  name: string;
  plan: 'starter' | 'business' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled';
  domain?: string;
  timezone?: string;
  branding?: {
    logo?: string;
    primaryColor?: string;
    darkMode?: boolean;
  };
  limits: {
    maxUsers: number;
    maxLeads: number;
    maxConversations: number;
  };
  createdAt: string;
}

export interface NotificationSettings {
  newLead: { email: boolean; push: boolean; inApp: boolean };
  newMessage: { email: boolean; push: boolean; inApp: boolean };
  dealClosed: { email: boolean; push: boolean; inApp: boolean };
  taskOverdue: { email: boolean; push: boolean; inApp: boolean };
  slaExceeded: { email: boolean; push: boolean; inApp: boolean };
}

export const settingsService = {
  // Organization
  async getOrganization(): Promise<Organization> {
    const response = await api.get('/settings/organization');
    return response.data.data;
  },

  async updateOrganization(updates: Partial<Organization>): Promise<Organization> {
    const response = await api.put('/settings/organization', updates);
    return response.data.data;
  },

  // Users
  async getUsers(): Promise<SettingsUser[]> {
    const response = await api.get('/settings/users');
    return response.data.data;
  },

  async inviteUser(data: { name: string; email: string; role: User['role'] }): Promise<SettingsUser> {
    const response = await api.post('/settings/users/invite', data);
    return response.data.data;
  },

  async updateUser(id: string, updates: Partial<SettingsUser>): Promise<SettingsUser> {
    const response = await api.put(`/settings/users/${id}`, updates);
    return response.data.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/settings/users/${id}`);
  },

  async resendInvite(id: string): Promise<void> {
    await api.post(`/settings/users/${id}/resend-invite`);
  },

  // Permissions
  async getRoles(): Promise<Record<string, string[]>> {
    const response = await api.get('/settings/roles');
    return response.data.data;
  },

  async updateRoles(roles: Record<string, string[]>): Promise<void> {
    await api.put('/settings/roles', { roles });
  },

  // Integrations
  async getIntegrations(): Promise<IntegrationConfig[]> {
    const response = await api.get('/settings/integrations');
    return response.data.data;
  },

  async connectIntegration(name: string, config?: Record<string, string>): Promise<IntegrationConfig> {
    const response = await api.post(`/settings/integrations/${name}/connect`, config);
    return response.data.data;
  },

  async disconnectIntegration(name: string): Promise<void> {
    await api.post(`/settings/integrations/${name}/disconnect`);
  },

  async updateIntegrationConfig(name: string, config: Record<string, string>): Promise<IntegrationConfig> {
    const response = await api.put(`/settings/integrations/${name}/config`, config);
    return response.data.data;
  },

  // Webhooks
  async getWebhooks(): Promise<WebhookEndpoint[]> {
    const response = await api.get('/settings/webhooks');
    return response.data.data;
  },

  async createWebhook(data: Omit<WebhookEndpoint, '_id' | 'createdAt' | 'failCount'>): Promise<WebhookEndpoint> {
    const response = await api.post('/settings/webhooks', data);
    return response.data.data;
  },

  async updateWebhook(id: string, updates: Partial<WebhookEndpoint>): Promise<WebhookEndpoint> {
    const response = await api.put(`/settings/webhooks/${id}`, updates);
    return response.data.data;
  },

  async deleteWebhook(id: string): Promise<void> {
    await api.delete(`/settings/webhooks/${id}`);
  },

  async testWebhook(id: string): Promise<{ success: boolean; statusCode: number; responseTime: number }> {
    const response = await api.post(`/settings/webhooks/${id}/test`);
    return response.data.data;
  },

  // API Tokens
  async getApiToken(): Promise<string> {
    const response = await api.get('/settings/api-token');
    return response.data.data;
  },

  async regenerateApiToken(): Promise<string> {
    const response = await api.post('/settings/api-token/regenerate');
    return response.data.data;
  },

  // Branding
  async updateBranding(data: {
    logo?: string;
    primaryColor?: string;
    darkMode?: boolean;
  }): Promise<Organization> {
    const response = await api.put('/settings/branding', data);
    return response.data.data;
  },

  async uploadLogo(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/settings/branding/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data.url;
  },

  // Notifications
  async getNotificationSettings(): Promise<NotificationSettings> {
    const response = await api.get('/settings/notifications');
    return response.data.data;
  },

  async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
    await api.put('/settings/notifications', settings);
  },

  // Audit Logs
  async getAuditLogs(filters: {
    page?: number;
    limit?: number;
    type?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<{ data: AuditLog[]; pagination: { total: number; pages: number } }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    const response = await api.get(`/settings/logs?${params.toString()}`);
    return response.data;
  },

  async exportAuditLogs(filters: {
    type?: string;
    startDate?: string;
    endDate?: string;
  } = {}): Promise<Blob> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    const response = await api.get(`/settings/logs/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default settingsService;
