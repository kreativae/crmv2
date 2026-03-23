import api from '../client';
import type { CalendarEvent } from '../../types';

export interface CalendarFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  assignedTo?: string;
}

const unwrap = <T>(response: any): T => {
  return (response?.data?.data ?? response?.data) as T;
};

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
    return unwrap<CalendarEvent>(response);
  },

  async create(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const response = await api.post('/calendar', event);
    return unwrap<CalendarEvent>(response);
  },

  async update(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const response = await api.put(`/calendar/${id}`, updates);
    return unwrap<CalendarEvent>(response);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/calendar/${id}`);
  },

  async getByRange(start: string, end: string): Promise<CalendarEvent[]> {
    const response = await api.get(`/calendar?startDate=${start}&endDate=${end}`);
    return unwrap<CalendarEvent[]>(response);
  },

  async getUpcoming(days: number = 7): Promise<CalendarEvent[]> {
    const response = await api.get(`/calendar/upcoming?days=${days}`);
    return unwrap<CalendarEvent[]>(response);
  },

  async toggleComplete(id: string): Promise<CalendarEvent> {
    const current = await this.getById(id);
    const response = await api.put(`/calendar/${id}`, { completed: !current.completed });
    return unwrap<CalendarEvent>(response);
  },

  async getStats(): Promise<{
    total: number;
    today: number;
    thisWeek: number;
    byCategory: Record<string, number>;
  }> {
    const response = await api.get('/calendar/stats');
    return unwrap(response);
  },
};

export default calendarService;
