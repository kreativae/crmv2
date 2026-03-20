import api from '../client';
import type { AutomationFlow, AutomationExecution } from '../../types';

export interface AutomationFilters {
  page?: number;
  limit?: number;
  active?: boolean;
  search?: string;
}

export const automationService = {
  async getAll(filters: AutomationFilters = {}): Promise<{ data: AutomationFlow[]; pagination: { total: number } }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/automations?${params.toString()}`);
    return response.data;
  },

  async getById(id: string): Promise<AutomationFlow> {
    const response = await api.get(`/automations/${id}`);
    return response.data.data;
  },

  async create(automation: Partial<AutomationFlow>): Promise<AutomationFlow> {
    const response = await api.post('/automations', automation);
    return response.data.data;
  },

  async update(id: string, updates: Partial<AutomationFlow>): Promise<AutomationFlow> {
    const response = await api.put(`/automations/${id}`, updates);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/automations/${id}`);
  },

  async toggle(id: string): Promise<AutomationFlow> {
    const response = await api.put(`/automations/${id}/toggle`);
    return response.data.data;
  },

  async test(id: string): Promise<AutomationExecution> {
    const response = await api.post(`/automations/${id}/test`);
    return response.data.data;
  },

  async execute(id: string, data?: Record<string, unknown>): Promise<AutomationExecution> {
    const response = await api.post(`/automations/${id}/execute`, data);
    return response.data.data;
  },

  async getLogs(id: string, page: number = 1, limit: number = 20): Promise<{
    data: AutomationExecution[];
    pagination: { total: number; pages: number };
  }> {
    const response = await api.get(`/automations/${id}/logs?page=${page}&limit=${limit}`);
    return response.data;
  },

  async duplicate(id: string): Promise<AutomationFlow> {
    const response = await api.post(`/automations/${id}/duplicate`);
    return response.data.data;
  },

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    totalExecutions: number;
    successRate: number;
  }> {
    const response = await api.get('/automations/stats');
    return response.data.data;
  },
};

export default automationService;
