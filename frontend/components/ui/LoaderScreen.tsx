"use client";

import { GraduationCap } from "lucide-react";

export function LoaderScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-indigo-50/30 to-slate-100">
      <div className="relative">
        {/* Logo com animação de respiro */}
        <div className="animate-breathe flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-500/30">
          <GraduationCap className="h-10 w-10 text-white" strokeWidth={2} />
        </div>

        {/* Anel orbital */}
        <div className="absolute inset-0 -m-2 animate-spin-slow">
          <div className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-indigo-500" />
          <div className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-indigo-400" />
          <div className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-indigo-600" />
          <div className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-indigo-400" />
          <div className="absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-500/80" />
          <div className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-indigo-500/80" />
          <div className="absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-indigo-500/80" />
          <div className="absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-indigo-500/80" />
        </div>
      </div>

      <p className="mt-8 text-sm font-medium text-slate-600">Carregando sua experiência</p>

      {/* Dots animados */}
      <div className="mt-3 flex gap-1.5">
        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-500 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-500 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-500 [animation-delay:300ms]" />
      </div>

      <div className="mt-6 h-1 w-32 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full w-1/2 animate-slide rounded-full bg-indigo-500" />
      </div>
    </div>
  );
}
