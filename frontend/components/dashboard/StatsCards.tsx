"use client";

import { useState, useEffect } from "react";
import { Clock, Target, Flame, BookOpen } from "lucide-react";
import { apiGet } from "@/lib/api";

const statConfig = [
  { key: "hours_today", label: "Horas hoje", icon: Clock, color: "text-[#6D44CC]", bg: "bg-[#E6E0F8]/50" },
  { key: "daily_goal", label: "Meta diária", icon: Target, color: "text-[#10B981]", bg: "bg-[#D1FAE5]" },
  { key: "streak_days", label: "Sequência", icon: Flame, color: "text-[#F38B4B]", bg: "bg-[#FFF2E9]" },
  { key: "active_subjects", label: "Matérias ativas", icon: BookOpen, color: "text-[#8B5CF6]", bg: "bg-[#F5F3FF]" },
];

export function StatsCards() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet("/dashboard/stats").then(setStats).finally(() => setLoading(false));
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {statConfig.map(({ key, label, icon: Icon, color, bg }) => (
        <div key={key} className="rounded-2xl border border-[#E6E0F8] bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold text-[#1A1A1A]">
                {loading ? "..." : (stats?.[key] || "—")}
              </p>
            </div>
            <div className={`rounded-xl p-3 ${bg} ${color}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}