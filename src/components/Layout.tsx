import { type ReactNode, useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { useStore } from '../store';
import { motion } from 'framer-motion';
import {
  Bell, Search, Command, Sparkles, ChevronDown, Menu,
  Users, MessageSquare, CheckSquare, DollarSign, BarChart3,
  Zap, Settings, LayoutDashboard, Brain, LogOut, User,
  ExternalLink, Clock, Trash2, Check, CheckCheck, Volume2, VolumeX,
  Send, X, Calendar, UserCheck
} from 'lucide-react';
import { cn } from '../utils/cn';
import type { AppPage } from '../types';

const pageTransition = {
  initial: { opacity: 0, y: 6, scale: 0.998 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.998 },
  transition: { duration: 0.15, ease: [0.2, 0, 0, 1] }
};

const pageIcons: Record<string, React.ElementType> = {
  dashboard: LayoutDashboard,
  crm: Users,
  clients: Users,
  omnichannel: MessageSquare,
  automation: Zap,
  tasks: CheckSquare,
  finance: DollarSign,
  analytics: BarChart3,
  ai: Brain,
  agenda: Calendar,
  settings: Settings,
};

const pageLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  crm: 'CRM & Leads',
  clients: 'Clientes',
  omnichannel: 'Omnichannel',
  automation: 'Automação',
  tasks: 'Tarefas',
  finance: 'Financeiro',
  analytics: 'Analytics',
  ai: 'IA & Insights',
  agenda: 'Agenda',
  settings: 'Configurações',
};

// Mock notifications
interface Notification {
  id: string;
  type: 'lead' | 'message' | 'task' | 'deal' | 'system' | 'automation';
  title: string;
  description: string;
  time: string;
  read: boolean;
  page?: AppPage;
  avatar?: string;
  initials?: string;
}

const initialNotifications: Notification[] = [
  { id: 'n1', type: 'lead', title: 'Novo lead capturado', description: 'Maria Costa entrou via Google Ads', time: '2 min', read: false, page: 'crm', initials: 'MC' },
  { id: 'n2', type: 'message', title: 'Nova mensagem WhatsApp', description: 'João Silva: "Gostaria de saber mais..."', time: '5 min', read: false, page: 'omnichannel', initials: 'JS' },
  { id: 'n3', type: 'task', title: 'Tarefa vencendo hoje', description: 'Follow-up com Tech Solutions', time: '15 min', read: false, page: 'tasks', initials: 'TS' },
  { id: 'n4', type: 'deal', title: 'Deal atualizado', description: 'Proposta de R$45.000 aceita', time: '1h', read: false, page: 'finance', initials: 'DA' },
  { id: 'n5', type: 'automation', title: 'Automação executada', description: 'Fluxo "Boas-vindas" processou 12 leads', time: '2h', read: true, page: 'automation', initials: 'AE' },
  { id: 'n6', type: 'system', title: 'Backup concluído', description: 'Backup automático realizado com sucesso', time: '3h', read: true, page: 'settings', initials: 'SY' },
];

const notificationColors: Record<string, string> = {
  lead: 'bg-blue-500',
  message: 'bg-green-500',
  task: 'bg-amber-500',
  deal: 'bg-emerald-500',
  system: 'bg-gray-500',
  automation: 'bg-violet-500',
};

const notificationIcons: Record<string, React.ElementType> = {
  lead: Users,
  message: MessageSquare,
  task: CheckSquare,
  deal: DollarSign,
  system: Settings,
  automation: Zap,
};

// Page insight suggestions for AI Assistant
interface PageInsight {
  page: AppPage;
  label: string;
  icon: React.ElementType;
  color: string;
  description: string;
}

const pageInsights: PageInsight[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'from-blue-500 to-cyan-500', description: 'Visão geral de KPIs e métricas do sistema' },
  { page: 'crm', label: 'CRM & Leads', icon: Users, color: 'from-violet-500 to-purple-500', description: 'Pipeline de vendas e gestão de leads' },
  { page: 'clients', label: 'Clientes', icon: UserCheck, color: 'from-emerald-500 to-teal-500', description: 'Gestão de clientes e relacionamentos' },
  { page: 'omnichannel', label: 'Omnichannel', icon: MessageSquare, color: 'from-green-500 to-emerald-500', description: 'Conversas e atendimento multicanal' },
  { page: 'tasks', label: 'Tarefas', icon: CheckSquare, color: 'from-amber-500 to-orange-500', description: 'Produtividade e gestão de atividades' },
  { page: 'agenda', label: 'Agenda', icon: Calendar, color: 'from-pink-500 to-rose-500', description: 'Eventos e compromissos agendados' },
  { page: 'finance', label: 'Financeiro', icon: DollarSign, color: 'from-emerald-500 to-green-500', description: 'Receitas, despesas e metas' },
  { page: 'analytics', label: 'Analytics', icon: BarChart3, color: 'from-indigo-500 to-blue-500', description: 'Relatórios e análises detalhadas' },
];

interface LayoutProps {
  children: ReactNode;
}

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function Layout({ children }: LayoutProps) {
  const { currentPage, setCurrentPage, leads, conversations, tasks, aiAssistantVisible, branding } = useStore();
  
  // Apply branding CSS variables on mount and when branding changes
  useEffect(() => {
    if (branding.primaryColor) {
      document.documentElement.style.setProperty('--brand-color', branding.primaryColor);
      const hex = branding.primaryColor.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      document.documentElement.style.setProperty('--brand-rgb', `${r}, ${g}, ${b}`);
    }
  }, [branding.primaryColor]);
  
  // Mobile state
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // All dropdown states
  const [spotlightOpen, setSpotlightOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  
  // Other states
  const [spotlightQuery, setSpotlightQuery] = useState('');
  const [spotlightIndex, setSpotlightIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread'>('all');
  const [notifSoundEnabled, setNotifSoundEnabled] = useState(true);
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'offline'>('online');
  
  // AI Chat states
  const [aiMessages, setAiMessages] = useState<AIMessage[]>([
    { id: 'welcome', role: 'assistant', content: '👋 Olá! Sou o **NexAI**, seu assistente inteligente. Como posso ajudar você hoje?\n\nVocê pode me perguntar sobre:\n• Insights de qualquer página\n• Status do pipeline de vendas\n• Métricas financeiras\n• E muito mais!', timestamp: new Date() }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiTyping, setAiTyping] = useState(false);
  
  // Refs
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const aiChatRef = useRef<HTMLDivElement>(null);

  // CRITICAL: Close all dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      
      // Close notifications
      if (notificationsOpen && notifRef.current && !notifRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      
      // Close user menu
      if (userMenuOpen && userRef.current && !userRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    // Add listener immediately
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, [notificationsOpen, userMenuOpen]);

  // CRITICAL: Close all overlays when page changes
  useEffect(() => {
    setSpotlightOpen(false);
    setNotificationsOpen(false);
    setUserMenuOpen(false);
    setMobileOpen(false);
    // Don't close AI chat on page change - user might want it open
  }, [currentPage]);

  // Keyboard shortcuts - with cleanup
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K for spotlight
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSpotlightOpen(prev => !prev);
        if (!spotlightOpen) {
          setSpotlightQuery('');
          setSpotlightIndex(0);
        }
      }
      // Escape closes everything
      if (e.key === 'Escape') {
        setSpotlightOpen(false);
        setNotificationsOpen(false);
        setUserMenuOpen(false);
        setAiChatOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [spotlightOpen]);

  // Spotlight search results
  const getSpotlightResults = useCallback(() => {
    const q = spotlightQuery.toLowerCase().trim();
    const results: Array<{
      id: string;
      type: 'action' | 'page' | 'lead' | 'conversation' | 'task';
      label: string;
      sublabel?: string;
      icon: React.ElementType;
      page: AppPage;
      color: string;
    }> = [];

    if (!q) {
      // Show quick actions when no query
      const quickActions = [
        { id: 'qa_crm', type: 'action' as const, label: 'Novo Lead', sublabel: 'Criar lead no CRM', icon: Users, page: 'crm' as AppPage, color: 'text-blue-500' },
        { id: 'qa_task', type: 'action' as const, label: 'Nova Tarefa', sublabel: 'Criar tarefa', icon: CheckSquare, page: 'tasks' as AppPage, color: 'text-amber-500' },
        { id: 'qa_event', type: 'action' as const, label: 'Novo Evento', sublabel: 'Criar evento na agenda', icon: Calendar, page: 'agenda' as AppPage, color: 'text-pink-500' },
        { id: 'qa_conv', type: 'action' as const, label: 'Nova Conversa', sublabel: 'Iniciar atendimento', icon: MessageSquare, page: 'omnichannel' as AppPage, color: 'text-green-500' },
      ];
      return quickActions;
    }

    // Search pages
    Object.entries(pageLabels).forEach(([key, label]) => {
      if (label.toLowerCase().includes(q) || key.includes(q)) {
        results.push({
          id: `page_${key}`,
          type: 'page',
          label,
          sublabel: 'Navegar para página',
          icon: pageIcons[key] || LayoutDashboard,
          page: key as AppPage,
          color: 'text-brand-500',
        });
      }
    });

    // Search leads
    leads.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.email.toLowerCase().includes(q) ||
      l.company?.toLowerCase().includes(q)
    ).slice(0, 5).forEach(l => {
      results.push({
        id: `lead_${l._id}`,
        type: 'lead',
        label: l.name,
        sublabel: `${l.email} · ${l.company || 'Sem empresa'} · Score: ${l.score}`,
        icon: Users,
        page: 'crm',
        color: 'text-blue-500',
      });
    });

    // Search conversations
    conversations.filter(c =>
      c.contactName.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q)
    ).slice(0, 5).forEach(c => {
      results.push({
        id: `conv_${c._id}`,
        type: 'conversation',
        label: c.contactName,
        sublabel: `${c.channel} · ${c.lastMessage.slice(0, 50)}...`,
        icon: MessageSquare,
        page: 'omnichannel',
        color: 'text-green-500',
      });
    });

    // Search tasks
    tasks.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q)
    ).slice(0, 5).forEach(t => {
      results.push({
        id: `task_${t._id}`,
        type: 'task',
        label: t.title,
        sublabel: `${t.status === 'todo' ? 'A fazer' : t.status === 'in_progress' ? 'Em andamento' : 'Concluída'} · ${t.assignedName}`,
        icon: CheckSquare,
        page: 'tasks',
        color: 'text-amber-500',
      });
    });

    return results;
  }, [spotlightQuery, leads, conversations, tasks]);

  const spotlightResults = getSpotlightResults();

  // Navigate from spotlight result - with proper cleanup
  const handleSpotlightSelect = useCallback((result: { page: AppPage }) => {
    // Close spotlight first, then navigate after a small delay to prevent animation issues
    setSpotlightOpen(false);
    setSpotlightQuery('');
    setSearchQuery('');
    setSpotlightIndex(0);
    
    // Use setTimeout to ensure state is cleared before navigation
    setTimeout(() => {
      setCurrentPage(result.page);
    }, 50);
  }, [setCurrentPage]);

  // Spotlight keyboard navigation
  const handleSpotlightKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSpotlightIndex(i => Math.min(i + 1, spotlightResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSpotlightIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && spotlightResults[spotlightIndex]) {
      handleSpotlightSelect(spotlightResults[spotlightIndex]);
    }
  };

  // Notifications helpers
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  const handleNotifClick = (n: Notification) => {
    markAsRead(n.id);
    if (n.page) {
      setCurrentPage(n.page);
    }
    setNotificationsOpen(false);
  };

  const filteredNotifications = notifFilter === 'all' ? notifications : notifications.filter(n => !n.read);

  // Generate page-specific insights
  const generatePageInsight = useCallback((page: AppPage): string => {
    const now = new Date();
    const today = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    
    switch (page) {
      case 'dashboard':
        const totalLeads = leads.length;
        const activeLeads = leads.filter(l => l.status === 'new' || l.status === 'contacted' || l.status === 'qualified').length;
        const wonLeads = leads.filter(l => l.status === 'won').length;
        const totalValue = leads.reduce((acc, l) => acc + (l.value || 0), 0);
        const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';
        return `📊 **Insight do Dashboard** (${today})\n\n` +
          `**Resumo Geral:**\n` +
          `• Total de leads no sistema: **${totalLeads}**\n` +
          `• Leads ativos (em negociação): **${activeLeads}**\n` +
          `• Leads convertidos (ganhos): **${wonLeads}**\n` +
          `• Valor total do pipeline: **R$ ${totalValue.toLocaleString('pt-BR')}**\n` +
          `• Taxa de conversão geral: **${conversionRate}%**\n\n` +
          `**Conversas ativas:** ${conversations.filter(c => c.status === 'open').length} conversas aguardando resposta\n` +
          `**Tarefas pendentes:** ${tasks.filter(t => t.status !== 'done').length} tarefas a concluir\n\n` +
          `💡 **Recomendação:** Foque nos ${activeLeads} leads ativos para aumentar a taxa de conversão.`;

      case 'crm':
        const hotLeads = leads.filter(l => l.score >= 80).length;
        const coldLeads = leads.filter(l => l.score < 40).length;
        const avgScore = leads.length > 0 ? Math.round(leads.reduce((acc, l) => acc + l.score, 0) / leads.length) : 0;
        return `🎯 **Insight do CRM** (${today})\n\n` +
          `**Pipeline de Vendas:**\n` +
          `• Total de leads: **${leads.length}**\n` +
          `• Leads quentes (score ≥80): **${hotLeads}** 🔥\n` +
          `• Leads frios (score <40): **${coldLeads}** ❄️\n` +
          `• Score médio: **${avgScore}%**\n\n` +
          `💡 **Recomendação:** Priorize os ${hotLeads} leads quentes para conversão rápida.`;

      case 'tasks':
        const todoTasks = tasks.filter(t => t.status === 'todo').length;
        const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
        const doneTasks = tasks.filter(t => t.status === 'done').length;
        return `✅ **Insight de Tarefas** (${today})\n\n` +
          `**Status das Tarefas:**\n` +
          `• A fazer: **${todoTasks}**\n` +
          `• Em andamento: **${inProgressTasks}**\n` +
          `• Concluídas: **${doneTasks}**\n\n` +
          `💡 **Recomendação:** Foque nas ${inProgressTasks} tarefas em andamento.`;

      default:
        return `📋 **Insight de ${pageLabels[page] || page}**\n\nDados ainda sendo processados...`;
    }
  }, [leads, conversations, tasks]);

  // Handle AI message send
  const handleAiSend = useCallback((message?: string) => {
    const msgToSend = message || aiInput.trim();
    if (!msgToSend) return;
    
    // Add user message
    const userMsg: AIMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: msgToSend,
      timestamp: new Date()
    };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setAiTyping(true);
    
    // Simulate AI response
    setTimeout(() => {
      let response = '';
      
      const lowerMsg = msgToSend.toLowerCase();
      const insightPage = pageInsights.find(p => 
        lowerMsg.includes(p.label.toLowerCase()) || 
        lowerMsg.includes(p.page.toLowerCase())
      );
      
      if (insightPage) {
        response = generatePageInsight(insightPage.page);
      } else if (lowerMsg.includes('ajuda') || lowerMsg.includes('help')) {
        response = `🤖 **Como posso ajudar?**\n\n` +
          `Você pode me pedir insights sobre qualquer página:\n\n` +
          pageInsights.map(p => `• **"${p.label}"** - ${p.description}`).join('\n');
      } else if (lowerMsg.includes('lead') || lowerMsg.includes('pipeline')) {
        response = generatePageInsight('crm');
      } else if (lowerMsg.includes('tarefa') || lowerMsg.includes('task')) {
        response = generatePageInsight('tasks');
      } else {
        response = `Entendi sua pergunta! 🤔\n\n` +
          `Para obter insights detalhados, experimente perguntar sobre:\n\n` +
          `• **"Insight do Dashboard"** - Visão geral\n` +
          `• **"Insight de Leads"** - Status do pipeline\n` +
          `• **"Insight de Tarefas"** - Produtividade\n\n` +
          `Ou digite **"ajuda"** para ver todas as opções.`;
      }
      
      const aiMsg: AIMessage = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setAiMessages(prev => [...prev, aiMsg]);
      setAiTyping(false);
      
      setTimeout(() => {
        aiChatRef.current?.scrollTo({ top: aiChatRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    }, 1000 + Math.random() * 500);
  }, [aiInput, generatePageInsight]);

  const handleSuggestionClick = useCallback((page: AppPage) => {
    const insight = pageInsights.find(p => p.page === page);
    if (insight) {
      handleAiSend(`Insight completo da página ${insight.label}`);
    }
  }, [handleAiSend]);

  const PageIcon = pageIcons[currentPage] || LayoutDashboard;

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Bar */}
        <header className="flex h-[60px] lg:h-[68px] shrink-0 items-center justify-between border-b border-gray-200/60 bg-white/80 backdrop-blur-xl px-3 sm:px-4 lg:px-6 z-20 gap-2 sm:gap-4">
          {/* Left: hamburger + search */}
          <div className="flex flex-1 items-center gap-2 sm:gap-4 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden flex items-center justify-center rounded-xl p-2 text-gray-500 hover:bg-gray-100 transition-colors shrink-0"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Page title on mobile */}
            <div className="flex items-center gap-2 lg:hidden min-w-0">
              <PageIcon className="h-4 w-4 text-brand-600 shrink-0" />
              <span className="text-sm font-semibold text-gray-800 truncate">
                {pageLabels[currentPage] || 'Dashboard'}
              </span>
            </div>

            {/* Search bar triggers spotlight - hidden on mobile */}
            <div className="relative max-w-lg flex-1 group hidden sm:block">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-brand-500" />
              <input
                type="text"
                placeholder="Buscar leads, conversas, tarefas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => { setSpotlightOpen(true); setSpotlightQuery(searchQuery); }}
                className="input-modern w-full rounded-xl bg-gray-50/80 py-2.5 pl-10 pr-20 text-sm text-gray-700 placeholder-gray-400"
              />
              <button
                onClick={() => { setSpotlightOpen(true); setSpotlightQuery(''); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-lg bg-gray-200/60 px-2 py-0.5 hover:bg-gray-300/60 transition-colors"
              >
                <Command className="h-3 w-3 text-gray-400" />
                <span className="text-[10px] font-medium text-gray-400">K</span>
              </button>
            </div>

            {/* Mobile search icon */}
            <button
              onClick={() => { setSpotlightOpen(true); setSpotlightQuery(''); }}
              className="sm:hidden flex items-center justify-center rounded-xl p-2 text-gray-500 hover:bg-gray-100 transition-colors shrink-0 ml-auto"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* AI button - hidden on small screens */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCurrentPage('ai')}
              className="hidden md:flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-50 to-violet-50 border border-brand-200/50 px-3.5 py-2 text-xs font-medium text-brand-700 transition-all hover:shadow-md hover:shadow-brand-100"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Assistente IA</span>
            </motion.button>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { 
                  setNotificationsOpen(!notificationsOpen); 
                  setUserMenuOpen(false); 
                }}
                className={cn(
                  'relative rounded-xl p-2 sm:p-2.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600',
                  notificationsOpen && 'bg-gray-100 text-gray-600'
                )}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white badge-glow">
                    {unreadCount}
                  </span>
                )}
              </motion.button>

               {/* Notifications dropdown - simplified */}
                {notificationsOpen && (
                  <>
                    {/* Invisible backdrop to close dropdown */}
                    <div 
                      className="fixed inset-0 z-[9998]" 
                      onClick={() => setNotificationsOpen(false)}
                      aria-hidden="true"
                    />
                    <div
                      style={{
                        position: 'fixed',
                        top: '60px',
                        right: '8px',
                        left: 'auto',
                        width: 'min(400px, calc(100vw - 16px))',
                        maxHeight: 'calc(100vh - 80px)',
                        zIndex: 9999,
                      }}
                      className="rounded-2xl bg-white border border-gray-200/80 shadow-2xl overflow-hidden animate-fade-in"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-gray-800">Notificações</h3>
                          {unreadCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 text-[10px] font-bold text-red-600">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setNotifSoundEnabled(!notifSoundEnabled)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          >
                            {notifSoundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                          </button>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllRead}
                              className="rounded-lg px-2 py-1 text-[11px] font-medium text-brand-600 hover:bg-brand-50 transition-colors"
                            >
                              <CheckCheck className="h-3.5 w-3.5 inline mr-1" />
                              Marcar todas
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Filter tabs */}
                      <div className="flex gap-1 px-4 py-2 border-b border-gray-50">
                        {(['all', 'unread'] as const).map(f => (
                          <button
                            key={f}
                            onClick={() => setNotifFilter(f)}
                            className={cn(
                              'rounded-lg px-3 py-1 text-[11px] font-medium transition-colors',
                              notifFilter === f
                                ? 'bg-brand-50 text-brand-700'
                                : 'text-gray-500 hover:bg-gray-50'
                            )}
                          >
                            {f === 'all' ? 'Todas' : `Não lidas (${unreadCount})`}
                          </button>
                        ))}
                      </div>

                      {/* Notification list */}
                      <div className="max-h-[400px] overflow-y-auto">
                        {filteredNotifications.length === 0 ? (
                          <div className="py-12 text-center">
                            <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-400">Nenhuma notificação</p>
                          </div>
                        ) : (
                          filteredNotifications.map((n) => {
                            const NIcon = notificationIcons[n.type] || Bell;
                            return (
                              <div
                                key={n.id}
                                className={cn(
                                  'group flex items-start gap-3 px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50/80',
                                  !n.read && 'bg-brand-50/30'
                                )}
                                onClick={() => handleNotifClick(n)}
                              >
                                <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white', notificationColors[n.type])}>
                                  <NIcon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={cn('text-[13px] truncate', !n.read ? 'font-semibold text-gray-800' : 'font-medium text-gray-600')}>
                                      {n.title}
                                    </p>
                                    {!n.read && <div className="h-2 w-2 rounded-full bg-brand-500 shrink-0" />}
                                  </div>
                                  <p className="text-[11px] text-gray-500 truncate mt-0.5">{n.description}</p>
                                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> {n.time} atrás
                                  </p>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                  {!n.read && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); markAsRead(n.id); }}
                                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-gray-100 px-4 py-2.5">
                        <button
                          onClick={() => { setCurrentPage('settings'); setNotificationsOpen(false); }}
                          className="w-full text-center text-[12px] font-medium text-brand-600 hover:text-brand-700 transition-colors py-1"
                        >
                          Ver todas as notificações
                        </button>
                      </div>
                    </div>
                  </>
                )}
            </div>

            <div className="h-8 w-px bg-gray-200/60 mx-0.5 sm:mx-1 hidden sm:block" />

            {/* User Menu */}
            <div ref={userRef} className="relative">
              <motion.button
                whileHover={{ scale: 1.01 }}
                onClick={() => { setUserMenuOpen(!userMenuOpen); setNotificationsOpen(false); }}
                className={cn(
                  'flex items-center gap-2 sm:gap-3 rounded-xl px-1.5 sm:px-2 py-1.5 transition-colors hover:bg-gray-50',
                  userMenuOpen && 'bg-gray-50'
                )}
              >
                <div className="relative">
                  <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                    AD
                  </div>
                  <div className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white',
                    userStatus === 'online' && 'bg-emerald-500',
                    userStatus === 'away' && 'bg-amber-500',
                    userStatus === 'offline' && 'bg-gray-400'
                  )} />
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-[13px] font-semibold text-gray-800 leading-tight">Admin</p>
                  <p className={cn(
                    'text-[10px] leading-tight',
                    userStatus === 'online' && 'text-emerald-600',
                    userStatus === 'away' && 'text-amber-600',
                    userStatus === 'offline' && 'text-gray-400'
                  )}>
                    {userStatus === 'online' ? '🟢 Online' : userStatus === 'away' ? '🟡 Ausente' : '⚫ Offline'}
                  </p>
                </div>
                <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform hidden sm:block', userMenuOpen && 'rotate-180')} />
              </motion.button>

              {/* User dropdown - simplified */}
                {userMenuOpen && (
                  <>
                    {/* Invisible backdrop */}
                    <div 
                      className="fixed inset-0 z-[9998]" 
                      onClick={() => setUserMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div
                      style={{
                        position: 'fixed',
                        top: '60px',
                        right: '8px',
                        left: 'auto',
                        width: 'min(280px, calc(100vw - 16px))',
                        maxHeight: 'calc(100vh - 80px)',
                        zIndex: 9999,
                      }}
                      className="rounded-2xl bg-white border border-gray-200/80 shadow-2xl overflow-hidden animate-fade-in"
                    >
                      {/* User info header */}
                      <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-br from-brand-50/50 to-violet-50/50">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white font-bold text-lg">
                            AD
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">Admin</p>
                            <p className="text-xs text-gray-500">admin@nexcrm.com</p>
                            <p className={cn(
                              'text-[10px] mt-0.5',
                              userStatus === 'online' && 'text-emerald-600',
                              userStatus === 'away' && 'text-amber-600',
                              userStatus === 'offline' && 'text-gray-400'
                            )}>
                              {userStatus === 'online' ? '🟢 Online' : userStatus === 'away' ? '🟡 Ausente' : '⚫ Offline'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Status options */}
                      <div className="p-2 border-b border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">Status</p>
                        {(['online', 'away', 'offline'] as const).map(status => (
                          <button
                            key={status}
                            onClick={() => { setUserStatus(status); }}
                            className={cn(
                              'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
                              userStatus === status ? 'bg-brand-50 text-brand-700' : 'text-gray-600 hover:bg-gray-50'
                            )}
                          >
                            <div className={cn(
                              'h-2 w-2 rounded-full',
                              status === 'online' && 'bg-emerald-500',
                              status === 'away' && 'bg-amber-500',
                              status === 'offline' && 'bg-gray-400'
                            )} />
                            {status === 'online' ? 'Online' : status === 'away' ? 'Ausente' : 'Offline'}
                          </button>
                        ))}
                      </div>

                      {/* Menu items */}
                      <div className="p-2">
                        <button
                          onClick={() => { setCurrentPage('settings'); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <User className="h-4 w-4 text-gray-400" />
                          Meu Perfil
                        </button>
                        <button
                          onClick={() => { setCurrentPage('settings'); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Settings className="h-4 w-4 text-gray-400" />
                          Configurações
                        </button>
                        <button
                          onClick={() => { setCurrentPage('finance'); setUserMenuOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                          Faturamento
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="p-2 border-t border-gray-100">
                        <button
                          onClick={() => { 
                            setUserMenuOpen(false);
                            // Navigate to login
                            useStore.getState().logout();
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          Sair
                        </button>
                      </div>
                    </div>
                  </>
                )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <motion.div
            key={currentPage}
            {...pageTransition}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Spotlight Search - simplified without AnimatePresence to prevent white screen */}
      {spotlightOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] animate-fade-in"
            onClick={() => {
              setSpotlightOpen(false);
              setSpotlightQuery('');
              setSpotlightIndex(0);
            }}
          />
          {/* Modal */}
          <div
            ref={spotlightRef}
            className="fixed left-1/2 top-[15%] -translate-x-1/2 w-[92%] max-w-[600px] z-[101] animate-scale-in"
            onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                  <Search className="h-5 w-5 text-gray-400 shrink-0" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Buscar ou digitar comando..."
                    value={spotlightQuery}
                    onChange={(e) => { setSpotlightQuery(e.target.value); setSpotlightIndex(0); }}
                    onKeyDown={handleSpotlightKeyDown}
                    className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
                  />
                  <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded bg-gray-100 px-1.5 text-[10px] font-medium text-gray-400">
                    ESC
                  </kbd>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto p-2">
                  {spotlightResults.length === 0 ? (
                    <div className="py-8 text-center">
                      <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Nenhum resultado encontrado</p>
                    </div>
                  ) : (
                    spotlightResults.map((result, i) => (
                      <button
                        key={result.id}
                        onClick={() => handleSpotlightSelect(result)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors',
                          spotlightIndex === i ? 'bg-brand-50 text-brand-700' : 'hover:bg-gray-50 text-gray-700'
                        )}
                      >
                        <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', spotlightIndex === i ? 'bg-brand-100' : 'bg-gray-100')}>
                          <result.icon className={cn('h-4 w-4', result.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.label}</p>
                          {result.sublabel && <p className="text-xs text-gray-500 truncate">{result.sublabel}</p>}
                        </div>
                        <span className="text-[10px] text-gray-400 uppercase shrink-0">{result.type}</span>
                      </button>
                    ))
                  )}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                  <div className="flex items-center gap-3">
                    <span><kbd className="px-1 py-0.5 rounded bg-gray-100">↑↓</kbd> navegar</span>
                    <span><kbd className="px-1 py-0.5 rounded bg-gray-100">↵</kbd> selecionar</span>
                  </div>
                  <span><kbd className="px-1 py-0.5 rounded bg-gray-100">esc</kbd> fechar</span>
                </div>
              </div>
            </div>
        </>
      )}

      {/* AI Chat - only if visible - simplified without AnimatePresence */}
      {aiAssistantVisible && aiChatOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] animate-fade-in"
            onClick={() => setAiChatOpen(false)}
          />
          <div
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-32px)] sm:w-[440px] h-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden z-[101] flex flex-col animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-600 to-violet-600 text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">NexAI</h3>
                    <p className="text-[10px] text-white/70">Assistente Inteligente</p>
                  </div>
                </div>
                <button
                  onClick={() => setAiChatOpen(false)}
                  className="rounded-lg p-1.5 hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Messages */}
              <div ref={aiChatRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {aiMessages.map(msg => (
                  <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-brand-500 to-violet-500 text-white rounded-br-md'
                        : 'bg-gray-100 text-gray-700 rounded-bl-md'
                    )}>
                      <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={{
                        __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      }} />
                      <p className={cn(
                        'text-[9px] mt-1',
                        msg.role === 'user' ? 'text-white/60' : 'text-gray-400'
                      )}>
                        {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                
                {aiTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick suggestions when no messages */}
                {aiMessages.length === 1 && (
                  <div className="space-y-3 mt-4">
                    <p className="text-xs text-gray-500 font-medium">💡 Sugestões rápidas:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {pageInsights.slice(0, 4).map(insight => (
                        <button
                          key={insight.page}
                          onClick={() => handleSuggestionClick(insight.page)}
                          className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        >
                          <div className={cn('h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shrink-0', insight.color)}>
                            <insight.icon className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-medium text-gray-700 truncate">{insight.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-gray-100 shrink-0">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAiSend()}
                    placeholder="Digite sua pergunta..."
                    className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500/20"
                    disabled={aiTyping}
                  />
                  <button
                    onClick={() => handleAiSend()}
                    disabled={!aiInput.trim() || aiTyping}
                    className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
        </>
      )}

      {/* Floating AI Button - only if visible */}
      {aiAssistantVisible && !aiChatOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setAiChatOpen(true)}
          className="fixed bottom-6 right-6 z-[90] flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-lg shadow-brand-500/30 transition-all hover:shadow-xl hover:shadow-brand-500/40"
        >
          <Brain className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center">
            <Sparkles className="h-2 w-2 text-amber-900" />
          </span>
        </motion.button>
      )}
    </div>
  );
}
