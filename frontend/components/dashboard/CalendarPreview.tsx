"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface CalendarEvent {
  id: string;
  scheduled_date: string;
  duration_minutes: number;
  subjects: { title: string; color_code?: string } | null;
}

const today = new Date();

export function CalendarPreview() {
  const [currentDate, setCurrentDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="rounded-2xl border border-[#E6E0F8] bg-white p-6 shadow-sm">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#F5F3FF] rounded-lg">
            <CalendarIcon className="h-5 w-5 text-[#6D44CC]" />
          </div>
          <h3 className="text-lg font-bold text-[#1A1A1A]">Calendário</h3>
        </div>
        
        <div className="flex items-center gap-3 bg-[#F8F7FF] p-1 rounded-xl border border-[#E6E0F8]">
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
          
          return (
            <div
              key={day}
              className={cn(
                "aspect-square rounded-xl p-1 flex flex-col items-center justify-between border transition-all relative group cursor-default",
                isToday 
                  ? "border-[#6D44CC] bg-[#F5F3FF] ring-1 ring-[#6D44CC]/20" 
                  : "border-transparent hover:border-[#E6E0F8] hover:bg-slate-50"
              )}
            >
              <span className={cn(
                "text-sm font-bold",
                isToday ? "text-[#6D44CC]" : "text-[#4A4A4A]"
              )}>
                {day}
              </span>
              
              {/* Indicadores de Eventos */}
              <div className="flex gap-0.5 mt-auto pb-1">
                {dayEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: e.subjects?.color_code || "#6D44CC" }}
                  />
                ))}
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
              <Link
                key={e.id}
                href="/protected/calendario"
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
                <button className="text-[11px] font-bold text-[#6D44CC] opacity-0 group-hover:opacity-100 transition-opacity pr-2">
                  DETALHES
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}