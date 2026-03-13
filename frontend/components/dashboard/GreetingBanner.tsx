"use client";

import { BookOpen } from "lucide-react";

export function GreetingBanner({ userName = "Estudante" }: { userName?: string }) {
  const hour = new Date().getHours();
  let greeting = "Bom dia";
  if (hour >= 12 && hour < 18) greeting = "Boa tarde";
  else if (hour >= 18) greeting = "Boa noite";

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#6D44CC] p-8 text-white shadow-xl shadow-[#6D44CC]/20">
      <div className="relative z-10">
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting}, <span className="text-[#F38B4B]">{userName}!</span>
        </h1>
        <p className="text-[#E6E0F8] mt-2 text-lg max-w-md font-medium opacity-90">
          Pronto para mais uma sessão de estudos? O calendário está esperando por você.
        </p>
      </div>
      {/* Ícone decorativo em marca d'água */}
      <BookOpen className="absolute right-[-20px] top-[-20px] h-48 w-48 text-white/10 -rotate-12 pointer-events-none" />
    </div>
  );
}