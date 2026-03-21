import api from '../client';
import type { Client } from '../../types';

export interface ClientFilters {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: 'active' | 'inactive';
  industry?: string;
  tags?: string[];
}

// Strip frontend-only fields that don't exist in the backend model
function toApiPayload(client: Partial<Client>): Record<string, unknown> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { leadsCount, conversationsCount, lastInteraction, notes, ...rest } = client as any;
  // notes in backend is a plain string; omit array-form notes from payload
  // (notes are managed via the /notes endpoint)
  return rest;
}

export const clientService = {
  async getAll(filters: ClientFilters = {}): Promise<{ data: Client[]; pagination: { total: number; pages: number } }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/clients?${params.toString()}`);
    return response.data;
  },

  async getById(id: string): Promise<Client> {
    const response = await api.get(`/clients/${id}`);
    return response.data;
  },

  async create(client: Partial<Client>): Promise<Client> {
    const response = await api.post('/clients', toApiPayload(client));
    return response.data;
  },

  async update(id: string, updates: Partial<Client>): Promise<Client> {
    const response = await api.put(`/clients/${id}`, toApiPayload(updates));
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/clients/${id}`);
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await api.post('/clients/bulk/delete', { ids });
  },

  async bulkUpdate(ids: string[], updates: Partial<Client>): Promise<void> {
    await api.post('/clients/bulk/update', { ids, updates });
  },

  async addNote(id: string, content: string): Promise<Client> {
    const response = await api.post(`/clients/${id}/notes`, { content });
    return response.data.data;
  },

  async deleteNote(id: string, noteId: string): Promise<Client> {
    const response = await api.delete(`/clients/${id}/notes/${noteId}`);
    return response.data.data;
  },

  async addTag(id: string, tag: string): Promise<Client> {
    const response = await api.post(`/clients/${id}/tags`, { tag });
    return response.data.data;
  },

  async removeTag(id: string, tag: string): Promise<Client> {
    const response = await api.delete(`/clients/${id}/tags/${encodeURIComponent(tag)}`);
    return response.data.data;
  },

  async getStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    totalValue: number;
    avgValue: number;
    byIndustry: Record<string, number>;
  }> {
    const response = await api.get('/clients/stats/summary');
    return response.data;
  },

  async exportCSV(filters: ClientFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    const response = await api.get(`/clients/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default clientService;
