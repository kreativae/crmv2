import api from '../client';
import type { Task } from '../../types';

export interface TaskFilters {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  status?: Task['status'];
  priority?: Task['priority'];
  assignedTo?: string;
  leadId?: string;
  clientId?: string;
  overdue?: boolean;
}

function toDateOnly(value?: string | Date): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}

function normalizeTask(raw: any): Task {
  const assignedToObj = raw?.assignedTo && typeof raw.assignedTo === 'object' ? raw.assignedTo : null;

  return {
    _id: String(raw?._id || ''),
    organizationId: String(raw?.organizationId || ''),
    title: raw?.title || '',
    description: raw?.description || '',
    assignedTo: assignedToObj?._id ? String(assignedToObj._id) : String(raw?.assignedTo || ''),
    assignedName: raw?.assignedName || assignedToObj?.name || '',
    leadId: raw?.leadId ? String(raw.leadId) : undefined,
    leadName: raw?.leadName,
    priority: raw?.priority || 'medium',
    status: raw?.status || 'todo',
    dueDate: toDateOnly(raw?.dueDate) || toDateOnly(new Date()),
    createdAt: raw?.createdAt ? new Date(raw.createdAt).toISOString() : new Date().toISOString(),
    tags: Array.isArray(raw?.tags) ? raw.tags : [],
    estimatedHours: raw?.estimatedHours,
    completedAt: raw?.completedAt,
    subtasks: Array.isArray(raw?.subtasks)
      ? raw.subtasks.map((s: any) => ({
          id: String(s?.id || s?._id || ''),
          title: s?.title || '',
          completed: Boolean(s?.completed),
        }))
      : [],
    notes: Array.isArray(raw?.notes)
      ? raw.notes.map((n: any) => ({
          id: String(n?.id || n?._id || ''),
          content: n?.content || '',
          author: n?.author || 'Sistema',
          createdAt: n?.createdAt ? new Date(n.createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'),
        }))
      : [],
    activities: Array.isArray(raw?.activities)
      ? raw.activities.map((a: any) => ({
          id: String(a?.id || a?._id || ''),
          action: a?.action || a?.type || 'Atualização',
          user: a?.user || 'Sistema',
          timestamp: a?.createdAt ? new Date(a.createdAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'),
          details: a?.details || a?.description,
        }))
      : [],
  };
}

function unwrapData<T = any>(response: any): T {
  return (response?.data?.data ?? response?.data?.task ?? response?.data) as T;
}

export const taskService = {
  async getAll(filters: TaskFilters = {}): Promise<{ data: Task[]; pagination: { total: number; pages: number } }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/tasks?${params.toString()}`);
    const payload = unwrapData<any>(response);
    const root = payload?.data ? payload : response.data;
    const items = Array.isArray(root?.data) ? root.data : [];

    return {
      data: items.map(normalizeTask),
      pagination: root?.pagination || { total: items.length, pages: 1 },
    };
  },

  async getById(id: string): Promise<Task> {
    const response = await api.get(`/tasks/${id}`);
    return normalizeTask(unwrapData(response));
  },

  async create(task: Partial<Task>): Promise<Task> {
    const response = await api.post('/tasks', task);
    return normalizeTask(unwrapData(response));
  },

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const response = await api.put(`/tasks/${id}`, updates);
    return normalizeTask(unwrapData(response));
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await api.delete('/tasks/bulk', { data: { ids } });
  },

  async bulkUpdate(ids: string[], updates: Partial<Task>): Promise<void> {
    if (updates.status) {
      await api.put('/tasks/bulk/status', { ids, status: updates.status });
      return;
    }

    await Promise.all(ids.map((id) => api.put(`/tasks/${id}`, updates)));
  },

  async updateStatus(id: string, status: Task['status']): Promise<Task> {
    try {
      const response = await api.put(`/tasks/${id}/status`, { status });
      return normalizeTask(unwrapData(response));
    } catch {
      const response = await api.put(`/tasks/${id}`, { status });
      return normalizeTask(unwrapData(response));
    }
  },

  async addSubtask(id: string, title: string): Promise<Task> {
    const response = await api.post(`/tasks/${id}/subtasks`, { title });
    return normalizeTask(unwrapData(response));
  },

  async toggleSubtask(id: string, subtaskId: string): Promise<Task> {
    const response = await api.put(`/tasks/${id}/subtasks/${subtaskId}/toggle`);
    return normalizeTask(unwrapData(response));
  },

  async deleteSubtask(id: string, subtaskId: string): Promise<Task> {
    const response = await api.delete(`/tasks/${id}/subtasks/${subtaskId}`);
    return normalizeTask(unwrapData(response));
  },

  async addNote(id: string, content: string): Promise<Task> {
    const response = await api.post(`/tasks/${id}/notes`, { content });
    return normalizeTask(unwrapData(response));
  },

  async deleteNote(id: string, noteId: string): Promise<Task> {
    const response = await api.delete(`/tasks/${id}/notes/${noteId}`);
    return normalizeTask(unwrapData(response));
  },

  async getStats(): Promise<{
    total: number;
    todo: number;
    inProgress: number;
    done: number;
    overdue: number;
    dueToday: number;
  }> {
    const response = await api.get('/tasks/stats');
    return unwrapData(response);
  },
};

export default taskService;
