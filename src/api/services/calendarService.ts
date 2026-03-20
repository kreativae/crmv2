import api from '../client';
import type { CalendarEvent } from '../../types';

export interface CalendarFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  assignedTo?: string;
}

export const calendarService = {
  async getAll(filters: CalendarFilters = {}): Promise<{ data: CalendarEvent[] }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/calendar?${params.toString()}`);
    return response.data;
  },

  async getById(id: string): Promise<CalendarEvent> {
    const response = await api.get(`/calendar/${id}`);
    return response.data.data;
  },

  async create(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const response = await api.post('/calendar', event);
    return response.data.data;
  },

  async update(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const response = await api.put(`/calendar/${id}`, updates);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/calendar/${id}`);
  },

  async getByRange(start: string, end: string): Promise<CalendarEvent[]> {
    const response = await api.get(`/calendar/range?start=${start}&end=${end}`);
    return response.data.data;
  },

  async getUpcoming(days: number = 7): Promise<CalendarEvent[]> {
    const response = await api.get(`/calendar/upcoming?days=${days}`);
    return response.data.data;
  },

  async toggleComplete(id: string): Promise<CalendarEvent> {
    const response = await api.put(`/calendar/${id}/toggle-complete`);
    return response.data.data;
  },

  async getStats(): Promise<{
    total: number;
    today: number;
    thisWeek: number;
    byCategory: Record<string, number>;
  }> {
    const response = await api.get('/calendar/stats');
    return response.data.data;
  },
};

export default calendarService;
