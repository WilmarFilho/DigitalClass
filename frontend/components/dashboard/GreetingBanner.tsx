"use client";

import { BookOpen } from "lucide-react";

export function GreetingBanner({ userName = "Estudante" }: { userName?: string }) {
  const hour = new Date().getHours();
  let greeting = "Bom dia";
  if (hour >= 12 && hour < 18) greeting = "Boa tarde";
  else if (hour >= 18) greeting = "Boa noite";

  return (
    <div className="rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-800 p-6 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting}, {userName}!
          </h1>
          <p className="text-indigo-200 mt-1">
            Pronto para mais uma sessão de estudos? O calendário está esperando por você.
          </p>
        </div>
        <div className="hidden sm:block opacity-90">
          <div className="rounded-full bg-white/20 p-4">
            <BookOpen className="h-12 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}
