"use client";

import { Clock, Target, Flame, BookOpen } from "lucide-react";

const mockStats = [
  { label: "Horas hoje", value: "1h 30min", icon: Clock, color: "text-blue-600 bg-blue-100" },
  { label: "Meta diária", value: "2h", icon: Target, color: "text-emerald-600 bg-emerald-100" },
  { label: "Sequência", value: "5 dias", icon: Flame, color: "text-amber-600 bg-amber-100" },
  { label: "Matérias ativas", value: "4", icon: BookOpen, color: "text-violet-600 bg-violet-100" },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {mockStats.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{value}</p>
            </div>
            <div className={`rounded-lg p-2 ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
