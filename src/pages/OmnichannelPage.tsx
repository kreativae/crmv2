import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Paperclip, Smile, MoreVertical, Phone, Video, Search,
  MessageCircle, Instagram, Facebook, AtSign, Globe, Bot,
  User, Clock, Tag, Star, Zap, ArrowRight, Hash, X, Sparkles,
  PhoneOff, Mic, MicOff, Camera, CameraOff,
  Check, AlertCircle, Calendar, FileText, Image, File, Download,
  TrendingUp, Brain, Lightbulb, RefreshCw
} from 'lucide-react';
import type { Channel, CalendarEvent } from '../types';

const channelConfig: Record<Channel, { icon: React.ElementType; label: string; color: string; bg: string; gradient: string }> = {
  whatsapp: { icon: MessageCircle, label: 'WhatsApp', color: 'text-green-600', bg: 'bg-green-50', gradient: 'from-green-400 to-green-600' },
  instagram: { icon: Instagram, label: 'Instagram', color: 'text-pink-600', bg: 'bg-pink-50', gradient: 'from-pink-400 to-purple-600' },
  facebook: { icon: Facebook, label: 'Facebook', color: 'text-blue-600', bg: 'bg-blue-50', gradient: 'from-blue-400 to-blue-600' },
  telegram: { icon: Send, label: 'Telegram', color: 'text-sky-600', bg: 'bg-sky-50', gradient: 'from-sky-400 to-sky-600' },
  email: { icon: AtSign, label: 'Email', color: 'text-amber-600', bg: 'bg-amber-50', gradient: 'from-amber-400 to-amber-600' },
  webchat: { icon: Globe, label: 'Webchat', color: 'text-purple-600', bg: 'bg-purple-50', gradient: 'from-purple-400 to-purple-600' },
};

const quickReplies = [
  { text: 'Olá! Como posso ajudá-lo? 😊', category: 'Saudação' },
  { text: 'Obrigado pelo contato! Vou verificar isso para você.', category: 'Agradecimento' },
  { text: 'Um momento, por favor. Estou analisando sua solicitação.', category: 'Espera' },
  { text: 'Posso agendar uma demonstração do nosso produto para você?', category: 'Demo' },
  { text: 'Vou transferir você para o setor responsável.', category: 'Transferência' },
  { text: 'Seu problema foi resolvido! Posso ajudar em mais alguma coisa?', category: 'Fechamento' },
  { text: 'Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.', category: 'Info' },
  { text: 'Você pode acessar nossa FAQ em nexcrm.com/ajuda', category: 'Info' },
];

const emojis = ['😊', '👍', '❤️', '🎉', '👋', '🙏', '✅', '⭐', '🚀', '💡', '📞', '📧', '📅', '💼', '🤝', '😄', '🔥', '💪', '👏', '🎯', '✨', '💯', '🙌', '😎'];

const aiSuggestions = [
  { text: 'Com base no histórico, o cliente parece interessado em nosso plano Enterprise. Sugiro mencionar os benefícios exclusivos.', type: 'sales' },
  { text: 'O tom do cliente indica urgência. Recomendo priorizar a resolução e oferecer um canal direto de suporte.', type: 'support' },
  { text: 'Este cliente já comprou 3x conosco. Considere oferecer um programa de fidelidade ou desconto especial.', type: 'loyalty' },
];

// Mock agents for transfer
const agents = [
  { id: '1', name: 'Ana Silva', department: 'Vendas', status: 'online', conversations: 3 },
  { id: '2', name: 'Carlos Santos', department: 'Suporte', status: 'online', conversations: 5 },
  { id: '3', name: 'Mariana Costa', department: 'Financeiro', status: 'away', conversations: 2 },
  { id: '4', name: 'Pedro Oliveira', department: 'Vendas', status: 'online', conversations: 4 },
  { id: '5', name: 'Julia Ferreira', department: 'Suporte', status: 'offline', conversations: 0 },
];

export function OmnichannelPage() {
  const {
    conversations, selectedConversation, setSelectedConversation,
    sendMessage, channelFilter, setChannelFilter, statusFilter, setStatusFilter,
    addLead, addCalendarEvent
  } = useStore();
  
  // Basic states
  const [messageInput, setMessageInput] = useState('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showContactInfo, setShowContactInfo] = useState(true);
  const [searchConv, setSearchConv] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Call states
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callStatus, setCallStatus] = useState<'calling' | 'connected' | 'ended'>('calling');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  
  // More menu states
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // Attachment states
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Emoji states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  // AI states
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [currentAISuggestion, setCurrentAISuggestion] = useState<typeof aiSuggestions[0] | null>(null);
  
  // Quick action modals
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showConvertLeadModal, setShowConvertLeadModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  
  // Transfer state
  const [searchAgent, setSearchAgent] = useState('');
  
  // Tag state
  const [contactTags, setContactTags] = useState<string[]>(['Cliente', 'WhatsApp']);
  const [newTag, setNewTag] = useState('');
  const tagSuggestions = ['VIP', 'Urgente', 'Novo', 'Recorrente', 'Premium', 'Suporte', 'Comercial', 'Parceiro'];
  
  // Convert to Lead state
  const [leadForm, setLeadForm] = useState({ name: '', email: '', phone: '', company: '' });
  
  // Follow-up state
  const [followUpForm, setFollowUpForm] = useState({ title: '', date: '', time: '10:00', type: 'call', notes: '' });
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const filteredConversations = conversations.filter(c => {
    if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchConv && !c.contactName.toLowerCase().includes(searchConv.toLowerCase())) return false;
    return true;
  });

  const activeConversation = conversations.find(c => c._id === selectedConversation);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages.length]);

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showCallModal && callStatus === 'connected') {
      interval = setInterval(() => setCallDuration(d => d + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [showCallModal, callStatus]);

  // Reset forms when conversation changes
  useEffect(() => {
    if (activeConversation) {
      setLeadForm({
        name: activeConversation.contactName,
        email: '',
        phone: '',
        company: ''
      });
      setFollowUpForm({
        title: `Follow-up: ${activeConversation.contactName}`,
        date: new Date().toISOString().split('T')[0],
        time: '10:00',
        type: 'call',
        notes: ''
      });
    }
  }, [activeConversation]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSend = () => {
    if (!messageInput.trim() || !selectedConversation) return;
    sendMessage(selectedConversation, messageInput.trim());
    setMessageInput('');
    setShowQuickReplies(false);
    setShowEmojiPicker(false);
    setAttachedFile(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // CALL FUNCTIONS
  const startCall = (type: 'audio' | 'video') => {
    setCallType(type);
    setCallStatus('calling');
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
    setShowCallModal(true);
    
    // Simulate call connection after 2 seconds
    setTimeout(() => setCallStatus('connected'), 2000);
  };

  const endCall = () => {
    setCallStatus('ended');
    showToast(`Chamada ${callType === 'video' ? 'de vídeo' : ''} finalizada. Duração: ${formatDuration(callDuration)}`, 'info');
    setTimeout(() => {
      setShowCallModal(false);
      setCallDuration(0);
    }, 1000);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ATTACHMENT FUNCTIONS
  const handleFileSelect = (type: 'image' | 'document' | 'any') => {
    const accept = type === 'image' ? 'image/*' : type === 'document' ? '.pdf,.doc,.docx,.xls,.xlsx' : '*/*';
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.click();
    }
    setShowAttachmentMenu(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      showToast(`Arquivo "${file.name}" anexado`, 'info');
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // EMOJI FUNCTION
  const insertEmoji = (emoji: string) => {
    setMessageInput(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // AI SUGGESTIONS FUNCTION
  const getAISuggestion = () => {
    setAiLoading(true);
    setShowAISuggestions(true);
    
    // Simulate AI processing
    setTimeout(() => {
      const randomSuggestion = aiSuggestions[Math.floor(Math.random() * aiSuggestions.length)];
      setCurrentAISuggestion(randomSuggestion);
      setAiLoading(false);
    }, 1500);
  };

  const applyAISuggestion = () => {
    if (currentAISuggestion) {
      // Generate a response based on the suggestion type
      let response = '';
      switch (currentAISuggestion.type) {
        case 'sales':
          response = 'Olá! Vi que você demonstrou interesse em nosso plano Enterprise. Gostaria de destacar alguns benefícios exclusivos: suporte prioritário 24/7, integrações ilimitadas e um gerente de conta dedicado. Posso agendar uma demonstração personalizada?';
          break;
        case 'support':
          response = 'Entendo a urgência da sua situação. Vou priorizar seu caso agora mesmo. Enquanto analiso, posso oferecer um canal direto de suporte para acompanhamento. Qual seria o melhor horário para um contato?';
          break;
        case 'loyalty':
          response = 'Muito obrigado por ser um cliente fiel! Como forma de agradecimento, gostaria de oferecer nosso programa de fidelidade com 20% de desconto em renovações e acesso antecipado a novos recursos. Posso incluí-lo no programa?';
          break;
      }
      setMessageInput(response);
      setShowAISuggestions(false);
      setCurrentAISuggestion(null);
      showToast('Sugestão da IA aplicada!', 'success');
    }
  };

  // TRANSFER FUNCTION
  const handleTransfer = (agent: typeof agents[0]) => {
    if (agent.status === 'offline') {
      showToast('Este agente está offline', 'error');
      return;
    }
    showToast(`Conversa transferida para ${agent.name}`, 'success');
    setShowTransferModal(false);
    setSearchAgent('');
  };

  // TAG FUNCTIONS
  const addTag = (tag: string) => {
    if (tag && !contactTags.includes(tag)) {
      setContactTags([...contactTags, tag]);
      showToast(`Tag "${tag}" adicionada`, 'success');
    }
    setNewTag('');
  };

  const removeTag = (tag: string) => {
    setContactTags(contactTags.filter(t => t !== tag));
    showToast(`Tag "${tag}" removida`, 'info');
  };

  // CONVERT TO LEAD FUNCTION
  const handleConvertToLead = () => {
    if (!leadForm.name || !leadForm.email) {
      showToast('Nome e email são obrigatórios', 'error');
      return;
    }
    
    const newLead = {
      _id: `lead_${Date.now()}`,
      organizationId: 'org_1',
      name: leadForm.name,
      email: leadForm.email,
      phone: leadForm.phone,
      company: leadForm.company,
      source: 'omnichannel',
      tags: [activeConversation?.channel || 'webchat', 'Convertido'],
      pipelineId: 'pipeline_1',
      stageId: 'stage_1',
      assignedTo: 'user_1',
      status: 'new' as const,
      score: 50,
      value: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    addLead(newLead);
    showToast('Lead criado com sucesso! Disponível no CRM', 'success');
    setShowConvertLeadModal(false);
  };

  // FOLLOW-UP FUNCTION
  const handleCreateFollowUp = () => {
    if (!followUpForm.title || !followUpForm.date) {
      showToast('Título e data são obrigatórios', 'error');
      return;
    }
    
    const categoryMap: Record<string, CalendarEvent['category']> = {
      call: 'call',
      meeting: 'meeting',
      email: 'task',
      task: 'task'
    };
    
    const endHour = (parseInt(followUpForm.time.split(':')[0]) + 1).toString().padStart(2, '0');
    const newEvent: CalendarEvent = {
      _id: `event_${Date.now()}`,
      title: followUpForm.title,
      description: followUpForm.notes,
      category: categoryMap[followUpForm.type] || 'task',
      date: followUpForm.date,
      startTime: followUpForm.time,
      endTime: `${endHour}:${followUpForm.time.split(':')[1]}`,
      allDay: false,
      color: followUpForm.type === 'call' ? '#10b981' : followUpForm.type === 'meeting' ? '#6366f1' : '#f59e0b'
    };
    
    addCalendarEvent(newEvent);
    showToast('Follow-up agendado com sucesso!', 'success');
    setShowFollowUpModal(false);
  };

  // MORE MENU ACTIONS
  const handleMoreAction = (action: string) => {
    setShowMoreMenu(false);
    switch (action) {
      case 'export':
        if (activeConversation) {
          const content = activeConversation.messages.map(m => `[${m.timestamp}] ${m.sender === 'agent' ? 'Você' : activeConversation.contactName}: ${m.content}`).join('\n');
          const blob = new Blob([content], { type: 'text/plain' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `conversa_${activeConversation.contactName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
          a.click();
          showToast('Conversa exportada!', 'success');
        }
        break;
      case 'close':
        showToast('Conversa marcada como resolvida', 'success');
        break;
      case 'block':
        showToast('Contato bloqueado', 'info');
        break;
      case 'info':
        setShowContactInfo(true);
        break;
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  const filteredAgents = agents.filter(a => 
    a.name.toLowerCase().includes(searchAgent.toLowerCase()) ||
    a.department.toLowerCase().includes(searchAgent.toLowerCase())
  );

  return (
    <div className="flex h-full">
      {/* Hidden file input */}
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
      
      {/* Channel Sidebar */}
      <div className="hidden sm:flex w-[68px] shrink-0 flex-col items-center gap-1.5 border-r border-gray-200/60 bg-gray-50/50 py-4">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setChannelFilter('all')}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
            channelFilter === 'all' ? 'gradient-brand text-white shadow-lg shadow-brand-600/25' : 'text-gray-400 hover:bg-gray-200/60'
          )}
          title="Todos"
        >
          <Hash className="h-5 w-5" />
        </motion.button>
        <div className="my-1.5 w-6 border-t border-gray-200/60" />
        {(Object.keys(channelConfig) as Channel[]).map(ch => {
          const config = channelConfig[ch];
          const Icon = config.icon;
          const count = conversations.filter(c => c.channel === ch && c.unreadCount > 0).length;
          return (
            <motion.button
              key={ch}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => setChannelFilter(ch)}
              className={cn(
                'relative flex h-10 w-10 items-center justify-center rounded-xl transition-all',
                channelFilter === ch ? `bg-gradient-to-br ${config.gradient} text-white shadow-lg` : 'text-gray-400 hover:bg-gray-200/60'
              )}
              title={config.label}
            >
              <Icon className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[7px] font-bold text-white badge-glow">{count}</span>
              )}
            </motion.button>
          );
        })}
        <div className="my-1.5 w-6 border-t border-gray-200/60" />
        <motion.button 
          whileHover={{ scale: 1.08 }} 
          onClick={getAISuggestion}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-400 hover:bg-gray-200/60 hover:text-brand-600" 
          title="Sugestões IA"
        >
          <Bot className="h-5 w-5" />
        </motion.button>
      </div>

      {/* Conversation List */}
      <div className={cn(
        "flex w-full sm:w-[320px] shrink-0 flex-col border-r border-gray-200/60 bg-white",
        selectedConversation && "hidden sm:flex"
      )}>
        <div className="border-b border-gray-200/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-900">Conversas</h2>
            <span className="flex items-center gap-1 rounded-full bg-red-50 border border-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-600">
              {totalUnread} novas
            </span>
          </div>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchConv}
              onChange={(e) => setSearchConv(e.target.value)}
              className="input-modern w-full rounded-xl bg-gray-50/80 py-2.5 pl-10 pr-3 text-sm"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {(['all', 'open', 'pending', 'closed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'relative rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all whitespace-nowrap',
                  statusFilter === s ? 'text-white' : 'text-gray-500 hover:bg-gray-100'
                )}
              >
                {statusFilter === s && (
                  <motion.div layoutId="statusFilter" className="absolute inset-0 rounded-full gradient-brand" transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10">{s === 'all' ? 'Todas' : s === 'open' ? 'Abertas' : s === 'pending' ? 'Pendentes' : 'Fechadas'}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {filteredConversations.map(conv => {
            const config = channelConfig[conv.channel];
            const Icon = config.icon;
            const isActive = selectedConversation === conv._id;
            return (
              <motion.button
                key={conv._id}
                whileTap={{ scale: 0.99 }}
                onClick={() => setSelectedConversation(conv._id)}
                className={cn(
                  'flex w-full items-start gap-3 border-b border-gray-100/60 p-4 text-left transition-all relative',
                  isActive ? 'bg-brand-50/60' : 'hover:bg-gray-50/80'
                )}
              >
                {isActive && <motion.div layoutId="activeConv" className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full bg-brand-600" />}
                <div className="relative shrink-0">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-xs font-bold text-gray-600">
                    {conv.contactName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className={cn('absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white', config.bg)}>
                    <Icon className={cn('h-2.5 w-2.5', config.color)} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className={cn('truncate text-[13px]', conv.unreadCount > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-700')}>
                      {conv.contactName}
                    </p>
                    <span className="shrink-0 text-[10px] text-gray-400 font-medium">{conv.lastMessageTime}</span>
                  </div>
                  <p className={cn('mt-0.5 truncate text-[12px]', conv.unreadCount > 0 ? 'font-medium text-gray-600' : 'text-gray-400')}>
                    {conv.lastMessage}
                  </p>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 font-medium">{conv.assignedName}</span>
                    {conv.unreadCount > 0 && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex h-5 min-w-5 items-center justify-center rounded-full gradient-brand px-1.5 text-[10px] font-bold text-white shadow-sm shadow-brand-500/25">
                        {conv.unreadCount}
                      </motion.span>
                    )}
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      {activeConversation ? (
        <div className="flex flex-1 flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between border-b border-gray-200/60 bg-white/90 backdrop-blur-xl px-3 sm:px-5 py-3">
            <div className="flex items-center gap-3">
              {/* Back button for mobile */}
              <button 
                onClick={() => setSelectedConversation(null)}
                className="sm:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700"
              >
                <ArrowRight className="h-5 w-5 rotate-180" />
              </button>
              <div className="relative">
                <div className="flex h-10 sm:h-11 w-10 sm:w-11 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-sm font-bold text-gray-600">
                  {activeConversation.contactName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-400 status-online" />
              </div>
              <div>
                <h3 className="text-[13px] font-bold text-gray-900">{activeConversation.contactName}</h3>
                <div className="flex items-center gap-2">
                  <span className={cn('flex items-center gap-1 text-[11px] font-semibold', channelConfig[activeConversation.channel].color)}>
                    {(() => { const Ic = channelConfig[activeConversation.channel].icon; return <Ic className="h-3 w-3" />; })()}
                    <span className="hidden sm:inline">{channelConfig[activeConversation.channel].label}</span>
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">• Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-0.5 sm:gap-1">
              {/* Phone Call Button */}
              <motion.button 
                whileHover={{ scale: 1.08 }} 
                whileTap={{ scale: 0.92 }} 
                onClick={() => startCall('audio')}
                className="rounded-xl p-2 text-gray-400 hover:bg-green-50 hover:text-green-600"
                title="Ligação de voz"
              >
                <Phone className="h-4 w-4" />
              </motion.button>
              
              {/* Video Call Button */}
              <motion.button 
                whileHover={{ scale: 1.08 }} 
                whileTap={{ scale: 0.92 }} 
                onClick={() => startCall('video')}
                className="rounded-xl p-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
                title="Videochamada"
              >
                <Video className="h-4 w-4" />
              </motion.button>
              
              {/* Contact Info Button */}
              <motion.button 
                whileHover={{ scale: 1.08 }} 
                whileTap={{ scale: 0.92 }} 
                onClick={() => setShowContactInfo(!showContactInfo)}
                className={cn('rounded-xl p-2 transition-colors hidden sm:block', showContactInfo ? 'bg-brand-100 text-brand-600' : 'text-gray-400 hover:bg-gray-100')}
              >
                <User className="h-4 w-4" />
              </motion.button>
              
              {/* More Menu Button */}
              <div className="relative">
                <motion.button 
                  whileHover={{ scale: 1.08 }} 
                  whileTap={{ scale: 0.92 }} 
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <MoreVertical className="h-4 w-4" />
                </motion.button>
                
                {/* More Menu Dropdown */}
                <AnimatePresence>
                  {showMoreMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -10 }}
                        className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-xl z-50"
                      >
                        <button onClick={() => handleMoreAction('info')} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <User className="h-4 w-4" /> Ver informações
                        </button>
                        <button onClick={() => handleMoreAction('export')} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Download className="h-4 w-4" /> Exportar conversa
                        </button>
                        <button onClick={() => handleMoreAction('close')} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                          <Check className="h-4 w-4" /> Marcar como resolvida
                        </button>
                        <div className="my-1 border-t border-gray-100" />
                        <button onClick={() => handleMoreAction('block')} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                          <AlertCircle className="h-4 w-4" /> Bloquear contato
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-1 flex-col">
              {/* Messages */}
              <div className="flex-1 overflow-auto px-4 sm:px-6 py-5 space-y-3 bg-gradient-to-b from-gray-50/50 to-white">
                <div className="flex justify-center mb-4">
                  <span className="rounded-full bg-gray-100 border border-gray-200/60 px-4 py-1 text-[10px] text-gray-500 font-semibold">Hoje</span>
                </div>
                {activeConversation.messages.map((msg, i) => (
                  <motion.div
                    key={msg._id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: i * 0.03, duration: 0.2 }}
                    className={cn('flex', msg.sender === 'agent' ? 'justify-end' : 'justify-start')}
                  >
                    <div className={cn(
                      'max-w-[85%] sm:max-w-[65%] px-4 py-3 shadow-sm',
                      msg.sender === 'agent' ? 'chat-bubble-agent text-white' : 'chat-bubble-client text-gray-800'
                    )}>
                      <p className="text-[13px] leading-relaxed">{msg.content}</p>
                      <p className={cn('mt-1.5 text-right text-[10px] font-medium', msg.sender === 'agent' ? 'text-white/50' : 'text-gray-400')}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* AI Suggestions Panel */}
              <AnimatePresence>
                {showAISuggestions && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-200/60 bg-gradient-to-r from-violet-50 to-purple-50 overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-violet-600" />
                          <p className="text-[11px] font-bold uppercase tracking-widest text-violet-600">Sugestão da IA</p>
                        </div>
                        <button onClick={() => setShowAISuggestions(false)} className="text-gray-400 hover:text-gray-600">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {aiLoading ? (
                        <div className="flex items-center gap-3 py-4">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-violet-600 border-t-transparent" />
                          <span className="text-sm text-violet-600">Analisando conversa...</span>
                        </div>
                      ) : currentAISuggestion ? (
                        <div className="space-y-3">
                          <div className="rounded-xl bg-white/80 border border-violet-200 p-3">
                            <div className="flex items-start gap-2">
                              <Brain className="h-4 w-4 text-violet-600 mt-0.5 shrink-0" />
                              <p className="text-sm text-gray-700">{currentAISuggestion.text}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={applyAISuggestion}
                              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
                            >
                              <Check className="h-4 w-4" /> Usar sugestão
                            </button>
                            <button 
                              onClick={getAISuggestion}
                              className="flex items-center justify-center gap-2 rounded-xl border border-violet-300 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-100"
                            >
                              <RefreshCw className="h-4 w-4" /> Nova
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Replies */}
              <AnimatePresence>
                {showQuickReplies && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-gray-200/60 bg-white overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Respostas rápidas</p>
                        <button onClick={() => setShowQuickReplies(false)} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {quickReplies.map((reply, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.05 }}
                            onClick={() => { setMessageInput(reply.text); setShowQuickReplies(false); }}
                            className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition-all font-medium"
                          >
                            <span className="text-[9px] text-gray-400 mr-1">{reply.category}:</span>
                            {reply.text.slice(0, 30)}...
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Emoji Picker */}
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-200/60 bg-white overflow-hidden"
                  >
                    <div className="px-4 sm:px-5 py-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Emojis</p>
                        <button onClick={() => setShowEmojiPicker(false)} className="text-gray-400 hover:text-gray-600"><X className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="grid grid-cols-8 sm:grid-cols-12 gap-1">
                        {emojis.map((emoji, i) => (
                          <motion.button
                            key={i}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.02 }}
                            onClick={() => insertEmoji(emoji)}
                            className="h-9 w-9 flex items-center justify-center rounded-lg text-xl hover:bg-gray-100 transition-colors"
                          >
                            {emoji}
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Attached File Preview */}
              {attachedFile && (
                <div className="border-t border-gray-200/60 bg-gray-50 px-4 py-2">
                  <div className="flex items-center gap-2 rounded-lg bg-white border border-gray-200 p-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100">
                      {attachedFile.type.startsWith('image/') ? <Image className="h-5 w-5 text-brand-600" /> : <FileText className="h-5 w-5 text-brand-600" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{attachedFile.name}</p>
                      <p className="text-xs text-gray-500">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button onClick={removeAttachment} className="p-1 text-gray-400 hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="border-t border-gray-200/60 bg-white p-3 sm:p-4">
                <div className="flex items-end gap-2">
                  <div className="flex gap-0.5">
                    {/* Attachment Button */}
                    <div className="relative">
                      <motion.button 
                        whileHover={{ scale: 1.1 }} 
                        onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                        className={cn('rounded-xl p-2 sm:p-2.5 transition-colors', showAttachmentMenu ? 'bg-brand-100 text-brand-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600')}
                      >
                        <Paperclip className="h-5 w-5" />
                      </motion.button>
                      
                      <AnimatePresence>
                        {showAttachmentMenu && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowAttachmentMenu(false)} />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="absolute bottom-full left-0 mb-2 w-48 rounded-xl border border-gray-200 bg-white py-1 shadow-xl z-50"
                            >
                              <button onClick={() => handleFileSelect('image')} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <Image className="h-4 w-4 text-green-600" /> Imagem
                              </button>
                              <button onClick={() => handleFileSelect('document')} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <FileText className="h-4 w-4 text-blue-600" /> Documento
                              </button>
                              <button onClick={() => handleFileSelect('any')} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                <File className="h-4 w-4 text-gray-600" /> Outro arquivo
                              </button>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {/* Emoji Button */}
                    <motion.button 
                      whileHover={{ scale: 1.1 }} 
                      onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowQuickReplies(false); }}
                      className={cn('rounded-xl p-2 sm:p-2.5 transition-colors', showEmojiPicker ? 'bg-amber-100 text-amber-600' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600')}
                    >
                      <Smile className="h-5 w-5" />
                    </motion.button>
                    
                    {/* Quick Replies Button */}
                    <motion.button 
                      whileHover={{ scale: 1.1 }} 
                      onClick={() => { setShowQuickReplies(!showQuickReplies); setShowEmojiPicker(false); }}
                      className={cn('rounded-xl p-2 sm:p-2.5 transition-colors', showQuickReplies ? 'bg-brand-100 text-brand-600' : 'text-gray-400 hover:bg-gray-100')}
                    >
                      <Zap className="h-5 w-5" />
                    </motion.button>
                    
                    {/* AI Suggestion Button */}
                    <motion.button 
                      whileHover={{ scale: 1.1 }} 
                      onClick={getAISuggestion}
                      className={cn('rounded-xl p-2 sm:p-2.5 transition-colors', showAISuggestions ? 'bg-violet-100 text-violet-600' : 'text-gray-400 hover:bg-gray-100 hover:text-violet-600')}
                      title="Sugestão IA"
                    >
                      <Sparkles className="h-5 w-5" />
                    </motion.button>
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite sua mensagem..."
                      rows={1}
                      className="input-modern w-full resize-none rounded-xl bg-gray-50/80 px-4 py-2.5 sm:py-3 text-sm text-gray-700 placeholder-gray-400"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSend}
                    disabled={!messageInput.trim() && !attachedFile}
                    className="btn-primary flex h-10 sm:h-11 w-10 sm:w-11 items-center justify-center rounded-xl text-white disabled:opacity-40"
                  >
                    <Send className="h-4 w-4" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Contact Info Panel */}
            <AnimatePresence>
              {showContactInfo && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 280, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="hidden lg:block shrink-0 overflow-hidden border-l border-gray-200/60 bg-white"
                >
                  <div className="w-[280px] overflow-auto h-full p-4 space-y-5">
                    <div className="text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-500 text-xl font-bold text-white shadow-lg shadow-brand-500/25">
                        {activeConversation.contactName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <h4 className="mt-3 text-sm font-bold text-gray-900">{activeConversation.contactName}</h4>
                      <span className={cn('mt-1.5 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-semibold', channelConfig[activeConversation.channel].bg, channelConfig[activeConversation.channel].color)}>
                        {channelConfig[activeConversation.channel].label}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {[
                        { label: 'Status', value: activeConversation.status === 'open' ? 'Aberto' : activeConversation.status === 'pending' ? 'Pendente' : 'Fechado', dot: activeConversation.status === 'open' ? 'bg-green-500' : activeConversation.status === 'pending' ? 'bg-amber-500' : 'bg-gray-400' },
                        { label: 'Atendente', value: activeConversation.assignedName },
                        { label: 'Mensagens', value: `${activeConversation.messages.length} mensagens` },
                      ].map(item => (
                        <div key={item.label} className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                          <p className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">{item.label}</p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-gray-700">
                            {'dot' in item && <span className={cn('h-2 w-2 rounded-full', item.dot)} />}
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Tags */}
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-1">
                        {contactTags.map(tag => (
                          <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">Ações rápidas</p>
                      {[
                        { icon: ArrowRight, label: 'Transferir atendimento', action: () => setShowTransferModal(true), color: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700' },
                        { icon: Tag, label: 'Adicionar tag', action: () => setShowTagModal(true), color: 'hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700' },
                        { icon: Star, label: 'Converter em lead', action: () => setShowConvertLeadModal(true), color: 'hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700' },
                        { icon: Clock, label: 'Agendar follow-up', action: () => setShowFollowUpModal(true), color: 'hover:bg-green-50 hover:border-green-200 hover:text-green-700' },
                      ].map(action => {
                        const Icon = action.icon;
                        return (
                          <motion.button 
                            key={action.label} 
                            whileHover={{ x: 2 }} 
                            onClick={action.action}
                            className={cn('flex w-full items-center gap-2.5 rounded-xl border border-gray-200/60 px-3 py-2.5 text-xs text-gray-600 transition-all font-medium', action.color)}
                          >
                            <Icon className="h-3.5 w-3.5" /> {action.label}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="hidden sm:flex flex-1 items-center justify-center bg-gradient-to-br from-gray-50 to-white">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-100 to-violet-100 shadow-xl shadow-brand-100/50">
              <MessageCircle className="h-12 w-12 text-brand-600" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-gray-900">Selecione uma conversa</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-xs">Escolha uma conversa à esquerda para começar a interagir com seus clientes</p>
          </motion.div>
        </div>
      )}

      {/* MODALS */}

      {/* Call Modal */}
      <AnimatePresence>
        {showCallModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-center"
            >
              {/* Contact Avatar */}
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-3xl font-bold text-white shadow-2xl">
                {activeConversation?.contactName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              
              <h3 className="mt-4 text-xl font-bold text-white">{activeConversation?.contactName}</h3>
              
              <p className={cn('mt-2 text-sm font-medium', 
                callStatus === 'calling' ? 'text-amber-400' : 
                callStatus === 'connected' ? 'text-green-400' : 'text-red-400'
              )}>
                {callStatus === 'calling' && 'Chamando...'}
                {callStatus === 'connected' && formatDuration(callDuration)}
                {callStatus === 'ended' && 'Chamada encerrada'}
              </p>
              
              {callType === 'video' && callStatus === 'connected' && (
                <div className="mt-4 h-40 rounded-2xl bg-gray-700/50 flex items-center justify-center">
                  {isCameraOff ? (
                    <CameraOff className="h-12 w-12 text-gray-500" />
                  ) : (
                    <div className="text-sm text-gray-400">Câmera ativa</div>
                  )}
                </div>
              )}
              
              <div className="mt-6 flex items-center justify-center gap-4">
                {callStatus === 'connected' && (
                  <>
                    <button 
                      onClick={() => setIsMuted(!isMuted)}
                      className={cn('flex h-14 w-14 items-center justify-center rounded-full transition-colors', 
                        isMuted ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                      )}
                    >
                      {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                    </button>
                    
                    {callType === 'video' && (
                      <button 
                        onClick={() => setIsCameraOff(!isCameraOff)}
                        className={cn('flex h-14 w-14 items-center justify-center rounded-full transition-colors', 
                          isCameraOff ? 'bg-red-500 text-white' : 'bg-gray-700 text-white hover:bg-gray-600'
                        )}
                      >
                        {isCameraOff ? <CameraOff className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
                      </button>
                    )}
                  </>
                )}
                
                <button 
                  onClick={endCall}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors"
                >
                  <PhoneOff className="h-6 w-6" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowTransferModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            >
              <div className="border-b border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Transferir Atendimento</h3>
                  <button onClick={() => setShowTransferModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-3 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar agente..."
                    value={searchAgent}
                    onChange={e => setSearchAgent(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm"
                  />
                </div>
              </div>
              <div className="max-h-[300px] overflow-auto p-2">
                {filteredAgents.map(agent => (
                  <button
                    key={agent.id}
                    onClick={() => handleTransfer(agent)}
                    disabled={agent.status === 'offline'}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl p-3 transition-colors',
                      agent.status === 'offline' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="relative">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 text-sm font-bold text-gray-600">
                        {agent.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white',
                        agent.status === 'online' ? 'bg-green-400' : agent.status === 'away' ? 'bg-amber-400' : 'bg-gray-400'
                      )} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-semibold text-gray-900">{agent.name}</p>
                      <p className="text-xs text-gray-500">{agent.department} • {agent.conversations} conversas</p>
                    </div>
                    <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full',
                      agent.status === 'online' ? 'bg-green-100 text-green-700' :
                      agent.status === 'away' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {agent.status === 'online' ? 'Online' : agent.status === 'away' ? 'Ausente' : 'Offline'}
                    </span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tag Modal */}
      <AnimatePresence>
        {showTagModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowTagModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            >
              <div className="border-b border-gray-100 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Gerenciar Tags</h3>
                  <button onClick={() => setShowTagModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adicionar nova tag</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digite a tag..."
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addTag(newTag)}
                      className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                    />
                    <button onClick={() => addTag(newTag)} className="btn-primary px-4 py-2.5 rounded-xl text-sm font-semibold">
                      Adicionar
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags atuais</label>
                  <div className="flex flex-wrap gap-2">
                    {contactTags.map(tag => (
                      <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-sm font-medium text-brand-700">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="h-3.5 w-3.5" /></button>
                      </span>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Sugestões</label>
                  <div className="flex flex-wrap gap-2">
                    {tagSuggestions.filter(t => !contactTags.includes(t)).map(tag => (
                      <button
                        key={tag}
                        onClick={() => addTag(tag)}
                        className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-colors"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Convert to Lead Modal */}
      <AnimatePresence>
        {showConvertLeadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowConvertLeadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            >
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Converter em Lead</h3>
                  </div>
                  <button onClick={() => setShowConvertLeadModal(false)} className="p-1 text-white/80 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={leadForm.name}
                    onChange={e => setLeadForm({ ...leadForm, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={e => setLeadForm({ ...leadForm, email: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={leadForm.phone}
                    onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                  <input
                    type="text"
                    value={leadForm.company}
                    onChange={e => setLeadForm({ ...leadForm, company: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  />
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs text-amber-800">
                    <strong>Origem:</strong> Omnichannel ({channelConfig[activeConversation?.channel || 'webchat'].label})
                  </p>
                </div>
              </div>
              <div className="border-t border-gray-100 p-4 flex gap-3">
                <button onClick={() => setShowConvertLeadModal(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleConvertToLead} className="flex-1 btn-primary rounded-xl py-2.5 text-sm font-semibold">
                  Criar Lead
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Follow-up Modal */}
      <AnimatePresence>
        {showFollowUpModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setShowFollowUpModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            >
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                      <Calendar className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-white">Agendar Follow-up</h3>
                  </div>
                  <button onClick={() => setShowFollowUpModal(false)} className="p-1 text-white/80 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
                  <input
                    type="text"
                    value={followUpForm.title}
                    onChange={e => setFollowUpForm({ ...followUpForm, title: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: 'call', label: '📞 Ligação' },
                      { value: 'meeting', label: '🎥 Reunião' },
                      { value: 'email', label: '✉️ Email' },
                      { value: 'task', label: '✅ Tarefa' },
                    ].map(type => (
                      <button
                        key={type.value}
                        onClick={() => setFollowUpForm({ ...followUpForm, type: type.value })}
                        className={cn(
                          'rounded-xl border px-3 py-2 text-xs font-medium transition-colors',
                          followUpForm.type === type.value
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:bg-gray-50'
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
                    <input
                      type="date"
                      value={followUpForm.date}
                      onChange={e => setFollowUpForm({ ...followUpForm, date: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
                    <input
                      type="time"
                      value={followUpForm.time}
                      onChange={e => setFollowUpForm({ ...followUpForm, time: e.target.value })}
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                  <textarea
                    value={followUpForm.notes}
                    onChange={e => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm resize-none"
                    placeholder="Anotações sobre o follow-up..."
                  />
                </div>
              </div>
              <div className="border-t border-gray-100 p-4 flex gap-3">
                <button onClick={() => setShowFollowUpModal(false)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={handleCreateFollowUp} className="flex-1 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 py-2.5 text-sm font-semibold text-white hover:from-green-600 hover:to-emerald-600">
                  Agendar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className={cn(
              'fixed bottom-4 right-4 z-[200] flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg',
              toast.type === 'success' ? 'bg-green-600 text-white' :
              toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-gray-800 text-white'
            )}
          >
            {toast.type === 'success' && <Check className="h-5 w-5" />}
            {toast.type === 'error' && <AlertCircle className="h-5 w-5" />}
            {toast.type === 'info' && <Lightbulb className="h-5 w-5" />}
            <span className="text-sm font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
