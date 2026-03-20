# 🔗 Integração Entre Páginas — NexCRM

## Status Atual

A integração entre as páginas foi implementada para compartilhar dados entre os módulos do sistema. Abaixo está o mapa de integração:

---

## 📊 Mapa de Integração de Dados

### 🧑‍💼 Clientes (Fonte)
Os clientes cadastrados na página **Clientes** são disponibilizados em:

| Página | Uso | Campo |
|--------|-----|-------|
| **Financeiro** | Seleção de cliente ao criar transação | Dropdown "Cliente / Lead" com optgroup "Clientes" |
| **Agenda** | Associação de evento a cliente | Dropdown "Lead / Cliente" com optgroup "Clientes" |
| **CRM** | Conversão de lead para cliente | (Futuro: botão "Converter para Cliente") |
| **Omnichannel** | Identificação de contato | (Futuro: busca em clientes existentes) |

---

### 🎯 Leads (Fonte: CRM)
Os leads cadastrados no **CRM** são disponibilizados em:

| Página | Uso | Campo |
|--------|-----|-------|
| **Financeiro** | Associação de transação a lead | Dropdown "Cliente / Lead" com optgroup "Leads" |
| **Agenda** | Associação de evento a lead | Dropdown "Lead / Cliente" com optgroup "Leads" |
| **Tarefas** | Vinculação de tarefa a lead | Campo "Lead Associado" |
| **Omnichannel** | Identificação de contato | Card de lead no painel de detalhes |

---

### 👥 Usuários (Fonte: Configurações)
Os usuários cadastrados em **Configurações > Usuários** são disponibilizados em:

| Página | Uso | Campo |
|--------|-----|-------|
| **Agenda** | Atribuição de responsável | Dropdown "Responsável" no formulário de evento |
| **Tarefas** | Atribuição de tarefa | Dropdown "Responsável" |
| **CRM** | Atribuição de lead | Dropdown "Atribuído a" |
| **Financeiro** | Vendedor da transação | Dropdown "Vendedor" |

---

### 💰 Transações Financeiras (Fonte: Financeiro)
As transações cadastradas no **Financeiro** são disponibilizadas em:

| Página | Uso | Visualização |
|--------|-----|--------------|
| **Dashboard** | KPIs de receita/despesa | Cards de estatísticas |
| **Clientes** | Histórico de compras | Tab "Histórico" no painel de detalhes |
| **Analytics** | Relatórios financeiros | Gráficos e métricas |

---

### 📅 Eventos (Fonte: Agenda)
Os eventos cadastrados na **Agenda** são disponibilizados em:

| Página | Uso | Visualização |
|--------|-----|--------------|
| **Dashboard** | Próximos eventos | Lista lateral |
| **CRM** | Agendamentos com lead | Timeline do lead |
| **Tarefas** | Tarefas agendadas | Integração visual |

---

## 🔧 Implementação Técnica

### Store (Zustand)
Todos os dados estão centralizados no store global:

```typescript
// src/store.ts
const useStore = create<AppState>((set) => ({
  // Entidades principais
  clients: Client[],
  leads: Lead[],
  financeRecords: FinanceRecord[],
  calendarEvents: CalendarEvent[],
  tasks: Task[],
  conversations: Conversation[],
  settingsUsers: User[],
  
  // CRUD operations para cada entidade
  addClient, updateClient, deleteClient,
  addLead, updateLead, deleteLead,
  // ...etc
}));
```

### Uso nas Páginas
Cada página importa os dados necessários do store:

```typescript
// FinancePage.tsx
const { financeRecords, clients, leads } = useStore();

// AgendaPage.tsx  
const { calendarEvents, clients, leads, settingsUsers } = useStore();
```

---

## 🚀 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                        STORE (Zustand)                       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ │
│  │ Clients │ │  Leads  │ │ Finance │ │ Events  │ │ Tasks  │ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └───┬────┘ │
└───────┼───────────┼───────────┼───────────┼──────────┼──────┘
        │           │           │           │          │
        ▼           ▼           ▼           ▼          ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │Clientes │ │   CRM   │ │Financ.  │ │ Agenda  │ │ Tarefas │
   │  Page   │ │  Page   │ │  Page   │ │  Page   │ │  Page   │
   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
        │           │           │           │          │
        └───────────┴───────────┴───────────┴──────────┘
                              │
                              ▼
                        ┌──────────┐
                        │Dashboard │
                        │(Resumos) │
                        └──────────┘
```

---

## ✅ O Que Funciona Agora

| Integração | Status |
|------------|--------|
| Clientes → Financeiro (dropdown) | ✅ Funcional |
| Clientes → Agenda (dropdown) | ✅ Funcional |
| Leads → Financeiro (dropdown) | ✅ Funcional |
| Leads → Agenda (dropdown) | ✅ Funcional |
| Usuários → Agenda (dropdown) | ✅ Funcional |
| Dados → Dashboard (visualização) | ✅ Funcional |

---

## 🔜 Próximas Integrações (Backend)

Quando o backend for implementado, as seguintes integrações adicionais serão possíveis:

1. **Conversão Lead → Cliente**: Botão no CRM para converter lead em cliente
2. **Histórico completo**: Todas as interações de um cliente em um só lugar
3. **Notificações em tempo real**: Quando um cliente é modificado, todas as páginas atualizam
4. **Filtros cruzados**: Filtrar transações por cliente específico
5. **Relatórios integrados**: Relatórios que cruzam dados de múltiplas fontes
6. **Busca global**: Buscar em todas as entidades simultaneamente

---

## 📝 Notas de Implementação

### Dados Mock vs Reais
Atualmente, os dados são mock (estáticos) definidos no arquivo `src/data/mockData.ts` e no `src/store.ts`. Quando o backend for conectado:

1. Substituir mock data por chamadas à API
2. Implementar cache local com invalidação
3. Usar React Query ou SWR para gerenciamento de estado do servidor
4. Manter Zustand apenas para estado de UI

### IDs e Referências
As referências entre entidades usam IDs ou nomes. No backend:
- Usar ObjectId do MongoDB para referências
- Implementar populate/lookup para carregar dados relacionados
- Criar índices para consultas frequentes
