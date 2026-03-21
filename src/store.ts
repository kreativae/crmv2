import { create } from 'zustand';
import type { AppPage, User, Lead, Conversation, Task, Channel, ConversationStatus, AutomationFlow, AutomationExecution, FinanceRecord, SellerGoal, CalendarEvent, Client } from './types';

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
  login: (email: string, password: string, user?: User) => boolean;
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
  login: (email: string, _password: string, user?: User) => {
    if (user) {
      set({
        isAuthenticated: true,
        currentUser: user,
        currentPage: 'dashboard',
      });
      return true;
    }
    if (email) {
      set({
        isAuthenticated: true,
        currentUser: { _id: 'temp', organizationId: '', name: email.split('@')[0], email, role: 'sales', active: true, status: 'online', avatar: '' },
        currentPage: 'dashboard',
      });
      return true;
    }
    return false;
  },
  logout: () => {
    set({ isAuthenticated: false, currentUser: null, currentPage: 'login' });
  },

  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  
  aiAssistantVisible: true,
  toggleAiAssistant: () => set((state) => ({ aiAssistantVisible: !state.aiAssistantVisible })),

  leads: [],
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

  conversations: [],
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

  tasks: [],
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

  automations: [],
  automationExecutions: [],
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

  financeRecords: [],
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

  sellerGoals: [],
  updateSellerGoal: (id, updates) =>
    set((state) => ({
      sellerGoals: state.sellerGoals.map((g) => (g._id === id ? { ...g, ...updates } : g)),
    })),

  settingsUsers: [],
  addSettingsUser: (user) => set((state) => ({ settingsUsers: [user, ...state.settingsUsers] })),
  updateSettingsUser: (id, updates) => set((state) => ({ settingsUsers: state.settingsUsers.map(u => u._id === id ? { ...u, ...updates } : u) })),
  deleteSettingsUser: (id) => set((state) => ({ settingsUsers: state.settingsUsers.filter(u => u._id !== id) })),

  webhooks: [],
  addWebhook: (webhook) => set((state) => ({ webhooks: [webhook, ...state.webhooks] })),
  updateWebhook: (id, updates) => set((state) => ({ webhooks: state.webhooks.map(w => w._id === id ? { ...w, ...updates } : w) })),
  deleteWebhook: (id) => set((state) => ({ webhooks: state.webhooks.filter(w => w._id !== id) })),

  integrations: [],
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

  auditLogs: [],
  addAuditLog: (log) => set((state) => ({ auditLogs: [log, ...state.auditLogs] })),

  calendarEvents: [],
  addCalendarEvent: (event) => set((state) => ({ calendarEvents: [event, ...state.calendarEvents] })),
  updateCalendarEvent: (id, updates) => set((state) => ({ calendarEvents: state.calendarEvents.map(e => e._id === id ? { ...e, ...updates } : e) })),
  deleteCalendarEvent: (id) => set((state) => ({ calendarEvents: state.calendarEvents.filter(e => e._id !== id) })),

  clients: [],
  addClient: (client) => set((state) => ({ clients: [client, ...state.clients] })),
  updateClient: (id, updates) => set((state) => ({ clients: state.clients.map(c => c._id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c) })),
  deleteClient: (id) => set((state) => ({ clients: state.clients.filter(c => c._id !== id) })),
}));
