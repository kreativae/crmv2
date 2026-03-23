import api from '../client';
import type { AutomationFlow, AutomationExecution } from '../../types';

export interface AutomationFilters {
  page?: number;
  limit?: number;
  active?: boolean;
  search?: string;
}

function normalizeAutomation(raw: any): AutomationFlow {
  return {
    _id: String(raw?._id || ''),
    name: raw?.name || '',
    description: raw?.description || '',
    trigger: raw?.trigger,
    conditions: Array.isArray(raw?.conditions) ? raw.conditions : [],
    actions: Array.isArray(raw?.actions) ? raw.actions : [],
    active: Boolean(raw?.active ?? raw?.isActive),
    executionCount: Number(raw?.executionCount || 0),
    successCount: Number(raw?.successCount || 0),
    failCount: Number(raw?.failCount || 0),
    lastRun: raw?.lastRun || (raw?.lastExecutedAt ? new Date(raw.lastExecutedAt).toISOString() : undefined),
    createdAt: raw?.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: raw?.updatedAt ? new Date(raw.updatedAt).toISOString() : new Date().toISOString(),
  };
}

function normalizeExecution(raw: any): AutomationExecution {
  return {
    _id: String(raw?._id || `ex_${Date.now()}`),
    automationId: String(raw?.automationId || ''),
    status: raw?.status || 'success',
    triggeredBy: raw?.triggeredBy || 'system',
    startedAt: raw?.startedAt || raw?.timestamp || new Date().toISOString(),
    completedAt: raw?.completedAt,
    actionsExecuted: Number(raw?.actionsExecuted || 0),
    error: raw?.error,
  };
}

function unwrap(response: any): any {
  return response?.data?.data ?? response?.data;
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
    const payload = unwrap(response);
    const list = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
    return {
      data: list.map(normalizeAutomation),
      pagination: payload?.pagination || { total: list.length },
    };
  },

  async getById(id: string): Promise<AutomationFlow> {
    const response = await api.get(`/automations/${id}`);
    return normalizeAutomation(unwrap(response));
  },

  async create(automation: Partial<AutomationFlow>): Promise<AutomationFlow> {
    const payload = {
      ...automation,
      isActive: automation.active,
    } as any;
    delete payload.active;
    const response = await api.post('/automations', payload);
    return normalizeAutomation(unwrap(response));
  },

  async update(id: string, updates: Partial<AutomationFlow>): Promise<AutomationFlow> {
    const payload = {
      ...updates,
      isActive: updates.active,
    } as any;
    delete payload.active;
    const response = await api.put(`/automations/${id}`, payload);
    return normalizeAutomation(unwrap(response));
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/automations/${id}`);
  },

  async toggle(id: string): Promise<AutomationFlow> {
    const response = await api.put(`/automations/${id}/toggle`);
    return normalizeAutomation(unwrap(response));
  },

  async test(id: string): Promise<AutomationExecution> {
    const response = await api.post(`/automations/${id}/test`);
    const payload = unwrap(response);
    return normalizeExecution(payload?.execution || payload);
  },

  async execute(id: string, data?: Record<string, unknown>): Promise<AutomationExecution> {
    try {
      const response = await api.post(`/automations/${id}/execute`, data);
      return normalizeExecution(unwrap(response));
    } catch {
      const response = await api.post(`/automations/${id}/test`, data);
      const payload = unwrap(response);
      return normalizeExecution(payload?.execution || payload);
    }
  },

  async getLogs(id: string, page: number = 1, limit: number = 20): Promise<{
    data: AutomationExecution[];
    pagination: { total: number; pages: number };
  }> {
    const response = await api.get(`/automations/${id}/logs?page=${page}&limit=${limit}`);
    const payload = unwrap(response);
    return {
      data: (payload?.data || []).map(normalizeExecution),
      pagination: payload?.pagination || { total: 0, pages: 0 },
    };
  },

  async duplicate(id: string): Promise<AutomationFlow> {
    const response = await api.post(`/automations/${id}/duplicate`);
    return normalizeAutomation(unwrap(response));
  },

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    totalExecutions: number;
    successRate: number;
  }> {
    const response = await api.get('/automations/stats');
    const payload = unwrap(response);
    return {
      total: Number(payload?.total || 0),
      active: Number(payload?.active || 0),
      inactive: Math.max(0, Number(payload?.total || 0) - Number(payload?.active || 0)),
      totalExecutions: Number(payload?.totalExecutions || 0),
      successRate: Number(payload?.successRate || 0),
    };
  },
};

export default automationService;
