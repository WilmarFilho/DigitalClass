"use client";

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
  Users,
  MonitorPlay,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";

const studentNav = [
  { href: "/protected", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/protected/calendario", icon: Calendar, label: "Calendário" },
  { href: "/protected/materias", icon: BookOpen, label: "Minhas Matérias" },
  { href: "/protected/estudos", icon: Brain, label: "Meus Estudos" },
  { href: "/protected/professores", icon: GraduationCap, label: "Meus Professores" },
];

const teacherNav = [
  { href: "/protected", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/protected/minha-area", icon: MonitorPlay, label: "Minha Área" },
  { href: "/protected/meus-alunos", icon: UsersRound, label: "Meus Alunos" },
];

const bottomNav = [
  { href: "/protected/perfil", icon: User, label: "Perfil" },
  { href: "/protected/configuracoes", icon: Settings, label: "Configurações" },
];

interface SidebarProps {
  userName?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({
  userName = "Estudante",
  collapsed = false,
  onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();
  const { role } = useRole();
  const mainNav = role === "teacher" ? teacherNav : studentNav;

  const isActive = (href: string) =>
    href === "/protected"
      ? pathname === href
      : pathname.startsWith(href);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-slate-800 text-white transition-all duration-300 flex flex-col",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-slate-700/50 px-4",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <Link href="/protected" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
              <GraduationCap className="h-5 w-5" />
            </div>
            <span className="font-bold text-slate-100">Digital Class</span>
          </Link>
        )}
        <button
          onClick={() => onCollapsedChange?.(!collapsed)}
          className="rounded-lg p-1.5 hover:bg-slate-700/50 transition-colors"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Usuário + badge de papel */}
      {!collapsed && (
        <div className="border-b border-slate-700/50 px-4 py-3">
          <p className="text-xs text-slate-400">Olá,</p>
          <p className="font-semibold truncate">{userName}</p>
          <span
            className={cn(
              "mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors",
              role === "teacher"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-indigo-500/20 text-indigo-300"
            )}
          >
            {role === "teacher" ? (
              <GraduationCap className="h-3 w-3" />
            ) : (
              <Users className="h-3 w-3" />
            )}
            {role === "teacher" ? "Professor" : "Estudante"}
          </span>
        </div>
      )}

      {/* Nav principal */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-1">
          {mainNav.map(({ href, icon: Icon, label }) => (
            <li key={href}>
              <Link
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  isActive(href)
                    ? "bg-indigo-500/20 text-indigo-300 border-l-2 border-indigo-400"
                    : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Nav inferior */}
      <div className="border-t border-slate-700/50 px-3 py-3">
        <ul className="space-y-1">
          {bottomNav.map(({ href, icon: Icon, label }) => (
            <li key={href}>
              <Link
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 transition-colors text-sm",
                  isActive(href)
                    ? "bg-indigo-500/20 text-indigo-300"
                    : "text-slate-400 hover:bg-slate-700/50 hover:text-slate-200",
                  collapsed && "justify-center px-2"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
