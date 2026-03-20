# 🚀 Estratégia de Desenvolvimento - Backend & Banco de Dados

## NexCRM - Plataforma SaaS Multi-tenant

**Última atualização:** Janeiro 2025  
**Status:** Planejamento

---

## 📋 Índice

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Estrutura do Banco de Dados](#3-estrutura-do-banco-de-dados)
4. [API Design](#4-api-design)
5. [Autenticação & Segurança](#5-autenticação--segurança)
6. [Multi-Tenancy](#6-multi-tenancy)
7. [Integrações Externas](#7-integrações-externas)
8. [Infraestrutura & Deploy](#8-infraestrutura--deploy)
9. [Fases de Implementação](#9-fases-de-implementação)
10. [Checklist de Qualidade](#10-checklist-de-qualidade)

---

## 1. Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                    React + Vite + TailwindCSS                       │
│                         (Atual - Completo)                          │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          API GATEWAY                                 │
│              Next.js API Routes / Express.js / Fastify              │
│                                                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │    Auth     │  │    REST     │  │  WebSocket  │  │  Webhooks  │ │
│  │  Middleware │  │   Routes    │  │   Server    │  │  Handlers  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │   MongoDB   │ │    Redis    │ │ Cloudinary  │
            │   Atlas     │ │   Upstash   │ │   (Media)   │
            │  (Primary)  │ │  (Cache)    │ │             │
            └─────────────┘ └─────────────┘ └─────────────┘
```

### Princípios Arquiteturais

1. **Separation of Concerns** - Cada módulo com responsabilidade única
2. **API-First** - Backend 100% desacoplado do frontend
3. **Multi-tenant by Design** - Isolamento de dados desde o início
4. **Event-Driven** - Webhooks e eventos para comunicação assíncrona
5. **Horizontal Scaling** - Preparado para escalar

---

## 2. Stack Tecnológica

### Backend Principal

| Tecnologia | Uso | Justificativa |
|------------|-----|---------------|
| **Node.js 20+** | Runtime | LTS, performance, ecosystem |
| **TypeScript** | Linguagem | Type safety, melhor DX |
| **Express.js** ou **Fastify** | Framework | Maduro, flexível, plugins |
| **Prisma** | ORM | Type-safe, migrations, MongoDB support |
| **Zod** | Validação | Schema validation, TypeScript integration |
| **JWT + Refresh Tokens** | Auth | Stateless, secure |
| **Socket.io** | Real-time | WebSockets para chat/notificações |

### Banco de Dados

| Tecnologia | Uso | Justificativa |
|------------|-----|---------------|
| **MongoDB Atlas** | Primary DB | Flexível, escalável, JSON nativo |
| **Redis (Upstash)** | Cache + Sessions | Serverless, baixa latência |

### Serviços Externos

| Serviço | Uso |
|---------|-----|
| **Cloudinary** | Upload de mídia (imagens, docs, áudio) |
| **Resend** ou **SendGrid** | Envio de emails transacionais |
| **Stripe** | Billing e assinaturas SaaS |
| **WhatsApp Cloud API** | Integração WhatsApp Business |
| **Meta Graph API** | Instagram DM + Facebook Messenger |
| **Telegram Bot API** | Integração Telegram |

### Deploy & Infra

| Serviço | Uso |
|---------|-----|
| **Vercel** | Deploy frontend + API serverless |
| **Railway** ou **Render** | Backend dedicado (se necessário) |
| **MongoDB Atlas** | Database managed |
| **Upstash** | Redis serverless |

---

## 3. Estrutura do Banco de Dados

### 3.1 Collections MongoDB

```typescript
// ==================== CORE ====================

// Organization (Tenant)
{
  _id: ObjectId,
  name: string,
  slug: string,                    // unique URL identifier
  plan: 'starter' | 'business' | 'enterprise',
  planExpiresAt: Date,
  status: 'active' | 'suspended' | 'cancelled',
  settings: {
    branding: {
      logo: string,
      primaryColor: string,
      customDomain: string
    },
    features: {
      maxUsers: number,
      maxLeads: number,
      maxPipelines: number,
      whatsappEnabled: boolean,
      aiEnabled: boolean
    },
    notifications: {
      email: boolean,
      push: boolean,
      inApp: boolean
    }
  },
  billing: {
    stripeCustomerId: string,
    stripeSubscriptionId: string
  },
  createdAt: Date,
  updatedAt: Date
}

// User
{
  _id: ObjectId,
  organizationId: ObjectId,        // FK -> Organization
  email: string,                   // unique per org
  passwordHash: string,
  name: string,
  avatar: string,
  role: 'owner' | 'admin' | 'manager' | 'sales' | 'support' | 'finance' | 'viewer',
  permissions: string[],           // granular permissions
  status: 'active' | 'inactive' | 'pending',
  lastLoginAt: Date,
  emailVerifiedAt: Date,
  settings: {
    language: string,
    timezone: string,
    notificationPreferences: object
  },
  createdAt: Date,
  updatedAt: Date
}

// ==================== CRM ====================

// Pipeline
{
  _id: ObjectId,
  organizationId: ObjectId,
  name: string,
  description: string,
  stages: [{
    _id: ObjectId,
    name: string,
    color: string,
    order: number,
    probability: number            // % chance of closing
  }],
  isDefault: boolean,
  createdAt: Date,
  updatedAt: Date
}

// Lead
{
  _id: ObjectId,
  organizationId: ObjectId,
  pipelineId: ObjectId,
  stageId: ObjectId,
  
  // Contact Info
  name: string,
  email: string,
  phone: string,
  company: string,
  position: string,
  avatar: string,
  
  // Classification
  source: string,                  // website, google_ads, referral, etc
  tags: string[],
  score: number,                   // 0-100, AI calculated
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost',
  
  // Value
  estimatedValue: number,
  currency: string,
  
  // Assignment
  assignedTo: ObjectId,            // FK -> User
  
  // Custom Fields
  customFields: Map<string, any>,
  
  // Metadata
  lastContactAt: Date,
  lostReason: string,
  wonAt: Date,
  lostAt: Date,
  createdAt: Date,
  updatedAt: Date
}

// Lead Activity (Timeline)
{
  _id: ObjectId,
  organizationId: ObjectId,
  leadId: ObjectId,
  userId: ObjectId,
  type: 'note' | 'call' | 'email' | 'meeting' | 'stage_change' | 'status_change' | 'field_update',
  title: string,
  description: string,
  metadata: object,                // flexible data per type
  createdAt: Date
}

// Lead Note
{
  _id: ObjectId,
  organizationId: ObjectId,
  leadId: ObjectId,
  userId: ObjectId,
  content: string,
  attachments: string[],
  createdAt: Date,
  updatedAt: Date
}

// ==================== OMNICHANNEL ====================

// Contact (Unified from all channels)
{
  _id: ObjectId,
  organizationId: ObjectId,
  leadId: ObjectId,                // optional FK -> Lead
  
  // Identity
  name: string,
  email: string,
  phone: string,
  avatar: string,
  
  // Channel Identifiers
  channels: {
    whatsapp: { id: string, verified: boolean },
    instagram: { id: string, username: string },
    facebook: { id: string },
    telegram: { id: string, username: string },
    email: { address: string }
  },
  
  tags: string[],
  notes: string,
  createdAt: Date,
  updatedAt: Date
}

// Conversation
{
  _id: ObjectId,
  organizationId: ObjectId,
  contactId: ObjectId,
  
  channel: 'whatsapp' | 'instagram' | 'facebook' | 'telegram' | 'email' | 'webchat',
  channelConversationId: string,   // external ID from channel
  
  status: 'open' | 'pending' | 'resolved',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  
  assignedTo: ObjectId,            // FK -> User
  department: string,
  
  // SLA
  slaDeadline: Date,
  slaBreached: boolean,
  firstResponseAt: Date,
  
  // Stats
  messageCount: number,
  unreadCount: number,
  lastMessageAt: Date,
  lastMessagePreview: string,
  lastMessageDirection: 'inbound' | 'outbound',
  
  // Resolution
  resolvedAt: Date,
  resolvedBy: ObjectId,
  satisfactionRating: number,
  
  createdAt: Date,
  updatedAt: Date
}

// Message (Separate collection for scale)
{
  _id: ObjectId,
  organizationId: ObjectId,
  conversationId: ObjectId,
  
  direction: 'inbound' | 'outbound',
  sender: {
    type: 'contact' | 'agent' | 'bot' | 'system',
    id: ObjectId,
    name: string
  },
  
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'template' | 'interactive',
  content: {
    text: string,
    mediaUrl: string,
    mediaType: string,
    fileName: string,
    caption: string,
    // ... type-specific fields
  },
  
  // Reply reference
  replyTo: ObjectId,
  
  // Status tracking
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed',
  statusHistory: [{
    status: string,
    at: Date
  }],
  
  // Internal
  isInternal: boolean,             // internal note, not sent to contact
  
  // External references
  externalId: string,              // message ID from channel
  
  createdAt: Date
}

// ==================== AUTOMATION ====================

// Automation Flow
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  name: string,
  description: string,
  status: 'active' | 'inactive' | 'draft',
  
  trigger: {
    type: 'new_lead' | 'stage_change' | 'message_received' | 'tag_added' | 'score_change' | 'scheduled' | 'webhook',
    config: object                 // trigger-specific settings
  },
  
  conditions: [{
    field: string,
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than',
    value: any
  }],
  
  actions: [{
    _id: ObjectId,
    type: 'send_message' | 'send_email' | 'create_task' | 'update_field' | 'move_stage' | 'add_tag' | 'assign_user' | 'webhook' | 'delay',
    config: object,
    order: number
  }],
  
  // Stats
  executionCount: number,
  successCount: number,
  failureCount: number,
  lastExecutedAt: Date,
  
  createdAt: Date,
  updatedAt: Date
}

// Automation Execution Log
{
  _id: ObjectId,
  organizationId: ObjectId,
  automationId: ObjectId,
  
  triggeredBy: {
    type: string,
    entityId: ObjectId,
    entityType: string
  },
  
  status: 'running' | 'completed' | 'failed' | 'cancelled',
  
  steps: [{
    actionId: ObjectId,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped',
    startedAt: Date,
    completedAt: Date,
    error: string,
    result: object
  }],
  
  startedAt: Date,
  completedAt: Date,
  error: string
}

// ==================== TASKS ====================

// Task
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  title: string,
  description: string,
  
  type: 'task' | 'call' | 'meeting' | 'email' | 'follow_up',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  status: 'todo' | 'in_progress' | 'done' | 'cancelled',
  
  // Relations
  leadId: ObjectId,
  contactId: ObjectId,
  
  // Assignment
  assignedTo: ObjectId,
  assignedBy: ObjectId,
  
  // Timing
  dueDate: Date,
  reminderAt: Date,
  completedAt: Date,
  
  // Recurrence
  recurrence: {
    enabled: boolean,
    frequency: 'daily' | 'weekly' | 'monthly',
    until: Date
  },
  
  // Subtasks
  subtasks: [{
    _id: ObjectId,
    title: string,
    completed: boolean,
    completedAt: Date
  }],
  
  tags: string[],
  notes: string,
  attachments: string[],
  
  createdAt: Date,
  updatedAt: Date
}

// ==================== CALENDAR ====================

// Calendar Event
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  title: string,
  description: string,
  
  type: 'meeting' | 'call' | 'task' | 'reminder' | 'personal',
  
  // Timing
  startAt: Date,
  endAt: Date,
  allDay: boolean,
  timezone: string,
  
  // Recurrence
  recurrence: {
    enabled: boolean,
    rule: string                   // RRULE format
  },
  
  // Relations
  leadId: ObjectId,
  taskId: ObjectId,
  
  // Participants
  organizer: ObjectId,
  attendees: [{
    userId: ObjectId,
    email: string,
    status: 'pending' | 'accepted' | 'declined' | 'tentative'
  }],
  
  // External sync
  googleEventId: string,
  
  // Settings
  color: string,
  reminders: [{
    type: 'email' | 'push' | 'sms',
    minutesBefore: number
  }],
  
  createdAt: Date,
  updatedAt: Date
}

// ==================== FINANCE ====================

// Transaction
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  type: 'revenue' | 'expense' | 'commission',
  category: string,
  
  description: string,
  amount: number,
  currency: string,
  
  status: 'pending' | 'paid' | 'overdue' | 'cancelled',
  
  // Relations
  leadId: ObjectId,
  dealId: ObjectId,
  userId: ObjectId,                // for commissions
  
  // Payment
  dueDate: Date,
  paidAt: Date,
  paymentMethod: string,
  invoiceNumber: string,
  
  // Metadata
  notes: string,
  attachments: string[],
  
  createdAt: Date,
  updatedAt: Date
}

// Seller Goal
{
  _id: ObjectId,
  organizationId: ObjectId,
  userId: ObjectId,
  
  period: {
    month: number,
    year: number
  },
  
  revenueGoal: number,
  leadsGoal: number,
  conversionsGoal: number,
  
  commissionRate: number,          // percentage
  
  // Progress (denormalized for performance)
  currentRevenue: number,
  currentLeads: number,
  currentConversions: number,
  
  createdAt: Date,
  updatedAt: Date
}

// ==================== INTEGRATIONS ====================

// Integration Config
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  type: 'whatsapp' | 'instagram' | 'facebook' | 'telegram' | 'google_calendar' | 'stripe' | 'smtp',
  
  status: 'connected' | 'disconnected' | 'error',
  
  credentials: {
    // Encrypted credentials specific to integration type
    // e.g., accessToken, refreshToken, apiKey, etc.
  },
  
  settings: object,                // integration-specific settings
  
  lastSyncAt: Date,
  error: string,
  
  createdAt: Date,
  updatedAt: Date
}

// Webhook
{
  _id: ObjectId,
  organizationId: ObjectId,
  
  name: string,
  url: string,
  secret: string,                  // for signature verification
  
  events: string[],                // which events to send
  status: 'active' | 'inactive',
  
  // Stats
  totalCalls: number,
  successCalls: number,
  failedCalls: number,
  lastCalledAt: Date,
  lastError: string,
  
  createdAt: Date,
  updatedAt: Date
}

// ==================== SYSTEM ====================

// Audit Log
{
  _id: ObjectId,
  organizationId: ObjectId,
  userId: ObjectId,
  
  action: string,                  // 'create', 'update', 'delete', 'login', etc.
  entityType: string,              // 'lead', 'user', 'automation', etc.
  entityId: ObjectId,
  
  changes: {
    before: object,
    after: object
  },
  
  metadata: {
    ip: string,
    userAgent: string,
    requestId: string
  },
  
  createdAt: Date
}

// Notification
{
  _id: ObjectId,
  organizationId: ObjectId,
  userId: ObjectId,
  
  type: 'info' | 'success' | 'warning' | 'error',
  category: 'lead' | 'message' | 'task' | 'deal' | 'system' | 'automation',
  
  title: string,
  message: string,
  
  link: string,                    // deep link to entity
  entityType: string,
  entityId: ObjectId,
  
  read: boolean,
  readAt: Date,
  
  createdAt: Date
}

// API Token
{
  _id: ObjectId,
  organizationId: ObjectId,
  userId: ObjectId,
  
  name: string,
  tokenHash: string,               // hashed token
  prefix: string,                  // first 8 chars for identification
  
  permissions: string[],
  
  expiresAt: Date,
  lastUsedAt: Date,
  
  createdAt: Date
}
```

### 3.2 Índices MongoDB

```javascript
// Organization
db.organizations.createIndex({ "slug": 1 }, { unique: true })
db.organizations.createIndex({ "status": 1 })

// User
db.users.createIndex({ "organizationId": 1, "email": 1 }, { unique: true })
db.users.createIndex({ "organizationId": 1, "status": 1 })

// Lead
db.leads.createIndex({ "organizationId": 1, "pipelineId": 1, "stageId": 1 })
db.leads.createIndex({ "organizationId": 1, "assignedTo": 1 })
db.leads.createIndex({ "organizationId": 1, "status": 1 })
db.leads.createIndex({ "organizationId": 1, "email": 1 })
db.leads.createIndex({ "organizationId": 1, "createdAt": -1 })
db.leads.createIndex({ "organizationId": 1, "score": -1 })

// Conversation
db.conversations.createIndex({ "organizationId": 1, "status": 1, "lastMessageAt": -1 })
db.conversations.createIndex({ "organizationId": 1, "assignedTo": 1 })
db.conversations.createIndex({ "organizationId": 1, "contactId": 1 })
db.conversations.createIndex({ "organizationId": 1, "channel": 1 })

// Message (High volume - optimize carefully)
db.messages.createIndex({ "conversationId": 1, "createdAt": -1 })
db.messages.createIndex({ "organizationId": 1, "createdAt": -1 })

// Task
db.tasks.createIndex({ "organizationId": 1, "assignedTo": 1, "status": 1 })
db.tasks.createIndex({ "organizationId": 1, "dueDate": 1 })
db.tasks.createIndex({ "organizationId": 1, "leadId": 1 })

// Automation
db.automations.createIndex({ "organizationId": 1, "status": 1 })
db.automations.createIndex({ "organizationId": 1, "trigger.type": 1 })

// Audit Log (TTL index for auto-deletion)
db.auditLogs.createIndex({ "createdAt": 1 }, { expireAfterSeconds: 7776000 }) // 90 days
db.auditLogs.createIndex({ "organizationId": 1, "createdAt": -1 })

// Notification
db.notifications.createIndex({ "organizationId": 1, "userId": 1, "read": 1, "createdAt": -1 })
```

---

## 4. API Design

### 4.1 Estrutura de Rotas

```
/api
├── /auth
│   ├── POST   /login
│   ├── POST   /register
│   ├── POST   /logout
│   ├── POST   /refresh
│   ├── POST   /forgot-password
│   ├── POST   /reset-password
│   └── POST   /verify-email
│
├── /organizations
│   ├── GET    /                    # Get current org
│   ├── PATCH  /                    # Update org settings
│   ├── GET    /billing             # Get billing info
│   └── POST   /billing/portal      # Stripe portal session
│
├── /users
│   ├── GET    /                    # List users
│   ├── POST   /                    # Invite user
│   ├── GET    /:id                 # Get user
│   ├── PATCH  /:id                 # Update user
│   ├── DELETE /:id                 # Deactivate user
│   └── GET    /me                  # Current user
│
├── /pipelines
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   └── PATCH  /:id/stages          # Reorder stages
│
├── /leads
│   ├── GET    /                    # List with filters
│   ├── POST   /
│   ├── GET    /:id
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   ├── POST   /:id/notes
│   ├── GET    /:id/activities
│   └── POST   /:id/move            # Move to stage
│
├── /conversations
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PATCH  /:id
│   ├── POST   /:id/messages
│   ├── POST   /:id/assign
│   └── POST   /:id/resolve
│
├── /messages
│   ├── GET    /                    # Search messages
│   └── GET    /:conversationId     # Get by conversation
│
├── /tasks
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   └── POST   /:id/complete
│
├── /calendar
│   ├── GET    /events
│   ├── POST   /events
│   ├── GET    /events/:id
│   ├── PATCH  /events/:id
│   ├── DELETE /events/:id
│   └── POST   /sync/google         # Sync with Google Calendar
│
├── /automations
│   ├── GET    /
│   ├── POST   /
│   ├── GET    /:id
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   ├── POST   /:id/toggle          # Enable/disable
│   ├── POST   /:id/test            # Test run
│   └── GET    /:id/executions      # Execution history
│
├── /finance
│   ├── GET    /transactions
│   ├── POST   /transactions
│   ├── GET    /transactions/:id
│   ├── PATCH  /transactions/:id
│   ├── DELETE /transactions/:id
│   ├── GET    /goals
│   ├── POST   /goals
│   └── GET    /reports
│
├── /analytics
│   ├── GET    /dashboard
│   ├── GET    /leads
│   ├── GET    /conversions
│   ├── GET    /revenue
│   ├── GET    /sellers
│   └── GET    /channels
│
├── /integrations
│   ├── GET    /
│   ├── POST   /:type/connect
│   ├── POST   /:type/disconnect
│   └── PATCH  /:type/settings
│
├── /webhooks
│   ├── GET    /
│   ├── POST   /
│   ├── PATCH  /:id
│   ├── DELETE /:id
│   └── POST   /:id/test
│
├── /ai
│   ├── POST   /chat                # AI assistant
│   ├── POST   /sentiment           # Analyze sentiment
│   ├── POST   /score               # Score lead
│   ├── GET    /insights            # Get AI insights
│   └── POST   /suggest             # Get suggestions
│
└── /webhooks-handlers              # Incoming webhooks
    ├── POST   /whatsapp
    ├── POST   /instagram
    ├── POST   /facebook
    ├── POST   /telegram
    └── POST   /stripe
```

### 4.2 Padrões de Resposta

```typescript
// Success Response
{
  success: true,
  data: T,
  meta?: {
    page: number,
    limit: number,
    total: number,
    hasMore: boolean
  }
}

// Error Response
{
  success: false,
  error: {
    code: string,           // 'VALIDATION_ERROR', 'NOT_FOUND', etc
    message: string,
    details?: object
  }
}
```

### 4.3 Filtros e Paginação

```
GET /api/leads?
  page=1&
  limit=20&
  sort=-createdAt&
  status=qualified&
  assignedTo=userId&
  pipelineId=pipelineId&
  search=termo&
  createdAfter=2024-01-01&
  createdBefore=2024-12-31&
  scoreMin=50&
  scoreMax=100
```

---

## 5. Autenticação & Segurança

### 5.1 Fluxo de Autenticação

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOGIN FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User submits email + password                               │
│  2. Server validates credentials                                 │
│  3. Server generates:                                            │
│     - Access Token (JWT, 15min expiry)                          │
│     - Refresh Token (opaque, 7d expiry, stored in Redis)        │
│  4. Refresh token sent as httpOnly cookie                       │
│  5. Access token returned in response body                      │
│  6. Client stores access token in memory (not localStorage)     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                      TOKEN REFRESH FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Access token expires                                         │
│  2. Client calls /auth/refresh with refresh token cookie        │
│  3. Server validates refresh token in Redis                      │
│  4. Server issues new access token + rotates refresh token      │
│  5. Old refresh token invalidated                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 JWT Payload

```typescript
{
  sub: string,              // User ID
  org: string,              // Organization ID
  role: string,             // User role
  permissions: string[],    // Granular permissions
  iat: number,
  exp: number
}
```

### 5.3 Middleware Stack

```typescript
// 1. Rate Limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100                    // limit each IP
}))

// 2. Security Headers
app.use(helmet())

// 3. CORS
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}))

// 4. Request Parsing
app.use(express.json({ limit: '10mb' }))

// 5. Authentication
app.use('/api', authMiddleware)

// 6. Organization Context
app.use('/api', orgContextMiddleware)

// 7. Permission Check
app.use('/api', permissionMiddleware)

// 8. Request Logging
app.use(requestLogger)
```

### 5.4 Permissions System

```typescript
const PERMISSIONS = {
  // Leads
  'leads:read': 'View leads',
  'leads:create': 'Create leads',
  'leads:update': 'Update leads',
  'leads:delete': 'Delete leads',
  'leads:assign': 'Assign leads',
  'leads:export': 'Export leads',
  
  // Conversations
  'conversations:read': 'View conversations',
  'conversations:reply': 'Reply to conversations',
  'conversations:assign': 'Assign conversations',
  'conversations:resolve': 'Resolve conversations',
  
  // Tasks
  'tasks:read': 'View tasks',
  'tasks:create': 'Create tasks',
  'tasks:update': 'Update tasks',
  'tasks:delete': 'Delete tasks',
  
  // Automations
  'automations:read': 'View automations',
  'automations:create': 'Create automations',
  'automations:update': 'Update automations',
  'automations:delete': 'Delete automations',
  
  // Finance
  'finance:read': 'View financial data',
  'finance:create': 'Create transactions',
  'finance:update': 'Update transactions',
  'finance:delete': 'Delete transactions',
  
  // Analytics
  'analytics:read': 'View analytics',
  'analytics:export': 'Export reports',
  
  // Settings
  'settings:read': 'View settings',
  'settings:update': 'Update settings',
  'users:manage': 'Manage users',
  'integrations:manage': 'Manage integrations',
  'billing:manage': 'Manage billing'
}

const ROLE_PERMISSIONS = {
  owner: ['*'],  // All permissions
  admin: ['*'],
  manager: [
    'leads:*', 'conversations:*', 'tasks:*', 
    'automations:read', 'finance:read', 'analytics:*'
  ],
  sales: [
    'leads:read', 'leads:create', 'leads:update',
    'conversations:*', 'tasks:*', 'analytics:read'
  ],
  support: [
    'leads:read', 'conversations:*', 'tasks:*'
  ],
  finance: [
    'finance:*', 'analytics:read'
  ],
  viewer: [
    'leads:read', 'conversations:read', 'tasks:read',
    'analytics:read'
  ]
}
```

---

## 6. Multi-Tenancy

### 6.1 Estratégia: Shared Database, Discriminator Column

```
┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-TENANCY APPROACH                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Strategy: Shared Database + organizationId on every document   │
│                                                                  │
│  Pros:                                                           │
│  ✅ Simple to implement                                          │
│  ✅ Easy to scale initially                                      │
│  ✅ Lower infrastructure cost                                    │
│  ✅ Easy cross-tenant queries (for admin)                        │
│                                                                  │
│  Cons:                                                           │
│  ⚠️ Requires careful index design                               │
│  ⚠️ Must NEVER forget organizationId in queries                 │
│  ⚠️ Noisy neighbor potential                                    │
│                                                                  │
│  Mitigations:                                                    │
│  🛡️ Middleware that auto-injects organizationId                 │
│  🛡️ Row-level security via query interceptors                   │
│  🛡️ Comprehensive test suite for tenant isolation               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Tenant Context Middleware

```typescript
// middleware/tenantContext.ts
export const tenantContextMiddleware = async (req, res, next) => {
  const user = req.user  // From auth middleware
  
  if (!user?.organizationId) {
    return res.status(401).json({ 
      error: 'Organization context required' 
    })
  }
  
  // Attach to request
  req.organizationId = user.organizationId
  
  // Attach to Prisma for automatic filtering
  req.prisma = prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // Auto-inject organizationId in WHERE clauses
          if (args.where) {
            args.where.organizationId = req.organizationId
          }
          // Auto-inject in CREATE data
          if (args.data && !args.data.organizationId) {
            args.data.organizationId = req.organizationId
          }
          return query(args)
        }
      }
    }
  })
  
  next()
}
```

### 6.3 Plan Limits Enforcement

```typescript
// middleware/planLimits.ts
const PLAN_LIMITS = {
  starter: {
    maxUsers: 3,
    maxLeads: 500,
    maxPipelines: 2,
    maxAutomations: 5,
    features: ['crm', 'tasks', 'basic_analytics']
  },
  business: {
    maxUsers: 10,
    maxLeads: 5000,
    maxPipelines: 10,
    maxAutomations: 25,
    features: ['crm', 'tasks', 'analytics', 'omnichannel', 'automations']
  },
  enterprise: {
    maxUsers: -1,  // unlimited
    maxLeads: -1,
    maxPipelines: -1,
    maxAutomations: -1,
    features: ['*']
  }
}

export const checkPlanLimits = (resource: string) => {
  return async (req, res, next) => {
    const org = await getOrganization(req.organizationId)
    const limits = PLAN_LIMITS[org.plan]
    
    const currentCount = await getResourceCount(req.organizationId, resource)
    const limit = limits[`max${capitalize(resource)}`]
    
    if (limit !== -1 && currentCount >= limit) {
      return res.status(403).json({
        error: {
          code: 'PLAN_LIMIT_REACHED',
          message: `You've reached the ${resource} limit for your plan`,
          upgrade: true
        }
      })
    }
    
    next()
  }
}
```

---

## 7. Integrações Externas

### 7.1 WhatsApp Cloud API

```typescript
// services/whatsapp.ts
class WhatsAppService {
  private baseUrl = 'https://graph.facebook.com/v18.0'
  
  async sendMessage(to: string, message: string, orgId: string) {
    const integration = await getIntegration(orgId, 'whatsapp')
    
    const response = await fetch(
      `${this.baseUrl}/${integration.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${integration.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: message }
        })
      }
    )
    
    return response.json()
  }
  
  async handleWebhook(payload: any) {
    // Verify webhook signature
    // Process incoming messages
    // Create/update conversation and messages in DB
    // Trigger automations if configured
  }
}
```

### 7.2 Webhook Handler Pattern

```typescript
// routes/webhooks/whatsapp.ts
router.post('/whatsapp', async (req, res) => {
  // 1. Verify signature
  const signature = req.headers['x-hub-signature-256']
  if (!verifySignature(req.body, signature)) {
    return res.status(401).send('Invalid signature')
  }
  
  // 2. Respond immediately (WhatsApp requires < 20s)
  res.status(200).send('OK')
  
  // 3. Process asynchronously
  processWhatsAppWebhook(req.body).catch(console.error)
})

async function processWhatsAppWebhook(payload: any) {
  const { entry } = payload
  
  for (const e of entry) {
    for (const change of e.changes) {
      if (change.field === 'messages') {
        await handleIncomingMessage(change.value)
      }
    }
  }
}
```

---

## 8. Infraestrutura & Deploy

### 8.1 Estrutura de Pastas Backend

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts
│   │   ├── redis.ts
│   │   ├── env.ts
│   │   └── constants.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.schema.ts
│   │   │   └── auth.test.ts
│   │   │
│   │   ├── leads/
│   │   │   ├── leads.controller.ts
│   │   │   ├── leads.service.ts
│   │   │   ├── leads.routes.ts
│   │   │   ├── leads.schema.ts
│   │   │   └── leads.test.ts
│   │   │
│   │   ├── conversations/
│   │   ├── tasks/
│   │   ├── automations/
│   │   ├── finance/
│   │   ├── analytics/
│   │   └── integrations/
│   │
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── tenantContext.ts
│   │   ├── permissions.ts
│   │   ├── rateLimiter.ts
│   │   ├── errorHandler.ts
│   │   └── requestLogger.ts
│   │
│   ├── services/
│   │   ├── whatsapp.ts
│   │   ├── email.ts
│   │   ├── storage.ts
│   │   ├── ai.ts
│   │   └── stripe.ts
│   │
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── redis.ts
│   │   ├── socket.ts
│   │   └── queue.ts
│   │
│   ├── utils/
│   │   ├── crypto.ts
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   └── errors.ts
│   │
│   ├── types/
│   │   └── index.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── tests/
│   ├── setup.ts
│   ├── fixtures/
│   └── e2e/
│
├── .env.example
├── .env.local
├── package.json
├── tsconfig.json
└── README.md
```

### 8.2 Environment Variables

```env
# App
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:5173

# Database
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/nexcrm

# Redis
REDIS_URL=redis://default:pass@redis-host:6379

# Auth
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

# WhatsApp
WHATSAPP_APP_ID=
WHATSAPP_APP_SECRET=
WHATSAPP_VERIFY_TOKEN=

# Meta (Instagram/Facebook)
META_APP_ID=
META_APP_SECRET=

# Email
RESEND_API_KEY=
EMAIL_FROM=noreply@nexcrm.com

# Storage
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AI
OPENAI_API_KEY=
```

### 8.3 Deploy Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                      DEPLOY ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Option A: Full Vercel (Recommended for Start)                  │
│  ├── Frontend: Vercel                                            │
│  ├── API: Vercel Serverless Functions                           │
│  ├── WebSocket: Separate service (Ably/Pusher)                  │
│  └── Cron: Vercel Cron                                           │
│                                                                  │
│  Option B: Hybrid (Recommended for Scale)                       │
│  ├── Frontend: Vercel                                            │
│  ├── API: Railway/Render (dedicated Node.js)                    │
│  ├── WebSocket: Same server with Socket.io                      │
│  └── Workers: Separate containers for background jobs           │
│                                                                  │
│  Option C: Full Control (Enterprise)                            │
│  ├── Frontend: Vercel/CloudFront                                │
│  ├── API: AWS ECS/EKS or GCP Cloud Run                         │
│  ├── WebSocket: Dedicated cluster                               │
│  └── Workers: SQS/Cloud Tasks + Lambda/Cloud Functions          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Fases de Implementação

### Fase 1: Foundation (2-3 semanas)

```
✅ Week 1: Setup & Auth
├── [ ] Criar projeto backend (Express + TypeScript)
├── [ ] Configurar Prisma com MongoDB
├── [ ] Implementar models básicos (Organization, User)
├── [ ] Sistema de autenticação completo
│   ├── [ ] Login/Register
│   ├── [ ] JWT + Refresh tokens
│   ├── [ ] Password reset
│   └── [ ] Email verification
├── [ ] Middleware stack (auth, tenant, errors)
└── [ ] Deploy inicial (staging)

✅ Week 2: Core CRM
├── [ ] Models: Pipeline, Lead, LeadActivity
├── [ ] CRUD Pipelines + Stages
├── [ ] CRUD Leads
├── [ ] Lead activities/timeline
├── [ ] Lead notes
├── [ ] Filters e paginação
└── [ ] Integrar frontend com API

✅ Week 3: Tasks & Calendar
├── [ ] Models: Task, CalendarEvent
├── [ ] CRUD Tasks
├── [ ] CRUD Calendar Events
├── [ ] Subtasks
├── [ ] Task reminders
└── [ ] Google Calendar sync (básico)
```

### Fase 2: Communication (2-3 semanas)

```
✅ Week 4: Omnichannel Base
├── [ ] Models: Contact, Conversation, Message
├── [ ] CRUD Conversations
├── [ ] Messages API
├── [ ] Real-time com Socket.io
│   ├── [ ] Connection handling
│   ├── [ ] Room per conversation
│   └── [ ] Typing indicators
└── [ ] Integrar com frontend chat

✅ Week 5: WhatsApp Integration
├── [ ] WhatsApp Cloud API setup
├── [ ] Webhook handler
├── [ ] Send/receive messages
├── [ ] Media handling (images, audio, docs)
├── [ ] Message templates
└── [ ] Phone number verification

✅ Week 6: Other Channels
├── [ ] Instagram DM integration
├── [ ] Facebook Messenger integration
├── [ ] Telegram Bot integration
├── [ ] Email (SMTP/IMAP) integration
└── [ ] Unified inbox logic
```

### Fase 3: Automation & Intelligence (2 semanas)

```
✅ Week 7: Automations
├── [ ] Models: Automation, AutomationExecution
├── [ ] Trigger engine
│   ├── [ ] Event listeners
│   ├── [ ] Condition evaluation
│   └── [ ] Action execution
├── [ ] Action types implementation
├── [ ] Execution logging
└── [ ] Testing system

✅ Week 8: AI Features
├── [ ] OpenAI integration
├── [ ] Lead scoring algorithm
├── [ ] Sentiment analysis
├── [ ] Conversation summarization
├── [ ] Smart suggestions
└── [ ] AI chat assistant
```

### Fase 4: Finance & Analytics (2 semanas)

```
✅ Week 9: Finance
├── [ ] Models: Transaction, SellerGoal
├── [ ] CRUD Transactions
├── [ ] Seller goals
├── [ ] Commission calculation
├── [ ] Financial reports
└── [ ] Stripe billing integration

✅ Week 10: Analytics
├── [ ] Dashboard metrics API
├── [ ] Lead analytics
├── [ ] Conversion analytics
├── [ ] Revenue analytics
├── [ ] Seller performance
├── [ ] Channel performance
└── [ ] Report generation (PDF/CSV)
```

### Fase 5: Polish & Launch (2 semanas)

```
✅ Week 11: Settings & Admin
├── [ ] Organization settings
├── [ ] User management
├── [ ] Permissions system
├── [ ] Integrations management
├── [ ] Webhook system
├── [ ] API tokens
└── [ ] Audit logs

✅ Week 12: Production Readiness
├── [ ] Comprehensive testing
├── [ ] Performance optimization
├── [ ] Security audit
├── [ ] Documentation
├── [ ] Monitoring setup
├── [ ] Error tracking (Sentry)
└── [ ] Production deploy
```

---

## 10. Checklist de Qualidade

### Antes de Cada Deploy

```
□ Todos os testes passando
□ Cobertura de testes > 80%
□ Sem console.log em produção
□ Environment variables configuradas
□ Migrations aplicadas
□ Índices do banco criados
□ Rate limiting configurado
□ CORS configurado corretamente
□ Error handling em todas as rotas
□ Logging estruturado funcionando
```

### Segurança

```
□ Passwords com bcrypt (cost 12+)
□ JWT com secret forte (32+ chars)
□ Refresh tokens rotacionados
□ Rate limiting por IP e por user
□ Validação de input com Zod
□ SQL/NoSQL injection prevenido
□ XSS prevenido
□ CSRF tokens (se usando cookies)
□ Headers de segurança (Helmet)
□ Secrets nunca no código
□ Audit log de ações sensíveis
```

### Performance

```
□ Índices para queries frequentes
□ Paginação cursor-based para listas grandes
□ Cache Redis para dados frequentes
□ Lazy loading onde apropriado
□ Compressão gzip/brotli
□ Connection pooling
□ N+1 queries evitadas
□ Background jobs para tarefas pesadas
```

### Multi-tenancy

```
□ organizationId em TODAS as queries
□ Testes de isolamento de tenant
□ Impossível acessar dados de outro tenant
□ Logs incluem organizationId
□ Limites de plano enforced
□ Sem hardcoded tenant IDs
```

---

## 📞 Próximos Passos

1. **Revisar este documento** e validar decisões arquiteturais
2. **Criar repositório backend** com estrutura inicial
3. **Configurar MongoDB Atlas** e Redis Upstash
4. **Implementar Fase 1** (Auth + CRM básico)
5. **Integrar frontend** com as primeiras APIs
6. **Iterar** nas fases seguintes

---

## 📚 Recursos

- [MongoDB Best Practices](https://www.mongodb.com/docs/manual/administration/production-notes/)
- [Prisma with MongoDB](https://www.prisma.io/docs/concepts/database-connectors/mongodb)
- [WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Stripe Billing](https://stripe.com/docs/billing)
- [OpenAI API](https://platform.openai.com/docs/api-reference)

---

*Documento criado para servir como guia durante todo o desenvolvimento do backend. Atualizar conforme decisões forem tomadas.*
