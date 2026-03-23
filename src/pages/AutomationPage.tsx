import { logger } from '../utils/logger';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../store';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { automationService } from '../api/services/automationService';
import type { AutomationFlow, AutomationAction, AutomationTrigger, AutomationCondition, TriggerType, ActionType } from '../types';
import { 
  Zap, Play, MoreHorizontal, Plus, TrendingUp, Clock, Settings, Activity,
  Edit3, Copy, Trash2, X, AlertTriangle, CheckCircle, XCircle, Loader2, History,
  MessageSquare, Mail, Tag, User, GitBranch, Webhook, Timer, Bell, Filter, Search,
  GripVertical, ArrowDown, PlayCircle, Download, Sparkles, ZoomIn, ZoomOut, RotateCcw,
  MessageCircle, Target, FileText, Calendar, Layers, Move, Save, Eye, ChevronLeft,
  Circle, Square
} from 'lucide-react';

const triggerTypes: { type: TriggerType; label: string; icon: typeof Zap; color: string }[] = [
  { type: 'new_lead', label: 'Novo Lead', icon: Target, color: 'bg-green-100 text-green-700 border-green-200' },
  { type: 'stage_change', label: 'Mudança de Etapa', icon: GitBranch, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  { type: 'field_update', label: 'Campo Atualizado', icon: Edit3, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { type: 'message_received', label: 'Mensagem Recebida', icon: MessageSquare, color: 'bg-pink-100 text-pink-700 border-pink-200' },
  { type: 'tag_added', label: 'Tag Adicionada', icon: Tag, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { type: 'score_change', label: 'Score Alterado', icon: TrendingUp, color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  { type: 'deal_created', label: 'Deal Criado', icon: FileText, color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { type: 'task_completed', label: 'Tarefa Concluída', icon: CheckCircle, color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { type: 'time_delay', label: 'Delay/Agendamento', icon: Timer, color: 'bg-orange-100 text-orange-700 border-orange-200' },
  { type: 'webhook', label: 'Webhook Recebido', icon: Webhook, color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const actionTypes: { type: ActionType; label: string; icon: typeof Zap; color: string }[] = [
  { type: 'send_whatsapp', label: 'Enviar WhatsApp', icon: MessageCircle, color: 'bg-green-100 text-green-700' },
  { type: 'send_email', label: 'Enviar Email', icon: Mail, color: 'bg-blue-100 text-blue-700' },
  { type: 'send_message', label: 'Enviar Mensagem', icon: MessageSquare, color: 'bg-purple-100 text-purple-700' },
  { type: 'create_task', label: 'Criar Tarefa', icon: Calendar, color: 'bg-amber-100 text-amber-700' },
  { type: 'update_field', label: 'Atualizar Campo', icon: Edit3, color: 'bg-cyan-100 text-cyan-700' },
  { type: 'move_stage', label: 'Mover Etapa', icon: GitBranch, color: 'bg-pink-100 text-pink-700' },
  { type: 'add_tag', label: 'Adicionar Tag', icon: Tag, color: 'bg-emerald-100 text-emerald-700' },
  { type: 'remove_tag', label: 'Remover Tag', icon: X, color: 'bg-red-100 text-red-700' },
  { type: 'assign_user', label: 'Atribuir Responsável', icon: User, color: 'bg-indigo-100 text-indigo-700' },
  { type: 'webhook', label: 'Webhook Externo', icon: Webhook, color: 'bg-slate-100 text-slate-700' },
  { type: 'delay', label: 'Aguardar (Delay)', icon: Timer, color: 'bg-orange-100 text-orange-700' },
  { type: 'condition', label: 'Condição (If/Else)', icon: GitBranch, color: 'bg-violet-100 text-violet-700' },
  { type: 'notification', label: 'Notificação', icon: Bell, color: 'bg-rose-100 text-rose-700' },
];

const automationTemplates = [
  { id: 't1', name: 'Boas-vindas Lead', description: 'Envia mensagem de boas-vindas para novos leads', trigger: 'new_lead', actions: 3, popular: true },
  { id: 't2', name: 'Follow-up Automático', description: 'Envia follow-up após X dias sem interação', trigger: 'time_delay', actions: 2, popular: true },
  { id: 't3', name: 'Notificação de Fechamento', description: 'Notifica equipe quando deal é fechado', trigger: 'stage_change', actions: 2, popular: false },
  { id: 't4', name: 'Score de Lead', description: 'Atualiza score baseado em interações', trigger: 'field_update', actions: 3, popular: true },
  { id: 't5', name: 'SLA de Atendimento', description: 'Alerta quando SLA é violado', trigger: 'message_received', actions: 3, popular: false },
  { id: 't6', name: 'Distribuição Round-Robin', description: 'Distribui leads entre vendedores', trigger: 'new_lead', actions: 2, popular: false },
];

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

function getTriggerInfo(type: TriggerType) {
  return triggerTypes.find(t => t.type === type) || triggerTypes[0];
}

function getActionInfo(type: ActionType) {
  return actionTypes.find(a => a.type === type) || actionTypes[0];
}

export function AutomationPage() {
  const { automations, automationExecutions, addAutomation, updateAutomation, deleteAutomation, addExecution } = useStore();

  // Load automations from backend on mount
  useEffect(() => {
    const loadAutomations = async () => {
      try {
        const response = await automationService.getAll();
        const serverAutomations = response.data || [];
        const currentAutomations = useStore.getState().automations;
        currentAutomations.forEach(a => deleteAutomation(a._id));
        serverAutomations.forEach(a => addAutomation(a));
      } catch (err) {
        logger.error('Erro ao carregar automações:', err);
      }
    };
    loadAutomations();
  }, []);
  
  const [selectedAuto, setSelectedAuto] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'builder'>('list');
  const [activeTab, setActiveTab] = useState<'details' | 'history' | 'settings'>('details');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState<AutomationFlow | null>(null);
  
  // Builder state
  const [builderZoom, setBuilderZoom] = useState(100);
  const [builderPan, setBuilderPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggedComponent, setDraggedComponent] = useState<{ type: string; category: 'trigger' | 'condition' | 'action' } | null>(null);
  const [isPreviewRunning, setIsPreviewRunning] = useState(false);
  const [previewStep, setPreviewStep] = useState(0);
  const [builderAutomation, setBuilderAutomation] = useState<AutomationFlow | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Toast state
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);
  
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTrigger, setFormTrigger] = useState<AutomationTrigger>({ type: 'new_lead', label: 'Novo Lead', config: {} });
  const [formActions, setFormActions] = useState<AutomationAction[]>([]);
  const [formConditions, setFormConditions] = useState<AutomationCondition[]>([]);
  
  // Quick actions menu
  const [quickActionsId, setQuickActionsId] = useState<string | null>(null);

  const selected = automations.find(a => a._id === selectedAuto);
  
  const filteredAutomations = useMemo(() => {
    return automations.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           a.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && a.active) || 
                           (statusFilter === 'inactive' && !a.active);
      return matchesSearch && matchesStatus;
    });
  }, [automations, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: automations.length,
    active: automations.filter(a => a.active).length,
    totalExecutions: automations.reduce((sum, a) => sum + a.executionCount, 0),
    successRate: automations.length > 0 
      ? Math.round((automations.reduce((sum, a) => sum + a.successCount, 0) / 
          Math.max(automations.reduce((sum, a) => sum + a.executionCount, 0), 1)) * 100)
      : 0,
  }), [automations]);

  const selectedExecutions = useMemo(() => {
    if (!selectedAuto) return [];
    return automationExecutions.filter(e => e.automationId === selectedAuto);
  }, [selectedAuto, automationExecutions]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormTrigger({ type: 'new_lead', label: 'Novo Lead', config: {} });
    setFormActions([]);
    setFormConditions([]);
  };

  const openCreateModal = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const openEditModal = (auto: AutomationFlow) => {
    setEditingAutomation(auto);
    setFormName(auto.name);
    setFormDescription(auto.description);
    setFormTrigger(auto.trigger);
    setFormActions(auto.actions);
    setFormConditions(auto.conditions);
    setShowEditModal(true);
  };

  const handleCreate = async () => {
    if (!formName.trim()) return;
    try {
      const created = await automationService.create({
        name: formName,
        description: formDescription,
        trigger: formTrigger,
        conditions: formConditions,
        actions: formActions,
        active: false,
      });
      addAutomation(created);
      setShowCreateModal(false);
      setSelectedAuto(created._id);
      resetForm();
    } catch (err) {
      logger.error('Erro ao criar automação:', err);
      showToast('Erro ao criar automação no servidor.', 'error');
    }
  };

  const handleUpdate = async () => {
    if (!editingAutomation || !formName.trim()) return;
    try {
      const updated = await automationService.update(editingAutomation._id, {
        name: formName,
        description: formDescription,
        trigger: formTrigger,
        conditions: formConditions,
        actions: formActions,
      });
      updateAutomation(editingAutomation._id, updated);
    } catch (err) {
      logger.error('Erro ao atualizar automação:', err);
      showToast('Erro ao atualizar automação no servidor.', 'error');
      return;
    }
    setShowEditModal(false);
    setEditingAutomation(null);
    resetForm();
  };

  const handleDelete = async () => {
    if (!selectedAuto) return;
    try {
      await automationService.delete(selectedAuto);
      deleteAutomation(selectedAuto);
    } catch (err) {
      logger.error('Erro ao excluir automação:', err);
      showToast('Erro ao excluir automação no servidor.', 'error');
      return;
    }
    setSelectedAuto(null);
    setShowDeleteModal(false);
  };

  const handleDuplicate = async (id: string) => {
    try {
      const created = await automationService.duplicate(id);
      addAutomation(created);
      setSelectedAuto(created._id);
    } catch (err) {
      logger.error('Erro ao duplicar automação:', err);
      showToast('Erro ao duplicar automação no servidor.', 'error');
    }
    setQuickActionsId(null);
  };

  const handleTest = async () => {
    if (!selectedAuto) return;
    try {
      const execution = await automationService.test(selectedAuto);
      addExecution(execution);
      setShowTestModal(false);
    } catch (err) {
      logger.error('Erro ao testar automação:', err);
      showToast('Erro ao executar teste no servidor.', 'error');
    }
  };

  const handleToggleAutomation = async (id: string) => {
    try {
      const updated = await automationService.toggle(id);
      updateAutomation(id, updated);
    } catch (err) {
      logger.error('Erro ao alternar automação:', err);
      showToast('Erro ao alterar status da automação.', 'error');
    }
  };

  const addAction = (type: ActionType) => {
    const actionInfo = getActionInfo(type);
    const newAction: AutomationAction = {
      id: `act_${Date.now()}`,
      type,
      label: actionInfo.label,
      config: {},
    };
    setFormActions([...formActions, newAction]);
  };

  const removeAction = (id: string) => {
    setFormActions(formActions.filter(a => a.id !== id));
  };

  const addCondition = () => {
    const newCondition: AutomationCondition = {
      id: `cond_${Date.now()}`,
      field: 'status',
      operator: 'equals',
      value: '',
    };
    setFormConditions([...formConditions, newCondition]);
  };

  const updateCondition = (id: string, updates: Partial<AutomationCondition>) => {
    setFormConditions(formConditions.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCondition = (id: string) => {
    setFormConditions(formConditions.filter(c => c.id !== id));
  };

  const applyTemplate = (templateId: string) => {
    const template = automationTemplates.find(t => t.id === templateId);
    if (!template) return;
    
    const triggerInfo = triggerTypes.find(t => t.type === template.trigger) || triggerTypes[0];
    setFormName(template.name);
    setFormDescription(template.description);
    setFormTrigger({ type: template.trigger as TriggerType, label: triggerInfo.label, config: {} });
    setFormActions([]);
    setShowTemplatesModal(false);
    setShowCreateModal(true);
  };

  const exportAutomation = (auto: AutomationFlow) => {
    const data = JSON.stringify(auto, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `automation_${auto.name.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="p-6 space-y-6">
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <span className="bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-transparent">Automação</span>
            <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">PRO</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} fluxos • {stats.active} ativos • {stats.totalExecutions.toLocaleString()} execuções totais</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowTemplatesModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Layers className="h-4 w-4" /> Templates
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={openCreateModal}
            className="btn-primary flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Nova Automação
          </motion.button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total de Fluxos', value: stats.total.toString(), icon: Zap, color: 'bg-brand-50 text-brand-600', trend: '+2 este mês' },
          { label: 'Fluxos Ativos', value: stats.active.toString(), icon: Play, color: 'bg-green-50 text-green-600', trend: `${Math.round((stats.active / Math.max(stats.total, 1)) * 100)}% do total` },
          { label: 'Execuções Totais', value: stats.totalExecutions.toLocaleString(), icon: TrendingUp, color: 'bg-blue-50 text-blue-600', trend: '+324 hoje' },
          { label: 'Taxa de Sucesso', value: `${stats.successRate}%`, icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600', trend: 'Última hora: 100%' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card p-5 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', stat.color)}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium text-gray-400">{stat.trend}</span>
              </div>
              <p className="mt-3 text-2xl font-extrabold text-gray-900">{stat.value}</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">{stat.label}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Filters & Search */}
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <motion.button
              key={status}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                statusFilter === status
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-200'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              )}
            >
              {status === 'all' ? 'Todos' : status === 'active' ? 'Ativos' : 'Inativos'}
              <span className="ml-1.5 text-xs opacity-70">
                ({status === 'all' ? stats.total : status === 'active' ? stats.active : stats.total - stats.active})
              </span>
            </motion.button>
          ))}
        </div>
        
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar automação..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setView('list')}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', view === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
          >
            Lista
          </button>
          <button
            onClick={() => {
              if (selected) {
                setBuilderAutomation(JSON.parse(JSON.stringify(selected)));
                setView('builder');
              } else if (automations.length > 0) {
                setSelectedAuto(automations[0]._id);
                setBuilderAutomation(JSON.parse(JSON.stringify(automations[0])));
                setView('builder');
              } else {
                showToast('Crie uma automação primeiro', 'info');
              }
            }}
            className={cn('px-3 py-1.5 rounded-lg text-sm font-medium transition-all', view === 'builder' ? 'bg-white shadow text-gray-900' : 'text-gray-500')}
          >
            Builder
          </button>
        </div>
      </motion.div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, x: 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                'px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2 text-sm font-medium',
                toast.type === 'success' && 'bg-green-50 border-green-200 text-green-700',
                toast.type === 'error' && 'bg-red-50 border-red-200 text-red-700',
                toast.type === 'info' && 'bg-blue-50 border-blue-200 text-blue-700'
              )}
            >
              {toast.type === 'success' && <CheckCircle className="h-4 w-4" />}
              {toast.type === 'error' && <XCircle className="h-4 w-4" />}
              {toast.type === 'info' && <Sparkles className="h-4 w-4" />}
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Builder Full-Screen View */}
      <AnimatePresence>
        {view === 'builder' && builderAutomation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-100 z-40"
          >
            {/* Builder Header */}
            <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setView('list');
                    setBuilderAutomation(null);
                    setSelectedNode(null);
                    setIsPreviewRunning(false);
                    setPreviewStep(0);
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="text-sm font-semibold">Voltar</span>
                </button>
                <div className="h-8 w-px bg-gray-200" />
                <div>
                  <h2 className="text-sm font-bold text-gray-900">{builderAutomation.name}</h2>
                  <p className="text-xs text-gray-500">Editor Visual de Fluxo</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Zoom Controls */}
                <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                  <button
                    onClick={() => setBuilderZoom(z => Math.max(50, z - 10))}
                    className="p-2 rounded-lg hover:bg-white transition-colors"
                  >
                    <ZoomOut className="h-4 w-4 text-gray-600" />
                  </button>
                  <span className="w-12 text-center text-xs font-semibold text-gray-600">{builderZoom}%</span>
                  <button
                    onClick={() => setBuilderZoom(z => Math.min(150, z + 10))}
                    className="p-2 rounded-lg hover:bg-white transition-colors"
                  >
                    <ZoomIn className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => { setBuilderZoom(100); setBuilderPan({ x: 0, y: 0 }); }}
                    className="p-2 rounded-lg hover:bg-white transition-colors"
                  >
                    <RotateCcw className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
                
                {/* Preview Button */}
                <button
                  onClick={() => {
                    if (isPreviewRunning) {
                      setIsPreviewRunning(false);
                      setPreviewStep(0);
                    } else {
                      setIsPreviewRunning(true);
                      setPreviewStep(0);
                      const totalSteps = 1 + builderAutomation.conditions.length + builderAutomation.actions.length + 1;
                      let step = 0;
                      const interval = setInterval(() => {
                        step++;
                        setPreviewStep(step);
                        if (step >= totalSteps) {
                          clearInterval(interval);
                          setTimeout(() => {
                            setIsPreviewRunning(false);
                            setPreviewStep(0);
                            showToast('Preview concluído!', 'success');
                          }, 1000);
                        }
                      }, 1200);
                    }
                  }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors',
                    isPreviewRunning
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  )}
                >
                  {isPreviewRunning ? (
                    <>
                      <Square className="h-4 w-4" /> Parar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" /> Preview
                    </>
                  )}
                </button>
                
                {/* Save Button */}
                <button
                  onClick={() => {
                    if (builderAutomation) {
                      updateAutomation(builderAutomation._id, {
                        trigger: builderAutomation.trigger,
                        conditions: builderAutomation.conditions,
                        actions: builderAutomation.actions,
                      });
                      showToast('Fluxo salvo com sucesso!', 'success');
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
                >
                  <Save className="h-4 w-4" /> Salvar
                </button>
              </div>
            </div>
            
            {/* Builder Canvas */}
            <div className="flex h-[calc(100vh-64px)]">
              {/* Canvas Area */}
              <div 
                ref={canvasRef}
                className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
                style={{
                  backgroundImage: 'radial-gradient(circle, #e5e7eb 1px, transparent 1px)',
                  backgroundSize: '24px 24px',
                }}
                onMouseDown={(e) => {
                  if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.canvas-content')) {
                    setIsPanning(true);
                    setPanStart({ x: e.clientX - builderPan.x, y: e.clientY - builderPan.y });
                  }
                }}
                onMouseMove={(e) => {
                  if (isPanning) {
                    setBuilderPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
                  }
                }}
                onMouseUp={() => setIsPanning(false)}
                onMouseLeave={() => setIsPanning(false)}
                onWheel={(e) => {
                  const delta = e.deltaY > 0 ? -10 : 10;
                  setBuilderZoom(z => Math.max(50, Math.min(150, z + delta)));
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggedComponent) {
                    if (draggedComponent.category === 'condition') {
                      const newCondition: AutomationCondition = {
                        id: `cond_${Date.now()}`,
                        field: 'status',
                        operator: 'equals',
                        value: '',
                      };
                      setBuilderAutomation(prev => prev ? { ...prev, conditions: [...prev.conditions, newCondition] } : prev);
                      showToast('Condição adicionada!', 'success');
                    } else if (draggedComponent.category === 'action') {
                      const actionInfo = getActionInfo(draggedComponent.type as ActionType);
                      const newAction: AutomationAction = {
                        id: `act_${Date.now()}`,
                        type: draggedComponent.type as ActionType,
                        label: actionInfo.label,
                        config: {},
                      };
                      setBuilderAutomation(prev => prev ? { ...prev, actions: [...prev.actions, newAction] } : prev);
                      showToast('Ação adicionada!', 'success');
                    } else if (draggedComponent.category === 'trigger') {
                      const triggerInfo = getTriggerInfo(draggedComponent.type as TriggerType);
                      setBuilderAutomation(prev => prev ? { 
                        ...prev, 
                        trigger: { type: draggedComponent.type as TriggerType, label: triggerInfo.label, config: {} }
                      } : prev);
                      showToast('Gatilho atualizado!', 'success');
                    }
                    setDraggedComponent(null);
                  }
                }}
              >
                {/* Preview Progress Bar */}
                {isPreviewRunning && (
                  <div className="absolute top-4 left-4 right-4 z-10">
                    <div className="bg-white rounded-xl p-3 shadow-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-700">Executando preview...</span>
                        <span className="text-xs text-gray-500">
                          Etapa {previewStep} de {1 + builderAutomation.conditions.length + builderAutomation.actions.length + 1}
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-brand-500 to-violet-500"
                          animate={{ width: `${(previewStep / (1 + builderAutomation.conditions.length + builderAutomation.actions.length + 1)) * 100}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Flow Nodes */}
                <div 
                  className="canvas-content absolute inset-0 flex flex-col items-center pt-24 transition-transform"
                  style={{ transform: `translate(${builderPan.x}px, ${builderPan.y}px) scale(${builderZoom / 100})` }}
                >
                  {/* Start Node */}
                  <motion.div
                    animate={isPreviewRunning && previewStep === 0 ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.8, repeat: isPreviewRunning && previewStep === 0 ? Infinity : 0 }}
                    className={cn(
                      'w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg',
                      previewStep > 0 && 'ring-4 ring-green-300'
                    )}
                  >
                    <Play className="h-8 w-8 text-white fill-white" />
                  </motion.div>
                  
                  <div className="h-8 w-px bg-gray-300" />
                  
                  {/* Trigger Node */}
                  <motion.div
                    animate={isPreviewRunning && previewStep === 1 ? { scale: [1, 1.03, 1] } : {}}
                    transition={{ duration: 0.8, repeat: isPreviewRunning && previewStep === 1 ? Infinity : 0 }}
                    onClick={() => setSelectedNode('trigger')}
                    className={cn(
                      'w-64 rounded-2xl border-2 bg-white shadow-lg cursor-pointer transition-all hover:shadow-xl',
                      selectedNode === 'trigger' ? 'border-amber-500 ring-4 ring-amber-100' : 'border-amber-300',
                      previewStep > 1 && 'border-green-400 ring-2 ring-green-100'
                    )}
                  >
                    <div className="p-4">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const triggerInfo = getTriggerInfo(builderAutomation.trigger.type);
                          const TriggerIcon = triggerInfo.icon;
                          return (
                            <>
                              <div className={cn('p-2.5 rounded-xl', triggerInfo.color)}>
                                <TriggerIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-amber-600 font-bold">Gatilho</p>
                                <p className="text-sm font-bold text-gray-900">{builderAutomation.trigger.label}</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    {previewStep > 1 && (
                      <div className="absolute -right-2 -top-2">
                        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    )}
                  </motion.div>
                  
                  {/* Conditions */}
                  {builderAutomation.conditions.map((cond, i) => (
                    <div key={cond.id} className="flex flex-col items-center">
                      <div className="h-8 w-px bg-gray-300" />
                      <motion.div
                        animate={isPreviewRunning && previewStep === 2 + i ? { scale: [1, 1.03, 1] } : {}}
                        transition={{ duration: 0.8, repeat: isPreviewRunning && previewStep === 2 + i ? Infinity : 0 }}
                        onClick={() => setSelectedNode(`condition_${cond.id}`)}
                        className={cn(
                          'w-64 rounded-2xl border-2 bg-white shadow-lg cursor-pointer transition-all hover:shadow-xl relative',
                          selectedNode === `condition_${cond.id}` ? 'border-violet-500 ring-4 ring-violet-100' : 'border-violet-300',
                          previewStep > 2 + i && 'border-green-400 ring-2 ring-green-100'
                        )}
                      >
                        <div className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-violet-100">
                              <Filter className="h-5 w-5 text-violet-600" />
                            </div>
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-violet-600 font-bold">Condição</p>
                              <p className="text-sm font-bold text-gray-900">{cond.field} {cond.operator} "{cond.value}"</p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setBuilderAutomation(prev => prev ? { ...prev, conditions: prev.conditions.filter(c => c.id !== cond.id) } : prev);
                            showToast('Condição removida', 'info');
                          }}
                          className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {previewStep > 2 + i && (
                          <div className="absolute -right-2 -top-2">
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                              <CheckCircle className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </div>
                  ))}
                  
                  {/* Actions */}
                  {builderAutomation.actions.map((action, i) => {
                    const actionInfo = getActionInfo(action.type);
                    const ActionIcon = actionInfo.icon;
                    const stepIndex = 2 + builderAutomation.conditions.length + i;
                    return (
                      <div key={action.id} className="flex flex-col items-center">
                        <div className="h-8 w-px bg-gray-300" />
                        <motion.div
                          animate={isPreviewRunning && previewStep === stepIndex ? { scale: [1, 1.03, 1] } : {}}
                          transition={{ duration: 0.8, repeat: isPreviewRunning && previewStep === stepIndex ? Infinity : 0 }}
                          onClick={() => setSelectedNode(`action_${action.id}`)}
                          className={cn(
                            'w-64 rounded-2xl border-2 bg-white shadow-lg cursor-pointer transition-all hover:shadow-xl relative',
                            selectedNode === `action_${action.id}` ? 'border-blue-500 ring-4 ring-blue-100' : 'border-blue-300',
                            previewStep > stepIndex && 'border-green-400 ring-2 ring-green-100'
                          )}
                        >
                          <div className="p-4">
                            <div className="flex items-center gap-3">
                              <div className={cn('p-2.5 rounded-xl', actionInfo.color)}>
                                <ActionIcon className="h-5 w-5" />
                              </div>
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-blue-600 font-bold">Ação #{i + 1}</p>
                                <p className="text-sm font-bold text-gray-900">{action.label}</p>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setBuilderAutomation(prev => prev ? { ...prev, actions: prev.actions.filter(a => a.id !== action.id) } : prev);
                              showToast('Ação removida', 'info');
                            }}
                            className="absolute -right-2 -top-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          {previewStep > stepIndex && (
                            <div className="absolute -right-2 -top-2">
                              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                <CheckCircle className="h-4 w-4 text-white" />
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    );
                  })}
                  
                  <div className="h-8 w-px bg-gray-300" />
                  
                  {/* End Node */}
                  <motion.div
                    animate={isPreviewRunning && previewStep >= 2 + builderAutomation.conditions.length + builderAutomation.actions.length ? { scale: [1, 1.05, 1] } : {}}
                    transition={{ duration: 0.8, repeat: isPreviewRunning && previewStep >= 2 + builderAutomation.conditions.length + builderAutomation.actions.length ? Infinity : 0 }}
                    className={cn(
                      'w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg',
                      previewStep >= 2 + builderAutomation.conditions.length + builderAutomation.actions.length && 'ring-4 ring-red-300'
                    )}
                  >
                    <Circle className="h-6 w-6 text-white" />
                  </motion.div>
                  
                  {/* Drop zone indicator */}
                  {draggedComponent && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-8 px-8 py-4 border-2 border-dashed border-brand-400 rounded-2xl bg-brand-50 text-brand-600"
                    >
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Move className="h-5 w-5" />
                        Solte aqui para adicionar
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
              
              {/* Sidebar - Component Palette or Node Config */}
              <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto">
                {selectedNode ? (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-gray-900">Configuração</h3>
                      <button
                        onClick={() => setSelectedNode(null)}
                        className="p-1.5 rounded-lg hover:bg-gray-100"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                    
                    {selectedNode === 'trigger' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-gray-600 mb-2">Tipo de Gatilho</label>
                          <select
                            value={builderAutomation.trigger.type}
                            onChange={(e) => {
                              const triggerInfo = getTriggerInfo(e.target.value as TriggerType);
                              setBuilderAutomation(prev => prev ? {
                                ...prev,
                                trigger: { type: e.target.value as TriggerType, label: triggerInfo.label, config: {} }
                              } : prev);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                          >
                            {triggerTypes.map(t => (
                              <option key={t.type} value={t.type}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => { setSelectedNode(null); showToast('Configuração aplicada', 'success'); }}
                          className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
                        >
                          Aplicar
                        </button>
                      </div>
                    )}
                    
                    {selectedNode.startsWith('condition_') && (() => {
                      const condId = selectedNode.replace('condition_', '');
                      const cond = builderAutomation.conditions.find(c => c.id === condId);
                      if (!cond) return null;
                      return (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">Campo</label>
                            <select
                              value={cond.field ?? 'status'}
                            onChange={(e) => {
                              setBuilderAutomation(prev => prev ? {
                                ...prev,
                                conditions: prev.conditions.map(c => c.id === condId ? { ...c, field: e.target.value } : c)
                              } : prev);
                            }}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                            >
                              <option value="status">Status</option>
                              <option value="source">Origem</option>
                              <option value="score">Score</option>
                              <option value="value">Valor</option>
                              <option value="tags">Tags</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">Operador</label>
                            <select
                              value={cond.operator ?? 'equals'}
                              onChange={(e) => {
                                setBuilderAutomation(prev => prev ? {
                                  ...prev,
                                  conditions: prev.conditions.map(c => c.id === condId ? { ...c, operator: e.target.value as AutomationCondition['operator'] } : c)
                                } : prev);
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                            >
                              <option value="equals">Igual a</option>
                              <option value="not_equals">Diferente de</option>
                              <option value="contains">Contém</option>
                              <option value="greater_than">Maior que</option>
                              <option value="less_than">Menor que</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">Valor</label>
                            <input
                              type="text"
                              value={typeof cond.value === 'string' ? cond.value : ''}
                              onChange={(e) => {
                                setBuilderAutomation(prev => prev ? {
                                  ...prev,
                                  conditions: prev.conditions.map(c => c.id === condId ? { ...c, value: e.target.value } : c)
                                } : prev);
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                              placeholder="Digite o valor..."
                            />
                          </div>
                          <button
                            onClick={() => { setSelectedNode(null); showToast('Configuração aplicada', 'success'); }}
                            className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
                          >
                            Aplicar
                          </button>
                          <button
                            onClick={() => {
                              setBuilderAutomation(prev => prev ? { ...prev, conditions: prev.conditions.filter(c => c.id !== condId) } : prev);
                              setSelectedNode(null);
                              showToast('Condição removida', 'info');
                            }}
                            className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50"
                          >
                            Excluir Condição
                          </button>
                        </div>
                      );
                    })()}
                    
                    {selectedNode.startsWith('action_') && (() => {
                      const actId = selectedNode.replace('action_', '');
                      const action = builderAutomation.actions.find(a => a.id === actId);
                      if (!action) return null;
                      return (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-semibold text-gray-600 mb-2">Tipo de Ação</label>
                            <select
                              value={action.type}
                              onChange={(e) => {
                                const actionInfo = getActionInfo(e.target.value as ActionType);
                                setBuilderAutomation(prev => prev ? {
                                  ...prev,
                                  actions: prev.actions.map(a => a.id === actId ? { ...a, type: e.target.value as ActionType, label: actionInfo.label } : a)
                                } : prev);
                              }}
                              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                            >
                              {actionTypes.map(a => (
                                <option key={a.type} value={a.type}>{a.label}</option>
                              ))}
                            </select>
                          </div>
                          {(action.type === 'send_whatsapp' || action.type === 'send_email' || action.type === 'send_message') && (
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-2">Mensagem</label>
                              <textarea
                                value={typeof action.config?.message === 'string' ? action.config.message : ''}
                                onChange={(e) => {
                                  setBuilderAutomation(prev => prev ? {
                                    ...prev,
                                    actions: prev.actions.map(a => a.id === actId ? { ...a, config: { ...a.config, message: e.target.value } } : a)
                                  } : prev);
                                }}
                                rows={3}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none"
                                placeholder="Digite a mensagem..."
                              />
                            </div>
                          )}
                          {action.type === 'delay' && (
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-2">Tempo (minutos)</label>
                              <input
                                type="number"
                                value={typeof action.config?.delay === 'number' ? action.config.delay : 5}
                                onChange={(e) => {
                                  setBuilderAutomation(prev => prev ? {
                                    ...prev,
                                    actions: prev.actions.map(a => a.id === actId ? { ...a, config: { ...a.config, delay: parseInt(e.target.value) } } : a)
                                  } : prev);
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                                min="1"
                              />
                            </div>
                          )}
                          {action.type === 'webhook' && (
                            <div>
                              <label className="block text-xs font-semibold text-gray-600 mb-2">URL do Webhook</label>
                              <input
                                type="url"
                                value={typeof action.config?.url === 'string' ? action.config.url : ''}
                                onChange={(e) => {
                                  setBuilderAutomation(prev => prev ? {
                                    ...prev,
                                    actions: prev.actions.map(a => a.id === actId ? { ...a, config: { ...a.config, url: e.target.value } } : a)
                                  } : prev);
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
                                placeholder="https://..."
                              />
                            </div>
                          )}
                          <button
                            onClick={() => { setSelectedNode(null); showToast('Configuração aplicada', 'success'); }}
                            className="w-full py-2.5 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700"
                          >
                            Aplicar
                          </button>
                          <button
                            onClick={() => {
                              setBuilderAutomation(prev => prev ? { ...prev, actions: prev.actions.filter(a => a.id !== actId) } : prev);
                              setSelectedNode(null);
                              showToast('Ação removida', 'info');
                            }}
                            className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50"
                          >
                            Excluir Ação
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-brand-600" />
                      Componentes
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">Arraste os componentes para o canvas</p>
                    
                    {/* Triggers */}
                    <div className="mb-4">
                      <p className="text-[10px] uppercase tracking-wider text-amber-600 font-bold mb-2">Gatilhos</p>
                      <div className="space-y-1.5">
                        {triggerTypes.slice(0, 5).map(trigger => {
                          const TriggerIcon = trigger.icon;
                          return (
                            <div
                              key={trigger.type}
                              draggable
                              onDragStart={() => setDraggedComponent({ type: trigger.type, category: 'trigger' })}
                              onDragEnd={() => setDraggedComponent(null)}
                              className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 hover:border-amber-300 hover:bg-amber-50 cursor-grab active:cursor-grabbing transition-all"
                            >
                              <GripVertical className="h-3 w-3 text-gray-300" />
                              <div className={cn('p-1.5 rounded-lg', trigger.color)}>
                                <TriggerIcon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-medium text-gray-700">{trigger.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    {/* Conditions */}
                    <div className="mb-4">
                      <p className="text-[10px] uppercase tracking-wider text-violet-600 font-bold mb-2">Condições</p>
                      <div className="space-y-1.5">
                        {[
                          { type: 'status_equals', label: 'Status igual a' },
                          { type: 'score_greater', label: 'Score maior que' },
                          { type: 'tag_contains', label: 'Tag contém' },
                        ].map(cond => (
                          <div
                            key={cond.type}
                            draggable
                            onDragStart={() => setDraggedComponent({ type: cond.type, category: 'condition' })}
                            onDragEnd={() => setDraggedComponent(null)}
                            className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 hover:border-violet-300 hover:bg-violet-50 cursor-grab active:cursor-grabbing transition-all"
                          >
                            <GripVertical className="h-3 w-3 text-gray-300" />
                            <div className="p-1.5 rounded-lg bg-violet-100">
                              <Filter className="h-3.5 w-3.5 text-violet-600" />
                            </div>
                            <span className="text-xs font-medium text-gray-700">{cond.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-blue-600 font-bold mb-2">Ações</p>
                      <div className="space-y-1.5">
                        {actionTypes.slice(0, 6).map(action => {
                          const ActionIcon = action.icon;
                          return (
                            <div
                              key={action.type}
                              draggable
                              onDragStart={() => setDraggedComponent({ type: action.type, category: 'action' })}
                              onDragEnd={() => setDraggedComponent(null)}
                              className="flex items-center gap-2 p-2 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-grab active:cursor-grabbing transition-all"
                            >
                              <GripVertical className="h-3 w-3 text-gray-300" />
                              <div className={cn('p-1.5 rounded-lg', action.color)}>
                                <ActionIcon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-medium text-gray-700">{action.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className={cn('grid gap-6 lg:grid-cols-3', view === 'builder' && 'hidden')}>
        {/* Automations List */}
        <div className="lg:col-span-2 space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredAutomations.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card p-12 text-center"
              >
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-violet-100">
                  <Zap className="h-10 w-10 text-brand-600" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-gray-900">Nenhuma automação encontrada</h3>
                <p className="mt-2 text-sm text-gray-500">Crie sua primeira automação para começar</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openCreateModal}
                  className="mt-4 btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold"
                >
                  <Plus className="h-4 w-4 mr-2 inline" /> Criar Automação
                </motion.button>
              </motion.div>
            ) : (
              filteredAutomations.map((auto, i) => (
                <motion.div
                  key={auto._id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => setSelectedAuto(auto._id)}
                  whileHover={{ y: -2 }}
                  className={cn(
                    'card card-interactive p-5 cursor-pointer relative group',
                    selectedAuto === auto._id ? 'border-brand-400 ring-2 ring-brand-400/20' : '',
                    !auto.active && 'opacity-70'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-2xl transition-colors',
                        auto.active ? 'bg-gradient-to-br from-brand-100 to-violet-100' : 'bg-gray-100'
                      )}>
                        <Zap className={cn('h-6 w-6', auto.active ? 'text-brand-600' : 'text-gray-400')} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[13px] font-bold text-gray-900">{auto.name}</h3>
                          {auto.active && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 text-[9px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              ATIVO
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">{auto.description}</p>
                        <div className="mt-2.5 flex flex-wrap items-center gap-2">
                          {(() => {
                            const triggerInfo = getTriggerInfo(auto.trigger.type);
                            const TriggerIcon = triggerInfo.icon;
                            return (
                              <span className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold', triggerInfo.color)}>
                                <TriggerIcon className="h-3 w-3" />
                                {auto.trigger.label}
                              </span>
                            );
                          })()}
                          <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                            <Layers className="h-3 w-3" />
                            {auto.actions.length} ações
                          </span>
                          <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                            <Activity className="h-3 w-3" />
                            {auto.executionCount.toLocaleString()} exec.
                          </span>
                          {auto.lastRun && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-400 font-medium">
                              <Clock className="h-3 w-3" />
                              {auto.lastRun}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2.5">
                      {/* Success rate indicator */}
                      <div className="hidden sm:flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${auto.executionCount > 0 ? (auto.successCount / auto.executionCount) * 100 : 0}%` }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="h-full bg-green-500 rounded-full"
                          />
                        </div>
                        <span className="text-[10px] font-medium text-gray-400">
                          {auto.executionCount > 0 ? Math.round((auto.successCount / auto.executionCount) * 100) : 0}%
                        </span>
                      </div>

                      {/* Toggle */}
                      <button
                        onClick={(e) => { e.stopPropagation(); void handleToggleAutomation(auto._id); }}
                        className={cn(
                          'toggle-switch relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                          auto.active ? 'bg-brand-600' : 'bg-gray-300'
                        )}
                      >
                        <span className={cn(
                          'toggle-knob inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                          auto.active ? 'translate-x-6' : 'translate-x-1'
                        )} />
                      </button>
                      
                      {/* Quick Actions */}
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setQuickActionsId(quickActionsId === auto._id ? null : auto._id); }}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        
                        <AnimatePresence>
                          {quickActionsId === auto._id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => { openEditModal(auto); setQuickActionsId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Edit3 className="h-4 w-4" /> Editar
                              </button>
                              <button
                                onClick={() => handleDuplicate(auto._id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Copy className="h-4 w-4" /> Duplicar
                              </button>
                              <button
                                onClick={() => { setSelectedAuto(auto._id); setShowTestModal(true); setQuickActionsId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <PlayCircle className="h-4 w-4" /> Testar
                              </button>
                              <button
                                onClick={() => { setSelectedAuto(auto._id); setShowHistoryModal(true); setQuickActionsId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <History className="h-4 w-4" /> Histórico
                              </button>
                              <button
                                onClick={() => { exportAutomation(auto); setQuickActionsId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <Download className="h-4 w-4" /> Exportar
                              </button>
                              <hr className="my-1" />
                              <button
                                onClick={() => { setSelectedAuto(auto._id); setShowDeleteModal(true); setQuickActionsId(null); }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" /> Excluir
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openEditModal(auto); }}
                      className="p-1.5 rounded-lg bg-white/90 text-gray-500 hover:text-brand-600 shadow-sm"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedAuto(auto._id); setShowTestModal(true); }}
                      className="p-1.5 rounded-lg bg-white/90 text-gray-500 hover:text-green-600 shadow-sm"
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Details Panel */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="card overflow-hidden"
              >
                {/* Panel Header */}
                <div className="p-5 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-900">Detalhes do Fluxo</h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(selected)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Tabs */}
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                    {(['details', 'history', 'settings'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                          'flex-1 px-3 py-1.5 rounded-md text-xs font-semibold transition-all',
                          activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        {tab === 'details' ? 'Detalhes' : tab === 'history' ? 'Histórico' : 'Config'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-5 space-y-5 max-h-[600px] overflow-y-auto">
                  {activeTab === 'details' && (
                    <>
                      {/* Title & Status */}
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-extrabold text-gray-900">{selected.name}</h4>
                          <span className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-bold',
                            selected.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          )}>
                            {selected.active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-500">{selected.description}</p>
                      </div>

                      {/* Trigger */}
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-2">Gatilho</p>
                        {(() => {
                          const triggerInfo = getTriggerInfo(selected.trigger.type);
                          const TriggerIcon = triggerInfo.icon;
                          return (
                            <div className={cn('rounded-xl border p-3 text-sm font-semibold flex items-center gap-2', triggerInfo.color)}>
                              <TriggerIcon className="h-4 w-4" />
                              {selected.trigger.label}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Conditions */}
                      {selected.conditions.length > 0 && (
                        <div>
                          <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-2">Condições ({selected.conditions.length})</p>
                          <div className="space-y-2">
                            {selected.conditions.map((cond) => (
                              <div key={cond.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-center gap-2">
                                <Filter className="h-4 w-4 text-amber-600" />
                                <span className="text-xs text-amber-700 font-medium">
                                  {cond.field} {cond.operator} "{cond.value}"
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-2">Ações ({selected.actions.length})</p>
                        <div className="space-y-2">
                          {selected.actions.map((action, i) => {
                            const actionInfo = getActionInfo(action.type);
                            const ActionIcon = actionInfo.icon;
                            return (
                              <div key={action.id}>
                                <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 p-3 hover:border-brand-200 transition-colors">
                                  <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', actionInfo.color)}>
                                    <ActionIcon className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="flex-1">
                                    <span className="text-xs text-gray-700 font-medium">{action.label}</span>
                                  </div>
                                  <span className="text-[10px] text-gray-400 font-medium">#{i + 1}</span>
                                </div>
                                {i < selected.actions.length - 1 && (
                                  <div className="flex justify-center py-1">
                                    <ArrowDown className="h-3.5 w-3.5 text-gray-300" />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                          <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Execuções</p>
                          <p className="mt-1 text-lg font-extrabold text-gray-900">{selected.executionCount.toLocaleString()}</p>
                        </div>
                        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                          <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Taxa Sucesso</p>
                          <p className="mt-1 text-lg font-extrabold text-green-600">
                            {selected.executionCount > 0 ? Math.round((selected.successCount / selected.executionCount) * 100) : 0}%
                          </p>
                        </div>
                        <div className="rounded-xl bg-green-50 border border-green-100 p-3">
                          <p className="text-[9px] uppercase tracking-widest text-green-600 font-bold">Sucesso</p>
                          <p className="mt-1 text-lg font-extrabold text-green-700">{selected.successCount.toLocaleString()}</p>
                        </div>
                        <div className="rounded-xl bg-red-50 border border-red-100 p-3">
                          <p className="text-[9px] uppercase tracking-widest text-red-600 font-bold">Falhas</p>
                          <p className="mt-1 text-lg font-extrabold text-red-700">{selected.failCount}</p>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowTestModal(true)}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          <PlayCircle className="h-4 w-4" /> Testar
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => openEditModal(selected)}
                          className="flex-1 btn-primary flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
                        >
                          <Settings className="h-4 w-4" /> Editar
                        </motion.button>
                      </div>
                    </>
                  )}

                  {activeTab === 'history' && (
                    <div className="space-y-3">
                      {selectedExecutions.length === 0 ? (
                        <div className="text-center py-8">
                          <History className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">Nenhuma execução registrada</p>
                        </div>
                      ) : (
                        selectedExecutions.slice(0, 10).map((exec) => (
                          <motion.div
                            key={exec._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={cn(
                              'rounded-xl border p-3',
                              exec.status === 'success' ? 'border-green-200 bg-green-50' :
                              exec.status === 'failed' ? 'border-red-200 bg-red-50' :
                              'border-blue-200 bg-blue-50'
                            )}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {exec.status === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                                {exec.status === 'failed' && <XCircle className="h-4 w-4 text-red-600" />}
                                {exec.status === 'running' && <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />}
                                <span className="text-xs font-semibold text-gray-700">{exec.triggeredBy}</span>
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {new Date(exec.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center gap-3 text-[10px]">
                              <span className="text-gray-500">{exec.actionsExecuted} ações executadas</span>
                              {exec.error && (
                                <span className="text-red-600">{exec.error}</span>
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
                      
                      {selectedExecutions.length > 10 && (
                        <button
                          onClick={() => setShowHistoryModal(true)}
                          className="w-full text-center text-sm text-brand-600 font-semibold hover:underline"
                        >
                          Ver todas ({selectedExecutions.length})
                        </button>
                      )}
                    </div>
                  )}

                  {activeTab === 'settings' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                        <div>
                          <p className="text-sm font-semibold text-gray-700">Status da Automação</p>
                          <p className="text-xs text-gray-500">Ativar ou desativar execução</p>
                        </div>
                        <button
                          onClick={() => { void handleToggleAutomation(selected._id); }}
                          className={cn(
                            'toggle-switch relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                            selected.active ? 'bg-brand-600' : 'bg-gray-300'
                          )}
                        >
                          <span className={cn(
                            'toggle-knob inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                            selected.active ? 'translate-x-6' : 'translate-x-1'
                          )} />
                        </button>
                      </div>
                      
                      <div className="p-3 rounded-xl bg-gray-50">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Informações</p>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Criado em:</span>
                            <span className="text-gray-700">{new Date(selected.createdAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Última atualização:</span>
                            <span className="text-gray-700">{new Date(selected.updatedAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Última execução:</span>
                            <span className="text-gray-700">{selected.lastRun || 'Nunca'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <button
                          onClick={() => handleDuplicate(selected._id)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Copy className="h-4 w-4" /> Duplicar Automação
                        </button>
                        <button
                          onClick={() => exportAutomation(selected)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          <Download className="h-4 w-4" /> Exportar JSON
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" /> Excluir Automação
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="card p-8 text-center"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-violet-100">
                  <Zap className="h-8 w-8 text-brand-600" />
                </div>
                <h3 className="mt-4 text-sm font-bold text-gray-900">Selecione um fluxo</h3>
                <p className="mt-1 text-xs text-gray-500">Clique em um fluxo para ver os detalhes</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Visual Builder Preview */}
          {view === 'builder' && selected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-5"
            >
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-600" />
                Builder Visual
              </h3>
              <div className="flex flex-col items-center gap-1.5">
                {/* Trigger */}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="w-full rounded-xl border-2 border-green-300 bg-green-50 p-3 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <Target className="h-4 w-4" />
                    <span className="text-xs font-bold">{selected.trigger.label}</span>
                  </div>
                </motion.div>
                <ArrowDown className="h-4 w-4 text-gray-300" />
                
                {/* Conditions */}
                {selected.conditions.length > 0 && (
                  <>
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="w-full rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-center"
                    >
                      <div className="flex items-center justify-center gap-2 text-amber-700">
                        <Filter className="h-4 w-4" />
                        <span className="text-xs font-bold">{selected.conditions.length} Condições</span>
                      </div>
                    </motion.div>
                    <ArrowDown className="h-4 w-4 text-gray-300" />
                  </>
                )}
                
                {/* Actions */}
                {selected.actions.map((action, i) => {
                  const actionInfo = getActionInfo(action.type);
                  const ActionIcon = actionInfo.icon;
                  return (
                    <div key={action.id} className="w-full">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="rounded-xl border-2 border-blue-300 bg-blue-50 p-3"
                      >
                        <div className="flex items-center justify-center gap-2 text-blue-700">
                          <ActionIcon className="h-4 w-4" />
                          <span className="text-xs font-bold">{action.label}</span>
                        </div>
                      </motion.div>
                      {i < selected.actions.length - 1 && (
                        <div className="flex justify-center py-0.5">
                          <ArrowDown className="h-4 w-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || showEditModal) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {showEditModal ? 'Editar Automação' : 'Nova Automação'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">Configure o fluxo de automação</p>
                </div>
                <button
                  onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                {/* Basic Info */}
                <div className="grid gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome da Automação *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ex: Boas-vindas WhatsApp"
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição</label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Descreva o objetivo desta automação..."
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>

                {/* Trigger Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Gatilho (Quando executar?) *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {triggerTypes.map((trigger) => {
                      const Icon = trigger.icon;
                      return (
                        <motion.button
                          key={trigger.type}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setFormTrigger({ type: trigger.type, label: trigger.label, config: {} })}
                          className={cn(
                            'flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all',
                            formTrigger.type === trigger.type
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-gray-200 hover:border-gray-300'
                          )}
                        >
                          <div className={cn('p-1.5 rounded-lg', trigger.color)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className="text-xs font-semibold text-gray-700">{trigger.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Conditions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">Condições (Opcional)</label>
                    <button
                      onClick={addCondition}
                      className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" /> Adicionar
                    </button>
                  </div>
                  {formConditions.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Nenhuma condição definida</p>
                  ) : (
                    <div className="space-y-2">
                      {formConditions.map((cond) => (
                        <div key={cond.id} className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
                          <select
                            value={cond.field}
                            onChange={(e) => updateCondition(cond.id, { field: e.target.value })}
                            className="flex-1 px-2 py-1.5 rounded-lg border border-amber-300 text-xs bg-white"
                          >
                            <option value="status">Status</option>
                            <option value="source">Origem</option>
                            <option value="score">Score</option>
                            <option value="value">Valor</option>
                            <option value="tags">Tags</option>
                          </select>
                          <select
                            value={cond.operator}
                            onChange={(e) => updateCondition(cond.id, { operator: e.target.value as AutomationCondition['operator'] })}
                            className="px-2 py-1.5 rounded-lg border border-amber-300 text-xs bg-white"
                          >
                            <option value="equals">Igual a</option>
                            <option value="not_equals">Diferente de</option>
                            <option value="contains">Contém</option>
                            <option value="greater_than">Maior que</option>
                            <option value="less_than">Menor que</option>
                          </select>
                          <input
                            type="text"
                            value={cond.value}
                            onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                            placeholder="Valor"
                            className="flex-1 px-2 py-1.5 rounded-lg border border-amber-300 text-xs"
                          />
                          <button
                            onClick={() => removeCondition(cond.id)}
                            className="p-1 rounded-lg hover:bg-amber-200 text-amber-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-semibold text-gray-700">Ações (O que fazer?) *</label>
                  </div>
                  
                  {/* Selected Actions */}
                  {formActions.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {formActions.map((action, i) => {
                        const actionInfo = getActionInfo(action.type);
                        const ActionIcon = actionInfo.icon;
                        return (
                          <motion.div
                            key={action.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200"
                          >
                            <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
                            <div className={cn('p-1.5 rounded-lg', actionInfo.color)}>
                              <ActionIcon className="h-4 w-4" />
                            </div>
                            <span className="flex-1 text-xs font-semibold text-gray-700">{action.label}</span>
                            <span className="text-[10px] text-gray-400">#{i + 1}</span>
                            <button
                              onClick={() => removeAction(action.id)}
                              className="p-1 rounded-lg hover:bg-blue-200 text-blue-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add Action Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        const dropdown = document.getElementById('action-dropdown');
                        dropdown?.classList.toggle('hidden');
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
                    >
                      <Plus className="h-4 w-4" /> Adicionar Ação
                    </button>
                    <div id="action-dropdown" className="hidden absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-10 max-h-60 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-1">
                        {actionTypes.map((action) => {
                          const Icon = action.icon;
                          return (
                            <button
                              key={action.type}
                              onClick={() => {
                                addAction(action.type);
                                document.getElementById('action-dropdown')?.classList.add('hidden');
                              }}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-left"
                            >
                              <div className={cn('p-1 rounded-md', action.color)}>
                                <Icon className="h-3 w-3" />
                              </div>
                              <span className="text-xs font-medium text-gray-700">{action.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => { setShowCreateModal(false); setShowEditModal(false); resetForm(); }}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <div className="flex items-center gap-2">
                  {showEditModal && (
                    <button
                      onClick={() => { setShowDeleteModal(true); }}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Excluir
                    </button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={showEditModal ? handleUpdate : handleCreate}
                    disabled={!formName.trim() || formActions.length === 0}
                    className="btn-primary px-6 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {showEditModal ? 'Salvar Alterações' : 'Criar Automação'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-full bg-red-100 mb-4">
                <AlertTriangle className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Excluir Automação</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Tem certeza que deseja excluir <strong>"{selected.name}"</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Test Modal */}
      <AnimatePresence>
        {showTestModal && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTestModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-full bg-green-100 mb-4">
                <PlayCircle className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Testar Automação</h3>
              <p className="text-sm text-gray-500 text-center mb-4">
                Executar <strong>"{selected.name}"</strong> em modo de teste?
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    O teste executará todas as ações configuradas com dados simulados. Nenhuma ação real será executada.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowTestModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTest}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-green-600 text-sm font-semibold text-white hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Play className="h-4 w-4" /> Executar Teste
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates Modal */}
      <AnimatePresence>
        {showTemplatesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowTemplatesModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Templates de Automação</h2>
                  <p className="text-sm text-gray-500 mt-0.5">Comece com um template pronto</p>
                </div>
                <button
                  onClick={() => setShowTemplatesModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                {automationTemplates.map((template) => {
                  const triggerInfo = triggerTypes.find(t => t.type === template.trigger) || triggerTypes[0];
                  const TriggerIcon = triggerInfo.icon;
                  return (
                    <motion.div
                      key={template.id}
                      whileHover={{ scale: 1.02 }}
                      className="card p-4 cursor-pointer hover:border-brand-400"
                      onClick={() => applyTemplate(template.id)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className={cn('p-2 rounded-xl', triggerInfo.color)}>
                          <TriggerIcon className="h-5 w-5" />
                        </div>
                        {template.popular && (
                          <span className="px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-bold">
                            Popular
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-gray-900">{template.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                      <div className="flex items-center gap-2 mt-3 text-[10px] text-gray-400">
                        <span className={cn('px-2 py-0.5 rounded border', triggerInfo.color)}>{triggerInfo.label}</span>
                        <span>{template.actions} ações</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              
              <div className="p-6 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => { setShowTemplatesModal(false); openCreateModal(); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-sm font-semibold text-gray-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
                >
                  <Plus className="h-4 w-4" /> Criar do Zero
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {showHistoryModal && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowHistoryModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Histórico de Execuções</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{selected.name}</p>
                </div>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
                {selectedExecutions.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">Nenhuma execução registrada</p>
                  </div>
                ) : (
                  selectedExecutions.map((exec) => (
                    <div
                      key={exec._id}
                      className={cn(
                        'rounded-xl border p-4',
                        exec.status === 'success' ? 'border-green-200 bg-green-50' :
                        exec.status === 'failed' ? 'border-red-200 bg-red-50' :
                        'border-blue-200 bg-blue-50'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {exec.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                          {exec.status === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
                          {exec.status === 'running' && <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />}
                          <div>
                            <p className="text-sm font-semibold text-gray-700">{exec.triggeredBy}</p>
                            <p className="text-xs text-gray-500">
                              {exec.actionsExecuted} de {selected.actions.length} ações executadas
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">
                            {new Date(exec.startedAt).toLocaleDateString('pt-BR')}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(exec.startedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      {exec.error && (
                        <div className="mt-3 p-2 rounded-lg bg-red-100 border border-red-200">
                          <p className="text-xs text-red-700">Erro: {exec.error}</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {selectedExecutions.length} execuções encontradas
                </span>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
