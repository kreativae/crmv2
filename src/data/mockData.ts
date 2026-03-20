import type { Organization, User, Lead, Pipeline, Conversation, Task, AutomationFlow, Deal, FinanceRecord, SellerGoal } from '../types';

export const mockOrganization: Organization = {
  _id: 'org_1',
  name: 'NexCRM Corp',
  plan: 'professional',
  status: 'active',
  createdAt: '2024-01-15T00:00:00Z',
};

export const mockUsers: User[] = [
  { _id: 'u1', organizationId: 'org_1', name: 'Carlos Silva', email: 'carlos@nexcrm.com', role: 'owner', active: true, status: 'online', avatar: '' },
  { _id: 'u2', organizationId: 'org_1', name: 'Ana Oliveira', email: 'ana@nexcrm.com', role: 'admin', active: true, status: 'online', avatar: '' },
  { _id: 'u3', organizationId: 'org_1', name: 'Pedro Santos', email: 'pedro@nexcrm.com', role: 'sales', active: true, status: 'away', avatar: '' },
  { _id: 'u4', organizationId: 'org_1', name: 'Maria Costa', email: 'maria@nexcrm.com', role: 'support', active: true, status: 'online', avatar: '' },
  { _id: 'u5', organizationId: 'org_1', name: 'Lucas Ferreira', email: 'lucas@nexcrm.com', role: 'sales', active: true, status: 'offline', avatar: '' },
];

export const mockPipelines: Pipeline[] = [
  {
    _id: 'pip_1',
    organizationId: 'org_1',
    name: 'Vendas B2B',
    stages: [
      { _id: 's1', name: 'Prospecção', color: '#6366f1', order: 0 },
      { _id: 's2', name: 'Qualificação', color: '#8b5cf6', order: 1 },
      { _id: 's3', name: 'Proposta', color: '#f59e0b', order: 2 },
      { _id: 's4', name: 'Negociação', color: '#f97316', order: 3 },
      { _id: 's5', name: 'Fechamento', color: '#22c55e', order: 4 },
    ],
  },
  {
    _id: 'pip_2',
    organizationId: 'org_1',
    name: 'Vendas B2C',
    stages: [
      { _id: 's6', name: 'Lead Novo', color: '#3b82f6', order: 0 },
      { _id: 's7', name: 'Contato', color: '#8b5cf6', order: 1 },
      { _id: 's8', name: 'Demo', color: '#f59e0b', order: 2 },
      { _id: 's9', name: 'Fechamento', color: '#22c55e', order: 3 },
    ],
  },
];

export const mockLeads: Lead[] = [
  { _id: 'l1', organizationId: 'org_1', name: 'Tech Solutions Ltda', email: 'contato@techsol.com', phone: '+55 11 99999-0001', company: 'Tech Solutions', source: 'Website', tags: ['enterprise', 'tech'], pipelineId: 'pip_1', stageId: 's1', assignedTo: 'u3', status: 'new', score: 85, value: 45000, createdAt: '2024-12-01', lastActivity: '2h atrás' },
  { _id: 'l2', organizationId: 'org_1', name: 'Digital Marketing Pro', email: 'info@dmpro.com', phone: '+55 11 99999-0002', company: 'DM Pro', source: 'Indicação', tags: ['marketing', 'mid'], pipelineId: 'pip_1', stageId: 's2', assignedTo: 'u5', status: 'contacted', score: 72, value: 28000, createdAt: '2024-11-28', lastActivity: '5h atrás' },
  { _id: 'l3', organizationId: 'org_1', name: 'Startup Inovação', email: 'ceo@startup.io', phone: '+55 11 99999-0003', company: 'Startup IO', source: 'LinkedIn', tags: ['startup', 'saas'], pipelineId: 'pip_1', stageId: 's3', assignedTo: 'u3', status: 'qualified', score: 90, value: 65000, createdAt: '2024-11-15', lastActivity: '1d atrás' },
  { _id: 'l4', organizationId: 'org_1', name: 'E-Commerce Brasil', email: 'vendas@ecbr.com', phone: '+55 11 99999-0004', company: 'ECBR', source: 'Google Ads', tags: ['ecommerce', 'enterprise'], pipelineId: 'pip_1', stageId: 's4', assignedTo: 'u5', status: 'negotiation', score: 95, value: 120000, createdAt: '2024-10-20', lastActivity: '3h atrás' },
  { _id: 'l5', organizationId: 'org_1', name: 'Agência Criativa', email: 'hello@agencia.com', phone: '+55 11 99999-0005', company: 'Agência Criativa', source: 'Website', tags: ['agency', 'creative'], pipelineId: 'pip_1', stageId: 's1', assignedTo: 'u3', status: 'new', score: 60, value: 15000, createdAt: '2024-12-05', lastActivity: '30min atrás' },
  { _id: 'l6', organizationId: 'org_1', name: 'Construtora Forte', email: 'projetos@forte.com', phone: '+55 11 99999-0006', company: 'Construtora Forte', source: 'Indicação', tags: ['construção', 'enterprise'], pipelineId: 'pip_1', stageId: 's2', assignedTo: 'u5', status: 'contacted', score: 78, value: 89000, createdAt: '2024-11-10', lastActivity: '1h atrás' },
  { _id: 'l7', organizationId: 'org_1', name: 'FinTech Pay', email: 'biz@fintechpay.com', phone: '+55 11 99999-0007', company: 'FinTech Pay', source: 'Evento', tags: ['fintech', 'startup'], pipelineId: 'pip_1', stageId: 's5', assignedTo: 'u3', status: 'won', score: 98, value: 200000, createdAt: '2024-09-01', lastActivity: '1d atrás' },
  { _id: 'l8', organizationId: 'org_1', name: 'Loja Virtual Plus', email: 'admin@lvplus.com', phone: '+55 11 99999-0008', company: 'LV Plus', source: 'Google Ads', tags: ['ecommerce', 'small'], pipelineId: 'pip_2', stageId: 's6', assignedTo: 'u5', status: 'new', score: 55, value: 8000, createdAt: '2024-12-08', lastActivity: '15min atrás' },
  { _id: 'l9', organizationId: 'org_1', name: 'Consultoria Max', email: 'info@cmax.com', phone: '+55 11 99999-0009', company: 'C Max', source: 'Website', tags: ['consulting'], pipelineId: 'pip_1', stageId: 's3', assignedTo: 'u3', status: 'proposal', score: 82, value: 55000, createdAt: '2024-11-20', lastActivity: '6h atrás' },
  { _id: 'l10', organizationId: 'org_1', name: 'Saúde Digital', email: 'contato@saudedigital.com', phone: '+55 11 99999-0010', company: 'Saúde Digital', source: 'LinkedIn', tags: ['health', 'tech'], pipelineId: 'pip_1', stageId: 's4', assignedTo: 'u5', status: 'negotiation', score: 88, value: 95000, createdAt: '2024-10-15', lastActivity: '2h atrás' },
];

export const mockDeals: Deal[] = [
  { _id: 'd1', organizationId: 'org_1', leadId: 'l7', leadName: 'FinTech Pay', value: 200000, stage: 'Fechamento', expectedCloseDate: '2024-12-30', status: 'won' },
  { _id: 'd2', organizationId: 'org_1', leadId: 'l4', leadName: 'E-Commerce Brasil', value: 120000, stage: 'Negociação', expectedCloseDate: '2025-01-15', status: 'open' },
  { _id: 'd3', organizationId: 'org_1', leadId: 'l10', leadName: 'Saúde Digital', value: 95000, stage: 'Negociação', expectedCloseDate: '2025-01-20', status: 'open' },
  { _id: 'd4', organizationId: 'org_1', leadId: 'l6', leadName: 'Construtora Forte', value: 89000, stage: 'Qualificação', expectedCloseDate: '2025-02-10', status: 'open' },
  { _id: 'd5', organizationId: 'org_1', leadId: 'l3', leadName: 'Startup Inovação', value: 65000, stage: 'Proposta', expectedCloseDate: '2025-01-25', status: 'open' },
];

export const mockConversations: Conversation[] = [
  {
    _id: 'c1', organizationId: 'org_1', contactId: 'l1', contactName: 'João - Tech Solutions', channel: 'whatsapp', assignedTo: 'u4', assignedName: 'Maria Costa',
    lastMessage: 'Olá, gostaria de saber mais sobre o plano enterprise', lastMessageTime: '2min', unreadCount: 3, status: 'open',
    messages: [
      { _id: 'm1', sender: 'client', senderName: 'João', content: 'Olá! Vi o anúncio de vocês', timestamp: '10:30' },
      { _id: 'm2', sender: 'agent', senderName: 'Maria Costa', content: 'Olá João! Seja bem-vindo 😊 Como posso ajudá-lo?', timestamp: '10:31' },
      { _id: 'm3', sender: 'client', senderName: 'João', content: 'Gostaria de saber mais sobre o plano enterprise', timestamp: '10:33' },
      { _id: 'm4', sender: 'client', senderName: 'João', content: 'Temos uma equipe de 50 pessoas', timestamp: '10:33' },
      { _id: 'm5', sender: 'client', senderName: 'João', content: 'Olá, gostaria de saber mais sobre o plano enterprise', timestamp: '10:35' },
    ],
  },
  {
    _id: 'c2', organizationId: 'org_1', contactId: 'l2', contactName: 'Ana Paula - DM Pro', channel: 'instagram', assignedTo: 'u4', assignedName: 'Maria Costa',
    lastMessage: 'Qual o prazo de implementação?', lastMessageTime: '15min', unreadCount: 1, status: 'open',
    messages: [
      { _id: 'm6', sender: 'client', senderName: 'Ana Paula', content: 'Oi, vi o post sobre CRM', timestamp: '09:00' },
      { _id: 'm7', sender: 'agent', senderName: 'Maria Costa', content: 'Olá Ana Paula! Temos soluções incríveis para agências!', timestamp: '09:05' },
      { _id: 'm8', sender: 'client', senderName: 'Ana Paula', content: 'Qual o prazo de implementação?', timestamp: '09:20' },
    ],
  },
  {
    _id: 'c3', organizationId: 'org_1', contactId: 'l3', contactName: 'Roberto - Startup IO', channel: 'telegram', assignedTo: 'u3', assignedName: 'Pedro Santos',
    lastMessage: 'Vamos agendar uma demo?', lastMessageTime: '1h', unreadCount: 0, status: 'open',
    messages: [
      { _id: 'm9', sender: 'agent', senderName: 'Pedro Santos', content: 'Oi Roberto, tudo bem?', timestamp: '08:00' },
      { _id: 'm10', sender: 'client', senderName: 'Roberto', content: 'Tudo ótimo! Estamos avaliando', timestamp: '08:15' },
      { _id: 'm11', sender: 'agent', senderName: 'Pedro Santos', content: 'Vamos agendar uma demo?', timestamp: '08:30' },
    ],
  },
  {
    _id: 'c4', organizationId: 'org_1', contactId: 'l4', contactName: 'Marcos - ECBR', channel: 'email', assignedTo: 'u3', assignedName: 'Pedro Santos',
    lastMessage: 'Segue a proposta comercial atualizada', lastMessageTime: '3h', unreadCount: 0, status: 'pending',
    messages: [
      { _id: 'm12', sender: 'agent', senderName: 'Pedro Santos', content: 'Segue a proposta comercial atualizada', timestamp: '07:00' },
    ],
  },
  {
    _id: 'c5', organizationId: 'org_1', contactId: 'l5', contactName: 'Fernanda - Agência Criativa', channel: 'facebook', assignedTo: 'u4', assignedName: 'Maria Costa',
    lastMessage: 'Adorei a apresentação!', lastMessageTime: '30min', unreadCount: 2, status: 'open',
    messages: [
      { _id: 'm13', sender: 'client', senderName: 'Fernanda', content: 'Oi, vim pelo Facebook!', timestamp: '11:00' },
      { _id: 'm14', sender: 'agent', senderName: 'Maria Costa', content: 'Olá Fernanda! Que bom ter você aqui!', timestamp: '11:02' },
      { _id: 'm15', sender: 'client', senderName: 'Fernanda', content: 'Adorei a apresentação!', timestamp: '11:10' },
    ],
  },
  {
    _id: 'c6', organizationId: 'org_1', contactId: 'l8', contactName: 'Ricardo - LV Plus', channel: 'webchat', assignedTo: 'u4', assignedName: 'Maria Costa',
    lastMessage: 'Preciso de ajuda com a integração', lastMessageTime: '45min', unreadCount: 1, status: 'open',
    messages: [
      { _id: 'm16', sender: 'client', senderName: 'Ricardo', content: 'Preciso de ajuda com a integração', timestamp: '10:00' },
    ],
  },
];

export const mockTasks: Task[] = [
  { 
    _id: 't1', 
    organizationId: 'org_1', 
    title: 'Follow-up Tech Solutions', 
    description: 'Enviar proposta detalhada com todos os módulos solicitados pelo cliente', 
    assignedTo: 'u3', 
    assignedName: 'Pedro Santos', 
    leadId: 'l1', 
    leadName: 'Tech Solutions', 
    priority: 'high', 
    status: 'todo', 
    dueDate: '2024-12-15', 
    createdAt: '2024-12-08',
    tags: ['proposta', 'enterprise'],
    estimatedHours: 2,
    subtasks: [
      { id: 'st1', title: 'Preparar apresentação de módulos', completed: true },
      { id: 'st2', title: 'Calcular precificação customizada', completed: false },
      { id: 'st3', title: 'Revisar termos do contrato', completed: false },
    ],
    notes: [
      { id: 'n1', content: 'Cliente pediu desconto de 15% para pagamento à vista', author: 'Pedro Santos', createdAt: '2024-12-08 14:30' },
    ],
    activities: [
      { id: 'a1', action: 'Tarefa criada', user: 'Pedro Santos', timestamp: '2024-12-08 10:00' },
      { id: 'a2', action: 'Subtarefa concluída', user: 'Pedro Santos', timestamp: '2024-12-09 11:30', details: 'Preparar apresentação de módulos' },
    ]
  },
  { 
    _id: 't2', 
    organizationId: 'org_1', 
    title: 'Demo Startup IO', 
    description: 'Preparar ambiente de demo personalizado para apresentação', 
    assignedTo: 'u3', 
    assignedName: 'Pedro Santos', 
    leadId: 'l3', 
    leadName: 'Startup IO', 
    priority: 'urgent', 
    status: 'in_progress', 
    dueDate: '2024-12-12', 
    createdAt: '2024-12-05',
    tags: ['demo', 'startup', 'prioritário'],
    estimatedHours: 4,
    subtasks: [
      { id: 'st4', title: 'Criar ambiente sandbox', completed: true },
      { id: 'st5', title: 'Popular com dados de exemplo', completed: true },
      { id: 'st6', title: 'Testar fluxos principais', completed: false },
      { id: 'st7', title: 'Preparar roteiro da demo', completed: false },
    ],
    notes: [
      { id: 'n2', content: 'CEO estará presente na reunião', author: 'Pedro Santos', createdAt: '2024-12-06 09:00' },
      { id: 'n3', content: 'Focar em integrações com Slack e Jira', author: 'Ana Oliveira', createdAt: '2024-12-07 15:20' },
    ],
    activities: [
      { id: 'a3', action: 'Tarefa criada', user: 'Ana Oliveira', timestamp: '2024-12-05 08:00' },
      { id: 'a4', action: 'Prioridade alterada para Urgente', user: 'Ana Oliveira', timestamp: '2024-12-06 10:00' },
      { id: 'a5', action: 'Status alterado para Em Andamento', user: 'Pedro Santos', timestamp: '2024-12-07 09:00' },
    ]
  },
  { 
    _id: 't3', 
    organizationId: 'org_1', 
    title: 'Contrato ECBR', 
    description: 'Revisar contrato com jurídico e preparar para assinatura digital', 
    assignedTo: 'u5', 
    assignedName: 'Lucas Ferreira', 
    leadId: 'l4', 
    leadName: 'E-Commerce Brasil', 
    priority: 'high', 
    status: 'in_progress', 
    dueDate: '2024-12-18', 
    createdAt: '2024-12-01',
    tags: ['contrato', 'jurídico', 'enterprise'],
    estimatedHours: 3,
    subtasks: [
      { id: 'st8', title: 'Enviar para revisão jurídica', completed: true },
      { id: 'st9', title: 'Incluir cláusulas de SLA', completed: true },
      { id: 'st10', title: 'Obter aprovação do cliente', completed: false },
      { id: 'st11', title: 'Configurar assinatura digital', completed: false },
    ],
    notes: [
      { id: 'n4', content: 'Jurídico solicitou inclusão de cláusula de confidencialidade', author: 'Lucas Ferreira', createdAt: '2024-12-05 14:00' },
    ],
    activities: [
      { id: 'a6', action: 'Tarefa criada', user: 'Carlos Silva', timestamp: '2024-12-01 10:00' },
      { id: 'a7', action: 'Tarefa atribuída a Lucas Ferreira', user: 'Carlos Silva', timestamp: '2024-12-01 10:05' },
    ]
  },
  { 
    _id: 't4', 
    organizationId: 'org_1', 
    title: 'Qualificar lead DM Pro', 
    description: 'Agendar call de discovery para entender necessidades', 
    assignedTo: 'u5', 
    assignedName: 'Lucas Ferreira', 
    leadId: 'l2', 
    leadName: 'DM Pro', 
    priority: 'medium', 
    status: 'todo', 
    dueDate: '2024-12-20', 
    createdAt: '2024-12-07',
    tags: ['discovery', 'qualificação'],
    estimatedHours: 1,
    subtasks: [
      { id: 'st12', title: 'Pesquisar empresa no LinkedIn', completed: false },
      { id: 'st13', title: 'Preparar perguntas de discovery', completed: false },
      { id: 'st14', title: 'Enviar convite para reunião', completed: false },
    ],
    activities: [
      { id: 'a8', action: 'Tarefa criada automaticamente', user: 'Sistema', timestamp: '2024-12-07 08:00', details: 'Via automação: Novo lead qualificado' },
    ]
  },
  { 
    _id: 't5', 
    organizationId: 'org_1', 
    title: 'Enviar case studies', 
    description: 'Preparar material com cases relevantes para Construtora Forte', 
    assignedTo: 'u3', 
    assignedName: 'Pedro Santos', 
    leadId: 'l6', 
    leadName: 'Construtora Forte', 
    priority: 'low', 
    status: 'done', 
    dueDate: '2024-12-10', 
    createdAt: '2024-12-03',
    completedAt: '2024-12-09',
    tags: ['marketing', 'cases'],
    estimatedHours: 1.5,
    subtasks: [
      { id: 'st15', title: 'Selecionar cases do setor de construção', completed: true },
      { id: 'st16', title: 'Formatar PDF com branding', completed: true },
      { id: 'st17', title: 'Enviar por email', completed: true },
    ],
    notes: [
      { id: 'n5', content: 'Cliente respondeu positivamente aos cases', author: 'Pedro Santos', createdAt: '2024-12-10 10:00' },
    ],
    activities: [
      { id: 'a9', action: 'Tarefa criada', user: 'Pedro Santos', timestamp: '2024-12-03 14:00' },
      { id: 'a10', action: 'Status alterado para Concluída', user: 'Pedro Santos', timestamp: '2024-12-09 16:30' },
    ]
  },
  { 
    _id: 't6', 
    organizationId: 'org_1', 
    title: 'Atualizar pipeline B2C', 
    description: 'Adicionar nova etapa de onboarding e ajustar automações', 
    assignedTo: 'u2', 
    assignedName: 'Ana Oliveira', 
    priority: 'medium', 
    status: 'todo', 
    dueDate: '2024-12-22', 
    createdAt: '2024-12-06',
    tags: ['configuração', 'pipeline'],
    estimatedHours: 2,
    subtasks: [
      { id: 'st18', title: 'Definir etapas do onboarding', completed: false },
      { id: 'st19', title: 'Criar automações de boas-vindas', completed: false },
      { id: 'st20', title: 'Testar fluxo completo', completed: false },
    ],
    activities: [
      { id: 'a11', action: 'Tarefa criada', user: 'Carlos Silva', timestamp: '2024-12-06 11:00' },
    ]
  },
  { 
    _id: 't7', 
    organizationId: 'org_1', 
    title: 'Reunião semanal de vendas', 
    description: 'Revisar métricas e pipeline com toda a equipe comercial', 
    assignedTo: 'u1', 
    assignedName: 'Carlos Silva', 
    priority: 'medium', 
    status: 'todo', 
    dueDate: '2024-12-13', 
    createdAt: '2024-12-06',
    tags: ['reunião', 'recorrente'],
    estimatedHours: 1,
    subtasks: [
      { id: 'st21', title: 'Preparar dashboard de métricas', completed: false },
      { id: 'st22', title: 'Coletar updates dos vendedores', completed: false },
      { id: 'st23', title: 'Enviar pauta para equipe', completed: false },
    ],
    activities: [
      { id: 'a12', action: 'Tarefa criada', user: 'Carlos Silva', timestamp: '2024-12-06 09:00' },
    ]
  },
  { 
    _id: 't8', 
    organizationId: 'org_1', 
    title: 'Integração API Saúde Digital', 
    description: 'Configurar integração com sistema ERP do cliente', 
    assignedTo: 'u4', 
    assignedName: 'Maria Costa', 
    leadId: 'l10',
    leadName: 'Saúde Digital',
    priority: 'high', 
    status: 'todo', 
    dueDate: '2024-12-16', 
    createdAt: '2024-12-08',
    tags: ['integração', 'técnico', 'API'],
    estimatedHours: 6,
    subtasks: [
      { id: 'st24', title: 'Obter credenciais de API', completed: false },
      { id: 'st25', title: 'Configurar webhook de eventos', completed: false },
      { id: 'st26', title: 'Mapear campos entre sistemas', completed: false },
      { id: 'st27', title: 'Testar sincronização', completed: false },
    ],
    activities: [
      { id: 'a13', action: 'Tarefa criada', user: 'Lucas Ferreira', timestamp: '2024-12-08 10:00' },
    ]
  },
];

export const mockAutomations: AutomationFlow[] = [
  { 
    _id: 'a1', 
    name: 'Boas-vindas WhatsApp', 
    description: 'Envia mensagem de boas-vindas quando um novo lead é criado via WhatsApp', 
    trigger: { type: 'new_lead', label: 'Novo Lead (WhatsApp)', config: { channel: 'whatsapp' } },
    conditions: [{ id: 'c1', field: 'source', operator: 'equals', value: 'WhatsApp' }],
    actions: [
      { id: 'act1', type: 'send_whatsapp', label: 'Enviar mensagem de boas-vindas', config: { template: 'welcome' } },
      { id: 'act2', type: 'create_task', label: 'Criar tarefa de follow-up', config: { title: 'Follow-up inicial', priority: 'high' } },
      { id: 'act3', type: 'assign_user', label: 'Atribuir ao vendedor disponível', config: { method: 'round_robin' } }
    ], 
    active: true, 
    executionCount: 1247, 
    successCount: 1230,
    failCount: 17,
    lastRun: '2min atrás',
    createdAt: '2024-10-15',
    updatedAt: '2024-12-01'
  },
  { 
    _id: 'a2', 
    name: 'Score Automático', 
    description: 'Atualiza o score do lead baseado em interações e dados demográficos', 
    trigger: { type: 'field_update', label: 'Campo Atualizado', config: { fields: ['interactions', 'email_opened'] } },
    conditions: [],
    actions: [
      { id: 'act4', type: 'update_field', label: 'Calcular score', config: { field: 'score', formula: 'auto' } },
      { id: 'act5', type: 'update_field', label: 'Atualizar lead', config: { field: 'lastActivity', value: 'now' } },
      { id: 'act6', type: 'notification', label: 'Notificar se score > 80', config: { condition: 'score > 80' } }
    ], 
    active: true, 
    executionCount: 3891,
    successCount: 3850,
    failCount: 41,
    lastRun: '5min atrás',
    createdAt: '2024-09-20',
    updatedAt: '2024-11-15'
  },
  { 
    _id: 'a3', 
    name: 'Follow-up Automático', 
    description: 'Envia email de follow-up 3 dias após última interação', 
    trigger: { type: 'time_delay', label: 'Delay (3 dias sem interação)', config: { days: 3, condition: 'no_interaction' } },
    conditions: [{ id: 'c2', field: 'status', operator: 'not_equals', value: 'won' }],
    actions: [
      { id: 'act7', type: 'send_email', label: 'Enviar email de follow-up', config: { template: 'followup_3days' } },
      { id: 'act8', type: 'notification', label: 'Criar alerta para vendedor', config: { type: 'alert' } }
    ], 
    active: true, 
    executionCount: 856,
    successCount: 820,
    failCount: 36,
    lastRun: '1h atrás',
    createdAt: '2024-08-10',
    updatedAt: '2024-12-05'
  },
  { 
    _id: 'a4', 
    name: 'Mudança de Etapa', 
    description: 'Notifica gerente quando lead avança para negociação', 
    trigger: { type: 'stage_change', label: 'Mudança de Etapa (Negociação)', config: { stage: 'negotiation' } },
    conditions: [{ id: 'c3', field: 'value', operator: 'greater_than', value: '50000' }],
    actions: [
      { id: 'act9', type: 'notification', label: 'Notificar gerente', config: { users: ['manager'] } },
      { id: 'act10', type: 'update_field', label: 'Atualizar deal', config: { field: 'priority', value: 'high' } },
      { id: 'act11', type: 'webhook', label: 'Webhook CRM externo', config: { url: 'https://external-crm.com/webhook' } }
    ], 
    active: false, 
    executionCount: 234,
    successCount: 228,
    failCount: 6,
    lastRun: '2d atrás',
    createdAt: '2024-07-01',
    updatedAt: '2024-11-20'
  },
  { 
    _id: 'a5', 
    name: 'SLA de Atendimento', 
    description: 'Alerta quando tempo de resposta excede 5 minutos', 
    trigger: { type: 'message_received', label: 'Mensagem Recebida', config: { channels: ['all'] } },
    conditions: [{ id: 'c4', field: 'response_time', operator: 'greater_than', value: '5' }],
    actions: [
      { id: 'act12', type: 'condition', label: 'Verificar SLA', config: { check: 'response_time > 5min' } },
      { id: 'act13', type: 'notification', label: 'Alertar supervisor', config: { type: 'urgent' } },
      { id: 'act14', type: 'assign_user', label: 'Redistribuir se necessário', config: { method: 'available' } }
    ], 
    active: true, 
    executionCount: 5621,
    successCount: 5600,
    failCount: 21,
    lastRun: '1min atrás',
    createdAt: '2024-06-15',
    updatedAt: '2024-12-08'
  },
];

export const mockExecutions: import('../types').AutomationExecution[] = [
  { _id: 'ex1', automationId: 'a1', status: 'success', triggeredBy: 'Lead: Tech Solutions', startedAt: '2024-12-10T10:30:00Z', completedAt: '2024-12-10T10:30:02Z', actionsExecuted: 3 },
  { _id: 'ex2', automationId: 'a5', status: 'success', triggeredBy: 'Mensagem: João - Tech Solutions', startedAt: '2024-12-10T10:28:00Z', completedAt: '2024-12-10T10:28:01Z', actionsExecuted: 3 },
  { _id: 'ex3', automationId: 'a2', status: 'success', triggeredBy: 'Lead: Startup IO', startedAt: '2024-12-10T10:25:00Z', completedAt: '2024-12-10T10:25:03Z', actionsExecuted: 3 },
  { _id: 'ex4', automationId: 'a1', status: 'failed', triggeredBy: 'Lead: E-Commerce Brasil', startedAt: '2024-12-10T10:20:00Z', completedAt: '2024-12-10T10:20:05Z', actionsExecuted: 1, error: 'WhatsApp API timeout' },
  { _id: 'ex5', automationId: 'a3', status: 'success', triggeredBy: 'Lead: DM Pro', startedAt: '2024-12-10T09:00:00Z', completedAt: '2024-12-10T09:00:04Z', actionsExecuted: 2 },
  { _id: 'ex6', automationId: 'a5', status: 'running', triggeredBy: 'Mensagem: Ana Paula - DM Pro', startedAt: '2024-12-10T10:32:00Z', actionsExecuted: 1 },
  { _id: 'ex7', automationId: 'a2', status: 'success', triggeredBy: 'Lead: Construtora Forte', startedAt: '2024-12-10T08:45:00Z', completedAt: '2024-12-10T08:45:02Z', actionsExecuted: 3 },
  { _id: 'ex8', automationId: 'a1', status: 'success', triggeredBy: 'Lead: Saúde Digital', startedAt: '2024-12-10T08:30:00Z', completedAt: '2024-12-10T08:30:01Z', actionsExecuted: 3 },
];

export const mockFinanceRecords: FinanceRecord[] = [
  { _id: 'f1', type: 'revenue', category: 'services', description: 'Contrato FinTech Pay', value: 200000, client: 'FinTech Pay', salesperson: 'Pedro Santos', date: '2024-12-01', dueDate: '2024-12-15', pipeline: 'Vendas B2B', status: 'paid', invoiceNumber: 'INV-2024-001' },
  { _id: 'f2', type: 'commission', category: 'commission', description: 'Comissão Pedro - FinTech', value: 20000, salesperson: 'Pedro Santos', date: '2024-12-01', pipeline: 'Vendas B2B', status: 'paid' },
  { _id: 'f3', type: 'revenue', category: 'services', description: 'Setup Agência Criativa', value: 15000, client: 'Agência Criativa', salesperson: 'Lucas Ferreira', date: '2024-11-28', dueDate: '2024-12-10', pipeline: 'Vendas B2B', status: 'paid', invoiceNumber: 'INV-2024-002' },
  { _id: 'f4', type: 'commission', category: 'commission', description: 'Comissão Lucas - Agência', value: 1500, salesperson: 'Lucas Ferreira', date: '2024-11-28', pipeline: 'Vendas B2B', status: 'paid' },
  { _id: 'f5', type: 'revenue', category: 'subscription', description: 'Mensal LV Plus', value: 8000, client: 'LV Plus', salesperson: 'Lucas Ferreira', date: '2024-12-05', dueDate: '2024-12-20', pipeline: 'Vendas B2C', status: 'pending', invoiceNumber: 'INV-2024-003' },
  { _id: 'f6', type: 'revenue', category: 'products', description: 'Upgrade Consultoria Max', value: 55000, client: 'Consultoria Max', salesperson: 'Pedro Santos', date: '2024-12-03', dueDate: '2024-12-18', pipeline: 'Vendas B2B', status: 'paid', invoiceNumber: 'INV-2024-004' },
  { _id: 'f7', type: 'commission', category: 'commission', description: 'Comissão Pedro - C Max', value: 5500, salesperson: 'Pedro Santos', date: '2024-12-03', pipeline: 'Vendas B2B', status: 'paid' },
  { _id: 'f8', type: 'expense', category: 'marketing', description: 'Google Ads - Dezembro', value: 12000, salesperson: 'Ana Oliveira', date: '2024-12-01', pipeline: 'Marketing', status: 'paid' },
  { _id: 'f9', type: 'expense', category: 'operations', description: 'Licença CRM Enterprise', value: 4500, salesperson: 'Carlos Silva', date: '2024-12-01', pipeline: 'Operações', status: 'paid' },
  { _id: 'f10', type: 'revenue', category: 'services', description: 'Consultoria Tech Solutions', value: 45000, client: 'Tech Solutions', salesperson: 'Pedro Santos', date: '2024-12-08', dueDate: '2024-12-25', pipeline: 'Vendas B2B', status: 'pending', invoiceNumber: 'INV-2024-005' },
  { _id: 'f11', type: 'revenue', category: 'subscription', description: 'Plano Enterprise ECBR', value: 120000, client: 'E-Commerce Brasil', salesperson: 'Lucas Ferreira', date: '2024-11-15', dueDate: '2024-11-30', pipeline: 'Vendas B2B', status: 'overdue', invoiceNumber: 'INV-2024-006' },
  { _id: 'f12', type: 'expense', category: 'marketing', description: 'Evento Tech Summit', value: 8500, salesperson: 'Ana Oliveira', date: '2024-11-20', pipeline: 'Marketing', status: 'paid' },
  { _id: 'f13', type: 'refund', category: 'refund', description: 'Reembolso cliente Beta', value: 3200, client: 'Beta Corp', salesperson: 'Lucas Ferreira', date: '2024-12-06', pipeline: 'Vendas B2B', status: 'paid' },
  { _id: 'f14', type: 'revenue', category: 'services', description: 'Implementação Saúde Digital', value: 95000, client: 'Saúde Digital', salesperson: 'Pedro Santos', date: '2024-12-10', dueDate: '2025-01-10', pipeline: 'Vendas B2B', status: 'pending', invoiceNumber: 'INV-2024-007' },
  { _id: 'f15', type: 'expense', category: 'taxes', description: 'Impostos Novembro', value: 18500, salesperson: 'Carlos Silva', date: '2024-12-05', pipeline: 'Fiscal', status: 'paid' },
  { _id: 'f16', type: 'commission', category: 'commission', description: 'Comissão Lucas - ECBR', value: 12000, salesperson: 'Lucas Ferreira', date: '2024-11-20', pipeline: 'Vendas B2B', status: 'pending' },
];

export const dashboardStats = {
  totalRevenue: 478000,
  revenueGrowth: 23.5,
  totalLeads: 156,
  leadsGrowth: 18.2,
  conversionRate: 32.4,
  conversionGrowth: 5.1,
  activeDeals: 24,
  dealsGrowth: 12.8,
  avgCloseTime: 18,
  closeTimeChange: -2.3,
  openTickets: 12,
  ticketsChange: -8.5,
};

export const chartData = {
  revenueByMonth: [
    { month: 'Jul', value: 180000 },
    { month: 'Ago', value: 220000 },
    { month: 'Set', value: 195000 },
    { month: 'Out', value: 310000 },
    { month: 'Nov', value: 285000 },
    { month: 'Dez', value: 478000 },
  ],
  leadsBySource: [
    { source: 'Website', count: 45 },
    { source: 'Google Ads', count: 32 },
    { source: 'LinkedIn', count: 28 },
    { source: 'Indicação', count: 24 },
    { source: 'Evento', count: 15 },
    { source: 'Outros', count: 12 },
  ],
  conversionFunnel: [
    { stage: 'Visitantes', value: 4500 },
    { stage: 'Leads', value: 1560 },
    { stage: 'Qualificados', value: 680 },
    { stage: 'Propostas', value: 340 },
    { stage: 'Negociação', value: 180 },
    { stage: 'Fechados', value: 92 },
  ],
  performanceBySeller: [
    { name: 'Pedro Santos', deals: 15, revenue: 320000, conversion: 38 },
    { name: 'Lucas Ferreira', deals: 9, revenue: 158000, conversion: 28 },
  ],
};

export const mockSellerGoals: SellerGoal[] = [
  { _id: 'sg1', name: 'Pedro Santos', email: 'pedro@nexcrm.com', revenue: 320000, goal: 400000, deals: 15, commissionRate: 10 },
  { _id: 'sg2', name: 'Lucas Ferreira', email: 'lucas@nexcrm.com', revenue: 158000, goal: 250000, deals: 9, commissionRate: 8 },
  { _id: 'sg3', name: 'Ana Oliveira', email: 'ana@nexcrm.com', revenue: 92000, goal: 150000, deals: 6, commissionRate: 7 },
  { _id: 'sg4', name: 'Maria Costa', email: 'maria@nexcrm.com', revenue: 45000, goal: 100000, deals: 4, commissionRate: 6 },
];
