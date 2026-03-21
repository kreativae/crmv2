import { logger } from '../utils/logger';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store';
import type { Client, ClientNote } from '../types';
import { forceCleanup } from '../utils/fixClickBlock';
import { clientService } from '../api/services/clientService';
import {
  Search, Plus, Grid3X3, List, Download, MoreHorizontal, Edit2, Trash2, Eye,
  Mail, Phone, Building2, MapPin, Tag, X, Check, Copy, MessageSquare, TrendingUp,
  Users, DollarSign, ChevronDown, UserCircle, Calendar
} from 'lucide-react';

const industries = [
  { value: 'technology', label: 'Tecnologia' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'cloud', label: 'Cloud' },
  { value: 'software', label: 'Software' },
  { value: 'startup', label: 'Startup' },
  { value: 'retail', label: 'Varejo' },
  { value: 'finance', label: 'Finanças' },
  { value: 'healthcare', label: 'Saúde' },
  { value: 'education', label: 'Educação' },
  { value: 'manufacturing', label: 'Indústria' },
  { value: 'services', label: 'Serviços' },
  { value: 'other', label: 'Outros' },
];

const emptyClient: Omit<Client, '_id' | 'organizationId' | 'createdAt' | 'updatedAt'> = {
  name: '',
  email: '',
  phone: '',
  company: '',
  industry: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'Brasil',
  status: 'active',
  tags: [],
  notes: [],
  annualSpend: 0,
  leadsCount: 0,
  conversationsCount: 0,
};

type ToastType = 'success' | 'error' | 'info';

export function ClientsPage() {
  const { clients, addClient, updateClient, deleteClient } = useStore();

  // View state
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'annualSpend' | 'createdAt'>('name');
  const [sortDir] = useState<'asc' | 'desc'>('asc');

  // Selection
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [quickActionsClient, setQuickActionsClient] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState(emptyClient);
  const [formErrors, setFormErrors] = useState<Record<string, boolean>>({});
  const [tagInput, setTagInput] = useState('');

  // Detail panel tabs
  const [detailTab, setDetailTab] = useState<'details' | 'history' | 'notes'>('details');
  const [noteInput, setNoteInput] = useState('');

  // Toast
  const [toasts, setToasts] = useState<{ id: string; type: ToastType; message: string }[]>([]);

  const [_loading, setLoading] = useState(false);

  // Load clients from backend on mount
  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const response = await clientService.getAll();
      const serverClients = response.data || [];
      // Sync with store: replace local clients with server data
      const currentClients = useStore.getState().clients;
      // Remove all local clients and add server ones
      currentClients.forEach(c => deleteClient(c._id));
      serverClients.forEach(c => addClient(c));
    } catch (err) {
      logger.error('Erro ao carregar clientes:', err);
      // If API is not available, keep local state
    } finally {
      setLoading(false);
    }
  }, [addClient, deleteClient]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Reset state on unmount and cleanup overlays
  useEffect(() => {
    return () => {
      setSelectedClient(null);
      setShowCreateModal(false);
      setEditingClient(null);
      setShowDeleteModal(false);
      setTimeout(() => forceCleanup(), 50);
    };
  }, []);

  const showToast = (type: ToastType, message: string) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  // Filtered and sorted clients
  const filteredClients = useMemo(() => {
    let result = [...clients];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.company?.toLowerCase().includes(q)
      );
    }

    // Status
    if (statusFilter !== 'all') {
      result = result.filter(c => c.status === statusFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'email') cmp = a.email.localeCompare(b.email);
      else if (sortBy === 'annualSpend') cmp = a.annualSpend - b.annualSpend;
      else if (sortBy === 'createdAt') cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [clients, searchQuery, statusFilter, sortBy, sortDir]);

  // Stats
  const stats = useMemo(() => ({
    total: clients.length,
    active: clients.filter(c => c.status === 'active').length,
    inactive: clients.filter(c => c.status === 'inactive').length,
    totalValue: clients.reduce((sum, c) => sum + c.annualSpend, 0),
    avgValue: clients.length > 0 ? clients.reduce((sum, c) => sum + c.annualSpend, 0) / clients.length : 0,
  }), [clients]);

  // Form handlers
  const resetForm = () => {
    setFormData(emptyClient);
    setFormErrors({});
    setTagInput('');
  };

  const validateForm = () => {
    const errors: Record<string, boolean> = {};
    if (!formData.name.trim()) errors.name = true;
    if (!formData.email.trim() || !formData.email.includes('@')) errors.email = true;
    if (!formData.phone.trim()) errors.phone = true;
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const [_saving, setSaving] = useState(false);

  const handleSaveClient = async () => {
    if (!validateForm()) return;
    setSaving(true);

    try {
      if (editingClient) {
        const updated = await clientService.update(editingClient._id, formData);
        updateClient(editingClient._id, updated);
        showToast('success', 'Cliente atualizado com sucesso!');
        setEditingClient(null);
      } else {
        const created = await clientService.create(formData);
        addClient(created);
        showToast('success', 'Cliente criado com sucesso!');
        setShowCreateModal(false);
      }
      resetForm();
    } catch (err) {
      logger.error('Erro ao salvar cliente:', err);
      showToast('error', 'Erro ao salvar cliente. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (clientToDelete) {
      try {
        await clientService.delete(clientToDelete._id);
        deleteClient(clientToDelete._id);
        showToast('success', 'Cliente excluído!');
        if (selectedClient?._id === clientToDelete._id) {
          setSelectedClient(null);
        }
      } catch (err) {
        logger.error('Erro ao excluir cliente:', err);
        showToast('error', 'Erro ao excluir cliente.');
      } finally {
        setClientToDelete(null);
        setShowDeleteModal(false);
      }
    }
  };

  const handleBulkDelete = async () => {
    try {
      await clientService.bulkDelete(selectedClients);
      selectedClients.forEach(id => deleteClient(id));
      showToast('success', `${selectedClients.length} clientes excluídos!`);
    } catch (err) {
      logger.error('Erro ao excluir clientes:', err);
      showToast('error', 'Erro ao excluir clientes.');
    } finally {
      setSelectedClients([]);
    }
  };

  const handleBulkStatusChange = async (status: 'active' | 'inactive') => {
    try {
      await clientService.bulkUpdate(selectedClients, { status });
      selectedClients.forEach(id => updateClient(id, { status }));
      showToast('success', `${selectedClients.length} clientes atualizados!`);
    } catch (err) {
      logger.error('Erro ao atualizar clientes:', err);
      showToast('error', 'Erro ao atualizar clientes.');
    } finally {
      setSelectedClients([]);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleAddNote = async () => {
    if (!noteInput.trim() || !selectedClient) return;
    try {
      const updated = await clientService.addNote(selectedClient._id, noteInput.trim());
      updateClient(selectedClient._id, { notes: updated.notes });
      setSelectedClient({ ...selectedClient, notes: updated.notes });
      setNoteInput('');
      showToast('success', 'Nota adicionada!');
    } catch (err) {
      logger.error('Erro ao adicionar nota:', err);
      // Fallback local
      const newNote: ClientNote = {
        id: `n_${Date.now()}`,
        content: noteInput.trim(),
        author: 'Você',
        createdAt: new Date().toISOString(),
      };
      updateClient(selectedClient._id, { notes: [...selectedClient.notes, newNote] });
      setSelectedClient({ ...selectedClient, notes: [...selectedClient.notes, newNote] });
      setNoteInput('');
      showToast('success', 'Nota adicionada!');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!selectedClient) return;
    try {
      const updated = await clientService.deleteNote(selectedClient._id, noteId);
      updateClient(selectedClient._id, { notes: updated.notes });
      setSelectedClient({ ...selectedClient, notes: updated.notes });
      showToast('info', 'Nota removida');
    } catch (err) {
      logger.error('Erro ao remover nota:', err);
      const updatedNotes = selectedClient.notes.filter(n => n.id !== noteId);
      updateClient(selectedClient._id, { notes: updatedNotes });
      setSelectedClient({ ...selectedClient, notes: updatedNotes });
      showToast('info', 'Nota removida');
    }
  };

  const handleDuplicate = async (client: Client) => {
    try {
      const { _id, createdAt, updatedAt, ...clientData } = client;
      const created = await clientService.create({ ...clientData, name: `${client.name} (cópia)` });
      addClient(created);
      showToast('success', 'Cliente duplicado!');
    } catch (err) {
      logger.error('Erro ao duplicar cliente:', err);
      showToast('error', 'Erro ao duplicar cliente.');
    } finally {
      setQuickActionsClient(null);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Nome', 'Email', 'Telefone', 'Empresa', 'Setor', 'Status', 'Valor Anual', 'Cidade', 'Estado', 'Tags'];
    const rows = filteredClients.map(c => [
      c.name, c.email, c.phone, c.company || '', 
      industries.find(i => i.value === c.industry)?.label || '',
      c.status === 'active' ? 'Ativo' : 'Inativo',
      c.annualSpend.toString(), c.city || '', c.state || '', c.tags.join(';')
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'CSV exportado!');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('info', 'Copiado!');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getAvatarGradient = (index: number) => {
    const gradients = [
      'from-brand-500 to-violet-500',
      'from-emerald-500 to-teal-500',
      'from-amber-500 to-orange-500',
      'from-rose-500 to-pink-500',
      'from-blue-500 to-cyan-500',
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-gray-200">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Clientes</h1>
              <p className="text-sm text-gray-500">Gestão completa de clientes</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar</span>
              </button>
              <button
                onClick={() => { resetForm(); setShowCreateModal(true); }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:shadow-lg hover:shadow-brand-500/25 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Cliente</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Clientes', value: stats.total, icon: Users, color: 'brand', trend: '+12%' },
            { label: 'Clientes Ativos', value: stats.active, icon: Check, color: 'emerald' },
            { label: 'Valor Total', value: formatCurrency(stats.totalValue), icon: DollarSign, color: 'violet' },
            { label: 'Ticket Médio', value: formatCurrency(stats.avgValue), icon: TrendingUp, color: 'amber' },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 text-${stat.color}-600`} />
                </div>
                {stat.trend && (
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{stat.trend}</span>
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>
          <div className="flex items-center gap-2">
            {/* Status pills */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              {(['all', 'active', 'inactive'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    statusFilter === status ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {status === 'all' ? 'Todos' : status === 'active' ? 'Ativos' : 'Inativos'}
                  <span className="ml-1 text-gray-400">
                    ({status === 'all' ? stats.total : status === 'active' ? stats.active : stats.inactive})
                  </span>
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none pl-3 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 cursor-pointer"
              >
                <option value="name">Nome</option>
                <option value="email">Email</option>
                <option value="annualSpend">Valor</option>
                <option value="createdAt">Data</option>
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setView('grid')}
                className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Grid View */}
        {view === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredClients.map((client, index) => (
                <motion.div
                  key={client._id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  className="group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-brand-200 transition-all cursor-pointer"
                  onClick={() => { setSelectedClient(client); setDetailTab('details'); }}
                >
                  {/* Selection checkbox */}
                  <div
                    className="absolute top-3 left-3 z-10"
                    onClick={e => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={selectedClients.includes(client._id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedClients(prev => [...prev, client._id]);
                        } else {
                          setSelectedClients(prev => prev.filter(id => id !== client._id));
                        }
                      }}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>

                  {/* Quick actions */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={e => { e.stopPropagation(); setFormData(client); setEditingClient(client); }}
                      className="p-1.5 bg-white rounded-lg shadow hover:bg-gray-50"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setSelectedClient(client); setDetailTab('details'); }}
                      className="p-1.5 bg-white rounded-lg shadow hover:bg-gray-50"
                    >
                      <Eye className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setQuickActionsClient(quickActionsClient === client._id ? null : client._id); }}
                      className="p-1.5 bg-white rounded-lg shadow hover:bg-gray-50"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>

                  {/* Quick actions dropdown */}
                  <AnimatePresence>
                    {quickActionsClient === client._id && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-12 right-3 z-20 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <button onClick={() => { setSelectedClient(client); setDetailTab('details'); setQuickActionsClient(null); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Eye className="w-4 h-4" /> Ver detalhes
                        </button>
                        <button onClick={() => { setFormData(client); setEditingClient(client); setQuickActionsClient(null); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Edit2 className="w-4 h-4" /> Editar
                        </button>
                        <button onClick={() => { handleDuplicate(client); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Copy className="w-4 h-4" /> Duplicar
                        </button>
                        <hr className="my-1 border-gray-100" />
                        <button onClick={() => showToast('info', `Email enviado para ${client.email}`)} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Mail className="w-4 h-4" /> Enviar email
                        </button>
                        <button onClick={() => showToast('info', `WhatsApp: ${client.phone}`)} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" /> WhatsApp
                        </button>
                        <button onClick={() => showToast('info', `Ligando para ${client.phone}`)} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <Phone className="w-4 h-4" /> Ligar
                        </button>
                        <hr className="my-1 border-gray-100" />
                        <button onClick={() => { updateClient(client._id, { status: client.status === 'active' ? 'inactive' : 'active' }); showToast('success', 'Status atualizado!'); setQuickActionsClient(null); }} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          {client.status === 'active' ? '❌ Desativar' : '✅ Ativar'}
                        </button>
                        <button onClick={() => { setClientToDelete(client); setShowDeleteModal(true); setQuickActionsClient(null); }} className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                          <Trash2 className="w-4 h-4" /> Excluir
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="p-4">
                    {/* Avatar & Name */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getAvatarGradient(index)} flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                        {client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-gray-900 truncate">{client.name}</h3>
                        <p className="text-sm text-gray-500 truncate">{client.company}</p>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="space-y-1.5 mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Phone className="w-3.5 h-3.5" />
                        <span>{client.phone}</span>
                      </div>
                    </div>

                    {/* Status & Industry */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        client.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {client.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                      {client.industry && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                          {industries.find(i => i.value === client.industry)?.label}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {client.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {client.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="px-2 py-0.5 text-xs bg-brand-50 text-brand-700 rounded-full">{tag}</span>
                        ))}
                        {client.tags.length > 2 && (
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-500 rounded-full">+{client.tags.length - 2}</span>
                        )}
                      </div>
                    )}

                    {/* Value */}
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(client.annualSpend)}</p>
                      <p className="text-xs text-gray-500">Valor anual</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedClients.length === filteredClients.length && filteredClients.length > 0}
                        onChange={e => setSelectedClients(e.target.checked ? filteredClients.map(c => c._id) : [])}
                        className="w-4 h-4 rounded border-gray-300 text-brand-600"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Telefone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Empresa</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Valor Anual</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Criado em</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client, index) => (
                    <tr
                      key={client._id}
                      className={`border-b border-gray-50 hover:bg-brand-50/30 cursor-pointer transition-colors ${
                        selectedClients.includes(client._id) ? 'bg-brand-50/50' : ''
                      }`}
                      onClick={() => { setSelectedClient(client); setDetailTab('details'); }}
                    >
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedClients.includes(client._id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedClients(prev => [...prev, client._id]);
                            } else {
                              setSelectedClients(prev => prev.filter(id => id !== client._id));
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-brand-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(index)} flex items-center justify-center text-white font-bold text-xs`}>
                            {client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{client.name}</p>
                            <p className="text-sm text-gray-500">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden sm:table-cell">{client.phone}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{client.company}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          client.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {client.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 hidden lg:table-cell">{formatCurrency(client.annualSpend)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 hidden lg:table-cell">{formatDate(client.createdAt)}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => { setFormData(client); setEditingClient(client); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setSelectedClient(client); setDetailTab('details'); }} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setClientToDelete(client); setShowDeleteModal(true); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 text-sm text-gray-500">
              {filteredClients.length} clientes • Valor total: {formatCurrency(filteredClients.reduce((sum, c) => sum + c.annualSpend, 0))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filteredClients.length === 0 && (
          <div className="text-center py-12">
            <UserCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum cliente encontrado</h3>
            <p className="text-gray-500 mb-4">Tente ajustar os filtros ou adicione um novo cliente.</p>
            <button
              onClick={() => { resetForm(); setShowCreateModal(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-xl hover:bg-brand-700"
            >
              <Plus className="w-4 h-4" /> Novo Cliente
            </button>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedClients.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-3 bg-gray-900 text-white rounded-2xl shadow-xl"
          >
            <span className="text-sm font-medium px-2 py-1 bg-brand-600 rounded-lg">{selectedClients.length}</span>
            <span className="text-sm">selecionados</span>
            <div className="h-4 w-px bg-gray-700" />
            <button onClick={() => handleBulkStatusChange('active')} className="px-3 py-1.5 text-sm bg-emerald-600 rounded-lg hover:bg-emerald-700">Ativar</button>
            <button onClick={() => handleBulkStatusChange('inactive')} className="px-3 py-1.5 text-sm bg-amber-600 rounded-lg hover:bg-amber-700">Desativar</button>
            <button onClick={handleBulkDelete} className="px-3 py-1.5 text-sm bg-red-600 rounded-lg hover:bg-red-700">Excluir</button>
            <button onClick={() => setSelectedClients([])} className="p-1.5 text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {(showCreateModal || editingClient) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => { setShowCreateModal(false); setEditingClient(null); resetForm(); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${editingClient ? 'bg-amber-100' : 'bg-brand-100'} flex items-center justify-center`}>
                    <UserCircle className={`w-5 h-5 ${editingClient ? 'text-amber-600' : 'text-brand-600'}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                    <p className="text-sm text-gray-500">{editingClient ? 'Atualize os dados' : 'Preencha os dados'}</p>
                  </div>
                </div>
                <button onClick={() => { setShowCreateModal(false); setEditingClient(null); resetForm(); }} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 ${formErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                    placeholder="Nome completo"
                  />
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 ${formErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className={`w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 ${formErrors.phone ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>
                </div>

                {/* Company & Industry */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.company || ''}
                        onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        placeholder="Nome da empresa"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Setor</label>
                    <select
                      value={formData.industry || ''}
                      onChange={e => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    >
                      <option value="">Selecione...</option>
                      {industries.map(i => (
                        <option key={i.value} value={i.value}>{i.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Annual Spend */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valor Anual (R$)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.annualSpend}
                      onChange={e => setFormData(prev => ({ ...prev, annualSpend: Number(e.target.value) }))}
                      className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={formData.address || ''}
                        onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        placeholder="Rua, número"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={e => setFormData(prev => ({ ...prev, city: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <input
                      type="text"
                      value={formData.state || ''}
                      onChange={e => setFormData(prev => ({ ...prev, state: e.target.value }))}
                      className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-brand-50 text-brand-700 rounded-lg text-sm">
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)} className="text-brand-400 hover:text-brand-600">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                      className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                      placeholder="Digite e pressione Enter"
                    />
                    <button onClick={handleAddTag} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200">
                      <Tag className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="flex gap-3">
                    {(['active', 'inactive'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setFormData(prev => ({ ...prev, status }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          formData.status === status
                            ? status === 'active' ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500' : 'bg-amber-100 text-amber-700 ring-2 ring-amber-500'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {status === 'active' ? '✅ Ativo' : '⏸️ Inativo'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
                <button onClick={() => { setShowCreateModal(false); setEditingClient(null); resetForm(); }} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
                  Cancelar
                </button>
                <button onClick={handleSaveClient} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-brand-600 to-violet-600 rounded-xl hover:shadow-lg hover:shadow-brand-500/25">
                  {editingClient ? 'Salvar Alterações' : 'Criar Cliente'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && clientToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => { setShowDeleteModal(false); setClientToDelete(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">Excluir Cliente</h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Tem certeza que deseja excluir <strong>{clientToDelete.name}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button onClick={() => { setShowDeleteModal(false); setClientToDelete(null); }} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">
                  Cancelar
                </button>
                <button onClick={handleDeleteConfirm} className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700">
                  Excluir
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedClient && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setSelectedClient(null)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl overflow-hidden flex flex-col"
            >
              {/* Mobile close header */}
              <div className="sm:hidden flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-medium text-gray-900">Detalhes do Cliente</span>
                <button onClick={() => setSelectedClient(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Header */}
              <div className="p-6 bg-gradient-to-br from-brand-600 to-violet-600">
                <button onClick={() => setSelectedClient(null)} className="hidden sm:flex absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white text-xl font-bold">
                    {selectedClient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-white truncate">{selectedClient.name}</h2>
                    <p className="text-white/80 truncate">{selectedClient.company}</p>
                    <span className={`inline-flex mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                      selectedClient.status === 'active' ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100'
                    }`}>
                      {selectedClient.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 p-4 border-b border-gray-100">
                <button onClick={() => showToast('info', `Ligando para ${selectedClient.phone}`)} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">
                  <Phone className="w-4 h-4" /> Ligar
                </button>
                <button onClick={() => showToast('info', `Email enviado para ${selectedClient.email}`)} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200">
                  <Mail className="w-4 h-4" /> Email
                </button>
                <button onClick={() => showToast('info', `WhatsApp: ${selectedClient.phone}`)} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm bg-brand-600 text-white rounded-xl hover:bg-brand-700">
                  <MessageSquare className="w-4 h-4" /> WhatsApp
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100">
                {(['details', 'history', 'notes'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setDetailTab(tab)}
                    className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                      detailTab === tab ? 'text-brand-600' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab === 'details' ? 'Detalhes' : tab === 'history' ? 'Histórico' : 'Notas'}
                    {detailTab === tab && (
                      <motion.div layoutId="detailTabIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-600" />
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-4">
                {detailTab === 'details' && (
                  <div className="space-y-4">
                    {/* Contact info */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{selectedClient.email}</span>
                        </div>
                        <button onClick={() => copyToClipboard(selectedClient.email)} className="p-1.5 text-gray-400 hover:text-gray-600">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{selectedClient.phone}</span>
                        </div>
                        <button onClick={() => copyToClipboard(selectedClient.phone)} className="p-1.5 text-gray-400 hover:text-gray-600">
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      {selectedClient.company && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{selectedClient.company}</span>
                          {selectedClient.industry && (
                            <span className="ml-auto px-2 py-0.5 text-xs bg-brand-50 text-brand-700 rounded-full">
                              {industries.find(i => i.value === selectedClient.industry)?.label}
                            </span>
                          )}
                        </div>
                      )}
                      {(selectedClient.city || selectedClient.state) && (
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900">{[selectedClient.city, selectedClient.state].filter(Boolean).join(', ')}</span>
                        </div>
                      )}
                    </div>

                    {/* Value */}
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl">
                      <p className="text-sm text-emerald-600 mb-1">Valor Anual</p>
                      <p className="text-2xl font-bold text-emerald-700">{formatCurrency(selectedClient.annualSpend)}</p>
                    </div>

                    {/* Tags */}
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedClient.tags.map(tag => (
                          <span key={tag} className="px-2 py-1 text-sm bg-brand-50 text-brand-700 rounded-lg">{tag}</span>
                        ))}
                        {selectedClient.tags.length === 0 && <span className="text-sm text-gray-400">Nenhuma tag</span>}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Criado em</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(selectedClient.createdAt)}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Atualizado em</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(selectedClient.updatedAt)}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Leads</p>
                        <p className="text-lg font-bold text-gray-900">{selectedClient.leadsCount}</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Conversas</p>
                        <p className="text-lg font-bold text-gray-900">{selectedClient.conversationsCount}</p>
                      </div>
                    </div>
                  </div>
                )}

                {detailTab === 'history' && (
                  <div className="space-y-4">
                    {[
                      { action: 'Conversa iniciada via WhatsApp', time: '2 horas atrás', icon: MessageSquare, color: 'text-emerald-500' },
                      { action: 'Email enviado: Proposta Comercial', time: '1 dia atrás', icon: Mail, color: 'text-blue-500' },
                      { action: 'Lead convertido para cliente', time: '3 dias atrás', icon: Check, color: 'text-brand-500' },
                      { action: 'Reunião agendada', time: '1 semana atrás', icon: Calendar, color: 'text-violet-500' },
                      { action: 'Cliente criado', time: formatDate(selectedClient.createdAt), icon: UserCircle, color: 'text-gray-500' },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center ${item.color}`}>
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{item.action}</p>
                          <p className="text-xs text-gray-500">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {detailTab === 'notes' && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <textarea
                        value={noteInput}
                        onChange={e => setNoteInput(e.target.value)}
                        placeholder="Adicionar uma nota..."
                        className="w-full px-4 py-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 resize-none"
                        rows={3}
                      />
                      <button onClick={handleAddNote} disabled={!noteInput.trim()} className="w-full py-2 text-sm font-medium text-white bg-brand-600 rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        Adicionar Nota
                      </button>
                    </div>
                    <div className="space-y-3">
                      {selectedClient.notes.map(note => (
                        <div key={note.id} className="group p-3 bg-amber-50 rounded-xl border border-amber-100">
                          <p className="text-sm text-gray-900">{note.content}</p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-amber-600">{note.author} • {formatDate(note.createdAt)}</p>
                            <button onClick={() => handleDeleteNote(note.id)} className="opacity-0 group-hover:opacity-100 p-1 text-amber-400 hover:text-red-500">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {selectedClient.notes.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">Nenhuma nota ainda</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="p-4 border-t border-gray-100 flex gap-3">
                <button onClick={() => { setFormData(selectedClient); setEditingClient(selectedClient); }} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">
                  <Edit2 className="w-4 h-4" /> Editar
                </button>
                <button onClick={() => handleDuplicate(selectedClient)} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">
                  <Copy className="w-4 h-4" /> Duplicar
                </button>
                <button onClick={() => { setClientToDelete(selectedClient); setShowDeleteModal(true); }} className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile footer close */}
              <div className="sm:hidden p-4 pt-0">
                <button onClick={() => setSelectedClient(null)} className="w-full py-3 text-sm font-medium text-gray-600 bg-gray-100 rounded-xl">
                  Fechar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
                toast.type === 'success' ? 'bg-emerald-600 text-white' :
                toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'
              }`}
            >
              {toast.type === 'success' && <Check className="w-4 h-4" />}
              {toast.type === 'error' && <X className="w-4 h-4" />}
              <span className="text-sm font-medium">{toast.message}</span>
              <button onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} className="p-1 hover:bg-white/20 rounded">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Click outside to close quick actions */}
      {quickActionsClient && (
        <div className="fixed inset-0 z-10" onClick={() => setQuickActionsClient(null)} />
      )}
    </div>
  );
}
