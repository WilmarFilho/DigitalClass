"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, Loader2, Trash2, Sparkles, Expand } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
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
  const [loading, setLoading] = useState(true);
  const [loadingSuggestions, setLoadingSuggestions] = useState(true);
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

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<CalendarEvent[]>(`/calendar/events?month=${monthKey}`);
      setEvents(data);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  const loadSuggestions = useCallback(async () => {
    setLoadingSuggestions(true);
    try {
      const data = await apiGet<CalendarSuggestion[]>(`/calendar/suggestions?month=${monthKey}`);
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [monthKey]);

  const loadSubjects = useCallback(async () => {
    try {
      const data = await apiGet<Array<Subject & { color_code?: string }>>("/subjects");
      setSubjects(data.map((s) => ({ id: s.id, title: s.title, color_code: s.color_code || "#4F46E5" })));
    } catch {
      setSubjects([]);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1));

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = 42; // 6 weeks * 7 days
  const padding = Array.from({ length: firstDay }, () => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const trailing = Array.from({ length: totalCells - firstDay - daysInMonth }, () => null);

  const dateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getEventsForDay = (day: number) => {
    return events.filter((e) => e.scheduled_date === dateStr(day));
  };

  const getSuggestionsForDay = (day: number) => {
    const d = dateStr(day);
    return suggestions.filter((s) => s.date === d);
  };

  const alreadyHasEvent = (dateStr: string, subjectId: string) =>
    events.some((e) => e.scheduled_date === dateStr && e.subject_id === subjectId);

  const openAddModal = (day: number, suggestion?: CalendarSuggestion) => {
    const d = dateStr(day);
    setSelectedDay({ date: d, day });
    if (suggestion) {
      setFormSubjectId(suggestion.subject_id);
      setFormDuration(String(suggestion.suggested_duration_minutes));
    } else {
      setFormSubjectId(subjects[0]?.id ?? "");
      setFormDuration("60");
    }
    setFormTime("09:00");
    setFormError(null);
    setAddModalOpen(true);
  };

  const handleAddSuggestion = async (suggestion: CalendarSuggestion) => {
    if (alreadyHasEvent(suggestion.date, suggestion.subject_id)) return;
    setSubmitting(true);
    setFormError(null);
    try {
      await apiPost("/calendar/events", {
        subject_id: suggestion.subject_id,
        scheduled_date: suggestion.date,
        scheduled_time: "09:00",
        duration_minutes: suggestion.suggested_duration_minutes,
      });
      setFormError(null);
      await loadEvents();
      await loadSuggestions();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDay || !formSubjectId) {
      setFormError("Selecione uma matéria");
      return;
    }
    const duration = parseInt(formDuration, 10);
    if (isNaN(duration) || duration < 15 || duration > 480) {
      setFormError("Duração deve ser entre 15 e 480 minutos");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    const payload = {
      subject_id: formSubjectId,
      scheduled_date: selectedDay.date,
      scheduled_time: formTime || undefined,
      duration_minutes: duration,
    };
    try {
      await apiPost("/calendar/events", payload);
      setAddModalOpen(false);
      setSelectedDay(null);
      setFormError(null);
      await loadEvents();
      await loadSuggestions();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao adicionar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await apiDelete(`/calendar/events/${eventId}`);
      await loadEvents();
    } catch {}
  };

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] min-h-[600px]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-slate-900">Calendário</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Mês anterior">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="text-lg font-semibold text-slate-900 min-w-[180px] text-center">
            {MONTHS[month]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Próximo mês">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {formError && !addModalOpen && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {formError}
        </div>
      )}
      <div className="flex gap-4 mb-3 text-xs text-slate-500">
        <span className="flex items-center gap-2">
          <span className="h-3 w-4 rounded bg-indigo-500" />
          Agendado
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-4 rounded border border-dashed border-slate-300 bg-slate-50" />
          <Sparkles className="h-3 w-3 text-amber-500" />
          Sugestão
        </span>
      </div>
      <div className="flex-1 rounded-xl border border-slate-200 bg-white/80 backdrop-blur-sm shadow-lg overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 bg-slate-100/80 border-b border-slate-200">
          {DAYS.map((d) => (
            <div
              key={d}
              className="py-2 text-center text-xs font-semibold text-slate-600 uppercase"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-7 grid-rows-6 gap-0 overflow-auto">
          {padding.map((_, i) => (
            <div key={`pad-${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/50" />
          ))}
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const daySuggestions = getSuggestionsForDay(day).filter(
              (s) => !alreadyHasEvent(s.date, s.subject_id)
            );
            const hasContent = dayEvents.length > 0 || daySuggestions.length > 0;
            const isToday = isCurrentMonth && day === today.getDate();

            const openDayDetail = () => {
              setSelectedDay({ date: dateStr(day), day });
              setDayDetailModalOpen(true);
            };

            return (
              <div
                key={day}
                className={`min-h-[100px] border-b border-r border-slate-100 flex flex-col p-2 transition-colors hover:bg-slate-50/80 ${
                  isToday ? "bg-indigo-50/50" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-sm font-medium ${
                      isToday ? "text-indigo-700 font-bold" : "text-slate-700"
                    }`}
                  >
                    {day}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {hasContent && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-70 hover:opacity-100"
                        onClick={openDayDetail}
                        aria-label="Ver eventos do dia"
                        title="Ver eventos do dia"
                      >
                        <Expand className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-70 hover:opacity-100"
                      onClick={() => openAddModal(day, undefined)}
                      aria-label="Adicionar evento"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-end min-h-0">
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400 self-center mt-2" />
                  ) : hasContent ? (
                    <button
                      type="button"
                      onClick={openDayDetail}
                      className="text-left mt-auto pt-1 text-xs text-slate-500 hover:text-indigo-600 hover:underline truncate"
                    >
                      {dayEvents.length > 0 && (
                        <span className="font-medium text-indigo-600">{dayEvents.length} agendado(s)</span>
                      )}
                      {dayEvents.length > 0 && daySuggestions.length > 0 && " · "}
                      {daySuggestions.length > 0 && (
                        <span className="text-amber-600">{daySuggestions.length} sugestão(ões)</span>
                      )}
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {trailing.map((_, i) => (
            <div key={`trail-${i}`} className="min-h-[100px] border-b border-r border-slate-100 bg-slate-50/50" />
          ))}
        </div>
      </div>

      <Modal
        open={dayDetailModalOpen}
        onClose={() => {
          setDayDetailModalOpen(false);
          setSelectedDay(null);
        }}
        title={
          selectedDay
            ? `Eventos do dia ${selectedDay.day}/${month + 1}/${year}`
            : "Eventos do dia"
        }
        className="max-w-lg"
      >
        {selectedDay && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Matérias agendadas
              </h3>
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              ) : getEventsForDay(selectedDay.day).length === 0 ? (
                <p className="text-sm text-slate-500 py-4">Nenhuma matéria agendada para este dia.</p>
              ) : (
                <ul className="space-y-2">
                  {getEventsForDay(selectedDay.day)
                    .sort((a, b) => (a.scheduled_time ?? "").localeCompare(b.scheduled_time ?? ""))
                    .map((ev) => (
                      <li
                        key={ev.id}
                        className="group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-sm ring-1 ring-black/5"
                        style={{
                          backgroundColor: ev.subjects?.color_code ?? "#4F46E5",
                          color: "white",
                        }}
                      >
                        {ev.scheduled_time && (
                          <span className="font-bold tabular-nums shrink-0">{ev.scheduled_time}</span>
                        )}
                        <span className="flex-1">{ev.subjects?.title ?? "?"}</span>
                        <span className="opacity-90 text-xs shrink-0">{ev.duration_minutes} min</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="p-1.5 rounded-lg hover:bg-white/25 transition-colors opacity-80 hover:opacity-100"
                          aria-label="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {getSuggestionsForDay(selectedDay.day).filter((s) => !alreadyHasEvent(s.date, s.subject_id))
              .length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Sugestões de estudo
                </h3>
                <ul className="space-y-2">
                  {getSuggestionsForDay(selectedDay.day)
                    .filter((s) => !alreadyHasEvent(s.date, s.subject_id))
                    .map((s, i) => (
                      <li
                        key={`sug-${s.date}-${s.subject_id}-${i}`}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm bg-slate-50 border border-dashed border-slate-200 hover:border-amber-300/60 hover:bg-amber-50/30 transition-all"
                      >
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: s.subject.color_code }}
                        />
                        <span className="flex-1 text-slate-700 font-medium">{s.subject.title}</span>
                        <span className="text-slate-500 text-xs">{s.suggested_duration_minutes} min</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => handleAddSuggestion(s)}
                          disabled={submitting}
                        >
                          + Adicionar
                        </Button>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setDayDetailModalOpen(false);
                  openAddModal(selectedDay.day, undefined);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar nova matéria ao dia
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setSelectedDay(null);
        }}
        title={selectedDay ? `Adicionar evento - ${selectedDay.day}/${month + 1}/${year}` : "Adicionar evento"}
      >
        <form onSubmit={handleAddEvent} className="space-y-4">
          <div>
            <Label htmlFor="subject">Matéria</Label>
            <select
              id="subject"
              value={formSubjectId}
              onChange={(e) => setFormSubjectId(e.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            >
              <option value="">Selecione...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="time">Horário</Label>
            <Input
              id="time"
              type="time"
              value={formTime}
              onChange={(e) => setFormTime(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="duration">Duração (minutos)</Label>
            <Input
              id="duration"
              type="number"
              min={15}
              max={480}
              step={15}
              value={formDuration}
              onChange={(e) => setFormDuration(e.target.value)}
              className="mt-1"
            />
          </div>
          {subjects.length === 0 && (
            <p className="text-sm text-amber-600">
              Adicione matérias em &quot;Minhas Matérias&quot; antes de agendar.
            </p>
          )}
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || subjects.length === 0}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
