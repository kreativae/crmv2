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

const unwrap = <T>(response: any): T => {
  return (response?.data?.data ?? response?.data) as T;
};

// The backend Transaction model uses sellerId/clientId instead of salesperson/client.
// Normalize to the FinanceRecord shape the frontend expects.
const normalizeRecord = (raw: any): FinanceRecord => ({
  _id: raw._id ?? raw.id ?? '',
  description: raw.description ?? '',
  type: raw.type,
  category: raw.category,
  value: raw.value ?? 0,
  status: raw.status ?? 'pending',
  date: raw.date ? (typeof raw.date === 'string' ? raw.date.split('T')[0] : new Date(raw.date).toISOString().split('T')[0]) : '',
  dueDate: raw.dueDate ? (typeof raw.dueDate === 'string' ? raw.dueDate.split('T')[0] : new Date(raw.dueDate).toISOString().split('T')[0]) : undefined,
  client: raw.client ?? raw.clientId ?? undefined,
  salesperson: raw.salesperson ?? raw.sellerId ?? '',
  pipeline: raw.pipeline ?? raw.pipelineId ?? '',
  notes: raw.notes,
  invoiceNumber: raw.invoiceNumber,
});

export const financeService = {
  async getAll(filters: FinanceFilters = {}): Promise<{ data: FinanceRecord[]; pagination: { total: number; pages: number } }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/finance?${params.toString()}`);
    const body = response.data;
    return {
      data: (body?.data ?? body ?? []).map(normalizeRecord),
      pagination: body?.pagination ?? { total: 0, pages: 1 },
    };
  },

  async getById(id: string): Promise<FinanceRecord> {
    const response = await api.get(`/finance/${id}`);
    return normalizeRecord(unwrap(response));
  },

  async create(record: Partial<FinanceRecord>): Promise<FinanceRecord> {
    const response = await api.post('/finance', record);
    return normalizeRecord(unwrap(response));
  },

  async update(id: string, updates: Partial<FinanceRecord>): Promise<FinanceRecord> {
    const response = await api.put(`/finance/${id}`, updates);
    return normalizeRecord(unwrap(response));
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/finance/${id}`);
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await api.delete('/finance/bulk', { data: { ids } });
  },

  async bulkUpdate(ids: string[], updates: Partial<FinanceRecord>): Promise<void> {
    if (updates.status) {
      await api.put('/finance/bulk/status', { ids, status: updates.status });
      return;
    }

    await Promise.all(ids.map((id) => api.put(`/finance/${id}`, updates)));
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
    return unwrap(response);
  },

  async getGoals(): Promise<SellerGoal[]> {
    const response = await api.get('/finance/goals/list');
    return unwrap<SellerGoal[]>(response);
  },

  async updateGoal(id: string, updates: Partial<SellerGoal>): Promise<SellerGoal> {
    const response = await api.put(`/finance/goals/${id}`, updates);
    return unwrap<SellerGoal>(response);
  },

  async getReport(type: 'monthly' | 'quarterly' | 'yearly', year: number, month?: number): Promise<Blob> {
    const params = new URLSearchParams({ type, year: String(year) });
    if (month) params.append('month', String(month));
    const response = await api.get(`/finance/export/csv?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async exportCSV(filters: FinanceFilters = {}): Promise<Blob> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    const response = await api.get(`/finance/export/csv?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default financeService;
