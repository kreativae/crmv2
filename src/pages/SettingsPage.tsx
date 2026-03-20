import { useState, useRef, useEffect } from 'react';
import { cn } from '../utils/cn';
import { useStore } from '../store';
import type { SettingsUser, WebhookEndpoint, IntegrationConfig } from '../store';
import type { UserRole } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Users, Shield, Webhook, Palette, Bell, Database, Code,
  ChevronRight, Check, Plus, Settings, X, Search, Edit2, Trash2,
  Copy, Eye, EyeOff, RefreshCw, Send, Download,
  Globe, Clock, Mail, Phone, AlertTriangle, CheckCircle2, XCircle,
  Upload, Key, Zap, ToggleLeft, ToggleRight, ChevronDown,
  UserPlus, UserMinus, ShieldCheck, Activity, Info
} from 'lucide-react';

type SettingsTab = 'general' | 'users' | 'permissions' | 'integrations' | 'api' | 'branding' | 'notifications' | 'logs';

const tabs: { id: SettingsTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: 'general', label: 'Geral', icon: Building2, desc: 'Organização' },
  { id: 'users', label: 'Usuários', icon: Users, desc: 'Equipe' },
  { id: 'permissions', label: 'Permissões', icon: Shield, desc: 'Acesso' },
  { id: 'integrations', label: 'Integrações', icon: Webhook, desc: 'Conectar' },
  { id: 'api', label: 'API & Webhooks', icon: Code, desc: 'Developers' },
  { id: 'branding', label: 'Aparência', icon: Palette, desc: 'Design' },
  { id: 'notifications', label: 'Notificações', icon: Bell, desc: 'Alertas' },
  { id: 'logs', label: 'Logs', icon: Database, desc: 'Auditoria' },
];

const roleLabels: Record<UserRole, { label: string; color: string }> = {
  owner: { label: 'Desenvolvedor', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  admin: { label: 'Admin', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  manager: { label: 'Gerente', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  sales: { label: 'Vendedor', color: 'bg-green-50 text-green-700 border-green-200' },
  support: { label: 'Suporte', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  finance: { label: 'Financeiro', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  viewer: { label: 'Visualizador', color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

const allModules = ['Dashboard', 'CRM', 'Omnichannel', 'Automação', 'Tarefas', 'Financeiro', 'Analytics', 'IA & Insights', 'Configurações'];
const allRoles: UserRole[] = ['owner', 'admin', 'manager', 'sales', 'support', 'viewer'];
const webhookEvents = ['lead.created', 'lead.updated', 'lead.deleted', 'deal.won', 'deal.lost', 'message.received', 'message.sent', 'task.completed', 'contact.created', 'pipeline.moved'];

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: Toast['type'] = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Settings Sidebar */}
      <div className="w-full lg:w-[260px] shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200/60 bg-white p-4 lg:p-5">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-extrabold text-gray-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-violet-500">
            <Settings className="h-3.5 w-3.5 text-white" />
          </div>
          Configurações
        </h2>
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ x: 2 }}
                className={cn(
                  'relative flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-[13px] font-medium transition-all',
                  activeTab === tab.id ? 'text-brand-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                )}
              >
                {activeTab === tab.id && (
                  <motion.div layoutId="settingsTab" className="absolute inset-0 rounded-xl bg-brand-50 border border-brand-100" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10 flex items-center gap-2.5 w-full">
                  <Icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{tab.label}</span>
                  <span className="lg:hidden">{tab.label}</span>
                  {activeTab === tab.id && <ChevronRight className="ml-auto h-3 w-3 hidden lg:block" />}
                </span>
              </motion.button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <AnimatePresence mode="popLayout">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            {activeTab === 'general' && <GeneralTab showToast={showToast} />}
            {activeTab === 'users' && <UsersTab showToast={showToast} />}
            {activeTab === 'permissions' && <PermissionsTab showToast={showToast} />}
            {activeTab === 'integrations' && <IntegrationsTab showToast={showToast} />}
            {activeTab === 'api' && <ApiTab showToast={showToast} />}
            {activeTab === 'branding' && <BrandingTab showToast={showToast} />}
            {activeTab === 'notifications' && <NotificationsTab showToast={showToast} />}
            {activeTab === 'logs' && <LogsTab showToast={showToast} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }}
              className={cn('flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium shadow-lg border backdrop-blur-sm min-w-[280px]',
                t.type === 'success' ? 'bg-green-50/95 text-green-800 border-green-200' :
                t.type === 'error' ? 'bg-red-50/95 text-red-800 border-red-200' :
                'bg-blue-50/95 text-blue-800 border-blue-200')}>
              {t.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> :
               t.type === 'error' ? <XCircle className="h-4 w-4 text-red-600" /> :
               <Info className="h-4 w-4 text-blue-600" />}
              <span className="flex-1">{t.message}</span>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="text-current opacity-50 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ──────────────── GENERAL TAB ────────────────
function GeneralTab({ showToast }: { showToast: (msg: string, type?: Toast['type']) => void }) {
  const [orgName, setOrgName] = useState('NexCRM Corp');
  const [domain, setDomain] = useState('app.nexcrm.com');
  const [timezone, setTimezone] = useState('America/Sao_Paulo');
  const [dnsVerifying, setDnsVerifying] = useState(false);
  const [dnsVerified, setDnsVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dangerConfirm, setDangerConfirm] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); showToast('Configurações salvas com sucesso!'); }, 1200);
  };

  const handleVerifyDns = () => {
    setDnsVerifying(true);
    setTimeout(() => { setDnsVerifying(false); setDnsVerified(true); showToast('DNS verificado com sucesso!'); }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-extrabold text-gray-900">Configurações Gerais</h3>
        <p className="text-sm text-gray-500 mt-0.5">Informações da sua organização</p>
      </div>

      {/* Grid Layout para telas grandes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Coluna 1 - Informações Básicas */}
        <div className="card p-6 space-y-5">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-600" /> Informações da Organização
          </h4>
          
          <div>
            <label className="mb-2 block text-[13px] font-semibold text-gray-700">Nome da Organização</label>
            <input type="text" value={orgName} onChange={e => setOrgName(e.target.value)} className="input-modern w-full rounded-xl px-4 py-3 text-sm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-gray-700">Plano</label>
              <div className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <span className="rounded-lg bg-gradient-to-r from-brand-500 to-violet-500 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">PRO</span>
                Professional
              </div>
            </div>
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-gray-700">Status</label>
              <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50" /> Ativo
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[13px] font-semibold text-gray-700">Fuso Horário</label>
            <div className="relative">
              <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className="input-modern w-full rounded-xl pl-10 pr-10 py-3 text-sm appearance-none">
                <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
                <option value="America/Manaus">Manaus (UTC-4)</option>
                <option value="America/Bahia">Bahia (UTC-3)</option>
                <option value="America/Noronha">Noronha (UTC-2)</option>
                <option value="America/New_York">New York (UTC-5)</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Coluna 2 - Domínio e Configurações Avançadas */}
        <div className="space-y-6">
          <div className="card p-6 space-y-5">
            <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Globe className="h-4 w-4 text-brand-600" /> Domínio Customizado
            </h4>
            
            <div>
              <label className="mb-2 block text-[13px] font-semibold text-gray-700">URL do seu CRM</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input type="text" value={domain} onChange={e => { setDomain(e.target.value); setDnsVerified(false); }} className="input-modern w-full rounded-xl pl-10 pr-4 py-3 text-sm" />
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleVerifyDns} disabled={dnsVerifying}
                  className={cn('rounded-xl px-5 py-3 text-sm font-semibold text-white transition-all shrink-0', dnsVerified ? 'bg-green-500' : 'btn-primary', dnsVerifying && 'opacity-70')}>
                  {dnsVerifying ? <RefreshCw className="h-4 w-4 animate-spin" /> : dnsVerified ? <><Check className="h-4 w-4 inline mr-1" />Verificado</> : 'Verificar DNS'}
                </motion.button>
              </div>
              {dnsVerified && <p className="mt-2 text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" /> DNS apontando corretamente para Vercel</p>}
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-900">SSL/HTTPS</p>
                <p className="text-xs text-gray-500">Certificado automático via Let's Encrypt</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                <Check className="h-3 w-3" /> Ativo
              </span>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="card border-red-200 p-6 space-y-4">
            <h4 className="text-sm font-bold text-red-700 flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Zona de Perigo</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Excluir Organização</p>
                <p className="text-xs text-gray-500">Todos os dados serão permanentemente removidos</p>
              </div>
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setDangerConfirm(true)}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100">Excluir</motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Botão Salvar - Full Width */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving}
          className="btn-primary rounded-xl px-6 py-3 text-sm font-semibold text-white flex items-center gap-2">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </motion.button>
      </div>

      <AnimatePresence>
        {dangerConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card p-6 max-w-md w-full space-y-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 mx-auto"><AlertTriangle className="h-6 w-6 text-red-600" /></div>
              <h3 className="text-center text-lg font-bold text-gray-900">Tem certeza?</h3>
              <p className="text-center text-sm text-gray-500">Esta ação é irreversível. Todos os dados, leads, conversas e configurações serão permanentemente excluídos.</p>
              <div className="flex gap-3">
                <button onClick={() => setDangerConfirm(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={() => { setDangerConfirm(false); showToast('Organização excluída (simulação)', 'error'); }} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700">Excluir Tudo</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────── USERS TAB ────────────────
function UsersTab({ showToast }: { showToast: (msg: string, type?: Toast['type']) => void }) {
  const { settingsUsers, addSettingsUser, updateSettingsUser, deleteSettingsUser } = useStore();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [showInvite, setShowInvite] = useState(false);
  const [editUser, setEditUser] = useState<SettingsUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'sales' as UserRole });
  const [editForm, setEditForm] = useState({ name: '', email: '', role: 'sales' as UserRole, active: true });

  const filtered = settingsUsers.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    return true;
  });

  const handleInvite = () => {
    if (!inviteForm.name || !inviteForm.email) { showToast('Preencha nome e email', 'error'); return; }
    const newUser: SettingsUser = {
      _id: `u_${Date.now()}`, organizationId: 'org_1', name: inviteForm.name, email: inviteForm.email,
      role: inviteForm.role, active: true, status: 'offline', permissions: ['dashboard'], invitedAt: new Date().toISOString(),
    };
    addSettingsUser(newUser);
    setShowInvite(false);
    setInviteForm({ name: '', email: '', role: 'sales' });
    showToast(`Convite enviado para ${inviteForm.email}`);
  };

  const handleEdit = () => {
    if (!editUser) return;
    updateSettingsUser(editUser._id, { name: editForm.name, email: editForm.email, role: editForm.role, active: editForm.active });
    setEditUser(null);
    showToast('Usuário atualizado com sucesso!');
  };

  const handleDelete = (id: string) => {
    deleteSettingsUser(id);
    setDeleteConfirm(null);
    showToast('Usuário removido', 'error');
  };

  const handleToggleActive = (user: SettingsUser) => {
    updateSettingsUser(user._id, { active: !user.active });
    showToast(user.active ? 'Usuário desativado' : 'Usuário ativado');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-gray-900">Usuários</h3>
          <p className="text-sm text-gray-500 mt-0.5">{settingsUsers.length} usuários • {settingsUsers.filter(u => u.status === 'online').length} online</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setShowInvite(true)}
          className="btn-primary flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-white">
          <UserPlus className="h-4 w-4" /> Convidar Usuário
        </motion.button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome ou email..." className="input-modern w-full rounded-xl pl-10 pr-4 py-2.5 text-sm" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'owner', 'admin', 'manager', 'sales', 'support', 'viewer'] as const).map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={cn('rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all',
                roleFilter === r ? 'bg-brand-50 text-brand-700 border-brand-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
              {r === 'all' ? 'Todos' : roleLabels[r].label}
            </button>
          ))}
        </div>
      </div>

      {/* Users List */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Nenhum usuário encontrado</div>
        ) : filtered.map((user, i) => (
          <motion.div key={user._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className={cn('flex items-center justify-between p-4 hover:bg-brand-50/20 transition-colors group', i < filtered.length - 1 && 'border-b border-gray-100')}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold',
                  user.active ? 'bg-gradient-to-br from-brand-100 to-violet-100 text-brand-700' : 'bg-gray-100 text-gray-400')}>
                  {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white',
                  !user.active ? 'bg-gray-300' : user.status === 'online' ? 'bg-green-400' : user.status === 'away' ? 'bg-amber-400' : 'bg-gray-400')} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className={cn('text-[13px] font-semibold', user.active ? 'text-gray-900' : 'text-gray-400 line-through')}>{user.name}</p>
                  {!user.active && <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">INATIVO</span>}
                </div>
                <p className="text-[11px] text-gray-400 flex items-center gap-1"><Mail className="h-3 w-3" />{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn('rounded-lg border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider', roleLabels[user.role].color)}>
                {roleLabels[user.role].label}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setEditForm({ name: user.name, email: user.email, role: user.role, active: user.active }); setEditUser(user); }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600"><Edit2 className="h-3.5 w-3.5" /></button>
                <button onClick={() => handleToggleActive(user)}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-amber-600">
                  {user.active ? <UserMinus className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                </button>
                {user.role !== 'owner' && (
                  <button onClick={() => setDeleteConfirm(user._id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card p-6 max-w-md w-full space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><UserPlus className="h-5 w-5 text-brand-600" /> Convidar Usuário</h3>
                <button onClick={() => setShowInvite(false)} className="rounded-lg p-1.5 hover:bg-gray-100"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">Nome *</label>
                  <input type="text" value={inviteForm.name} onChange={e => setInviteForm(p => ({ ...p, name: e.target.value }))} placeholder="Nome completo" className="input-modern w-full rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">Email *</label>
                  <input type="email" value={inviteForm.email} onChange={e => setInviteForm(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" className="input-modern w-full rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">Perfil</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['admin', 'manager', 'sales', 'support', 'finance', 'viewer'] as UserRole[]).map(r => (
                      <button key={r} onClick={() => setInviteForm(p => ({ ...p, role: r }))}
                        className={cn('rounded-xl border py-2 text-xs font-semibold transition-all',
                          inviteForm.role === r ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                        {roleLabels[r].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowInvite(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleInvite}
                  className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-bold text-white flex items-center justify-center gap-2"><Send className="h-4 w-4" /> Enviar Convite</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card p-6 max-w-md w-full space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Edit2 className="h-5 w-5 text-brand-600" /> Editar Usuário</h3>
                <button onClick={() => setEditUser(null)} className="rounded-lg p-1.5 hover:bg-gray-100"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">Nome</label>
                  <input type="text" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="input-modern w-full rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">Email</label>
                  <input type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} className="input-modern w-full rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">Perfil</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['admin', 'manager', 'sales', 'support', 'finance', 'viewer'] as UserRole[]).map(r => (
                      <button key={r} onClick={() => setEditForm(p => ({ ...p, role: r }))}
                        className={cn('rounded-xl border py-2 text-xs font-semibold transition-all',
                          editForm.role === r ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                        {roleLabels[r].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-200 p-3">
                  <span className="text-sm font-medium text-gray-700">Usuário Ativo</span>
                  <button onClick={() => setEditForm(p => ({ ...p, active: !p.active }))}
                    className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', editForm.active ? 'bg-brand-600' : 'bg-gray-300')}>
                    <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', editForm.active ? 'translate-x-6' : 'translate-x-1')} />
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditUser(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleEdit}
                  className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-bold text-white">Salvar Alterações</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card p-6 max-w-sm w-full space-y-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 mx-auto"><Trash2 className="h-6 w-6 text-red-600" /></div>
              <h3 className="text-lg font-bold text-gray-900">Remover Usuário</h3>
              <p className="text-sm text-gray-500">O usuário perderá acesso imediato à plataforma. Esta ação pode ser desfeita.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700">Remover</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────── PERMISSIONS TAB ────────────────
function PermissionsTab({ showToast }: { showToast: (msg: string, type?: Toast['type']) => void }) {
  const defaultPerms: Record<string, Record<string, boolean>> = {};
  allRoles.forEach(role => {
    defaultPerms[role] = {};
    allModules.forEach((mod, mi) => {
      if (role === 'owner' || role === 'admin') defaultPerms[role][mod] = true;
      else if (role === 'manager') defaultPerms[role][mod] = mi < 7;
      else if (role === 'sales') defaultPerms[role][mod] = mi < 5;
      else if (role === 'support') defaultPerms[role][mod] = mi < 4;
      else defaultPerms[role][mod] = mi === 0;
    });
  });

  const [perms, setPerms] = useState(defaultPerms);
  const [saving, setSaving] = useState(false);

  const toggle = (role: string, mod: string) => {
    if (role === 'owner') return;
    setPerms(prev => ({ ...prev, [role]: { ...prev[role], [mod]: !prev[role][mod] } }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); showToast('Permissões salvas com sucesso!'); }, 1000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-gray-900">Permissões & Acesso</h3>
          <p className="text-sm text-gray-500 mt-0.5">Configure permissões por perfil e módulo</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving}
          className="btn-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {saving ? 'Salvando...' : 'Salvar Permissões'}
        </motion.button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80">
              <th className="px-5 py-3.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">Módulo</th>
              {allRoles.map(role => (
                <th key={role} className="px-3 py-3.5 text-center text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <span className={cn('inline-block rounded-lg border px-2 py-0.5', roleLabels[role].color)}>{roleLabels[role].label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allModules.map((mod) => (
              <tr key={mod} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3 text-sm font-medium text-gray-700">{mod}</td>
                {allRoles.map(role => (
                  <td key={role} className="px-3 py-3 text-center">
                    <button onClick={() => toggle(role, mod)} disabled={role === 'owner'}
                      className={cn('mx-auto flex h-7 w-7 items-center justify-center rounded-lg transition-all',
                        perms[role]?.[mod] ? 'bg-green-100 text-green-600 border border-green-200 hover:bg-green-200' : 'bg-gray-50 text-gray-300 border border-gray-200 hover:bg-gray-100',
                        role === 'owner' && 'cursor-not-allowed opacity-60')}>
                      {perms[role]?.[mod] ? <Check className="h-4 w-4" /> : <X className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card p-4 flex items-start gap-3 bg-amber-50/50 border-amber-200">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Sobre Permissões</p>
          <p className="text-xs text-amber-700 mt-1">Owner tem acesso total e não pode ser editado. As permissões definem acesso a cada módulo. Clique nas células para alternar.</p>
        </div>
      </div>
    </div>
  );
}

// ──────────────── INTEGRATIONS TAB ────────────────

// Real SVG logos for each integration - Using official brand colors and designs
const IntegrationLogo = ({ name }: { name: string }) => {
  const logos: Record<string, React.ReactNode> = {
    'WhatsApp': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <circle cx="24" cy="24" r="20" fill="#25D366"/>
        <path fill="#fff" d="M33.6 27.8c-.5-.25-2.9-1.45-3.35-1.6-.45-.17-.77-.25-1.1.24-.33.5-1.27 1.6-1.55 1.93-.28.33-.57.37-1.05.12-.5-.25-2.05-.76-3.9-2.42-1.45-1.3-2.42-2.9-2.7-3.4-.28-.5 0-.76.22-1 .2-.22.48-.58.73-.86.25-.3.33-.5.5-.82.16-.33.08-.62-.04-.86-.12-.25-1.1-2.66-1.5-3.65-.4-.95-.8-.82-1.1-.84-.28-.02-.62-.02-.95-.02-.32 0-.85.12-1.3.62-.45.5-1.7 1.67-1.7 4.07 0 2.4 1.75 4.72 2 5.05.25.32 3.45 5.27 8.35 7.4 1.17.5 2.08.8 2.8 1.03 1.17.37 2.24.32 3.08.2.94-.14 2.9-1.2 3.3-2.35.42-1.15.42-2.13.3-2.35-.13-.2-.45-.32-.95-.56z"/>
      </svg>
    ),
    'Instagram': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <defs>
          <radialGradient id="igGrad" cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#FFC107"/>
            <stop offset="10%" stopColor="#FFC107"/>
            <stop offset="50%" stopColor="#FF5722"/>
            <stop offset="60%" stopColor="#E91E63"/>
            <stop offset="100%" stopColor="#9C27B0"/>
          </radialGradient>
        </defs>
        <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#igGrad)"/>
        <circle cx="24" cy="24" r="9" fill="none" stroke="#fff" strokeWidth="2.5"/>
        <circle cx="35" cy="13" r="2.5" fill="#fff"/>
        <rect x="8" y="8" width="32" height="32" rx="9" fill="none" stroke="#fff" strokeWidth="2.5"/>
      </svg>
    ),
    'Facebook': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <circle cx="24" cy="24" r="20" fill="#1877F2"/>
        <path fill="#fff" d="M26.5 25.5h4l.6-4h-4.6v-2.3c0-1.6.5-3 2.7-3h2.3V13c-.9-.1-2.3-.2-4.4-.2-4.3 0-7.2 2.6-7.2 7.5v3.2h-4v4h4V38h5V25.5z"/>
      </svg>
    ),
    'Telegram': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <circle cx="24" cy="24" r="20" fill="#2AABEE"/>
        <path fill="#fff" d="M34.5 14.3l-4 19c-.3 1.3-1.1 1.6-2.2 1l-6-4.4-2.9 2.8c-.3.3-.6.6-1.2.6l.4-6.1 11-10c.5-.4-.1-.7-.7-.2L15.8 25.5 10 23.7c-1.3-.4-1.3-1.3.3-1.9l23-8.8c1-.4 2 .2 1.2 1.3z"/>
      </svg>
    ),
    'Google Calendar': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect x="6" y="6" width="36" height="36" rx="6" fill="#fff"/>
        <rect x="6" y="6" width="36" height="10" rx="3" fill="#4285F4"/>
        <rect x="10" y="20" width="8" height="8" rx="1" fill="#EA4335"/>
        <rect x="20" y="20" width="8" height="8" rx="1" fill="#FBBC04"/>
        <rect x="30" y="20" width="8" height="8" rx="1" fill="#34A853"/>
        <rect x="10" y="30" width="8" height="8" rx="1" fill="#4285F4"/>
        <rect x="20" y="30" width="8" height="8" rx="1" fill="#EA4335"/>
        <rect x="30" y="30" width="8" height="8" rx="1" fill="#FBBC04"/>
        <rect x="6" y="6" width="36" height="36" rx="6" fill="none" stroke="#E0E0E0" strokeWidth="1"/>
      </svg>
    ),
    'Stripe': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#635BFF"/>
        <path fill="#fff" d="M22 19.6c0-1.1.9-1.5 2.3-1.5 2.1 0 4.7.6 6.8 1.8v-6.4c-2.3-.9-4.5-1.3-6.8-1.3-5.5 0-9.2 2.9-9.2 7.7 0 7.5 10.3 6.3 10.3 9.5 0 1.3-1.1 1.7-2.6 1.7-2.3 0-5.2-.9-7.5-2.2v6.5c2.5 1.1 5.1 1.5 7.5 1.5 5.7 0 9.6-2.8 9.6-7.7C32.4 21.6 22 22.9 22 19.6z"/>
      </svg>
    ),
    'Cloudinary': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#3448C5"/>
        <path fill="#fff" d="M35 30c0-2.5-1.5-4.6-3.6-5.5.2-.6.3-1.3.3-2 0-3.9-3.1-7-7-7-.7 0-1.4.1-2 .3C21.5 13.5 19 12 16 12c-4.4 0-8 3.6-8 8 0 .6.1 1.2.2 1.7C6.3 22.8 5 24.8 5 27c0 3.3 2.7 6 6 6h22c2.2 0 4-1.8 4-4v1z"/>
      </svg>
    ),
    'Slack': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#fff"/>
        <path fill="#E01E5A" d="M14 26a3 3 0 0 1-3 3 3 3 0 0 1 0-6h3v3zm1.5 0a3 3 0 0 1 6 0v7.5a3 3 0 0 1-6 0V26z"/>
        <path fill="#36C5F0" d="M18.5 14a3 3 0 0 1-3-3 3 3 0 0 1 6 0v3h-3zm0 1.5a3 3 0 0 1 0 6H11a3 3 0 0 1 0-6h7.5z"/>
        <path fill="#2EB67D" d="M30.5 18.5a3 3 0 0 1 3-3 3 3 0 0 1 0 6h-3v-3zm-1.5 0a3 3 0 0 1-6 0V11a3 3 0 0 1 6 0v7.5z"/>
        <path fill="#ECB22E" d="M26 30.5a3 3 0 0 1 3 3 3 3 0 0 1-6 0v-3h3zm0-1.5a3 3 0 0 1 0-6h7.5a3 3 0 0 1 0 6H26z"/>
      </svg>
    ),
    'HubSpot': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#FF7A59"/>
        <circle cx="28" cy="24" r="7" fill="none" stroke="#fff" strokeWidth="2.5"/>
        <path fill="#fff" d="M28 13v-2a2 2 0 0 0-4 0v2a4 4 0 0 0-2 3.5v2.7a9 9 0 0 1 8 0v-2.7a4 4 0 0 0-2-3.5z"/>
        <circle cx="12" cy="22" r="2.5" fill="#fff"/>
        <path fill="#fff" d="M14.5 22l4.5 2.8"/>
        <circle cx="28" cy="24" r="3" fill="#fff"/>
      </svg>
    ),
    'Mailchimp': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#FFE01B"/>
        <path fill="#241C15" d="M32 27c-.3-1.4-1.5-2.3-2.9-2.3-.3 0-.6.05-.9.15-.6-1.1-1.7-1.7-2.9-1.7-.3 0-.5.05-.8.12V19a2.3 2.3 0 0 0-4.6 0v7.4l-1.2-1.2a2 2 0 0 0-2.8 2.8l4.5 4.5c1.2 1.2 2.7 1.8 4.3 1.8h.9c3.4 0 6.2-2.8 6.2-6.2v-.5c.2-.2.3-.5.4-.8z"/>
      </svg>
    ),
    'Google Analytics': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#F9AB00"/>
        <rect x="11" y="26" width="7" height="12" rx="2" fill="#fff"/>
        <rect x="20.5" y="18" width="7" height="20" rx="2" fill="#fff"/>
        <rect x="30" y="10" width="7" height="28" rx="2" fill="#fff"/>
      </svg>
    ),
    'Zapier': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#FF4A00"/>
        <path fill="#fff" d="M32 22h-5l3.5-3.5a1.3 1.3 0 0 0-1.8-1.8L25.2 20.2V15a1.3 1.3 0 0 0-2.6 0v5.2l-3.5-3.5a1.3 1.3 0 0 0-1.8 1.8l3.5 3.5H16a1.3 1.3 0 0 0 0 2.6h5l-3.5 3.5a1.3 1.3 0 0 0 1.8 1.8l3.5-3.5V31a1.3 1.3 0 0 0 2.6 0v-5l3.5 3.5a1.3 1.3 0 0 0 1.8-1.8L27.2 24.2H32a1.3 1.3 0 0 0 0-2.6z"/>
        <circle cx="24" cy="24" r="4" fill="#FF4A00" stroke="#fff" strokeWidth="2"/>
      </svg>
    ),
    'Google OAuth': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#fff"/>
        <path fill="#4285F4" d="M24 20.5v7.2h10c-.4 2.5-1.6 4.6-3.4 6-1.5 1.2-3.4 1.9-5.6 1.9-4.3 0-8-3-9.2-7a10 10 0 0 1 0-6.2c1.2-4 4.9-7 9.2-7 2.3 0 4.5.8 6.1 2.3l5.3-5.3C33.3 9.4 29 7.5 24 7.5 16 7.5 9.3 12.8 7 20c-.9 2.6-.9 5.4 0 8C9.3 35.2 16 40.5 24 40.5c4.6 0 8.5-1.5 11.3-4.1 3.2-3 5-7.4 5-12.7 0-1.1-.1-2.2-.3-3.2H24z"/>
        <path fill="#34A853" d="M7 28c2.3 7.2 9 12.5 17 12.5 4.1 0 7.6-1.3 10.2-3.5L29 32.5c-1.4.9-3.1 1.5-5 1.5-4.3 0-8-3-9.2-7L7 28z"/>
        <path fill="#FBBC04" d="M14.8 21c-.5 1.4-.8 2.9-.8 4.5s.3 3.1.8 4.5l-7.8 6c-2.5-5-2.5-10.9 0-16l7.8 1z"/>
        <path fill="#EA4335" d="M24 14c2.6 0 5 .9 6.8 2.7l5.1-5.1C32.6 8.5 28.6 7 24 7c-8 0-14.7 5.3-17 12.5l7.8 6c1.2-4 4.9-7 9.2-7z"/>
        <rect x="4" y="4" width="40" height="40" rx="8" fill="none" stroke="#E0E0E0" strokeWidth="1"/>
      </svg>
    ),
    'Microsoft OAuth': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#fff"/>
        <rect x="10" y="10" width="13" height="13" fill="#F25022"/>
        <rect x="25" y="10" width="13" height="13" fill="#7FBA00"/>
        <rect x="10" y="25" width="13" height="13" fill="#00A4EF"/>
        <rect x="25" y="25" width="13" height="13" fill="#FFB900"/>
        <rect x="4" y="4" width="40" height="40" rx="8" fill="none" stroke="#E0E0E0" strokeWidth="1"/>
      </svg>
    ),
    'Apple Sign In': (
      <svg viewBox="0 0 48 48" className="w-full h-full">
        <rect x="4" y="4" width="40" height="40" rx="8" fill="#000"/>
        <path fill="#fff" d="M31.3 25.3c0-3.2 2.6-4.8 2.7-4.9-1.5-2.2-3.8-2.5-4.6-2.5-2-.2-3.8 1.2-4.8 1.2-1 0-2.5-1.2-4.1-1.1-2.1 0-4.1 1.3-5.2 3.2-2.2 3.9-.6 9.7 1.6 12.8 1.1 1.5 2.3 3.3 4 3.2 1.6-.1 2.2-1 4.1-1s2.5 1 4.2 1 2.8-1.5 3.9-3.1c1.2-1.8 1.7-3.5 1.8-3.6-.1-.1-3.4-1.3-3.6-5.2zm-3.3-9.6c.9-1.1 1.5-2.6 1.3-4.2-1.3.1-2.9.9-3.8 2-.8 1-1.6 2.5-1.4 4 1.5.1 3-.8 3.9-1.8z"/>
      </svg>
    ),
  };

  return (
    <div className="w-10 h-10 sm:w-11 sm:h-11 flex-shrink-0">
      {logos[name] || (
        <div className="w-full h-full rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 text-lg font-bold">
          {name[0]}
        </div>
      )}
    </div>
  );
};

// OAuth configuration fields type
interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  tenantId?: string; // Microsoft only
  teamId?: string; // Apple only
  keyId?: string; // Apple only
  privateKey?: string; // Apple only
  serviceId?: string; // Apple only
  scopes: string;
}

function IntegrationsTab({ showToast }: { showToast: (msg: string, type?: Toast['type']) => void }) {
  const { integrations, updateIntegration } = useStore();
  const [configModal, setConfigModal] = useState<IntegrationConfig | null>(null);
  const [disconnectConfirm, setDisconnectConfirm] = useState<string | null>(null);
  const [catFilter, setCatFilter] = useState('all');
  const [connecting, setConnecting] = useState<string | null>(null);
  const [configApiKey, setConfigApiKey] = useState('sk_live_••••••••••••••••');
  const [configSync, setConfigSync] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [oauthConfig, setOauthConfig] = useState<OAuthConfig>({
    clientId: '',
    clientSecret: '',
    redirectUri: 'https://app.nexcrm.com/api/auth/callback',
    tenantId: '',
    teamId: '',
    keyId: '',
    privateKey: '',
    serviceId: '',
    scopes: 'email profile openid',
  });

  // Check if integration is an OAuth provider
  const isOAuthProvider = (name: string) => 
    ['Google OAuth', 'Microsoft OAuth', 'Apple Sign In'].includes(name);

  // Get OAuth fields based on provider
  const getOAuthFields = (name: string) => {
    const fields: { key: keyof OAuthConfig; label: string; type: 'text' | 'password' | 'textarea'; placeholder: string; required: boolean; help?: string }[] = [];
    
    if (name === 'Google OAuth') {
      fields.push(
        { key: 'clientId', label: 'Client ID', type: 'text', placeholder: '123456789-xxxxx.apps.googleusercontent.com', required: true, help: 'Obtido no Google Cloud Console' },
        { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'GOCSPX-xxxxxxxxxxxxx', required: true, help: 'Mantenha em segredo!' },
        { key: 'redirectUri', label: 'Redirect URI', type: 'text', placeholder: 'https://app.nexcrm.com/api/auth/google/callback', required: true, help: 'Deve ser adicionada nas URIs autorizadas no Google Cloud Console' },
        { key: 'scopes', label: 'Scopes', type: 'text', placeholder: 'email profile openid', required: false, help: 'Permissões solicitadas ao usuário' }
      );
    } else if (name === 'Microsoft OAuth') {
      fields.push(
        { key: 'clientId', label: 'Application (Client) ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true, help: 'Obtido no Azure Portal' },
        { key: 'clientSecret', label: 'Client Secret', type: 'password', placeholder: 'xxxxxxxxxxxxxxxxxxxxx', required: true, help: 'Criar em "Certificates & secrets"' },
        { key: 'tenantId', label: 'Directory (Tenant) ID', type: 'text', placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx', required: true, help: 'Use "common" para multi-tenant' },
        { key: 'redirectUri', label: 'Redirect URI', type: 'text', placeholder: 'https://app.nexcrm.com/api/auth/microsoft/callback', required: true },
        { key: 'scopes', label: 'Scopes', type: 'text', placeholder: 'User.Read email profile openid', required: false }
      );
    } else if (name === 'Apple Sign In') {
      fields.push(
        { key: 'serviceId', label: 'Service ID', type: 'text', placeholder: 'com.nexcrm.auth', required: true, help: 'Criar em Apple Developer > Identifiers' },
        { key: 'teamId', label: 'Team ID', type: 'text', placeholder: 'XXXXXXXXXX', required: true, help: '10 caracteres, encontrado no Apple Developer' },
        { key: 'keyId', label: 'Key ID', type: 'text', placeholder: 'XXXXXXXXXX', required: true, help: 'ID da chave privada (.p8)' },
        { key: 'privateKey', label: 'Private Key (.p8)', type: 'textarea', placeholder: '-----BEGIN PRIVATE KEY-----\nMIGT....\n-----END PRIVATE KEY-----', required: true, help: 'Conteúdo do arquivo .p8 baixado' },
        { key: 'redirectUri', label: 'Redirect URI', type: 'text', placeholder: 'https://app.nexcrm.com/api/auth/apple/callback', required: true }
      );
    }
    
    return fields;
  };

  // Handle OAuth config save
  const handleSaveOAuth = () => {
    if (!configModal) return;
    
    const fields = getOAuthFields(configModal.name);
    const requiredFields = fields.filter(f => f.required);
    const missingFields = requiredFields.filter(f => !oauthConfig[f.key]);
    
    if (missingFields.length > 0) {
      showToast(`Preencha os campos obrigatórios: ${missingFields.map(f => f.label).join(', ')}`, 'error');
      return;
    }
    
    // Simulate saving
    updateIntegration(configModal.name, { 
      status: 'connected', 
      connectedAt: new Date().toISOString(),
      description: 'Configurado - OAuth ativo'
    });
    
    setConfigModal(null);
    showToast(`${configModal.name} configurado com sucesso! Login social ativado.`);
  };

  // Handle test connection
  const handleTestConnection = () => {
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      showToast('Conexão testada com sucesso! Credenciais válidas.', 'success');
    }, 2000);
  };

  const categories = ['all', ...Array.from(new Set(integrations.map(i => i.category)))];
  const filtered = catFilter === 'all' ? integrations : integrations.filter(i => i.category === catFilter);
  const connectedCount = integrations.filter(i => i.status === 'connected').length;

  const handleConnect = (name: string) => {
    setConnecting(name);
    setTimeout(() => {
      updateIntegration(name, { status: 'connected', connectedAt: new Date().toISOString(), description: 'Configurado' });
      setConnecting(null);
      showToast(`${name} conectado com sucesso!`);
    }, 1500);
  };

  const handleDisconnect = (name: string) => {
    updateIntegration(name, { status: 'disconnected', connectedAt: undefined });
    setDisconnectConfirm(null);
    showToast(`${name} desconectado`, 'info');
  };

  const catLabels: Record<string, string> = {
    all: 'Todos', messaging: 'Mensagens', productivity: 'Produtividade',
    payment: 'Pagamento', storage: 'Armazenamento', crm: 'CRM',
    marketing: 'Marketing', analytics: 'Analytics', automation: 'Automação',
    auth: 'Autenticação'
  };

  const catIcons: Record<string, string> = {
    all: '🔌', messaging: '💬', productivity: '📅', payment: '💳',
    storage: '☁️', crm: '📊', marketing: '📧', analytics: '📈', automation: '⚡',
    auth: '🔐'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-gray-900">Integrações</h3>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
              {connectedCount} de {integrations.length} conectadas
            </span>
          </p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
        {categories.map(c => {
          const count = c === 'all' ? integrations.length : integrations.filter(i => i.category === c).length;
          return (
            <motion.button key={c} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setCatFilter(c)}
              className={cn(
                'rounded-lg sm:rounded-xl px-2 sm:px-3.5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-semibold border transition-all flex items-center gap-1 sm:gap-1.5',
                catFilter === c
                  ? 'bg-brand-50 text-brand-700 border-brand-200 shadow-sm shadow-brand-100'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              )}>
              <span className="text-sm sm:text-base">{catIcons[c] || '🔗'}</span>
              <span className="hidden md:inline">{catLabels[c] || c}</span>
              <span className={cn(
                'rounded-full px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-bold',
                catFilter === c ? 'bg-brand-200/60 text-brand-800' : 'bg-gray-100 text-gray-400'
              )}>{count}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {filtered.map((integration, i) => (
          <motion.div
            key={integration.name}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
            className={cn(
              'group relative card overflow-hidden transition-all duration-300',
              integration.status === 'connected'
                ? 'border-green-200/60 hover:border-green-300 hover:shadow-lg hover:shadow-green-100/40'
                : 'card-interactive hover:shadow-lg hover:shadow-gray-100/60'
            )}
          >
            {/* Connected indicator */}
            {integration.status === 'connected' && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
            )}

            <div className="p-4 sm:p-5">
              {/* Top row: Logo + Name + Status badge */}
              <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                <div className={cn(
                  'shrink-0 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl p-2 transition-all duration-300',
                  integration.status === 'connected'
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 shadow-sm shadow-green-100 ring-1 ring-green-200/50'
                    : 'bg-gray-50 group-hover:bg-gray-100 ring-1 ring-gray-100'
                )}>
                  <IntegrationLogo name={integration.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-[13px] sm:text-sm font-bold text-gray-900 truncate">{integration.name}</p>
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider',
                      integration.status === 'connected'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : 'bg-gray-50 text-gray-400 border border-gray-200'
                    )}>
                      <span className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        integration.status === 'connected' ? 'bg-green-500 shadow-sm shadow-green-500/50 animate-pulse' : 'bg-gray-300'
                      )} />
                      <span className="hidden sm:inline">{integration.status === 'connected' ? 'Conectado' : 'Desconectado'}</span>
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-gray-500 line-clamp-1 sm:line-clamp-2 leading-relaxed">{integration.description}</p>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-1.5">
                    <span className="rounded-full bg-gray-50 border border-gray-200 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-medium text-gray-500 capitalize">
                      {catIcons[integration.category] || '🔗'} {catLabels[integration.category] || integration.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Connected date */}
              {integration.connectedAt && (
                <p className="text-[9px] sm:text-[10px] text-gray-400 mb-2 sm:mb-3 flex items-center gap-1">
                  <Check className="h-3 w-3 text-green-500" />
                  Desde {new Date(integration.connectedAt).toLocaleDateString('pt-BR')}
                </p>
              )}

              {/* Action buttons */}
              <div className="flex gap-2">
                {integration.status === 'connected' ? (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { setConfigModal(integration); setConfigApiKey('sk_live_••••••••••••••••'); setConfigSync(true); }}
                      className="flex-1 rounded-lg sm:rounded-xl border border-gray-200 bg-white px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-1 sm:gap-1.5"
                    >
                      <Settings className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span className="hidden xs:inline">Config</span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => setDisconnectConfirm(integration.name)}
                      className="rounded-lg sm:rounded-xl border border-red-200 bg-red-50 px-2 sm:px-3 py-2 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition-all flex items-center justify-center gap-1"
                    >
                      <X className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </motion.button>
                  </>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handleConnect(integration.name)}
                    disabled={connecting === integration.name}
                    className={cn(
                      'flex-1 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-[10px] sm:text-xs font-bold text-white transition-all flex items-center justify-center gap-1 sm:gap-1.5',
                      connecting === integration.name
                        ? 'bg-brand-400 cursor-not-allowed'
                        : 'btn-primary hover:shadow-md hover:shadow-brand-200'
                    )}
                  >
                    {connecting === integration.name ? (
                      <><RefreshCw className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin" /> <span className="hidden sm:inline">Conectando...</span></>
                    ) : (
                      <><Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> Conectar</>
                    )}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">🔌</div>
          <p className="text-sm font-medium text-gray-500">Nenhuma integração nesta categoria</p>
          <button onClick={() => setCatFilter('all')} className="mt-2 text-xs font-semibold text-brand-600 hover:underline">Ver todas</button>
        </div>
      )}

      {/* Config Modal */}
      <AnimatePresence>
        {configModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }}
              className="card p-0 max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
              {/* Modal header */}
              <div className="flex items-center gap-4 p-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-gray-100">
                  <IntegrationLogo name={configModal.name} />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900">{configModal.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {configModal.status === 'connected' ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-green-500 shadow-sm shadow-green-500/50" />
                        <span className="text-xs text-green-600 font-medium">Conectado</span>
                        {configModal.connectedAt && (
                          <span className="text-[10px] text-gray-400 ml-1">desde {new Date(configModal.connectedAt).toLocaleDateString('pt-BR')}</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-gray-300" />
                        <span className="text-xs text-gray-500 font-medium">Não configurado</span>
                      </>
                    )}
                  </div>
                </div>
                <button onClick={() => setConfigModal(null)} className="rounded-xl p-2 hover:bg-gray-100 transition-colors"><X className="h-4 w-4 text-gray-500" /></button>
              </div>

              {/* Modal body */}
              <div className="p-6 space-y-4 overflow-auto flex-1">
                {/* OAuth Provider Config */}
                {isOAuthProvider(configModal.name) ? (
                  <>
                    {/* Info box */}
                    <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Info className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Configuração OAuth</p>
                          <p className="text-xs text-blue-700 mt-0.5">
                            {configModal.name === 'Google OAuth' && 'Obtenha as credenciais no Google Cloud Console → APIs & Services → Credentials'}
                            {configModal.name === 'Microsoft OAuth' && 'Obtenha as credenciais no Azure Portal → App registrations'}
                            {configModal.name === 'Apple Sign In' && 'Obtenha as credenciais no Apple Developer Portal → Identifiers'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic OAuth fields */}
                    {getOAuthFields(configModal.name).map((field) => (
                      <div key={field.key}>
                        <label className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold text-gray-700">
                          {field.label}
                          {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            value={oauthConfig[field.key] || ''}
                            onChange={e => setOauthConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                            placeholder={field.placeholder}
                            rows={4}
                            className="input-modern w-full rounded-xl py-2.5 text-sm font-mono resize-none"
                          />
                        ) : (
                          <div className="relative">
                            <input
                              type={field.type === 'password' && !showPassword ? 'password' : 'text'}
                              value={oauthConfig[field.key] || ''}
                              onChange={e => setOauthConfig(prev => ({ ...prev, [field.key]: e.target.value }))}
                              placeholder={field.placeholder}
                              className="input-modern w-full rounded-xl py-2.5 text-sm font-mono pr-10"
                            />
                            {field.type === 'password' && (
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        )}
                        {field.help && (
                          <p className="mt-1 text-[11px] text-gray-400">{field.help}</p>
                        )}
                      </div>
                    ))}

                    {/* Redirect URI info */}
                    <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                      <p className="text-xs font-semibold text-amber-800 mb-1">📋 URI de Redirecionamento</p>
                      <p className="text-xs text-amber-700 mb-2">Adicione esta URL nas configurações do seu provedor OAuth:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-white rounded-lg px-3 py-2 border border-amber-200 font-mono text-amber-900 truncate">
                          {oauthConfig.redirectUri || `https://app.nexcrm.com/api/auth/${configModal.name.toLowerCase().replace(/\s/g, '-')}/callback`}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(oauthConfig.redirectUri || `https://app.nexcrm.com/api/auth/${configModal.name.toLowerCase().replace(/\s/g, '-')}/callback`);
                            showToast('URI copiada!');
                          }}
                          className="shrink-0 rounded-lg p-2 bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Standard integration config */
                  <>
                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">API Key</label>
                      <div className="relative">
                        <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input type="text" value={configApiKey} onChange={e => setConfigApiKey(e.target.value)}
                          className="input-modern w-full rounded-xl pl-10 pr-20 py-2.5 text-sm font-mono" />
                        <button onClick={() => { navigator.clipboard.writeText(configApiKey).catch(() => {}); showToast('API Key copiada!'); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-[10px] font-bold text-brand-600 hover:bg-brand-50 transition-colors flex items-center gap-1">
                          <Copy className="h-3 w-3" /> Copiar
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">Webhook URL</label>
                      <div className="relative">
                        <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input type="text" readOnly
                          value={`https://api.nexcrm.com/hook/${configModal.name.toLowerCase().replace(/\s/g, '-')}`}
                          className="input-modern w-full rounded-xl pl-10 pr-20 py-2.5 text-sm font-mono bg-gray-50" />
                        <button onClick={() => {
                          navigator.clipboard.writeText(`https://api.nexcrm.com/hook/${configModal.name.toLowerCase().replace(/\s/g, '-')}`).catch(() => {});
                          showToast('URL copiada!');
                        }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2.5 py-1 text-[10px] font-bold text-brand-600 hover:bg-brand-50 transition-colors flex items-center gap-1">
                          <Copy className="h-3 w-3" /> Copiar
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 bg-gray-50/50">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Sincronização Automática</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Sincronizar dados automaticamente a cada 5 min</p>
                      </div>
                      <button onClick={() => setConfigSync(!configSync)}
                        className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', configSync ? 'bg-brand-600' : 'bg-gray-300')}>
                        <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', configSync ? 'translate-x-6' : 'translate-x-1')} />
                      </button>
                    </div>

                    {/* Usage stats */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3 text-center">
                        <p className="text-lg font-bold text-blue-700">1.2k</p>
                        <p className="text-[10px] text-blue-500 font-medium">Requisições/mês</p>
                      </div>
                      <div className="rounded-xl bg-green-50/50 border border-green-100 p-3 text-center">
                        <p className="text-lg font-bold text-green-700">99.8%</p>
                        <p className="text-[10px] text-green-500 font-medium">Uptime</p>
                      </div>
                      <div className="rounded-xl bg-amber-50/50 border border-amber-100 p-3 text-center">
                        <p className="text-lg font-bold text-amber-700">42ms</p>
                        <p className="text-[10px] text-amber-500 font-medium">Latência avg</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex gap-3 p-6 pt-4 border-t border-gray-100 shrink-0">
                <button onClick={() => setConfigModal(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                {isOAuthProvider(configModal.name) && (
                  <motion.button 
                    whileHover={{ scale: 1.02 }} 
                    whileTap={{ scale: 0.98 }}
                    onClick={handleTestConnection}
                    disabled={testing}
                    className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-100 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {testing ? 'Testando...' : 'Testar'}
                  </motion.button>
                )}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (isOAuthProvider(configModal.name)) {
                      handleSaveOAuth();
                    } else {
                      setConfigModal(null);
                      showToast('Configuração salva com sucesso!');
                    }
                  }}
                  className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-bold text-white flex items-center justify-center gap-2">
                  <Check className="h-4 w-4" /> Salvar
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disconnect Confirm */}
      <AnimatePresence>
        {disconnectConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card p-6 max-w-sm w-full space-y-4 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100">
                <AlertTriangle className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Desconectar {disconnectConfirm}?</h3>
              <p className="text-sm text-gray-500">A integração será desativada. Dados já sincronizados não serão afetados.</p>
              <div className="flex gap-3">
                <button onClick={() => setDisconnectConfirm(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={() => handleDisconnect(disconnectConfirm)} className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors">Desconectar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────── API TAB ────────────────
function ApiTab({ showToast }: { showToast: (msg: string, type?: Toast['type']) => void }) {
  const { webhooks, addWebhook, updateWebhook, deleteWebhook } = useStore();
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState('sk_live_nxcrm_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6');
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [editWebhook, setEditWebhook] = useState<WebhookEndpoint | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [regenConfirm, setRegenConfirm] = useState(false);
  const [whForm, setWhForm] = useState({ url: '', events: [] as string[] });
  const [testingWh, setTestingWh] = useState<string | null>(null);

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token).catch(() => {});
    showToast('Token copiado para a área de transferência!');
  };

  const handleRegenToken = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let newToken = 'sk_live_nxcrm_';
    for (let i = 0; i < 32; i++) newToken += chars[Math.floor(Math.random() * chars.length)];
    setToken(newToken);
    setRegenConfirm(false);
    showToast('Token regenerado com sucesso!', 'info');
  };

  const handleAddWebhook = () => {
    if (!whForm.url) { showToast('Informe a URL do webhook', 'error'); return; }
    if (whForm.events.length === 0) { showToast('Selecione pelo menos um evento', 'error'); return; }
    const webhook: WebhookEndpoint = {
      _id: `wh_${Date.now()}`, url: whForm.url, events: whForm.events, active: true,
      secret: `whsec_${Math.random().toString(36).slice(2, 14)}`, createdAt: new Date().toISOString(), failCount: 0,
    };
    addWebhook(webhook);
    setShowAddWebhook(false);
    setWhForm({ url: '', events: [] });
    showToast('Webhook criado com sucesso!');
  };

  const handleEditWebhook = () => {
    if (!editWebhook) return;
    updateWebhook(editWebhook._id, { url: whForm.url, events: whForm.events });
    setEditWebhook(null);
    showToast('Webhook atualizado!');
  };

  const handleTestWebhook = (id: string) => {
    setTestingWh(id);
    setTimeout(() => {
      setTestingWh(null);
      updateWebhook(id, { lastTriggered: new Date().toISOString() });
      showToast('Webhook testado com sucesso! Status 200 OK');
    }, 1500);
  };

  const toggleEvent = (event: string) => {
    setWhForm(p => ({ ...p, events: p.events.includes(event) ? p.events.filter(e => e !== event) : [...p.events, event] }));
  };

  const endpoints = [
    { method: 'POST', path: '/api/auth/login', desc: 'Autenticação JWT' },
    { method: 'POST', path: '/api/auth/refresh', desc: 'Refresh Token' },
    { method: 'GET', path: '/api/leads', desc: 'Listar leads' },
    { method: 'POST', path: '/api/leads', desc: 'Criar lead' },
    { method: 'PUT', path: '/api/leads/:id', desc: 'Atualizar lead' },
    { method: 'DELETE', path: '/api/leads/:id', desc: 'Excluir lead' },
    { method: 'GET', path: '/api/conversations', desc: 'Listar conversas' },
    { method: 'POST', path: '/api/messages', desc: 'Enviar mensagem' },
    { method: 'POST', path: '/api/webhook/whatsapp', desc: 'Webhook WhatsApp' },
    { method: 'GET', path: '/api/analytics', desc: 'Dados analytics' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-extrabold text-gray-900">API & Webhooks</h3>
        <p className="text-sm text-gray-500 mt-0.5">Gerencie tokens, endpoints e webhooks</p>
      </div>

      {/* API Token */}
      <div className="card p-6 space-y-4">
        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Key className="h-4 w-4 text-brand-600" /> API Token</h4>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input type={showToken ? 'text' : 'password'} value={token} readOnly className="input-modern w-full rounded-xl bg-gray-50 px-4 py-3 font-mono text-sm pr-10" />
            <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleCopyToken}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-600 hover:bg-gray-50 font-medium flex items-center gap-1.5"><Copy className="h-4 w-4" /> Copiar</motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setRegenConfirm(true)}
            className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600 hover:bg-red-100 font-medium flex items-center gap-1.5"><RefreshCw className="h-4 w-4" /> Regenerar</motion.button>
        </div>
        <p className="text-xs text-gray-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Nunca compartilhe seu token. Use variáveis de ambiente.</p>
      </div>

      {/* Webhooks */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Webhook className="h-4 w-4 text-brand-600" /> Webhooks</h4>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { setWhForm({ url: '', events: [] }); setShowAddWebhook(true); }}
            className="btn-primary flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white"><Plus className="h-3 w-3" /> Novo Webhook</motion.button>
        </div>

        <div className="space-y-3">
          {webhooks.map(wh => (
            <div key={wh._id} className={cn('rounded-xl border p-4 transition-all', wh.active ? 'border-gray-200 hover:border-brand-200' : 'border-gray-100 bg-gray-50/50')}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <button onClick={() => updateWebhook(wh._id, { active: !wh.active })} className="shrink-0">
                      {wh.active ? <ToggleRight className="h-5 w-5 text-brand-600" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                    </button>
                    <code className="text-sm font-mono text-gray-800 truncate">{wh.url}</code>
                  </div>
                  <div className="flex flex-wrap gap-1 ml-7">
                    {wh.events.map(ev => (
                      <span key={ev} className="rounded-md bg-brand-50 border border-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">{ev}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-2 ml-7 text-[10px] text-gray-400">
                    {wh.lastTriggered && <span>Último: {new Date(wh.lastTriggered).toLocaleString('pt-BR')}</span>}
                    {wh.failCount > 0 && <span className="text-red-500">{wh.failCount} falhas</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleTestWebhook(wh._id)} disabled={testingWh === wh._id}
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-1">
                    {testingWh === wh._id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Test
                  </button>
                  <button onClick={() => { setWhForm({ url: wh.url, events: [...wh.events] }); setEditWebhook(wh); }}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-brand-600"><Edit2 className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setDeleteConfirm(wh._id)}
                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* API Endpoints */}
      <div className="card p-6 space-y-4">
        <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2"><Code className="h-4 w-4 text-brand-600" /> Endpoints Disponíveis</h4>
        <div className="space-y-2">
          {endpoints.map(ep => (
            <div key={ep.path + ep.method} className="flex items-center gap-3 rounded-xl bg-gray-50 border border-gray-100 p-3 hover:border-brand-200 transition-colors group">
              <span className={cn('rounded-lg px-2.5 py-1 font-mono text-[10px] font-bold border shrink-0',
                ep.method === 'GET' ? 'bg-green-50 text-green-700 border-green-200' :
                ep.method === 'POST' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                ep.method === 'PUT' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-red-50 text-red-700 border-red-200')}>{ep.method}</span>
              <code className="flex-1 font-mono text-xs text-gray-700 font-medium">{ep.path}</code>
              <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">{ep.desc}</span>
              <button onClick={() => { navigator.clipboard.writeText(ep.path).catch(() => {}); showToast(`Copiado: ${ep.path}`); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"><Copy className="h-3 w-3 text-gray-400" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Webhook Modal */}
      <AnimatePresence>
        {(showAddWebhook || editWebhook) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card p-6 max-w-md w-full space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">{editWebhook ? 'Editar' : 'Novo'} Webhook</h3>
                <button onClick={() => { setShowAddWebhook(false); setEditWebhook(null); }} className="rounded-lg p-1.5 hover:bg-gray-100"><X className="h-4 w-4" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">URL do Endpoint *</label>
                  <input type="url" value={whForm.url} onChange={e => setWhForm(p => ({ ...p, url: e.target.value }))} placeholder="https://api.exemplo.com/webhook" className="input-modern w-full rounded-xl px-4 py-2.5 text-sm font-mono" />
                </div>
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-gray-700">Eventos *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {webhookEvents.map(ev => (
                      <button key={ev} onClick={() => toggleEvent(ev)}
                        className={cn('rounded-lg border py-2 px-3 text-xs font-medium text-left transition-all flex items-center gap-2',
                          whForm.events.includes(ev) ? 'bg-brand-50 border-brand-300 text-brand-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                        <div className={cn('h-3.5 w-3.5 rounded border flex items-center justify-center shrink-0',
                          whForm.events.includes(ev) ? 'bg-brand-600 border-brand-600' : 'border-gray-300')}>
                          {whForm.events.includes(ev) && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        {ev}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowAddWebhook(false); setEditWebhook(null); }} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={editWebhook ? handleEditWebhook : handleAddWebhook}
                  className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-bold text-white">{editWebhook ? 'Salvar' : 'Criar Webhook'}</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Regen Token Confirm */}
      <AnimatePresence>
        {regenConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card p-6 max-w-sm w-full space-y-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 mx-auto"><AlertTriangle className="h-6 w-6 text-amber-600" /></div>
              <h3 className="text-lg font-bold text-gray-900">Regenerar Token?</h3>
              <p className="text-sm text-gray-500">O token atual será invalidado. Atualize todas as aplicações que o utilizam.</p>
              <div className="flex gap-3">
                <button onClick={() => setRegenConfirm(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={handleRegenToken} className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-bold text-white hover:bg-amber-700">Regenerar</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Webhook Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="card p-6 max-w-sm w-full space-y-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 mx-auto"><Trash2 className="h-6 w-6 text-red-600" /></div>
              <h3 className="text-lg font-bold text-gray-900">Excluir Webhook?</h3>
              <p className="text-sm text-gray-500">O endpoint não receberá mais eventos.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                <button onClick={() => { deleteWebhook(deleteConfirm); setDeleteConfirm(null); showToast('Webhook excluído', 'error'); }}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-bold text-white hover:bg-red-700">Excluir</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ──────────────── BRANDING TAB ────────────────
function BrandingTab({ showToast }: { showToast: (msg: string, type?: Toast['type']) => void }) {
  const { branding, updateBranding } = useStore();
  const [brandColor, setBrandColor] = useState(branding.primaryColor);
  const [companyName, setCompanyName] = useState(branding.companyName);
  const [logoFile, setLogoFile] = useState<string | null>(branding.logo);
  const [darkMode, setDarkMode] = useState(branding.darkMode);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const presetColors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#ef4444', '#f97316', '#14b8a6', '#f472b6', '#84cc16', '#06b6d4'];

  // Detectar mudanças
  useEffect(() => {
    const changed = brandColor !== branding.primaryColor ||
      companyName !== branding.companyName ||
      logoFile !== branding.logo ||
      darkMode !== branding.darkMode;
    setHasChanges(changed);
  }, [brandColor, companyName, logoFile, darkMode, branding]);

  // Aplicar cor em tempo real no preview
  useEffect(() => {
    // Atualizar CSS variables em tempo real para preview
    document.documentElement.style.setProperty('--preview-brand-color', brandColor);
    const hex = brandColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    document.documentElement.style.setProperty('--preview-brand-rgb', `${r}, ${g}, ${b}`);
  }, [brandColor]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoFile(reader.result as string);
        showToast('Logo carregada com sucesso!');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setSaving(true);
    
    // Aplicar as mudanças no store (isso aplica globalmente)
    updateBranding({
      companyName,
      primaryColor: brandColor,
      logo: logoFile,
      darkMode
    });
    
    setTimeout(() => {
      setSaving(false);
      setHasChanges(false);
      showToast('Branding aplicado com sucesso! As mudanças estão visíveis em todo o sistema.');
    }, 800);
  };

  const handleReset = () => {
    setBrandColor(branding.primaryColor);
    setCompanyName(branding.companyName);
    setLogoFile(branding.logo);
    setDarkMode(branding.darkMode);
    showToast('Alterações descartadas', 'info');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-extrabold text-gray-900">Aparência & Branding</h3>
        <p className="text-sm text-gray-500 mt-0.5">Customize a identidade visual da plataforma</p>
      </div>

      {/* Grid Layout para telas grandes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Coluna 1 - Configurações de Branding */}
        <div className="card p-6 space-y-6">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Palette className="h-4 w-4 text-brand-600" /> Identidade Visual
          </h4>
          
          {/* Logo */}
          <div>
            <label className="mb-3 block text-[13px] font-semibold text-gray-700">Logo da Empresa</label>
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-2xl font-bold text-white shadow-lg shadow-brand-500/25 overflow-hidden">
                {logoFile ? <img src={logoFile} alt="logo" className="w-full h-full object-cover" /> : companyName.slice(0, 2)}
              </div>
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => fileInputRef.current?.click()}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-medium flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Upload Logo
                </motion.button>
                {logoFile && (
                  <button onClick={() => { setLogoFile(null); showToast('Logo removida', 'info'); }} className="text-xs text-red-500 hover:underline">Remover logo</button>
                )}
                <p className="text-[10px] text-gray-400">PNG, JPG ou SVG. Max 2MB.</p>
              </div>
            </div>
          </div>

          {/* Company Name */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold text-gray-700">Nome da Empresa</label>
            <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} className="input-modern w-full rounded-xl px-4 py-3 text-sm" />
          </div>

          {/* Brand Color */}
          <div>
            <label className="mb-2 block text-[13px] font-semibold text-gray-700">Cor Principal</label>
            <div className="flex items-center gap-3 flex-wrap">
              <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="h-11 w-11 cursor-pointer rounded-xl border-2 border-gray-200 p-0.5" />
              <input type="text" value={brandColor} onChange={e => setBrandColor(e.target.value)} className="input-modern rounded-xl px-4 py-3 font-mono text-sm w-32" />
              <div className="flex gap-2 flex-wrap">
                {presetColors.map(c => (
                  <button key={c} onClick={() => setBrandColor(c)}
                    className={cn('h-9 w-9 rounded-xl border-2 shadow-sm hover:scale-110 transition-transform',
                      brandColor === c ? 'border-gray-900 ring-2 ring-offset-1 ring-gray-400' : 'border-white')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between rounded-xl border border-gray-200 p-4 bg-gray-50">
            <div>
              <p className="text-sm font-semibold text-gray-700">Modo Escuro</p>
              <p className="text-xs text-gray-400 mt-0.5">Ativar tema escuro para a plataforma</p>
            </div>
            <button onClick={() => { setDarkMode(!darkMode); showToast(darkMode ? 'Modo claro ativado' : 'Modo escuro ativado (preview)', 'info'); }}
              className={cn('relative inline-flex h-6 w-11 items-center rounded-full transition-colors', darkMode ? 'bg-brand-600' : 'bg-gray-300')}>
              <span className={cn('inline-block h-4 w-4 rounded-full bg-white shadow transition-transform', darkMode ? 'translate-x-6' : 'translate-x-1')} />
            </button>
          </div>
        </div>

        {/* Coluna 2 - Preview */}
        <div className="card p-6 space-y-6">
          <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-4 w-4 text-brand-600" /> Preview ao Vivo
          </h4>
          
          {/* Preview Card */}
          <div className="rounded-xl border border-gray-200 p-6 space-y-4 bg-gradient-to-br from-gray-50 to-white">
            {/* Header Preview */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-gray-100">
              <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg" style={{ backgroundColor: brandColor }}>
                {companyName.slice(0, 2)}
              </div>
              <span className="text-base font-bold text-gray-900">{companyName}</span>
            </div>

            {/* Buttons Preview */}
            <div className="space-y-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Botões</p>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-lg" style={{ backgroundColor: brandColor }}>Primário</button>
                <button className="rounded-xl px-5 py-2.5 text-sm font-bold border-2" style={{ borderColor: brandColor, color: brandColor }}>Secundário</button>
                <button className="rounded-xl px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50">Terciário</button>
              </div>
            </div>

            {/* Progress Preview */}
            <div className="space-y-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Indicadores</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Progresso</span>
                  <span className="font-semibold" style={{ color: brandColor }}>67%</span>
                </div>
                <div className="h-3 rounded-full bg-gray-200 overflow-hidden">
                  <div className="h-full w-2/3 rounded-full transition-all" style={{ backgroundColor: brandColor }} />
                </div>
              </div>
            </div>

            {/* Badge Preview */}
            <div className="space-y-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Badges</p>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: brandColor }}>Ativo</span>
                <span className="rounded-full px-3 py-1 text-xs font-bold border" style={{ borderColor: brandColor, color: brandColor, backgroundColor: `${brandColor}15` }}>Pendente</span>
                <span className="rounded-full px-3 py-1 text-xs font-bold text-gray-600 bg-gray-100 border border-gray-200">Inativo</span>
              </div>
            </div>
          </div>

          {/* Color Info */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-200">
            <div className="h-12 w-12 rounded-xl shadow-inner" style={{ backgroundColor: brandColor }} />
            <div>
              <p className="text-sm font-semibold text-gray-900">Cor selecionada</p>
              <p className="text-xs font-mono text-gray-500">{brandColor.toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Indicador de Mudanças + Botões */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Você tem alterações não salvas</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <motion.button 
              whileHover={{ scale: 1.02 }} 
              whileTap={{ scale: 0.98 }} 
              onClick={handleReset}
              className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 flex items-center gap-2">
              <X className="h-4 w-4" />
              Descartar
            </motion.button>
          )}
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }} 
            onClick={handleSave} 
            disabled={saving || !hasChanges}
            className={cn(
              "rounded-xl px-6 py-2.5 text-sm font-semibold text-white flex items-center gap-2 transition-all",
              hasChanges 
                ? "bg-gradient-to-r from-brand-600 to-violet-600 shadow-lg shadow-brand-500/25 hover:shadow-xl" 
                : "bg-gray-300 cursor-not-allowed"
            )}>
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? 'Aplicando...' : 'Aplicar Mudanças'}
          </motion.button>
        </div>
      </div>

      {/* Info sobre aplicação em tempo real */}
      <div className="bg-gradient-to-r from-brand-50 to-violet-50 border border-brand-200 rounded-xl p-4 flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
          <Zap className="h-4 w-4 text-brand-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-brand-900">Aplicação em Tempo Real</p>
          <p className="text-xs text-brand-700 mt-0.5">
            Ao clicar em "Aplicar Mudanças", a cor e o nome serão atualizados instantaneamente em todo o sistema, 
            incluindo o menu lateral, cabeçalho e todos os componentes.
          </p>
        </div>
      </div>
    </div>
  );
}

// ──────────────── NOTIFICATIONS TAB ────────────────
function NotificationsTab({ showToast }: { showToast: (msg: string, type?: Toast['type']) => void }) {
  const [notifs, setNotifs] = useState([
    { id: 'n1', label: 'Novo lead recebido', desc: 'Receba alerta quando um novo lead entrar no sistema', email: true, push: true, inApp: true },
    { id: 'n2', label: 'Mensagem não respondida', desc: 'Alerta após 5 minutos sem resposta do atendente', email: false, push: true, inApp: true },
    { id: 'n3', label: 'Deal fechado', desc: 'Notificação quando um deal é marcado como ganho', email: true, push: true, inApp: true },
    { id: 'n4', label: 'SLA excedido', desc: 'Alerta quando tempo de resposta ultrapassa o SLA', email: true, push: true, inApp: true },
    { id: 'n5', label: 'Tarefa vencida', desc: 'Lembrete de tarefas que passaram do prazo', email: false, push: false, inApp: true },
    { id: 'n6', label: 'Nova conversa atribuída', desc: 'Quando uma conversa é transferida para você', email: false, push: true, inApp: true },
    { id: 'n7', label: 'Automação falhou', desc: 'Alerta quando uma automação encontra erro', email: true, push: true, inApp: true },
    { id: 'n8', label: 'Relatório semanal', desc: 'Resumo semanal de performance por email', email: true, push: false, inApp: false },
    { id: 'n9', label: 'Novo usuário no time', desc: 'Quando alguém aceita o convite da organização', email: true, push: false, inApp: true },
    { id: 'n10', label: 'Atividade suspeita', desc: 'Login de novo IP ou múltiplas tentativas', email: true, push: true, inApp: true },
  ]);
  const [saving, setSaving] = useState(false);

  const toggle = (id: string, channel: 'email' | 'push' | 'inApp') => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, [channel]: !n[channel] } : n));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => { setSaving(false); showToast('Preferências de notificação salvas!'); }, 1000);
  };

  // Toggle Switch Component
  const ToggleSwitch = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
    <button
      onClick={onToggle}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2',
        enabled ? 'bg-brand-600' : 'bg-gray-300'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-extrabold text-gray-900">Notificações</h3>
          <p className="text-sm text-gray-500 mt-0.5">Configure como deseja receber alertas</p>
        </div>
        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleSave} disabled={saving}
          className="btn-primary flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {saving ? 'Salvando...' : 'Salvar'}
        </motion.button>
      </div>

      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex items-center bg-gray-50 border-b border-gray-200 px-4 sm:px-5 py-3">
          <span className="flex-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Notificação</span>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="w-12 sm:w-14 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1">
                <Mail className="h-3 w-3" />
                <span className="hidden sm:inline">Email</span>
              </span>
            </div>
            <div className="w-12 sm:w-14 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1">
                <Phone className="h-3 w-3" />
                <span className="hidden sm:inline">Push</span>
              </span>
            </div>
            <div className="w-12 sm:w-14 text-center">
              <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1">
                <Bell className="h-3 w-3" />
                <span className="hidden sm:inline">In-app</span>
              </span>
            </div>
          </div>
        </div>

        {notifs.map((n, i) => (
          <motion.div key={n.id} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
            className={cn('flex items-center px-4 sm:px-5 py-4 hover:bg-gray-50/50 transition-colors', i < notifs.length - 1 && 'border-b border-gray-100')}>
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-[13px] font-semibold text-gray-900">{n.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 hidden sm:block">{n.desc}</p>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 shrink-0">
              <div className="w-12 sm:w-14 flex justify-center">
                <ToggleSwitch enabled={n.email} onToggle={() => toggle(n.id, 'email')} />
              </div>
              <div className="w-12 sm:w-14 flex justify-center">
                <ToggleSwitch enabled={n.push} onToggle={() => toggle(n.id, 'push')} />
              </div>
              <div className="w-12 sm:w-14 flex justify-center">
                <ToggleSwitch enabled={n.inApp} onToggle={() => toggle(n.id, 'inApp')} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2 sm:gap-3">
        <button onClick={() => { setNotifs(prev => prev.map(n => ({ ...n, email: true, push: true, inApp: true }))); showToast('Todas as notificações ativadas', 'info'); }}
          className="rounded-xl border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          Ativar Todas
        </button>
        <button onClick={() => { setNotifs(prev => prev.map(n => ({ ...n, email: false, push: false, inApp: false }))); showToast('Todas as notificações desativadas', 'info'); }}
          className="rounded-xl border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          Desativar Todas
        </button>
        <button onClick={() => { setNotifs(prev => prev.map(n => ({ ...n, email: false, push: false, inApp: true }))); showToast('Apenas notificações in-app ativadas', 'info'); }}
          className="rounded-xl border border-gray-200 px-3 sm:px-4 py-2 sm:py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          Apenas In-App
        </button>
      </div>
    </div>
  );
}

// ──────────────── LOGS TAB ────────────────
function LogsTab({ showToast }: { showToast: (msg: string, type?: Toast['type']) => void }) {
  const { auditLogs } = useStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const perPage = 10;

  const logTypes = ['all', 'auth', 'message', 'automation', 'crm', 'admin', 'system', 'webhook', 'finance', 'settings'];
  const typeColors: Record<string, string> = {
    auth: 'bg-green-50 text-green-700 border-green-200',
    message: 'bg-blue-50 text-blue-700 border-blue-200',
    automation: 'bg-purple-50 text-purple-700 border-purple-200',
    crm: 'bg-amber-50 text-amber-700 border-amber-200',
    admin: 'bg-red-50 text-red-700 border-red-200',
    system: 'bg-gray-100 text-gray-700 border-gray-200',
    webhook: 'bg-pink-50 text-pink-700 border-pink-200',
    finance: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    settings: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  const filtered = auditLogs.filter(l => {
    if (search && !l.action.toLowerCase().includes(search.toLowerCase()) && !l.user.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && l.type !== typeFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const handleExport = () => {
    const bom = '\uFEFF';
    const csv = bom + 'Data,Hora,Usuário,Tipo,Ação,IP\n' +
      filtered.map(l => `${l.date},${l.time},${l.user},${l.type},"${l.action}",${l.ip}`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    showToast('Logs exportados com sucesso!');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-extrabold text-gray-900">Logs do Sistema</h3>
          <p className="text-sm text-gray-500 mt-0.5">{filtered.length} registros de auditoria</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setAutoRefresh(!autoRefresh); showToast(autoRefresh ? 'Auto-refresh desativado' : 'Auto-refresh ativado', 'info'); }}
            className={cn('flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all',
              autoRefresh ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
            <Activity className={cn('h-3 w-3', autoRefresh && 'animate-pulse')} /> Auto-refresh
          </button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleExport}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <Download className="h-3 w-3" /> Exportar CSV
          </motion.button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por ação ou usuário..." className="input-modern w-full rounded-xl pl-10 pr-4 py-2.5 text-sm" />
        </div>
        <div className="flex gap-1 flex-wrap">
          {logTypes.map(t => (
            <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
              className={cn('rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all',
                typeFilter === t ? 'bg-brand-50 text-brand-700 border-brand-200' :
                t !== 'all' ? (typeColors[t] || 'bg-gray-50 text-gray-500 border-gray-200') + ' opacity-60 hover:opacity-100' :
                'bg-white text-gray-500 border-gray-200 hover:bg-gray-50')}>
              {t === 'all' ? 'Todos' : t}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="card overflow-hidden">
        <div className="hidden sm:flex items-center bg-gray-50 border-b border-gray-200 px-5 py-2.5">
          <span className="w-20 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Hora</span>
          <span className="w-20 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Tipo</span>
          <span className="w-32 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Usuário</span>
          <span className="flex-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ação</span>
          <span className="w-32 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">IP</span>
        </div>

        {paginated.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Nenhum log encontrado</div>
        ) : paginated.map((log, i) => (
          <motion.div key={log._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
            className={cn('flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-0 px-5 py-3 hover:bg-brand-50/20 transition-colors',
              i < paginated.length - 1 && 'border-b border-gray-50')}>
            <span className="w-20 shrink-0 font-mono text-[11px] text-gray-400 font-medium">{log.time}</span>
            <span className="w-20 shrink-0">
              <span className={cn('rounded-lg border px-2 py-0.5 text-[9px] font-bold uppercase', typeColors[log.type] || 'bg-gray-50 text-gray-700 border-gray-200')}>
                {log.type}
              </span>
            </span>
            <span className="w-32 shrink-0 text-xs font-semibold text-gray-700">{log.user}</span>
            <span className="flex-1 text-xs text-gray-600">
              {log.action}
              {log.details && <span className="ml-2 text-[10px] text-red-500">({log.details})</span>}
            </span>
            <span className="shrink-0 font-mono text-[10px] text-gray-400 text-right w-32">{log.ip}</span>
          </motion.div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">Mostrando {(page - 1) * perPage + 1}-{Math.min(page * perPage, filtered.length)} de {filtered.length}</p>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">Anterior</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 3), page + 2).map(p => (
              <button key={p} onClick={() => setPage(p)}
                className={cn('rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                  page === p ? 'bg-brand-50 text-brand-700 border-brand-200' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40">Próximo</button>
          </div>
        </div>
      )}
    </div>
  );
}
