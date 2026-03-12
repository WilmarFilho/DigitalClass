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
      <div className="min-h-screen bg-slate-50">
        <Sidebar
          userName={userName}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        <main
          className={cn(
            "transition-all duration-300",
            sidebarCollapsed ? "pl-[72px]" : "pl-64"
          )}
        >
          <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-4 border-b border-slate-200 bg-white px-6">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 hidden sm:block">
                {new Date().toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
              <AuthButton />
            </div>
          </header>

          <div className="p-6">{children}</div>
        </main>
      </div>
    </RoleProvider>
  );
}
