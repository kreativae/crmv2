import { z } from 'zod';

// Common validators
export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format');

export const emailSchema = z.string().email('Invalid email format');

export const phoneSchema = z.string().min(10, 'Phone must be at least 10 digits');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Pagination
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

// Auth schemas
export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: emailSchema,
  password: passwordSchema,
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
  plan: z.enum(['starter', 'business', 'enterprise']).default('starter'),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
});

// Lead schemas
export const createLeadSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  company: z.string().optional(),
  source: z.string().optional(),
  pipelineId: objectIdSchema.optional(),
  stageId: z.string().optional(),
  score: z.number().min(0).max(100).default(0),
  value: z.number().min(0).default(0),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  assignedTo: objectIdSchema.optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

// Client schemas
export const createClientSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  company: z.string().optional(),
  industry: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().default('Brasil'),
  annualSpend: z.number().min(0).default(0),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateClientSchema = createClientSchema.partial();

// Task schemas
export const createTaskSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['todo', 'in_progress', 'done']).default('todo'),
  dueDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  assignedTo: objectIdSchema.optional(),
  leadId: objectIdSchema.optional(),
  clientId: objectIdSchema.optional(),
  tags: z.array(z.string()).default([]),
});

export const updateTaskSchema = createTaskSchema.partial();

// Calendar Event schemas
export const createEventSchema = z.object({
  title: z.string().min(2, 'Title is required'),
  description: z.string().optional(),
  category: z.enum(['meeting', 'call', 'task', 'deadline', 'personal', 'followup']).default('meeting'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  allDay: z.boolean().default(false),
  location: z.string().optional(),
  color: z.string().optional(),
  assignedTo: objectIdSchema.optional(),
  leadId: objectIdSchema.optional(),
  clientId: objectIdSchema.optional(),
  reminder: z.number().optional(),
  recurrence: z.enum(['none', 'daily', 'weekly', 'monthly']).default('none'),
});

export const updateEventSchema = createEventSchema.partial();

// Conversation schemas
export const createConversationSchema = z.object({
  contactName: z.string().min(1, 'Contact name is required'),
  contactEmail: emailSchema.optional(),
  contactPhone: phoneSchema.optional(),
  channel: z.enum(['whatsapp', 'instagram', 'facebook', 'telegram', 'email', 'webchat']),
  channelId: z.string().optional(),
});

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message content is required'),
  type: z.enum(['text', 'image', 'audio', 'video', 'document', 'note']).default('text'),
  attachments: z.array(z.object({
    url: z.string().url(),
    type: z.string(),
    name: z.string(),
    size: z.number().optional(),
  })).optional(),
});

// Transaction schemas
export const createTransactionSchema = z.object({
  description: z.string().min(2, 'Description is required'),
  type: z.enum(['revenue', 'expense', 'commission', 'refund']),
  category: z.string(),
  value: z.number().positive('Value must be positive'),
  status: z.enum(['pending', 'paid', 'overdue', 'cancelled']).default('pending'),
  date: z.string().datetime(),
  dueDate: z.string().datetime().optional(),
  clientId: objectIdSchema.optional(),
  leadId: objectIdSchema.optional(),
  sellerId: objectIdSchema.optional(),
  notes: z.string().optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

// Automation schemas
export const createAutomationSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().optional(),
  trigger: z.object({
    type: z.enum([
      'new_lead', 'stage_change', 'field_update', 'message_received',
      'tag_added', 'score_change', 'deal_created', 'task_completed',
      'schedule', 'webhook'
    ]),
    config: z.record(z.unknown()).optional(),
  }),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'not_equals', 'contains', 'greater_than', 'less_than']),
    value: z.union([z.string(), z.number(), z.boolean()]),
  })).default([]),
  actions: z.array(z.object({
    type: z.enum([
      'send_whatsapp', 'send_email', 'send_message', 'create_task',
      'update_field', 'move_stage', 'add_tag', 'remove_tag',
      'assign_user', 'webhook', 'delay', 'notification'
    ]),
    config: z.record(z.unknown()).optional(),
  })).min(1, 'At least one action is required'),
  isActive: z.boolean().default(true),
});

export const updateAutomationSchema = createAutomationSchema.partial();

// Pipeline schemas
export const createPipelineSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  stages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().default('#6366f1'),
    order: z.number(),
  })).min(1, 'At least one stage is required'),
  isDefault: z.boolean().default(false),
});

export const updatePipelineSchema = createPipelineSchema.partial();

// Settings schemas
export const updateOrganizationSchema = z.object({
  name: z.string().min(2).optional(),
  domain: z.string().optional(),
  timezone: z.string().optional(),
  branding: z.object({
    logo: z.string().url().optional(),
    primaryColor: z.string().optional(),
    darkMode: z.boolean().optional(),
  }).optional(),
});

export const inviteUserSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: emailSchema,
  role: z.enum(['admin', 'manager', 'sales', 'support', 'finance', 'viewer']),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'sales', 'support', 'finance', 'viewer']),
  permissions: z.array(z.string()).optional(),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
export type UpdateAutomationInput = z.infer<typeof updateAutomationSchema>;
export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
