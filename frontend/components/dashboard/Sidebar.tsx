"use client";

import { useState, useEffect } from "react";
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
  MonitorPlay,
  Menu,
  X,
  UsersRound
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { motion, AnimatePresence } from "framer-motion";

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
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ 
  userName = "Estudante", 
  collapsed, 
  onCollapsedChange 
}: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();
  const { role } = useRole();
  const mainNav = role === "teacher" ? teacherNav : studentNav;

  // Fecha o menu mobile automaticamente ao navegar
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/protected" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* HEADER MOBILE (Visível apenas em dispositivos móveis) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-[#E6E0F8] flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#6D44CC] flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-[#1A1A1A] font-poppins">Digital Class</span>
        </div>
        <button 
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-[#6D44CC] hover:bg-[#E6E0F8]/50 rounded-lg transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* OVERLAY MOBILE (Escurece o fundo) */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm z-[55] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR ASIDE */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-[60] h-screen bg-white border-r border-[#E6E0F8] transition-all duration-500 ease-[0.22, 1, 0.36, 1] flex flex-col shadow-sm font-poppins",
          collapsed ? "w-[80px]" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo Section */}
        <div className="flex h-20 items-center px-6 mb-4 justify-between">
          <div className={cn("flex items-center gap-3", collapsed && "md:hidden")}>
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-[#6D44CC] shadow-lg shadow-[#6D44CC]/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            {!collapsed && (
              <span className="text-xl font-bold text-[#1A1A1A] tracking-tight">
                Digital <span className="text-[#F38B4B]">Class</span>
              </span>
            )}
          </div>
          <button 
            className="md:hidden p-2 text-gray-400 hover:text-[#6D44CC]" 
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Perfil do Usuário */}
        {(!collapsed || isMobileOpen) && (
          <div className="mx-4 mb-6 rounded-2xl bg-[#E6E0F8]/30 p-4 border border-[#E6E0F8]/50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#6D44CC] flex items-center justify-center text-white font-bold text-sm shadow-inner">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden text-sm">
                <p className="text-[10px] font-bold uppercase text-[#6D44CC]/60 tracking-wider">
                  {role === "teacher" ? "Professor" : "Estudante"}
                </p>
                <p className="font-bold text-[#4A4A4A] truncate">{userName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navegação Principal */}
        <nav className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          <ul className="space-y-2.5">
            {mainNav.map(({ href, icon: Icon, label }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "group relative flex items-center gap-4 rounded-xl px-4 py-3 font-semibold transition-all duration-300",
                      active 
                        ? "bg-[#6D44CC] text-white shadow-md shadow-[#6D44CC]/20" 
                        : "text-[#4A4A4A] hover:bg-[#E6E0F8]/50 hover:text-[#6D44CC]",
                      collapsed && "md:justify-center md:px-0 h-12 w-12 mx-auto"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0", active ? "text-white" : "text-[#6D44CC]/70")} />
                    {(!collapsed || isMobileOpen) && <span className="text-sm tracking-tight">{label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Navegação Inferior (Perfil e Configurações) */}
        <div className="px-4 py-4 space-y-1.5 border-t border-[#E6E0F8]">
          {bottomNav.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-4 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                  active 
                    ? "bg-[#F38B4B]/10 text-[#F38B4B]" 
                    : "text-[#4A4A4A]/70 hover:bg-gray-50 hover:text-[#6D44CC]",
                  collapsed && "md:justify-center md:px-0 h-10 w-10 mx-auto"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {(!collapsed || isMobileOpen) && <span>{label}</span>}
              </Link>
            );
          })}

          {/* Botão de Toggle (Apenas Desktop) */}
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="hidden md:flex mt-4 w-full items-center justify-center gap-2 rounded-xl bg-gray-50 py-2.5 text-[#6D44CC] hover:bg-[#E6E0F8]/40 transition-all border border-transparent hover:border-[#E6E0F8] active:scale-95"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" /> 
                <span className="text-[10px] font-bold uppercase tracking-widest">Recolher Menu</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}