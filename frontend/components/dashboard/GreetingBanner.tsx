"use client";

import { BookOpen } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export function GreetingBanner({ userName = "Estudante" }: { userName?: string }) {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  
  const getGreeting = () => {
    if (hour < 12) return t("greeting.morning");
    if (hour < 18) return t("greeting.afternoon");
    return t("greeting.evening");
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#6D44CC] p-8 text-white shadow-xl shadow-[#6D44CC]/20">
      <div className="relative z-10">
        <h1 className="text-3xl font-bold tracking-tight">
          {getGreeting()}, <span className="text-[#F38B4B]">{userName}!</span>
        </h1>
        <p className="text-[#E6E0F8] mt-2 text-lg max-w-md font-medium opacity-90">
          {t("greeting.description")}
        </p>
      </div>
      {/* Ícone decorativo em marca d'água */}
      <BookOpen className="absolute right-[-20px] top-[-20px] h-48 w-48 text-white/10 -rotate-12 pointer-events-none" />
    </div>
  );
}