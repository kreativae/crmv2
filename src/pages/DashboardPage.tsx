import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Users, DollarSign, Target, Clock, Ticket, ArrowUpRight, ArrowRight, Eye, MessageSquare, Zap, CalendarDays, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { analyticsService } from '../api/services/analyticsService';
import { cn } from '../utils/cn';
import type { AppPage } from '../types';

const COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#22c55e', '#3b82f6', '#ef4444'];

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
  '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }
};

type Period = '7d' | '30d' | '90d' | '12m';

interface DashStats {
  totalRevenue: number;
  totalLeads: number;
  conversionRate: number;
  activeLeads: number;
  openConversations: number;
  pendingTasks: number;
}

interface RevenuePoint { month: string; value: number; }
interface SourcePoint { source: string; count: number; }
interface FunnelPoint { stage: string; value: number; }
interface SellerRow { name: string; won: number; revenue: number; conversionRate: number; }

export function DashboardPage() {
  const { setCurrentPage, leads } = useStore();
  const [period, setPeriod] = useState<Period>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<DashStats>({ totalRevenue: 0, totalLeads: 0, conversionRate: 0, activeLeads: 0, openConversations: 0, pendingTasks: 0 });
  const [revenueData, setRevenueData] = useState<RevenuePoint[]>([]);
  const [leadsBySource, setLeadsBySource] = useState<SourcePoint[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelPoint[]>([]);
  const [sellers, setSellers] = useState<SellerRow[]>([]);

  const navigate = (page: AppPage) => setCurrentPage(page);

  const loadData = useCallback(async (p: Period) => {
    setLoading(true);
    setError(null);
    try {
      const [dashboard, revenue, channels, sellersRaw] = await Promise.all([
        analyticsService.getDashboard(p),
        analyticsService.getRevenueByMonth(new Date().getFullYear()),
        analyticsService.getChannels(p),
        analyticsService.getSellers(p),
      ]);

      // Stats
      const d = dashboard as any;
      setStats({
        totalRevenue: d?.revenue?.total ?? 0,
        totalLeads: d?.leads?.total ?? 0,
        conversionRate: d?.leads?.conversionRate ?? 0,
        activeLeads: (d?.leads?.total ?? 0) - (d?.leads?.won ?? 0) - (d?.leads?.lost ?? 0),
        openConversations: d?.conversations?.open ?? 0,
        pendingTasks: (d?.tasks?.total ?? 0) - (d?.tasks?.completed ?? 0),
      });

      // Revenue chart — use revenue-trends endpoint
      const revArr = Array.isArray(revenue) ? revenue : [];
      setRevenueData(revArr.map((r: any) => ({
        month: MONTH_LABELS[r.month?.slice(5, 7)] ?? r.month ?? '',
        value: r.revenue ?? 0,
      })));

      // Leads by source from channels endpoint
      const chArr = Array.isArray(channels) ? channels : [];
      setLeadsBySource(chArr.map((c: any) => ({
        source: c.source ?? c._id ?? 'Outros',
        count: c.leads ?? 0,
      })).filter(c => c.count > 0));

      // Funnel — use leads by status as funnel stages
      const leadStats = d?.leads;
      if (leadStats) {
        setFunnelData([
          { stage: 'Total', value: leadStats.total ?? 0 },
          { stage: 'Em aberto', value: Math.max(0, (leadStats.total ?? 0) - (leadStats.won ?? 0) - (leadStats.lost ?? 0)) },
          { stage: 'Ganhos', value: leadStats.won ?? 0 },
        ].filter(f => f.value > 0));
      }

      // Sellers
      const sArr = Array.isArray(sellersRaw) ? sellersRaw : [];
      setSellers(sArr.map((s: any) => ({
        name: s.name ?? 'Sem nome',
        won: s.won ?? 0,
        revenue: s.revenue ?? 0,
        conversionRate: Math.round(s.conversionRate ?? 0),
      })));

    } catch (err: any) {
      setError('Não foi possível carregar os dados do dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(period); }, [period, loadData]);

  const handleRefresh = () => loadData(period);

  const statCards = [
    { title: 'Receita Total', value: stats.totalRevenue >= 1000 ? `R$ ${(stats.totalRevenue / 1000).toFixed(0)}K` : `R$ ${stats.totalRevenue}`, icon: DollarSign, gradient: 'from-emerald-500 to-emerald-600', light: 'bg-emerald-50', text: 'text-emerald-600', page: 'finance' as AppPage },
    { title: 'Total de Leads', value: stats.totalLeads.toString(), icon: Users, gradient: 'from-blue-500 to-blue-600', light: 'bg-blue-50', text: 'text-blue-600', page: 'crm' as AppPage },
    { title: 'Taxa de Conversão', value: `${stats.conversionRate}%`, icon: Target, gradient: 'from-violet-500 to-violet-600', light: 'bg-violet-50', text: 'text-violet-600', page: 'analytics' as AppPage },
    { title: 'Leads Ativos', value: stats.activeLeads.toString(), icon: ArrowUpRight, gradient: 'from-amber-500 to-amber-600', light: 'bg-amber-50', text: 'text-amber-600', page: 'crm' as AppPage },
    { title: 'Conversas Abertas', value: stats.openConversations.toString(), icon: Clock, gradient: 'from-cyan-500 to-cyan-600', light: 'bg-cyan-50', text: 'text-cyan-600', page: 'omnichannel' as AppPage },
    { title: 'Tarefas Pendentes', value: stats.pendingTasks.toString(), icon: Ticket, gradient: 'from-rose-500 to-rose-600', light: 'bg-rose-50', text: 'text-rose-600', page: 'tasks' as AppPage },
  ];

  const quickActions = [
    { label: 'Novo Lead', icon: Plus, page: 'crm' as AppPage, gradient: 'from-brand-500 to-violet-500' },
    { label: 'Nova Tarefa', icon: CalendarDays, page: 'tasks' as AppPage, gradient: 'from-amber-500 to-orange-500' },
    { label: 'Conversas', icon: MessageSquare, page: 'omnichannel' as AppPage, gradient: 'from-green-500 to-emerald-500' },
    { label: 'Automação', icon: Zap, page: 'automation' as AppPage, gradient: 'from-pink-500 to-rose-500' },
  ];

  const periods: { id: Period; label: string }[] = [
    { id: '7d', label: '7 dias' },
    { id: '30d', label: '30 dias' },
    { id: '90d', label: '90 dias' },
    { id: '12m', label: '12 meses' },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-4 sm:space-y-6 p-3 sm:p-4 lg:p-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900">Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Visão geral da sua operação em tempo real</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            <span className="hidden sm:inline">{loading ? 'Carregando...' : 'Atualizar'}</span>
          </button>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {periods.map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={cn(
                  'px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  period === p.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Error banner */}
      {error && (
        <motion.div variants={itemVariants} className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </motion.div>
      )}

      {/* Quick Actions - Mobile first */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {quickActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(action.page)}
              className="flex items-center gap-2.5 rounded-xl bg-white border border-gray-200 p-3 sm:p-3.5 text-left transition-all hover:shadow-md hover:border-brand-200 group"
            >
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg', action.gradient)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-800 group-hover:text-brand-700 transition-colors">{action.label}</p>
                <p className="text-[10px] text-gray-400">Clique para abrir</p>
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.button
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(stat.page)}
              className="card p-3 sm:p-4 text-left group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className={cn('flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl transition-colors', stat.light)}>
                  <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', stat.text)} />
                </div>
                {loading && <div className="h-2.5 w-8 rounded animate-pulse bg-gray-200" />}
              </div>
              <p className="mt-2 sm:mt-3 text-lg sm:text-2xl font-extrabold text-gray-900">
                {loading ? <span className="inline-block h-7 w-16 rounded animate-pulse bg-gray-200" /> : stat.value}
              </p>
              <p className="text-[10px] sm:text-[11px] text-gray-500 font-medium mt-0.5">{stat.title}</p>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Charts Row */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="lg:col-span-2 card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Receita Mensal</h3>
              <p className="text-xs text-gray-400 mt-0.5">Evolução da receita ao longo do ano</p>
            </div>
            <button
              onClick={() => navigate('finance')}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors self-start"
            >
              Ver detalhes <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="h-[250px] rounded-xl bg-gray-100 animate-pulse" />
          ) : revenueData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-sm text-gray-400">Sem dados de receita ainda</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip
                  formatter={(value) => [`R$ ${Number(value).toLocaleString('pt-BR')}`, 'Receita']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorRevenue)" dot={{ r: 3, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-gray-900">Leads por Origem</h3>
            <button onClick={() => navigate('analytics')} className="text-[11px] font-medium text-brand-600 hover:text-brand-700 transition-colors">
              Ver mais
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3 sm:mb-4">Distribuição por canal de entrada</p>
          {loading ? (
            <div className="h-[170px] rounded-xl bg-gray-100 animate-pulse" />
          ) : leadsBySource.length === 0 ? (
            <div className="h-[170px] flex items-center justify-center text-sm text-gray-400">Sem dados de origem</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie data={leadsBySource} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={4} strokeWidth={0}>
                    {leadsBySource.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 sm:mt-3 grid grid-cols-2 gap-1.5">
                {leadsBySource.map((item, i) => (
                  <div key={item.source} className="flex items-center gap-2 text-xs text-gray-600 py-0.5">
                    <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="truncate">{item.source}</span>
                    <span className="ml-auto font-bold text-gray-800">{item.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants} className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Funil de Leads</h3>
              <p className="text-xs text-gray-400 mt-0.5">Distribuição por estágio</p>
            </div>
            <button onClick={() => navigate('analytics')} className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
              Detalhes <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="h-[220px] rounded-xl bg-gray-100 animate-pulse" />
          ) : funnelData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">Sem dados de funil</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData} layout="vertical" barGap={0}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={20}>
                  {funnelData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Atividade Recente</h3>
              <p className="text-xs text-gray-400 mt-0.5">Últimos leads cadastrados</p>
            </div>
            <button onClick={() => navigate('crm')} className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
              Ver todos <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Nenhum lead cadastrado ainda</div>
          ) : (
            <div className="space-y-2">
              {leads.slice(0, 5).map((lead, i) => (
                <motion.button
                  key={lead._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.05 }}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate('crm')}
                  className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-2.5 sm:p-3 transition-all hover:border-brand-200 hover:bg-brand-50/30 text-left group"
                >
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 text-[10px] sm:text-xs font-bold text-brand-700">
                    {lead.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] sm:text-[13px] font-semibold text-gray-900">{lead.name}</p>
                    <p className="text-[10px] sm:text-[11px] text-gray-400">{lead.source} · {lead.lastActivity}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[12px] sm:text-[13px] font-bold text-gray-900">R$ {(lead.value / 1000).toFixed(0)}K</p>
                    <div className="mt-0.5 flex items-center justify-end gap-1.5">
                      <div className={cn('h-2 w-2 rounded-full', lead.score >= 80 ? 'bg-green-500' : lead.score >= 60 ? 'bg-amber-500' : 'bg-red-500')} />
                      <span className="text-[10px] text-gray-400 font-medium">{lead.score}</span>
                    </div>
                  </div>
                  <Eye className="h-4 w-4 text-gray-300 group-hover:text-brand-400 transition-colors shrink-0 hidden sm:block" />
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Deals + Performance */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants} className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Leads Recentes no CRM</h3>
            <button onClick={() => navigate('crm')} className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
              Ver CRM <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {leads.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Nenhum lead no CRM ainda</div>
          ) : (
            <div className="space-y-2">
              {leads.slice(0, 4).map((lead) => (
                <motion.button
                  key={lead._id}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate('crm')}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-100 p-3 sm:p-3.5 hover:border-brand-200 hover:bg-brand-50/30 transition-all text-left group"
                >
                  <div className="min-w-0">
                    <p className="text-[12px] sm:text-[13px] font-semibold text-gray-900 truncate">{lead.name}</p>
                    <p className="text-[10px] sm:text-[11px] text-gray-400 mt-0.5">{lead.source} · {lead.status}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-[12px] sm:text-[13px] font-bold text-gray-900">R$ {lead.value.toLocaleString('pt-BR')}</p>
                    <span className={cn(
                      'inline-block rounded-full px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold mt-1',
                      lead.status === 'won' ? 'bg-green-100 text-green-700' : lead.status === 'lost' ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700'
                    )}>
                      {lead.status === 'won' ? '✓ Ganho' : lead.status === 'lost' ? '✕ Perdido' : '● ' + lead.status}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div variants={itemVariants} className="card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900">Performance por Vendedor</h3>
            <button onClick={() => navigate('analytics')} className="flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors">
              Ranking <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : sellers.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-sm text-gray-400">Sem dados de vendedores ainda</div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {sellers.map((seller) => (
                <motion.button
                  key={seller.name}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate('analytics')}
                  className="w-full rounded-xl border border-gray-100 p-3 sm:p-4 hover:border-brand-200 transition-colors text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 text-xs sm:text-sm font-bold text-brand-700">
                        {(seller.name || '').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2) || '?'}
                      </div>
                      <div>
                        <p className="text-[12px] sm:text-[13px] font-semibold text-gray-900">{seller.name}</p>
                        <p className="text-[10px] sm:text-[11px] text-gray-400">{seller.won} deals fechados</p>
                      </div>
                    </div>
                    <p className="text-base sm:text-lg font-extrabold text-gray-900">R$ {(seller.revenue / 1000).toFixed(0)}K</p>
                  </div>
                  <div className="mt-2.5 sm:mt-3">
                    <div className="flex justify-between text-[10px] sm:text-[11px] mb-1.5">
                      <span className="text-gray-400 font-medium">Taxa de conversão</span>
                      <span className="font-bold text-brand-600">{seller.conversionRate}%</span>
                    </div>
                    <div className="h-1.5 sm:h-2 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(seller.conversionRate, 100)}%` }}
                        transition={{ duration: 1, delay: 0.5, ease: [0.4, 0, 0.2, 1] }}
                        className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
                      />
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
