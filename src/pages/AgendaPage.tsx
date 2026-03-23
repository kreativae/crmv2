import { logger } from '../utils/logger';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, MapPin, User, Tag,
  X, Trash2, Edit3, Copy, Check, Bell, Video, Phone, Target, CheckCircle2,
  Calendar as CalendarIcon, List, LayoutGrid, Search, Filter, Download,
  GripVertical, AlertCircle, Repeat, FileText
} from 'lucide-react';
import { useStore } from '../store';
import { calendarService } from '../api/services/calendarService';
import type { CalendarEvent, EventCategory } from '../types';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7:00 - 21:00

const categoryConfig: Record<EventCategory, { label: string; icon: React.ElementType; color: string; bg: string; textDark: string }> = {
  meeting: { label: 'Reunião', icon: Video, color: 'text-indigo-500', bg: 'bg-indigo-50', textDark: 'text-indigo-700' },
  call: { label: 'Ligação', icon: Phone, color: 'text-emerald-500', bg: 'bg-emerald-50', textDark: 'text-emerald-700' },
  task: { label: 'Tarefa', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50', textDark: 'text-blue-700' },
  deadline: { label: 'Prazo', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', textDark: 'text-red-700' },
  personal: { label: 'Pessoal', icon: CalendarIcon, color: 'text-amber-500', bg: 'bg-amber-50', textDark: 'text-amber-700' },
  follow_up: { label: 'Follow-up', icon: Target, color: 'text-pink-500', bg: 'bg-pink-50', textDark: 'text-pink-700' },
};

const colorOptions = [
  '#6366f1', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#64748b'
];

type ViewMode = 'month' | 'week' | 'day';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}
function formatDate(d: Date) {
  return d.toISOString().split('T')[0];
}
function isSameDay(d1: string, d2: string) {
  return d1 === d2;
}
function parseTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function formatTimeDisplay(t: string) {
  return t;
}

const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DAYS_FULL = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export function AgendaPage() {
  const { calendarEvents, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, clients, leads, settingsUsers } = useStore();

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(today);
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<EventCategory | 'all'>('all');
  const [dragOverSlot, setDragOverSlot] = useState<{ date: string; hour: number } | null>(null);
  
  // Refs para drag - mais confiável que state durante drag
  const dragEventIdRef = useRef<string | null>(null);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const emptyForm: Omit<CalendarEvent, '_id'> = {
    title: '', description: '', category: 'meeting', date: formatDate(today),
    startTime: '09:00', endTime: '10:00', color: '#6366f1', allDay: false,
    location: '', reminder: 15, recurrence: 'none', assignedName: '', leadName: '',
  };
  const [eventForm, setEventForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load events from backend on mount
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const response = await calendarService.getAll();
        const serverEvents = response.data || [];
        const currentEvents = useStore.getState().calendarEvents;
        currentEvents.forEach(e => deleteCalendarEvent(e._id));
        serverEvents.forEach(e => addCalendarEvent(e));
      } catch (err) {
        logger.error('Erro ao carregar eventos:', err);
      }
    };
    loadEvents();
  }, []);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `t_${Date.now()}`;
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  // Filter events
  const filteredEvents = useMemo(() => {
    return calendarEvents.filter(e => {
      if (categoryFilter !== 'all' && e.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!e.title.toLowerCase().includes(q) && !e.description?.toLowerCase().includes(q) && !e.leadName?.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [calendarEvents, categoryFilter, searchQuery]);

  // Navigation
  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrentDate(d);
  };
  const goToday = () => setCurrentDate(new Date());

  // Get week dates
  const getWeekDates = useCallback(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const start = new Date(d);
    start.setDate(d.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      return date;
    });
  }, [currentDate]);

  // Get events for a date
  const getEventsForDate = useCallback((dateStr: string) => {
    return filteredEvents.filter(e => isSameDay(e.date, dateStr)).sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
  }, [filteredEvents]);

  // Get events for a time slot
  const getEventsForSlot = useCallback((dateStr: string, hour: number) => {
    return filteredEvents.filter(e => {
      if (!isSameDay(e.date, dateStr)) return false;
      const start = parseTime(e.startTime);
      const end = parseTime(e.endTime);
      const slotStart = hour * 60;
      const slotEnd = (hour + 1) * 60;
      return start < slotEnd && end > slotStart;
    });
  }, [filteredEvents]);

  // Calculate event position to avoid overlapping
  const calculateEventLayout = useCallback((events: CalendarEvent[]) => {
    if (events.length === 0) return [];
    
    // Sort by start time, then by duration (longer first)
    const sorted = [...events].sort((a, b) => {
      const aStart = parseTime(a.startTime);
      const bStart = parseTime(b.startTime);
      if (aStart !== bStart) return aStart - bStart;
      const aDur = parseTime(a.endTime) - aStart;
      const bDur = parseTime(b.endTime) - bStart;
      return bDur - aDur;
    });

    const columns: { end: number; eventId: string }[][] = [];
    const eventPositions: Map<string, { column: number; totalColumns: number }> = new Map();

    sorted.forEach(event => {
      const start = parseTime(event.startTime);
      const end = parseTime(event.endTime);
      
      // Find first column where this event fits
      let columnIndex = 0;
      while (columnIndex < columns.length) {
        const column = columns[columnIndex];
        const lastEvent = column[column.length - 1];
        if (!lastEvent || lastEvent.end <= start) break;
        columnIndex++;
      }

      // Create new column if needed
      if (columnIndex >= columns.length) {
        columns.push([]);
      }

      columns[columnIndex].push({ end, eventId: event._id });
      eventPositions.set(event._id, { column: columnIndex, totalColumns: 0 });
    });

    // Calculate total columns for overlapping groups
    const totalColumns = columns.length;
    eventPositions.forEach((pos) => {
      pos.totalColumns = totalColumns;
    });

    return events.map(event => ({
      event,
      position: eventPositions.get(event._id) || { column: 0, totalColumns: 1 }
    }));
  }, []);



  // Form validation
  const validateForm = () => {
    const errors: string[] = [];
    if (!eventForm.title.trim()) errors.push('title');
    if (!eventForm.date) errors.push('date');
    if (!eventForm.startTime) errors.push('startTime');
    if (!eventForm.endTime) errors.push('endTime');
    if (parseTime(eventForm.startTime) >= parseTime(eventForm.endTime)) errors.push('endTime');
    setFormErrors(errors);
    return errors.length === 0;
  };

  // Create event
  const handleCreate = async () => {
    if (!validateForm()) return;
    try {
      const created = await calendarService.create(eventForm);
      addCalendarEvent(created);
      setShowCreateModal(false);
      setEventForm(emptyForm);
      addToast('Evento criado com sucesso!');
    } catch (err) {
      logger.error('Erro ao criar evento:', err);
      addToast('Erro ao criar evento.', 'error');
    }
  };

  // Update event
  const handleUpdate = async () => {
    if (!selectedEvent || !validateForm()) return;
    try {
      const updated = await calendarService.update(selectedEvent._id, eventForm);
      updateCalendarEvent(selectedEvent._id, updated);
      setShowEditModal(false);
      setSelectedEvent({ ...selectedEvent, ...updated });
      addToast('Evento atualizado!');
    } catch (err) {
      logger.error('Erro ao atualizar evento:', err);
      addToast('Erro ao atualizar evento.', 'error');
    }
  };

  // Delete event
  const handleDelete = async () => {
    if (!selectedEvent) return;
    try {
      await calendarService.delete(selectedEvent._id);
      deleteCalendarEvent(selectedEvent._id);
      setShowDeleteModal(false);
      setShowDetailPanel(false);
      setSelectedEvent(null);
      addToast('Evento excluído!', 'info');
    } catch (err) {
      logger.error('Erro ao excluir evento:', err);
      addToast('Erro ao excluir evento.', 'error');
    }
  };

  // Duplicate
  const handleDuplicate = async () => {
    if (!selectedEvent) return;
    try {
      const { _id, ...eventData } = selectedEvent;
      const created = await calendarService.create({ ...eventData, title: `${selectedEvent.title} (cópia)`, completed: false });
      addCalendarEvent(created);
      addToast('Evento duplicado!');
    } catch (err) {
      logger.error('Erro ao duplicar evento:', err);
      addToast('Erro ao duplicar evento.', 'error');
    }
  };

  // Toggle complete
  const toggleComplete = async (ev: CalendarEvent) => {
    try {
      await calendarService.update(ev._id, { completed: !ev.completed });
      updateCalendarEvent(ev._id, { completed: !ev.completed });
      addToast(ev.completed ? 'Evento reativado!' : 'Evento concluído!');
    } catch (err) {
      logger.error('Erro ao atualizar evento:', err);
      updateCalendarEvent(ev._id, { completed: !ev.completed });
      addToast(ev.completed ? 'Evento reativado!' : 'Evento concluído!');
    }
  };

  // Open create with pre-filled date/time
  const openCreateAt = (date: string, hour?: number) => {
    setEventForm({
      ...emptyForm,
      date,
      startTime: hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : '09:00',
      endTime: hour !== undefined ? `${String(hour + 1).padStart(2, '0')}:00` : '10:00',
    });
    setFormErrors([]);
    setShowCreateModal(true);
  };

  // Open edit
  const openEdit = (ev: CalendarEvent) => {
    setSelectedEvent(ev);
    setEventForm({
      title: ev.title, description: ev.description || '', category: ev.category,
      date: ev.date, startTime: ev.startTime, endTime: ev.endTime, color: ev.color,
      allDay: ev.allDay, location: ev.location || '', reminder: ev.reminder || 15,
      recurrence: ev.recurrence || 'none', assignedName: ev.assignedName || '', leadName: ev.leadName || '',
    });
    setFormErrors([]);
    setShowEditModal(true);
  };

  // ─── Drag and Drop - Implementação Simples e Fluida ───
  
  // Usa apenas dataTransfer - sem state durante drag (evita re-renders)
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, ev: CalendarEvent) => {
    // Configura imediatamente para evitar delay
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ev._id);
    e.dataTransfer.setData('application/json', JSON.stringify(ev));
    
    // Estilo visual
    const target = e.currentTarget;
    target.style.opacity = '0.5';
    target.style.transform = 'scale(0.95)';
    
    // Armazena ID no ref (backup)
    dragEventIdRef.current = ev._id;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    // Restaura estilo
    const target = e.currentTarget;
    target.style.opacity = '1';
    target.style.transform = 'scale(1)';
    
    // Limpa estados
    setDragOverSlot(null);
    dragEventIdRef.current = null;
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, date: string, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    setDragOverSlot(prev => {
      if (prev?.date === date && prev?.hour === hour) return prev;
      return { date, hour };
    });
  };

  const handleDragOverDate = (e: React.DragEvent<HTMLDivElement>, date: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    setDragOverSlot(prev => {
      if (prev?.date === date && prev?.hour === -1) return prev;
      return { date, hour: -1 };
    });
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || 
        e.clientY < rect.top || e.clientY > rect.bottom) {
      setDragOverSlot(null);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, date: string, hour?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSlot(null);
    
    // Busca o evento pelo ID
    let eventId = e.dataTransfer.getData('text/plain');
    if (!eventId) eventId = dragEventIdRef.current || '';
    
    const eventToMove = calendarEvents.find(ev => ev._id === eventId);
    dragEventIdRef.current = null;
    
    if (!eventToMove) return;
    
    // Verifica se moveu para lugar diferente
    const sameDate = eventToMove.date === date;
    const targetHour = hour !== undefined && hour >= 0 ? hour : parseInt(eventToMove.startTime.split(':')[0]);
    const sameHour = eventToMove.startTime.startsWith(String(targetHour).padStart(2, '0'));
    
    if (sameDate && sameHour) return;
    
    // Calcula nova hora mantendo duração
    const originalStart = parseTime(eventToMove.startTime);
    const originalEnd = parseTime(eventToMove.endTime);
    const duration = originalEnd - originalStart;
    
    let newStart: string;
    let newEnd: string;
    
    if (hour !== undefined && hour >= 0) {
      // Drop em slot com horário específico
      const newStartMinutes = hour * 60;
      const newEndMinutes = Math.min(newStartMinutes + duration, 23 * 60 + 59);
      
      newStart = `${String(hour).padStart(2, '0')}:00`;
      newEnd = `${String(Math.floor(newEndMinutes / 60)).padStart(2, '0')}:${String(newEndMinutes % 60).padStart(2, '0')}`;
    } else {
      // Drop em célula de dia (mantém horário original)
      newStart = eventToMove.startTime;
      newEnd = eventToMove.endTime;
    }
    
    // Salva no backend primeiro
    try {
      // Garante que todos os campos obrigatórios estejam presentes
      const updated = await calendarService.update(eventToMove._id, {
        ...eventToMove,
        date,
        startTime: newStart,
        endTime: newEnd,
      });
      // Atualiza o estado local com a resposta do servidor
      updateCalendarEvent(eventToMove._id, {
        ...eventToMove,
        date,
        startTime: newStart,
        endTime: newEnd,
      });
      addToast(`"${eventToMove.title}" reagendado para ${formatDateBR(date)} às ${newStart}`, 'success');
    } catch (err) {
      logger.error('Erro ao reagendar evento:', err);
      addToast('Erro ao salvar alterações. Tente novamente.', 'error');
    }
  };
  
  // Formata data para exibição em PT-BR
  const formatDateBR = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  // Export
  const exportCSV = () => {
    const headers = ['Título', 'Data', 'Início', 'Fim', 'Categoria', 'Local', 'Responsável', 'Lead', 'Descrição'];
    const rows = filteredEvents.map(e => [
      e.title, e.date, e.startTime, e.endTime, categoryConfig[e.category].label,
      e.location || '', e.assignedName || '', e.leadName || '', e.description || ''
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `agenda_${formatDate(new Date())}.csv`;
    a.click();
    addToast('Agenda exportada!');
  };

  // Stats
  const todayStr = formatDate(today);
  const todayEvents = calendarEvents.filter(e => isSameDay(e.date, todayStr));
  const weekDates = getWeekDates();
  const weekEvents = calendarEvents.filter(e => weekDates.some(d => isSameDay(formatDate(d), e.date)));
  const upcomingEvents = calendarEvents.filter(e => e.date >= todayStr && !e.completed).sort((a, b) => a.date.localeCompare(b.date) || parseTime(a.startTime) - parseTime(b.startTime)).slice(0, 5);

  // Header title
  const getHeaderTitle = () => {
    if (viewMode === 'month') return `${MONTHS_PT[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (viewMode === 'week') {
      const start = weekDates[0];
      const end = weekDates[6];
      if (start.getMonth() === end.getMonth()) return `${start.getDate()} - ${end.getDate()} ${MONTHS_PT[start.getMonth()]} ${start.getFullYear()}`;
      return `${start.getDate()} ${MONTHS_PT[start.getMonth()].slice(0, 3)} - ${end.getDate()} ${MONTHS_PT[end.getMonth()].slice(0, 3)} ${end.getFullYear()}`;
    }
    return `${DAYS_FULL[currentDate.getDay()]}, ${currentDate.getDate()} de ${MONTHS_PT[currentDate.getMonth()]}`;
  };

  // ─── Event Card Component ───
  const EventCard = ({ event, compact = false, showTime = true }: { event: CalendarEvent; compact?: boolean; showTime?: boolean }) => {
    const cat = categoryConfig[event.category];
    const CatIcon = cat.icon;
    
    const onDragStartHandler = (e: React.DragEvent<HTMLDivElement>) => {
      handleDragStart(e, event);
    };
    
    return (
      <div
        draggable="true"
        onDragStart={onDragStartHandler}
        onDragEnd={handleDragEnd}
        onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setShowDetailPanel(true); }}
        className={`group relative rounded-lg border cursor-grab active:cursor-grabbing transition-all overflow-hidden hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] ${
          event.completed ? 'opacity-50' : ''
        }`}
        style={{
          borderColor: event.color + '40',
          backgroundColor: event.color + '10',
        }}
      >
        {/* Color bar */}
        <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg" style={{ backgroundColor: event.color }} />

        <div className={`pl-3 pr-2 ${compact ? 'py-1' : 'py-2'}`}>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {event.completed && <Check className="h-3 w-3 text-emerald-500 shrink-0" />}
                <p className={`text-xs font-semibold truncate ${event.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {event.title}
                </p>
              </div>
              {showTime && !compact && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTimeDisplay(event.startTime)} - {formatTimeDisplay(event.endTime)}
                  </span>
                  {event.location && (
                    <span className="text-[10px] text-gray-400 flex items-center gap-0.5 truncate">
                      <MapPin className="h-2.5 w-2.5" />
                      {event.location}
                    </span>
                  )}
                </div>
              )}
              {compact && (
                <span className="text-[10px] text-gray-500">{formatTimeDisplay(event.startTime)}</span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className={`${cat.bg} ${cat.color} p-0.5 rounded`}>
                <CatIcon className="h-2.5 w-2.5" />
              </span>
              {/* Hover actions */}
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button onClick={(e) => { e.stopPropagation(); openEdit(event); }} className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-700">
                  <Edit3 className="h-3 w-3" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); toggleComplete(event); }} className="p-0.5 rounded hover:bg-gray-200 text-gray-400 hover:text-emerald-500">
                  <CheckCircle2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
          {!compact && event.assignedName && (
            <div className="flex items-center gap-1 mt-1">
              <div className="h-4 w-4 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center">
                <span className="text-[7px] font-bold text-white">{event.assignedName.split(' ').map(n => n[0]).join('')}</span>
              </div>
              <span className="text-[10px] text-gray-500">{event.assignedName}</span>
            </div>
          )}
        </div>

        {/* Drag handle */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity">
          <GripVertical className="h-3 w-3 text-gray-400" />
        </div>
      </div>
    );
  };

  // ─── Month View ───
  const MonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const prevDays = getDaysInMonth(year, month - 1);

    const cells: { date: Date; isCurrentMonth: boolean }[] = [];
    for (let i = firstDay - 1; i >= 0; i--) {
      cells.push({ date: new Date(year, month - 1, prevDays - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
    }

    return (
      <div className="flex-1 overflow-auto bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {DAYS_PT.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{d}</div>
          ))}
        </div>
        {/* Cells */}
        <div className="grid grid-cols-7 flex-1">
          {cells.map((cell, i) => {
            const dateStr = formatDate(cell.date);
            const events = getEventsForDate(dateStr);
            const isToday = isSameDay(dateStr, todayStr);
            const isOver = dragOverSlot?.date === dateStr && dragOverSlot.hour === -1;
            return (
              <motion.div
                key={i}
                onDragOver={(e) => handleDragOverDate(e, dateStr)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateStr)}
                onClick={() => openCreateAt(dateStr)}
                className={`agenda-day-cell min-h-[100px] sm:min-h-[120px] border-b border-r border-gray-100 p-1 sm:p-1.5 cursor-pointer transition-all ${
                  !cell.isCurrentMonth ? 'bg-gray-50/50' : 'bg-white'
                } ${isOver ? 'drag-over' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-brand-500 text-white' : !cell.isCurrentMonth ? 'text-gray-400' : 'text-gray-700'
                  }`}>
                    {cell.date.getDate()}
                  </span>
                  {events.length > 0 && (
                    <span className="text-[9px] text-gray-400 font-medium hidden sm:block">{events.length}</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {events.slice(0, 3).map(ev => (
                    <EventCard key={ev._id} event={ev} compact />
                  ))}
                  {events.length > 3 && (
                    <p className="text-[9px] text-gray-500 font-medium pl-2">+{events.length - 3} mais</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Week View ───
  const WeekView = () => {
    const dates = getWeekDates();
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200 shrink-0 bg-gray-50">
          <div />
          {dates.map((d, i) => {
            const dateStr = formatDate(d);
            const isToday = isSameDay(dateStr, todayStr);
            const events = getEventsForDate(dateStr);
            return (
              <div key={i} className={`py-3 text-center border-l border-gray-100 ${isToday ? 'bg-brand-50/50' : ''}`}>
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{DAYS_PT[d.getDay()]}</p>
                <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-brand-600' : 'text-gray-800'}`}>{d.getDate()}</p>
                {events.length > 0 && (
                  <div className="flex justify-center gap-0.5 mt-1">
                    {events.slice(0, 4).map(e => (
                      <div key={e._id} className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: e.color }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
            {/* Current time indicator */}
            {dates.some(d => isSameDay(formatDate(d), todayStr)) && (() => {
              const now = new Date();
              const minutes = now.getHours() * 60 + now.getMinutes();
              const top = ((minutes - 7 * 60) / 60) * 64;
              const todayCol = dates.findIndex(d => isSameDay(formatDate(d), todayStr));
              if (top > 0 && top < 14 * 64 && todayCol >= 0) {
                return (
                  <div className="absolute z-20 pointer-events-none" style={{ top: `${top}px`, left: `calc(60px + ${todayCol} * (100% - 60px) / 7)`, width: `calc((100% - 60px) / 7)` }}>
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shadow-lg shadow-red-500/40" />
                      <div className="flex-1 h-0.5 bg-red-500 shadow-lg shadow-red-500/30" />
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {HOURS.map(hour => (
              <div key={hour} className="contents">
                {/* Time label */}
                <div className="h-16 flex items-start justify-end pr-3 pt-0 border-r border-gray-100 bg-gray-50/50">
                  <span className="text-[10px] text-gray-400 font-medium -mt-1.5">{`${String(hour).padStart(2, '0')}:00`}</span>
                </div>
                {/* Day cells */}
                {dates.map((d, di) => {
                  const dateStr = formatDate(d);
                  const dayEvents = getEventsForDate(dateStr);
                  const slotEvents = getEventsForSlot(dateStr, hour);
                  const eventsWithLayout = calculateEventLayout(dayEvents);
                  const isToday = isSameDay(dateStr, todayStr);
                  const isOver = dragOverSlot?.date === dateStr && dragOverSlot.hour === hour;
                  return (
                    <div
                      key={di}
                      onDragOver={(e) => handleDragOver(e, dateStr, hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, dateStr, hour)}
                      onClick={() => openCreateAt(dateStr, hour)}
                      className={`agenda-slot h-16 border-l border-b border-gray-100 relative cursor-pointer transition-all ${
                        isToday ? 'bg-brand-50/30' : 'bg-white'
                      } ${isOver ? 'drag-over' : 'hover:bg-gray-50'}`}
                    >
                      <div className="absolute inset-0.5 overflow-hidden">
                        {slotEvents.map(ev => {
                          const layout = eventsWithLayout.find(e => e.event._id === ev._id);
                          const col = layout?.position.column || 0;
                          const totalCols = layout?.position.totalColumns || 1;
                          const width = totalCols > 1 ? `${(100 / totalCols) - 1}%` : 'calc(100% - 2px)';
                          const left = totalCols > 1 ? `${(col / totalCols) * 100}%` : '1px';
                          
                          const startMin = parseTime(ev.startTime);
                          const endMin = parseTime(ev.endTime);
                          const slotStart = hour * 60;
                          const topOffset = Math.max(0, startMin - slotStart);
                          const height = Math.min(60, endMin - slotStart) - topOffset;
                          return (
                            <div
                              key={ev._id}
                              draggable
                              onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, ev); }}
                              onDragEnd={handleDragEnd}
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); setShowDetailPanel(true); }}
                              className={`absolute rounded-md px-1 py-0.5 cursor-grab active:cursor-grabbing overflow-hidden group border transition-all hover:shadow-lg hover:z-10 ${
                                ev.completed ? 'opacity-50' : ''
                              }`}
                              style={{
                                top: `${(topOffset / 60) * 100}%`,
                                height: `${Math.max(20, (height / 60) * 100)}%`,
                                left,
                                width,
                                backgroundColor: ev.color + '20',
                                borderColor: ev.color,
                                borderLeftWidth: '3px',
                                zIndex: col + 1,
                              }}
                            >
                              <p className="text-[9px] font-semibold text-gray-800 truncate leading-tight">{ev.title}</p>
                              {height > 30 && totalCols <= 2 && (
                                <p className="text-[8px] text-gray-500 truncate">{formatTimeDisplay(ev.startTime)}</p>
                              )}
                              {/* Quick actions on hover */}
                              <div className="absolute right-0 top-0 hidden group-hover:flex gap-0.5 bg-white/90 rounded p-0.5">
                                <button onClick={(e) => { e.stopPropagation(); openEdit(ev); }} className="p-0.5 rounded bg-white text-gray-600 hover:bg-gray-100 shadow-sm">
                                  <Edit3 className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── Day View ───
  const DayView = () => {
    const dateStr = formatDate(currentDate);
    const dayEvents = getEventsForDate(dateStr);
    const isToday = isSameDay(dateStr, todayStr);

    return (
      <div className="flex-1 flex overflow-hidden bg-white">
        {/* Time grid */}
        <div className="flex-1 overflow-y-auto" ref={scrollRef}>
          <div className="grid grid-cols-[60px_1fr] relative">
            {/* Current time line */}
            {isToday && (() => {
              const now = new Date();
              const minutes = now.getHours() * 60 + now.getMinutes();
              const top = ((minutes - 7 * 60) / 60) * 80;
              if (top > 0 && top < 14 * 80) {
                return (
                  <div className="absolute z-20 left-[60px] right-0 pointer-events-none" style={{ top: `${top}px` }}>
                    <div className="flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 -ml-1.5 shadow-lg shadow-red-500/40" />
                      <div className="flex-1 h-0.5 bg-red-500 shadow-lg shadow-red-500/30" />
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {HOURS.map(hour => {
              const slotEvents = getEventsForSlot(dateStr, hour);
              const eventsWithLayout = calculateEventLayout(dayEvents);
              const isOver = dragOverSlot?.date === dateStr && dragOverSlot.hour === hour;
              return (
                <div key={hour} className="contents">
                  <div className="h-20 flex items-start justify-end pr-3 border-r border-gray-100 bg-gray-50/50">
                    <span className="text-[11px] text-gray-400 font-medium -mt-2">{`${String(hour).padStart(2, '0')}:00`}</span>
                  </div>
                  <div
                    onDragOver={(e) => handleDragOver(e, dateStr, hour)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, dateStr, hour)}
                    onClick={() => openCreateAt(dateStr, hour)}
                    className={`h-20 border-b border-gray-100 relative cursor-pointer transition-colors hover:bg-gray-50 ${
                      isOver ? 'bg-brand-50 ring-1 ring-inset ring-brand-300' : ''
                    }`}
                  >
                    <div className="absolute inset-1 overflow-hidden">
                      {slotEvents.map(ev => {
                        const layout = eventsWithLayout.find(e => e.event._id === ev._id);
                        const col = layout?.position.column || 0;
                        const totalCols = layout?.position.totalColumns || 1;
                        const width = totalCols > 1 ? `${(100 / totalCols) - 2}%` : 'calc(100% - 4px)';
                        const left = totalCols > 1 ? `${(col / totalCols) * 100}%` : '2px';
                        
                        const startMin = parseTime(ev.startTime);
                        const endMin = parseTime(ev.endTime);
                        const slotStart = hour * 60;
                        const topOffset = Math.max(0, startMin - slotStart);
                        const height = Math.min(60, endMin - slotStart) - topOffset;
                        
                        return (
                          <div
                            key={ev._id}
                            draggable
                            onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, ev); }}
                            onDragEnd={handleDragEnd}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); setShowDetailPanel(true); }}
                            className={`absolute rounded-lg px-2 py-1 cursor-grab active:cursor-grabbing overflow-hidden group border-l-4 transition-all hover:shadow-lg hover:z-10 ${
                              ev.completed ? 'opacity-50' : ''
                            }`}
                            style={{
                              top: `${(topOffset / 60) * 100}%`,
                              height: `${Math.max(24, (height / 60) * 100)}%`,
                              left,
                              width,
                              backgroundColor: ev.color + '15',
                              borderLeftColor: ev.color,
                              zIndex: col + 1,
                            }}
                          >
                            <p className="text-xs font-semibold text-gray-800 truncate">{ev.title}</p>
                            {height > 25 && (
                              <p className="text-[10px] text-gray-500">{formatTimeDisplay(ev.startTime)} - {formatTimeDisplay(ev.endTime)}</p>
                            )}
                            {/* Quick actions on hover */}
                            <div className="absolute right-1 top-1 hidden group-hover:flex gap-1 bg-white/90 rounded p-0.5 shadow">
                              <button onClick={(e) => { e.stopPropagation(); openEdit(ev); }} className="p-1 rounded hover:bg-gray-100 text-gray-600">
                                <Edit3 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Side panel: Today's events */}
        <div className="hidden lg:block w-72 border-l border-gray-200 overflow-y-auto bg-gray-50/50">
          <div className="p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-3">Eventos do dia ({dayEvents.length})</h3>
            <div className="space-y-2">
              {dayEvents.map(ev => (
                <EventCard key={ev._id} event={ev} />
              ))}
              {dayEvents.length === 0 && (
                <div className="text-center py-8">
                  <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Nenhum evento</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Form modal is now inline JSX to prevent re-mounting on state changes

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50">
      {/* ─── Header ─── */}
      <div className="shrink-0 px-4 sm:px-6 py-4 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500 shadow-lg shadow-brand-500/20">
                <CalendarDays className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-gray-800 tracking-tight">Agenda</h1>
                <p className="text-xs text-gray-500">{todayEvents.length} eventos hoje · {weekEvents.length} esta semana</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-40 sm:w-48 rounded-lg bg-gray-100 border border-gray-200 pl-8 pr-3 py-2 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-white"
                placeholder="Buscar eventos..."
              />
            </div>
            <button onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg border text-xs transition-all ${showFilters ? 'bg-brand-50 border-brand-200 text-brand-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
            >
              <Filter className="h-4 w-4" />
            </button>
            <button onClick={exportCSV} className="p-2 rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
              <Download className="h-4 w-4" />
            </button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => { setEventForm(emptyForm); setFormErrors([]); setShowCreateModal(true); }}
              className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-brand-500 to-violet-500 shadow-lg shadow-brand-500/20"
            >
              <Plus className="h-4 w-4" /> Novo Evento
            </motion.button>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="pt-3 flex flex-wrap gap-1.5">
                <button onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${categoryFilter === 'all' ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  Todos
                </button>
                {(Object.entries(categoryConfig) as [EventCategory, typeof categoryConfig[EventCategory]][]).map(([key, val]) => {
                  const Icon = val.icon;
                  const count = calendarEvents.filter(e => e.category === key).length;
                  return (
                    <button key={key} onClick={() => setCategoryFilter(categoryFilter === key ? 'all' : key)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                        categoryFilter === key ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      {val.label}
                      <span className="text-[9px] text-gray-400">({count})</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors">
              Hoje
            </button>
            <h2 className="text-sm sm:text-base font-bold text-gray-800 ml-2">{getHeaderTitle()}</h2>
          </div>
          <div className="flex items-center bg-gray-100 rounded-lg border border-gray-200 p-0.5">
            {([['month', LayoutGrid, 'Mês'], ['week', List, 'Semana'], ['day', CalendarIcon, 'Dia']] as const).map(([mode, Icon, label]) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === mode ? 'text-white' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {viewMode === mode && (
                  <motion.div layoutId="viewMode" className="absolute inset-0 rounded-md bg-gradient-to-r from-brand-500 to-violet-500" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Calendar */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="popLayout">
            <motion.div key={viewMode + currentDate.toISOString()} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }} className="flex-1 flex flex-col overflow-hidden"
            >
              {viewMode === 'month' && <MonthView />}
              {viewMode === 'week' && <WeekView />}
              {viewMode === 'day' && <DayView />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ─── Side Panel: Upcoming ─── */}
        <div className="hidden xl:block w-72 border-l border-gray-200 overflow-y-auto bg-white">
          <div className="p-4">
            {/* Mini stats */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              {[
                { label: 'Hoje', value: todayEvents.length, color: 'text-brand-600' },
                { label: 'Semana', value: weekEvents.length, color: 'text-violet-600' },
                { label: 'Reuniões', value: calendarEvents.filter(e => e.category === 'meeting' && !e.completed).length, color: 'text-indigo-600' },
                { label: 'Prazos', value: calendarEvents.filter(e => e.category === 'deadline' && !e.completed).length, color: 'text-red-600' },
              ].map((s, i) => (
                <div key={i} className="rounded-xl bg-gray-50 border border-gray-100 p-3 text-center">
                  <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Upcoming events */}
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-brand-500" />
              Próximos Eventos
            </h3>
            <div className="space-y-2">
              {upcomingEvents.map((ev, i) => {
                const cat = categoryConfig[ev.category];
                const CatIcon = cat.icon;
                const isToday = isSameDay(ev.date, todayStr);
                const evDate = new Date(ev.date + 'T00:00:00');
                return (
                  <motion.div key={ev._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    onClick={() => { setSelectedEvent(ev); setShowDetailPanel(true); }}
                    className="group rounded-xl bg-gray-50 border border-gray-100 p-3 cursor-pointer hover:bg-gray-100 hover:border-gray-200 transition-all"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-1 h-8 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: ev.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{ev.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatTimeDisplay(ev.startTime)}
                          </span>
                          <span className={`text-[10px] font-medium ${isToday ? 'text-brand-600' : 'text-gray-400'}`}>
                            {isToday ? 'Hoje' : `${evDate.getDate()} ${MONTHS_PT[evDate.getMonth()].slice(0, 3)}`}
                          </span>
                        </div>
                        {ev.leadName && (
                          <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-0.5">
                            <Tag className="h-2.5 w-2.5" /> {ev.leadName}
                          </p>
                        )}
                      </div>
                      <span className={`${cat.bg} ${cat.color} p-1 rounded-md`}>
                        <CatIcon className="h-3 w-3" />
                      </span>
                    </div>
                  </motion.div>
                );
              })}
              {upcomingEvents.length === 0 && (
                <div className="text-center py-6">
                  <CalendarDays className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Nenhum evento futuro</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Detail Panel ─── */}
      <AnimatePresence>
        {showDetailPanel && selectedEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDetailPanel(false)}
          >
            <motion.div initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-md bg-white border-l border-gray-200 overflow-y-auto h-full shadow-2xl"
            >
              {/* Detail Header */}
              <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl border-b border-gray-100 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-500">
                    <CalendarDays className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-sm font-bold text-gray-800">Detalhes do Evento</h2>
                    <p className="text-xs text-gray-500">Visualização completa</p>
                  </div>
                  <button onClick={() => setShowDetailPanel(false)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Detail Content */}
              <div className="p-6">
                {/* Event Info */}
                <div className="relative p-4 rounded-xl border border-gray-100 mb-4" style={{ backgroundColor: selectedEvent.color + '08' }}>
                  <div className="absolute inset-0 opacity-10 rounded-xl" style={{ background: `linear-gradient(135deg, ${selectedEvent.color}20, transparent)` }} />
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      {(() => {
                        const cat = categoryConfig[selectedEvent.category];
                        const CatIcon = cat.icon;
                        return (
                          <span className={`${cat.bg} ${cat.textDark} px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1`}>
                            <CatIcon className="h-3 w-3" /> {cat.label}
                          </span>
                        );
                      })()}
                      {selectedEvent.completed && (
                        <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1">
                          <Check className="h-3 w-3" /> Concluído
                        </span>
                      )}
                    </div>
                    <h2 className={`text-lg font-bold ${selectedEvent.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                      {selectedEvent.title}
                    </h2>
                    {selectedEvent.description && (
                      <p className="text-sm text-gray-500 mt-2 leading-relaxed">{selectedEvent.description}</p>
                    )}
                  </div>
                </div>

                {/* Date & Time */}
                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: selectedEvent.color + '20' }}>
                      <CalendarDays className="h-5 w-5" style={{ color: selectedEvent.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {(() => {
                          const d = new Date(selectedEvent.date + 'T00:00:00');
                          return `${DAYS_FULL[d.getDay()]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]}`;
                        })()}
                      </p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeDisplay(selectedEvent.startTime)} - {formatTimeDisplay(selectedEvent.endTime)}
                        <span className="text-gray-300">·</span>
                        {(() => {
                          const dur = parseTime(selectedEvent.endTime) - parseTime(selectedEvent.startTime);
                          const h = Math.floor(dur / 60);
                          const m = dur % 60;
                          return h > 0 ? `${h}h${m > 0 ? m + 'min' : ''}` : `${m}min`;
                        })()}
                      </p>
                    </div>
                  </div>
                  {selectedEvent.recurrence && selectedEvent.recurrence !== 'none' && (
                    <div className="flex items-center gap-1.5 text-xs text-violet-600 bg-violet-50 px-2.5 py-1 rounded-lg w-fit">
                      <Repeat className="h-3 w-3" />
                      {selectedEvent.recurrence === 'daily' ? 'Repete diariamente' : selectedEvent.recurrence === 'weekly' ? 'Repete semanalmente' : 'Repete mensalmente'}
                    </div>
                  )}
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {selectedEvent.location && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                        <MapPin className="h-3 w-3" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Local</span>
                      </div>
                      <p className="text-xs font-medium text-gray-700">{selectedEvent.location}</p>
                    </div>
                  )}
                  {selectedEvent.assignedName && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                        <User className="h-3 w-3" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Responsável</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center">
                          <span className="text-[8px] font-bold text-white">{selectedEvent.assignedName.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
                        </div>
                        <p className="text-xs font-medium text-gray-700">{selectedEvent.assignedName}</p>
                      </div>
                    </div>
                  )}
                  {selectedEvent.leadName && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                        <Tag className="h-3 w-3" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Lead</span>
                      </div>
                      <p className="text-xs font-medium text-gray-700">{selectedEvent.leadName}</p>
                    </div>
                  )}
                  {selectedEvent.reminder !== undefined && selectedEvent.reminder > 0 && (
                    <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
                        <Bell className="h-3 w-3" />
                        <span className="text-[10px] uppercase tracking-wider font-semibold">Lembrete</span>
                      </div>
                      <p className="text-xs font-medium text-gray-700">{selectedEvent.reminder} min antes</p>
                    </div>
                  )}
                </div>

                {/* Color */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedEvent.color }} />
                  <span className="text-xs text-gray-500">{selectedEvent.color}</span>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => toggleComplete(selectedEvent)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold border transition-all ${
                        selectedEvent.completed
                          ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {selectedEvent.completed ? 'Reativar' : 'Concluir'}
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={handleDuplicate}
                      className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100"
                    >
                      <Copy className="h-4 w-4" /> Duplicar
                    </motion.button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { setShowDetailPanel(false); openEdit(selectedEvent); }}
                      className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-brand-500 to-violet-500 shadow-lg shadow-brand-500/20"
                    >
                      <Edit3 className="h-4 w-4" /> Editar
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { setShowDetailPanel(false); setShowDeleteModal(true); }}
                      className="flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" /> Excluir
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Create/Edit Modal ─── */}
      {(showCreateModal || showEditModal) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-scale-in"
          >
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${showEditModal ? 'bg-amber-100' : 'bg-brand-100'}`}>
                  {showEditModal ? <Edit3 className="h-5 w-5 text-amber-600" /> : <Plus className="h-5 w-5 text-brand-600" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">{showEditModal ? 'Editar Evento' : 'Novo Evento'}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{showEditModal ? 'Altere os detalhes do evento' : 'Preencha os detalhes do evento'}</p>
                </div>
              </div>
              <button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Título *</label>
                <input 
                  type="text"
                  value={eventForm.title} 
                  onChange={e => setEventForm(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full rounded-lg bg-gray-50 border px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-white ${
                    formErrors.includes('title') ? 'border-red-300 bg-red-50' : 'border-gray-200'
                  }`}
                  placeholder="Ex: Reunião com cliente"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Categoria</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(Object.entries(categoryConfig) as [EventCategory, typeof categoryConfig[EventCategory]][]).map(([key, val]) => {
                    const Icon = val.icon;
                    return (
                      <button key={key} type="button" onClick={() => setEventForm(prev => ({ ...prev, category: key }))}
                        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium border transition-all ${
                          eventForm.category === key ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {val.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {colorOptions.map(c => (
                    <button key={c} type="button" onClick={() => setEventForm(prev => ({ ...prev, color: c }))}
                      className={`w-7 h-7 rounded-full transition-all ${eventForm.color === c ? 'ring-2 ring-gray-400 ring-offset-2 scale-110' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Data *</label>
                  <input 
                    type="date" 
                    value={eventForm.date} 
                    onChange={e => setEventForm(prev => ({ ...prev, date: e.target.value }))}
                    className={`w-full rounded-lg bg-gray-50 border px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-white ${
                      formErrors.includes('date') ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Início *</label>
                  <input 
                    type="time" 
                    value={eventForm.startTime} 
                    onChange={e => setEventForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className={`w-full rounded-lg bg-gray-50 border px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-white ${
                      formErrors.includes('startTime') ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Fim *</label>
                  <input 
                    type="time" 
                    value={eventForm.endTime} 
                    onChange={e => setEventForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className={`w-full rounded-lg bg-gray-50 border px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-white ${
                      formErrors.includes('endTime') ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                  />
                  {formErrors.includes('endTime') && (
                    <p className="text-[10px] text-red-500 mt-0.5">Fim deve ser após início</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Descrição</label>
                <textarea 
                  value={eventForm.description} 
                  onChange={e => setEventForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-white resize-none h-20"
                  placeholder="Detalhes do evento..."
                />
              </div>

              {/* Location & Assignee */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Local</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input 
                      type="text"
                      value={eventForm.location} 
                      onChange={e => setEventForm(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full rounded-lg bg-gray-50 border border-gray-200 pl-8 pr-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-white"
                      placeholder="Zoom, Sala 1..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Responsável</label>
                  <select 
                    value={eventForm.assignedName} 
                    onChange={e => setEventForm(prev => ({ ...prev, assignedName: e.target.value }))}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-white"
                  >
                    <option value="">Selecione...</option>
                    {settingsUsers.map(u => (
                      <option key={u._id} value={u.name}>{u.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lead & Reminder */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Lead / Cliente</label>
                  <select 
                    value={eventForm.leadName} 
                    onChange={e => setEventForm(prev => ({ ...prev, leadName: e.target.value }))}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-white"
                  >
                    <option value="">Selecione...</option>
                    <optgroup label="Leads">
                      {leads.map(l => <option key={l._id} value={l.name}>{l.name} - {l.company || 'Sem empresa'}</option>)}
                    </optgroup>
                    <optgroup label="Clientes">
                      {clients.map(c => <option key={c._id} value={c.name}>{c.name} - {c.company || 'Sem empresa'}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Lembrete</label>
                  <select 
                    value={eventForm.reminder} 
                    onChange={e => setEventForm(prev => ({ ...prev, reminder: Number(e.target.value) }))}
                    className="w-full rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:bg-white"
                  >
                    <option value={0}>Sem lembrete</option>
                    <option value={5}>5 minutos</option>
                    <option value={10}>10 minutos</option>
                    <option value={15}>15 minutos</option>
                    <option value={30}>30 minutos</option>
                    <option value={60}>1 hora</option>
                  </select>
                </div>
              </div>

              {/* Recurrence */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Recorrência</label>
                <div className="flex gap-2">
                  {([['none', 'Nenhuma'], ['daily', 'Diário'], ['weekly', 'Semanal'], ['monthly', 'Mensal']] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setEventForm(prev => ({ ...prev, recurrence: val }))}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium border transition-all ${
                        eventForm.recurrence === val ? 'border-brand-300 bg-brand-50 text-brand-700' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {val !== 'none' && <Repeat className="h-3 w-3" />}
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              {showEditModal && (
                <button type="button" onClick={() => { setShowEditModal(false); setShowDeleteModal(true); }} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                  <Trash2 className="h-3.5 w-3.5" /> Excluir
                </button>
              )}
              <div className={`flex gap-2 ${showEditModal ? '' : 'ml-auto'}`}>
                <button type="button" onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 border border-gray-200"
                >
                  Cancelar
                </button>
                <button type="button"
                  onClick={showEditModal ? handleUpdate : handleCreate}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-brand-500 to-violet-500 shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30 transition-shadow"
                >
                  {showEditModal ? 'Salvar' : 'Criar Evento'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && selectedEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl border border-gray-200 w-full max-w-sm p-6 shadow-2xl"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-800 text-center">Excluir Evento</h3>
              <p className="text-sm text-gray-500 text-center mt-2">
                Tem certeza que deseja excluir <span className="font-semibold text-gray-700">"{selectedEvent.title}"</span>?
              </p>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 hover:bg-gray-100">
                  Cancelar
                </button>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600"
                >
                  Excluir
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Toasts ─── */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold shadow-xl border backdrop-blur-sm ${
                t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                t.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                'bg-brand-50 border-brand-200 text-brand-700'
              }`}
            >
              {t.type === 'success' ? <Check className="h-4 w-4" /> : t.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              {t.message}
              <button onClick={() => setToasts(p => p.filter(x => x.id !== t.id))} className="ml-1 opacity-60 hover:opacity-100"><X className="h-3 w-3" /></button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
