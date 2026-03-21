import api from '../client';
import type { Lead } from '../../types';

export interface LeadFilters {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: string;
  source?: string;
  pipelineId?: string;
  stageId?: string;
  assignedTo?: string;
  tags?: string[];
  scoreMin?: number;
  scoreMax?: number;
}

export interface LeadStats {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
  byStage: Record<string, number>;
  avgScore: number;
  totalValue: number;
}

export const leadService = {
  async getAll(filters: LeadFilters = {}): Promise<{ data: Lead[]; pagination: { total: number; pages: number } }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, String(value));
        }
      }
    });
    const response = await api.get(`/leads?${params.toString()}`);
    return response.data;
  },

  async getById(id: string): Promise<Lead> {
    const response = await api.get(`/leads/${id}`);
    return response.data.lead;
  },

  async create(lead: Partial<Lead>): Promise<Lead> {
    const response = await api.post('/leads', lead);
    return response.data.lead;
  },

  async update(id: string, updates: Partial<Lead>): Promise<Lead> {
    const response = await api.put(`/leads/${id}`, updates);
    return response.data.lead;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/leads/${id}`);
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await api.post('/leads/bulk/delete', { ids });
  },

  async bulkUpdate(ids: string[], updates: Partial<Lead>): Promise<void> {
    await api.post('/leads/bulk/update', { ids, updates });
  },

  async moveToStage(id: string, stageId: string): Promise<Lead> {
    const response = await api.put(`/leads/${id}/stage`, { stageId });
    return response.data.lead;
  },

  async updateScore(id: string, score: number): Promise<Lead> {
    const response = await api.put(`/leads/${id}/score`, { score });
    return response.data.lead;
  },

  async getStats(): Promise<LeadStats> {
    const response = await api.get('/leads/stats');
    return response.data;
  },

  async importCSV(file: File): Promise<{ imported: number; errors: string[] }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/leads/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async exportCSV(filters: LeadFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    const response = await api.get(`/leads/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default leadService;
