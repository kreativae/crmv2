import { useState } from 'react';
import { chartData, dashboardStats } from '../data/mockData';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';
import { TrendingUp, Clock, DollarSign, Target, Download, RefreshCw, Users, BarChart3 } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts';

const COLORS = ['#6366f1', '#8b5cf6', '#f59e0b', '#22c55e', '#3b82f6', '#ef4444'];

const channelPerformance = [
  { channel: 'WhatsApp', leads: 45, conversions: 18, revenue: 180000 },
  { channel: 'Instagram', leads: 32, conversions: 10, revenue: 95000 },
  { channel: 'Facebook', leads: 28, conversions: 8, revenue: 72000 },
  { channel: 'Email', leads: 22, conversions: 12, revenue: 110000 },
  { channel: 'Website', leads: 18, conversions: 5, revenue: 45000 },
  { channel: 'Telegram', leads: 11, conversions: 3, revenue: 28000 },
];

const radarData = [
  { metric: 'Leads', value: 85 },
  { metric: 'Conversão', value: 72 },
  { metric: 'Receita', value: 90 },
  { metric: 'Retenção', value: 68 },
  { metric: 'NPS', value: 82 },
  { metric: 'Velocidade', value: 75 },
];

const monthlyConversions = [
  { month: 'Jul', rate: 24 },
  { month: 'Ago', rate: 27 },
  { month: 'Set', rate: 25 },
  { month: 'Out', rate: 30 },
  { month: 'Nov', rate: 28 },
  { month: 'Dez', rate: 32 },
];

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

export function AnalyticsPage() {
  const [period, setPeriod] = useState('30d');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = () => {
    setIsExporting(true);
    
    // Preparar dados para exportação
    const csvData = [
      ['Métrica', 'Valor', 'Período'],
      ['CAC Estimado', 'R$ 350', period],
      ['LTV Médio', 'R$ 12.500', period],
      ['Tempo Médio de Fechamento', `${dashboardStats.avgCloseTime} dias`, period],
      ['Taxa de Qualificação', '68%', period],
      ['Taxa de Conversão', `${dashboardStats.conversionRate}%`, period],
      ['Total de Leads', String(dashboardStats.totalLeads), period],
      ['Receita Total', `R$ ${dashboardStats.totalRevenue.toLocaleString('pt-BR')}`, period],
      '',
      ['Canal', 'Leads', 'Conversões', 'Receita'],
      ...channelPerformance.map(ch => [ch.channel, String(ch.leads), String(ch.conversions), `R$ ${ch.revenue.toLocaleString('pt-BR')}`]),
      '',
      ['Mês', 'Taxa de Conversão'],
      ...monthlyConversions.map(m => [m.month, `${m.rate}%`]),
    ];

    const csvContent = '\uFEFF' + csvData.map(row => 
      Array.isArray(row) ? row.join(',') : row
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    setTimeout(() => setIsExporting(false), 1500);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6 p-6">
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Analytics Avançado</h1>
          <p className="text-sm text-gray-500 mt-0.5">Análise detalhada de performance</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 font-medium focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/10"
          >
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
            <option value="12m">Este ano</option>
          </select>
          <motion.button 
            onClick={handleExport}
            disabled={isExporting}
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-medium disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" /> Exportar
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'CAC Estimado', value: 'R$ 350', desc: 'Custo por aquisição', icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'LTV Médio', value: 'R$ 12.5K', desc: 'Lifetime value', icon: TrendingUp, color: 'bg-blue-50 text-blue-600' },
          { label: 'Tempo Médio', value: `${dashboardStats.avgCloseTime} dias`, desc: '-2.3 dias vs anterior', icon: Clock, color: 'bg-purple-50 text-purple-600' },
          { label: 'Qualificados', value: '68%', desc: 'do total de leads', icon: Target, color: 'bg-amber-50 text-amber-600' },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -3 }} className="card p-5">
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', kpi.color)}><Icon className="h-5 w-5" /></div>
              <p className="mt-3 text-2xl font-extrabold text-gray-900">{kpi.value}</p>
              <p className="text-xs font-bold text-gray-700">{kpi.label}</p>
              <p className="text-[10px] text-gray-400 font-medium">{kpi.desc}</p>
            </motion.div>
          );
        })}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={itemVariants} className="card p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Taxa de Conversão Mensal</h3>
          <p className="text-xs text-gray-400 mb-5">Tendência de conversão nos últimos 6 meses</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={monthlyConversions}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} unit="%" />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} formatter={(value) => [`${value}%`, 'Conversão']} />
              <Line type="monotone" dataKey="rate" stroke="#6366f1" strokeWidth={3} dot={{ r: 5, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }} activeDot={{ r: 7 }} fill="url(#lineGrad)" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={itemVariants} className="card p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Radar de Performance</h3>
          <p className="text-xs text-gray-400 mb-5">Visão 360° da operação</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} />
              <Radar name="Performance" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.12} strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1' }} />
            </RadarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={itemVariants} className="card p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Leads por Origem</h3>
          <p className="text-xs text-gray-400 mb-4">Distribuição por canal</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={chartData.leadsBySource} dataKey="count" nameKey="source" cx="50%" cy="50%" innerRadius={45} outerRadius={78} paddingAngle={4} strokeWidth={0}>
                {chartData.leadsBySource.map((_, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {chartData.leadsBySource.map((item, i) => (
              <div key={item.source} className="flex items-center gap-2 text-xs text-gray-600 py-0.5">
                <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="truncate">{item.source}</span>
                <span className="ml-auto font-bold text-gray-800">{item.count}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Funil Detalhado</h3>
          <p className="text-xs text-gray-400 mb-4">Taxas de conversão por etapa</p>
          <div className="space-y-2.5">
            {chartData.conversionFunnel.map((stage, i) => {
              const maxVal = chartData.conversionFunnel[0].value;
              const pct = (stage.value / maxVal) * 100;
              const prevVal = i > 0 ? chartData.conversionFunnel[i - 1].value : stage.value;
              const dropRate = i > 0 ? ((1 - stage.value / prevVal) * 100).toFixed(0) : '0';
              return (
                <div key={stage.stage}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-700 font-medium">{stage.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-gray-900">{stage.value.toLocaleString()}</span>
                      {i > 0 && <span className="text-[10px] font-bold text-red-500">-{dropRate}%</span>}
                    </div>
                  </div>
                  <div className="h-7 rounded-lg bg-gray-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                      className="flex h-7 items-center justify-end rounded-lg px-2.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    >
                      {pct > 12 && `${pct.toFixed(0)}%`}
                    </motion.div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="card p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-1">Performance por Canal</h3>
          <p className="text-xs text-gray-400 mb-4">Leads, conversões e receita</p>
          <div className="space-y-2.5">
            {channelPerformance.map((ch) => (
              <div key={ch.channel} className="rounded-xl border border-gray-100 p-3 hover:border-brand-200 transition-colors cursor-default">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-gray-900">{ch.channel}</span>
                  <span className="text-xs font-extrabold text-gray-900">R$ {(ch.revenue / 1000).toFixed(0)}K</span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium"><Users className="h-3 w-3" />{ch.leads} leads</div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium"><BarChart3 className="h-3 w-3" />{ch.conversions} conv.</div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(ch.conversions / ch.leads) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="h-1.5 rounded-full bg-gradient-to-r from-brand-500 to-violet-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
