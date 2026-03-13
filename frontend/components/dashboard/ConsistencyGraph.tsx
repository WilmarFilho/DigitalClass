"use client";

import { cn } from "@/lib/utils";

const colors = ["bg-[#E6E0F8]", "bg-[#D1FAE5]", "bg-[#34D399]", "bg-[#10B981]", "bg-[#059669]"];

export function ConsistencyGraph() {
  return (
    <div className="rounded-2xl border border-[#E6E0F8] bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-[#1A1A1A] mb-6">Consistência</h3>
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {/* Aqui iria o map dos dados reais */}
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            {Array.from({ length: 7 }).map((_, j) => (
              <div key={j} className={cn("w-3.5 h-3.5 rounded-sm", colors[Math.floor(Math.random() * 5)])} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        <span>Menos</span>
        <div className="flex gap-1">
          {colors.map((c) => (
            <div key={c} className={cn("w-3 h-3 rounded-sm", c)} />
          ))}
        </div>
        <span>Mais</span>
      </div>
    </div>
  );
}