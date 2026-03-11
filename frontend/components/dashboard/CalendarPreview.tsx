"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const today = new Date();

const getMockEvents = () => {
  const d = today.getDate();
  return [
    { date: d, subject: "Matemática", color: "bg-blue-500", hours: "2h" },
    { date: d + 1, subject: "Física", color: "bg-amber-500", hours: "1h30" },
    { date: d + 2, subject: "Química", color: "bg-emerald-500", hours: "2h" },
    { date: d, subject: "Redação", color: "bg-violet-500", hours: "1h" },
    { date: d + 3, subject: "Matemática", color: "bg-blue-500", hours: "2h" },
  ];
};

const mockEvents = getMockEvents();

export function CalendarPreview() {
  const [currentDate, setCurrentDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const padding = Array.from({ length: firstDay }, () => null);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1));

  const getEventsForDay = (day: number) =>
    mockEvents.filter((e) => e.date === day);

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">Calendário</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1 rounded hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium min-w-[100px] text-center">
            {MONTHS[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1 rounded hover:bg-slate-100"
          >
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
          const events = getEventsForDay(day);
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
              {events.slice(0, 2).map((e, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-full h-1.5 rounded-full truncate",
                    e.color
                  )}
                  title={`${e.subject} - ${e.hours}`}
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
        <div className="space-y-2">
          {mockEvents.filter((e) => e.date === today.getDate()).map((e, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 hover:bg-slate-100 cursor-pointer"
            >
              <div className={cn("w-2 h-2 rounded-full", e.color)} />
              <span className="text-sm font-medium flex-1">{e.subject}</span>
              <span className="text-xs text-slate-500">{e.hours}</span>
              <button className="text-xs text-indigo-600 font-medium hover:underline">
                Iniciar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
