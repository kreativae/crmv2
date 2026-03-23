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

const unwrap = <T>(response: any): T => {
  return (response?.data?.data ?? response?.data) as T;
};

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
    return unwrap<Conversation>(response);
  },

  async create(data: {
    contactName: string;
    contactEmail?: string;
    contactPhone?: string;
    channel: Channel;
  }): Promise<Conversation> {
    const response = await api.post('/conversations', data);
    return unwrap<Conversation>(response);
  },

  async sendMessage(conversationId: string, data: SendMessageData): Promise<Conversation> {
    const response = await api.post(`/conversations/${conversationId}/messages`, data);
    return unwrap<Conversation>(response);
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
    return unwrap<Conversation>(response);
  },

  async transfer(conversationId: string, toUserId: string, note?: string): Promise<Conversation> {
    const response = await api.put(`/conversations/${conversationId}/transfer`, { toUserId, note });
    return unwrap<Conversation>(response);
  },

  async close(conversationId: string): Promise<Conversation> {
    const response = await api.put(`/conversations/${conversationId}/close`);
    return unwrap<Conversation>(response);
  },

  async reopen(conversationId: string): Promise<Conversation> {
    const response = await api.put(`/conversations/${conversationId}/reopen`);
    return unwrap<Conversation>(response);
  },

  async markAsRead(conversationId: string): Promise<void> {
    await api.put(`/conversations/${conversationId}/read`);
  },

  async addTag(conversationId: string, tag: string): Promise<Conversation> {
    const conversation = await this.getById(conversationId);
    const tags = Array.from(new Set([...(conversation as any).contactTags || [], tag]));
    const response = await api.put(`/conversations/${conversationId}/tags`, { tags });
    return unwrap<Conversation>(response);
  },

  async removeTag(conversationId: string, tag: string): Promise<Conversation> {
    const conversation = await this.getById(conversationId);
    const tags = ((conversation as any).contactTags || []).filter((t: string) => t !== tag);
    const response = await api.put(`/conversations/${conversationId}/tags`, { tags });
    return unwrap<Conversation>(response);
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
    return unwrap(response);
  },

  async exportChat(conversationId: string): Promise<Blob> {
    const response = await api.get(`/conversations/${conversationId}/export`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default conversationService;
