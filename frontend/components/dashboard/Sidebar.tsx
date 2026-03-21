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
import { useTranslation } from "@/hooks/useTranslation";
import { motion, AnimatePresence } from "framer-motion";

const studentNav = [
  { href: "/protected", icon: LayoutDashboard, labelKey: "sidebar.dashboard", fallback: "Dashboard", newTab: false },
  { href: "/protected/calendario", icon: Calendar, labelKey: "sidebar.calendario", fallback: "Calendário", newTab: false },
  { href: "/protected/materias", icon: BookOpen, labelKey: "sidebar.materias", fallback: "Minhas Matérias", newTab: false },
  { href: "/protected/estudos", icon: Brain, labelKey: "sidebar.estudos", fallback: "Meus Estudos", newTab: false },
  { href: "/protected/professores", icon: GraduationCap, labelKey: "sidebar.professores", fallback: "Meus Professores", newTab: false },
];

const teacherNav = [
  { href: "/protected", icon: LayoutDashboard, labelKey: "sidebar.dashboard", fallback: "Dashboard", newTab: false },
  { href: "/professor/minha-area", icon: MonitorPlay, labelKey: "sidebar.minhaArea", fallback: "Minhas Áreas", newTab: false },
  { href: "/professor/meus-alunos", icon: UsersRound, labelKey: "sidebar.meusAlunos", fallback: "Meus Alunos", newTab: false },
];

const bottomNav = [
  { href: "/protected/perfil", icon: User, labelKey: "sidebar.perfil", fallback: "Perfil" },
  { href: "/protected/configuracoes", icon: Settings, labelKey: "sidebar.configuracoes", fallback: "Configurações" },
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
  const { t } = useTranslation();
  const mainNav = role === "teacher" ? teacherNav : studentNav;

  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/protected" ? pathname === href : pathname.startsWith(href);

  // Variantes com 'as const' para evitar erros de tipagem no Ease
  const textVariants = {
    hidden: { opacity: 0, width: 0, x: -10 },
    visible: {
      opacity: 1,
      width: "auto",
      x: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      width: 0,
      x: -10,
      transition: { duration: 0.2, ease: "easeIn" }
    }
  } as const;

  return (
    <>
      {/* HEADER MOBILE */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-[#E6E0F8] dark:border-slate-800 flex items-center justify-between px-6 z-50">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[#6D44CC] flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-[#1A1A1A] dark:text-white font-poppins">Digital Class</span>
        </div>
        <button
          onClick={() => setIsMobileOpen(true)}
          className="p-2 text-[#6D44CC] hover:bg-[#E6E0F8]/50 rounded-lg transition-colors"
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
            className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm z-[55] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* SIDEBAR ASIDE */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-[60] h-screen bg-white dark:bg-slate-900 border-r border-[#E6E0F8] dark:border-slate-800 transition-all duration-500 ease-[0.22,1,0.36,1] flex flex-col shadow-sm font-poppins overflow-x-hidden",
          collapsed ? "w-[80px]" : "w-72",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo Section */}
        <div className="flex h-20 shrink-0 items-center px-6 mb-4 justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-[#6D44CC] shadow-lg shadow-[#6D44CC]/20">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <AnimatePresence mode="wait">
              {(!collapsed || isMobileOpen) && (
                <motion.span
                  variants={textVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="text-xl font-bold text-[#1A1A1A] dark:text-white tracking-tight whitespace-nowrap overflow-hidden"
                >
                  Digital <span className="text-[#F38B4B]">Class</span>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <button className="md:hidden p-2 text-gray-400" onClick={() => setIsMobileOpen(false)}>
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Perfil do Usuário */}
        {!collapsed && (
          <div className="px-4 mb-6">
            <div className={cn(
              "rounded-2xl bg-[#E6E0F8]/30 dark:bg-slate-800 border border-[#E6E0F8]/50 dark:border-slate-700 transition-all duration-300 overflow-hidden",
              collapsed ? "p-2" : "p-4"
            )}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-[#6D44CC] flex items-center justify-center text-white font-bold text-sm shadow-inner">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <AnimatePresence>
                  {(!collapsed || isMobileOpen) && (
                    <motion.div
                      variants={textVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="flex-1 overflow-hidden"
                    >
                      <p className="text-[10px] font-bold uppercase text-[#6D44CC]/60 tracking-wider whitespace-nowrap">
                        {role === "teacher" ? t("sidebar.professor") : t("sidebar.estudante")}
                      </p>
                      <p className="font-bold text-[#4A4A4A] dark:text-slate-200 truncate whitespace-nowrap">{userName}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* Navegação Principal */}
        <nav className="flex-1 overflow-y-auto px-4 custom-scrollbar overflow-x-hidden">
          <ul className="space-y-2.5">
            {mainNav.map(({ href, icon: Icon, labelKey, fallback, newTab }) => {
              const active = !newTab && isActive(href);
              const Tag = newTab ? "a" : Link;
              const translatedLabel = t(labelKey) !== labelKey ? t(labelKey) : fallback;
              return (
                <li key={href}>
                  <Tag
                    href={href}
                    className={cn(
                      "group relative flex items-center gap-4 rounded-xl px-4 py-3 font-semibold transition-all duration-300",
                      active
                        ? "bg-[#6D44CC] text-white shadow-md shadow-[#6D44CC]/20"
                        : "text-[#4A4A4A] dark:text-slate-300 hover:bg-[#E6E0F8]/50 dark:hover:bg-slate-800 hover:text-[#6D44CC]",
                      collapsed && "md:justify-center md:px-0 h-12 w-12 mx-auto"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 shrink-0 transition-colors", active ? "text-white" : "text-[#6D44CC]/70")} />
                    <AnimatePresence>
                      {(!collapsed || isMobileOpen) && (
                        <motion.span
                          variants={textVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="text-sm tracking-tight whitespace-nowrap overflow-hidden"
                        >
                          {translatedLabel}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Tag>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Navegação Inferior */}
        <div className="px-4 py-4 space-y-1.5 border-t border-[#E6E0F8] dark:border-slate-800">
          {bottomNav.map(({ href, icon: Icon, labelKey, fallback }) => {
            const active = isActive(href);
            const translatedLabel = t(labelKey) !== labelKey ? t(labelKey) : fallback;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-4 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                  active
                    ? "bg-[#F38B4B]/10 text-[#F38B4B]"
                    : "text-[#4A4A4A]/70 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 hover:text-[#6D44CC]",
                  collapsed && "md:justify-center md:px-0 h-10 w-10 mx-auto"
                )}
              >
                <Icon className="h-4 w-4 shrink-0 transition-colors" />
                <AnimatePresence>
                  {(!collapsed || isMobileOpen) && (
                    <motion.span
                      variants={textVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="whitespace-nowrap overflow-hidden"
                    >
                      {translatedLabel}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            );
          })}

          {/* Botão de Toggle */}
          <button
            onClick={() => onCollapsedChange(!collapsed)}
            className="hidden md:flex mt-4 w-full items-center justify-center min-h-[40px] gap-2 rounded-xl bg-gray-50 dark:bg-slate-800 text-[#6D44CC] hover:bg-[#E6E0F8]/40 dark:hover:bg-slate-700 transition-all border border-transparent hover:border-[#E6E0F8] dark:hover:border-slate-700 active:scale-95 overflow-hidden"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5 shrink-0" />
            ) : (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 whitespace-nowrap"
              >
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t("sidebar.recolher")}</span>
              </motion.div>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}