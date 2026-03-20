export type UserRole = 'owner' | 'admin' | 'manager' | 'sales' | 'support' | 'finance' | 'viewer';
export type Channel = 'whatsapp' | 'instagram' | 'facebook' | 'telegram' | 'email' | 'webchat';
export type ConversationStatus = 'open' | 'pending' | 'closed';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
export type DealStatus = 'open' | 'won' | 'lost';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type AppPage = 'login' | 'dashboard' | 'crm' | 'clients' | 'omnichannel' | 'automation' | 'tasks' | 'finance' | 'analytics' | 'ai' | 'agenda' | 'settings';

export type ClientStatus = 'active' | 'inactive';

export interface ClientNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface Client {
  _id: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  industry?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  status: ClientStatus;
  tags: string[];
  notes: ClientNote[];
  annualSpend: number;
  leadsCount: number;
  conversationsCount: number;
  lastInteraction?: string;
  createdAt: string;
  updatedAt: string;
}

export type EventCategory = 'meeting' | 'call' | 'task' | 'deadline' | 'personal' | 'follow_up';

export interface CalendarEvent {
  _id: string;
  title: string;
  description?: string;
  category: EventCategory;
  date: string;
  startTime: string;
  endTime: string;
  allDay?: boolean;
  color: string;
  leadId?: string;
  leadName?: string;
  assignedTo?: string;
  assignedName?: string;
  location?: string;
  reminder?: number;
  completed?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
}

export interface Organization {
  _id: string;
  name: string;
  plan: 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface User {
  _id: string;
  organizationId: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  active: boolean;
  status: 'online' | 'offline' | 'away';
}

export interface Lead {
  _id: string;
  organizationId: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  source: string;
  tags: string[];
  pipelineId: string;
  stageId: string;
  assignedTo: string;
  status: LeadStatus;
  score: number;
  value: number;
  createdAt: string;
  lastActivity?: string;
  notes?: string;
}

export interface Pipeline {
  _id: string;
  organizationId: string;
  name: string;
  stages: PipelineStage[];
}

export interface PipelineStage {
  _id: string;
  name: string;
  color: string;
  order: number;
}

export interface Deal {
  _id: string;
  organizationId: string;
  leadId: string;
  leadName: string;
  value: number;
  stage: string;
  expectedCloseDate: string;
  status: DealStatus;
}

export interface Conversation {
  _id: string;
  organizationId: string;
  contactId: string;
  contactName: string;
  contactAvatar?: string;
  channel: Channel;
  assignedTo: string;
  assignedName: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  status: ConversationStatus;
  messages: Message[];
}

export interface Message {
  _id: string;
  sender: 'agent' | 'client';
  senderName: string;
  content: string;
  timestamp: string;
  attachments?: string[];
}

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface TaskActivity {
  id: string;
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

export interface Task {
  _id: string;
  organizationId: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedName: string;
  leadId?: string;
  leadName?: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  createdAt: string;
  tags?: string[];
  subtasks?: TaskSubtask[];
  notes?: TaskNote[];
  activities?: TaskActivity[];
  attachments?: string[];
  estimatedHours?: number;
  completedAt?: string;
}

export type TriggerType = 'new_lead' | 'stage_change' | 'field_update' | 'message_received' | 'tag_added' | 'score_change' | 'deal_created' | 'task_completed' | 'time_delay' | 'webhook';
export type ActionType = 'send_message' | 'send_email' | 'send_whatsapp' | 'create_task' | 'update_field' | 'move_stage' | 'add_tag' | 'remove_tag' | 'assign_user' | 'webhook' | 'delay' | 'condition' | 'notification';

export interface AutomationTrigger {
  type: TriggerType;
  label: string;
  config: Record<string, unknown>;
}

export interface AutomationAction {
  id: string;
  type: ActionType;
  label: string;
  config: Record<string, unknown>;
}

export interface AutomationCondition {
  id: string;
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
  value: string;
}

export interface AutomationExecution {
  _id: string;
  automationId: string;
  status: 'success' | 'failed' | 'running';
  triggeredBy: string;
  startedAt: string;
  completedAt?: string;
  actionsExecuted: number;
  error?: string;
}

export interface AutomationFlow {
  _id: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  active: boolean;
  executionCount: number;
  successCount: number;
  failCount: number;
  lastRun?: string;
  createdAt: string;
  updatedAt: string;
}

export type TransactionType = 'revenue' | 'expense' | 'commission' | 'refund';
export type TransactionStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';
export type TransactionCategory = 'services' | 'products' | 'subscription' | 'commission' | 'marketing' | 'operations' | 'taxes' | 'refund' | 'other';

export interface SellerGoal {
  _id: string;
  name: string;
  email: string;
  revenue: number;
  goal: number;
  deals: number;
  commissionRate: number;
  avatar?: string;
}

export interface FinanceRecord {
  _id: string;
  type: TransactionType;
  category: TransactionCategory;
  description: string;
  value: number;
  client?: string;
  salesperson: string;
  date: string;
  dueDate?: string;
  pipeline: string;
  status: TransactionStatus;
  notes?: string;
  invoiceNumber?: string;
}
