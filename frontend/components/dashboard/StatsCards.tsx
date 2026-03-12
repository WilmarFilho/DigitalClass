"use client";

import { useState, useEffect } from "react";
import { Clock, Target, Flame, BookOpen, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api";

interface DashboardStats {
  hours_today: string;
  daily_goal: string;
  streak_days: number;
  active_subjects: number;
}

const statConfig = [
  { key: "hours_today" as const, label: "Horas hoje", icon: Clock, color: "text-blue-600 bg-blue-100" },
  { key: "daily_goal" as const, label: "Meta diária", icon: Target, color: "text-emerald-600 bg-emerald-100" },
  { key: "streak_days" as const, label: "Sequência", icon: Flame, color: "text-amber-600 bg-amber-100" },
  { key: "active_subjects" as const, label: "Matérias ativas", icon: BookOpen, color: "text-violet-600 bg-violet-100" },
];

export function StatsCards() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<DashboardStats>("/dashboard/stats")
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const formatValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return "—";
    if (key === "streak_days") return `${value} dia${Number(value) !== 1 ? "s" : ""}`;
    return String(value);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex items-center justify-center min-h-[80px]"
          >
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statConfig.map(({ key, label, icon: Icon, color }) => (
        <div
          key={key}
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">
                {stats ? formatValue(key, stats[key]) : "—"}
              </p>
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
