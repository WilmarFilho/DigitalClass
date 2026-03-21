"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft, ChevronRight, Plus, Loader2, Trash2,
  Sparkles, Maximize2, Calendar as CalendarIcon,
  BookOpen, Clock, Target, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

const getDays = (lang: string) => {
  if (lang === "en") return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (lang === "es") return ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  return ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
};

const getMonths = (lang: string) => {
  if (lang === "en") return ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  if (lang === "es") return ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
};
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Subject {
  id: string;
  title: string;
  color_code: string;
  target_hours: number;
  completed_minutes: number;
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
  const { t, lang } = useTranslation();
  const DAYS = getDays(lang);
  const MONTHS = getMonths(lang);

  const today = new Date();
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [suggestions, setSuggestions] = useState<CalendarSuggestion[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [dayDetailModalOpen, setDayDetailModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<{ date: string; day: number } | null>(null);
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formTime, setFormTime] = useState("09:00");
  const [formDuration, setFormDuration] = useState("60");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [eventsData, suggestionsData, subjectsRes] = await Promise.all([
        apiGet<CalendarEvent[]>(`/calendar/events?month=${monthKey}`),
        apiGet<CalendarSuggestion[]>(`/calendar/suggestions?month=${monthKey}`),
        apiGet<any>("/subjects?limit=100")
      ]);
      setEvents(eventsData);
      setSuggestions(suggestionsData);
      const subjectsData = subjectsRes.data || [];
      setSubjects(subjectsData.map((s: any) => ({ ...s, color_code: s.color_code || "#6D44CC" })));
    } catch {
      setEvents([]);
      setSuggestions([]);
    } finally {
      setLoading(false);
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
    } catch { } finally { setSubmitting(false); }
  };

  return (
    <div className="flex flex-col space-y-6 animate-in fade-in duration-700 overflow-x-hidden w-full max-w-full">

      {/* Header Profissional com Glassmorphism */}
      <div className="flex flex-row items-center justify-between gap-6 bg-white p-8 rounded-[32px] border border-[#E6E0F8] shadow-sm">

        {/* Lado Esquerdo: Título e Ícone (Esconde abaixo de 1075px) */}
        <div className="flex items-center gap-4 max-[1075px]:hidden">
          <div className="p-3 bg-[#F5F3FF] rounded-2xl border border-[#E6E0F8] shadow-inner">
            <CalendarIcon className="h-7 w-7 text-[#6D44CC]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight uppercase">{t("calendario.title")}</h1>
            <p className="text-sm font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
              <BookOpen className="h-3.5 w-3.5 text-[#6D44CC]" /> {t("calendario.subtitle")}
            </p>
          </div>
        </div>

        {/* Lado Direito: Seletor de Mês (Sempre visível, centralizado no mobile) */}
        <div className="flex items-center bg-[#F8F7FF] rounded-2xl border border-[#E6E0F8] p-1.5 shadow-inner max-[1075px]:w-full max-[1075px]:justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(new Date(year, month - 1))}
            className="h-10 w-10 hover:bg-white text-[#6D44CC] rounded-xl transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <span className="text-[12px] font-black text-[#4A4A4A] min-w-[170px] text-center uppercase tracking-[0.2em]">
            {MONTHS[month]} {year}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentDate(new Date(year, month + 1))}
            className="h-10 w-10 hover:bg-white text-[#6D44CC] rounded-xl transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Wrapper de Scroll Horizontal Corrigido */}
      <div className="w-full bg-white rounded-[32px] border border-[#E6E0F8] overflow-hidden relative">
        <div className="w-full overflow-x-auto scrollbar-hide"> {/* Classes para ocultar scrollbar opcional */}
          {/* Força a largura mínima para o grid não achatar */}
          <div className="min-w-[950px] w-full flex flex-col">

            {/* Dias da Semana */}
            <div className="grid grid-cols-7 bg-[#F8F7FF] border-b border-[#E6E0F8]">
              {DAYS.map((d) => (
                <div key={d} className="py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-[0.25em]">
                  {d}
                </div>
              ))}
            </div>

            {/* Grid de Dias */}
            <div className="grid grid-cols-7 relative divide-x divide-y divide-[#F0EDFF] border-b border-[#F0EDFF]">
              {loading && (
                <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-[#6D44CC] animate-spin mb-4" />
                  <p className="text-sm font-black text-[#6D44CC] animate-pulse uppercase tracking-widest">{t("calendario.syncing")}</p>
                </div>
              )}

              {[...padding, ...days].map((day, i) => {
                if (day === null) return <div key={`pad-${i}`} className="min-h-[140px] bg-[#FBFBFF]" />;

                const dayEvents = getEventsForDay(day);
                const daySugs = getSuggestionsForDay(day).filter(s => !alreadyHasEvent(s.date, s.subject_id));
                const isToday = year === today.getFullYear() && month === today.getMonth() && day === today.getDate();

                return (
                  <div
                    key={day}
                    className={cn(
                      "min-h-[140px] p-4 transition-all flex flex-col group relative",
                      isToday ? "bg-[#F5F3FF]/40" : "bg-white hover:bg-[#FDFDFF]"
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className={cn(
                        "w-9 h-9 flex items-center justify-center text-xs font-black rounded-2xl transition-all",
                        isToday ? "bg-[#6D44CC] text-white" : "bg-slate-50 text-slate-400 group-hover:bg-[#E6E0F8] group-hover:text-[#6D44CC]"
                      )}>
                        {day}
                      </span>

                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
                        <button
                          onClick={() => { setSelectedDay({ date: dateStr(day), day }); setDayDetailModalOpen(true); }}
                          className="p-1.5 bg-white border border-[#E6E0F8] hover:border-[#6D44CC] rounded-xl text-[#6D44CC] transition-colors"
                        >
                          <Maximize2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {dayEvents.slice(0, 2).map(ev => (
                        <div
                          key={ev.id}
                          className="text-[9px] px-2.5 py-1.5 rounded-lg text-white font-black truncate  border-l-4 border-black/10"
                          style={{ backgroundColor: ev.subjects?.color_code || "#6D44CC" }}
                        >
                          {ev.subjects?.title}
                        </div>
                      ))}

                      {daySugs.length > 0 && dayEvents.length < 2 && (
                        <div className="flex items-center gap-1.5 text-[9px] text-amber-600 font-black bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-200 border-dashed animate-pulse">
                          <Sparkles className="h-3.5 w-3.5" />
                          {t("calendario.suggestionAI")}
                        </div>
                      )}

                      {dayEvents.length > 2 && (
                        <div className="text-[9px] text-center font-black text-slate-400 pt-1 tracking-tighter">
                          +{(dayEvents.length) - 2} {t("calendario.moreSubjects")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Detalhes do Dia */}
      <Modal open={dayDetailModalOpen} onClose={() => setDayDetailModalOpen(false)} title={t("calendario.detailTitle")} className="max-w-md p-0 overflow-hidden">
        {selectedDay && (
          <div className="space-y-8 p-8">
            <div className="space-y-4">
              <div className="space-y-3">
                {getEventsForDay(selectedDay.day).length === 0 && (
                  <p className="text-xs font-medium text-slate-400 italic py-2 text-center">{t("calendario.noScheduled")}</p>
                )}
                {getEventsForDay(selectedDay.day).map(ev => (
                  <div key={ev.id} className="flex items-center justify-between p-4 rounded-2xl border-2 border-[#F5F3FF] bg-white group hover:border-[#E6E0F8] transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-10 rounded-full" style={{ backgroundColor: ev.subjects?.color_code }} />
                      <div>
                        <p className="text-sm font-black text-[#1A1A1A]">{ev.subjects?.title}</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                          <Clock className="h-3 w-3" /> {ev.scheduled_time || "00:00"} • {ev.duration_minutes} {t("calendario.minutes")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => {
                          apiPost<{ id: string }>("/study/sessions", {
                            subject_id: ev.subject_id,
                            calendar_event_id: ev.id
                          }).then(session => {
                            window.location.href = `/protected/estudos/sessao?sessionId=${session.id}&subjectId=${ev.subject_id}`;
                          });
                        }}
                        className="bg-[#6D44CC] hover:bg-[#5B39A8] h-8 text-[10px] font-black rounded-xl px-4"
                      >
                        {t("calendario.start")}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => apiDelete(`/calendar/events/${ev.id}`).then(loadData)} className="h-8 w-8 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {getSuggestionsForDay(selectedDay.day).length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> {t("calendario.recommendedOptimization")}
                </h4>
                {getSuggestionsForDay(selectedDay.day).filter(s => !alreadyHasEvent(s.date, s.subject_id)).map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/50 border-2 border-dashed border-amber-200 shadow-inner">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-10 rounded-full bg-amber-400" />
                      <div>
                        <p className="text-sm font-black text-amber-900">{s.subject.title}</p>
                        <p className="text-[10px] font-bold text-amber-600/70 uppercase">{t("calendario.suggestedDuration")}: {s.suggested_duration_minutes}m</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleAddSuggestion(s)} className="bg-amber-500 hover:bg-amber-600 h-8 text-[10px] font-black rounded-xl px-4">{t("calendario.accept")}</Button>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={() => { setDayDetailModalOpen(false); setAddModalOpen(true); }} className="w-full bg-[#F5F3FF] hover:bg-[#6D44CC] text-[#6D44CC] hover:text-white rounded-[20px] py-7 font-black transition-all border-2 border-[#E6E0F8] border-dashed text-sm">
              <Plus className="h-5 w-5 mr-2" /> {t("calendario.addSubject")}
            </Button>
          </div>
        )}
      </Modal>

      {/* Modal Adicionar com Select Visual de Matérias */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title={t("calendario.newSchedule")} className="p-0 overflow-hidden">
        <form onSubmit={handleAddEvent} className="p-8 space-y-8">
          <div className="space-y-4">
            <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400 flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[#6D44CC]" /> {t("calendario.selectSubject")}
            </Label>

            {/* Seletor Customizado Visual para melhor UX */}
            <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
              {subjects.length === 0 && <p className="text-xs text-slate-400 italic text-center py-2">{t("calendario.noSubjects")}</p>}
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setFormSubjectId(s.id)}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200 text-left",
                    formSubjectId === s.id
                      ? "border-[#6D44CC] bg-[#F5F3FF] "
                      : "border-[#F5F3FF] bg-white hover:border-[#E6E0F8]"
                  )}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: s.color_code }} />
                    <span className={cn("text-sm font-bold", formSubjectId === s.id ? "text-[#6D44CC]" : "text-slate-700")}>
                      {s.title}
                    </span>
                  </div>
                  {formSubjectId === s.id && <CheckCircle2 className="h-5 w-5 text-[#6D44CC]" />}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">{t("calendario.startTime")}</Label>
              <div className="relative group">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-[#6D44CC] transition-colors" />
                <Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="rounded-2xl border-2 border-[#F5F3FF] h-14 pl-12 font-bold focus-visible:ring-[#6D44CC] text-sm focus:border-[#6D44CC] transition-all" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">{t("calendario.duration")}</Label>
              <div className="relative group">
                <Target className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-[#6D44CC] transition-colors" />
                <Input type="number" step="15" value={formDuration} onChange={e => setFormDuration(e.target.value)} className="rounded-2xl border-2 border-[#F5F3FF] h-14 pl-12 font-bold focus-visible:ring-[#6D44CC] text-sm focus:border-[#6D44CC] transition-all" />
              </div>
            </div>
          </div>

          {formError && <p className="text-[11px] font-black text-red-500 uppercase text-center animate-bounce">{formError}</p>}

          <Button type="submit" disabled={submitting} className="w-full bg-[#6D44CC] hover:bg-[#5B39A8] rounded-3xl h-16 font-black shadow-lg shadow-[#6D44CC]/30 transition-all text-base active:scale-[0.98]">
            {submitting ? <Loader2 className="animate-spin h-7 w-7" /> : t("calendario.confirmSchedule")}
          </Button>
        </form>
      </Modal>
    </div>
  );
}