"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MonitorPlay,
  UsersRound,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const teacherNav = [
  { href: "/professor/minha-area", icon: MonitorPlay, label: "Minha Área" },
  { href: "/professor/meus-alunos", icon: UsersRound, label: "Meus Alunos" },
];

interface TeacherSidebarProps {
  userName?: string;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function TeacherSidebar({
  userName = "Professor",
  collapsed,
  onCollapsedChange,
}: TeacherSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/professor" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* HEADER MOBILE */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0F0A1F] border-b border-[#2A1F4E] flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#6D44CC] to-[#F38B4B] flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-white font-poppins text-sm">Creator Studio</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-[#6D44CC] hover:bg-white/5 rounded-lg transition-colors"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* OVERLAY MOBILE */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-[60] h-screen bg-[#0F0A1F] border-r border-[#2A1F4E] transition-all duration-500 ease-[0.22, 1, 0.36, 1] flex flex-col font-poppins",
          collapsed ? "w-[80px]" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo Section */}
        <div className="flex h-20 items-center px-6 mb-2 justify-between">
          <div className={cn("flex items-center gap-3", collapsed && "md:hidden")}>
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-[#6D44CC] to-[#F38B4B] shadow-lg shadow-[#6D44CC]/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {!collapsed && (
              <div>
                <span className="text-lg font-bold text-white tracking-tight block leading-tight">
                  Creator <span className="text-[#F38B4B]">Studio</span>
                </span>
                <span className="text-[9px] font-bold text-[#6D44CC]/80 uppercase tracking-[0.2em]">
                  Digital Class
                </span>
              </div>
            )}
          </div>
          <button
            className="md:hidden p-2 text-gray-500 hover:text-white"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Perfil do Professor */}
        {(!collapsed || isMobileOpen) && (
          <div className="mx-4 mb-6 rounded-2xl bg-white/5 p-4 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#6D44CC] to-[#F38B4B] flex items-center justify-center text-white font-bold text-sm shadow-inner">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 overflow-hidden text-sm">
                <p className="text-[10px] font-bold uppercase text-[#F38B4B]/80 tracking-wider">
                  Professor
                </p>
                <p className="font-bold text-white/90 truncate">{userName}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navegação Principal */}
        <nav className="flex-1 overflow-y-auto px-4 custom-scrollbar">
          <ul className="space-y-2.5">
            {teacherNav.map(({ href, icon: Icon, label }) => {
              const active = isActive(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      "group relative flex items-center gap-4 rounded-xl px-4 py-3 font-semibold transition-all duration-300",
                      active
                        ? "bg-gradient-to-r from-[#6D44CC] to-[#6D44CC]/80 text-white shadow-md shadow-[#6D44CC]/30"
                        : "text-white/60 hover:bg-white/5 hover:text-white",
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

        {/* Navegação Inferior */}
        <div className="px-4 py-4 space-y-2 border-t border-[#2A1F4E]">
          <a
            href="/protected"
            className={cn(
              "flex items-center gap-4 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all text-white/50 hover:bg-white/5 hover:text-[#F38B4B]",
              collapsed && "md:justify-center md:px-0 h-10 w-10 mx-auto"
            )}
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            {(!collapsed || isMobileOpen) && <span>Voltar à Plataforma</span>}
          </a>

          {/* Botão de Toggle (Apenas Desktop) */}
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="hidden md:flex mt-2 w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-[#6D44CC] hover:bg-white/10 transition-all border border-transparent hover:border-[#2A1F4E] active:scale-95"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Recolher</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
