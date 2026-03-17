"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Play, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import { Modal } from "@/components/ui/modal";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface CalendarEvent {
  id: string;
  subject_id: string;
  scheduled_date: string;
  duration_minutes: number;
  subjects: { title: string; color_code?: string } | null;
}

const today = new Date();

export function CalendarPreview() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingSessionId, setStartingSessionId] = useState<string | null>(null);
  
  // Modal state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  useEffect(() => {
    setLoading(true);
    apiGet<CalendarEvent[]>(`/calendar/events?month=${monthKey}`)
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [monthKey]);

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDay }, () => null);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1));

  const getEventsForDay = (day: number) => {
    const d = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => e.scheduled_date === d);
  };

  const formatDuration = (mins: number) => {
    if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60 ? `${mins % 60}m` : ""}`;
    return `${mins}min`;
  };

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const todayEvents = isCurrentMonth ? getEventsForDay(today.getDate()) : [];

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate.getDate()) : [];

  return (
    <>
      <div className="rounded-2xl border border-[#E6E0F8] bg-white p-6 shadow-sm">
        {/* Header do Calendário */}
        <div className="flex flex-col min-[470px]:flex-row min-[470px]:items-center justify-between gap-4 min-[470px]:gap-0 mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#F5F3FF] rounded-lg">
              <CalendarIcon className="h-5 w-5 text-[#6D44CC]" />
            </div>
            <h3 className="text-lg font-bold text-[#1A1A1A]">Calendário</h3>
          </div>
          
          <div className="flex items-center justify-between min-[470px]:justify-start gap-3 bg-[#F8F7FF] p-1 rounded-xl border border-[#E6E0F8] w-full min-[470px]:w-auto">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-[#6D44CC]">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-[#4A4A4A] min-w-[110px] text-center uppercase tracking-wider">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white hover:shadow-sm transition-all text-[#6D44CC]">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Grid de Dias */}
        <div className="grid grid-cols-7 gap-2 text-center">
          {DAYS.map((d) => (
            <div key={d} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pb-2">
              {d}
            </div>
          ))}
          
          {padding.map((_, i) => (
            <div key={`pad-${i}`} className="aspect-square" />
          ))}
          
          {days.map((day) => {
            const dayEvents = loading ? [] : getEventsForDay(day);
            const isToday = isCurrentMonth && day === today.getDate();
            const hasEvents = dayEvents.length > 0;
            
            return (
              <div
                key={day}
                onClick={() => hasEvents && setSelectedDate(new Date(year, month, day))}
                className={cn(
                  "aspect-square rounded-xl p-1 flex flex-col items-center justify-between border transition-all relative group",
                  isToday 
                    ? "border-[#6D44CC] bg-[#F5F3FF] ring-1 ring-[#6D44CC]/20" 
                    : "border-transparent hover:border-[#E6E0F8] hover:bg-slate-50",
                  hasEvents ? "cursor-pointer hover:scale-105 active:scale-95 hover:shadow-sm" : "cursor-default"
                )}
              >
                <span className={cn(
                  "text-sm font-bold",
                  isToday ? "text-[#6D44CC]" : "text-[#4A4A4A]"
                )}>
                  {day}
                </span>
                
                {/* Indicadores de Eventos Melhorados */}
                <div className="flex flex-wrap items-center justify-center gap-1 mt-auto pb-1.5 px-0.5">
                  {dayEvents.slice(0, 3).map((e) => (
                    <div
                      key={e.id}
                      className="w-2 h-2 rounded-full shadow-sm ring-1 ring-white/50"
                      style={{ backgroundColor: e.subjects?.color_code || "#6D44CC" }}
                      title={e.subjects?.title}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-[8px] font-bold text-slate-500">+{dayEvents.length - 3}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Seção "Hoje" Refinada */}
        <div className="mt-8 pt-6 border-t border-[#E6E0F8]">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Eventos de Hoje
            </h4>
            <span className="text-[10px] font-bold bg-[#E6E0F8] text-[#6D44CC] px-2 py-1 rounded-md uppercase">
              {today.getDate()} {MONTHS[today.getMonth()].slice(0, 3)}
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-[#6D44CC] border-t-transparent rounded-full animate-spin" /></div>
          ) : todayEvents.length === 0 ? (
            <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-[#E6E0F8]">
               <p className="text-sm text-slate-400 font-medium">Nenhum evento planejado para hoje.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {todayEvents.map((e) => (
                <div
                  key={e.id}
                  className="group flex items-center gap-4 p-3 rounded-2xl bg-white border border-[#E6E0F8] hover:border-[#6D44CC] hover:shadow-md transition-all"
                >
                  <div 
                    className="w-1 h-8 rounded-full" 
                    style={{ backgroundColor: e.subjects?.color_code || "#6D44CC" }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1A1A1A] truncate">
                      {e.subjects?.title || "Sessão de Estudo"}
                    </p>
                    <p className="text-[11px] font-medium text-slate-400">
                      Duração: {formatDuration(e.duration_minutes)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={async () => {
                        setStartingSessionId(e.id);
                        try {
                          const session = await apiPost<{ id: string }>("/study/sessions", { 
                            subject_id: e.subject_id,
                            calendar_event_id: e.id 
                          });
                          router.push(`/protected/estudos/sessao?sessionId=${session.id}&subjectId=${e.subject_id}`);
                        } catch (err) {
                          console.error(err);
                          setStartingSessionId(null);
                        }
                      }}
                      disabled={startingSessionId !== null}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#6D44CC] text-white text-[10px] font-black uppercase tracking-wider hover:bg-[#5B39A8] transition-all disabled:opacity-50"
                    >
                      {startingSessionId === e.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      ESTUDAR
                    </button>
                    <Link href="/protected/calendario">
                      <button className="text-[10px] font-bold text-slate-400 hover:text-[#6D44CC] transition-colors uppercase tracking-wider px-2">
                        DETALHES
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Detalhes do Dia */}
      <Modal
        open={selectedDate !== null}
        onClose={() => setSelectedDate(null)}
        title={`Eventos do dia ${selectedDate ? selectedDate.getDate() : ''}`}
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
          {selectedDayEvents.length === 0 ? (
            <p className="text-center text-sm text-slate-500 italic py-4">Nenhum evento para este dia.</p>
          ) : (
            selectedDayEvents.map((e) => (
              <div
                key={e.id}
                className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div 
                  className="w-1.5 h-10 rounded-full shrink-0" 
                  style={{ backgroundColor: e.subjects?.color_code || "#6D44CC" }}
                />
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800 leading-tight">
                    {e.subjects?.title || "Sessão de Estudo"}
                  </h4>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatDuration(e.duration_minutes)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          
          <div className="pt-4 flex justify-end">
             <Link 
               href="/protected/calendario" 
               className="text-sm font-bold text-[#6D44CC] hover:text-[#5636a5] transition-colors"
             >
               Ir para o calendário completo →
             </Link>
          </div>
        </div>
      </Modal>
    </>
  );
}