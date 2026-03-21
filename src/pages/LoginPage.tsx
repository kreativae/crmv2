import { useState } from 'react';
import { useStore } from '../store';
import { authService } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Hexagon, Eye, EyeOff, ArrowRight, Shield, Zap, MessageSquare, BarChart3,
  Check, ChevronLeft, Lock, Mail, User, Building2,
  Sparkles, Bot, Layers
} from 'lucide-react';
import { cn } from '../utils/cn';

/* ── Feature Highlights ── */
const features = [
  { icon: MessageSquare, title: 'Omnichannel', desc: 'WhatsApp, Instagram, Telegram integrados', gradient: 'from-green-500 to-emerald-600' },
  { icon: Bot, title: 'IA Integrada', desc: 'Score automático e insights preditivos', gradient: 'from-violet-500 to-purple-600' },
  { icon: BarChart3, title: 'Analytics Pro', desc: 'Dashboards em tempo real', gradient: 'from-blue-500 to-cyan-500' },
  { icon: Shield, title: 'Segurança', desc: 'Criptografia e multi-tenant', gradient: 'from-amber-500 to-orange-500' },
  { icon: Zap, title: 'Automação', desc: 'Fluxos inteligentes visuais', gradient: 'from-pink-500 to-rose-500' },
  { icon: Layers, title: 'Multi-Pipeline', desc: 'CRM Kanban customizável', gradient: 'from-indigo-500 to-brand-600' },
];

/* ── Floating Particle Grid ── */
function ParticleGrid() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/10"
          style={{
            width: Math.random() * 4 + 2,
            height: Math.random() * 4 + 2,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, Math.random() * -80 - 20, 0],
            x: [0, Math.random() * 40 - 20, 0],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: Math.random() * 6 + 6,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: Math.random() * 4,
          }}
        />
      ))}
    </div>
  );
}

/* ── Password Strength ── */
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Fraca', color: 'bg-red-500' };
  if (score <= 2) return { score: 2, label: 'Regular', color: 'bg-amber-500' };
  if (score <= 3) return { score: 3, label: 'Boa', color: 'bg-blue-500' };
  if (score <= 4) return { score: 4, label: 'Forte', color: 'bg-emerald-500' };
  return { score: 5, label: 'Excelente', color: 'bg-emerald-600' };
}

/* ── Main Component ── */
export function LoginPage() {
  const { login } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'recover'>('login');
  const [registerName, setRegisterName] = useState('');
  const [registerOrg, setRegisterOrg] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPass, setRegisterPass] = useState('');
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverSent, setRecoverSent] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('Business');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await authService.login({ email, password });
      setShowSuccess(true);
      setTimeout(() => {
        login(email, password, response.user);
        setIsLoading(false);
      }, 800);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err?.response?.data?.message || 'Erro ao fazer login. Verifique suas credenciais.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    try {
      const response = await authService.register({
        name: registerName,
        email: registerEmail,
        password: registerPass,
        organizationName: registerOrg,
      });
      setShowSuccess(true);
      setTimeout(() => {
        login(registerEmail, registerPass, response.user);
        setIsLoading(false);
      }, 800);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || err?.response?.data?.message || 'Erro ao criar conta.');
      setIsLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authService.forgotPassword(recoverEmail);
      setRecoverSent(true);
    } catch {
      setRecoverSent(true);
    } finally {
      setIsLoading(false);
    }
    }, 1500);
  };

  const strength = getPasswordStrength(activeTab === 'register' ? registerPass : password);

  return (
    <div className="flex min-h-screen bg-gray-950 relative overflow-hidden">
      {/* ───── SUCCESS OVERLAY ───── */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-950/90 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.6, times: [0, 0.6, 1] }}
              className="text-center"
            >
              <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-2xl shadow-emerald-500/50">
                <motion.div
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <Check className="h-12 w-12 text-white" strokeWidth={3} />
                </motion.div>
              </div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-2xl font-bold text-white"
              >
                Bem-vindo ao NexCRM!
              </motion.p>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="mt-2 text-brand-300/80"
              >
                Preparando seu workspace...
              </motion.p>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="mx-auto mt-6 h-1 w-48 origin-left rounded-full bg-gradient-to-r from-brand-400 to-emerald-400"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ───── LEFT PANEL ───── */}
      <div className="hidden lg:flex flex-1 flex-col relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-[#0f1033] to-[#0a0b1e]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(139,92,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,rgba(59,130,246,0.08),transparent_50%)]" />

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <ParticleGrid />

        {/* Floating Glow Orbs */}
        <motion.div
          animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-brand-500/[0.07] blur-[100px]"
        />
        <motion.div
          animate={{ y: [0, 25, 0], x: [0, -10, 0], scale: [1, 0.9, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-violet-500/[0.06] blur-[80px]"
        />

        <div className="relative z-10 flex flex-1 flex-col justify-center p-10 xl:p-14">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-3 mb-12"
          >
            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-lg shadow-brand-500/30">
                <Hexagon className="h-6 w-6 text-white" strokeWidth={2.5} />
              </div>
              <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse" />
            </div>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-brand-200 bg-clip-text text-transparent">
                NexCRM
              </span>
              <span className="ml-2 rounded-full bg-gradient-to-r from-brand-500/20 to-violet-500/20 px-2.5 py-0.5 text-[10px] font-bold text-brand-300 uppercase tracking-wider border border-brand-500/20">
                PRO
              </span>
            </div>
          </motion.div>

          {/* Hero Content */}
          <div className="space-y-10 max-w-lg">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-white/[0.06] border border-white/[0.08] px-4 py-1.5 mb-6">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-medium text-brand-200/80">Plataforma #1 em CRM com IA no Brasil</span>
              </div>
              <h2 className="text-5xl xl:text-6xl font-extrabold leading-[1.05] text-white tracking-tight">
                Venda mais
                <br />
                com{' '}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-brand-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                    inteligência
                  </span>
                  <motion.div
                    className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full bg-gradient-to-r from-brand-400 via-violet-400 to-cyan-400"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 1, duration: 0.8, ease: 'easeOut' }}
                    style={{ transformOrigin: 'left' }}
                  />
                </span>
              </h2>
              <p className="mt-5 text-lg text-brand-200/60 leading-relaxed max-w-md">
                Unifique todos os canais, automatize processos e feche mais negócios com insights de IA.
              </p>
            </motion.div>

            {/* Features Grid - 2x3 */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="grid grid-cols-3 gap-2.5"
            >
              {features.map((feat, i) => {
                const Icon = feat.icon;
                return (
                  <motion.div
                    key={feat.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.08 }}
                    whileHover={{ y: -3, backgroundColor: 'rgba(255,255,255,0.08)' }}
                    className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] p-3.5 cursor-default group transition-all duration-300"
                  >
                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${feat.gradient} shadow-lg mb-2.5`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-[13px] font-semibold text-white/90">{feat.title}</p>
                    <p className="text-[11px] text-white/30 mt-0.5 leading-snug">{feat.desc}</p>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ───── RIGHT PANEL ───── */}
      <div className="flex flex-1 items-center justify-center p-5 sm:p-8 lg:p-12 bg-white relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(ellipse,rgba(99,102,241,0.04),transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse,rgba(139,92,246,0.03),transparent_70%)] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[440px] relative z-10"
        >
          {/* Mobile logo */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 flex items-center gap-3 lg:hidden"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 shadow-xl shadow-brand-500/25">
              <Hexagon className="h-6 w-6 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-xl font-bold text-gray-900">NexCRM</span>
              <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold text-brand-600 uppercase">PRO</span>
            </div>
          </motion.div>

          {/* Tabs */}
          <div className="mb-10 flex gap-1 rounded-2xl bg-gray-100/80 p-1.5 backdrop-blur-sm">
            {([
              { id: 'login' as const, label: 'Entrar', icon: Lock },
              { id: 'register' as const, label: 'Cadastro', icon: User },
              { id: 'recover' as const, label: 'Recuperar', icon: Mail },
            ]).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setRecoverSent(false); }}
                  className={`relative flex-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    activeTab === tab.id ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTabLogin"
                      className="absolute inset-0 rounded-xl bg-white shadow-md shadow-gray-200/50"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon className="relative z-10 h-4 w-4" />
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            {/* ───── LOGIN ───── */}
            {activeTab === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-8">
                  <h3 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Bem-vindo de volta</h3>
                  <p className="mt-2 text-[15px] text-gray-500 leading-relaxed">
                    Entre com suas credenciais para acessar sua conta
                  </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-5">
                  {errorMsg && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                      {errorMsg}
                    </div>
                  )}
                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-gray-700">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-modern w-full rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 bg-gray-50/50"
                        placeholder="seu@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-gray-700">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-modern w-full rounded-xl pl-11 pr-12 py-3.5 text-sm text-gray-900 bg-gray-50/50"
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Password strength */}
                    {password.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex gap-1">
                            {[1, 2, 3, 4, 5].map(i => (
                              <div
                                key={i}
                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                  i <= strength.score ? strength.color : 'bg-gray-200'
                                }`}
                              />
                            ))}
                          </div>
                          <span className={`text-[11px] font-semibold ${
                            strength.score <= 1 ? 'text-red-500' :
                            strength.score <= 2 ? 'text-amber-500' :
                            strength.score <= 3 ? 'text-blue-500' : 'text-emerald-500'
                          }`}>{strength.label}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2.5 cursor-pointer group">
                      <button
                        type="button"
                        onClick={() => setRememberMe(!rememberMe)}
                        className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-all duration-200 ${
                          rememberMe
                            ? 'bg-brand-600 border-brand-600 shadow-md shadow-brand-600/30'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {rememberMe && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </button>
                      <span className="text-[13px] text-gray-600 group-hover:text-gray-800 transition-colors">Lembrar de mim</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setActiveTab('recover')}
                      className="text-[13px] font-semibold text-brand-600 hover:text-brand-700 transition-colors hover:underline underline-offset-4"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="relative flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-[15px] font-semibold text-white disabled:opacity-60 overflow-hidden group"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)',
                      boxShadow: '0 4px 20px rgba(79, 70, 229, 0.35), 0 2px 6px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    {isLoading ? (
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Entrando...</span>
                      </div>
                    ) : (
                      <>
                        Entrar na plataforma
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </motion.button>
                </form>

                {/* Social Login */}
                <div className="mt-8">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-4 text-gray-400 font-medium">ou continue com</span>
                    </div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3">
                    {[
                      {
                        name: 'Google',
                        provider: 'google' as const,
                        svg: (
                          <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                          </svg>
                        ),
                      },
                      {
                        name: 'Microsoft',
                        provider: 'microsoft' as const,
                        svg: (
                          <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path fill="#F25022" d="M1 1h10v10H1z" />
                            <path fill="#00A4EF" d="M1 13h10v10H1z" />
                            <path fill="#7FBA00" d="M13 1h10v10H13z" />
                            <path fill="#FFB900" d="M13 13h10v10H13z" />
                          </svg>
                        ),
                      },
                      {
                        name: 'Apple',
                        provider: 'apple' as const,
                        svg: (
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                          </svg>
                        ),
                      },
                    ].map((item) => (
                      <motion.button
                        key={item.name}
                        onClick={() => {
                          // TODO: Quando backend estiver pronto, usar:
                          // window.location.href = `/api/auth/${item.provider}`;
                          
                          // Por enquanto, simular loading e mostrar alerta
                          alert(`Login com ${item.name} será implementado com o backend.\n\nVeja o arquivo INTEGRACAO_LOGIN_SOCIAL.md para instruções completas.`);
                        }}
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.97 }}
                        className="flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm"
                      >
                        {item.svg}
                        <span className="hidden sm:inline">{item.name}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <p className="mt-8 text-center text-[12px] text-gray-400">
                  Ao continuar, você concorda com nossos{' '}
                  <button className="text-brand-600 hover:underline underline-offset-2 font-medium">Termos de Uso</button>
                  {' '}e{' '}
                  <button className="text-brand-600 hover:underline underline-offset-2 font-medium">Política de Privacidade</button>
                </p>
              </motion.div>
            )}

            {/* ───── REGISTER ───── */}
            {activeTab === 'register' && (
              <motion.div
                key="register"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                <div className="mb-8">
                  <h3 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Crie sua conta</h3>
                  <p className="mt-2 text-[15px] text-gray-500 leading-relaxed">
                    Trial gratuito de 14 dias — sem necessidade de cartão
                  </p>
                </div>

                <form onSubmit={handleRegister} className="space-y-4">
                  {errorMsg && (
                    <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                      {errorMsg}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">Organização</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={registerOrg}
                          onChange={(e) => setRegisterOrg(e.target.value)}
                          className="input-modern w-full rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 bg-gray-50/50"
                          placeholder="Minha Empresa"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[13px] font-semibold text-gray-700">Seu nome</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          className="input-modern w-full rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 bg-gray-50/50"
                          placeholder="João Silva"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-gray-700">Email corporativo</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        className="input-modern w-full rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 bg-gray-50/50"
                        placeholder="voce@empresa.com"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[13px] font-semibold text-gray-700">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={registerPass}
                        onChange={(e) => setRegisterPass(e.target.value)}
                        className="input-modern w-full rounded-xl pl-11 pr-12 py-3.5 text-sm text-gray-900 bg-gray-50/50"
                        placeholder="Mínimo 8 caracteres"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {registerPass.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2.5"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex gap-1">
                            {[1, 2, 3, 4, 5].map(i => {
                              const regStrength = getPasswordStrength(registerPass);
                              return (
                                <div
                                  key={i}
                                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                    i <= regStrength.score ? regStrength.color : 'bg-gray-200'
                                  }`}
                                />
                              );
                            })}
                          </div>
                          <span className={`text-[11px] font-semibold ${
                            getPasswordStrength(registerPass).score <= 1 ? 'text-red-500' :
                            getPasswordStrength(registerPass).score <= 2 ? 'text-amber-500' :
                            getPasswordStrength(registerPass).score <= 3 ? 'text-blue-500' : 'text-emerald-500'
                          }`}>{getPasswordStrength(registerPass).label}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                          {[
                            { test: registerPass.length >= 8, label: '8+ caracteres' },
                            { test: /[A-Z]/.test(registerPass), label: 'Letra maiúscula' },
                            { test: /[0-9]/.test(registerPass), label: 'Número' },
                            { test: /[^A-Za-z0-9]/.test(registerPass), label: 'Caractere especial' },
                          ].map(rule => (
                            <div key={rule.label} className={`flex items-center gap-1.5 text-[11px] transition-colors ${rule.test ? 'text-emerald-500' : 'text-gray-400'}`}>
                              <div className={`h-3.5 w-3.5 rounded-full flex items-center justify-center ${rule.test ? 'bg-emerald-100' : 'bg-gray-100'}`}>
                                {rule.test ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />}
                              </div>
                              {rule.label}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Plan selection */}
                  <div className="pt-1">
                    <label className="mb-2.5 block text-[13px] font-semibold text-gray-700">Escolha seu plano</label>
                    <div className="grid grid-cols-3 gap-2.5">
                      {[
                        { name: 'Starter', price: 'Grátis', desc: 'Até 3 usuários', popular: false, icon: Zap },
                        { name: 'Business', price: 'R$199', desc: 'Até 20 usuários', popular: true, icon: Sparkles },
                        { name: 'Enterprise', price: 'Custom', desc: 'Ilimitado', popular: false, icon: Shield },
                      ].map(plan => {
                        const isSelected = selectedPlan === plan.name;
                        const PlanIcon = plan.icon;
                        return (
                          <motion.button
                            key={plan.name}
                            type="button"
                            onClick={() => setSelectedPlan(plan.name)}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className={cn(
                              'relative rounded-xl border-[2px] p-3 text-left transition-all',
                              isSelected
                                ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200 shadow-lg shadow-brand-100'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            )}
                          >
                            {plan.popular && !isSelected && (
                              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-brand-500 to-violet-500 px-2.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider shadow-md shadow-brand-500/30">
                                Popular
                              </div>
                            )}
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 shadow-md z-10"
                              >
                                <Check className="h-3 w-3 text-white" strokeWidth={3} />
                              </motion.div>
                            )}
                            <PlanIcon className={cn('h-4 w-4 mb-1.5', isSelected ? 'text-brand-600' : 'text-gray-400')} />
                            <p className={cn('text-[13px] font-bold', isSelected ? 'text-brand-900' : 'text-gray-900')}>{plan.name}</p>
                            <p className={cn('text-[15px] font-extrabold mt-0.5', isSelected ? 'text-brand-600' : 'text-gray-600')}>{plan.price}</p>
                            <p className={cn('text-[10px] mt-0.5', isSelected ? 'text-brand-500' : 'text-gray-400')}>{plan.desc}</p>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Selected plan confirmation */}
                    <motion.div
                      key={selectedPlan}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-center gap-2 rounded-xl bg-brand-50 border border-brand-200 p-2.5"
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-brand-100">
                        <Check className="h-3.5 w-3.5 text-brand-600" strokeWidth={2.5} />
                      </div>
                      <span className="text-[12px] font-semibold text-brand-700">
                        Plano {selectedPlan} selecionado
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPlan('Business')}
                        className="ml-auto text-[11px] text-brand-500 hover:text-brand-700 font-medium underline underline-offset-2"
                      >
                        Alterar
                      </button>
                    </motion.div>
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="relative flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-[15px] font-semibold text-white disabled:opacity-60 overflow-hidden group mt-2"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)',
                      boxShadow: '0 4px 20px rgba(79, 70, 229, 0.35), 0 2px 6px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    {isLoading ? (
                      <div className="flex items-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        <span>Criando conta...</span>
                      </div>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Começar trial gratuito
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </motion.button>
                </form>

                <p className="mt-6 text-center text-[12px] text-gray-400">
                  Já tem uma conta?{' '}
                  <button onClick={() => setActiveTab('login')} className="text-brand-600 font-semibold hover:underline underline-offset-2">
                    Faça login
                  </button>
                </p>
              </motion.div>
            )}

            {/* ───── RECOVER ───── */}
            {activeTab === 'recover' && (
              <motion.div
                key="recover"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                {!recoverSent ? (
                  <>
                    <div className="mb-8">
                      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
                        <Mail className="h-7 w-7 text-amber-600" />
                      </div>
                      <h3 className="text-[28px] font-extrabold text-gray-900 tracking-tight">Recuperar senha</h3>
                      <p className="mt-2 text-[15px] text-gray-500 leading-relaxed">
                        Informe seu email e enviaremos um link seguro para redefinir sua senha.
                      </p>
                    </div>

                    <form onSubmit={handleRecover} className="space-y-5">
                      <div>
                        <label className="mb-2 block text-[13px] font-semibold text-gray-700">Email cadastrado</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <input
                            type="email"
                            value={recoverEmail}
                            onChange={(e) => setRecoverEmail(e.target.value)}
                            className="input-modern w-full rounded-xl pl-11 pr-4 py-3.5 text-sm text-gray-900 bg-gray-50/50"
                            placeholder="seu@email.com"
                            required
                          />
                        </div>
                      </div>

                      <motion.button
                        type="submit"
                        disabled={isLoading}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="relative flex w-full items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-[15px] font-semibold text-white disabled:opacity-60 overflow-hidden group"
                        style={{
                          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)',
                          boxShadow: '0 4px 20px rgba(79, 70, 229, 0.35), 0 2px 6px rgba(0,0,0,0.1)',
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        {isLoading ? (
                          <div className="flex items-center gap-3">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                            <span>Enviando...</span>
                          </div>
                        ) : (
                          <>
                            Enviar link de recuperação
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </>
                        )}
                      </motion.button>

                      <button
                        type="button"
                        onClick={() => setActiveTab('login')}
                        className="flex w-full items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium py-2 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Voltar ao login
                      </button>
                    </form>
                  </>
                ) : (
                  /* ── Success State ── */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="text-center py-6"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.2, 1] }}
                      transition={{ duration: 0.5, times: [0, 0.6, 1] }}
                      className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200"
                    >
                      <Check className="h-10 w-10 text-emerald-600" strokeWidth={3} />
                    </motion.div>

                    <h3 className="text-2xl font-extrabold text-gray-900">Email enviado!</h3>
                    <p className="mt-3 text-[15px] text-gray-500 leading-relaxed max-w-sm mx-auto">
                      Enviamos um link de recuperação para{' '}
                      <span className="font-semibold text-gray-700">{recoverEmail || 'seu email'}</span>.
                      Verifique sua caixa de entrada e spam.
                    </p>

                    <div className="mt-6 rounded-xl bg-blue-50 border border-blue-200 p-4">
                      <p className="text-sm text-blue-700">
                        💡 O link expira em <strong>30 minutos</strong>. Caso não receba, solicite novamente.
                      </p>
                    </div>

                    <div className="mt-8 space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => { setRecoverSent(false); setRecoverEmail(''); }}
                        className="w-full rounded-xl border-[1.5px] border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
                      >
                        Reenviar email
                      </motion.button>
                      <button
                        onClick={() => { setActiveTab('login'); setRecoverSent(false); }}
                        className="flex w-full items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 font-medium py-2 transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Voltar ao login
                      </button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
