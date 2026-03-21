import { useStore } from '../store';
import type { AppPage } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, MessageSquare, Zap, CheckSquare, DollarSign,
  BarChart3, Settings, LogOut, Hexagon, Brain, CalendarDays, X, UserCircle,
  EyeOff, Eye
} from 'lucide-react';
import { cn } from '../utils/cn';

const baseNavItems: { page: AppPage; label: string; icon: React.ElementType; badge?: number }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'crm', label: 'CRM & Leads', icon: Users },
  { page: 'clients', label: 'Clientes', icon: UserCircle },
  { page: 'omnichannel', label: 'Omnichannel', icon: MessageSquare },
  { page: 'automation', label: 'Automação', icon: Zap },
  { page: 'tasks', label: 'Tarefas', icon: CheckSquare, badge: 3 },
  { page: 'finance', label: 'Financeiro', icon: DollarSign },
  { page: 'analytics', label: 'Analytics', icon: BarChart3 },
  { page: 'ai', label: 'IA & Insights', icon: Brain },
  { page: 'agenda', label: 'Agenda', icon: CalendarDays },
  { page: 'settings', label: 'Configurações', icon: Settings },
];

interface SidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ mobileOpen, onMobileClose }: SidebarProps) {
  const { currentPage, setCurrentPage, sidebarCollapsed, currentUser, logout, aiAssistantVisible, toggleAiAssistant, branding, conversations, tasks } = useStore();

  const unreadConversationsCount = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const pendingTasksCount = tasks.filter(t => t.status !== 'done').length;

  const navItems = baseNavItems.map(item => {
    if (item.page === 'omnichannel') return { ...item, badge: unreadConversationsCount > 0 ? unreadConversationsCount : undefined };
    if (item.page === 'tasks') return { ...item, badge: pendingTasksCount > 0 ? pendingTasksCount : undefined };
    return item;
  });

  const handleNav = (page: AppPage) => {
    setCurrentPage(page);
    onMobileClose();
  };

  const handleLogout = () => {
    logout();
    onMobileClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onMobileClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          // Base mobile styles
          'fixed inset-y-0 left-0 z-[70] w-[280px] bg-gradient-to-b from-[#0c0f1a] to-[#111827] text-white',
          'flex flex-col overflow-hidden transition-transform duration-300 ease-out',
          // Mobile: hidden by default, slide in when open
          'lg:relative lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: respect collapsed state
          !mobileOpen && sidebarCollapsed && 'lg:w-[72px]'
        )}
      >
        {/* Decorative blurs */}
        <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-brand-600/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-10 w-40 h-40 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex h-[60px] lg:h-[68px] items-center justify-between border-b border-white/[0.06] px-4 lg:px-5 relative z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="flex h-9 w-9 lg:h-10 lg:w-10 shrink-0 items-center justify-center rounded-xl shadow-lg transition-all duration-300"
              style={{ 
                backgroundColor: branding.primaryColor,
                boxShadow: `0 10px 25px -5px ${branding.primaryColor}40`
              }}
            >
              {branding.logo ? (
                <img src={branding.logo} alt="Logo" className="h-6 w-6 lg:h-7 lg:w-7 object-contain rounded" />
              ) : (
                <Hexagon className="h-4 w-4 lg:h-5 lg:w-5 text-white" strokeWidth={2.5} />
              )}
            </div>
            {(!sidebarCollapsed || mobileOpen) && (
              <div className="overflow-hidden">
                <h1 className="text-base lg:text-lg font-bold tracking-tight bg-gradient-to-r from-white to-brand-200 bg-clip-text text-transparent">
                  {branding.companyName}
                </h1>
                <p className="text-[8px] lg:text-[9px] uppercase tracking-[0.2em] text-slate-500 font-medium">
                  Plataforma SaaS
                </p>
              </div>
            )}
          </div>
          
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-xl text-slate-400 hover:bg-white/10 hover:text-white transition-colors active:scale-95"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 relative z-10">
          {(!sidebarCollapsed || mobileOpen) && (
            <p className="px-3 mb-3 text-[9px] uppercase tracking-[0.2em] text-slate-600 font-semibold">
              Menu Principal
            </p>
          )}
          
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.page;
              const showLabels = !sidebarCollapsed || mobileOpen;
              
              return (
                <button
                  key={item.page}
                  onClick={() => handleNav(item.page)}
                  className={cn(
                    'group relative flex w-full items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition-all duration-200 active:scale-[0.98]',
                    isActive
                      ? 'text-white bg-gradient-to-r from-brand-600 to-brand-500 shadow-lg shadow-brand-600/20'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <Icon className={cn(
                    'h-5 w-5 shrink-0 transition-colors',
                    isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                  )} />
                  
                  {showLabels && (
                    <span className="flex-1 truncate text-left">{item.label}</span>
                  )}
                  
                  {showLabels && item.badge && (
                    <span className={cn(
                      'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold',
                      isActive ? 'bg-white/20 text-white' : 'bg-brand-600 text-white'
                    )}>
                      {item.badge}
                    </span>
                  )}
                  
                  {!showLabels && item.badge && (
                    <span className="absolute -right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* AI Assistant Toggle */}
        <div className="border-t border-white/[0.06] px-3 pt-3 relative z-10">
          {(!sidebarCollapsed || mobileOpen) && (
            <button
              onClick={toggleAiAssistant}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                aiAssistantVisible 
                  ? "bg-gradient-to-r from-brand-500/20 to-violet-500/20 border border-brand-500/30 hover:border-brand-500/50" 
                  : "bg-white/5 border border-white/10 hover:bg-white/10"
              )}
            >
              <div className={cn(
                "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                aiAssistantVisible 
                  ? "bg-gradient-to-br from-brand-500 to-violet-500 shadow-lg shadow-brand-500/30" 
                  : "bg-slate-700"
              )}>
                <Brain className={cn(
                  "h-4 w-4 transition-colors",
                  aiAssistantVisible ? "text-white" : "text-slate-400"
                )} />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className={cn(
                  "text-xs font-medium truncate",
                  aiAssistantVisible ? "text-white" : "text-slate-400"
                )}>
                  Assistente IA
                </p>
                <p className="text-[10px] text-slate-500">
                  {aiAssistantVisible ? 'Ativo' : 'Desativado'}
                </p>
              </div>
              <div className={cn(
                "h-6 w-10 rounded-full flex items-center px-0.5 transition-all duration-300 shrink-0",
                aiAssistantVisible ? "bg-brand-500 justify-end" : "bg-slate-700 justify-start"
              )}>
                <div className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center transition-all duration-300 shadow",
                  aiAssistantVisible ? "bg-white" : "bg-slate-500"
                )}>
                  {aiAssistantVisible ? (
                    <Eye className="h-3 w-3 text-brand-600" />
                  ) : (
                    <EyeOff className="h-3 w-3 text-slate-300" />
                  )}
                </div>
              </div>
            </button>
          )}
          
          {/* Collapsed state */}
          {sidebarCollapsed && !mobileOpen && (
            <button
              onClick={toggleAiAssistant}
              className={cn(
                "w-full flex items-center justify-center p-2 rounded-lg transition-colors",
                aiAssistantVisible 
                  ? "bg-brand-500/20 text-brand-400 hover:bg-brand-500/30" 
                  : "text-slate-500 hover:text-white hover:bg-white/10"
              )}
              title={aiAssistantVisible ? "Desativar Assistente IA" : "Ativar Assistente IA"}
            >
              <Brain className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* User section */}
        <div className="border-t border-white/[0.06] p-3 relative z-10 shrink-0">
          {(!sidebarCollapsed || mobileOpen) ? (
            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {currentUser?.name || 'Usuário'}
                </p>
                <p className="text-[11px] text-slate-500 truncate">
                  {currentUser?.email || 'usuario@email.com'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
              title="Sair"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
