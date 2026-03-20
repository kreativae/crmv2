// ============================================================
// Script para inicializar o MongoDB Atlas com indexes e dados
// Conecte ao seu MongoDB e rode este script:
//
//   mongosh "mongodb+srv://kreativae:Fabio0803@crmv2.enxkqac.mongodb.net/" < backend/scripts/setup-mongodb.js
//
// ============================================================

// Seleciona/cria o banco crmv2
use('crmv2');

// ==========================================
// 1. CRIAR INDEXES DE PERFORMANCE
// ==========================================

print('📊 Criando indexes...');

// --- Users ---
db.users.createIndex({ organizationId: 1, email: 1 }, { unique: true });
db.users.createIndex({ organizationId: 1, role: 1 });
db.users.createIndex({ organizationId: 1, status: 1 });
db.users.createIndex({ email: 1 });

// --- Organizations ---
db.organizations.createIndex({ slug: 1 }, { unique: true });
db.organizations.createIndex({ status: 1 });

// --- Leads ---
db.leads.createIndex({ organizationId: 1, status: 1 });
db.leads.createIndex({ organizationId: 1, pipelineId: 1, stageId: 1 });
db.leads.createIndex({ organizationId: 1, assignedTo: 1 });
db.leads.createIndex({ organizationId: 1, score: -1 });
db.leads.createIndex({ organizationId: 1, createdAt: -1 });
db.leads.createIndex({ organizationId: 1, tags: 1 });
db.leads.createIndex({ organizationId: 1, email: 1 });
db.leads.createIndex(
  { name: 'text', email: 'text', company: 'text', phone: 'text' },
  { name: 'leads_text_search' }
);

// --- Clients ---
db.clients.createIndex({ organizationId: 1, status: 1 });
db.clients.createIndex({ organizationId: 1, industry: 1 });
db.clients.createIndex({ organizationId: 1, tags: 1 });
db.clients.createIndex({ organizationId: 1, createdAt: -1 });
db.clients.createIndex(
  { name: 'text', email: 'text', company: 'text', phone: 'text' },
  { name: 'clients_text_search' }
);

// --- Pipelines ---
db.pipelines.createIndex({ organizationId: 1, isDefault: 1 });

// --- Tasks ---
db.tasks.createIndex({ organizationId: 1, status: 1 });
db.tasks.createIndex({ organizationId: 1, priority: 1 });
db.tasks.createIndex({ organizationId: 1, assignedTo: 1 });
db.tasks.createIndex({ organizationId: 1, dueDate: 1 });
db.tasks.createIndex(
  { title: 'text', description: 'text' },
  { name: 'tasks_text_search' }
);

// --- CalendarEvents ---
db.calendarevents.createIndex({ organizationId: 1, startDate: 1 });
db.calendarevents.createIndex({ organizationId: 1, assignedTo: 1 });
db.calendarevents.createIndex({ organizationId: 1, category: 1 });

// --- Conversations ---
db.conversations.createIndex({ organizationId: 1, status: 1 });
db.conversations.createIndex({ organizationId: 1, channel: 1 });
db.conversations.createIndex({ organizationId: 1, assignedTo: 1 });
db.conversations.createIndex({ organizationId: 1, lastMessageAt: -1 });
db.conversations.createIndex({ organizationId: 1, channelId: 1 });

// --- Messages ---
db.messages.createIndex({ conversationId: 1, createdAt: -1 });

// --- Transactions ---
db.transactions.createIndex({ organizationId: 1, type: 1 });
db.transactions.createIndex({ organizationId: 1, status: 1 });
db.transactions.createIndex({ organizationId: 1, date: -1 });
db.transactions.createIndex({ organizationId: 1, dueDate: 1 });

// --- Automations ---
db.automations.createIndex({ organizationId: 1, isActive: 1 });
db.automations.createIndex({ organizationId: 1, 'trigger.type': 1 });

// --- AutomationLogs (TTL: 90 dias) ---
db.automationlogs.createIndex({ organizationId: 1, automationId: 1, createdAt: -1 });
db.automationlogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

// --- Notifications (TTL: 30 dias) ---
db.notifications.createIndex({ userId: 1, read: 1, createdAt: -1 });
db.notifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

// --- AuditLogs (TTL: 90 dias) ---
db.auditlogs.createIndex({ organizationId: 1, createdAt: -1 });
db.auditlogs.createIndex({ organizationId: 1, userId: 1 });
db.auditlogs.createIndex({ organizationId: 1, resource: 1 });
db.auditlogs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

print('✅ Indexes criados com sucesso!');

// ==========================================
// 2. CRIAR PIPELINE PADRÃO
// ==========================================

print('📊 Criando pipeline padrão...');

// Só cria se não existir nenhum
const existingPipelines = db.pipelines.countDocuments();
if (existingPipelines === 0) {
  print('  → Nenhum pipeline encontrado, será criado ao registrar primeira organização');
}

print('');
print('============================================');
print('✅ SETUP DO MONGODB COMPLETO!');
print('============================================');
print('');
print('📋 Collections serão criadas automaticamente');
print('   quando o primeiro usuário se cadastrar.');
print('');
print('🔗 APIs disponíveis:');
print('   POST /api/auth/register  → Cadastro');
print('   POST /api/auth/login     → Login');
print('   POST /api/auth/refresh   → Renovar token');
print('   POST /api/auth/logout    → Logout');
print('   GET  /api/auth/me        → Dados do usuário');
print('');
