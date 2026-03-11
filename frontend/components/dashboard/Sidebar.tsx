"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Brain,
  User,
  Settings,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/protected", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/protected/calendario", icon: Calendar, label: "Calendário" },
  { href: "/protected/materias", icon: BookOpen, label: "Minhas Matérias" },
  { href: "/protected/estudos", icon: Brain, label: "Meus Estudos" },
  { href: "/protected/perfil", icon: User, label: "Perfil" },
  { href: "/protected/configuracoes", icon: Settings, label: "Configurações" },
];

interface SidebarProps {
  userName?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ userName = "Estudante", collapsed = false, onCollapsedChange }: SidebarProps) {
  const isCollapsed = collapsed;
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-slate-800 text-white transition-all duration-300 flex flex-col",
        isCollapsed ? "w-[72px]" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-slate-700/50 px-4",
          isCollapsed ? "justify-center" : "justify-between"
        )}
      >
        {!isCollapsed && (
          <Link href="/protected" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-100">Digital Class</span>
          </Link>
        )}
        <button
          onClick={() => onCollapsedChange?.(!isCollapsed)}
          className="rounded-lg p-1.5 hover:bg-slate-700/50 transition-colors"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {!isCollapsed && (
        <div className="border-b border-slate-700/50 px-4 py-4">
          <p className="text-xs text-slate-400">Olá,</p>
          <p className="font-semibold truncate">{userName}</p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href || (href !== "/protected" && pathname.startsWith(href));
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={isCollapsed ? label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                    isActive
                      ? "bg-indigo-500/20 text-indigo-300 border-l-2 border-indigo-400"
                      : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!isCollapsed && <span>{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {isCollapsed && (
        <div className="border-t border-slate-700/50 p-2 flex justify-center">
          <GraduationCap className="h-6 w-6 text-slate-500" />
        </div>
      )}
    </aside>
  );
}
