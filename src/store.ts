import { create } from 'zustand';
import type { AppPage, User, Lead, Conversation, Task, Channel, ConversationStatus, AutomationFlow, AutomationExecution, FinanceRecord, SellerGoal, CalendarEvent, Client } from './types';
import { mockUsers, mockLeads, mockConversations, mockTasks, mockAutomations, mockExecutions, mockFinanceRecords, mockSellerGoals } from './data/mockData';

const mockClients: Client[] = [
  { _id: 'cli_1', organizationId: 'org_1', name: 'João Silva', email: 'joao@techcorp.com', phone: '(11) 98765-4321', company: 'TechCorp Solutions', industry: 'technology', address: 'Rua das Flores, 123', city: 'São Paulo', state: 'SP', zipCode: '01310-100', country: 'Brasil', status: 'active', tags: ['enterprise', 'tech'], notes: [], annualSpend: 125000, leadsCount: 3, conversationsCount: 15, lastInteraction: '2024-01-15T10:30:00Z', createdAt: '2023-06-15T08:00:00Z', updatedAt: '2024-01-15T10:30:00Z' },
  { _id: 'cli_2', organizationId: 'org_1', name: 'Maria Santos', email: 'maria@dataflow.io', phone: '(11) 97654-3210', company: 'DataFlow Analytics', industry: 'analytics', address: 'Av. Paulista, 1000', city: 'São Paulo', state: 'SP', zipCode: '01310-200', country: 'Brasil', status: 'active', tags: ['startup', 'analytics'], notes: [{ id: 'n_1', content: 'Cliente muito engajado', author: 'Carlos', createdAt: '2024-01-10T14:00:00Z' }], annualSpend: 85000, leadsCount: 2, conversationsCount: 8, lastInteraction: '2024-01-14T16:45:00Z', createdAt: '2023-08-20T10:00:00Z', updatedAt: '2024-01-14T16:45:00Z' },
  { _id: 'cli_3', organizationId: 'org_1', name: 'Pedro Costa', email: 'pedro@cloudbase.com.br', phone: '(21) 99876-5432', company: 'CloudBase Inc', industry: 'cloud', address: 'Rua do Comércio, 500', city: 'Rio de Janeiro', state: 'RJ', zipCode: '20040-020', country: 'Brasil', status: 'active', tags: ['enterprise', 'cloud'], notes: [], annualSpend: 200000, leadsCount: 5, conversationsCount: 22, lastInteraction: '2024-01-15T09:00:00Z', createdAt: '2023-03-10T14:00:00Z', updatedAt: '2024-01-15T09:00:00Z' },
  { _id: 'cli_4', organizationId: 'org_1', name: 'Ana Oliveira', email: 'ana@megasoft.com', phone: '(31) 98765-1234', company: 'MegaSoft Ltd', industry: 'software', address: 'Av. Afonso Pena, 2000', city: 'Belo Horizonte', state: 'MG', zipCode: '30130-009', country: 'Brasil', status: 'inactive', tags: ['mid-market'], notes: [], annualSpend: 45000, leadsCount: 1, conversationsCount: 5, lastInteraction: '2023-12-20T11:30:00Z', createdAt: '2023-09-05T16:00:00Z', updatedAt: '2023-12-20T11:30:00Z' },
  { _id: 'cli_5', organizationId: 'org_1', name: 'Lucas Ferreira', email: 'lucas@startupbr.io', phone: '(11) 91234-5678', company: 'StartupBR', industry: 'startup', address: 'Rua Augusta, 1500', city: 'São Paulo', state: 'SP', zipCode: '01304-001', country: 'Brasil', status: 'active', tags: ['startup', 'fintech'], notes: [], annualSpend: 32000, leadsCount: 1, conversationsCount: 12, lastInteraction: '2024-01-13T14:20:00Z', createdAt: '2023-11-01T09:00:00Z', updatedAt: '2024-01-13T14:20:00Z' },
  { _id: 'cli_6', organizationId: 'org_1', name: 'Carla Mendes', email: 'carla@vendamais.com.br', phone: '(41) 99988-7766', company: 'VendaMais Corp', industry: 'retail', address: 'Rua XV de Novembro, 300', city: 'Curitiba', state: 'PR', zipCode: '80020-310', country: 'Brasil', status: 'active', tags: ['retail', 'enterprise'], notes: [], annualSpend: 150000, leadsCount: 4, conversationsCount: 18, lastInteraction: '2024-01-15T08:15:00Z', createdAt: '2023-04-22T11:00:00Z', updatedAt: '2024-01-15T08:15:00Z' },
];

export interface SettingsUser extends User {
  permissions?: string[];
  invitedAt?: string;
  lastLogin?: string;
}

export interface WebhookEndpoint {
  _id: string;
  url: string;
  events: string[];
  active: boolean;
  secret: string;
  createdAt: string;
  lastTriggered?: string;
  failCount: number;
}

export interface IntegrationConfig {
  name: string;
  status: 'connected' | 'disconnected' | 'pending';
  icon: string;
  description: string;
  category: string;
  connectedAt?: string;
  config?: Record<string, string>;
}

export interface AuditLog {
  _id: string;
  time: string;
  date: string;
  user: string;
  action: string;
  type: 'auth' | 'message' | 'automation' | 'crm' | 'admin' | 'system' | 'webhook' | 'finance' | 'settings';
  ip: string;
  details?: string;
}

interface AppState {
  currentPage: AppPage;
  setCurrentPage: (page: AppPage) => void;

  isAuthenticated: boolean;
  currentUser: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;

  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  
  aiAssistantVisible: boolean;
  toggleAiAssistant: () => void;

  leads: Lead[];
  addLead: (lead: Lead) => void;
  updateLead: (leadId: string, updates: Partial<Lead>) => void;
  deleteLead: (leadId: string) => void;
  moveLeadToStage: (leadId: string, stageId: string) => void;

  conversations: Conversation[];
  selectedConversation: string | null;
  setSelectedConversation: (id: string | null) => void;
  sendMessage: (conversationId: string, content: string) => void;
  channelFilter: Channel | 'all';
  setChannelFilter: (filter: Channel | 'all') => void;
  statusFilter: ConversationStatus | 'all';
  setStatusFilter: (filter: ConversationStatus | 'all') => void;

  tasks: Task[];
  updateTaskStatus: (taskId: string, status: Task['status']) => void;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  addTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;

  selectedPipelineId: string;
  setSelectedPipelineId: (id: string) => void;

  searchQuery: string;
  setSearchQuery: (query: string) => void;

  automations: AutomationFlow[];
  automationExecutions: AutomationExecution[];
  addAutomation: (automation: AutomationFlow) => void;
  updateAutomation: (id: string, updates: Partial<AutomationFlow>) => void;
  deleteAutomation: (id: string) => void;
  toggleAutomation: (id: string) => void;
  duplicateAutomation: (id: string) => AutomationFlow;
  addExecution: (execution: AutomationExecution) => void;

  financeRecords: FinanceRecord[];
  addFinanceRecord: (record: FinanceRecord) => void;
  updateFinanceRecord: (id: string, updates: Partial<FinanceRecord>) => void;
  deleteFinanceRecord: (id: string) => void;

  sellerGoals: SellerGoal[];
  updateSellerGoal: (id: string, updates: Partial<SellerGoal>) => void;

  settingsUsers: SettingsUser[];
  addSettingsUser: (user: SettingsUser) => void;
  updateSettingsUser: (id: string, updates: Partial<SettingsUser>) => void;
  deleteSettingsUser: (id: string) => void;

  webhooks: WebhookEndpoint[];
  addWebhook: (webhook: WebhookEndpoint) => void;
  updateWebhook: (id: string, updates: Partial<WebhookEndpoint>) => void;
  deleteWebhook: (id: string) => void;

  integrations: IntegrationConfig[];
  updateIntegration: (name: string, updates: Partial<IntegrationConfig>) => void;

  auditLogs: AuditLog[];
  addAuditLog: (log: AuditLog) => void;

  // Branding settings
  branding: {
    companyName: string;
    primaryColor: string;
    logo: string | null;
    darkMode: boolean;
  };
  updateBranding: (updates: Partial<AppState['branding']>) => void;

  calendarEvents: CalendarEvent[];
  addCalendarEvent: (event: CalendarEvent) => void;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;

  clients: Client[];
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
}

export const useStore = create<AppState>((set) => ({
  currentPage: 'login',
  setCurrentPage: (page) => set({ currentPage: page }),

  isAuthenticated: false,
  currentUser: null,
  login: (email: string, _password: string) => {
    const user = mockUsers.find(u => u.email === email);
    if (user || email) {
      set({
        isAuthenticated: true,
        currentUser: user || { ...mockUsers[0], email },
        currentPage: 'dashboard',
      });
      return true;
    }
    return false;
  },
  logout: () => set({ isAuthenticated: false, currentUser: null, currentPage: 'login' }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  aiAssistantVisible: true,
  toggleAiAssistant: () => set((state) => ({ aiAssistantVisible: !state.aiAssistantVisible })),

  leads: mockLeads,
  addLead: (lead) =>
    set((state) => ({
      leads: [lead, ...state.leads],
    })),
  updateLead: (leadId, updates) =>
    set((state) => ({
      leads: state.leads.map((l) => (l._id === leadId ? { ...l, ...updates } : l)),
    })),
  deleteLead: (leadId) =>
    set((state) => ({
      leads: state.leads.filter((l) => l._id !== leadId),
    })),
  moveLeadToStage: (leadId, stageId) =>
    set((state) => ({
      leads: state.leads.map((l) => (l._id === leadId ? { ...l, stageId } : l)),
    })),

  conversations: mockConversations,
  selectedConversation: null,
  setSelectedConversation: (id) => set({ selectedConversation: id }),
  sendMessage: (conversationId, content) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c._id === conversationId
          ? {
              ...c,
              lastMessage: content,
              lastMessageTime: 'Agora',
              messages: [
                ...c.messages,
                {
                  _id: `m_${Date.now()}`,
                  sender: 'agent' as const,
                  senderName: state.currentUser?.name || 'Agente',
                  content,
                  timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                },
              ],
            }
          : c
      ),
    })),
  channelFilter: 'all',
  setChannelFilter: (filter) => set({ channelFilter: filter }),
  statusFilter: 'all',
  setStatusFilter: (filter) => set({ statusFilter: filter }),

  tasks: mockTasks,
  updateTaskStatus: (taskId, status) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === taskId ? { ...t, status } : t)),
    })),
  updateTask: (taskId, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t._id === taskId ? { ...t, ...updates } : t)),
    })),
  addTask: (task) =>
    set((state) => ({
      tasks: [task, ...state.tasks],
    })),
  deleteTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t._id !== taskId),
    })),

  selectedPipelineId: 'pip_1',
  setSelectedPipelineId: (id) => set({ selectedPipelineId: id }),

  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  automations: mockAutomations,
  automationExecutions: mockExecutions,
  addAutomation: (automation) =>
    set((state) => ({
      automations: [automation, ...state.automations],
    })),
  updateAutomation: (id, updates) =>
    set((state) => ({
      automations: state.automations.map((a) => (a._id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a)),
    })),
  deleteAutomation: (id) =>
    set((state) => ({
      automations: state.automations.filter((a) => a._id !== id),
    })),
  toggleAutomation: (id) =>
    set((state) => ({
      automations: state.automations.map((a) => (a._id === id ? { ...a, active: !a.active } : a)),
    })),
  duplicateAutomation: (id) => {
    const state = useStore.getState();
    const original = state.automations.find((a) => a._id === id);
    if (!original) throw new Error('Automation not found');
    const newAutomation: AutomationFlow = {
      ...original,
      _id: `a_${Date.now()}`,
      name: `${original.name} (cópia)`,
      active: false,
      executionCount: 0,
      successCount: 0,
      failCount: 0,
      lastRun: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((state) => ({
      automations: [newAutomation, ...state.automations],
    }));
    return newAutomation;
  },
  addExecution: (execution) =>
    set((state) => ({
      automationExecutions: [execution, ...state.automationExecutions],
    })),

  financeRecords: mockFinanceRecords,
  addFinanceRecord: (record) =>
    set((state) => ({
      financeRecords: [record, ...state.financeRecords],
    })),
  updateFinanceRecord: (id, updates) =>
    set((state) => ({
      financeRecords: state.financeRecords.map((r) => (r._id === id ? { ...r, ...updates } : r)),
    })),
  deleteFinanceRecord: (id) =>
    set((state) => ({
      financeRecords: state.financeRecords.filter((r) => r._id !== id),
    })),

  sellerGoals: mockSellerGoals,
  updateSellerGoal: (id, updates) =>
    set((state) => ({
      sellerGoals: state.sellerGoals.map((g) => (g._id === id ? { ...g, ...updates } : g)),
    })),

  settingsUsers: mockUsers.map(u => ({ ...u, permissions: ['dashboard', 'crm', 'omnichannel', 'tasks'], lastLogin: '2024-01-15T10:30:00Z' })) as SettingsUser[],
  addSettingsUser: (user) => set((state) => ({ settingsUsers: [user, ...state.settingsUsers] })),
  updateSettingsUser: (id, updates) => set((state) => ({ settingsUsers: state.settingsUsers.map(u => u._id === id ? { ...u, ...updates } : u) })),
  deleteSettingsUser: (id) => set((state) => ({ settingsUsers: state.settingsUsers.filter(u => u._id !== id) })),

  webhooks: [
    { _id: 'wh_1', url: 'https://api.myapp.com/webhooks/leads', events: ['lead.created', 'lead.updated'], active: true, secret: 'whsec_abc123xyz', createdAt: '2024-01-10', lastTriggered: '2024-01-15T10:30:00Z', failCount: 0 },
    { _id: 'wh_2', url: 'https://hooks.zapier.com/hooks/catch/123456', events: ['deal.won', 'deal.lost'], active: true, secret: 'whsec_def456uvw', createdAt: '2024-01-08', lastTriggered: '2024-01-14T08:15:00Z', failCount: 2 },
    { _id: 'wh_3', url: 'https://api.slack.com/notifications', events: ['message.received'], active: false, secret: 'whsec_ghi789rst', createdAt: '2024-01-05', failCount: 5 },
  ],
  addWebhook: (webhook) => set((state) => ({ webhooks: [webhook, ...state.webhooks] })),
  updateWebhook: (id, updates) => set((state) => ({ webhooks: state.webhooks.map(w => w._id === id ? { ...w, ...updates } : w) })),
  deleteWebhook: (id) => set((state) => ({ webhooks: state.webhooks.filter(w => w._id !== id) })),

  integrations: [
    { name: 'WhatsApp Cloud API', status: 'connected', icon: '💬', description: '2 números conectados', category: 'messaging', connectedAt: '2024-01-05' },
    { name: 'Instagram DM', status: 'connected', icon: '📸', description: '1 conta conectada', category: 'messaging', connectedAt: '2024-01-08' },
    { name: 'Facebook Messenger', status: 'connected', icon: '👤', description: '1 página conectada', category: 'messaging', connectedAt: '2024-01-03' },
    { name: 'Telegram Bot', status: 'disconnected', icon: '✈️', description: 'Bot de atendimento', category: 'messaging' },
    { name: 'Google Calendar', status: 'connected', icon: '📅', description: 'Sincronizado', category: 'productivity', connectedAt: '2024-01-02' },
    { name: 'Stripe', status: 'connected', icon: '💳', description: 'Modo produção', category: 'payment', connectedAt: '2024-01-01' },
    { name: 'Cloudinary', status: 'connected', icon: '☁️', description: 'Upload ativo', category: 'storage', connectedAt: '2024-01-04' },
    { name: 'Slack', status: 'disconnected', icon: '💼', description: 'Notificações de equipe', category: 'productivity' },
    { name: 'HubSpot', status: 'disconnected', icon: '🟠', description: 'Sincronização CRM', category: 'crm' },
    { name: 'Mailchimp', status: 'disconnected', icon: '📧', description: 'Email marketing', category: 'marketing' },
    { name: 'Google Analytics', status: 'connected', icon: '📊', description: 'Rastreamento ativo', category: 'analytics', connectedAt: '2024-01-06' },
    { name: 'Zapier', status: 'connected', icon: '⚡', description: '12 zaps ativos', category: 'automation', connectedAt: '2024-01-07' },
    { name: 'Google OAuth', status: 'disconnected', icon: '🔐', description: 'Login com Google', category: 'auth' },
    { name: 'Microsoft OAuth', status: 'disconnected', icon: '🔐', description: 'Login com Microsoft', category: 'auth' },
    { name: 'Apple Sign In', status: 'disconnected', icon: '🔐', description: 'Login com Apple', category: 'auth' },
  ],
  updateIntegration: (name, updates) => set((state) => ({ integrations: state.integrations.map(i => i.name === name ? { ...i, ...updates } : i) })),

  // Branding settings
  branding: {
    companyName: 'NexCRM',
    primaryColor: '#6366f1',
    logo: null,
    darkMode: false,
  },
  updateBranding: (updates) => set((state) => {
    const newBranding = { ...state.branding, ...updates };
    // Apply CSS variable for primary color
    if (updates.primaryColor) {
      document.documentElement.style.setProperty('--brand-color', updates.primaryColor);
      // Generate color variations
      const hex = updates.primaryColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      document.documentElement.style.setProperty('--brand-rgb', `${r}, ${g}, ${b}`);
    }
    // Save to localStorage for persistence
    localStorage.setItem('nexcrm-branding', JSON.stringify(newBranding));
    return { branding: newBranding };
  }),

  auditLogs: [
    { _id: 'log_1', time: '10:35:22', date: '2024-01-15', user: 'Carlos Silva', action: 'Login realizado', type: 'auth', ip: '189.45.xxx.xxx' },
    { _id: 'log_2', time: '10:33:15', date: '2024-01-15', user: 'Maria Costa', action: 'Mensagem enviada para João', type: 'message', ip: '189.45.xxx.xxx' },
    { _id: 'log_3', time: '10:30:44', date: '2024-01-15', user: 'Sistema', action: 'Automação "Boas-vindas" executada', type: 'automation', ip: '—' },
    { _id: 'log_4', time: '10:28:10', date: '2024-01-15', user: 'Pedro Santos', action: 'Lead movido para Proposta', type: 'crm', ip: '200.12.xxx.xxx' },
    { _id: 'log_5', time: '10:25:33', date: '2024-01-15', user: 'Ana Oliveira', action: 'Permissão de usuário atualizada', type: 'admin', ip: '189.45.xxx.xxx' },
    { _id: 'log_6', time: '10:20:00', date: '2024-01-15', user: 'Sistema', action: 'Backup automático concluído', type: 'system', ip: '—' },
    { _id: 'log_7', time: '10:15:22', date: '2024-01-15', user: 'Lucas Ferreira', action: 'Deal valor R$45.000 atualizado', type: 'crm', ip: '201.33.xxx.xxx' },
    { _id: 'log_8', time: '10:10:45', date: '2024-01-15', user: 'Sistema', action: 'Webhook WhatsApp recebido', type: 'webhook', ip: '52.86.xxx.xxx' },
    { _id: 'log_9', time: '10:05:30', date: '2024-01-15', user: 'Carlos Silva', action: 'Transação R$12.500 registrada', type: 'finance', ip: '189.45.xxx.xxx' },
    { _id: 'log_10', time: '10:00:15', date: '2024-01-15', user: 'Maria Costa', action: 'Integração Stripe configurada', type: 'settings', ip: '189.45.xxx.xxx' },
    { _id: 'log_11', time: '09:55:00', date: '2024-01-15', user: 'Sistema', action: 'Rate limit atingido (IP 45.33.xx)', type: 'system', ip: '45.33.xxx.xxx' },
    { _id: 'log_12', time: '09:50:22', date: '2024-01-15', user: 'Pedro Santos', action: 'Novo lead criado: Tech Corp', type: 'crm', ip: '200.12.xxx.xxx' },
    { _id: 'log_13', time: '09:45:10', date: '2024-01-14', user: 'Ana Oliveira', action: 'Relatório exportado (CSV)', type: 'admin', ip: '189.45.xxx.xxx' },
    { _id: 'log_14', time: '09:40:05', date: '2024-01-14', user: 'Sistema', action: 'Automação "Follow-up" falhou', type: 'automation', ip: '—', details: 'Timeout ao enviar email' },
    { _id: 'log_15', time: '09:35:00', date: '2024-01-14', user: 'Lucas Ferreira', action: 'Tarefa concluída: Proposta DataFlow', type: 'crm', ip: '201.33.xxx.xxx' },
    { _id: 'log_16', time: '09:30:00', date: '2024-01-14', user: 'Carlos Silva', action: 'Webhook endpoint atualizado', type: 'webhook', ip: '189.45.xxx.xxx' },
    { _id: 'log_17', time: '09:25:00', date: '2024-01-14', user: 'Maria Costa', action: 'Usuário convidado: novo@email.com', type: 'admin', ip: '189.45.xxx.xxx' },
    { _id: 'log_18', time: '09:20:00', date: '2024-01-14', user: 'Sistema', action: 'Certificado SSL renovado', type: 'system', ip: '—' },
  ],
  addAuditLog: (log) => set((state) => ({ auditLogs: [log, ...state.auditLogs] })),

  calendarEvents: [
    { _id: 'ev_1', title: 'Reunião com TechCorp', description: 'Apresentação de proposta comercial para expansão do contrato', category: 'meeting', date: new Date().toISOString().split('T')[0], startTime: '09:00', endTime: '10:00', color: '#6366f1', leadName: 'TechCorp Solutions', assignedTo: 'u_1', assignedName: 'Carlos Silva', location: 'Google Meet', reminder: 15 },
    { _id: 'ev_2', title: 'Follow-up DataFlow', description: 'Ligar para confirmar interesse na proposta enviada', category: 'call', date: new Date().toISOString().split('T')[0], startTime: '11:00', endTime: '11:30', color: '#10b981', leadName: 'DataFlow Analytics', assignedTo: 'u_2', assignedName: 'Maria Costa', reminder: 10 },
    { _id: 'ev_3', title: 'Demo CloudBase', description: 'Demonstração do produto para equipe técnica', category: 'meeting', date: new Date().toISOString().split('T')[0], startTime: '14:00', endTime: '15:30', color: '#8b5cf6', leadName: 'CloudBase Inc', assignedTo: 'u_1', assignedName: 'Carlos Silva', location: 'Zoom' },
    { _id: 'ev_4', title: 'Deadline Proposta MaxData', description: 'Prazo final para envio da proposta revisada', category: 'deadline', date: new Date().toISOString().split('T')[0], startTime: '17:00', endTime: '17:30', color: '#ef4444', leadName: 'MaxData Systems' },
    { _id: 'ev_5', title: 'Almoço de equipe', description: 'Almoço mensal da equipe comercial', category: 'personal', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], startTime: '12:00', endTime: '13:30', color: '#f59e0b', allDay: false, location: 'Restaurante Sabor & Arte' },
    { _id: 'ev_6', title: 'Revisão de metas', description: 'Revisão trimestral de metas com toda a equipe', category: 'meeting', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], startTime: '09:00', endTime: '10:30', color: '#6366f1', assignedTo: 'u_1', assignedName: 'Carlos Silva', location: 'Sala de Reuniões' },
    { _id: 'ev_7', title: 'Call com investidor', description: 'Apresentação de resultados para investidor anjo', category: 'call', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], startTime: '15:00', endTime: '16:00', color: '#10b981', assignedTo: 'u_3', assignedName: 'Pedro Santos' },
    { _id: 'ev_8', title: 'Entrega relatório mensal', description: 'Finalizar e enviar relatório mensal de vendas', category: 'task', date: new Date(Date.now() + 2*86400000).toISOString().split('T')[0], startTime: '10:00', endTime: '11:00', color: '#3b82f6', assignedTo: 'u_2', assignedName: 'Maria Costa' },
    { _id: 'ev_9', title: 'Treinamento novo CRM', description: 'Sessão de treinamento para novos membros', category: 'meeting', date: new Date(Date.now() + 2*86400000).toISOString().split('T')[0], startTime: '14:00', endTime: '16:00', color: '#8b5cf6', location: 'Auditório', allDay: false },
    { _id: 'ev_10', title: 'Follow-up semanal', description: 'Contato com leads da semana anterior', category: 'follow_up', date: new Date(Date.now() + 3*86400000).toISOString().split('T')[0], startTime: '09:00', endTime: '10:30', color: '#ec4899', assignedTo: 'u_4', assignedName: 'Lucas Ferreira' },
    { _id: 'ev_11', title: 'Reunião de pipeline', description: 'Revisão do funil de vendas semanal', category: 'meeting', date: new Date(Date.now() + 3*86400000).toISOString().split('T')[0], startTime: '11:00', endTime: '12:00', color: '#6366f1', assignedTo: 'u_1', assignedName: 'Carlos Silva' },
    { _id: 'ev_12', title: 'Webinar Marketing Digital', description: 'Participar do webinar sobre novas tendências', category: 'personal', date: new Date(Date.now() + 4*86400000).toISOString().split('T')[0], startTime: '16:00', endTime: '17:30', color: '#f59e0b' },
    { _id: 'ev_13', title: 'Prazo contrato MegaSoft', description: 'Deadline para assinatura do contrato', category: 'deadline', date: new Date(Date.now() + 5*86400000).toISOString().split('T')[0], startTime: '18:00', endTime: '18:30', color: '#ef4444', leadName: 'MegaSoft Ltd' },
    { _id: 'ev_14', title: 'Happy Hour', description: 'Confraternização da equipe', category: 'personal', date: new Date(Date.now() + 5*86400000).toISOString().split('T')[0], startTime: '18:00', endTime: '20:00', color: '#f59e0b', location: 'Bar da Esquina' },
    { _id: 'ev_15', title: 'Planejamento Sprint', description: 'Definição de prioridades para a próxima sprint', category: 'meeting', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], startTime: '09:00', endTime: '10:00', color: '#6366f1', completed: true },
    { _id: 'ev_16', title: 'Envio de propostas', description: 'Enviar propostas para 3 novos leads', category: 'task', date: new Date(Date.now() - 86400000).toISOString().split('T')[0], startTime: '14:00', endTime: '16:00', color: '#3b82f6', completed: true },
  ],
  addCalendarEvent: (event) => set((state) => ({ calendarEvents: [event, ...state.calendarEvents] })),
  updateCalendarEvent: (id, updates) => set((state) => ({ calendarEvents: state.calendarEvents.map(e => e._id === id ? { ...e, ...updates } : e) })),
  deleteCalendarEvent: (id) => set((state) => ({ calendarEvents: state.calendarEvents.filter(e => e._id !== id) })),

  clients: mockClients,
  addClient: (client) => set((state) => ({ clients: [client, ...state.clients] })),
  updateClient: (id, updates) => set((state) => ({ clients: state.clients.map(c => c._id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c) })),
  deleteClient: (id) => set((state) => ({ clients: state.clients.filter(c => c._id !== id) })),
}));
