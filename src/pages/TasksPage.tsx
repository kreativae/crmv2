import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { forceCleanup } from '../utils/fixClickBlock';
import {
  Plus, Calendar, Clock, Flag, CheckCircle2, Circle, AlertCircle,
  Filter, User, X, Edit3, Trash2, Save, ChevronDown, Link2,
  MessageSquare, ArrowRight, Eye, Tag, FileText,
  Search, Download, Copy, ListTodo, LayoutGrid, CalendarDays,
  ChevronLeft, ChevronRight, Play, RotateCcw,
  SortAsc, SortDesc, Timer
} from 'lucide-react';
import type { Task, TaskStatus, TaskPriority, TaskSubtask, TaskNote } from '../types';

/* ───── Config Maps ───── */
const priorityConfig: Record<TaskPriority, { label: string; color: string; bg: string; border: string; icon: string; gradient: string }> = {
  low: { label: 'Baixa', color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', icon: '🟢', gradient: 'from-slate-400 to-slate-500' },
  medium: { label: 'Média', color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: '🔵', gradient: 'from-blue-400 to-blue-500' },
  high: { label: 'Alta', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', icon: '🟠', gradient: 'from-amber-400 to-amber-500' },
  urgent: { label: 'Urgente', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: '🔴', gradient: 'from-red-400 to-red-500' },
};

const statusConfig: Record<TaskStatus, { label: string; icon: React.ElementType; color: string; gradient: string; dotColor: string; bgLight: string }> = {
  todo: { label: 'A Fazer', icon: Circle, color: 'text-gray-500', gradient: 'from-gray-50 to-gray-100', dotColor: 'bg-gray-400', bgLight: 'bg-gray-50' },
  in_progress: { label: 'Em Andamento', icon: AlertCircle, color: 'text-blue-500', gradient: 'from-blue-50 to-blue-100', dotColor: 'bg-blue-500', bgLight: 'bg-blue-50' },
  done: { label: 'Concluída', icon: CheckCircle2, color: 'text-green-500', gradient: 'from-green-50 to-green-100', dotColor: 'bg-green-500', bgLight: 'bg-green-50' },
};

const priorityOrder: TaskPriority[] = ['urgent', 'high', 'medium', 'low'];

const teamMembers = [
  { id: 'u1', name: 'Carlos Silva' },
  { id: 'u2', name: 'Ana Oliveira' },
  { id: 'u3', name: 'Pedro Santos' },
  { id: 'u4', name: 'Maria Costa' },
  { id: 'u5', name: 'Lucas Ferreira' },
];

/* ───── Date helpers ───── */
function isOverdue(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d < now;
}

function daysUntil(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDueLabel(dateStr: string, status: TaskStatus) {
  if (status === 'done') return 'Concluída';
  const days = daysUntil(dateStr);
  if (days < 0) return `${Math.abs(days)}d atrasada`;
  if (days === 0) return 'Vence hoje';
  if (days === 1) return 'Vence amanhã';
  return `${days} dias restantes`;
}

function getDueLabelColor(dateStr: string, status: TaskStatus) {
  if (status === 'done') return 'text-green-600 bg-green-50';
  const days = daysUntil(dateStr);
  if (days < 0) return 'text-red-600 bg-red-50';
  if (days === 0) return 'text-amber-600 bg-amber-50';
  if (days <= 2) return 'text-amber-600 bg-amber-50';
  return 'text-gray-500 bg-gray-50';
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

/* ───── Statistics Card ───── */
function StatCard({ icon: Icon, label, value, subValue, color, gradient }: {
  icon: React.ElementType; label: string; value: string | number; subValue?: string; color: string; gradient: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-4 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br', gradient)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
        <span className="text-[10px] font-medium text-gray-400">{subValue}</span>
      </div>
      <p className="mt-3 text-2xl font-extrabold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
    </motion.div>
  );
}

/* ───── Create/Edit Task Modal ───── */
function TaskFormModal({ task, onClose, onSave, mode }: { 
  task?: Task; 
  onClose: () => void; 
  onSave: (data: Partial<Task>) => void;
  mode: 'create' | 'edit';
}) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    priority: (task?.priority || 'medium') as TaskPriority,
    status: (task?.status || 'todo') as TaskStatus,
    dueDate: task?.dueDate || getTodayStr(),
    assignedTo: task?.assignedTo || 'u3',
    assignedName: task?.assignedName || 'Pedro Santos',
    leadName: task?.leadName || '',
    tags: task?.tags || [],
    estimatedHours: task?.estimatedHours || 1,
  });
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const handleChange = (field: string, value: string | number | string[]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: false }));
  };

  const handleAssigneeChange = (userId: string) => {
    const member = teamMembers.find(m => m.id === userId);
    setForm(prev => ({ ...prev, assignedTo: userId, assignedName: member?.name || '' }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      handleChange('tags', [...form.tags, newTag.trim()]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    handleChange('tags', form.tags.filter(t => t !== tag));
  };

  const handleSave = () => {
    const newErrors: Record<string, boolean> = {};
    if (!form.title.trim()) newErrors.title = true;
    if (!form.dueDate) newErrors.dueDate = true;
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave({
      title: form.title,
      description: form.description,
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate,
      assignedTo: form.assignedTo,
      assignedName: form.assignedName,
      leadName: form.leadName || undefined,
      tags: form.tags,
      estimatedHours: form.estimatedHours,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200/60 px-6 py-4 bg-gradient-to-r from-brand-50 to-violet-50">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-lg shadow-brand-500/25">
              {mode === 'create' ? <Plus className="h-5 w-5 text-white" /> : <Edit3 className="h-5 w-5 text-white" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {mode === 'create' ? 'Nova Tarefa' : 'Editar Tarefa'}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                {mode === 'create' ? 'Preencha os detalhes da tarefa' : `ID: ${task?._id}`}
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-white/80 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-auto">
          {/* Title */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold text-gray-700">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={cn(
                'input-modern w-full rounded-xl px-4 py-3 text-sm text-gray-900',
                errors.title && 'ring-2 ring-red-500'
              )}
              placeholder="Ex: Follow-up com cliente"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold text-gray-700">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="input-modern w-full resize-none rounded-xl px-4 py-3 text-sm text-gray-900"
              placeholder="Descreva os detalhes da tarefa..."
            />
          </div>

          {/* Priority + Status row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-gray-700">Prioridade</label>
              <div className="grid grid-cols-4 gap-2">
                {priorityOrder.map(p => {
                  const config = priorityConfig[p];
                  return (
                    <motion.button
                      key={p}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleChange('priority', p)}
                      className={cn(
                        'relative flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-2.5 transition-all',
                        form.priority === p
                          ? `${config.bg} ${config.border} ${config.color}`
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      )}
                    >
                      <span className="text-base">{config.icon}</span>
                      <span className="text-[9px] font-bold">{config.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-gray-700">Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(statusConfig) as TaskStatus[]).map(s => {
                  const config = statusConfig[s];
                  const Icon = config.icon;
                  return (
                    <motion.button
                      key={s}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleChange('status', s)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 rounded-xl border-2 py-2.5 text-[10px] font-bold transition-all',
                        form.status === s
                          ? `bg-gradient-to-r ${config.gradient} ${config.color} border-current`
                          : 'border-gray-200 text-gray-400 hover:border-gray-300'
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {config.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Due date + Estimated Hours + Assignee row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-gray-700">
                Prazo <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className={cn(
                  'input-modern w-full rounded-xl px-4 py-3 text-sm text-gray-700',
                  errors.dueDate && 'ring-2 ring-red-500'
                )}
              />
            </div>
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-gray-700">Horas Estimadas</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={form.estimatedHours}
                onChange={(e) => handleChange('estimatedHours', parseFloat(e.target.value) || 1)}
                className="input-modern w-full rounded-xl px-4 py-3 text-sm text-gray-700"
              />
            </div>
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-gray-700">Responsável</label>
              <div className="relative">
                <select
                  value={form.assignedTo}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="input-modern w-full appearance-none rounded-xl px-4 py-3 pr-10 text-sm text-gray-700"
                >
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Lead association */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold text-gray-700">Lead Vinculado</label>
            <input
              type="text"
              value={form.leadName}
              onChange={(e) => handleChange('leadName', e.target.value)}
              className="input-modern w-full rounded-xl px-4 py-3 text-sm text-gray-700"
              placeholder="Nome do lead (opcional)"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold text-gray-700">Tags</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-50 border border-brand-200 px-2.5 py-1 text-[11px] font-medium text-brand-700"
                >
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 transition-colors">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="input-modern flex-1 rounded-xl px-4 py-2.5 text-sm text-gray-700"
                placeholder="Digite e pressione Enter"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddTag}
                className="rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
              >
                <Tag className="h-4 w-4" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200/60 px-6 py-4 bg-gray-50/50">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className="btn-primary flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
          >
            <Save className="h-4 w-4" />
            {mode === 'create' ? 'Criar Tarefa' : 'Salvar Alterações'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───── Quick View Panel ───── */
function QuickViewPanel({ task, onClose, onEdit, onDelete, onDuplicate }: {
  task: Task;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const { updateTaskStatus, updateTask } = useStore();
  const [activeTab, setActiveTab] = useState<'details' | 'subtasks' | 'notes' | 'activity'>('details');
  const [newSubtask, setNewSubtask] = useState('');
  const [newNote, setNewNote] = useState('');

  const pConfig = priorityConfig[task.priority];
  const overdue = task.status !== 'done' && isOverdue(task.dueDate);

  const subtasks = task.subtasks || [];
  const notes = task.notes || [];
  const activities = task.activities || [];
  const completedSubtasks = subtasks.filter(s => s.completed).length;

  const handleToggleSubtask = (subtaskId: string) => {
    const updated = subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
    updateTask(task._id, { subtasks: updated });
  };

  // Suppress unused warning for updateTaskStatus
  void updateTaskStatus;

  const handleAddSubtask = () => {
    if (!newSubtask.trim()) return;
    const updated: TaskSubtask[] = [...subtasks, { id: `st_${Date.now()}`, title: newSubtask.trim(), completed: false }];
    updateTask(task._id, { subtasks: updated });
    setNewSubtask('');
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    const updated = subtasks.filter(s => s.id !== subtaskId);
    updateTask(task._id, { subtasks: updated });
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const updated: TaskNote[] = [...notes, { 
      id: `n_${Date.now()}`, 
      content: newNote.trim(), 
      author: 'Você', 
      createdAt: new Date().toLocaleString('pt-BR') 
    }];
    updateTask(task._id, { notes: updated });
    setNewNote('');
  };

  const handleDeleteNote = (noteId: string) => {
    const updated = notes.filter(n => n.id !== noteId);
    updateTask(task._id, { notes: updated });
  };

  const tabs = [
    { id: 'details', label: 'Detalhes', icon: FileText },
    { id: 'subtasks', label: `Subtarefas (${completedSubtasks}/${subtasks.length})`, icon: ListTodo },
    { id: 'notes', label: `Notas (${notes.length})`, icon: MessageSquare },
    { id: 'activity', label: 'Atividade', icon: Clock },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md bg-white shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-gray-200/60 bg-white/90 backdrop-blur-xl">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg', pConfig.gradient)}>
                <Flag className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Detalhes da Tarefa</h3>
                <p className="text-[11px] text-gray-500 font-medium">Visualização completa</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>

          {/* Tabs */}
          <div className="flex px-5 gap-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={cn(
                    'relative flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold transition-colors rounded-t-lg',
                    activeTab === tab.id ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
                  )}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="quickViewTabTask"
                      className="absolute inset-0 rounded-t-lg bg-brand-50"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 space-y-5">
          <AnimatePresence mode="wait">
            {activeTab === 'details' && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-5"
              >
                {/* Title + Priority */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-extrabold text-gray-900 leading-tight">{task.title}</h2>
                    <span className={cn('shrink-0 rounded-xl border px-3 py-1 text-[10px] font-bold', pConfig.bg, pConfig.color, pConfig.border)}>
                      {pConfig.icon} {pConfig.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500 leading-relaxed">{task.description}</p>
                </div>

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {task.tags.map(tag => (
                      <span key={tag} className="rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Status Changer */}
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-2">Status</p>
                  <div className="flex gap-2">
                    {(Object.keys(statusConfig) as TaskStatus[]).map(s => {
                      const sc = statusConfig[s];
                      const Icon = sc.icon;
                      const isActive = task.status === s;
                      return (
                        <motion.button
                          key={s}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => updateTaskStatus(task._id, s)}
                          className={cn(
                            'relative flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all border-2',
                            isActive
                              ? `${sc.color} bg-gradient-to-r ${sc.gradient} border-current`
                              : 'text-gray-400 border-gray-200/80 hover:border-gray-300 hover:bg-gray-50'
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {sc.label}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Due Date Card */}
                <div className={cn(
                  'rounded-2xl border p-4',
                  overdue ? 'border-red-200 bg-red-50/50' : 'border-gray-200 bg-gray-50/50'
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl',
                        overdue ? 'bg-red-100' : 'bg-gray-100'
                      )}>
                        <Calendar className={cn('h-5 w-5', overdue ? 'text-red-500' : 'text-gray-500')} />
                      </div>
                      <div>
                        <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Prazo</p>
                        <p className={cn('text-sm font-bold', overdue ? 'text-red-600' : 'text-gray-900')}>{task.dueDate}</p>
                      </div>
                    </div>
                    <span className={cn('rounded-xl px-3 py-1.5 text-[10px] font-bold', getDueLabelColor(task.dueDate, task.status))}>
                      {formatDueLabel(task.dueDate, task.status)}
                    </span>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
                    <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold flex items-center gap-1">
                      <User className="h-2.5 w-2.5" /> Responsável
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-100 to-violet-100 text-[9px] font-bold text-brand-700">
                        {task.assignedName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <p className="text-xs font-semibold text-gray-700">{task.assignedName}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
                    <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold flex items-center gap-1">
                      <Timer className="h-2.5 w-2.5" /> Estimado
                    </p>
                    <p className="mt-2 text-xs font-semibold text-gray-700">{task.estimatedHours || 1}h</p>
                  </div>
                </div>

                {/* Lead Association */}
                {task.leadName && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-2">Lead Vinculado</p>
                    <div className="flex items-center gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-3.5 cursor-pointer hover:bg-brand-50 transition-colors">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 text-[10px] font-bold text-white shadow-md shadow-brand-500/20">
                        {task.leadName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900">{task.leadName}</p>
                        <p className="text-[10px] text-brand-600 font-medium flex items-center gap-1">
                          <Link2 className="h-3 w-3" /> Ver no CRM
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-brand-400" />
                    </div>
                  </div>
                )}

                {/* Subtasks Progress */}
                {subtasks.length > 0 && (
                  <div>
                    <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-2">Progresso</p>
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-600">{completedSubtasks} de {subtasks.length} subtarefas</span>
                        <span className="text-xs font-bold text-brand-600">{Math.round((completedSubtasks / subtasks.length) * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'subtasks' && (
              <motion.div
                key="subtasks"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {/* Add Subtask */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtask}
                    onChange={(e) => setNewSubtask(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                    className="input-modern flex-1 rounded-xl px-4 py-2.5 text-sm"
                    placeholder="Nova subtarefa..."
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddSubtask}
                    className="btn-primary rounded-xl px-4"
                  >
                    <Plus className="h-4 w-4" />
                  </motion.button>
                </div>

                {/* Subtasks List */}
                <div className="space-y-2">
                  <AnimatePresence>
                    {subtasks.map((subtask, i) => (
                      <motion.div
                        key={subtask.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                          'group flex items-center gap-3 rounded-xl border p-3 transition-all',
                          subtask.completed ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleToggleSubtask(subtask.id)}
                          className={cn(
                            'flex h-5 w-5 items-center justify-center rounded-md transition-colors',
                            subtask.completed ? 'bg-green-500 text-white' : 'border-2 border-gray-300 hover:border-brand-400'
                          )}
                        >
                          {subtask.completed && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </motion.button>
                        <span className={cn(
                          'flex-1 text-sm transition-all',
                          subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'
                        )}>
                          {subtask.title}
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteSubtask(subtask.id)}
                          className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {subtasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                      <ListTodo className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-500">Nenhuma subtarefa</p>
                    <p className="text-xs text-gray-400">Adicione subtarefas para organizar melhor</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'notes' && (
              <motion.div
                key="notes"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                {/* Add Note */}
                <div className="space-y-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    className="input-modern w-full resize-none rounded-xl px-4 py-3 text-sm"
                    placeholder="Adicionar uma nota..."
                  />
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddNote}
                    disabled={!newNote.trim()}
                    className="btn-primary w-full rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50"
                  >
                    <MessageSquare className="h-4 w-4 mr-2 inline" />
                    Adicionar Nota
                  </motion.button>
                </div>

                {/* Notes List */}
                <div className="space-y-3">
                  <AnimatePresence>
                    {notes.map((note, i) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.05 }}
                        className="group rounded-xl border border-amber-200 bg-amber-50/50 p-4"
                      >
                        <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px] text-gray-500">
                            <span className="font-semibold text-amber-700">{note.author}</span>
                            <span>•</span>
                            <span>{note.createdAt}</span>
                          </div>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteNote(note.id)}
                            className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {notes.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                      <MessageSquare className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-500">Nenhuma nota</p>
                    <p className="text-xs text-gray-400">Adicione notas para registrar informações</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div
                key="activity"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-0"
              >
                {activities.map((activity, i) => (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.06 }}
                    className="flex gap-3"
                  >
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full mt-1.5 ring-4 ring-white bg-brand-500" />
                      {i < activities.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-xs font-medium text-gray-700">{activity.action}</p>
                      {activity.details && (
                        <p className="text-[11px] text-gray-500 mt-0.5">{activity.details}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <User className="h-2.5 w-2.5" /> {activity.user} • {activity.timestamp}
                      </p>
                    </div>
                  </motion.div>
                ))}

                {activities.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                      <Clock className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="mt-3 text-sm font-medium text-gray-500">Nenhuma atividade</p>
                    <p className="text-xs text-gray-400">O histórico aparecerá aqui</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 border-t border-gray-200/60 bg-white/90 backdrop-blur-xl p-4">
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onEdit}
              className="btn-primary flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white"
            >
              <Edit3 className="h-4 w-4" /> Editar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onDuplicate}
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Copy className="h-4 w-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onDelete}
              className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───── Delete Confirmation ───── */
function DeleteConfirmModal({ title, count, onClose, onConfirm }: { 
  title: string; 
  count?: number;
  onClose: () => void; 
  onConfirm: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
          <Trash2 className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-gray-900">
          {count ? `Excluir ${count} tarefas?` : 'Excluir tarefa?'}
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          {count 
            ? `Tem certeza que deseja excluir ${count} tarefas selecionadas? Esta ação não pode ser desfeita.`
            : <>Tem certeza que deseja excluir "<span className="font-semibold text-gray-700">{title}</span>"? Esta ação não pode ser desfeita.</>
          }
        </p>
        <div className="mt-6 flex gap-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/25"
          >
            Sim, excluir
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───── Filters Panel ───── */
function FiltersPanel({ 
  filters, 
  setFilters, 
  onClose,
  taskCount 
}: { 
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  onClose: () => void;
  taskCount: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md bg-white shadow-2xl overflow-auto"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-violet-100">
              <Filter className="h-5 w-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Filtros</h3>
              <p className="text-[11px] text-gray-500">{taskCount} tarefas encontradas</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        <div className="p-6 space-y-6">
          {/* Priority */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-700">Prioridade</label>
            <div className="flex flex-wrap gap-2">
              {['all', ...priorityOrder].map(p => {
                const isAll = p === 'all';
                const config = isAll ? null : priorityConfig[p as TaskPriority];
                const isActive = filters.priority === p;
                return (
                  <motion.button
                    key={p}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFilters({ ...filters, priority: p as TaskPriority | 'all' })}
                    className={cn(
                      'rounded-xl border px-4 py-2 text-xs font-semibold transition-all',
                      isActive
                        ? isAll 
                          ? 'border-brand-400 bg-brand-50 text-brand-700'
                          : `${config!.border} ${config!.bg} ${config!.color}`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    )}
                  >
                    {isAll ? 'Todas' : `${config!.icon} ${config!.label}`}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-700">Status</label>
            <div className="flex flex-wrap gap-2">
              {['all', ...Object.keys(statusConfig)].map(s => {
                const isAll = s === 'all';
                const config = isAll ? null : statusConfig[s as TaskStatus];
                const isActive = filters.status === s;
                return (
                  <motion.button
                    key={s}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setFilters({ ...filters, status: s as TaskStatus | 'all' })}
                    className={cn(
                      'rounded-xl border px-4 py-2 text-xs font-semibold transition-all',
                      isActive
                        ? isAll 
                          ? 'border-brand-400 bg-brand-50 text-brand-700'
                          : `border-current bg-gradient-to-r ${config!.gradient} ${config!.color}`
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    )}
                  >
                    {isAll ? 'Todos' : config!.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-700">Responsável</label>
            <div className="flex flex-wrap gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFilters({ ...filters, assignee: 'all' })}
                className={cn(
                  'rounded-xl border px-4 py-2 text-xs font-semibold transition-all',
                  filters.assignee === 'all'
                    ? 'border-brand-400 bg-brand-50 text-brand-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                )}
              >
                Todos
              </motion.button>
              {teamMembers.map(m => (
                <motion.button
                  key={m.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFilters({ ...filters, assignee: m.id })}
                  className={cn(
                    'flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-all',
                    filters.assignee === m.id
                      ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-violet-100 text-[8px] font-bold text-brand-700">
                    {m.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  {m.name.split(' ')[0]}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-700">Período</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] text-gray-500">De</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="input-modern w-full rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] text-gray-500">Até</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="input-modern w-full rounded-xl px-4 py-2.5 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Has Lead */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-700">Lead Vinculado</label>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Todos' },
                { value: 'yes', label: 'Com lead' },
                { value: 'no', label: 'Sem lead' },
              ].map(opt => (
                <motion.button
                  key={opt.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFilters({ ...filters, hasLead: opt.value as 'all' | 'yes' | 'no' })}
                  className={cn(
                    'rounded-xl border px-4 py-2 text-xs font-semibold transition-all',
                    filters.hasLead === opt.value
                      ? 'border-brand-400 bg-brand-50 text-brand-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Overdue */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.overdueOnly}
                onChange={(e) => setFilters({ ...filters, overdueOnly: e.target.checked })}
                className="h-5 w-5 rounded-lg border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm font-medium text-gray-700">Apenas atrasadas</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-white p-6">
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setFilters({
                priority: 'all',
                status: 'all',
                assignee: 'all',
                dateFrom: '',
                dateTo: '',
                hasLead: 'all',
                overdueOnly: false,
              })}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4 inline mr-2" />
              Limpar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onClose}
              className="flex-1 btn-primary rounded-xl px-4 py-3 text-sm font-semibold"
            >
              Aplicar ({taskCount})
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ───── Calendar View ───── */
function CalendarView({ tasks, onTaskClick }: { tasks: Task[]; onTaskClick: (id: string) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const daysInMonth = lastDay.getDate();
  
  const days = [];
  for (let i = 0; i < startPadding; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getTasksForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.dueDate === dateStr);
  };

  const today = new Date();
  const isToday = (day: number) => 
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        </h3>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentDate(new Date(year, month - 1))}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentDate(new Date())}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-brand-600 hover:bg-brand-50"
          >
            Hoje
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentDate(new Date(year, month + 1))}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
          >
            <ChevronRight className="h-5 w-5" />
          </motion.button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="text-center text-[11px] font-semibold text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="h-24" />;
          }
          
          const dayTasks = getTasksForDay(day);
          const hasOverdue = dayTasks.some(t => t.status !== 'done' && isOverdue(t.dueDate));
          
          return (
            <div
              key={day}
              className={cn(
                'h-24 rounded-xl border p-1.5 transition-all overflow-hidden',
                isToday(day) 
                  ? 'border-brand-400 bg-brand-50/50' 
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50',
                hasOverdue && 'border-red-300 bg-red-50/30'
              )}
            >
              <div className={cn(
                'text-xs font-semibold mb-1',
                isToday(day) ? 'text-brand-600' : 'text-gray-600'
              )}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map(task => (
                  <motion.div
                    key={task._id}
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onTaskClick(task._id)}
                    className={cn(
                      'truncate rounded px-1.5 py-0.5 text-[9px] font-medium cursor-pointer',
                      priorityConfig[task.priority].bg,
                      priorityConfig[task.priority].color
                    )}
                  >
                    {task.title}
                  </motion.div>
                ))}
                {dayTasks.length > 3 && (
                  <div className="text-[9px] text-gray-400 font-medium px-1">
                    +{dayTasks.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ───── Filter State Type ───── */
interface FilterState {
  priority: TaskPriority | 'all';
  status: TaskStatus | 'all';
  assignee: string;
  dateFrom: string;
  dateTo: string;
  hasLead: 'all' | 'yes' | 'no';
  overdueOnly: boolean;
}

/* ───── Main TasksPage ───── */
export function TasksPage() {
  const { tasks, updateTaskStatus, updateTask, addTask, deleteTask } = useStore();
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'calendar'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title' | 'createdAt'>('dueDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    priority: 'all',
    status: 'all',
    assignee: 'all',
    dateFrom: '',
    dateTo: '',
    hasLead: 'all',
    overdueOnly: false,
  });
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  // Quick View
  const [quickViewTaskId, setQuickViewTaskId] = useState<string | null>(null);
  
  // Cleanup overlays on unmount
  useEffect(() => {
    return () => {
      setTimeout(() => forceCleanup(), 50);
    };
  }, []);
  
  // Drag state
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<string | null>(null);

  // Filter + Sort logic
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(t => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.description.toLowerCase().includes(q)) {
          return false;
        }
      }
      // Priority
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
      // Status
      if (filters.status !== 'all' && t.status !== filters.status) return false;
      // Assignee
      if (filters.assignee !== 'all' && t.assignedTo !== filters.assignee) return false;
      // Date range
      if (filters.dateFrom && t.dueDate < filters.dateFrom) return false;
      if (filters.dateTo && t.dueDate > filters.dateTo) return false;
      // Has lead
      if (filters.hasLead === 'yes' && !t.leadName) return false;
      if (filters.hasLead === 'no' && t.leadName) return false;
      // Overdue
      if (filters.overdueOnly && (t.status === 'done' || !isOverdue(t.dueDate))) return false;
      
      return true;
    });

    // Sort
    const priorityValue: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'dueDate':
          cmp = a.dueDate.localeCompare(b.dueDate);
          break;
        case 'priority':
          cmp = priorityValue[b.priority] - priorityValue[a.priority];
          break;
        case 'title':
          cmp = a.title.localeCompare(b.title);
          break;
        case 'createdAt':
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [tasks, searchQuery, filters, sortBy, sortDir]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.priority !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.assignee !== 'all') count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.hasLead !== 'all') count++;
    if (filters.overdueOnly) count++;
    return count;
  }, [filters]);

  const columns: TaskStatus[] = ['todo', 'in_progress', 'done'];

  const quickViewTask = quickViewTaskId ? tasks.find(t => t._id === quickViewTaskId) : null;
  const editingTask = editingTaskId ? tasks.find(t => t._id === editingTaskId) : null;
  const deletingTask = deletingTaskId ? tasks.find(t => t._id === deletingTaskId) : null;

  // Stats
  const stats = useMemo(() => ({
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.status !== 'done' && isOverdue(t.dueDate)).length,
    dueToday: tasks.filter(t => t.status !== 'done' && daysUntil(t.dueDate) === 0).length,
    completedThisWeek: tasks.filter(t => t.status === 'done').length, // Simplified
  }), [tasks]);

  // Handlers
  const handleCreateTask = (data: Partial<Task>) => {
    const newTask: Task = {
      _id: `t_${Date.now()}`,
      organizationId: 'org_1',
      title: data.title || '',
      description: data.description || '',
      assignedTo: data.assignedTo || 'u3',
      assignedName: data.assignedName || 'Pedro Santos',
      leadId: undefined,
      leadName: data.leadName,
      priority: data.priority || 'medium',
      status: data.status || 'todo',
      dueDate: data.dueDate || getTodayStr(),
      createdAt: getTodayStr(),
      tags: data.tags || [],
      estimatedHours: data.estimatedHours || 1,
      subtasks: [],
      notes: [],
      activities: [{ id: `a_${Date.now()}`, action: 'Tarefa criada', user: 'Você', timestamp: new Date().toLocaleString('pt-BR') }],
    };
    addTask(newTask);
  };

  const handleUpdateTask = (data: Partial<Task>) => {
    if (editingTaskId) {
      updateTask(editingTaskId, data);
    }
  };

  const handleDeleteTask = () => {
    if (deletingTaskId) {
      deleteTask(deletingTaskId);
      if (quickViewTaskId === deletingTaskId) setQuickViewTaskId(null);
      setDeletingTaskId(null);
    }
  };

  const handleDuplicateTask = (taskId: string) => {
    const original = tasks.find(t => t._id === taskId);
    if (!original) return;
    
    const duplicate: Task = {
      ...original,
      _id: `t_${Date.now()}`,
      title: `${original.title} (cópia)`,
      status: 'todo',
      createdAt: getTodayStr(),
      completedAt: undefined,
      activities: [{ id: `a_${Date.now()}`, action: 'Tarefa duplicada', user: 'Você', timestamp: new Date().toLocaleString('pt-BR') }],
    };
    addTask(duplicate);
  };

  const handleToggleSelect = (taskId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map(t => t._id)));
    }
  };

  const handleBulkDelete = () => {
    selectedIds.forEach(id => deleteTask(id));
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
    if (quickViewTaskId && selectedIds.has(quickViewTaskId)) {
      setQuickViewTaskId(null);
    }
  };

  const handleBulkStatusChange = (status: TaskStatus) => {
    selectedIds.forEach(id => updateTaskStatus(id, status));
    setSelectedIds(new Set());
  };

  const handleExportCSV = () => {
    const headers = ['Título', 'Descrição', 'Prioridade', 'Status', 'Responsável', 'Prazo', 'Lead'];
    const rows = filteredTasks.map(t => [
      t.title,
      t.description,
      priorityConfig[t.priority].label,
      statusConfig[t.status].label,
      t.assignedName,
      t.dueDate,
      t.leadName || '',
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tarefas.csv';
    a.click();
  };

  // Cleanup
  useEffect(() => {
    if (quickViewTaskId && !tasks.find(t => t._id === quickViewTaskId)) {
      setQuickViewTaskId(null);
    }
  }, [tasks, quickViewTaskId]);

  return (
    <div className="flex h-full flex-col">
      {/* Stats Cards */}
      <div className="grid grid-cols-6 gap-4 p-6 pb-0">
        <StatCard icon={ListTodo} label="Total" value={stats.total} color="text-brand-600" gradient="from-brand-100 to-violet-100" />
        <StatCard icon={Circle} label="A Fazer" value={stats.todo} color="text-gray-600" gradient="from-gray-100 to-gray-200" />
        <StatCard icon={Play} label="Em Andamento" value={stats.inProgress} color="text-blue-600" gradient="from-blue-100 to-blue-200" />
        <StatCard icon={CheckCircle2} label="Concluídas" value={stats.done} subValue={`${Math.round((stats.done / stats.total) * 100)}%`} color="text-green-600" gradient="from-green-100 to-green-200" />
        <StatCard icon={AlertCircle} label="Atrasadas" value={stats.overdue} color="text-red-600" gradient="from-red-100 to-red-200" />
        <StatCard icon={Calendar} label="Vencem Hoje" value={stats.dueToday} color="text-amber-600" gradient="from-amber-100 to-amber-200" />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl px-6 py-4 mt-4">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tarefas..."
              className="input-modern w-64 rounded-xl pl-10 pr-4 py-2.5 text-sm"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="border-0 bg-transparent text-xs text-gray-600 font-medium focus:outline-none cursor-pointer"
            >
              <option value="dueDate">Prazo</option>
              <option value="priority">Prioridade</option>
              <option value="title">Título</option>
              <option value="createdAt">Criação</option>
            </select>
            <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')} className="text-gray-400 hover:text-gray-600">
              {sortDir === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </button>
          </div>

          {/* Filters Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFilters(true)}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
              activeFiltersCount > 0
                ? 'border-brand-400 bg-brand-50 text-brand-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            <Filter className="h-4 w-4" />
            Filtros
            {activeFiltersCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {activeFiltersCount}
              </span>
            )}
          </motion.button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle */}
          <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-50">
            {[
              { mode: 'kanban', icon: LayoutGrid, label: 'Kanban' },
              { mode: 'list', icon: ListTodo, label: 'Lista' },
              { mode: 'calendar', icon: CalendarDays, label: 'Calendário' },
            ].map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode as typeof viewMode)}
                className={cn(
                  'relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                  viewMode === mode ? 'text-white' : 'text-gray-500'
                )}
              >
                {viewMode === mode && (
                  <motion.div
                    layoutId="taskViewMode"
                    className="absolute inset-0 rounded-lg gradient-brand"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* Export */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Exportar
          </motion.button>

          {/* New Task */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Nova Tarefa
          </motion.button>
        </div>
      </div>

      {/* Active Filters */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 px-6 py-2 bg-brand-50/50 border-b border-brand-100">
          <span className="text-xs font-medium text-brand-700">Filtros ativos:</span>
          <div className="flex flex-wrap gap-1.5">
            {filters.priority !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-brand-200 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                {priorityConfig[filters.priority].icon} {priorityConfig[filters.priority].label}
                <button onClick={() => setFilters({ ...filters, priority: 'all' })} className="hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.status !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-brand-200 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                {statusConfig[filters.status].label}
                <button onClick={() => setFilters({ ...filters, status: 'all' })} className="hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.assignee !== 'all' && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-brand-200 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                {teamMembers.find(m => m.id === filters.assignee)?.name}
                <button onClick={() => setFilters({ ...filters, assignee: 'all' })} className="hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.overdueOnly && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-red-200 px-2 py-0.5 text-[11px] font-medium text-red-700">
                Atrasadas
                <button onClick={() => setFilters({ ...filters, overdueOnly: false })} className="hover:text-red-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
          <button
            onClick={() => setFilters({
              priority: 'all', status: 'all', assignee: 'all',
              dateFrom: '', dateTo: '', hasLead: 'all', overdueOnly: false,
            })}
            className="ml-auto text-xs font-medium text-brand-600 hover:text-brand-800"
          >
            Limpar todos
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 gradient-mesh">
          {viewMode === 'calendar' ? (
            <CalendarView tasks={filteredTasks} onTaskClick={setQuickViewTaskId} />
          ) : viewMode === 'kanban' ? (
            <div className="grid grid-cols-3 gap-5 h-full">
              {columns.map(status => {
                const config = statusConfig[status];
                const Icon = config.icon;
                const colTasks = filteredTasks.filter(t => t.status === status);
                return (
                  <div
                    key={status}
                    className={cn(
                      'flex flex-col rounded-2xl border-2 transition-all duration-200',
                      dragOverCol === status ? 'border-brand-400 bg-brand-50/60 scale-[1.005]' : 'border-gray-200/60 bg-white/40 backdrop-blur-sm'
                    )}
                    onDragOver={(e) => { e.preventDefault(); setDragOverCol(status); }}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={() => {
                      if (draggedTask) updateTaskStatus(draggedTask, status);
                      setDraggedTask(null);
                      setDragOverCol(null);
                    }}
                  >
                    {/* Column Header */}
                    <div className={cn('flex items-center gap-2.5 p-4 rounded-t-2xl bg-gradient-to-r', config.gradient)}>
                      <Icon className={cn('h-5 w-5', config.color)} />
                      <h3 className="text-[13px] font-bold text-gray-900">{config.label}</h3>
                      <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm text-[10px] font-bold text-gray-600">
                        {colTasks.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 space-y-2.5 overflow-auto p-3" style={{ maxHeight: 'calc(100vh - 380px)' }}>
                      <AnimatePresence>
                        {colTasks.map((task, i) => {
                          const pConfig = priorityConfig[task.priority];
                          const overdue = status !== 'done' && isOverdue(task.dueDate);
                          const isSelected = quickViewTaskId === task._id;
                          const isChecked = selectedIds.has(task._id);
                          const subtasks = task.subtasks || [];
                          const completedSubtasks = subtasks.filter(s => s.completed).length;
                          
                          return (
                            <motion.div
                              key={task._id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
                              transition={{ delay: i * 0.04 }}
                              draggable
                              onDragStart={() => setDraggedTask(task._id)}
                              whileHover={{ y: -2, transition: { duration: 0.15 } }}
                              className={cn(
                                'group cursor-grab rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md active:cursor-grabbing',
                                draggedTask === task._id ? 'opacity-40 rotate-2 scale-105' : '',
                                isSelected ? 'border-brand-400 ring-2 ring-brand-400/20 shadow-brand-100' : 'border-gray-200/80 hover:border-gray-300',
                                overdue ? 'border-l-[3px] border-l-red-400' : ''
                              )}
                            >
                              {/* Top row */}
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); handleToggleSelect(task._id); }}
                                    className={cn(
                                      'flex h-4 w-4 items-center justify-center rounded transition-colors',
                                      isChecked ? 'bg-brand-500 text-white' : 'border border-gray-300 hover:border-brand-400'
                                    )}
                                  >
                                    {isChecked && <CheckCircle2 className="h-3 w-3" />}
                                  </motion.button>
                                  <span className={cn('rounded-lg border px-2 py-0.5 text-[9px] font-bold', pConfig.bg, pConfig.color, pConfig.border)}>
                                    {pConfig.icon} {pConfig.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <motion.button
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); setQuickViewTaskId(task._id); }}
                                    className="rounded-lg p-1 text-gray-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); setEditingTaskId(task._id); }}
                                    className="rounded-lg p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </motion.button>
                                  <motion.button
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => { e.stopPropagation(); setDeletingTaskId(task._id); }}
                                    className="rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </motion.button>
                                </div>
                              </div>

                              {/* Title */}
                              <h4 
                                className="mt-2.5 text-[13px] font-semibold text-gray-900 pr-2 leading-snug cursor-pointer hover:text-brand-600"
                                onClick={() => setQuickViewTaskId(task._id)}
                              >
                                {task.title}
                              </h4>
                              <p className="mt-1 text-[11px] text-gray-500 line-clamp-2">{task.description}</p>

                              {/* Tags */}
                              {task.tags && task.tags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {task.tags.slice(0, 2).map(tag => (
                                    <span key={tag} className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-medium text-gray-500">
                                      #{tag}
                                    </span>
                                  ))}
                                  {task.tags.length > 2 && (
                                    <span className="text-[9px] text-gray-400">+{task.tags.length - 2}</span>
                                  )}
                                </div>
                              )}

                              {/* Subtasks Progress */}
                              {subtasks.length > 0 && (
                                <div className="mt-2.5">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] text-gray-400">{completedSubtasks}/{subtasks.length} subtarefas</span>
                                  </div>
                                  <div className="h-1 rounded-full bg-gray-200 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500 transition-all duration-300"
                                      style={{ width: `${(completedSubtasks / subtasks.length) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Lead */}
                              {task.leadName && (
                                <div className="mt-2.5 flex items-center gap-1 text-[10px] text-brand-600 font-semibold">
                                  <Flag className="h-3 w-3" />{task.leadName}
                                </div>
                              )}

                              {/* Bottom row */}
                              <div className="mt-3 flex items-center justify-between">
                                <span className={cn(
                                  'flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold',
                                  getDueLabelColor(task.dueDate, task.status)
                                )}>
                                  <Calendar className="h-3 w-3" />
                                  {overdue ? formatDueLabel(task.dueDate, task.status) : formatDate(task.dueDate)}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {task.estimatedHours && (
                                    <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                                      <Timer className="h-3 w-3" />{task.estimatedHours}h
                                    </span>
                                  )}
                                  <div 
                                    className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 text-[8px] font-bold text-gray-500"
                                    title={task.assignedName}
                                  >
                                    {task.assignedName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      {colTasks.length === 0 && (
                        <div className="flex h-28 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 text-xs text-gray-400 font-medium">
                          {dragOverCol === status ? '✨ Solte aqui' : 'Nenhuma tarefa'}
                        </div>
                      )}
                    </div>

                    {/* Add Task Button */}
                    <div className="p-3 pt-0">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setShowCreateModal(true)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-xs font-medium text-gray-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/50 transition-colors"
                      >
                        <Plus className="h-4 w-4" /> Adicionar tarefa
                      </motion.button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* List View */
            <div className="card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80">
                    <th className="px-4 py-3.5 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredTasks.length && filteredTasks.length > 0}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-gray-300 text-brand-600"
                      />
                    </th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tarefa</th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Lead</th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Responsável</th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Prioridade</th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Prazo</th>
                    <th className="px-4 py-3.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredTasks.map((task, i) => {
                      const pConfig = priorityConfig[task.priority];
                      const sConfig = statusConfig[task.status];
                      const SIcon = sConfig.icon;
                      const overdue = task.status !== 'done' && isOverdue(task.dueDate);
                      const isSelected = quickViewTaskId === task._id;
                      const isChecked = selectedIds.has(task._id);
                      
                      return (
                        <motion.tr
                          key={task._id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: i * 0.02 }}
                          className={cn(
                            'border-b border-gray-100 transition-colors group',
                            isSelected ? 'bg-brand-50/50' : 'hover:bg-brand-50/30',
                            overdue ? 'border-l-[3px] border-l-red-400' : '',
                            isChecked && 'bg-brand-50/30'
                          )}
                        >
                          <td className="px-4 py-3.5">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleSelect(task._id)}
                              className="h-4 w-4 rounded border-gray-300 text-brand-600"
                            />
                          </td>
                          <td className="px-4 py-3.5">
                            <p 
                              className="text-[13px] font-semibold text-gray-900 cursor-pointer hover:text-brand-600"
                              onClick={() => setQuickViewTaskId(task._id)}
                            >
                              {task.title}
                            </p>
                            <p className="text-[11px] text-gray-500 line-clamp-1">{task.description}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            {task.leadName ? (
                              <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-600">
                                <Flag className="h-3 w-3" />{task.leadName}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-brand-100 to-violet-100 text-[8px] font-bold text-brand-700">
                                {task.assignedName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <span className="text-xs text-gray-600 font-medium">{task.assignedName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn('rounded-lg border px-2.5 py-0.5 text-[10px] font-bold', pConfig.bg, pConfig.color, pConfig.border)}>
                              {pConfig.icon} {pConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn('flex items-center gap-1 text-xs font-semibold', sConfig.color)}>
                              <SIcon className="h-3.5 w-3.5" />{sConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={cn(
                              'flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-semibold w-fit',
                              getDueLabelColor(task.dueDate, task.status)
                            )}>
                              <Clock className="h-3 w-3" />
                              {formatDueLabel(task.dueDate, task.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-center gap-1">
                              <motion.button
                                whileHover={{ scale: 1.12 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setQuickViewTaskId(task._id)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-brand-50 hover:text-brand-600 transition-colors"
                              >
                                <Eye className="h-4 w-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.12 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setEditingTaskId(task._id)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              >
                                <Edit3 className="h-4 w-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.12 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDuplicateTask(task._id)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                              >
                                <Copy className="h-4 w-4" />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.12 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setDeletingTaskId(task._id)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
              
              {filteredTasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-100 to-violet-100">
                    <CheckCircle2 className="h-8 w-8 text-brand-600" />
                  </div>
                  <p className="mt-4 text-sm font-bold text-gray-900">Nenhuma tarefa encontrada</p>
                  <p className="text-xs text-gray-500 mt-1">Tente ajustar os filtros ou crie uma nova tarefa</p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowCreateModal(true)}
                    className="btn-primary mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    <Plus className="h-4 w-4" /> Nova Tarefa
                  </motion.button>
                </div>
              )}
            </div>
          )}
        </div>

      {/* Quick View Panel */}
      <AnimatePresence>
        {quickViewTask && (
          <QuickViewPanel
            key={quickViewTask._id}
            task={quickViewTask}
            onClose={() => setQuickViewTaskId(null)}
            onEdit={() => setEditingTaskId(quickViewTask._id)}
            onDelete={() => setDeletingTaskId(quickViewTask._id)}
            onDuplicate={() => handleDuplicateTask(quickViewTask._id)}
          />
        )}
      </AnimatePresence>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
          >
            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-3 shadow-2xl shadow-black/10">
              <span className="text-sm font-semibold text-gray-700">
                {selectedIds.size} {selectedIds.size === 1 ? 'tarefa' : 'tarefas'} selecionada{selectedIds.size > 1 && 's'}
              </span>
              <div className="h-6 w-px bg-gray-200" />
              
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => { if (e.target.value) handleBulkStatusChange(e.target.value as TaskStatus); e.target.value = ''; }}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  defaultValue=""
                >
                  <option value="" disabled>Mover para...</option>
                  <option value="todo">A Fazer</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="done">Concluída</option>
                </select>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </motion.button>
              </div>
              
              <div className="h-6 w-px bg-gray-200" />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedIds(new Set())}
                className="text-xs font-medium text-gray-500 hover:text-gray-700"
              >
                Cancelar
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showCreateModal && (
          <TaskFormModal
            mode="create"
            onClose={() => setShowCreateModal(false)}
            onSave={handleCreateTask}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingTask && (
          <TaskFormModal
            task={editingTask}
            mode="edit"
            onClose={() => setEditingTaskId(null)}
            onSave={handleUpdateTask}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingTask && (
          <DeleteConfirmModal
            title={deletingTask.title}
            onClose={() => setDeletingTaskId(null)}
            onConfirm={handleDeleteTask}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <DeleteConfirmModal
            title=""
            count={selectedIds.size}
            onClose={() => setShowBulkDeleteConfirm(false)}
            onConfirm={handleBulkDelete}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFilters && (
          <FiltersPanel
            filters={filters}
            setFilters={setFilters}
            onClose={() => setShowFilters(false)}
            taskCount={filteredTasks.length}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
