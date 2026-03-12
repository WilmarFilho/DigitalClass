"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";

const WEEKS = 12;
const DAYS_PER_WEEK = 7;
const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function ConsistencyGraph() {
  const [contributions, setContributions] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<number[]>("/dashboard/consistency")
      .then(setContributions)
      .catch(() => setContributions(null))
      .finally(() => setLoading(false));
  }, []);

  const colors = [
    "bg-slate-100",
    "bg-emerald-200",
    "bg-emerald-400",
    "bg-emerald-600",
    "bg-emerald-800",
  ];

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-3">Consistência</h3>
        <div className="h-[120px] flex items-center justify-center">
          <div className="animate-pulse flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                {Array.from({ length: 12 }).map((_, j) => (
                  <div key={j} className="w-3 h-3 rounded-sm bg-slate-200" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const data = contributions ?? Array(WEEKS * DAYS_PER_WEEK).fill(0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-3">Consistência</h3>
      <div className="flex gap-1">
        {Array.from({ length: DAYS_PER_WEEK }, (_, row) => (
          <div key={row} className="flex flex-col gap-1">
            <span className="text-[10px] text-slate-400 h-3 leading-tight">
              {dayLabels[row]}
            </span>
            {Array.from({ length: WEEKS }, (_, col) => {
              const level = data[col * DAYS_PER_WEEK + row] ?? 0;
              return (
                <div
                  key={col}
                  className={cn("w-3 h-3 rounded-sm", colors[Math.min(level, 4)])}
                  title={`Atividade nível ${level + 1}`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex gap-2 mt-2 text-[10px] text-slate-500">
        <span>Menos</span>
        <div className="flex gap-0.5">
          {colors.map((c) => (
            <div key={c} className={cn("w-3 h-3 rounded-sm", c)} />
          ))}
        </div>
        <span>Mais</span>
      </div>
    </div>
  );
}
