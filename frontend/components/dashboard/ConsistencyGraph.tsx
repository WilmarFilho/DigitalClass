"use client";

import { cn } from "@/lib/utils";

// Estilo GitHub Contributions - últimos 12 semanas (84 dias)
// Dados fixos para evitar hydration mismatch (Math.random difere entre server/client)
const WEEKS = 12;
const DAYS_PER_WEEK = 7;

const mockContributions: number[] = Array.from(
  { length: WEEKS * DAYS_PER_WEEK },
  (_, i) => [2, 3, 4, 1, 0, 2, 3, 4, 3, 2, 1, 0, 2, 3, 4, 3, 2, 1, 0, 2][i % 20]
);

const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function ConsistencyGraph() {
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
              const level = mockContributions[col * DAYS_PER_WEEK + row] ?? 0;
              const colors = [
                "bg-slate-100",
                "bg-emerald-200",
                "bg-emerald-400",
                "bg-emerald-600",
                "bg-emerald-800",
              ];
              return (
                <div
                  key={col}
                  className={cn(
                    "w-3 h-3 rounded-sm",
                    colors[level]
                  )}
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
          {["bg-slate-100", "bg-emerald-200", "bg-emerald-400", "bg-emerald-600", "bg-emerald-800"].map(
            (c) => (
              <div key={c} className={cn("w-3 h-3 rounded-sm", c)} />
            )
          )}
        </div>
        <span>Mais</span>
      </div>
    </div>
  );
}
