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

// Transform form data (with date/startTime/endTime) to backend format (with startDate/endDate)
const transformToBackend = (event: Partial<CalendarEvent>): any => {
  if (!event.date || !event.startTime) {
    throw new Error('Data e hora de início são obrigatórias');
  }
  
  const [year, month, day] = event.date.split('-').map(Number);
  const [startHour, startMin] = event.startTime.split(':').map(Number);
  const [endHour, endMin] = (event.endTime || '10:00').split(':').map(Number);
  
  // Use UTC to avoid timezone issues
  const startDate = new Date(Date.UTC(year, month - 1, day, startHour, startMin, 0));
  const endDate = new Date(Date.UTC(year, month - 1, day, endHour, endMin, 0));
  
  const { date, startTime, endTime, assignedName, leadName, ...rest } = event;
  
  return {
    ...rest,
    startDate,
    endDate,
  };
};

// Transform backend data (with startDate/endDate) to form format (with date/startTime/endTime)
const transformFromBackend = (event: any): CalendarEvent => {
  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate || event.startDate);
  
  // Extract date and time in UTC
  const year = startDate.getUTCFullYear();
  const month = String(startDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(startDate.getUTCDate()).padStart(2, '0');
  const date = `${year}-${month}-${day}`;
  
  const startTime = `${String(startDate.getUTCHours()).padStart(2, '0')}:${String(startDate.getUTCMinutes()).padStart(2, '0')}`;
  const endTime = `${String(endDate.getUTCHours()).padStart(2, '0')}:${String(endDate.getUTCMinutes()).padStart(2, '0')}`;
  
  return {
    ...event,
    date,
    startTime,
    endTime,
  } as CalendarEvent;
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
    const events = unwrap<any[]>(response);
    return { data: events.map(transformFromBackend) };
  },

  async getById(id: string): Promise<CalendarEvent> {
    const response = await api.get(`/calendar/${id}`);
    const event = unwrap<any>(response);
    return transformFromBackend(event);
  },

  async create(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const backendPayload = transformToBackend(event);
    const response = await api.post('/calendar', backendPayload);
    const created = unwrap<any>(response);
    return transformFromBackend(created);
  },

  async update(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const backendPayload = transformToBackend(updates);
    const response = await api.put(`/calendar/${id}`, backendPayload);
    const updated = unwrap<any>(response);
    return transformFromBackend(updated);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/calendar/${id}`);
  },

  async getByRange(start: string, end: string): Promise<CalendarEvent[]> {
    const response = await api.get(`/calendar?startDate=${start}&endDate=${end}`);
    const events = unwrap<any[]>(response);
    return events.map(transformFromBackend);
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
