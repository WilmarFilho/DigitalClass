"use client";

import { useState, useEffect, useRef } from "react";
import { Timer } from "lucide-react";

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
      className={`flex items-center gap-2 font-mono text-lg font-semibold tabular-nums text-slate-700 ${className}`}
      title="Tempo de sessão"
    >
      <Timer className="h-5 w-5 text-indigo-500" />
      {display}
    </div>
  );
}
