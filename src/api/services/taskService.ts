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

export const taskService = {
  async getAll(filters: TaskFilters = {}): Promise<{ data: Task[]; pagination: { total: number; pages: number } }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/tasks?${params.toString()}`);
    return response.data;
  },

  async getById(id: string): Promise<Task> {
    const response = await api.get(`/tasks/${id}`);
    return response.data.data;
  },

  async create(task: Partial<Task>): Promise<Task> {
    const response = await api.post('/tasks', task);
    return response.data.data;
  },

  async update(id: string, updates: Partial<Task>): Promise<Task> {
    const response = await api.put(`/tasks/${id}`, updates);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/tasks/${id}`);
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await api.post('/tasks/bulk/delete', { ids });
  },

  async bulkUpdate(ids: string[], updates: Partial<Task>): Promise<void> {
    await api.post('/tasks/bulk/update', { ids, updates });
  },

  async updateStatus(id: string, status: Task['status']): Promise<Task> {
    const response = await api.put(`/tasks/${id}/status`, { status });
    return response.data.data;
  },

  async addSubtask(id: string, title: string): Promise<Task> {
    const response = await api.post(`/tasks/${id}/subtasks`, { title });
    return response.data.data;
  },

  async toggleSubtask(id: string, subtaskId: string): Promise<Task> {
    const response = await api.put(`/tasks/${id}/subtasks/${subtaskId}/toggle`);
    return response.data.data;
  },

  async deleteSubtask(id: string, subtaskId: string): Promise<Task> {
    const response = await api.delete(`/tasks/${id}/subtasks/${subtaskId}`);
    return response.data.data;
  },

  async addNote(id: string, content: string): Promise<Task> {
    const response = await api.post(`/tasks/${id}/notes`, { content });
    return response.data.data;
  },

  async deleteNote(id: string, noteId: string): Promise<Task> {
    const response = await api.delete(`/tasks/${id}/notes/${noteId}`);
    return response.data.data;
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
    return response.data.data;
  },
};

export default taskService;
