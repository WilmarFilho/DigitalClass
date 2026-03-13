"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { AuthButton } from "@/components/auth-button";
import { RoleProvider } from "@/contexts/RoleContext";
import { cn } from "@/lib/utils";

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

  return (
    <RoleProvider initialRole={userRole}>
      <div className="min-h-screen bg-[#F8F7FF] font-poppins flex">
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
            // No Desktop: Adiciona margem esquerda IGUAL à largura da sidebar
            sidebarCollapsed ? "md:ml-[80px]" : "md:ml-72",
            // No Mobile: Ocupa a tela toda pois a sidebar vira um overlay (gaveta)
            "w-full"
          )}
        >
          {/* Header Superior */}
          <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[#E6E0F8] bg-white/80 backdrop-blur-md px-8">
            <div className="flex flex-col">
              <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
                quinta-feira, 12 de março de 2026
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
    </RoleProvider>
  );
}