"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { apiGet } from "@/lib/api";

import { useTranslation } from "@/hooks/useTranslation";

const colors = ["bg-[#E6E0F8]", "bg-[#D1FAE5]", "bg-[#34D399]", "bg-[#10B981]", "bg-[#059669]"];

export function ConsistencyGraph() {
  const { t } = useTranslation();
  const [data, setData] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<number[]>("/dashboard/consistency")
      .then((res) => setData(res))
      .catch((err) => console.error("Error fetching consistency data:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl border border-[#E6E0F8] bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-[#1A1A1A] mb-6">{t("dashboard.consistency")}</h3>
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {loading ? (
          // Skeleton loader
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5 animate-pulse">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="w-3.5 h-3.5 rounded-sm bg-slate-100" />
              ))}
            </div>
          ))
        ) : (
          Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              {Array.from({ length: 7 }).map((_, j) => {
                const level = data?.[i * 7 + j] || 0;
                return (
                  <div key={j} className={cn("w-3.5 h-3.5 rounded-sm", colors[level] || colors[0])} />
                );
              })}
            </div>
          ))
        )}
      </div>
      <div className="flex items-center gap-2 mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        <span>{t("dashboard.less")}</span>
        <div className="flex gap-1">
          {colors.map((c) => (
            <div key={c} className={cn("w-3 h-3 rounded-sm", c)} />
          ))}
        </div>
        <span>{t("dashboard.more")}</span>
      </div>
    </div>
  );
}