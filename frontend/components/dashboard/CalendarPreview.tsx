"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface CalendarEvent {
  id: string;
  scheduled_date: string;
  duration_minutes: number;
  subjects: { title: string; color_code?: string } | null;
}

const today = new Date();

export function CalendarPreview() {
  const [currentDate, setCurrentDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
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

  const dateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getEventsForDay = (day: number) => {
    const d = dateStr(day);
    return events.filter((e) => e.scheduled_date === d);
  };

  const formatDuration = (mins: number) => {
    if (mins >= 60) return `${Math.floor(mins / 60)}h${mins % 60 ? `${mins % 60}min` : ""}`;
    return `${mins}min`;
  };

  const colorClass = (hex: string) => {
    const map: Record<string, string> = {
      "#4F46E5": "bg-indigo-500",
      "#059669": "bg-emerald-500",
      "#DC2626": "bg-red-500",
      "#D97706": "bg-amber-500",
    };
    return map[hex] ?? "bg-slate-500";
  };

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const todayEvents = isCurrentMonth ? getEventsForDay(today.getDate()) : [];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Calendário</h3>
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-slate-100">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-slate-100">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {DAYS.map((d) => (
          <div key={d} className="text-slate-500 font-medium py-1">
            {d}
          </div>
        ))}
        {padding.map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const dayEvents = loading ? [] : getEventsForDay(day);
          const isToday = isCurrentMonth && day === today.getDate();
          return (
            <div
              key={day}
              className={cn(
                "min-h-10 rounded-lg p-1 flex flex-col items-center justify-start gap-0.5",
                isToday && "ring-2 ring-indigo-500 bg-indigo-50"
              )}
            >
              <span
                className={cn(
                  "text-sm",
                  isToday ? "font-bold text-indigo-600" : "text-slate-700"
                )}
              >
                {day}
              </span>
              {dayEvents.slice(0, 2).map((e, i) => (
                <div
                  key={e.id}
                  className={cn(
                    "w-full h-1.5 rounded-full truncate",
                    colorClass(e.subjects?.color_code ?? "#4F46E5")
                  )}
                  title={`${e.subjects?.title ?? "?"} - ${formatDuration(e.duration_minutes)}`}
                />
              ))}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500 mb-2">
          Hoje ({today.getDate()} {MONTHS[today.getMonth()]})
        </p>
        {loading ? (
          <p className="text-sm text-slate-500">Carregando...</p>
        ) : todayEvents.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum evento hoje</p>
        ) : (
          <div className="space-y-2">
            {todayEvents.map((e) => (
              <Link
                key={e.id}
                href="/protected/calendario"
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer"
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full shrink-0",
                    colorClass(e.subjects?.color_code ?? "#4F46E5")
                  )}
                />
                <span className="text-sm font-medium flex-1 truncate">
                  {e.subjects?.title ?? "Matéria"}
                </span>
                <span className="text-xs text-slate-500 shrink-0">
                  {formatDuration(e.duration_minutes)}
                </span>
                <span className="text-xs text-indigo-600 font-medium shrink-0">Ver</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
