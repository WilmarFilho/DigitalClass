"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Loader2, Trash2, Sparkles, Maximize2, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Subject {
  id: string;
  title: string;
  color_code: string;
}

interface CalendarEvent {
  id: string;
  subject_id: string;
  scheduled_date: string;
  scheduled_time?: string | null;
  duration_minutes: number;
  status: string;
  subjects: Subject | null;
}

interface CalendarSuggestion {
  date: string;
  subject_id: string;
  suggested_duration_minutes: number;
  subject: { id: string; title: string; color_code: string };
}

export function CalendarioClient() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [suggestions, setSuggestions] = useState<CalendarSuggestion[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [, setLoading] = useState(true);
  const [, setLoadingSuggestions] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [dayDetailModalOpen, setDayDetailModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{ date: string; day: number } | null>(null);
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formDuration, setFormDuration] = useState("60");
  const [, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadingSuggestions(true);
    try {
      const [eventsData, suggestionsData, subjectsData] = await Promise.all([
        apiGet<CalendarEvent[]>(`/calendar/events?month=${monthKey}`),
        apiGet<CalendarSuggestion[]>(`/calendar/suggestions?month=${monthKey}`),
        apiGet<Array<Subject & { color_code?: string }>>("/subjects")
      ]);
      setEvents(eventsData);
      setSuggestions(suggestionsData);
      setSubjects(subjectsData.map(s => ({ ...s, color_code: s.color_code || "#6D44CC" })));
    } catch {
      setEvents([]);
      setSuggestions([]);
    } finally {
      setLoading(false);
      setLoadingSuggestions(false);
    }
  }, [monthKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const padding = Array.from({ length: firstDay }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const dateStr = (day: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const getEventsForDay = (day: number) => events.filter(e => e.scheduled_date === dateStr(day));
  const getSuggestionsForDay = (day: number) => suggestions.filter(s => s.date === dateStr(day));
  const alreadyHasEvent = (date: string, subId: string) => events.some(e => e.scheduled_date === date && e.subject_id === subId);

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || !formSubjectId) return setFormError("Selecione uma matéria");
    setSubmitting(true);
    try {
      await apiPost("/calendar/events", {
        subject_id: formSubjectId,
        scheduled_date: selectedDay.date,
        scheduled_time: formTime,
        duration_minutes: parseInt(formDuration),
      });
      setAddModalOpen(false);
      loadData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) { setFormError(err.message); } finally { setSubmitting(false); }
  };

  const handleAddSuggestion = async (s: CalendarSuggestion) => {
    setSubmitting(true);
    try {
      await apiPost("/calendar/events", {
        subject_id: s.subject_id,
        scheduled_date: s.date,
        scheduled_time: "09:00",
        duration_minutes: s.suggested_duration_minutes,
      });
      loadData();
    } catch {} finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-500">
      {/* Header Profissional */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#E6E0F8] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#F5F3FF] rounded-xl border border-[#E6E0F8]">
            <CalendarIcon className="h-6 w-6 text-[#6D44CC]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#1A1A1A]">Meu Cronograma</h1>
            <p className="text-xs font-medium text-slate-400">Gerencie seus horários e metas de estudo</p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-center md:self-auto">
          <div className="flex items-center bg-[#F8F7FF] rounded-xl border border-[#E6E0F8] p-1 shadow-inner">
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month - 1))} className="h-8 w-8 hover:bg-white text-[#6D44CC]">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs font-bold text-[#4A4A4A] min-w-[140px] text-center uppercase tracking-widest">
              {MONTHS[month]} {year}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentDate(new Date(year, month + 1))} className="h-8 w-8 hover:bg-white text-[#6D44CC]">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Grid do Calendário */}
      <div className="bg-white rounded-2xl border border-[#E6E0F8] shadow-lg overflow-hidden flex flex-col min-h-[700px]">
        {/* Cabeçalho do Grid */}
        <div className="grid grid-cols-7 bg-[#F8F7FF] border-b border-[#E6E0F8]">
          {DAYS.map((d) => (
            <div key={d} className="py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
              {d}
            </div>
          ))}
        </div>

        {/* Células */}
        <div className="flex-1 grid grid-cols-7 grid-rows-6">
          {[...padding, ...days].map((day, i) => {
            if (day === null) return <div key={`pad-${i}`} className="border-b border-r border-[#F0EDFF] bg-[#FBFBFF]" />;
            
            const dayEvents = getEventsForDay(day);
            const daySugs = getSuggestionsForDay(day).filter(s => !alreadyHasEvent(s.date, s.subject_id));
            const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

            return (
              <div
                key={day}
                className={cn(
                  "min-h-[120px] border-b border-r border-[#F0EDFF] p-2 transition-all flex flex-col group relative",
                  isToday ? "bg-[#F5F3FF]/50" : "bg-white hover:bg-slate-50/50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={cn(
                    "w-7 h-7 flex items-center justify-center text-xs font-bold rounded-lg transition-colors",
                    isToday ? "bg-[#6D44CC] text-white shadow-md shadow-[#6D44CC]/20" : "text-[#4A4A4A] group-hover:text-[#6D44CC]"
                  )}>
                    {day}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setSelectedDay({ date: dateStr(day), day }); setDayDetailModalOpen(true); }}
                      className="p-1 hover:bg-[#E6E0F8] rounded-md text-[#6D44CC]"
                    >
                      <Maximize2 className="h-3 w-3" />
                    </button>
                    <button 
                      onClick={() => { setSelectedDay({ date: dateStr(day), day }); setAddModalOpen(true); }}
                      className="p-1 hover:bg-[#E6E0F8] rounded-md text-[#6D44CC]"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Eventos na célula */}
                <div className="space-y-1.5 overflow-hidden">
                  {dayEvents.slice(0, 2).map(ev => (
                    <div 
                      key={ev.id} 
                      className="text-[10px] px-2 py-1 rounded-md text-white font-bold truncate shadow-sm"
                      style={{ backgroundColor: ev.subjects?.color_code || "#6D44CC" }}
                    >
                      {ev.subjects?.title}
                    </div>
                  ))}
                  {daySugs.length > 0 && dayEvents.length < 2 && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded-md border border-amber-200 border-dashed">
                      <Sparkles className="h-2 w-2" />
                      IA Sugere
                    </div>
                  )}
                  {(dayEvents.length + (daySugs.length > 0 ? 1 : 0)) > 2 && (
                    <div className="text-[9px] text-center font-bold text-slate-400 pt-1">
                      + {(dayEvents.length + daySugs.length) - 2} ITENS
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Detalhes do Dia */}
      <Modal open={dayDetailModalOpen} onClose={() => setDayDetailModalOpen(false)} title="Programação do Dia" className="max-w-md">
        {selectedDay && (
          <div className="space-y-6">
            <div className="space-y-3">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Matérias Confirmadas</h4>
              {getEventsForDay(selectedDay.day).map(ev => (
                <div key={ev.id} className="flex items-center justify-between p-3 rounded-2xl border border-[#E6E0F8] bg-white group">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: ev.subjects?.color_code }} />
                    <div>
                      <p className="text-sm font-bold text-[#1A1A1A]">{ev.subjects?.title}</p>
                      <p className="text-[10px] font-medium text-slate-400 uppercase">{ev.scheduled_time || "00:00"} • {ev.duration_minutes}min</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => apiDelete(`/calendar/events/${ev.id}`).then(loadData)} className="opacity-0 group-hover:opacity-100 text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {getSuggestionsForDay(selectedDay.day).length > 0 && (
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Sugestões da IA
                </h4>
                {getSuggestionsForDay(selectedDay.day).filter(s => !alreadyHasEvent(s.date, s.subject_id)).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/50 border border-dashed border-amber-200">
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-8 rounded-full bg-amber-400" />
                      <p className="text-sm font-bold text-amber-900">{s.subject.title}</p>
                    </div>
                    <Button size="sm" onClick={() => handleAddSuggestion(s)} className="bg-amber-500 hover:bg-amber-600 h-7 text-[10px] font-black">ADICIONAR</Button>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={() => { setDayDetailModalOpen(false); setAddModalOpen(true); }} className="w-full bg-[#6D44CC] hover:bg-[#5B39A8] rounded-xl py-6 font-bold">
              <Plus className="h-4 w-4 mr-2" /> NOVA MATÉRIA
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal Adicionar Evento (Simpificado) */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Novo Agendamento">
        <form onSubmit={handleAddEvent} className="space-y-5">
           <div className="space-y-2">
             <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Matéria de Estudo</Label>
             <select 
              value={formSubjectId} 
              onChange={e => setFormSubjectId(e.target.value)}
              className="w-full rounded-xl border border-[#E6E0F8] p-3 text-sm focus:ring-2 focus:ring-[#6D44CC] outline-none"
             >
               <option value="">Selecione a matéria...</option>
               {subjects.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
             </select>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Início</Label>
                <Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="rounded-xl border-[#E6E0F8]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Duração (min)</Label>
                <Input type="number" step="15" value={formDuration} onChange={e => setFormDuration(e.target.value)} className="rounded-xl border-[#E6E0F8]" />
              </div>
           </div>
           <Button type="submit" disabled={submitting} className="w-full bg-[#6D44CC] hover:bg-[#5B39A8] rounded-xl h-12 font-bold">
             {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : "CONFIRMAR AGENDAMENTO"}
           </Button>
        </form>
      </Modal>
    </div>
  );
}