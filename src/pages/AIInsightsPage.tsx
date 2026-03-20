import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { mockLeads } from '../data/mockData';
import { useStore } from '../store';
import {
  Brain, Sparkles, TrendingUp, MessageSquare, Target,
  Zap, BarChart3, AlertTriangle, CheckCircle2, Clock, ArrowUpRight,
  Send, Bot, Star, Heart, Frown, Smile, Meh,
  ThumbsUp, Eye, Lightbulb, Shield, Activity, RefreshCw,
  PieChart, Award, Flame, X, Download, Filter,
  Play, Users, DollarSign,
  TrendingDown, ArrowRight, MessageCircle, Check
} from 'lucide-react';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Legend
} from 'recharts';

/* ────── Types ────── */
type Tab = 'overview' | 'sentiment' | 'predictions' | 'sellers' | 'recommendations';
type RecommendationStatus = 'pending' | 'applied' | 'dismissed';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
}

interface SentimentItem {
  id: string;
  contact: string;
  channel: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  summary: string;
  suggestion: string;
  applied: boolean;
}

interface PredictionItem {
  id: string;
  lead: string;
  value: number;
  probability: number;
  daysToClose: number;
  trend: 'up' | 'down' | 'stable';
  stage: string;
  lastActivity: string;
  nextAction: string;
}

interface SellerData {
  id: string;
  name: string;
  score: number;
  deals: number;
  revenue: number;
  badge: string;
  trend: string;
  strengths: string[];
  weaknesses: string[];
  tips: string[];
  conversionRate: number;
  avgResponseTime: string;
  satisfactionScore: number;
}

interface RecommendationItem {
  id: string;
  type: 'urgente' | 'oportunidade' | 'insight' | 'performance';
  title: string;
  description: string;
  action: string;
  impact: string;
  status: RecommendationStatus;
}

/* ────── Data ────── */
const initialSentiments: SentimentItem[] = [
  { id: 's1', contact: 'João - Tech Solutions', channel: 'WhatsApp', sentiment: 'positive', score: 87, summary: 'Cliente demonstra alto interesse no plano enterprise. Mencionou urgência na implementação.', suggestion: 'Agendar demo personalizada e enviar proposta com desconto para fechamento rápido.', applied: false },
  { id: 's2', contact: 'Ana Paula - DM Pro', channel: 'Instagram', sentiment: 'neutral', score: 52, summary: 'Está avaliando concorrentes. Perguntou sobre prazo de implementação e suporte.', suggestion: 'Destacar nosso SLA superior e enviar case study do segmento de marketing.', applied: false },
  { id: 's3', contact: 'Roberto - Startup IO', channel: 'Telegram', sentiment: 'positive', score: 91, summary: 'Muito engajado, já testou a demo. Alinhado com a proposta.', suggestion: 'Enviar contrato final com condições especiais para startups.', applied: false },
  { id: 's4', contact: 'Fernanda - Agência Criativa', channel: 'Facebook', sentiment: 'positive', score: 78, summary: 'Adorou a apresentação do produto. Quer incluir mais features.', suggestion: 'Apresentar plano Professional com módulos adicionais.', applied: false },
  { id: 's5', contact: 'Ricardo - LV Plus', channel: 'Webchat', sentiment: 'negative', score: 23, summary: 'Frustrado com lentidão na integração. Risco de churn.', suggestion: 'Escalar para suporte técnico prioritário e agendar call com CTO.', applied: false },
  { id: 's6', contact: 'Marcos - ECBR', channel: 'Email', sentiment: 'neutral', score: 61, summary: 'Aguardando proposta revisada. Processo de aprovação interno.', suggestion: 'Enviar proposta detalhada com ROI calculado para facilitar aprovação.', applied: false },
];

const initialPredictions: PredictionItem[] = [
  { id: 'p1', lead: 'E-Commerce Brasil', value: 120000, probability: 92, daysToClose: 5, trend: 'up', stage: 'Negociação', lastActivity: 'Enviou contrato assinado', nextAction: 'Confirmar pagamento' },
  { id: 'p2', lead: 'Saúde Digital', value: 95000, probability: 78, daysToClose: 12, trend: 'up', stage: 'Negociação', lastActivity: 'Call de alinhamento', nextAction: 'Enviar proposta revisada' },
  { id: 'p3', lead: 'Startup Inovação', value: 65000, probability: 85, daysToClose: 8, trend: 'stable', stage: 'Proposta', lastActivity: 'Demo realizada', nextAction: 'Follow-up sobre decisão' },
  { id: 'p4', lead: 'Construtora Forte', value: 89000, probability: 45, daysToClose: 25, trend: 'down', stage: 'Qualificação', lastActivity: 'Email sem resposta há 5d', nextAction: 'Ligar para reengajar' },
  { id: 'p5', lead: 'Digital Marketing Pro', value: 28000, probability: 62, daysToClose: 18, trend: 'up', stage: 'Qualificação', lastActivity: 'Abriu proposta 3x', nextAction: 'Agendar call de fechamento' },
  { id: 'p6', lead: 'Consultoria Max', value: 55000, probability: 71, daysToClose: 14, trend: 'stable', stage: 'Proposta', lastActivity: 'Pediu desconto', nextAction: 'Preparar contraproposta' },
];

const sellerRanking: SellerData[] = [
  { id: 'sr1', name: 'Pedro Santos', score: 94, deals: 15, revenue: 320000, badge: '🥇', trend: '+12%', strengths: ['Fechamento', 'Follow-up', 'Negociação'], weaknesses: ['Prospecção fria'], tips: ['Aumentar volume de prospecção outbound', 'Participar de 2 eventos do setor por mês', 'Mentorear Lucas em técnicas de follow-up'], conversionRate: 38, avgResponseTime: '12min', satisfactionScore: 96 },
  { id: 'sr2', name: 'Lucas Ferreira', score: 78, deals: 9, revenue: 158000, badge: '🥈', trend: '+8%', strengths: ['Prospecção', 'Qualificação'], weaknesses: ['Fechamento', 'Negociação de preço'], tips: ['Treinar técnicas de fechamento com Pedro', 'Usar script de objeções atualizado', 'Acompanhar 3 calls de fechamento do Pedro'], conversionRate: 24, avgResponseTime: '25min', satisfactionScore: 88 },
  { id: 'sr3', name: 'Ana Oliveira', score: 85, deals: 12, revenue: 245000, badge: '🥉', trend: '+15%', strengths: ['Atendimento', 'Retenção', 'Upsell'], weaknesses: ['Velocidade de resposta'], tips: ['Ativar notificações push no celular', 'Usar respostas rápidas do omnichannel', 'Dedicar 30min/dia para follow-ups pendentes'], conversionRate: 31, avgResponseTime: '18min', satisfactionScore: 94 },
];

const initialRecommendations: RecommendationItem[] = [
  { id: 'r1', type: 'urgente', title: 'Risco de churn — LV Plus', description: 'O lead Ricardo (LV Plus) demonstrou sentimento negativo nas últimas 3 interações. Recomendamos ação imediata de suporte.', action: 'Abrir ticket prioritário', impact: 'Evitar perda de R$45K/ano', status: 'pending' },
  { id: 'r2', type: 'oportunidade', title: 'Upsell — Tech Solutions', description: 'Com base no padrão de uso, Tech Solutions pode se beneficiar do módulo de automação avançada (+R$15K/mês).', action: 'Agendar apresentação', impact: 'Receita adicional de R$180K/ano', status: 'pending' },
  { id: 'r3', type: 'insight', title: 'Melhor horário de contato', description: 'Análise mostra que leads do segmento Enterprise respondem 3x mais entre 10h-12h. Otimize seus envios.', action: 'Aplicar regra de envio', impact: 'Aumento de 35% na taxa de resposta', status: 'pending' },
  { id: 'r4', type: 'performance', title: 'Pedro Santos superou a meta', description: 'Pedro atingiu 128% da meta mensal. A técnica de follow-up em 24h contribuiu para 40% dos fechamentos.', action: 'Replicar para equipe', impact: 'Potencial aumento de 25% nas vendas', status: 'pending' },
  { id: 'r5', type: 'oportunidade', title: 'Cross-sell — Saúde Digital', description: 'Cliente usa CRM mas não ativou módulo de automação. Padrão similar a clientes que adotaram com sucesso.', action: 'Enviar demo personalizada', impact: 'Receita adicional de R$8K/mês', status: 'pending' },
  { id: 'r6', type: 'urgente', title: '3 leads sem contato há 7+ dias', description: 'Construtora Forte, MegaStore e Logística Express não receberam follow-up. Risco de perder oportunidade.', action: 'Atribuir follow-up urgente', impact: 'Pipeline de R$210K em risco', status: 'pending' },
];

const performanceRadar = [
  { metric: 'Velocidade', A: 92, B: 75 },
  { metric: 'Qualidade', A: 85, B: 82 },
  { metric: 'Conversão', A: 88, B: 68 },
  { metric: 'Satisfação', A: 90, B: 78 },
  { metric: 'Volume', A: 78, B: 85 },
  { metric: 'Retenção', A: 82, B: 72 },
];

const weeklyTrend = [
  { day: 'Seg', score: 72, leads: 8 },
  { day: 'Ter', score: 78, leads: 12 },
  { day: 'Qua', score: 85, leads: 15 },
  { day: 'Qui', score: 82, leads: 11 },
  { day: 'Sex', score: 90, leads: 18 },
  { day: 'Sáb', score: 65, leads: 4 },
  { day: 'Dom', score: 55, leads: 2 },
];

const channelPerformance = [
  { channel: 'WhatsApp', leads: 45, conversions: 18, revenue: 285000, color: '#22c55e' },
  { channel: 'Instagram', leads: 32, conversions: 8, revenue: 120000, color: '#e11d48' },
  { channel: 'Facebook', leads: 18, conversions: 5, revenue: 75000, color: '#3b82f6' },
  { channel: 'Email', leads: 28, conversions: 12, revenue: 198000, color: '#8b5cf6' },
  { channel: 'Webchat', leads: 15, conversions: 4, revenue: 52000, color: '#f59e0b' },
];

const sentimentTrend = [
  { month: 'Jan', positive: 58, neutral: 28, negative: 14 },
  { month: 'Fev', positive: 62, neutral: 25, negative: 13 },
  { month: 'Mar', positive: 55, neutral: 30, negative: 15 },
  { month: 'Abr', positive: 68, neutral: 22, negative: 10 },
  { month: 'Mai', positive: 72, neutral: 20, negative: 8 },
  { month: 'Jun', positive: 75, neutral: 18, negative: 7 },
];

const sentimentConfig = {
  positive: { icon: Smile, label: 'Positivo', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', barColor: 'bg-emerald-500' },
  neutral: { icon: Meh, label: 'Neutro', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', barColor: 'bg-amber-500' },
  negative: { icon: Frown, label: 'Negativo', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', barColor: 'bg-red-500' },
};

const recTypeConfig = {
  urgente: { icon: AlertTriangle, color: 'from-red-500 to-rose-500', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
  oportunidade: { icon: TrendingUp, color: 'from-emerald-500 to-green-500', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  insight: { icon: Lightbulb, color: 'from-amber-500 to-yellow-500', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  performance: { icon: Award, color: 'from-brand-500 to-violet-500', bg: 'bg-brand-50', border: 'border-brand-200', text: 'text-brand-700' },
};

const containerV = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const itemV = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const suggestedQuestions = [
  'Qual lead tem maior chance de fechar este mês?',
  'Resuma as conversas pendentes de hoje',
  'Quais vendedores estão abaixo da meta?',
  'Análise de sentimento das últimas 24h',
];

/* ─── Helpers ─── */
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

/* ────── AI Chat Modal ────── */
function AIChatModal({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: 'Olá! Sou o NexAI, seu assistente inteligente. Posso ajudar com análises, previsões, resumos de conversas e recomendações estratégicas. O que deseja saber?' },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isTyping]);

  const respond = useCallback((question: string) => {
    const lc = question.toLowerCase();
    if (lc.includes('fechar') || lc.includes('chance'))
      return '📊 Com base na análise preditiva, **E-Commerce Brasil** tem 92% de probabilidade de fechamento nos próximos 5 dias (valor: R$120K). Seguido por **Startup Inovação** (85%, R$65K) e **Saúde Digital** (78%, R$95K).\n\n💡 Recomendo priorizar o follow-up com E-Commerce Brasil para garantir a assinatura do contrato esta semana.';
    if (lc.includes('conversa') || lc.includes('pendente'))
      return '📋 Há 4 conversas pendentes hoje:\n\n1. **João (Tech Solutions)** — 3 msgs não lidas, quer saber sobre plano enterprise\n2. **Ana Paula (DM Pro)** — Perguntou sobre prazo de implementação\n3. **Fernanda (Agência)** — 2 msgs sobre apresentação\n4. **Ricardo (LV Plus)** — ⚠️ Sentimento negativo, precisa de suporte urgente\n\n🔴 Prioridade: Ricardo (LV Plus) — risco de churn detectado.';
    if (lc.includes('vendedor') || lc.includes('meta') || lc.includes('abaixo'))
      return '📈 Situação atual da equipe:\n\n🥇 **Pedro Santos** — 128% da meta ✅\n🥉 **Ana Oliveira** — 98% da meta (quase lá!)\n🥈 **Lucas Ferreira** — 63% da meta ⚠️\n\n💡 Lucas precisa de suporte. Sugestão: redistribuir 2 leads qualificados do pipeline B2B e agendar sessão de coaching com Pedro Santos.';
    if (lc.includes('sentimento') || lc.includes('análise'))
      return '😊 Análise de sentimento das últimas 24h:\n\n• **Positivo**: 62% (maioria via WhatsApp)\n• **Neutro**: 25% (emails e formulários)\n• **Negativo**: 13% (1 caso crítico)\n\n🔴 **Alerta**: Ricardo (LV Plus) demonstrou frustração com integração. Recomendo escalar para suporte técnico prioritário.\n\n📈 Tendência: sentimento positivo subiu 8% vs semana passada.';
    if (lc.includes('receita') || lc.includes('faturamento') || lc.includes('revenue'))
      return '💰 Previsão de receita para os próximos 30 dias:\n\n• **Total previsto**: R$ 452K\n• **Alta confiança (>70%)**: R$ 280K\n• **Média confiança (50-70%)**: R$ 83K\n• **Em risco (<50%)**: R$ 89K\n\n📊 Comparado ao mês anterior, temos um crescimento de 23% na previsão.';
    if (lc.includes('automação') || lc.includes('automatizar'))
      return '🤖 Sugestões de automação baseadas nos padrões identificados:\n\n1. **Follow-up automático 24h** — Leads sem resposta após 1 dia. Impacto estimado: +32% conversão\n2. **Alerta de churn** — Detectar sentimento negativo e notificar gerente. Impacto: -45% cancelamentos\n3. **Score dinâmico** — Atualizar score baseado em interações em tempo real\n\n⚡ Posso criar qualquer uma dessas automações para você. Qual prefere?';
    return `🤖 Analisando: "${question}"\n\nCom base nos dados atuais, sua operação performa 23% acima da média do setor. Pontos de atenção:\n\n1. Taxa de resposta no Instagram pode melhorar (atual: 78%)\n2. Leads do Google Ads têm score médio mais alto (82 vs 65)\n3. Horários de pico: 10h-12h e 14h-16h\n\n💡 Deseja que eu aprofunde em algum desses pontos?`;
  }, []);

  const handleSend = useCallback((text?: string) => {
    const msg = text || input.trim();
    if (!msg || isTyping) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'ai', content: respond(msg) }]);
      setIsTyping(false);
    }, 1200 + Math.random() * 800);
  }, [input, isTyping, respond]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }} onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl h-[80vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200/60 px-6 py-4 bg-gradient-to-r from-brand-50 via-violet-50 to-brand-50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-lg shadow-brand-500/30">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">NexAI — Assistente Inteligente</h3>
              <p className="text-[10px] text-brand-600 font-semibold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Online • Modelo GPT-4
              </p>
            </div>
          </div>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </motion.button>
        </div>
        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-auto px-6 py-5 space-y-4 bg-gradient-to-b from-gray-50/30 to-white">
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              {msg.role === 'ai' && (
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 mr-2.5 mt-1">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div className={cn('max-w-[80%] rounded-2xl px-4 py-3',
                msg.role === 'user' ? 'bg-gradient-to-br from-brand-500 to-violet-600 text-white rounded-br-md'
                  : 'bg-white border border-gray-200/80 text-gray-800 rounded-bl-md shadow-sm')}>
                <p className="text-[13px] leading-relaxed whitespace-pre-line">{msg.content}</p>
              </div>
            </motion.div>
          ))}
          {isTyping && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500">
                <Sparkles className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="bg-white border border-gray-200/80 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="h-2 w-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="h-2 w-2 rounded-full bg-brand-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
        {/* Suggestions */}
        <div className="px-6 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-2">Sugestões</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestedQuestions.map((q, i) => (
              <motion.button key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleSend(q)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[11px] text-gray-600 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 transition-all font-medium">
                {q}
              </motion.button>
            ))}
          </div>
        </div>
        {/* Input */}
        <div className="border-t border-gray-200/60 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              placeholder="Pergunte algo à IA..." disabled={isTyping}
              className="flex-1 rounded-xl bg-gray-50/80 border border-gray-200 px-4 py-3 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-400" />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => handleSend()}
              disabled={!input.trim() || isTyping}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-r from-brand-500 to-violet-600 text-white disabled:opacity-40 shadow-lg shadow-brand-500/25">
              <Send className="h-4 w-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ────── Seller Detail Modal ────── */
function SellerDetailModal({ seller, onClose }: { seller: SellerData; onClose: () => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        onClick={e => e.stopPropagation()} className="w-full max-w-lg rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-brand-500 to-violet-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold backdrop-blur-sm">
                {seller.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h3 className="text-lg font-extrabold flex items-center gap-2">{seller.name} <span className="text-2xl">{seller.badge}</span></h3>
                <p className="text-white/80 text-sm">AI Score: {seller.score}/100</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-xl p-2 hover:bg-white/10 transition-colors"><X className="h-5 w-5" /></button>
          </div>
        </div>
        <div className="p-6 space-y-5 max-h-[60vh] overflow-auto">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Deals', value: seller.deals, icon: Target },
              { label: 'Receita', value: fmt(seller.revenue), icon: DollarSign },
              { label: 'Conversão', value: `${seller.conversionRate}%`, icon: TrendingUp },
              { label: 'Satisfação', value: `${seller.satisfactionScore}%`, icon: Heart },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                <s.icon className="h-4 w-4 text-brand-500 mx-auto mb-1" />
                <p className="text-base font-extrabold text-gray-900">{s.value}</p>
                <p className="text-[9px] text-gray-400 font-bold uppercase">{s.label}</p>
              </div>
            ))}
          </div>
          {/* Score bar */}
          <div>
            <div className="flex justify-between text-xs mb-1.5"><span className="font-bold text-gray-700">AI Score</span><span className="font-extrabold text-brand-600">{seller.score}/100</span></div>
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <motion.div initial={{ width: 0 }} animate={{ width: `${seller.score}%` }} transition={{ duration: 1 }}
                className="h-3 rounded-full bg-gradient-to-r from-brand-500 to-violet-500" />
            </div>
          </div>
          {/* Avg response */}
          <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-100 p-3.5">
            <Clock className="h-5 w-5 text-blue-500" />
            <div><p className="text-xs font-bold text-blue-900">Tempo médio de resposta</p><p className="text-sm font-extrabold text-blue-700">{seller.avgResponseTime}</p></div>
          </div>
          {/* Strengths / Weaknesses */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-2">Pontos Fortes</p>
              <div className="space-y-1.5">{seller.strengths.map(s => (
                <div key={s} className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />{s}</div>
              ))}</div>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-2">Melhorar</p>
              <div className="space-y-1.5">{seller.weaknesses.map(s => (
                <div key={s} className="flex items-center gap-1.5 text-xs text-amber-700 font-medium"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" />{s}</div>
              ))}</div>
            </div>
          </div>
          {/* AI Tips */}
          <div className="rounded-xl bg-gradient-to-r from-brand-50 to-violet-50 border border-brand-100 p-4">
            <p className="text-[9px] uppercase tracking-widest text-brand-500 font-bold mb-2 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Dicas da IA</p>
            <ul className="space-y-2">{seller.tips.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-brand-800"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-200 text-[9px] font-bold text-brand-700">{i + 1}</span>{t}</li>
            ))}</ul>
          </div>
        </div>
        <div className="border-t border-gray-100 px-6 py-4 flex gap-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Fechar</motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25">
            <MessageCircle className="h-4 w-4 inline mr-1.5" />Enviar Feedback
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ────── Prediction Detail Modal ────── */
function PredictionDetailModal({ pred, onClose, onAction }: { pred: PredictionItem; onClose: () => void; onAction: (action: string) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
        onClick={e => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white shadow-2xl overflow-hidden">
        <div className={cn('px-6 py-5', pred.probability >= 70 ? 'bg-gradient-to-r from-emerald-500 to-green-600' : pred.probability >= 50 ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-red-500 to-rose-600')}>
          <div className="flex items-center justify-between text-white">
            <div>
              <h3 className="text-lg font-extrabold">{pred.lead}</h3>
              <p className="text-white/80 text-sm">{pred.stage} • {fmt(pred.value)}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-black">{pred.probability}%</p>
              <p className="text-[10px] text-white/70 font-bold">probabilidade</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
              <Clock className="h-4 w-4 text-gray-400 mx-auto mb-1" />
              <p className="text-sm font-extrabold text-gray-900">{pred.daysToClose}d</p>
              <p className="text-[9px] text-gray-400 font-bold">Para fechar</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
              {pred.trend === 'up' ? <TrendingUp className="h-4 w-4 text-emerald-500 mx-auto mb-1" /> : pred.trend === 'down' ? <TrendingDown className="h-4 w-4 text-red-500 mx-auto mb-1" /> : <ArrowRight className="h-4 w-4 text-gray-400 mx-auto mb-1" />}
              <p className="text-sm font-extrabold text-gray-900">{pred.trend === 'up' ? 'Subindo' : pred.trend === 'down' ? 'Caindo' : 'Estável'}</p>
              <p className="text-[9px] text-gray-400 font-bold">Tendência</p>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
              <DollarSign className="h-4 w-4 text-brand-500 mx-auto mb-1" />
              <p className="text-sm font-extrabold text-gray-900">{fmt(pred.value)}</p>
              <p className="text-[9px] text-gray-400 font-bold">Valor</p>
            </div>
          </div>
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3.5">
            <p className="text-[9px] uppercase tracking-widest text-blue-500 font-bold mb-1">Última atividade</p>
            <p className="text-xs text-blue-800 font-medium">{pred.lastActivity}</p>
          </div>
          <div className="rounded-xl bg-gradient-to-r from-brand-50 to-violet-50 border border-brand-100 p-3.5">
            <p className="text-[9px] uppercase tracking-widest text-brand-500 font-bold mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Próxima ação recomendada</p>
            <p className="text-xs text-brand-800 font-semibold">{pred.nextAction}</p>
          </div>
        </div>
        <div className="border-t border-gray-100 px-6 py-4 flex gap-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50">Fechar</motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => { onAction(pred.nextAction); onClose(); }}
            className="flex-1 rounded-xl bg-gradient-to-r from-brand-500 to-violet-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 flex items-center justify-center gap-1.5">
            <Play className="h-4 w-4" /> Executar Ação
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ────── Main Page ────── */
export function AIInsightsPage() {
  const { setCurrentPage } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showChat, setShowChat] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Sentiment
  const [sentiments, setSentiments] = useState(initialSentiments);
  const [selectedSentiment, setSelectedSentiment] = useState<string | null>(null);
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');

  // Predictions
  const [predictions] = useState(initialPredictions);
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionItem | null>(null);
  const [predSortBy, setPredSortBy] = useState<'probability' | 'value' | 'days'>('probability');

  // Sellers
  const [selectedSeller, setSelectedSeller] = useState<SellerData | null>(null);

  // Recommendations
  const [recommendations, setRecommendations] = useState(initialRecommendations);
  const [recFilter, setRecFilter] = useState<'all' | 'pending' | 'applied' | 'dismissed'>('all');

  // Lead scoring
  const [appliedLeads, setAppliedLeads] = useState<Set<string>>(new Set());

  // AI Health Score animation
  useEffect(() => {
    const target = 87;
    let current = 0;
    const timer = setInterval(() => { current += 1; setAnimatedScore(current); if (current >= target) clearInterval(timer); }, 12);
    return () => clearInterval(timer);
  }, []);

  // Toast
  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = `t_${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // Refresh
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => { setIsRefreshing(false); addToast('Análise atualizada com sucesso!', 'success'); }, 2000);
  };

  // Sentiment actions
  const applySuggestion = (id: string) => {
    setSentiments(prev => prev.map(s => s.id === id ? { ...s, applied: true } : s));
    addToast('Sugestão aplicada com sucesso!');
  };
  const viewConversation = () => {
    setCurrentPage('omnichannel');
  };

  // Prediction actions
  const executePredAction = (action: string) => {
    addToast(`Ação iniciada: ${action}`);
  };

  // Recommendation actions
  const applyRecommendation = (id: string) => {
    setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status: 'applied' as RecommendationStatus } : r));
    addToast('Recomendação aplicada!');
  };
  const dismissRecommendation = (id: string) => {
    setRecommendations(prev => prev.map(r => r.id === id ? { ...r, status: 'dismissed' as RecommendationStatus } : r));
    addToast('Recomendação descartada', 'info');
  };

  // Lead scoring
  const applyLeadScore = (leadId: string) => {
    setAppliedLeads(prev => new Set(prev).add(leadId));
    addToast('Score IA aplicado ao lead!');
  };

  // Export
  const exportInsights = () => {
    const rows = [
      ['Tipo', 'Item', 'Valor', 'Score/Probabilidade', 'Status'],
      ...sentiments.map(s => ['Sentimento', s.contact, s.channel, String(s.score), s.sentiment]),
      ...predictions.map(p => ['Previsão', p.lead, String(p.value), `${p.probability}%`, p.stage]),
      ...sellerRanking.map(s => ['Vendedor', s.name, String(s.revenue), String(s.score), s.trend]),
    ];
    const csv = '\uFEFF' + rows.map(r => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ai_insights_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    addToast('Insights exportados com sucesso!');
  };

  // Computed
  const filteredSentiments = sentimentFilter === 'all' ? sentiments : sentiments.filter(s => s.sentiment === sentimentFilter);
  const sortedPredictions = [...predictions].sort((a, b) => {
    if (predSortBy === 'probability') return b.probability - a.probability;
    if (predSortBy === 'value') return b.value - a.value;
    return a.daysToClose - b.daysToClose;
  });
  const filteredRecs = recFilter === 'all' ? recommendations : recommendations.filter(r => r.status === recFilter);
  const positiveCount = sentiments.filter(s => s.sentiment === 'positive').length;
  const neutralCount = sentiments.filter(s => s.sentiment === 'neutral').length;
  const negativeCount = sentiments.filter(s => s.sentiment === 'negative').length;
  const avgScore = Math.round(sentiments.reduce((s, d) => s + d.score, 0) / sentiments.length);

  const tabConfig: { id: Tab; label: string; icon: typeof Brain }[] = [
    { id: 'overview', label: 'Visão Geral', icon: Brain },
    { id: 'sentiment', label: 'Sentimento', icon: Heart },
    { id: 'predictions', label: 'Previsões', icon: Target },
    { id: 'sellers', label: 'Ranking IA', icon: Award },
    { id: 'recommendations', label: 'Recomendações', icon: Lightbulb },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3">
          <motion.div animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity }}
            className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 via-violet-500 to-purple-600 shadow-lg shadow-brand-500/30">
            <Brain className="h-5 w-5 text-white" />
          </motion.div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2">
              IA & Insights
              <span className="rounded-lg bg-gradient-to-r from-brand-500 to-violet-500 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">Beta</span>
            </h1>
            <p className="text-[11px] text-gray-500 font-medium hidden sm:block">Inteligência artificial aplicada à sua operação</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={exportInsights}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs sm:text-sm text-gray-600 hover:bg-gray-50 font-medium">
            <Download className="h-4 w-4" /> <span className="hidden sm:inline">Exportar</span>
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleRefresh} disabled={isRefreshing}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-xs sm:text-sm text-gray-600 hover:bg-gray-50 font-medium disabled:opacity-50">
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} /> <span className="hidden sm:inline">{isRefreshing ? 'Analisando...' : 'Atualizar'}</span>
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowChat(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-violet-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg shadow-brand-500/25">
            <Bot className="h-4 w-4" /> <span className="hidden sm:inline">Chat com IA</span>
          </motion.button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl px-4 sm:px-6 overflow-x-auto">
        {tabConfig.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn('relative flex items-center gap-1.5 border-b-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap',
              activeTab === tab.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-400 hover:text-gray-600')}>
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
            {activeTab === tab.id && <motion.div layoutId="aiTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 bg-gradient-to-br from-gray-50/50 via-white to-brand-50/20">
        <AnimatePresence mode="wait">

          {/* ═══ OVERVIEW ═══ */}
          {activeTab === 'overview' && (
            <motion.div key="overview" variants={containerV} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">
              {/* AI Score + KPIs */}
              <motion.div variants={itemV} className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="card p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-violet-500/5 to-purple-500/5" />
                  <div className="relative z-10">
                    <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-3">AI Health Score</p>
                    <div className="relative inline-flex items-center justify-center">
                      <svg className="h-28 w-28 sm:h-32 sm:w-32 -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                        <motion.circle cx="60" cy="60" r="50" fill="none" stroke="url(#scoreGrad)" strokeWidth="10" strokeLinecap="round"
                          initial={{ strokeDasharray: '0 314' }} animate={{ strokeDasharray: `${(87 / 100) * 314} 314` }}
                          transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }} />
                        <defs><linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6366f1" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-gray-900">{animatedScore}</span>
                        <span className="text-[10px] text-gray-400 font-bold">de 100</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-emerald-600 font-bold flex items-center justify-center gap-1"><ArrowUpRight className="h-3.5 w-3.5" /> +5pts vs semana anterior</p>
                  </div>
                </div>
                <div className="lg:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Sentimento Positivo', value: `${positiveCount}/${sentiments.length}`, icon: Smile, color: 'bg-emerald-50 text-emerald-600', trend: '+8%' },
                    { label: 'Score Médio Leads', value: String(avgScore), icon: Star, color: 'bg-amber-50 text-amber-600', trend: '+12%' },
                    { label: 'Previsão Receita', value: 'R$ 452K', icon: TrendingUp, color: 'bg-blue-50 text-blue-600', trend: '+23%' },
                    { label: 'Prob. Fechamento', value: '72%', icon: Target, color: 'bg-violet-50 text-violet-600', trend: '+5%' },
                    { label: 'Alertas Ativos', value: String(recommendations.filter(r => r.status === 'pending' && r.type === 'urgente').length), icon: AlertTriangle, color: 'bg-red-50 text-red-600', trend: '-2' },
                    { label: 'Automações IA', value: '847', icon: Zap, color: 'bg-purple-50 text-purple-600', trend: '+34%' },
                  ].map((kpi, i) => (
                    <motion.div key={kpi.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }} whileHover={{ y: -2 }} className="card p-4 cursor-default">
                      <div className="flex items-center justify-between">
                        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl', kpi.color)}><kpi.icon className="h-4 w-4" /></div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">{kpi.trend}</span>
                      </div>
                      <p className="mt-2 text-xl font-extrabold text-gray-900">{kpi.value}</p>
                      <p className="text-[10px] text-gray-400 font-medium">{kpi.label}</p>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Charts + Channel Performance */}
              <div className="grid gap-6 lg:grid-cols-3">
                <motion.div variants={itemV} className="lg:col-span-2 card p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2"><Activity className="h-4 w-4 text-brand-500" /> Tendência Semanal + Leads</h3>
                  <p className="text-xs text-gray-400 mb-4">Score de performance IA e volume de leads</p>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={weeklyTrend}>
                      <defs>
                        <linearGradient id="trendG1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} /><stop offset="100%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                        <linearGradient id="trendG2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.2} /><stop offset="100%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                      <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={2.5} fill="url(#trendG1)" dot={{ r: 3, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} name="Score IA" />
                      <Area type="monotone" dataKey="leads" stroke="#22c55e" strokeWidth={2} fill="url(#trendG2)" dot={{ r: 3, fill: '#22c55e', strokeWidth: 2, stroke: '#fff' }} name="Leads" />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
                <motion.div variants={itemV} className="card p-5">
                  <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2"><PieChart className="h-4 w-4 text-brand-500" /> Radar de Performance</h3>
                  <p className="text-xs text-gray-400 mb-3">Atual vs Mês anterior</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={performanceRadar}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                      <Radar name="Atual" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.15} strokeWidth={2} />
                      <Radar name="Anterior" dataKey="B" stroke="#d1d5db" fill="#d1d5db" fillOpacity={0.08} strokeWidth={1.5} strokeDasharray="4 4" />
                    </RadarChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-5 mt-2">
                    <span className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium"><span className="h-2 w-2 rounded-full bg-brand-500" /> Atual</span>
                    <span className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium"><span className="h-2 w-2 rounded-full bg-gray-300" /> Anterior</span>
                  </div>
                </motion.div>
              </div>

              {/* Channel performance */}
              <motion.div variants={itemV} className="card p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-brand-500" /> Performance por Canal</h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {channelPerformance.map((ch, i) => (
                    <motion.div key={ch.channel} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                      whileHover={{ y: -2 }} className="rounded-xl border border-gray-100 p-3 text-center cursor-pointer hover:shadow-md transition-all"
                      onClick={() => addToast(`Abrindo analytics de ${ch.channel}...`, 'info')}>
                      <div className="h-2 w-2 rounded-full mx-auto mb-2" style={{ backgroundColor: ch.color }} />
                      <p className="text-xs font-bold text-gray-900">{ch.channel}</p>
                      <p className="text-lg font-extrabold text-gray-900 mt-1">{ch.leads}</p>
                      <p className="text-[9px] text-gray-400 font-bold">leads</p>
                      <div className="mt-2 text-[10px]">
                        <span className="text-emerald-600 font-bold">{ch.conversions} conv.</span>
                        <span className="text-gray-300 mx-1">•</span>
                        <span className="text-gray-500 font-medium">{fmt(ch.revenue)}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ SENTIMENT ═══ */}
          {activeTab === 'sentiment' && (
            <motion.div key="sentiment" variants={containerV} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">
              {/* Summary */}
              <motion.div variants={itemV} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="card p-5 text-center">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Score Médio</p>
                  <p className="mt-2 text-4xl font-black text-gray-900">{avgScore}</p>
                  <p className="text-xs text-emerald-600 font-bold mt-1">+12% vs anterior</p>
                </div>
                {([
                  { key: 'positive' as const, count: positiveCount },
                  { key: 'neutral' as const, count: neutralCount },
                  { key: 'negative' as const, count: negativeCount },
                ]).map(s => {
                  const cfg = sentimentConfig[s.key];
                  const Icon = cfg.icon;
                  return (
                    <motion.div key={s.key} whileHover={{ y: -2 }} onClick={() => setSentimentFilter(sentimentFilter === s.key ? 'all' : s.key)}
                      className={cn('card p-5 cursor-pointer transition-all', sentimentFilter === s.key && 'ring-2 ring-brand-400/30 border-brand-300')}>
                      <div className="flex items-center gap-2.5">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', cfg.bg)}><Icon className={cn('h-5 w-5', cfg.color)} /></div>
                        <div><p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">{cfg.label}</p><p className="text-2xl font-extrabold text-gray-900">{s.count}</p></div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${(s.count / sentiments.length) * 100}%` }} transition={{ duration: 0.8, delay: 0.3 }} className={cn('h-2 rounded-full', cfg.barColor)} />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Sentiment trend chart */}
              <motion.div variants={itemV} className="card p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-2"><Activity className="h-4 w-4 text-brand-500" /> Evolução de Sentimento</h3>
                <p className="text-xs text-gray-400 mb-4">Tendência dos últimos 6 meses</p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={sentimentTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 11 }} />
                    <Bar dataKey="positive" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} name="Positivo" />
                    <Bar dataKey="neutral" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} name="Neutro" />
                    <Bar dataKey="negative" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} name="Negativo" />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Filter pills */}
              <motion.div variants={itemV} className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Heart className="h-4 w-4 text-brand-500" /> Análise por Conversa</h3>
                <div className="flex gap-1.5">
                  {(['all', 'positive', 'neutral', 'negative'] as const).map(f => (
                    <button key={f} onClick={() => setSentimentFilter(f)}
                      className={cn('rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all',
                        sentimentFilter === f ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                      {f === 'all' ? 'Todos' : sentimentConfig[f].label}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Sentiment cards */}
              <motion.div variants={itemV} className="grid gap-3 lg:grid-cols-2">
                {filteredSentiments.map((item, i) => {
                  const cfg = sentimentConfig[item.sentiment];
                  const Icon = cfg.icon;
                  const isOpen = selectedSentiment === item.id;
                  return (
                    <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}
                      whileHover={{ y: -2 }} onClick={() => setSelectedSentiment(isOpen ? null : item.id)}
                      className={cn('card p-5 cursor-pointer transition-all', isOpen && 'ring-2 ring-brand-400/20 border-brand-300', item.applied && 'border-emerald-300 bg-emerald-50/30')}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-xs font-bold text-gray-600">
                            {item.contact.split(' ')[0][0]}{item.contact.split(' ').pop()?.[0]}
                          </div>
                          <div>
                            <p className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5">{item.contact} {item.applied && <Check className="h-3.5 w-3.5 text-emerald-500" />}</p>
                            <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {item.channel}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn('rounded-xl border px-2.5 py-1 text-[10px] font-bold flex items-center gap-1', cfg.bg, cfg.color, cfg.border)}>
                            <Icon className="h-3 w-3" /> {cfg.label}
                          </span>
                          <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black',
                            item.score >= 70 ? 'bg-emerald-50 text-emerald-700' : item.score >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700')}>
                            {item.score}
                          </span>
                        </div>
                      </div>
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }} className="overflow-hidden">
                            <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
                              <div>
                                <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold mb-1">Resumo IA</p>
                                <p className="text-xs text-gray-600 leading-relaxed">{item.summary}</p>
                              </div>
                              <div className="rounded-xl bg-gradient-to-r from-brand-50 to-violet-50 border border-brand-100 p-3.5">
                                <p className="text-[9px] uppercase tracking-widest text-brand-500 font-bold mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3" /> Sugestão da IA</p>
                                <p className="text-xs text-brand-800 font-medium leading-relaxed">{item.suggestion}</p>
                              </div>
                              <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => viewConversation()}
                                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                                  <Eye className="h-3.5 w-3.5" /> Ver conversa
                                </motion.button>
                                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                  onClick={() => applySuggestion(item.id)} disabled={item.applied}
                                  className={cn('flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-colors',
                                    item.applied ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100')}>
                                  {item.applied ? <><Check className="h-3.5 w-3.5" /> Aplicada</> : <><ThumbsUp className="h-3.5 w-3.5" /> Aplicar sugestão</>}
                                </motion.button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>
          )}

          {/* ═══ PREDICTIONS ═══ */}
          {activeTab === 'predictions' && (
            <motion.div key="predictions" variants={containerV} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">
              {/* Summary */}
              <motion.div variants={itemV} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-5 bg-gradient-to-br from-brand-50 to-violet-50 border-brand-100">
                  <p className="text-[9px] uppercase tracking-widest text-brand-500 font-bold">Receita Prevista</p>
                  <p className="mt-2 text-3xl font-black text-gray-900">R$ 452K</p>
                  <p className="text-xs text-brand-600 font-semibold mt-1">Próximos 30 dias</p>
                </div>
                <div className="card p-5">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Deals para Fechar</p>
                  <p className="mt-2 text-3xl font-black text-emerald-600">{predictions.filter(p => p.probability >= 70).length}</p>
                  <p className="text-xs text-emerald-600 font-semibold mt-1">Probabilidade ≥ 70%</p>
                </div>
                <div className="card p-5">
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Deals em Risco</p>
                  <p className="mt-2 text-3xl font-black text-red-500">{predictions.filter(p => p.probability < 50).length}</p>
                  <p className="text-xs text-red-500 font-semibold mt-1">Probabilidade {'<'} 50%</p>
                </div>
              </motion.div>

              {/* Sort controls */}
              <motion.div variants={itemV} className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Target className="h-4 w-4 text-brand-500" /> Previsão por Lead</h3>
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-gray-400" />
                  {([
                    { key: 'probability' as const, label: 'Probabilidade' },
                    { key: 'value' as const, label: 'Valor' },
                    { key: 'days' as const, label: 'Prazo' },
                  ]).map(s => (
                    <button key={s.key} onClick={() => setPredSortBy(s.key)}
                      className={cn('rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all',
                        predSortBy === s.key ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Prediction cards */}
              <motion.div variants={itemV} className="space-y-3">
                {sortedPredictions.map((pred, i) => (
                  <motion.div key={pred.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.05 }}
                    whileHover={{ y: -2 }} className="card p-5 cursor-pointer" onClick={() => setSelectedPrediction(pred)}>
                    <div className="flex items-center gap-4">
                      {/* Probability circle */}
                      <div className="relative shrink-0">
                        <svg className="h-14 w-14 sm:h-16 sm:w-16 -rotate-90" viewBox="0 0 60 60">
                          <circle cx="30" cy="30" r="24" fill="none" stroke="#f1f5f9" strokeWidth="5" />
                          <motion.circle cx="30" cy="30" r="24" fill="none"
                            stroke={pred.probability >= 70 ? '#22c55e' : pred.probability >= 50 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="5" strokeLinecap="round"
                            initial={{ strokeDasharray: '0 150.8' }} animate={{ strokeDasharray: `${(pred.probability / 100) * 150.8} 150.8` }}
                            transition={{ duration: 1, delay: 0.2 + i * 0.08 }} />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={cn('text-sm font-black', pred.probability >= 70 ? 'text-emerald-600' : pred.probability >= 50 ? 'text-amber-600' : 'text-red-600')}>{pred.probability}%</span>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-[13px] font-bold text-gray-900">{pred.lead}</h4>
                          <span className={cn('rounded-lg px-2 py-0.5 text-[9px] font-bold',
                            pred.trend === 'up' ? 'bg-emerald-50 text-emerald-700' : pred.trend === 'down' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600')}>
                            {pred.trend === 'up' ? '↑ Subindo' : pred.trend === 'down' ? '↓ Caindo' : '→ Estável'}
                          </span>
                          <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[9px] font-bold text-gray-500">{pred.stage}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{pred.nextAction}</p>
                        <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pred.probability}%` }} transition={{ duration: 0.8, delay: 0.3 + i * 0.08 }}
                            className={cn('h-2 rounded-full', pred.probability >= 70 ? 'bg-emerald-500' : pred.probability >= 50 ? 'bg-amber-500' : 'bg-red-500')} />
                        </div>
                      </div>
                      {/* Value + actions */}
                      <div className="text-right shrink-0 space-y-1.5">
                        <p className="text-lg font-extrabold text-gray-900">{fmt(pred.value)}</p>
                        <p className="text-[10px] text-gray-400 font-medium flex items-center justify-end gap-1"><Clock className="h-3 w-3" /> {pred.daysToClose}d</p>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={e => { e.stopPropagation(); executePredAction(pred.nextAction); }}
                          className="rounded-lg bg-brand-50 border border-brand-200 px-2.5 py-1 text-[10px] font-bold text-brand-700 hover:bg-brand-100">
                          <Play className="h-3 w-3 inline mr-0.5" /> Agir
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* ═══ SELLERS ═══ */}
          {activeTab === 'sellers' && (
            <motion.div key="sellers" variants={containerV} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">
              <motion.div variants={itemV}>
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2"><Award className="h-4 w-4 text-brand-500" /> Ranking Inteligente de Vendedores</h3>
                <div className="space-y-4">
                  {sellerRanking.map((seller, i) => (
                    <motion.div key={seller.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.1 }}
                      whileHover={{ y: -3 }} className={cn('card p-5 sm:p-6', i === 0 && 'border-amber-300 bg-gradient-to-r from-amber-50/50 to-white')}>
                      <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
                        <div className="relative shrink-0">
                          <div className={cn('flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl text-xl sm:text-2xl font-bold text-white shadow-xl',
                            i === 0 ? 'bg-gradient-to-br from-amber-400 to-amber-600' : i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' : 'bg-gradient-to-br from-orange-300 to-orange-500')}>
                            {seller.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div className="absolute -top-2 -right-2 text-xl sm:text-2xl">{seller.badge}</div>
                        </div>
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h4 className="text-base font-extrabold text-gray-900">{seller.name}</h4>
                            <span className="rounded-lg bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold border border-emerald-200">{seller.trend} vs anterior</span>
                          </div>
                          <div className="flex items-center gap-3 mb-3">
                            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold w-16 sm:w-20">AI Score</p>
                            <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${seller.score}%` }} transition={{ duration: 1, delay: 0.3 + i * 0.15 }}
                                className={cn('h-3 rounded-full', i === 0 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-brand-500 to-violet-500')} />
                            </div>
                            <span className="text-sm font-extrabold text-gray-900 w-10 text-right">{seller.score}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
                            {[
                              { label: 'Deals', value: seller.deals },
                              { label: 'Receita', value: `R$ ${(seller.revenue / 1000).toFixed(0)}K` },
                              { label: 'Conversão', value: `${seller.conversionRate}%` },
                            ].map(s => (
                              <div key={s.label} className="rounded-xl bg-gray-50 border border-gray-100 p-2 sm:p-3 text-center">
                                <p className="text-base sm:text-lg font-extrabold text-gray-900">{s.value}</p>
                                <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase">{s.label}</p>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Fortes:</p>
                            {seller.strengths.map(s => (
                              <span key={s} className="rounded-lg bg-brand-50 border border-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">{s}</span>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0 flex sm:flex-col gap-2 w-full sm:w-auto">
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setSelectedSeller(seller)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3.5 py-2 text-[11px] font-semibold text-gray-600 hover:bg-gray-50">
                            <BarChart3 className="h-3.5 w-3.5" /> Detalhes
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                            onClick={() => { setSelectedSeller(seller); }}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl bg-brand-50 border border-brand-200 px-3.5 py-2 text-[11px] font-semibold text-brand-700 hover:bg-brand-100">
                            <Sparkles className="h-3.5 w-3.5" /> Dicas IA
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* AI coaching */}
              <motion.div variants={itemV} className="card p-6 bg-gradient-to-r from-brand-50/50 via-violet-50/50 to-purple-50/50 border-brand-100">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-lg shadow-brand-500/30">
                    <Brain className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-gray-900">💡 Insight da IA para a Equipe</h4>
                    <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                      A análise de padrões sugere que a técnica de <strong>follow-up em 24h</strong> usada por Pedro Santos poderia ser replicada pela equipe.
                      Leads que recebem follow-up nas primeiras 24h têm <strong>3.2x mais chance</strong> de converter.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => { setCurrentPage('automation'); addToast('Abrindo módulo de automação...', 'info'); }}
                        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand-500/25">
                        <Zap className="h-3.5 w-3.5" /> Criar Automação
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => addToast('Insight compartilhado com a equipe!', 'success')}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                        <Users className="h-3.5 w-3.5" /> Compartilhar
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* ═══ RECOMMENDATIONS ═══ */}
          {activeTab === 'recommendations' && (
            <motion.div key="recommendations" variants={containerV} initial="hidden" animate="show" exit={{ opacity: 0 }} className="space-y-6">
              {/* Stats */}
              <motion.div variants={itemV} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Flame, label: 'Ativas', value: recommendations.filter(r => r.status === 'pending').length, color: 'text-orange-500' },
                  { icon: CheckCircle2, label: 'Aplicadas', value: recommendations.filter(r => r.status === 'applied').length, color: 'text-emerald-500' },
                  { icon: X, label: 'Descartadas', value: recommendations.filter(r => r.status === 'dismissed').length, color: 'text-gray-400' },
                  { icon: Shield, label: 'Taxa Acerto', value: '94%', color: 'text-brand-500' },
                ].map(s => (
                  <div key={s.label} className="card p-4 text-center">
                    <s.icon className={cn('h-5 w-5 mx-auto', s.color)} />
                    <p className="mt-1.5 text-2xl font-black text-gray-900">{s.value}</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase">{s.label}</p>
                  </div>
                ))}
              </motion.div>

              {/* Filter pills */}
              <motion.div variants={itemV} className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Lightbulb className="h-4 w-4 text-brand-500" /> Recomendações da IA</h3>
                <div className="flex gap-1.5">
                  {([
                    { key: 'all' as const, label: 'Todas' },
                    { key: 'pending' as const, label: 'Ativas' },
                    { key: 'applied' as const, label: 'Aplicadas' },
                    { key: 'dismissed' as const, label: 'Descartadas' },
                  ]).map(f => (
                    <button key={f.key} onClick={() => setRecFilter(f.key)}
                      className={cn('rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all',
                        recFilter === f.key ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}>
                      {f.label}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Recommendation cards */}
              <motion.div variants={itemV} className="space-y-3">
                {filteredRecs.length === 0 && (
                  <div className="text-center py-12"><Lightbulb className="h-12 w-12 text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-400 font-medium">Nenhuma recomendação nesta categoria</p></div>
                )}
                {filteredRecs.map((rec, i) => {
                  const cfg = recTypeConfig[rec.type];
                  const Icon = cfg.icon;
                  return (
                    <motion.div key={rec.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 + i * 0.04 }}
                      whileHover={{ y: -2 }}
                      className={cn('card p-5 transition-all', rec.status === 'applied' && 'border-emerald-300 bg-emerald-50/20', rec.status === 'dismissed' && 'opacity-50')}>
                      <div className="flex items-start gap-4">
                        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg', cfg.color)}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn('rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider', cfg.bg, cfg.text, cfg.border)}>{rec.type}</span>
                            {rec.status === 'applied' && <span className="rounded-lg bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold flex items-center gap-0.5"><Check className="h-2.5 w-2.5" /> Aplicada</span>}
                            {rec.status === 'dismissed' && <span className="rounded-lg bg-gray-100 text-gray-500 px-2 py-0.5 text-[9px] font-bold">Descartada</span>}
                          </div>
                          <h4 className="mt-1.5 text-[13px] font-bold text-gray-900">{rec.title}</h4>
                          <p className="mt-1 text-xs text-gray-500 leading-relaxed">{rec.description}</p>
                          <div className="mt-2 flex items-center gap-1.5">
                            <Zap className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] font-bold text-amber-700">Impacto: {rec.impact}</span>
                          </div>
                          {rec.status === 'pending' && (
                            <div className="flex gap-2 mt-3">
                              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => applyRecommendation(rec.id)}
                                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-brand-500 to-violet-600 px-4 py-2 text-[11px] font-semibold text-white shadow-lg shadow-brand-500/20">
                                <CheckCircle2 className="h-3.5 w-3.5" /> {rec.action}
                              </motion.button>
                              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => dismissRecommendation(rec.id)}
                                className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-[11px] font-semibold text-gray-500 hover:bg-gray-50">
                                <X className="h-3.5 w-3.5" /> Descartar
                              </motion.button>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Lead Scoring */}
              <motion.div variants={itemV}>
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2"><Star className="h-4 w-4 text-brand-500" /> Score Automático de Leads (IA)</h3>
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/80">
                          <th className="px-4 sm:px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Lead</th>
                          <th className="px-4 sm:px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Score IA</th>
                          <th className="px-4 sm:px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden md:table-cell">Motivo</th>
                          <th className="px-4 sm:px-5 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Sugestão</th>
                          <th className="px-4 sm:px-5 py-3 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockLeads.slice(0, 6).map((lead, i) => {
                          const isApplied = appliedLeads.has(lead._id);
                          return (
                            <motion.tr key={lead._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 + i * 0.04 }}
                              className="border-b border-gray-50 hover:bg-brand-50/30 transition-colors">
                              <td className="px-4 sm:px-5 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-violet-100 text-[10px] font-bold text-brand-700">
                                    {lead.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                  </div>
                                  <div>
                                    <p className="text-[13px] font-semibold text-gray-900">{lead.name}</p>
                                    <p className="text-[10px] text-gray-400">{lead.source}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 sm:px-5 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-2 rounded-full bg-gray-100 overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${lead.score}%` }} transition={{ duration: 0.8, delay: 0.2 + i * 0.08 }}
                                      className={cn('h-2 rounded-full', lead.score >= 80 ? 'bg-emerald-500' : lead.score >= 60 ? 'bg-amber-500' : 'bg-red-500')} />
                                  </div>
                                  <span className={cn('text-xs font-black', lead.score >= 80 ? 'text-emerald-600' : lead.score >= 60 ? 'text-amber-600' : 'text-red-600')}>{lead.score}</span>
                                </div>
                              </td>
                              <td className="px-4 sm:px-5 py-3 text-xs text-gray-500 max-w-[200px] hidden md:table-cell">
                                {lead.score >= 80 ? 'Alta atividade, perfil enterprise' : lead.score >= 60 ? 'Interações moderadas, qualificado' : 'Baixo engajamento'}
                              </td>
                              <td className="px-4 sm:px-5 py-3 text-xs text-brand-600 font-medium max-w-[180px] hidden lg:table-cell">
                                {lead.score >= 80 ? 'Priorizar e agendar demo' : lead.score >= 60 ? 'Nutrir com conteúdo' : 'Campanha de reativação'}
                              </td>
                              <td className="px-4 sm:px-5 py-3 text-center">
                                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => applyLeadScore(lead._id)}
                                  disabled={isApplied}
                                  className={cn('rounded-xl px-3 py-1.5 text-[10px] font-bold transition-colors',
                                    isApplied ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-100')}>
                                  {isApplied ? <><Check className="h-3 w-3 inline mr-0.5" /> Aplicado</> : 'Aplicar'}
                                </motion.button>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating AI Button */}
      <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }} onClick={() => setShowChat(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-xl shadow-brand-500/40">
        <Bot className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white">!</span>
      </motion.button>

      {/* Modals */}
      <AnimatePresence>
        {showChat && <AIChatModal onClose={() => setShowChat(false)} />}
        {selectedSeller && <SellerDetailModal seller={selectedSeller} onClose={() => setSelectedSeller(null)} />}
        {selectedPrediction && <PredictionDetailModal pred={selectedPrediction} onClose={() => setSelectedPrediction(null)} onAction={executePredAction} />}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div key={toast.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={cn('flex items-center gap-2.5 rounded-2xl px-5 py-3 shadow-xl text-sm font-semibold',
                toast.type === 'success' ? 'bg-emerald-600 text-white' : toast.type === 'warning' ? 'bg-amber-500 text-white' : 'bg-brand-600 text-white')}>
              {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : toast.type === 'warning' ? <AlertTriangle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
              {toast.message}
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="ml-2 hover:opacity-70"><X className="h-3.5 w-3.5" /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
