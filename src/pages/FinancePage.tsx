import { logger } from '../utils/logger';
import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../store';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { financeService } from '../api/services/financeService';
import type { FinanceRecord, TransactionType, TransactionStatus, TransactionCategory } from '../types';
import {
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, Plus, Search, Filter,
  X, Eye, Edit3, Trash2, Download, Receipt, CreditCard,
  Calendar, FileText, AlertCircle, CheckCircle2, Clock, XCircle, MoreHorizontal,
  ArrowUp, ArrowDown, Copy, Users, Target, BarChart3, Percent, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Legend
} from 'recharts';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const TYPE_CONFIG: Record<TransactionType, { label: string; color: string; bg: string; icon: typeof DollarSign }> = {
  revenue: { label: 'Receita', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200', icon: ArrowUpRight },
  expense: { label: 'Despesa', color: 'text-red-600', bg: 'bg-red-50 border-red-200', icon: ArrowDownRight },
  commission: { label: 'Comissão', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', icon: Users },
  refund: { label: 'Reembolso', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', icon: RefreshCw },
};

const STATUS_CONFIG: Record<TransactionStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  paid: { label: 'Pago', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  pending: { label: 'Pendente', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200', icon: Clock },
  overdue: { label: 'Vencido', color: 'text-red-700', bg: 'bg-red-50 border-red-200', icon: AlertCircle },
  cancelled: { label: 'Cancelado', color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', icon: XCircle },
};

const CATEGORY_CONFIG: Record<TransactionCategory, { label: string; color: string }> = {
  services: { label: 'Serviços', color: '#6366f1' },
  products: { label: 'Produtos', color: '#8b5cf6' },
  subscription: { label: 'Recorrente', color: '#3b82f6' },
  commission: { label: 'Comissão', color: '#06b6d4' },
  marketing: { label: 'Marketing', color: '#f59e0b' },
  operations: { label: 'Operações', color: '#64748b' },
  taxes: { label: 'Impostos', color: '#ef4444' },
  refund: { label: 'Reembolso', color: '#f97316' },
  other: { label: 'Outros', color: '#a855f7' },
};

const SELLERS: string[] = [];

function formatCurrency(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function FinancePage() {
  const { financeRecords, addFinanceRecord, updateFinanceRecord, deleteFinanceRecord, clients, leads } = useStore();

  // Load finance records from backend on mount
  useEffect(() => {
    const loadRecords = async () => {
      try {
        const response = await financeService.getAll();
        const serverRecords = response.data || [];
        const currentRecords = useStore.getState().financeRecords;
        currentRecords.forEach(r => deleteFinanceRecord(r._id));
        serverRecords.forEach(r => addFinanceRecord(r));
      } catch (err) {
        logger.error('Erro ao carregar registros financeiros:', err);
      }
    };
    loadRecords();
  }, []);

  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<TransactionStatus | 'all'>('all');
  const [sortField, setSortField] = useState<'date' | 'value' | 'description'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FinanceRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<FinanceRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<FinanceRecord | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sellerFilter, setSellerFilter] = useState('all');
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'goals'>('transactions');

  // Form state
  const emptyForm = {
    description: '', type: 'revenue' as TransactionType, category: 'services' as TransactionCategory,
    value: '', client: '', salesperson: SELLERS[0], status: 'pending' as TransactionStatus,
    date: new Date().toISOString().split('T')[0], dueDate: '', notes: '',
  };
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});

  // Computed
  const filtered = useMemo(() => {
    let list = [...financeRecords];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => r.description.toLowerCase().includes(q) || (r.client || '').toLowerCase().includes(q) || r.salesperson.toLowerCase().includes(q));
    }
    if (typeFilter !== 'all') list = list.filter(r => r.type === typeFilter);
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    if (sellerFilter !== 'all') list = list.filter(r => r.salesperson === sellerFilter);
    if (dateFrom) list = list.filter(r => r.date >= dateFrom);
    if (dateTo) list = list.filter(r => r.date <= dateTo);
    list.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'value') return (a.value - b.value) * dir;
      if (sortField === 'description') return a.description.localeCompare(b.description) * dir;
      return a.date.localeCompare(b.date) * dir;
    });
    return list;
  }, [financeRecords, searchQuery, typeFilter, statusFilter, sellerFilter, dateFrom, dateTo, sortField, sortDir]);

  const stats = useMemo(() => {
    const revenue = financeRecords.filter(r => r.type === 'revenue' && r.status === 'paid').reduce((s, r) => s + r.value, 0);
    const pending = financeRecords.filter(r => r.status === 'pending').reduce((s, r) => s + r.value, 0);
    const expenses = financeRecords.filter(r => r.type === 'expense' && r.status === 'paid').reduce((s, r) => s + r.value, 0);
    const commissions = financeRecords.filter(r => r.type === 'commission').reduce((s, r) => s + r.value, 0);
    const refunds = financeRecords.filter(r => r.type === 'refund').reduce((s, r) => s + r.value, 0);
    const overdue = financeRecords.filter(r => r.status === 'overdue').reduce((s, r) => s + r.value, 0);
    const net = revenue - expenses - commissions - refunds;
    const revenueRecords = financeRecords.filter(r => r.type === 'revenue' && r.status === 'paid');
    const avgTicket = revenueRecords.length > 0 ? revenue / revenueRecords.length : 0;
    return { revenue, pending, expenses, commissions, refunds, overdue, net, avgTicket, totalTransactions: financeRecords.length };
  }, [financeRecords]);

  // Chart data
  const revenueChartData = [] as { month: string; receita: number; despesa: number }[];

  const categoryData = useMemo(() => {
    const cats: Record<string, number> = {};
    financeRecords.filter(r => r.type === 'revenue' || r.type === 'commission').forEach(r => {
      const cat = CATEGORY_CONFIG[r.category]?.label || 'Outros';
      cats[cat] = (cats[cat] || 0) + r.value;
    });
    return Object.entries(cats).map(([name, value]) => {
      const entry = Object.values(CATEGORY_CONFIG).find(c => c.label === name);
      return { name, value, color: entry?.color || '#a855f7' };
    }).sort((a, b) => b.value - a.value);
  }, [financeRecords]);

  const sellerGoals = [] as { name: string; revenue: number; goal: number; deals: number; commRate: number }[];

  const activeFilterCount = [typeFilter !== 'all', statusFilter !== 'all', sellerFilter !== 'all', !!dateFrom, !!dateTo].filter(Boolean).length;

  // Handlers
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const selectAll = () => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(r => r._id));

  const validateForm = () => {
    const errors: Record<string, boolean> = {};
    if (!form.description.trim()) errors.description = true;
    if (!form.value || parseFloat(form.value) <= 0) errors.value = true;
    if (!form.date) errors.date = true;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openCreate = () => {
    setForm(emptyForm);
    setFormErrors({});
    setShowCreateModal(true);
  };

  const openEdit = (record: FinanceRecord) => {
    setForm({
      description: record.description, type: record.type, category: record.category,
      value: record.value.toString(), client: record.client || '', salesperson: record.salesperson,
      status: record.status, date: record.date, dueDate: record.dueDate || '', notes: record.notes || '',
    });
    setFormErrors({});
    setEditingRecord(record);
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    const data: Omit<FinanceRecord, '_id'> = {
      description: form.description, type: form.type, category: form.category,
      value: parseFloat(form.value), client: form.client || undefined, salesperson: form.salesperson,
      status: form.status, date: form.date, dueDate: form.dueDate || undefined,
      notes: form.notes || undefined, pipeline: form.type === 'expense' ? 'Operações' : 'Vendas B2B',
    };
    try {
      if (editingRecord) {
        const updated = await financeService.update(editingRecord._id, data);
        updateFinanceRecord(editingRecord._id, updated);
        if (viewingRecord?._id === editingRecord._id) setViewingRecord({ ...editingRecord, ...updated });
      } else {
        const created = await financeService.create(data);
        addFinanceRecord(created);
      }
    } catch (err) {
      logger.error('Erro ao salvar registro:', err);
      // Fallback local
      if (editingRecord) {
        updateFinanceRecord(editingRecord._id, data);
        if (viewingRecord?._id === editingRecord._id) setViewingRecord({ ...editingRecord, ...data });
      } else {
        addFinanceRecord({ _id: `f_${Date.now()}`, ...data, invoiceNumber: `INV-${Date.now().toString().slice(-6)}` });
      }
    }
    setShowCreateModal(false);
    setEditingRecord(null);
  };

  const handleDelete = async () => {
    if (!deletingRecord) return;
    try {
      await financeService.delete(deletingRecord._id);
      deleteFinanceRecord(deletingRecord._id);
      if (viewingRecord?._id === deletingRecord._id) setViewingRecord(null);
    } catch (err) {
      logger.error('Erro ao excluir registro:', err);
      deleteFinanceRecord(deletingRecord._id);
      if (viewingRecord?._id === deletingRecord._id) setViewingRecord(null);
    }
    setDeletingRecord(null);
    setSelectedIds(prev => prev.filter(id => id !== deletingRecord._id));
  };

  const handleBulkDelete = async () => {
    try {
      await financeService.bulkDelete(selectedIds);
      selectedIds.forEach(id => deleteFinanceRecord(id));
    } catch (err) {
      logger.error('Erro ao excluir registros:', err);
      selectedIds.forEach(id => deleteFinanceRecord(id));
    }
    setSelectedIds([]);
    setShowBulkDeleteConfirm(false);
  };

  const handleBulkStatus = async (status: TransactionStatus) => {
    try {
      await financeService.bulkUpdate(selectedIds, { status });
      selectedIds.forEach(id => updateFinanceRecord(id, { status }));
    } catch (err) {
      logger.error('Erro ao atualizar registros:', err);
      selectedIds.forEach(id => updateFinanceRecord(id, { status }));
    }
    setSelectedIds([]);
  };

  const exportCSV = () => {
    const header = 'Data,Descrição,Tipo,Categoria,Valor,Cliente,Vendedor,Status\n';
    const rows = filtered.map(r =>
      `${r.date},"${r.description}",${TYPE_CONFIG[r.type].label},${CATEGORY_CONFIG[r.category].label},${r.value},"${r.client || ''}","${r.salesperson}",${STATUS_CONFIG[r.status].label}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `financeiro_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  const clearFilters = () => {
    setTypeFilter('all'); setStatusFilter('all'); setSellerFilter('all');
    setDateFrom(''); setDateTo(''); setSearchQuery('');
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
        <p className="text-xs font-bold text-gray-700 mb-1">{label}</p>
        {payload.map((p, i) => (
          <p key={i} className="text-xs" style={{ color: p.color }}>
            {p.name === 'receita' ? 'Receita' : 'Despesa'}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  };

  const PieTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; color: string } }> }) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0].payload;
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
        <p className="text-xs font-bold" style={{ color: d.color }}>{d.name}</p>
        <p className="text-sm font-extrabold text-gray-900">{formatCurrency(d.value)}</p>
      </div>
    );
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 p-6">
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Gestão Financeira</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.totalTransactions} transações · Saldo líquido: <span className="font-bold text-emerald-600">{formatCurrency(stats.net)}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={exportCSV}
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" /> Exportar
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/30 transition-all">
            <Plus className="h-4 w-4" /> Nova Transação
          </motion.button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Receita Total', value: stats.revenue, icon: DollarSign, trend: 23.5, trendUp: true, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
          { label: 'Pendente', value: stats.pending, icon: Clock, trend: 0, trendUp: false, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', iconColor: 'text-amber-600' },
          { label: 'Vencido', value: stats.overdue, icon: AlertCircle, trend: 0, trendUp: false, gradient: 'from-red-500 to-rose-500', bg: 'bg-red-50', iconColor: 'text-red-600' },
          { label: 'Despesas', value: stats.expenses, icon: CreditCard, trend: 5.2, trendUp: false, gradient: 'from-red-400 to-pink-500', bg: 'bg-red-50', iconColor: 'text-red-500' },
          { label: 'Comissões', value: stats.commissions, icon: Users, trend: 12.3, trendUp: true, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50', iconColor: 'text-blue-600' },
          { label: 'Ticket Médio', value: stats.avgTicket, icon: Target, trend: 8.7, trendUp: true, gradient: 'from-purple-500 to-violet-500', bg: 'bg-purple-50', iconColor: 'text-purple-600' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }} whileHover={{ y: -3, scale: 1.01 }}
              className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-all group">
              <div className={cn('absolute top-0 right-0 w-20 h-20 rounded-bl-[60px] opacity-10 bg-gradient-to-br', kpi.gradient)} />
              <div className="flex items-center justify-between mb-3">
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', kpi.bg)}>
                  <Icon className={cn('h-5 w-5', kpi.iconColor)} />
                </div>
                {kpi.trend > 0 && (
                  <span className={cn('flex items-center gap-0.5 text-[10px] font-bold rounded-full px-2 py-0.5',
                    kpi.trendUp ? 'text-emerald-600 bg-emerald-50' : 'text-red-500 bg-red-50')}>
                    {kpi.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {kpi.trend}%
                  </span>
                )}
              </div>
              <p className="text-lg font-extrabold text-gray-900">{formatCurrency(kpi.value)}</p>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">{kpi.label}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Charts */}
      <motion.div variants={item} className="grid lg:grid-cols-5 gap-5">
        {/* Revenue Trend Area Chart */}
        <div className="lg:col-span-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Receita vs Despesas</h3>
              <p className="text-xs text-gray-400 mt-0.5">Evolução mensal (últimos 6 meses)</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" /> Receita</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-red-400 to-rose-500" /> Despesas</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueChartData}>
              <defs>
                <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="receita" stroke="#10b981" strokeWidth={3} fill="url(#colorReceita)" dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }} />
              <Area type="monotone" dataKey="despesa" stroke="#ef4444" strokeWidth={2} fill="url(#colorDespesa)" dot={{ r: 3, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} strokeDasharray="5 5" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Receita por Categoria</h3>
          <p className="text-xs text-gray-400 mb-4">Distribuição percentual</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>
                {categoryData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {categoryData.slice(0, 5).map(c => {
              const total = categoryData.reduce((s, x) => s + x.value, 0);
              const pct = total > 0 ? ((c.value / total) * 100).toFixed(0) : '0';
              return (
                <div key={c.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-[11px] text-gray-600 flex-1 truncate">{c.name}</span>
                  <span className="text-[11px] font-bold text-gray-900">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item} className="flex gap-1 border-b border-gray-200">
        {(['transactions', 'goals'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('relative px-5 py-3 text-sm font-semibold transition-colors',
              activeTab === tab ? 'text-brand-600' : 'text-gray-500 hover:text-gray-700')}>
            {tab === 'transactions' ? 'Transações' : 'Metas & Comissões'}
            {activeTab === tab && <motion.div layoutId="financeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600 rounded-full" />}
          </button>
        ))}
      </motion.div>

      {activeTab === 'transactions' && (
        <>
          {/* Filters Bar */}
          <motion.div variants={item} className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Buscar transações..."
                  className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none" />
              </div>

              {/* Type pills */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {([['all', 'Todos'], ['revenue', 'Receita'], ['expense', 'Despesa'], ['commission', 'Comissão']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setTypeFilter(val)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      typeFilter === val ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                    {label}
                  </button>
                ))}
              </div>

              {/* Status pills */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                {([['all', 'Todos'], ['paid', 'Pago'], ['pending', 'Pendente'], ['overdue', 'Vencido']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setStatusFilter(val)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      statusFilter === val ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
                    {label}
                    {val !== 'all' && <span className="ml-1 text-[10px] opacity-60">
                      {financeRecords.filter(r => r.status === val).length}
                    </span>}
                  </button>
                ))}
              </div>

              {/* More filters */}
              <button onClick={() => setShowFilters(!showFilters)}
                className={cn('flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all',
                  showFilters || activeFilterCount > 0 ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
                <Filter className="h-3.5 w-3.5" />
                Filtros
                {activeFilterCount > 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[9px] text-white font-bold">{activeFilterCount}</span>}
              </button>
            </div>

            {/* Extended filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">Vendedor</label>
                      <select value={sellerFilter} onChange={e => setSellerFilter(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 outline-none">
                        <option value="all">Todos</option>
                        {SELLERS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">Data início</label>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 outline-none" />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">Data fim</label>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-400 outline-none" />
                    </div>
                  </div>
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="mt-3 text-xs text-brand-600 font-semibold hover:text-brand-700">
                      Limpar todos os filtros
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Table */}
          <motion.div variants={item} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={selectedIds.length === filtered.length && filtered.length > 0} onChange={selectAll}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  </th>
                  <th onClick={() => handleSort('date')} className="cursor-pointer px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                    <div className="flex items-center gap-1">Data {sortField === 'date' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                  </th>
                  <th onClick={() => handleSort('description')} className="cursor-pointer px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                    <div className="flex items-center gap-1">Descrição {sortField === 'description' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Vendedor</th>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th onClick={() => handleSort('value')} className="cursor-pointer px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700">
                    <div className="flex items-center justify-end gap-1">Valor {sortField === 'value' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</div>
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center">
                      <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm font-semibold text-gray-400">Nenhuma transação encontrada</p>
                      <button onClick={openCreate} className="mt-3 text-sm font-semibold text-brand-600 hover:text-brand-700">+ Adicionar transação</button>
                    </td>
                  </tr>
                ) : filtered.map((record, i) => {
                  const typeConf = TYPE_CONFIG[record.type];
                  const statusConf = STATUS_CONFIG[record.status];
                  const TypeIcon = typeConf.icon;
                  const StatusIcon = statusConf.icon;
                  const isSelected = selectedIds.includes(record._id);
                  const catConf = CATEGORY_CONFIG[record.category];

                  return (
                    <motion.tr key={record._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className={cn('border-b border-gray-50 transition-colors group',
                        isSelected ? 'bg-brand-50/50' : 'hover:bg-gray-50/80',
                        record.status === 'overdue' && 'border-l-2 border-l-red-400')}>
                      <td className="px-4 py-3">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(record._id)}
                          className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          {new Date(record.date).toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-semibold text-gray-900">{record.description}</p>
                        {record.client && <p className="text-[11px] text-gray-400">{record.client}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold', typeConf.bg, typeConf.color)}>
                          <TypeIcon className="h-3 w-3" /> {typeConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: catConf.color }} />
                          <span className="text-xs text-gray-600">{catConf.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-violet-100 text-[9px] font-bold text-brand-700">
                            {record.salesperson.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="text-xs text-gray-600">{record.salesperson}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[10px] font-bold', statusConf.bg, statusConf.color)}>
                          <StatusIcon className="h-3 w-3" /> {statusConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={cn('text-sm font-bold', record.type === 'revenue' ? 'text-emerald-600' : record.type === 'expense' || record.type === 'refund' ? 'text-red-500' : 'text-blue-600')}>
                          {record.type === 'revenue' ? '+' : '−'}{formatCurrency(record.value)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="relative flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setViewingRecord(record)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-600 transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => openEdit(record)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-brand-600 transition-colors">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => { setActiveQuickAction(activeQuickAction === record._id ? null : record._id); }}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {/* Quick Actions Dropdown */}
                          <AnimatePresence>
                            {activeQuickAction === record._id && (
                              <motion.div initial={{ opacity: 0, scale: 0.95, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute top-full right-0 mt-1 w-48 rounded-xl border border-gray-200 bg-white shadow-xl z-30 overflow-hidden">
                                <button onClick={() => { setViewingRecord(record); setActiveQuickAction(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                                  <Eye className="h-3.5 w-3.5" /> Ver detalhes
                                </button>
                                <button onClick={() => { openEdit(record); setActiveQuickAction(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                                  <Edit3 className="h-3.5 w-3.5" /> Editar
                                </button>
                                <button onClick={() => {
                                  const dup: FinanceRecord = { ...record, _id: `f_${Date.now()}`, description: `${record.description} (cópia)` };
                                  addFinanceRecord(dup); setActiveQuickAction(null);
                                }} className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">
                                  <Copy className="h-3.5 w-3.5" /> Duplicar
                                </button>
                                {record.status === 'pending' && (
                                  <button onClick={() => { updateFinanceRecord(record._id, { status: 'paid' }); setActiveQuickAction(null); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como pago
                                  </button>
                                )}
                                <div className="border-t border-gray-100" />
                                <button onClick={() => { setDeletingRecord(record); setActiveQuickAction(null); }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50">
                                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table footer */}
            {filtered.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 bg-gray-50/50 border-t border-gray-100">
                <p className="text-[11px] text-gray-500">{filtered.length} transações</p>
                <div className="flex items-center gap-4 text-xs font-bold">
                  <span className="text-emerald-600">
                    Entradas: {formatCurrency(filtered.filter(r => r.type === 'revenue').reduce((s, r) => s + r.value, 0))}
                  </span>
                  <span className="text-red-500">
                    Saídas: {formatCurrency(filtered.filter(r => r.type === 'expense' || r.type === 'refund').reduce((s, r) => s + r.value, 0))}
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}

      {activeTab === 'goals' && (
        <motion.div variants={item} className="space-y-5">
          {/* Monthly Revenue Bar Chart */}
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-1">Receita Mensal por Vendedor</h3>
            <p className="text-xs text-gray-400 mb-5">Comparativo mensal de performance</p>
            {sellerGoals.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}K`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value) => [formatCurrency(Number(value))]} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }} />
              </BarChart>
            </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">Nenhum dado de vendedores disponível</div>
            )}
          </div>

          {/* Seller Goal Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            {sellerGoals.map((seller, i) => {
              const progress = (seller.revenue / seller.goal) * 100;
              const commission = seller.revenue * (seller.commRate / 100);
              const gradients = [
                'from-indigo-500 to-purple-500',
                'from-blue-500 to-cyan-500',
                'from-emerald-500 to-teal-500',
                'from-amber-500 to-orange-500',
              ];
              const lightBgs = [
                'from-indigo-50 to-purple-50',
                'from-blue-50 to-cyan-50',
                'from-emerald-50 to-teal-50',
                'from-amber-50 to-orange-50',
              ];
              return (
                <motion.div key={seller.name} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }} whileHover={{ y: -2 }}
                  className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white text-lg font-bold shadow-lg', gradients[i])}>
                      {seller.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900">{seller.name}</h4>
                      <p className="text-[11px] text-gray-500">{seller.deals} deals · {seller.commRate}% comissão</p>
                    </div>
                    <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-xs font-extrabold text-white', gradients[i])}>
                      {progress.toFixed(0)}%
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-[11px] mb-1.5">
                      <span className="text-gray-500">Progresso da meta</span>
                      <span className="font-bold text-gray-700">{formatCurrency(seller.revenue)} / {formatCurrency(seller.goal)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }}
                        transition={{ duration: 1.5, delay: 0.3 + i * 0.15, ease: [0.4, 0, 0.2, 1] }}
                        className={cn('h-full rounded-full bg-gradient-to-r', gradients[i])} />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className={cn('grid grid-cols-3 gap-2 rounded-xl bg-gradient-to-r p-3', lightBgs[i])}>
                    <div className="text-center">
                      <p className="text-lg font-extrabold text-gray-900">{seller.deals}</p>
                      <p className="text-[10px] text-gray-500">Deals</p>
                    </div>
                    <div className="text-center border-x border-gray-200/50">
                      <p className="text-lg font-extrabold text-gray-900">{formatCurrency(seller.revenue / seller.deals / 1000)}K</p>
                      <p className="text-[10px] text-gray-500">Ticket Médio</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-extrabold text-emerald-600">{formatCurrency(commission)}</p>
                      <p className="text-[10px] text-gray-500">Comissão</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 rounded-2xl border border-gray-200 bg-white px-3 sm:px-5 py-2.5 sm:py-3 shadow-2xl">
            <span className="text-xs sm:text-sm font-bold text-gray-700">
              <span className="hidden sm:inline">{selectedIds.length} selecionados</span>
              <span className="sm:hidden">{selectedIds.length}</span>
            </span>
            <div className="w-px h-5 sm:h-6 bg-gray-200" />
            
            {/* Marcar Pago */}
            <button onClick={() => handleBulkStatus('paid')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Marcar Pago</span>
              <span className="sm:hidden">Pago</span>
            </button>

            {/* Editar - só aparece quando 1 selecionado */}
            {selectedIds.length === 1 && (
              <button onClick={() => {
                const record = financeRecords.find(r => r._id === selectedIds[0]);
                if (record) {
                  openEdit(record);
                  setSelectedIds([]);
                }
              }}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 transition-colors">
                <Edit3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Editar</span>
              </button>
            )}

            {/* Cancelar */}
            <button onClick={() => handleBulkStatus('cancelled')}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors">
              <XCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cancelar</span>
            </button>

            {/* Excluir */}
            <button onClick={() => setShowBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Excluir</span>
            </button>

            {/* Fechar */}
            <button onClick={() => setSelectedIds([])} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Panel */}
      <AnimatePresence>
        {viewingRecord && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingRecord(null)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" />
            <motion.div initial={{ x: 400, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-[440px] bg-white border-l border-gray-200 z-50 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Detalhes da Transação</h3>
                <button onClick={() => setViewingRecord(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {/* Header */}
                <div className="rounded-xl border border-gray-100 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', TYPE_CONFIG[viewingRecord.type].bg.split(' ')[0])}>
                      {viewingRecord.type === 'revenue' ? <DollarSign className="h-5 w-5 text-emerald-600" /> :
                       viewingRecord.type === 'expense' ? <CreditCard className="h-5 w-5 text-red-500" /> :
                       viewingRecord.type === 'commission' ? <Percent className="h-5 w-5 text-blue-600" /> :
                       <RefreshCw className="h-5 w-5 text-amber-600" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-gray-900">{viewingRecord.description}</h4>
                      {viewingRecord.client && <p className="text-xs text-gray-500">{viewingRecord.client}</p>}
                    </div>
                  </div>
                  <p className={cn('text-2xl font-extrabold', viewingRecord.type === 'revenue' ? 'text-emerald-600' : viewingRecord.type === 'expense' ? 'text-red-500' : 'text-blue-600')}>
                    {viewingRecord.type === 'revenue' ? '+' : '−'}{formatCurrency(viewingRecord.value)}
                  </p>
                </div>

                {/* Status Changer */}
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase mb-2">Status</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(STATUS_CONFIG) as [TransactionStatus, typeof STATUS_CONFIG[TransactionStatus]][]).map(([key, conf]) => {
                      const Icon = conf.icon;
                      return (
                        <button key={key} onClick={() => { updateFinanceRecord(viewingRecord._id, { status: key }); setViewingRecord({ ...viewingRecord, status: key }); }}
                          className={cn('flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all',
                            viewingRecord.status === key ? `${conf.bg} ${conf.color} ring-2 ring-offset-1 ring-current/20` : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                          <Icon className="h-3.5 w-3.5" /> {conf.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Tipo', value: TYPE_CONFIG[viewingRecord.type].label, icon: <BarChart3 className="h-3.5 w-3.5" /> },
                    { label: 'Categoria', value: CATEGORY_CONFIG[viewingRecord.category].label, icon: <FileText className="h-3.5 w-3.5" /> },
                    { label: 'Data', value: new Date(viewingRecord.date).toLocaleDateString('pt-BR'), icon: <Calendar className="h-3.5 w-3.5" /> },
                    { label: 'Vencimento', value: viewingRecord.dueDate ? new Date(viewingRecord.dueDate).toLocaleDateString('pt-BR') : '—', icon: <Clock className="h-3.5 w-3.5" /> },
                    { label: 'Vendedor', value: viewingRecord.salesperson, icon: <Users className="h-3.5 w-3.5" /> },
                    { label: 'Pipeline', value: viewingRecord.pipeline, icon: <TrendingUp className="h-3.5 w-3.5" /> },
                  ].map(info => (
                    <div key={info.label} className="rounded-xl border border-gray-100 p-3">
                      <div className="flex items-center gap-1.5 mb-1 text-gray-400">{info.icon}<span className="text-[10px] font-bold uppercase">{info.label}</span></div>
                      <p className="text-xs font-semibold text-gray-900">{info.value}</p>
                    </div>
                  ))}
                </div>

                {viewingRecord.invoiceNumber && (
                  <div className="rounded-xl border border-gray-100 p-3">
                    <div className="flex items-center gap-1.5 mb-1 text-gray-400"><Receipt className="h-3.5 w-3.5" /><span className="text-[10px] font-bold uppercase">Nota Fiscal</span></div>
                    <p className="text-xs font-semibold text-gray-900">{viewingRecord.invoiceNumber}</p>
                  </div>
                )}

                {viewingRecord.notes && (
                  <div className="rounded-xl border border-gray-100 p-3">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Notas</p>
                    <p className="text-xs text-gray-700">{viewingRecord.notes}</p>
                  </div>
                )}

                {/* Timeline */}
                <div>
                  <p className="text-[11px] font-bold text-gray-500 uppercase mb-3">Histórico</p>
                  <div className="space-y-3">
                    {[
                      { action: 'Transação criada', time: viewingRecord.date, color: 'bg-blue-500' },
                      ...(viewingRecord.status === 'paid' ? [{ action: 'Pagamento confirmado', time: viewingRecord.date, color: 'bg-emerald-500' }] : []),
                      ...(viewingRecord.status === 'overdue' ? [{ action: 'Prazo de pagamento vencido', time: viewingRecord.dueDate || viewingRecord.date, color: 'bg-red-500' }] : []),
                    ].map((ev, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className={cn('mt-1 h-2 w-2 rounded-full shrink-0', ev.color)} />
                        <div>
                          <p className="text-xs font-semibold text-gray-700">{ev.action}</p>
                          <p className="text-[10px] text-gray-400">{new Date(ev.time).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Footer */}
              <div className="p-4 border-t border-gray-100 flex gap-2">
                <button onClick={() => openEdit(viewingRecord)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white hover:bg-brand-700 transition-colors">
                  <Edit3 className="h-4 w-4" /> Editar
                </button>
                <button onClick={() => setDeletingRecord(viewingRecord)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowCreateModal(false); setEditingRecord(null); }} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-5 border-b border-gray-100">
                <h3 className="text-base font-bold text-gray-900">{editingRecord ? 'Editar Transação' : 'Nova Transação'}</h3>
                <button onClick={() => { setShowCreateModal(false); setEditingRecord(null); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Description */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Descrição *</label>
                  <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    className={cn('w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-100',
                      formErrors.description ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-brand-400')}
                    placeholder="Ex: Contrato Enterprise" />
                </div>

                {/* Type */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Tipo</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.entries(TYPE_CONFIG) as [TransactionType, typeof TYPE_CONFIG[TransactionType]][]).map(([key, conf]) => {
                      const Icon = conf.icon;
                      return (
                        <button key={key} onClick={() => setForm({ ...form, type: key, category: key === 'commission' ? 'commission' : key === 'refund' ? 'refund' : key === 'expense' ? 'operations' : 'services' })}
                          className={cn('flex flex-col items-center gap-1 rounded-xl border p-2.5 text-xs font-semibold transition-all',
                            form.type === key ? `${conf.bg} ${conf.color} ring-2 ring-offset-1 ring-current/20` : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                          <Icon className="h-4 w-4" /> {conf.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Category & Value */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Categoria</label>
                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as TransactionCategory })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100">
                      {Object.entries(CATEGORY_CONFIG).map(([key, conf]) => (
                        <option key={key} value={key}>{conf.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Valor (R$) *</label>
                    <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                      className={cn('w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-100',
                        formErrors.value ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-brand-400')}
                      placeholder="0.00" />
                  </div>
                </div>

                {/* Client & Seller */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Cliente / Lead</label>
                    <select value={form.client} onChange={e => setForm({ ...form, client: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100">
                      <option value="">Selecione...</option>
                      <optgroup label="Clientes">
                        {clients.map(c => <option key={c._id} value={c.name}>{c.name} - {c.company || 'Sem empresa'}</option>)}
                      </optgroup>
                      <optgroup label="Leads">
                        {leads.map(l => <option key={l._id} value={l.name}>{l.name} - {l.company || 'Sem empresa'}</option>)}
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Vendedor</label>
                    <select value={form.salesperson} onChange={e => setForm({ ...form, salesperson: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100">
                      {SELLERS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Status</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.entries(STATUS_CONFIG) as [TransactionStatus, typeof STATUS_CONFIG[TransactionStatus]][]).map(([key, conf]) => {
                      const Icon = conf.icon;
                      return (
                        <button key={key} onClick={() => setForm({ ...form, status: key })}
                          className={cn('flex items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-semibold transition-all',
                            form.status === key ? `${conf.bg} ${conf.color} ring-2 ring-offset-1 ring-current/20` : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                          <Icon className="h-3 w-3" /> {conf.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Data *</label>
                    <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                      className={cn('w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-100',
                        formErrors.date ? 'border-red-300 bg-red-50' : 'border-gray-200 focus:border-brand-400')} />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Vencimento</label>
                    <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase block mb-1.5">Notas</label>
                  <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none resize-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                    placeholder="Observações sobre a transação..." />
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 flex gap-2">
                <button onClick={() => { setShowCreateModal(false); setEditingRecord(null); }}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleSave}
                  className="flex-1 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 py-2.5 text-sm font-bold text-white hover:shadow-lg hover:shadow-brand-500/25 transition-all">
                  {editingRecord ? 'Salvar Alterações' : 'Criar Transação'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingRecord && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingRecord(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Excluir transação?</h3>
              <p className="text-sm text-gray-500 mb-1">"{deletingRecord.description}"</p>
              <p className="text-lg font-extrabold text-red-600 mb-4">{formatCurrency(deletingRecord.value)}</p>
              <div className="flex gap-2">
                <button onClick={() => setDeletingRecord(null)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleDelete}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors">
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowBulkDeleteConfirm(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-1">Excluir {selectedIds.length} transações?</h3>
              <p className="text-sm text-gray-500 mb-4">Esta ação não pode ser desfeita.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowBulkDeleteConfirm(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleBulkDelete}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors">
                  Excluir Todos
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
