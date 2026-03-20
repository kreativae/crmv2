import api from '../client';
import type { FinanceRecord, SellerGoal } from '../../types';

export interface FinanceFilters {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  type?: FinanceRecord['type'];
  status?: FinanceRecord['status'];
  category?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export const financeService = {
  async getAll(filters: FinanceFilters = {}): Promise<{ data: FinanceRecord[]; pagination: { total: number; pages: number } }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/finance?${params.toString()}`);
    return response.data;
  },

  async getById(id: string): Promise<FinanceRecord> {
    const response = await api.get(`/finance/${id}`);
    return response.data.data;
  },

  async create(record: Partial<FinanceRecord>): Promise<FinanceRecord> {
    const response = await api.post('/finance', record);
    return response.data.data;
  },

  async update(id: string, updates: Partial<FinanceRecord>): Promise<FinanceRecord> {
    const response = await api.put(`/finance/${id}`, updates);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/finance/${id}`);
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await api.post('/finance/bulk/delete', { ids });
  },

  async bulkUpdate(ids: string[], updates: Partial<FinanceRecord>): Promise<void> {
    await api.post('/finance/bulk/update', { ids, updates });
  },

  async getStats(startDate?: string, endDate?: string): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    netRevenue: number;
    pendingAmount: number;
    overdueAmount: number;
    byCategory: Record<string, number>;
    byMonth: Array<{ month: string; revenue: number; expenses: number }>;
  }> {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await api.get(`/finance/stats?${params.toString()}`);
    return response.data.data;
  },

  async getGoals(): Promise<SellerGoal[]> {
    const response = await api.get('/finance/goals');
    return response.data.data;
  },

  async updateGoal(id: string, updates: Partial<SellerGoal>): Promise<SellerGoal> {
    const response = await api.put(`/finance/goals/${id}`, updates);
    return response.data.data;
  },

  async getReport(type: 'monthly' | 'quarterly' | 'yearly', year: number, month?: number): Promise<Blob> {
    const params = new URLSearchParams({ type, year: String(year) });
    if (month) params.append('month', String(month));
    const response = await api.get(`/finance/report?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportCSV(filters: FinanceFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    const response = await api.get(`/finance/export?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default financeService;
