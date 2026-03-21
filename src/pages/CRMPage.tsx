import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../store';
// Default pipelines (empty until loaded from API)
const defaultPipelines = [
  {
    _id: 'pip_1',
    organizationId: '',
    name: 'Pipeline Principal',
    stages: [
      { _id: 's1', name: 'Novo', color: '#6366f1', order: 0 },
      { _id: 's2', name: 'Contato', color: '#8b5cf6', order: 1 },
      { _id: 's3', name: 'Proposta', color: '#f59e0b', order: 2 },
      { _id: 's4', name: 'Negociação', color: '#f97316', order: 3 },
      { _id: 's5', name: 'Fechamento', color: '#22c55e', order: 4 },
    ],
  },
];
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { forceCleanup } from '../utils/fixClickBlock';
import type { Lead, LeadStatus } from '../types';
import {
  Plus, Filter, Search, Phone, Mail, Star, Tag, ChevronDown, GripVertical,
  Eye, X, Calendar, Edit3, Trash2, Download, MoreHorizontal,
  MessageSquare, FileText, Clock, CheckCircle2, ArrowUpDown,
  Copy, ExternalLink, Send, Paperclip, StickyNote, UserPlus,
  ChevronRight, Users, Building2, Globe, Hash, XCircle, Check, Archive,
  Sparkles, Target, Zap, ArrowRight, DollarSign, Flame, LayoutGrid, List,
  Settings2
} from 'lucide-react';

type SortField = 'name' | 'score' | 'value' | 'createdAt';
type SortDir = 'asc' | 'desc';

const sourceOptions = ['Website', 'Google Ads', 'LinkedIn', 'Indicação', 'Evento', 'Facebook', 'Instagram', 'Outros'];
const statusLabels: Record<LeadStatus, string> = {
  new: 'Novo', contacted: 'Contatado', qualified: 'Qualificado',
  proposal: 'Proposta', negotiation: 'Negociação', won: 'Ganho', lost: 'Perdido',
};
const statusColors: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700', contacted: 'bg-purple-100 text-purple-700',
  qualified: 'bg-amber-100 text-amber-700', proposal: 'bg-orange-100 text-orange-700',
  negotiation: 'bg-cyan-100 text-cyan-700', won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-red-100 text-red-700',
};

const emptyLead: Omit<Lead, '_id'> = {
  organizationId: 'org_1', name: '', email: '', phone: '', company: '',
  source: 'Website', tags: [], pipelineId: 'pip_1', stageId: 's1',
  assignedTo: 'u3', status: 'new', score: 50, value: 0,
  createdAt: new Date().toISOString().split('T')[0], lastActivity: 'Agora', notes: '',
};

export function CRMPage() {
  const { leads, selectedPipelineId, setSelectedPipelineId, addLead, updateLead, deleteLead, moveLeadToStage, addCalendarEvent, currentPage, settingsUsers, currentUser } = useStore();

  // View state
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [draggedLead, setDraggedLead] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  // Modals
  const [showNewLead, setShowNewLead] = useState(false);
  const [editingLead, setEditingLead] = useState<string | null>(null);
  const [deletingLead, setDeletingLead] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Detail panel tabs
  const [detailTab, setDetailTab] = useState<'info' | 'notes' | 'timeline' | 'files'>('info');
  const [newNote, setNewNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [leadNotes, setLeadNotes] = useState<Record<string, Array<{ id: string; text: string; time: string; author: string }>>>({});

  // Filters
  const [filterSource, setFilterSource] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssigned, setFilterAssigned] = useState<string>('all');
  const [filterScoreMin, setFilterScoreMin] = useState(0);
  const [filterScoreMax, setFilterScoreMax] = useState(100);
  const [filterTag, setFilterTag] = useState('');

  // Sort
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Bulk
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Form
  const [formData, setFormData] = useState<Omit<Lead, '_id'>>(emptyLead);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Quick action dropdown
  const [quickActionLead, setQuickActionLead] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Schedule modal
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    type: 'meeting' as 'meeting' | 'call' | 'followup' | 'presentation',
    notes: ''
  });

  // Stage management
  const [showNewStage, setShowNewStage] = useState(false);
  const [editingStage, setEditingStage] = useState<string | null>(null);
  const [deletingStage, setDeletingStage] = useState<string | null>(null);
  const [stageFormData, setStageFormData] = useState({ name: '', color: '#6366f1' });

  // AI Insights modal
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiInsightsData, setAiInsightsData] = useState<{
    summary: string;
    hotLeads: Array<{ id: string; name: string; reason: string; score: number }>;
    coldLeads: Array<{ id: string; name: string; reason: string; daysSinceContact: number }>;
    recommendations: Array<{ type: 'action' | 'warning' | 'opportunity'; title: string; description: string }>;
    stats: { avgScore: number; conversionRate: number; avgDaysToConvert: number; totalValue: number };
  } | null>(null);

  // Local pipelines state (so we can add/edit/delete stages)
  const [localPipelines, setLocalPipelines] = useState(defaultPipelines);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const pipeline = localPipelines.find(p => p._id === selectedPipelineId) || localPipelines[0];

  // Reset state on page change and cleanup overlays
  useEffect(() => {
    return () => {
      setSelectedLead(null);
      setShowFilters(false);
      setShowNewLead(false);
      setEditingLead(null);
      setDeletingLead(null);
      setShowExport(false);
      setShowAIInsights(false);
      setShowScheduleModal(false);
      // Force cleanup any stuck overlays
      setTimeout(() => forceCleanup(), 50);
    };
  }, []);
  
  // Also cleanup when navigating away while modal is open
  useEffect(() => {
    if (currentPage !== 'crm') {
      forceCleanup();
    }
  }, [currentPage]);

  // Show toast helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // AI Insights analysis function
  const analyzeWithAI = useCallback(() => {
    setShowAIInsights(true);
    setAiAnalyzing(true);
    setAiInsightsData(null);

    // Simulate AI analysis (in production, this would call a real AI API)
    setTimeout(() => {
      const pipelineLeadsData = leads.filter(l => l.pipelineId === selectedPipelineId);
      
      // Calculate stats
      const avgScore = pipelineLeadsData.length > 0 
        ? Math.round(pipelineLeadsData.reduce((sum, l) => sum + l.score, 0) / pipelineLeadsData.length) 
        : 0;
      const wonLeads = pipelineLeadsData.filter(l => l.status === 'won');
      const conversionRate = pipelineLeadsData.length > 0 
        ? Math.round((wonLeads.length / pipelineLeadsData.length) * 100) 
        : 0;
      const totalValue = pipelineLeadsData.reduce((sum, l) => sum + (l.value || 0), 0);

      // Find hot leads (score >= 80)
      const hotLeads = pipelineLeadsData
        .filter(l => l.score >= 80 && l.status !== 'won' && l.status !== 'lost')
        .slice(0, 5)
        .map(l => ({
          id: l._id,
          name: l.name,
          reason: l.score >= 90 ? 'Score muito alto, prioridade máxima!' : 'Alto engajamento detectado',
          score: l.score
        }));

      // Find cold leads (low activity or score)
      const coldLeads = pipelineLeadsData
        .filter(l => l.score < 40 && l.status !== 'won' && l.status !== 'lost')
        .slice(0, 5)
        .map(l => ({
          id: l._id,
          name: l.name,
          reason: 'Score baixo, necessita atenção',
          daysSinceContact: Math.floor(Math.random() * 30) + 5
        }));

      // Generate recommendations
      const recommendations: Array<{ type: 'action' | 'warning' | 'opportunity'; title: string; description: string }> = [];

      if (hotLeads.length > 0) {
        recommendations.push({
          type: 'action',
          title: `${hotLeads.length} leads quentes precisam de atenção`,
          description: 'Estes leads têm alta probabilidade de conversão. Entre em contato hoje!'
        });
      }

      if (coldLeads.length > 0) {
        recommendations.push({
          type: 'warning',
          title: `${coldLeads.length} leads estão esfriando`,
          description: 'Considere uma campanha de reengajamento ou follow-up personalizado.'
        });
      }

      if (conversionRate < 20) {
        recommendations.push({
          type: 'opportunity',
          title: 'Taxa de conversão pode melhorar',
          description: 'Revise seu processo de qualificação e considere treinamento de vendas.'
        });
      }

      if (totalValue > 100000) {
        recommendations.push({
          type: 'opportunity',
          title: `Pipeline valioso: R$ ${(totalValue / 1000).toFixed(0)}K`,
          description: 'Foque nos deals de maior valor para maximizar receita.'
        });
      }

      // Generate summary
      const summary = `Análise de ${pipelineLeadsData.length} leads no pipeline. ` +
        `Score médio: ${avgScore}%. ` +
        `${hotLeads.length} leads quentes identificados. ` +
        `${coldLeads.length} leads precisam de atenção. ` +
        `Valor total: R$ ${(totalValue / 1000).toFixed(0)}K.`;

      setAiInsightsData({
        summary,
        hotLeads,
        coldLeads,
        recommendations,
        stats: {
          avgScore,
          conversionRate,
          avgDaysToConvert: Math.floor(Math.random() * 15) + 7,
          totalValue
        }
      });
      setAiAnalyzing(false);
    }, 2000);
  }, [leads, selectedPipelineId]);

  // All tags from all leads
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    leads.forEach(l => l.tags.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [leads]);

  // Filtered and sorted leads
  const pipelineLeads = useMemo(() => {
    let filtered = leads.filter(l => l.pipelineId === selectedPipelineId);

    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      filtered = filtered.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.company?.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q) ||
        l.phone.includes(q)
      );
    }
    if (filterSource !== 'all') filtered = filtered.filter(l => l.source === filterSource);
    if (filterStatus !== 'all') filtered = filtered.filter(l => l.status === filterStatus);
    if (filterAssigned !== 'all') filtered = filtered.filter(l => l.assignedTo === filterAssigned);
    if (filterScoreMin > 0) filtered = filtered.filter(l => l.score >= filterScoreMin);
    if (filterScoreMax < 100) filtered = filtered.filter(l => l.score <= filterScoreMax);
    if (filterTag) filtered = filtered.filter(l => l.tags.some(t => t.toLowerCase().includes(filterTag.toLowerCase())));

    filtered.sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name') return mul * a.name.localeCompare(b.name);
      if (sortField === 'score') return mul * (a.score - b.score);
      if (sortField === 'value') return mul * (a.value - b.value);
      return mul * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    return filtered;
  }, [leads, selectedPipelineId, searchFilter, filterSource, filterStatus, filterAssigned, filterScoreMin, filterScoreMax, filterTag, sortField, sortDir]);

  const activeFiltersCount = [filterSource !== 'all', filterStatus !== 'all', filterAssigned !== 'all', filterScoreMin > 0, filterScoreMax < 100, filterTag !== ''].filter(Boolean).length;

  const leadDetail = selectedLead ? leads.find(l => l._id === selectedLead) : null;

  // Stats
  const totalValue = pipelineLeads.reduce((sum, l) => sum + l.value, 0);
  const avgScore = pipelineLeads.length ? Math.round(pipelineLeads.reduce((sum, l) => sum + l.score, 0) / pipelineLeads.length) : 0;
  const wonLeads = pipelineLeads.filter(l => l.status === 'won').length;
  const hotLeads = pipelineLeads.filter(l => l.score >= 80).length;

  const handleDragStart = (leadId: string) => setDraggedLead(leadId);
  const handleDragOver = (e: React.DragEvent, stageId: string) => { e.preventDefault(); setDragOverStage(stageId); };
  const handleDrop = (stageId: string) => {
    if (draggedLead) {
      moveLeadToStage(draggedLead, stageId);
      showToast('Lead movido com sucesso!');
    }
    setDraggedLead(null);
    setDragOverStage(null);
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-emerald-600';
    if (score >= 60) return 'from-amber-500 to-amber-600';
    return 'from-red-500 to-red-600';
  };

  // Form validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.name.trim()) errors.name = 'Nome é obrigatório';
    if (!formData.email.trim()) errors.email = 'Email é obrigatório';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email inválido';
    if (!formData.phone.trim()) errors.phone = 'Telefone é obrigatório';
    if (formData.value < 0) errors.value = 'Valor não pode ser negativo';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // CRUD handlers
  const handleCreateLead = () => {
    if (!validateForm()) return;
    const newLead: Lead = {
      ...formData,
      _id: `l_${Date.now()}`,
      pipelineId: selectedPipelineId,
      createdAt: new Date().toISOString().split('T')[0],
      lastActivity: 'Agora',
    };
    addLead(newLead);
    setShowNewLead(false);
    setFormData({ ...emptyLead, pipelineId: selectedPipelineId });
    setFormErrors({});
    showToast('Lead criado com sucesso!');
  };

  const handleEditLead = () => {
    if (!editingLead || !validateForm()) return;
    updateLead(editingLead, formData);
    setEditingLead(null);
    setFormErrors({});
    showToast('Lead atualizado com sucesso!');
  };

  const handleDeleteLead = () => {
    if (!deletingLead) return;
    deleteLead(deletingLead);
    if (selectedLead === deletingLead) setSelectedLead(null);
    setDeletingLead(null);
    showToast('Lead excluído!');
  };

  const openEditModal = (lead: Lead) => {
    setFormData({ ...lead });
    setEditingLead(lead._id);
  };

  const openNewLeadModal = () => {
    setFormData({ ...emptyLead, pipelineId: selectedPipelineId, stageId: pipeline.stages[0]._id });
    setFormErrors({});
    setShowNewLead(true);
  };

  const handleDuplicateLead = (lead: Lead) => {
    const newLead: Lead = {
      ...lead,
      _id: `l_${Date.now()}`,
      name: `${lead.name} (cópia)`,
      createdAt: new Date().toISOString().split('T')[0],
      lastActivity: 'Agora',
      status: 'new',
    };
    addLead(newLead);
    showToast('Lead duplicado!');
    setQuickActionLead(null);
  };

  // Notes
  const handleAddNote = (leadId: string) => {
    if (!newNote.trim()) return;
    const note = {
      id: `n_${Date.now()}`,
      text: newNote,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      author: currentUser?.name || 'Você',
    };
    setLeadNotes(prev => ({
      ...prev,
      [leadId]: [...(prev[leadId] || []), note],
    }));
    setNewNote('');
    showToast('Nota adicionada!');
  };

  // Tags
  const handleAddTag = (leadId: string) => {
    if (!newTag.trim()) return;
    const lead = leads.find(l => l._id === leadId);
    if (lead && !lead.tags.includes(newTag.trim())) {
      updateLead(leadId, { tags: [...lead.tags, newTag.trim()] });
    }
    setNewTag('');
    setShowAddTag(false);
  };

  const handleRemoveTag = (leadId: string, tag: string) => {
    const lead = leads.find(l => l._id === leadId);
    if (lead) {
      updateLead(leadId, { tags: lead.tags.filter(t => t !== tag) });
    }
  };

  // Bulk
  const toggleLeadSelection = (id: string) => {
    const next = new Set(selectedLeads);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedLeads(next);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === pipelineLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(pipelineLeads.map(l => l._id)));
    }
  };

  const handleBulkDelete = () => {
    selectedLeads.forEach(id => deleteLead(id));
    showToast(`${selectedLeads.size} leads excluídos!`);
    setSelectedLeads(new Set());
    setShowBulkActions(false);
  };

  const handleBulkMoveStage = (stageId: string) => {
    selectedLeads.forEach(id => moveLeadToStage(id, stageId));
    showToast(`${selectedLeads.size} leads movidos!`);
    setSelectedLeads(new Set());
    setShowBulkActions(false);
  };

  const handleBulkChangeStatus = (status: LeadStatus) => {
    selectedLeads.forEach(id => updateLead(id, { status }));
    showToast(`Status atualizado para ${selectedLeads.size} leads!`);
    setSelectedLeads(new Set());
    setShowBulkActions(false);
  };

  // Export
  const handleExportCSV = () => {
    const BOM = '\uFEFF';
    const headers = ['Nome', 'Email', 'Telefone', 'Empresa', 'Origem', 'Score', 'Valor', 'Status', 'Tags'];
    const rows = pipelineLeads.map(l => [
      l.name, l.email, l.phone, l.company || '', l.source, l.score, l.value, statusLabels[l.status], l.tags.join(';')
    ]);
    const csv = BOM + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${pipeline.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
    showToast('CSV exportado com sucesso!');
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(pipelineLeads, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads_${pipeline.name.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExport(false);
    showToast('JSON exportado!');
  };

  // Sort toggle
  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  }, [sortField]);

  // Reset filters
  const resetFilters = () => {
    setFilterSource('all');
    setFilterStatus('all');
    setFilterAssigned('all');
    setFilterScoreMin(0);
    setFilterScoreMax(100);
    setFilterTag('');
  };

  // Stage CRUD
  const stageColors = [
    '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899',
    '#f43f5e', '#ef4444', '#f97316', '#f59e0b', '#eab308',
    '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
    '#0ea5e9', '#3b82f6', '#6b7280'
  ];

  const handleCreateStage = () => {
    if (!stageFormData.name.trim()) {
      showToast('Nome da etapa é obrigatório', 'error');
      return;
    }
    const currentPipeline = localPipelines.find(p => p._id === selectedPipelineId);
    const newOrder = currentPipeline ? currentPipeline.stages.length : 0;
    const newStage = {
      _id: `s_${Date.now()}`,
      name: stageFormData.name.trim(),
      color: stageFormData.color,
      order: newOrder,
    };
    setLocalPipelines(prev => prev.map(p => 
      p._id === selectedPipelineId 
        ? { ...p, stages: [...p.stages, newStage] }
        : p
    ));
    setShowNewStage(false);
    setStageFormData({ name: '', color: '#6366f1' });
    showToast('Etapa criada com sucesso!');
  };

  const handleEditStage = () => {
    if (!editingStage || !stageFormData.name.trim()) {
      showToast('Nome da etapa é obrigatório', 'error');
      return;
    }
    setLocalPipelines(prev => prev.map(p => 
      p._id === selectedPipelineId 
        ? { ...p, stages: p.stages.map(s => 
            s._id === editingStage 
              ? { ...s, name: stageFormData.name.trim(), color: stageFormData.color }
              : s
          )}
        : p
    ));
    setEditingStage(null);
    setStageFormData({ name: '', color: '#6366f1' });
    showToast('Etapa atualizada!');
  };

  const handleDeleteStage = () => {
    if (!deletingStage) return;
    // Check if there are leads in this stage
    const leadsInStage = leads.filter(l => l.stageId === deletingStage).length;
    if (leadsInStage > 0) {
      showToast(`Não é possível excluir: ${leadsInStage} lead(s) nesta etapa`, 'error');
      setDeletingStage(null);
      return;
    }
    setLocalPipelines(prev => prev.map(p => 
      p._id === selectedPipelineId 
        ? { ...p, stages: p.stages.filter(s => s._id !== deletingStage) }
        : p
    ));
    setDeletingStage(null);
    showToast('Etapa excluída!');
  };

  const openEditStageModal = (stage: { _id: string; name: string; color: string }) => {
    setStageFormData({ name: stage.name, color: stage.color });
    setEditingStage(stage._id);
  };

  // Timeline data for lead
  const getTimeline = (lead: Lead) => {
    return [
      { time: '2h atrás', text: 'Acessou página de preços', dot: 'bg-brand-500', icon: Globe },
      { time: '1d atrás', text: 'Email de follow-up enviado', dot: 'bg-blue-500', icon: Mail },
      { time: '3d atrás', text: 'Proposta comercial criada', dot: 'bg-amber-500', icon: FileText },
      { time: '5d atrás', text: `Primeiro contato via ${lead.source}`, dot: 'bg-green-500', icon: MessageSquare },
      { time: lead.createdAt, text: `Lead criado via ${lead.source}`, dot: 'bg-gray-400', icon: UserPlus },
    ];
  };

  // Score gauge component
  const ScoreGauge = ({ score, size = 'sm' }: { score: number; size?: 'sm' | 'lg' }) => {
    const radius = size === 'lg' ? 32 : 18;
    const stroke = size === 'lg' ? 6 : 4;
    const circumference = 2 * Math.PI * radius;
    const progress = (score / 100) * circumference;
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    
    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={(radius + stroke) * 2} height={(radius + stroke) * 2} className="transform -rotate-90">
          <circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={radius + stroke}
            cy={radius + stroke}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <span className={cn(
          'absolute font-bold',
          size === 'lg' ? 'text-lg' : 'text-[10px]'
        )} style={{ color }}>
          {score}
        </span>
      </div>
    );
  };

  // ─── LEAD FORM MODAL ───
  const renderLeadForm = (isEdit: boolean) => (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => { if (isEdit) setEditingLead(null); else setShowNewLead(false); setFormErrors({}); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-gray-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-violet-500/10 to-fuchsia-500/10" />
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-brand-400/20 to-transparent rounded-full blur-2xl" />
          <div className="relative flex items-center gap-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg',
                isEdit ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-brand-500 to-violet-600'
              )}
            >
              {isEdit ? <Edit3 className="h-6 w-6 text-white" /> : <UserPlus className="h-6 w-6 text-white" />}
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar Lead' : 'Novo Lead'}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{isEdit ? 'Atualize as informações do lead' : 'Adicione um novo lead ao pipeline'}</p>
            </div>
          </div>
          <button
            onClick={() => { if (isEdit) setEditingLead(null); else setShowNewLead(false); setFormErrors({}); }}
            className="absolute top-4 right-4 rounded-xl p-2 text-gray-400 hover:bg-white/80 hover:text-gray-600 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-auto p-6 max-h-[calc(90vh-180px)] space-y-5">
          {/* Row 1: Name + Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Nome *</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={cn('input-modern w-full rounded-xl px-4 py-3 text-sm', formErrors.name && 'border-red-300 focus:ring-red-400')}
                placeholder="Nome do lead ou empresa"
              />
              {formErrors.name && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><XCircle className="h-3 w-3" />{formErrors.name}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Empresa</label>
              <input
                type="text"
                value={formData.company || ''}
                onChange={e => setFormData({ ...formData, company: e.target.value })}
                className="input-modern w-full rounded-xl px-4 py-3 text-sm"
                placeholder="Nome da empresa"
              />
            </div>
          </div>

          {/* Row 2: Email + Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Email *</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className={cn('input-modern w-full rounded-xl pl-11 pr-4 py-3 text-sm', formErrors.email && 'border-red-300 focus:ring-red-400')}
                  placeholder="email@exemplo.com"
                />
              </div>
              {formErrors.email && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><XCircle className="h-3 w-3" />{formErrors.email}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Telefone *</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className={cn('input-modern w-full rounded-xl pl-11 pr-4 py-3 text-sm', formErrors.phone && 'border-red-300 focus:ring-red-400')}
                  placeholder="+55 (11) 99999-0000"
                />
              </div>
              {formErrors.phone && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1"><XCircle className="h-3 w-3" />{formErrors.phone}</p>}
            </div>
          </div>

          {/* Row 3: Source + Status + Assigned */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Origem</label>
              <div className="relative">
                <select
                  value={formData.source}
                  onChange={e => setFormData({ ...formData, source: e.target.value })}
                  className="input-modern w-full appearance-none rounded-xl px-4 py-3 text-sm pr-10"
                >
                  {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Status</label>
              <div className="relative">
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                  className="input-modern w-full appearance-none rounded-xl px-4 py-3 text-sm pr-10"
                >
                  {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Responsável</label>
              <div className="relative">
                <select
                  value={formData.assignedTo}
                  onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="input-modern w-full appearance-none rounded-xl px-4 py-3 text-sm pr-10"
                >
                  {settingsUsers.filter(u => u.role === 'sales' || u.role === 'admin' || u.role === 'owner').map(u => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 4: Value + Score + Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Valor (R$)</label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.value}
                  onChange={e => setFormData({ ...formData, value: Number(e.target.value) })}
                  className="input-modern w-full rounded-xl pl-11 pr-4 py-3 text-sm"
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Score (0-100)</label>
              <div className="relative">
                <Star className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.score}
                  onChange={e => setFormData({ ...formData, score: Math.min(100, Math.max(0, Number(e.target.value))) })}
                  className="input-modern w-full rounded-xl pl-11 pr-4 py-3 text-sm"
                  min={0} max={100}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Etapa</label>
              <div className="relative">
                <select
                  value={formData.stageId}
                  onChange={e => setFormData({ ...formData, stageId: e.target.value })}
                  className="input-modern w-full appearance-none rounded-xl px-4 py-3 text-sm pr-10"
                >
                  {pipeline.stages.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Tags</label>
            <div className="flex flex-wrap gap-2 items-center p-3 rounded-xl bg-gray-50 border border-gray-200 min-h-[48px]">
              {formData.tags.map(tag => (
                <motion.span 
                  key={tag} 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                  <button onClick={() => setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) })} className="hover:text-brand-900 ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </motion.span>
              ))}
              <input
                type="text"
                placeholder="+ Adicionar tag"
                className="flex-1 min-w-[120px] bg-transparent border-0 text-sm focus:ring-0 placeholder-gray-400 py-1"
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val && !formData.tags.includes(val)) {
                      setFormData({ ...formData, tags: [...formData.tags, val] });
                      (e.target as HTMLInputElement).value = '';
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Observações</label>
            <textarea
              value={formData.notes || ''}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="input-modern w-full rounded-xl px-4 py-3 text-sm resize-none"
              rows={3}
              placeholder="Anotações internas sobre este lead..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/80">
          <button
            onClick={() => { if (isEdit) setEditingLead(null); else setShowNewLead(false); setFormErrors({}); }}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200/80 transition-colors"
          >
            Cancelar
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={isEdit ? handleEditLead : handleCreateLead}
            className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white flex items-center gap-2 shadow-lg shadow-brand-500/25"
          >
            {isEdit ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? 'Salvar Alterações' : 'Criar Lead'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  // ─── DELETE MODAL ───
  const renderDeleteModal = () => {
    const lead = leads.find(l => l._id === deletingLead);
    if (!lead) return null;
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={() => setDeletingLead(null)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center"
          onClick={e => e.stopPropagation()}
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30 mb-5"
          >
            <Trash2 className="h-8 w-8 text-white" />
          </motion.div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Lead</h3>
          <p className="text-sm text-gray-500 mb-1">Tem certeza que deseja excluir</p>
          <p className="text-base font-bold text-gray-900 mb-4">"{lead.name}"?</p>
          <div className="rounded-xl bg-red-50 border border-red-100 p-3 mb-6">
            <p className="text-xs text-red-600">⚠️ Esta ação não pode ser desfeita. Todas as notas e histórico serão removidos.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setDeletingLead(null)}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDeleteLead}
              className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 px-4 py-3 text-sm font-bold text-white hover:from-red-600 hover:to-rose-700 transition-all shadow-lg shadow-red-500/25"
            >
              Sim, Excluir
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // ─── FILTERS PANEL ───
  const renderFiltersPanel = () => (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-start justify-end bg-black/40 backdrop-blur-sm"
      onClick={() => setShowFilters(false)}
    >
      <motion.div
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-white h-full w-full sm:w-[420px] shadow-2xl overflow-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/90 backdrop-blur-xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-lg">
              <Filter className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Filtros Avançados</h3>
              {activeFiltersCount > 0 && (
                <p className="text-xs text-brand-600 font-medium">{activeFiltersCount} filtro(s) ativo(s)</p>
              )}
            </div>
          </div>
          <button onClick={() => setShowFilters(false)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Source */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-3 block uppercase tracking-wide">Origem</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterSource('all')}
                className={cn('rounded-xl px-4 py-2 text-xs font-semibold transition-all', filterSource === 'all' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
              >Todas</button>
              {sourceOptions.map(s => (
                <button
                  key={s}
                  onClick={() => setFilterSource(s)}
                  className={cn('rounded-xl px-4 py-2 text-xs font-semibold transition-all', filterSource === s ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-3 block uppercase tracking-wide">Status</label>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterStatus('all')}
                className={cn('rounded-xl px-4 py-2 text-xs font-semibold transition-all', filterStatus === 'all' ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
              >Todos</button>
              {Object.entries(statusLabels).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFilterStatus(k)}
                  className={cn('rounded-xl px-4 py-2 text-xs font-semibold transition-all', filterStatus === k ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/25' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')}
                >{v}</button>
              ))}
            </div>
          </div>

          {/* Assigned */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-3 block uppercase tracking-wide">Responsável</label>
            <div className="relative">
              <select
                value={filterAssigned}
                onChange={e => setFilterAssigned(e.target.value)}
                className="input-modern w-full appearance-none rounded-xl px-4 py-3 text-sm pr-10"
              >
                <option value="all">Todos</option>
                {settingsUsers.filter(u => ['sales', 'admin', 'owner'].includes(u.role)).map(u => (
                  <option key={u._id} value={u._id}>{u.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Score range */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-3 block uppercase tracking-wide">Score ({filterScoreMin} - {filterScoreMax})</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-gray-400 font-medium mb-2">Mínimo</p>
                <input
                  type="range"
                  min={0} max={100} value={filterScoreMin}
                  onChange={e => setFilterScoreMin(Number(e.target.value))}
                  className="w-full accent-brand-600"
                />
                <p className="text-sm font-bold text-gray-700 mt-1">{filterScoreMin}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-medium mb-2">Máximo</p>
                <input
                  type="range"
                  min={0} max={100} value={filterScoreMax}
                  onChange={e => setFilterScoreMax(Number(e.target.value))}
                  className="w-full accent-brand-600"
                />
                <p className="text-sm font-bold text-gray-700 mt-1">{filterScoreMax}</p>
              </div>
            </div>
          </div>

          {/* Tag filter */}
          <div>
            <label className="text-xs font-bold text-gray-600 mb-3 block uppercase tracking-wide">Tag</label>
            <input
              type="text"
              value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
              className="input-modern w-full rounded-xl px-4 py-3 text-sm"
              placeholder="Buscar por tag..."
            />
            {filterTag === '' && allTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {allTags.slice(0, 10).map(t => (
                  <button key={t} onClick={() => setFilterTag(t)} className="rounded-lg bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-500 hover:bg-brand-100 hover:text-brand-700 transition-colors">
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex gap-3 border-t border-gray-100 bg-white px-6 py-4">
          <button
            onClick={resetFilters}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Limpar tudo
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowFilters(false)}
            className="flex-1 btn-primary rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25"
          >
            Ver {pipelineLeads.length} leads
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  // ─── EXPORT MODAL ───
  const renderExportModal = () => (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => setShowExport(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Download className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Exportar Leads</h3>
            <p className="text-xs text-gray-500">{pipelineLeads.length} leads serão exportados</p>
          </div>
        </div>
        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportCSV}
            className="w-full flex items-center gap-4 rounded-2xl border-2 border-gray-100 p-4 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all text-left group"
          >
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/30 transition-shadow">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Exportar CSV</p>
              <p className="text-xs text-gray-400">Compatível com Excel, Google Sheets</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-300 ml-auto group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExportJSON}
            className="w-full flex items-center gap-4 rounded-2xl border-2 border-gray-100 p-4 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left group"
          >
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg group-hover:shadow-blue-500/30 transition-shadow">
              <Hash className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Exportar JSON</p>
              <p className="text-xs text-gray-400">Para integração via API</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-300 ml-auto group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </motion.button>
        </div>
        <button
          onClick={() => setShowExport(false)}
          className="w-full mt-4 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </motion.div>
    </motion.div>
  );

  // ─── STAGE FORM MODAL ───
  const renderStageFormModal = (isEdit: boolean) => (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => { if (isEdit) setEditingStage(null); else setShowNewStage(false); setStageFormData({ name: '', color: '#6366f1' }); }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-6 py-5 border-b border-gray-100 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 via-violet-500/10 to-fuchsia-500/10" />
          <div className="relative flex items-center gap-4">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.1 }}
              className={cn(
                'h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg',
                isEdit ? 'bg-gradient-to-br from-amber-400 to-orange-500' : 'bg-gradient-to-br from-brand-500 to-violet-600'
              )}
            >
              {isEdit ? <Settings2 className="h-6 w-6 text-white" /> : <Plus className="h-6 w-6 text-white" />}
            </motion.div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Editar Etapa' : 'Nova Etapa'}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{isEdit ? 'Atualize os dados da etapa' : 'Adicione uma nova etapa ao pipeline'}</p>
            </div>
          </div>
          <button
            onClick={() => { if (isEdit) setEditingStage(null); else setShowNewStage(false); setStageFormData({ name: '', color: '#6366f1' }); }}
            className="absolute top-4 right-4 rounded-xl p-2 text-gray-400 hover:bg-white/80 hover:text-gray-600 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Nome da Etapa *</label>
            <input
              type="text"
              value={stageFormData.name}
              onChange={e => setStageFormData({ ...stageFormData, name: e.target.value })}
              className="input-modern w-full rounded-xl px-4 py-3 text-sm"
              placeholder="Ex: Qualificação, Proposta, Negociação..."
              autoFocus
            />
          </div>

          {/* Color Picker */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Cor da Etapa</label>
            <div className="grid grid-cols-9 gap-2">
              {stageColors.map(color => (
                <button
                  key={color}
                  onClick={() => setStageFormData({ ...stageFormData, color })}
                  className={cn(
                    'h-8 w-8 rounded-lg shadow-sm transition-all',
                    stageFormData.color === color ? 'ring-2 ring-offset-2 ring-brand-500 scale-110' : 'hover:scale-105'
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wide">Preview</label>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
              <div className="h-5 w-5 rounded-full shadow-md" style={{ backgroundColor: stageFormData.color, boxShadow: `0 4px 12px ${stageFormData.color}50` }} />
              <span className="text-sm font-bold text-gray-900">{stageFormData.name || 'Nome da etapa'}</span>
              <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-500 px-2">
                0
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/80">
          <button
            onClick={() => { if (isEdit) setEditingStage(null); else setShowNewStage(false); setStageFormData({ name: '', color: '#6366f1' }); }}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200/80 transition-colors"
          >
            Cancelar
          </button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={isEdit ? handleEditStage : handleCreateStage}
            className="btn-primary rounded-xl px-6 py-2.5 text-sm font-bold text-white flex items-center gap-2 shadow-lg shadow-brand-500/25"
          >
            {isEdit ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {isEdit ? 'Salvar Alterações' : 'Criar Etapa'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );

  // ─── DELETE STAGE MODAL ───
  const renderDeleteStageModal = () => {
    const stage = pipeline.stages.find(s => s._id === deletingStage);
    if (!stage) return null;
    const leadsInStage = leads.filter(l => l.stageId === deletingStage).length;
    
    return (
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={() => setDeletingStage(null)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center"
          onClick={e => e.stopPropagation()}
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.1 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg shadow-red-500/30 mb-5"
          >
            <Trash2 className="h-8 w-8 text-white" />
          </motion.div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Excluir Etapa</h3>
          <p className="text-sm text-gray-500 mb-1">Tem certeza que deseja excluir a etapa</p>
          <p className="text-base font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: stage.color }} />
            "{stage.name}"?
          </p>
          
          {leadsInStage > 0 ? (
            <div className="rounded-xl bg-red-50 border border-red-100 p-4 mb-6">
              <p className="text-sm text-red-600 font-semibold">⚠️ Esta etapa possui {leadsInStage} lead(s).</p>
              <p className="text-xs text-red-500 mt-1">Mova os leads para outra etapa antes de excluir.</p>
            </div>
          ) : (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 mb-6">
              <p className="text-xs text-amber-600">⚠️ Esta ação não pode ser desfeita.</p>
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={() => setDeletingStage(null)}
              className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <motion.button
              whileHover={{ scale: leadsInStage > 0 ? 1 : 1.02 }}
              whileTap={{ scale: leadsInStage > 0 ? 1 : 0.98 }}
              onClick={handleDeleteStage}
              disabled={leadsInStage > 0}
              className={cn(
                'flex-1 rounded-xl px-4 py-3 text-sm font-bold transition-all',
                leadsInStage > 0 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 shadow-lg shadow-red-500/25'
              )}
            >
              Sim, Excluir
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // ─── BULK ACTIONS BAR ───
  const renderBulkActionsBar = () => (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4 border border-gray-700"
    >
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-brand-500 flex items-center justify-center">
          <CheckCircle2 className="h-4 w-4" />
        </div>
        <span className="text-sm font-bold">{selectedLeads.size} selecionado(s)</span>
      </div>
      <div className="h-6 w-px bg-gray-700" />
      <div className="relative">
        <button
          onClick={() => setShowBulkActions(!showBulkActions)}
          className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 transition-colors"
        >
          <Zap className="h-4 w-4" /> Mover etapa <ChevronDown className={cn("h-3 w-3 transition-transform", showBulkActions && 'rotate-180')} />
        </button>
        <AnimatePresence>
          {showBulkActions && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full mb-2 left-0 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 w-56 z-10"
            >
              {pipeline.stages.map(s => (
                <button
                  key={s._id}
                  onClick={() => handleBulkMoveStage(s._id)}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <span className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: s.color }} />
                  {s.name}
                </button>
              ))}
              <div className="border-t border-gray-100 my-2" />
              <button onClick={() => handleBulkChangeStatus('won')} className="w-full px-4 py-2.5 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2 transition-colors">
                <CheckCircle2 className="h-4 w-4" /> Marcar como Ganho
              </button>
              <button onClick={() => handleBulkChangeStatus('lost')} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors">
                <XCircle className="h-4 w-4" /> Marcar como Perdido
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleBulkDelete}
        className="flex items-center gap-2 rounded-xl bg-red-500/20 text-red-300 px-4 py-2 text-sm font-semibold hover:bg-red-500/30 transition-colors"
      >
        <Trash2 className="h-4 w-4" /> Excluir
      </motion.button>
      <button
        onClick={() => { setSelectedLeads(new Set()); setShowBulkActions(false); }}
        className="rounded-lg p-2 text-gray-400 hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );

  // ─── QUICK ACTIONS DROPDOWN ───
  const renderQuickActions = (lead: Lead) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -4 }}
      className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 w-56 z-50"
      onClick={e => e.stopPropagation()}
    >
      <button onClick={() => { setSelectedLead(lead._id); setQuickActionLead(null); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
        <Eye className="h-4 w-4 text-gray-400" /> Ver detalhes
      </button>
      <button onClick={() => { openEditModal(lead); setQuickActionLead(null); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
        <Edit3 className="h-4 w-4 text-gray-400" /> Editar
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button onClick={() => { window.open(`tel:${lead.phone}`); setQuickActionLead(null); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
        <Phone className="h-4 w-4 text-blue-500" /> Ligar
      </button>
      <button onClick={() => { window.open(`mailto:${lead.email}`); setQuickActionLead(null); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
        <Mail className="h-4 w-4 text-purple-500" /> Enviar email
      </button>
      <button onClick={() => { window.open(`https://wa.me/${lead.phone.replace(/\D/g, '')}`); setQuickActionLead(null); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
        <MessageSquare className="h-4 w-4 text-green-500" /> Enviar WhatsApp
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button onClick={() => { setSelectedLead(lead._id); setDetailTab('notes'); setQuickActionLead(null); }} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
        <StickyNote className="h-4 w-4 text-amber-500" /> Adicionar nota
      </button>
      <button onClick={() => handleDuplicateLead(lead)} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition-colors">
        <Copy className="h-4 w-4 text-gray-400" /> Duplicar lead
      </button>
      <div className="border-t border-gray-100 my-1" />
      <button onClick={() => { updateLead(lead._id, { status: lead.status === 'won' ? 'new' : 'won' }); setQuickActionLead(null); showToast(lead.status === 'won' ? 'Lead reaberto!' : 'Lead marcado como ganho!'); }} className="w-full px-4 py-2.5 text-left text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-3 transition-colors">
        <CheckCircle2 className="h-4 w-4" /> {lead.status === 'won' ? 'Reabrir lead' : 'Marcar como ganho'}
      </button>
      <button onClick={() => { updateLead(lead._id, { status: 'lost' }); setQuickActionLead(null); showToast('Lead marcado como perdido'); }} className="w-full px-4 py-2.5 text-left text-sm text-orange-600 hover:bg-orange-50 flex items-center gap-3 transition-colors">
        <Archive className="h-4 w-4" /> Marcar como perdido
      </button>
      <button onClick={() => { setDeletingLead(lead._id); setQuickActionLead(null); }} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition-colors">
        <Trash2 className="h-4 w-4" /> Excluir
      </button>
    </motion.div>
  );

  // ─── DETAIL PANEL ───
  const renderDetailPanel = () => {
    if (!leadDetail) return null;
    const stage = pipeline.stages.find(s => s._id === leadDetail.stageId);
    const assignedUser = settingsUsers.find(u => u._id === leadDetail.assignedTo);
    const notes = leadNotes[leadDetail._id] || [];
    const timeline = getTimeline(leadDetail);

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-start justify-end bg-black/40 backdrop-blur-sm"
        onClick={() => setSelectedLead(null)}
      >
        <motion.div
          initial={{ x: 400 }}
          animate={{ x: 0 }}
          exit={{ x: 400 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-white h-full w-full sm:w-[420px] shadow-2xl overflow-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header - Same style as Filters */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/90 backdrop-blur-xl px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 flex items-center justify-center shadow-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Detalhes do Lead</h3>
                <p className="text-xs text-gray-500 font-medium">Visualização completa</p>
              </div>
            </div>
            <button onClick={() => setSelectedLead(null)} className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Profile Section */}
          <div className="p-6 space-y-5">
            {/* Lead Avatar + Info Card */}
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-xl font-bold text-white shadow-lg shrink-0">
                {leadDetail.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-lg font-bold text-gray-900 truncate">{leadDetail.name}</h4>
                  {leadDetail.score >= 80 && (
                    <span className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
                      <Flame className="h-3 w-3" /> HOT
                    </span>
                  )}
                </div>
                {leadDetail.company && (
                  <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="h-3.5 w-3.5" /> {leadDetail.company}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={cn('rounded-lg px-2.5 py-1 text-[10px] font-bold', statusColors[leadDetail.status])}>
                    {statusLabels[leadDetail.status]}
                  </span>
                  <span className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 text-[10px] font-bold text-gray-600">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage?.color }} />
                    {stage?.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Value Card */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Valor Estimado</p>
              <p className="text-3xl font-extrabold text-gray-900">R$ {leadDetail.value.toLocaleString('pt-BR')}</p>
            </div>

            {/* Quick actions */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: Phone, label: 'Ligar', color: 'from-blue-400 to-blue-600', onClick: () => window.open(`tel:${leadDetail.phone}`) },
                { icon: Mail, label: 'Email', color: 'from-purple-400 to-purple-600', onClick: () => window.open(`mailto:${leadDetail.email}`) },
                { icon: MessageSquare, label: 'WhatsApp', color: 'from-green-400 to-green-600', onClick: () => window.open(`https://wa.me/${leadDetail.phone.replace(/\D/g, '')}`) },
                { icon: Calendar, label: 'Agendar', color: 'from-amber-400 to-amber-600', onClick: () => {
                  setScheduleData({
                    title: `Reunião: ${leadDetail.name}`,
                    date: new Date().toISOString().split('T')[0],
                    time: '10:00',
                    type: 'meeting',
                    notes: `Lead: ${leadDetail.name}\nEmpresa: ${leadDetail.company || '-'}\nEmail: ${leadDetail.email}\nTelefone: ${leadDetail.phone}`
                  });
                  setShowScheduleModal(true);
                }},
              ].map(action => (
                <motion.button
                  key={action.label}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={action.onClick}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-white border border-gray-200 p-3 transition-all hover:shadow-md hover:border-gray-300 group"
                >
                  <div className={cn('h-8 w-8 rounded-lg bg-gradient-to-br flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow', action.color)}>
                    <action.icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold text-gray-600">{action.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200/60 px-5">
            {[
              { id: 'info' as const, label: 'Info', icon: Users },
              { id: 'notes' as const, label: `Notas (${notes.length})`, icon: StickyNote },
              { id: 'timeline' as const, label: 'Timeline', icon: Clock },
              { id: 'files' as const, label: 'Arquivos', icon: Paperclip },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id)}
                className={cn(
                  'relative flex items-center gap-1.5 px-4 py-3 text-xs font-semibold transition-colors',
                  detailTab === tab.id ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
                )}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
                {detailTab === tab.id && (
                  <motion.div layoutId="detailTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto px-5 py-4">
            <AnimatePresence mode="popLayout">
              {detailTab === 'info' && (
                <motion.div key="info" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  {/* Contact info */}
                  <div className="space-y-2">
                    {[
                      { label: 'Email', value: leadDetail.email, icon: Mail, action: () => navigator.clipboard.writeText(leadDetail.email) },
                      { label: 'Telefone', value: leadDetail.phone, icon: Phone, action: () => navigator.clipboard.writeText(leadDetail.phone) },
                      { label: 'Origem', value: leadDetail.source, icon: Globe },
                      { label: 'Responsável', value: assignedUser?.name || '—', icon: Users },
                      { label: 'Criado em', value: leadDetail.createdAt, icon: Calendar },
                    ].map(item => (
                      <div key={item.label} className="flex items-center justify-between rounded-xl bg-gray-50 p-3.5 border border-gray-100 group hover:bg-gray-100/80 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center shadow-sm">
                            <item.icon className="h-4 w-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">{item.label}</p>
                            <p className="text-sm font-semibold text-gray-700 mt-0.5">{item.value}</p>
                          </div>
                        </div>
                        {item.action && (
                          <button
                            onClick={() => { item.action(); showToast('Copiado!'); }}
                            className="opacity-0 group-hover:opacity-100 rounded-lg p-2 text-gray-400 hover:bg-white hover:text-gray-600 transition-all"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Score with gauge */}
                  <div className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-bold text-gray-600 uppercase">Lead Score</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Probabilidade de conversão</p>
                      </div>
                      <ScoreGauge score={leadDetail.score} size="lg" />
                    </div>
                    <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${leadDetail.score}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={cn('h-full rounded-full bg-gradient-to-r', getScoreGradient(leadDetail.score))}
                      />
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <p className="mb-2 text-xs font-bold text-gray-600 uppercase">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {leadDetail.tags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1.5 rounded-lg bg-brand-100 px-3 py-1.5 text-xs font-semibold text-brand-700 group">
                          <Tag className="h-3 w-3" />
                          {tag}
                          <button onClick={() => handleRemoveTag(leadDetail._id, tag)} className="opacity-0 group-hover:opacity-100 hover:text-brand-900 transition-opacity ml-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      {showAddTag ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={newTag}
                            onChange={e => setNewTag(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAddTag(leadDetail._id); if (e.key === 'Escape') { setShowAddTag(false); setNewTag(''); } }}
                            className="input-modern rounded-lg px-3 py-1.5 text-xs w-28"
                            placeholder="Nova tag"
                            autoFocus
                          />
                          <button onClick={() => handleAddTag(leadDetail._id)} className="rounded-lg bg-brand-600 p-1.5 text-white hover:bg-brand-700">
                            <Check className="h-3 w-3" />
                          </button>
                          <button onClick={() => { setShowAddTag(false); setNewTag(''); }} className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setShowAddTag(true)} className="rounded-lg border-2 border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-400 hover:border-brand-400 hover:text-brand-600 transition-colors flex items-center gap-1">
                          <Plus className="h-3 w-3" /> Adicionar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pipeline stage */}
                  <div>
                    <p className="mb-2 text-xs font-bold text-gray-600 uppercase">Etapa do Pipeline</p>
                    <div className="flex gap-1.5">
                      {pipeline.stages.map(s => (
                        <motion.button
                          key={s._id}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => { moveLeadToStage(leadDetail._id, s._id); showToast('Etapa atualizada!'); }}
                          className={cn(
                            'flex-1 rounded-xl py-2.5 text-[10px] font-bold transition-all',
                            leadDetail.stageId === s._id
                              ? 'text-white shadow-lg'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          )}
                          style={leadDetail.stageId === s._id ? { backgroundColor: s.color, boxShadow: `0 4px 14px ${s.color}40` } : {}}
                        >
                          {s.name}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Change status */}
                  <div>
                    <p className="mb-2 text-xs font-bold text-gray-600 uppercase">Status</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(statusLabels).map(([k, v]) => (
                        <motion.button
                          key={k}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { updateLead(leadDetail._id, { status: k as LeadStatus }); showToast('Status atualizado!'); }}
                          className={cn(
                            'rounded-xl px-3 py-1.5 text-xs font-semibold transition-all',
                            leadDetail.status === k
                              ? cn(statusColors[k as LeadStatus], 'ring-2 ring-offset-1', k === 'won' ? 'ring-emerald-300' : k === 'lost' ? 'ring-red-300' : 'ring-brand-300')
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          )}
                        >
                          {v}
                        </motion.button>
                      ))}
                    </div>
                  </div>

                  {/* Danger zone */}
                  <div className="pt-3 border-t border-gray-100">
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setDeletingLead(leadDetail._id)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" /> Excluir Lead
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {detailTab === 'notes' && (
                <motion.div key="notes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  {/* Add note */}
                  <div className="rounded-2xl border-2 border-gray-100 bg-white overflow-hidden">
                    <textarea
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      className="w-full px-4 py-3 text-sm resize-none border-0 focus:ring-0 placeholder-gray-400"
                      rows={3}
                      placeholder="Adicionar uma nota interna..."
                    />
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                      <button className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors">
                        <Paperclip className="h-4 w-4" />
                      </button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAddNote(leadDetail._id)}
                        disabled={!newNote.trim()}
                        className={cn('rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-1.5', newNote.trim() ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-lg shadow-brand-500/25' : 'bg-gray-200 text-gray-400 cursor-not-allowed')}
                      >
                        <Send className="h-3.5 w-3.5" /> Salvar
                      </motion.button>
                    </div>
                  </div>

                  {/* Notes list */}
                  {notes.length === 0 ? (
                    <div className="text-center py-10">
                      <div className="h-16 w-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                        <StickyNote className="h-8 w-8 text-amber-500" />
                      </div>
                      <p className="text-sm font-semibold text-gray-600">Nenhuma nota ainda</p>
                      <p className="text-xs text-gray-400 mt-1">Adicione notas para sua equipe</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {notes.map((note, i) => (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-4 group"
                        >
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.text}</p>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2 text-[11px] text-amber-600 font-medium">
                              <div className="h-5 w-5 rounded-md bg-amber-200 flex items-center justify-center text-amber-700 text-[8px] font-bold">
                                {note.author.split(' ').map(n => n[0]).join('')}
                              </div>
                              {note.author}
                              <span className="text-amber-400">•</span>
                              {note.time}
                            </div>
                            <button
                              onClick={() => setLeadNotes(prev => ({ ...prev, [leadDetail._id]: prev[leadDetail._id].filter(n => n.id !== note.id) }))}
                              className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-amber-400 hover:text-red-500 hover:bg-white transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {detailTab === 'timeline' && (
                <motion.div key="timeline" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <div className="space-y-0">
                    {timeline.map((event, i) => {
                      const Icon = event.icon;
                      return (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.08 }}
                          className="flex gap-4 group"
                        >
                          <div className="flex flex-col items-center">
                            <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ring-4 ring-white shadow-lg', event.dot)}>
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            {i < timeline.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-2" />}
                          </div>
                          <div className="pb-6 flex-1">
                            <p className="text-sm font-semibold text-gray-700">{event.text}</p>
                            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {event.time}
                            </p>
                          </div>
                          <button className="opacity-0 group-hover:opacity-100 rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all self-start">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {detailTab === 'files' && (
                <motion.div key="files" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <input ref={fileInputRef} type="file" className="hidden" multiple />
                  <div className="text-center py-12">
                    <div className="mx-auto h-20 w-20 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mb-5 border-2 border-dashed border-gray-300">
                      <Paperclip className="h-9 w-9 text-gray-400" />
                    </div>
                    <p className="text-sm font-semibold text-gray-600 mb-1">Nenhum arquivo anexado</p>
                    <p className="text-xs text-gray-400 mb-5">Arraste ou clique para enviar</p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-primary rounded-xl px-6 py-3 text-sm font-bold text-white inline-flex items-center gap-2 shadow-lg shadow-brand-500/25"
                    >
                      <Plus className="h-4 w-4" /> Enviar Arquivo
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 border-t border-gray-100 bg-white px-5 py-4 flex gap-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => openEditModal(leadDetail)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl btn-primary py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25"
            >
              <Edit3 className="h-4 w-4" /> Editar
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ExternalLink className="h-4 w-4" /> Abrir
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    );
  };

  // ─── MAIN RENDER ───
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200/60 bg-white/80 backdrop-blur-xl">
        {/* Stats row */}
        <div className="px-4 lg:px-6 py-4 border-b border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Leads', value: pipelineLeads.length, icon: Users, color: 'from-brand-500 to-violet-600', iconBg: 'bg-brand-100 text-brand-600' },
              { label: 'Valor Pipeline', value: `R$ ${(totalValue / 1000).toFixed(0)}K`, icon: DollarSign, color: 'from-emerald-500 to-teal-600', iconBg: 'bg-emerald-100 text-emerald-600' },
              { label: 'Leads Ganhos', value: wonLeads, icon: Target, color: 'from-amber-500 to-orange-600', iconBg: 'bg-amber-100 text-amber-600' },
              { label: 'Leads Quentes', value: hotLeads, icon: Flame, color: 'from-red-500 to-rose-600', iconBg: 'bg-red-100 text-red-600', badge: `≥80 score` },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative rounded-2xl bg-white border border-gray-100 p-4 overflow-hidden group hover:shadow-lg hover:border-gray-200 transition-all"
              >
                <div className={cn('absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-20 bg-gradient-to-br', stat.color)} />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-extrabold text-gray-900 mt-1">{stat.value}</p>
                    {stat.badge && (
                      <span className="text-[9px] font-medium text-gray-400 bg-gray-100 rounded-md px-1.5 py-0.5 mt-1 inline-block">{stat.badge}</span>
                    )}
                  </div>
                  <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', stat.iconBg)}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Controls row */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 lg:px-6 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-gray-900 hidden sm:block">CRM & Leads</h1>
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition-colors group-focus-within:text-brand-500" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="input-modern rounded-xl py-2.5 pl-10 pr-4 text-sm w-48 lg:w-64"
              />
              {searchFilter && (
                <button onClick={() => setSearchFilter('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex rounded-xl border border-gray-200 p-1 bg-gray-50">
              {[
                { mode: 'kanban' as const, icon: LayoutGrid, label: 'Kanban' },
                { mode: 'list' as const, icon: List, label: 'Lista' },
              ].map(v => (
                <button
                  key={v.mode}
                  onClick={() => setViewMode(v.mode)}
                  className={cn('relative rounded-lg px-3 py-1.5 text-xs font-semibold transition-all flex items-center gap-1.5', viewMode === v.mode ? 'text-white' : 'text-gray-500 hover:text-gray-700')}
                >
                  {viewMode === v.mode && (
                    <motion.div layoutId="viewToggle" className="absolute inset-0 rounded-lg gradient-brand shadow-lg" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                  )}
                  <v.icon className="h-3.5 w-3.5 relative z-10" />
                  <span className="relative z-10 hidden sm:inline">{v.label}</span>
                </button>
              ))}
            </div>

            {/* Sort */}
            {viewMode === 'list' && (
              <button
                onClick={() => toggleSort(sortField)}
                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{sortField === 'name' ? 'Nome' : sortField === 'score' ? 'Score' : sortField === 'value' ? 'Valor' : 'Data'}</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", sortDir === 'asc' && 'rotate-180')} />
              </button>
            )}

            {/* Filters */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowFilters(true)}
              className={cn(
                'flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                activeFiltersCount > 0 ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Filtros</span>
              {activeFiltersCount > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {activeFiltersCount}
                </span>
              )}
            </motion.button>

            {/* Export */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowExport(true)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50"
            >
              <Download className="h-3.5 w-3.5" />
            </motion.button>

            {/* AI Insights */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={analyzeWithAI}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-violet-500/25"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">IA Insights</span>
            </motion.button>

            {/* New Lead */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={openNewLeadModal}
              className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-500/25"
            >
              <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo Lead</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Active filters chips */}
      <AnimatePresence>
        {activeFiltersCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-gray-200/60 bg-brand-50/30"
          >
            <div className="flex items-center gap-2 px-4 lg:px-6 py-2.5">
              <span className="text-xs font-semibold text-gray-500">Filtros:</span>
              {filterSource !== 'all' && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm">
                  {filterSource}
                  <button onClick={() => setFilterSource('all')} className="hover:text-brand-900"><X className="h-3 w-3" /></button>
                </span>
              )}
              {filterStatus !== 'all' && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm">
                  {statusLabels[filterStatus as LeadStatus]}
                  <button onClick={() => setFilterStatus('all')} className="hover:text-brand-900"><X className="h-3 w-3" /></button>
                </span>
              )}
              {filterAssigned !== 'all' && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm">
                  {settingsUsers.find(u => u._id === filterAssigned)?.name}
                  <button onClick={() => setFilterAssigned('all')} className="hover:text-brand-900"><X className="h-3 w-3" /></button>
                </span>
              )}
              {filterTag && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white border border-brand-200 px-2.5 py-1 text-xs font-semibold text-brand-700 shadow-sm">
                  Tag: {filterTag}
                  <button onClick={() => setFilterTag('')} className="hover:text-brand-900"><X className="h-3 w-3" /></button>
                </span>
              )}
              <button onClick={resetFilters} className="text-xs font-semibold text-brand-600 hover:text-brand-800 ml-2">
                Limpar todos
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pipeline Tabs */}
      <div className="flex gap-1 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl px-4 lg:px-6 overflow-x-auto">
        {localPipelines.map((p) => {
          const count = leads.filter(l => l.pipelineId === p._id).length;
          return (
            <button
              key={p._id}
              onClick={() => { setSelectedPipelineId(p._id); setSelectedLeads(new Set()); }}
              className={cn(
                'relative border-b-2 px-5 py-3.5 text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap',
                selectedPipelineId === p._id ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-400 hover:text-gray-600'
              )}
            >
              {p.name}
              <span className={cn('text-[10px] font-bold rounded-full px-2 py-0.5', selectedPipelineId === p._id ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500')}>
                {count}
              </span>
              {selectedPipelineId === p._id && (
                <motion.div layoutId="pipelineTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto p-4 lg:p-6 gradient-mesh">
          {pipelineLeads.length === 0 ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center h-full">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-brand-100 to-violet-100 flex items-center justify-center mb-5">
                <Search className="h-12 w-12 text-brand-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Nenhum lead encontrado</h3>
              <p className="text-sm text-gray-400 mb-6 text-center max-w-sm">
                {activeFiltersCount > 0 || searchFilter ? 'Tente ajustar seus filtros ou termos de busca' : 'Crie o primeiro lead para começar a vender'}
              </p>
              <div className="flex gap-3">
                {(activeFiltersCount > 0 || searchFilter) && (
                  <button onClick={() => { resetFilters(); setSearchFilter(''); }} className="rounded-xl border-2 border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600 hover:bg-white transition-colors">
                    Limpar filtros
                  </button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={openNewLeadModal}
                  className="btn-primary rounded-xl px-6 py-3 text-sm font-bold text-white flex items-center gap-2 shadow-lg shadow-brand-500/25"
                >
                  <Plus className="h-4 w-4" /> Novo Lead
                </motion.button>
              </div>
            </motion.div>
          ) : viewMode === 'kanban' ? (
            /* ─── KANBAN VIEW ─── */
            <div className="flex gap-4 h-full pb-4 overflow-x-auto" style={{ minWidth: `${(pipeline.stages.length + 1) * 300}px` }}>
              {pipeline.stages.map((stage, stageIdx) => {
                const stageLeads = pipelineLeads.filter(l => l.stageId === stage._id);
                const stageValue = stageLeads.reduce((sum, l) => sum + l.value, 0);
                return (
                  <motion.div
                    key={stage._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: stageIdx * 0.05 }}
                    className={cn(
                      'flex flex-1 min-w-[280px] max-w-[400px] shrink-0 flex-col rounded-2xl border-2 transition-all duration-200',
                      dragOverStage === stage._id ? 'border-brand-400 bg-brand-50/60 scale-[1.01] shadow-lg shadow-brand-500/10' : 'border-gray-200/60 bg-white/60 backdrop-blur-sm'
                    )}
                    onDragOver={(e) => handleDragOver(e, stage._id)}
                    onDragLeave={() => setDragOverStage(null)}
                    onDrop={() => handleDrop(stage._id)}
                  >
                    {/* Stage header */}
                    <div className="flex items-center justify-between p-4 pb-3 group">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full shadow-md" style={{ backgroundColor: stage.color, boxShadow: `0 4px 12px ${stage.color}50` }} />
                        <h3 className="text-sm font-bold text-gray-900">{stage.name}</h3>
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500 px-2">
                          {stageLeads.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">R$ {(stageValue / 1000).toFixed(0)}K</span>
                        {/* Stage actions */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditStageModal(stage); }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                            title="Editar etapa"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingStage(stage._id); }}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                            title="Excluir etapa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="flex-1 space-y-3 overflow-auto px-3 pb-3" style={{ maxHeight: 'calc(100vh - 380px)' }}>
                      <AnimatePresence>
                        {stageLeads.map((lead, leadIdx) => (
                          <motion.div
                            key={lead._id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: leadIdx * 0.02 }}
                            draggable
                            onDragStart={() => handleDragStart(lead._id)}
                            onClick={() => setSelectedLead(lead._id)}
                            whileHover={{ y: -3, transition: { duration: 0.15 } }}
                            className={cn(
                              'cursor-pointer rounded-2xl border-2 bg-white p-4 shadow-sm transition-all group relative overflow-hidden',
                              draggedLead === lead._id ? 'opacity-50 rotate-1 scale-105 shadow-xl' : '',
                              selectedLead === lead._id ? 'border-brand-400 ring-2 ring-brand-400/20 shadow-brand-100' : 'border-gray-100 hover:shadow-lg hover:border-gray-200',
                              lead.status === 'won' && 'border-l-4 border-l-emerald-500',
                              lead.status === 'lost' && 'border-l-4 border-l-red-400 opacity-60'
                            )}
                          >
                            {/* Hot badge */}
                            {lead.score >= 80 && (
                              <div className="absolute top-3 right-3">
                                <span className="flex items-center gap-1 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-lg">
                                  <Flame className="h-2.5 w-2.5" /> HOT
                                </span>
                              </div>
                            )}

                            {/* Card header */}
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selectedLeads.has(lead._id)}
                                onChange={(e) => { e.stopPropagation(); toggleLeadSelection(lead._id); }}
                                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 opacity-0 group-hover:opacity-100 transition-opacity mt-1"
                                onClick={e => e.stopPropagation()}
                              />
                              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 text-sm font-bold text-brand-700 shrink-0">
                                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-gray-900 truncate pr-6">{lead.name}</h4>
                                {lead.company && (
                                  <p className="text-xs text-gray-400 font-medium flex items-center gap-1 mt-0.5 truncate">
                                    <Building2 className="h-3 w-3 shrink-0" />{lead.company}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Score gauge + Value */}
                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center gap-2">
                                <ScoreGauge score={lead.score} />
                                <span className={cn('rounded-lg px-2 py-0.5 text-[10px] font-bold', statusColors[lead.status])}>
                                  {statusLabels[lead.status]}
                                </span>
                              </div>
                              <p className="text-base font-extrabold text-gray-900">
                                R$ {lead.value >= 1000 ? `${(lead.value / 1000).toFixed(0)}K` : lead.value.toLocaleString('pt-BR')}
                              </p>
                            </div>

                            {/* Tags + Meta */}
                            <div className="flex items-center justify-between mt-3">
                              <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                                {lead.tags.slice(0, 2).map(tag => (
                                  <span key={tag} className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 font-medium truncate max-w-[80px]">
                                    <Tag className="h-2.5 w-2.5 shrink-0" />{tag}
                                  </span>
                                ))}
                                {lead.tags.length > 2 && (
                                  <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400 font-medium">
                                    +{lead.tags.length - 2}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1 shrink-0">
                                <Clock className="h-2.5 w-2.5" />{lead.lastActivity}
                              </span>
                            </div>

                            {/* Hover actions */}
                            <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1 py-2 bg-gradient-to-t from-white via-white to-transparent opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                              <button
                                onClick={e => { e.stopPropagation(); setSelectedLead(lead._id); }}
                                className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-brand-100 hover:text-brand-600 shadow-sm transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); openEditModal(lead); }}
                                className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-amber-100 hover:text-amber-600 shadow-sm transition-colors"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <div className="relative">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setQuickActionLead(quickActionLead === lead._id ? null : lead._id); }}
                                  className="rounded-lg bg-gray-100 p-2 text-gray-500 hover:bg-gray-200 shadow-sm transition-colors"
                                >
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                                <AnimatePresence>
                                  {quickActionLead === lead._id && renderQuickActions(lead)}
                                </AnimatePresence>
                              </div>
                            </div>

                            {/* Drag handle */}
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                              <GripVertical className="h-4 w-4 text-gray-300 cursor-grab" />
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {stageLeads.length === 0 && (
                        <div className="flex h-32 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 text-xs text-gray-400 font-medium gap-2 bg-gray-50/50">
                          <ChevronRight className="h-6 w-6" />
                          Arraste leads aqui
                        </div>
                      )}
                    </div>

                    {/* Stage footer */}
                    <div className="px-3 pb-3">
                      <button
                        onClick={() => {
                          setFormData({ ...emptyLead, pipelineId: selectedPipelineId, stageId: stage._id });
                          setFormErrors({});
                          setShowNewLead(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 py-2.5 text-xs font-semibold text-gray-400 hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50/50 transition-colors"
                      >
                        <Plus className="h-4 w-4" /> Adicionar lead
                      </button>
                    </div>
                  </motion.div>
                );
              })}

              {/* ─── ADD NEW STAGE COLUMN ─── */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: pipeline.stages.length * 0.05 }}
                className="flex min-w-[280px] max-w-[300px] shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 cursor-pointer hover:border-brand-400 hover:bg-brand-50/30 transition-all group"
                onClick={() => setShowNewStage(true)}
              >
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                  className="h-14 w-14 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 group-hover:from-brand-400 group-hover:to-violet-500 flex items-center justify-center mb-4 shadow-lg transition-all"
                >
                  <Plus className="h-7 w-7 text-gray-500 group-hover:text-white transition-colors" />
                </motion.div>
                <h4 className="text-sm font-bold text-gray-500 group-hover:text-brand-600 transition-colors mb-1">Nova Etapa</h4>
                <p className="text-xs text-gray-400 group-hover:text-brand-500 transition-colors text-center">
                  Clique para adicionar<br />uma nova coluna
                </p>
              </motion.div>
            </div>
          ) : (
            /* ─── LIST VIEW ─── */
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="px-4 py-4 text-left w-12">
                        <input
                          type="checkbox"
                          checked={selectedLeads.size === pipelineLeads.length && pipelineLeads.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        />
                      </th>
                      <th className="px-4 py-4 text-left">
                        <button onClick={() => toggleSort('name')} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors">
                          Lead <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Empresa</th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Etapa</th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Status</th>
                      <th className="px-4 py-4 text-left">
                        <button onClick={() => toggleSort('score')} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors">
                          Score <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-4 text-left">
                        <button onClick={() => toggleSort('value')} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors">
                          Valor <ArrowUpDown className="h-3 w-3" />
                        </button>
                      </th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden xl:table-cell">Responsável</th>
                      <th className="px-4 py-4 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pipelineLeads.map((lead, i) => {
                      const stage = pipeline.stages.find(s => s._id === lead.stageId);
                      const user = settingsUsers.find(u => u._id === lead.assignedTo);
                      return (
                        <motion.tr
                          key={lead._id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.02 }}
                          className={cn(
                            'border-b border-gray-100 hover:bg-brand-50/30 cursor-pointer transition-colors',
                            selectedLeads.has(lead._id) && 'bg-brand-50/50',
                            lead.status === 'won' && 'bg-emerald-50/30',
                            lead.status === 'lost' && 'opacity-50'
                          )}
                          onClick={() => setSelectedLead(lead._id)}
                        >
                          <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedLeads.has(lead._id)}
                              onChange={() => toggleLeadSelection(lead._id)}
                              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 text-xs font-bold text-brand-700 shrink-0">
                                {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
                                <p className="text-xs text-gray-400 truncate">{lead.email}</p>
                              </div>
                              {lead.score >= 80 && (
                                <span className="flex items-center gap-1 rounded-md bg-gradient-to-r from-red-500 to-orange-500 px-1.5 py-0.5 text-[8px] font-bold text-white shrink-0">
                                  <Flame className="h-2 w-2" /> HOT
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 hidden lg:table-cell">{lead.company || '—'}</td>
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold" style={{ backgroundColor: stage?.color + '15', color: stage?.color }}>
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: stage?.color }} />
                              {stage?.name}
                            </span>
                          </td>
                          <td className="px-4 py-4 hidden sm:table-cell">
                            <span className={cn('rounded-lg px-2.5 py-1 text-xs font-bold', statusColors[lead.status])}>
                              {statusLabels[lead.status]}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <ScoreGauge score={lead.score} />
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-bold text-gray-900">R$ {lead.value.toLocaleString('pt-BR')}</p>
                          </td>
                          <td className="px-4 py-4 hidden xl:table-cell">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-brand-100 to-violet-100 flex items-center justify-center text-[9px] font-bold text-brand-700">
                                {user?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                              </div>
                              <span className="text-xs text-gray-600 font-medium">{user?.name.split(' ')[0]}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <button onClick={() => setSelectedLead(lead._id)} className="rounded-lg p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                                <Eye className="h-4 w-4" />
                              </button>
                              <button onClick={() => openEditModal(lead)} className="rounded-lg p-2 text-gray-400 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <div className="relative">
                                <button
                                  onClick={() => setQuickActionLead(quickActionLead === lead._id ? null : lead._id)}
                                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                <AnimatePresence>
                                  {quickActionLead === lead._id && renderQuickActions(lead)}
                                </AnimatePresence>
                              </div>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table footer */}
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
                <p className="text-xs text-gray-500 font-medium">
                  {selectedLeads.size > 0 ? `${selectedLeads.size} de ${pipelineLeads.length} selecionados` : `${pipelineLeads.length} leads`}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>Total: <strong className="text-gray-700">R$ {totalValue.toLocaleString('pt-BR')}</strong></span>
                  <span className="text-gray-300">|</span>
                  <span>Score médio: <strong className="text-gray-700">{avgScore}</strong></span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {leadDetail && renderDetailPanel()}
        </AnimatePresence>
      </div>

      {/* ─── MODALS ─── */}
      <AnimatePresence>
        {showNewLead && renderLeadForm(false)}
        {editingLead && renderLeadForm(true)}
        {deletingLead && renderDeleteModal()}
        {showFilters && renderFiltersPanel()}
        {showExport && renderExportModal()}
        {selectedLeads.size > 0 && renderBulkActionsBar()}
        {showNewStage && renderStageFormModal(false)}
        {editingStage && renderStageFormModal(true)}
        {deletingStage && renderDeleteStageModal()}
      </AnimatePresence>

      {/* Schedule Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowScheduleModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">Agendar Evento</h3>
                      <p className="text-amber-100 text-xs">Criar evento na agenda</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowScheduleModal(false)}
                    className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Form */}
              <div className="p-6 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Título do Evento *</label>
                  <input
                    type="text"
                    value={scheduleData.title}
                    onChange={(e) => setScheduleData({ ...scheduleData, title: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    placeholder="Ex: Reunião com cliente"
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data *</label>
                    <input
                      type="date"
                      value={scheduleData.date}
                      onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Horário *</label>
                    <input
                      type="time"
                      value={scheduleData.time}
                      onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tipo de Evento</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'meeting', label: 'Reunião', icon: '📅', color: 'amber' },
                      { id: 'call', label: 'Ligação', icon: '📞', color: 'emerald' },
                      { id: 'followup', label: 'Follow-up', icon: '🔄', color: 'blue' },
                      { id: 'presentation', label: 'Apresentação', icon: '📊', color: 'violet' },
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setScheduleData({ ...scheduleData, type: type.id as typeof scheduleData.type })}
                        className={cn(
                          'flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all',
                          scheduleData.type === type.id
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        )}
                      >
                        <span className="text-lg">{type.icon}</span>
                        <span className="text-[10px] font-semibold">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Notas</label>
                  <textarea
                    value={scheduleData.notes}
                    onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none"
                    placeholder="Observações sobre o evento..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (!scheduleData.title.trim() || !scheduleData.date) {
                      showToast('Preencha título e data', 'error');
                      return;
                    }

                    // Create the calendar event
                    const [hours, minutes] = scheduleData.time.split(':');
                    const startDate = new Date(scheduleData.date);
                    startDate.setHours(parseInt(hours), parseInt(minutes));
                    
                    const endDate = new Date(startDate);
                    endDate.setHours(endDate.getHours() + 1); // 1 hour duration

                    const categoryMap: Record<string, string> = {
                      meeting: 'meeting',
                      call: 'call',
                      followup: 'task',
                      presentation: 'meeting'
                    };

                    addCalendarEvent({
                      _id: `evt_${Date.now()}`,
                      title: scheduleData.title,
                      description: scheduleData.notes,
                      category: categoryMap[scheduleData.type] as 'meeting' | 'call' | 'task' | 'deadline' | 'personal' | 'follow_up',
                      date: scheduleData.date,
                      startTime: scheduleData.time,
                      endTime: `${(parseInt(hours) + 1).toString().padStart(2, '0')}:${minutes}`,
                      color: scheduleData.type === 'meeting' ? '#f59e0b' : scheduleData.type === 'call' ? '#10b981' : scheduleData.type === 'followup' ? '#3b82f6' : '#8b5cf6',
                      assignedTo: leadDetail?.assignedTo,
                      leadId: selectedLead || undefined,
                      leadName: leadDetail?.name,
                    });

                    showToast('Evento agendado com sucesso!');
                    setShowScheduleModal(false);
                    setScheduleData({
                      title: '',
                      date: new Date().toISOString().split('T')[0],
                      time: '10:00',
                      type: 'meeting',
                      notes: ''
                    });
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 transition-all"
                >
                  Agendar Evento
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close quick actions */}
      {quickActionLead && (
        <div className="fixed inset-0 z-40" onClick={() => setQuickActionLead(null)} />
      )}

      {/* AI Insights Modal */}
      <AnimatePresence>
        {showAIInsights && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowAIInsights(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">IA Insights</h2>
                      <p className="text-white/80 text-sm">Análise inteligente do seu pipeline</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAIInsights(false)}
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    <X className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto max-h-[calc(85vh-100px)]">
                {aiAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center mb-4 animate-pulse">
                      <Sparkles className="h-8 w-8 text-white animate-spin" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Analisando leads...</h3>
                    <p className="text-gray-500 text-sm text-center max-w-xs">
                      Nossa IA está processando seus dados para gerar insights personalizados
                    </p>
                    <div className="mt-4 flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 rounded-full bg-fuchsia-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 rounded-full bg-pink-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                ) : aiInsightsData ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="p-4 bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-xl border border-violet-100">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-1">Resumo da Análise</h4>
                          <p className="text-sm text-gray-600">{aiInsightsData.summary}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 bg-violet-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-violet-600">{aiInsightsData.stats.avgScore}%</div>
                        <div className="text-xs text-gray-500">Score Médio</div>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-emerald-600">{aiInsightsData.stats.conversionRate}%</div>
                        <div className="text-xs text-gray-500">Conversão</div>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-amber-600">{aiInsightsData.stats.avgDaysToConvert}d</div>
                        <div className="text-xs text-gray-500">Média p/ Fechar</div>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-blue-600">R${(aiInsightsData.stats.totalValue / 1000).toFixed(0)}K</div>
                        <div className="text-xs text-gray-500">Valor Pipeline</div>
                      </div>
                    </div>

                    {/* Hot Leads */}
                    {aiInsightsData.hotLeads.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Flame className="h-4 w-4 text-orange-500" />
                          Leads Quentes ({aiInsightsData.hotLeads.length})
                        </h4>
                        <div className="space-y-2">
                          {aiInsightsData.hotLeads.map((lead) => (
                            <div
                              key={lead.id}
                              onClick={() => {
                                setSelectedLead(lead.id);
                                setShowAIInsights(false);
                              }}
                              className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100 cursor-pointer hover:shadow-md transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">{lead.name.charAt(0)}</span>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-800">{lead.name}</div>
                                  <div className="text-xs text-gray-500">{lead.reason}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-bold text-orange-600">{lead.score}%</div>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cold Leads */}
                    {aiInsightsData.coldLeads.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Clock className="h-4 w-4 text-blue-500" />
                          Leads Esfriando ({aiInsightsData.coldLeads.length})
                        </h4>
                        <div className="space-y-2">
                          {aiInsightsData.coldLeads.map((lead) => (
                            <div
                              key={lead.id}
                              onClick={() => {
                                setSelectedLead(lead.id);
                                setShowAIInsights(false);
                              }}
                              className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100 cursor-pointer hover:shadow-md transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">{lead.name.charAt(0)}</span>
                                </div>
                                <div>
                                  <div className="font-medium text-gray-800">{lead.name}</div>
                                  <div className="text-xs text-gray-500">{lead.reason}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-blue-600">{lead.daysSinceContact} dias sem contato</div>
                                <ChevronRight className="h-4 w-4 text-gray-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations */}
                    {aiInsightsData.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                          <Target className="h-4 w-4 text-violet-500" />
                          Recomendações da IA
                        </h4>
                        <div className="space-y-2">
                          {aiInsightsData.recommendations.map((rec, idx) => (
                            <div
                              key={idx}
                              className={cn(
                                'p-3 rounded-xl border',
                                rec.type === 'action' && 'bg-emerald-50 border-emerald-100',
                                rec.type === 'warning' && 'bg-amber-50 border-amber-100',
                                rec.type === 'opportunity' && 'bg-violet-50 border-violet-100'
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <div className={cn(
                                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                                  rec.type === 'action' && 'bg-emerald-100',
                                  rec.type === 'warning' && 'bg-amber-100',
                                  rec.type === 'opportunity' && 'bg-violet-100'
                                )}>
                                  {rec.type === 'action' && <Zap className="h-4 w-4 text-emerald-600" />}
                                  {rec.type === 'warning' && <Clock className="h-4 w-4 text-amber-600" />}
                                  {rec.type === 'opportunity' && <Target className="h-4 w-4 text-violet-600" />}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-800 text-sm">{rec.title}</div>
                                  <div className="text-xs text-gray-500 mt-0.5">{rec.description}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                      <button
                        onClick={() => {
                          analyzeWithAI();
                        }}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        <Sparkles className="h-4 w-4" />
                        Refazer Análise
                      </button>
                      <button
                        onClick={() => setShowAIInsights(false)}
                        className="px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={cn(
              'fixed bottom-6 left-1/2 z-[200] rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-2xl flex items-center gap-2',
              toast.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-red-500 to-rose-600'
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
