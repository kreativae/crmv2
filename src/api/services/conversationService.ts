import api from '../client';
import type { Conversation, Channel, ConversationStatus } from '../../types';

export interface ConversationFilters {
  page?: number;
  limit?: number;
  channel?: Channel;
  status?: ConversationStatus;
  assignedTo?: string;
  search?: string;
}

export interface SendMessageData {
  content: string;
  type?: 'text' | 'image' | 'audio' | 'document';
  attachments?: string[];
  isInternal?: boolean;
}

export const conversationService = {
  async getAll(filters: ConversationFilters = {}): Promise<{ data: Conversation[]; pagination: { total: number } }> {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        params.append(key, String(value));
      }
    });
    const response = await api.get(`/conversations?${params.toString()}`);
    return response.data;
  },

  async getById(id: string): Promise<Conversation> {
    const response = await api.get(`/conversations/${id}`);
    return response.data.data;
  },

  async create(data: {
    contactName: string;
    contactEmail?: string;
    contactPhone?: string;
    channel: Channel;
  }): Promise<Conversation> {
    const response = await api.post('/conversations', data);
    return response.data.data;
  },

  async sendMessage(conversationId: string, data: SendMessageData): Promise<Conversation> {
    const response = await api.post(`/conversations/${conversationId}/messages`, data);
    return response.data.data;
  },

  async getMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<{
    data: Conversation['messages'];
    pagination: { total: number; pages: number };
  }> {
    const response = await api.get(`/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
    return response.data;
  },

  async assign(conversationId: string, userId: string): Promise<Conversation> {
    const response = await api.put(`/conversations/${conversationId}/assign`, { userId });
    return response.data.data;
  },

  async transfer(conversationId: string, toUserId: string, note?: string): Promise<Conversation> {
    const response = await api.post(`/conversations/${conversationId}/transfer`, { toUserId, note });
    return response.data.data;
  },

  async close(conversationId: string): Promise<Conversation> {
    const response = await api.put(`/conversations/${conversationId}/close`);
    return response.data.data;
  },

  async reopen(conversationId: string): Promise<Conversation> {
    const response = await api.put(`/conversations/${conversationId}/reopen`);
    return response.data.data;
  },

  async markAsRead(conversationId: string): Promise<void> {
    await api.put(`/conversations/${conversationId}/read`);
  },

  async addTag(conversationId: string, tag: string): Promise<Conversation> {
    const response = await api.post(`/conversations/${conversationId}/tags`, { tag });
    return response.data.data;
  },

  async removeTag(conversationId: string, tag: string): Promise<Conversation> {
    const response = await api.delete(`/conversations/${conversationId}/tags/${encodeURIComponent(tag)}`);
    return response.data.data;
  },

  async getStats(): Promise<{
    total: number;
    open: number;
    pending: number;
    resolved: number;
    byChannel: Record<string, number>;
    avgResponseTime: number;
  }> {
    const response = await api.get('/conversations/stats');
    return response.data.data;
  },

  async exportChat(conversationId: string): Promise<Blob> {
    const response = await api.get(`/conversations/${conversationId}/export`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default conversationService;
