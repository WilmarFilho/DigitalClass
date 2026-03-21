"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { AuthButton } from "@/components/auth-button";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

export function DashboardLayout({
  children,
  userName,
  userRole,
}: {
  children: React.ReactNode;
  userName: string;
  userRole: "student" | "teacher";
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const { t, lang } = useTranslation();

  return (
    <div className="min-h-screen bg-[#F8F7FF] dark:bg-slate-950 font-poppins flex">
      {/* Sidebar fixa */}
      <Sidebar
        userName={userName}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Área Principal - O ajuste de largura acontece aqui */}
      <main
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-500 ease-[0.22, 1, 0.36, 1]",
          // No Desktop: Margem baseada no estado da sidebar
          sidebarCollapsed ? "md:ml-[80px]" : "md:ml-72",
          // No Mobile: Ocupa a tela toda
          "w-full md:w-auto" // w-auto no desktop permite que a margem funcione sem estourar
        )}
        style={{ width: "-webkit-fill-available" }}
      >
        {/* Header Superior */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#E6E0F8] dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-8">
          <div className="flex flex-col">
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
              {/* AQUI TEM QUE SER DINAMICO DE ACORDO COM A LANGUAGE */}
              {new Date().toLocaleDateString(lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <AuthButton />
          </div>
        </header>

        {/* Conteúdo com largura controlada */}
        <div className="p-6 md:p-10 w-full max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}