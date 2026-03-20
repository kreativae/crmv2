import api from '../client';

export interface DashboardData {
  totalLeads: number;
  totalClients: number;
  totalRevenue: number;
  conversionRate: number;
  avgTicket: number;
  openConversations: number;
  pendingTasks: number;
  todayEvents: number;
  leadsGrowth: number;
  revenueGrowth: number;
  recentLeads: Array<{ date: string; count: number }>;
  recentRevenue: Array<{ date: string; amount: number }>;
  leadsBySource: Record<string, number>;
  leadsByStatus: Record<string, number>;
}

export interface FunnelData {
  stages: Array<{
    name: string;
    count: number;
    value: number;
    conversionRate: number;
  }>;
  totalValue: number;
  avgDealSize: number;
  avgTimeToClose: number;
}

export interface SellerPerformance {
  userId: string;
  name: string;
  avatar?: string;
  leads: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  avgTicket: number;
  score: number;
  ranking: number;
}

export interface ChannelPerformance {
  channel: string;
  leads: number;
  conversations: number;
  conversions: number;
  revenue: number;
  conversionRate: number;
  avgResponseTime: number;
}

export interface CohortData {
  cohorts: Array<{
    month: string;
    periods: number[];
  }>;
}

export const analyticsService = {
  async getDashboard(period: '7d' | '30d' | '90d' | '12m' = '30d'): Promise<DashboardData> {
    const response = await api.get(`/analytics/dashboard?period=${period}`);
    return response.data.data;
  },

  async getFunnel(pipelineId?: string): Promise<FunnelData> {
    const params = pipelineId ? `?pipelineId=${pipelineId}` : '';
    const response = await api.get(`/analytics/funnel${params}`);
    return response.data.data;
  },

  async getSellers(period: '7d' | '30d' | '90d' | '12m' = '30d'): Promise<SellerPerformance[]> {
    const response = await api.get(`/analytics/sellers?period=${period}`);
    return response.data.data;
  },

  async getChannels(period: '7d' | '30d' | '90d' | '12m' = '30d'): Promise<ChannelPerformance[]> {
    const response = await api.get(`/analytics/channels?period=${period}`);
    return response.data.data;
  },

  async getCohort(months: number = 6): Promise<CohortData> {
    const response = await api.get(`/analytics/cohort?months=${months}`);
    return response.data.data;
  },

  async getLeadsBySource(period: '7d' | '30d' | '90d' | '12m' = '30d'): Promise<Record<string, number>> {
    const response = await api.get(`/analytics/leads-by-source?period=${period}`);
    return response.data.data;
  },

  async getRevenueByMonth(year: number): Promise<Array<{ month: string; revenue: number; expenses: number }>> {
    const response = await api.get(`/analytics/revenue-by-month?year=${year}`);
    return response.data.data;
  },

  async exportReport(
    type: 'dashboard' | 'funnel' | 'sellers' | 'channels',
    format: 'csv' | 'pdf' | 'json',
    period: '7d' | '30d' | '90d' | '12m' = '30d'
  ): Promise<Blob> {
    const response = await api.get(`/analytics/export?type=${type}&format=${format}&period=${period}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default analyticsService;
