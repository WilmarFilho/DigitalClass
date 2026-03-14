"use client";

import { useState } from "react";
import { TeacherSidebar } from "./TeacherSidebar";
import { cn } from "@/lib/utils";

export function TeacherAreaLayout({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#0D0917] font-poppins flex">
      {/* Sidebar fixa do professor */}
      <TeacherSidebar
        userName={userName}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />

      {/* Área Principal */}
      <main
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-500 ease-[0.22, 1, 0.36, 1]",
          sidebarCollapsed ? "md:ml-[80px]" : "md:ml-72",
          "w-full"
        )}
      >
        {/* Conteúdo */}
        <div className="p-6 md:p-10 w-full max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
