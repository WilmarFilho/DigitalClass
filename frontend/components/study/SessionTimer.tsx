"use client";

import { useState, useEffect, useRef } from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionTimerProps {
  initialSeconds?: number;
  onTick?: (totalSeconds: number) => void;
  className?: string;
}

export function SessionTimer({
  initialSeconds = 0,
  onTick,
  className = "",
}: SessionTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        onTick?.(next);
        return next;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onTick]);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  const display = h > 0
    ? `${pad(h)}:${pad(m)}:${pad(s)}`
    : `${pad(m)}:${pad(s)}`;

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-2xl bg-white border border-slate-100 shadow-sm transition-all hover:border-slate-200 group",
        className
      )}
      title="Tempo total de estudo"
    >
      <div className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
      </div>
      
      <div className="flex items-center gap-2">
        <Timer className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors" />
        <span className="font-mono text-sm font-black tabular-nums text-slate-700 tracking-tight">
          {display}
        </span>
      </div>
      
      <div className="hidden sm:block border-l border-slate-100 h-4 ml-1 pl-3">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Em sessão
        </span>
      </div>
    </div>
  );
}