"use client";

import { useState, useEffect } from "react";
import {
  Settings,
  Bell,
  Palette,
  Shield,
  Globe,
  Moon,
  Sun,
  Monitor,
  Volume2,
  Mail,
  Smartphone,
  Eye,
  EyeOff,
  ChevronRight,
  Lock,
  Download,
  Trash2,
  Link2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useTranslation } from "@/hooks/useTranslation";

export default function ConfiguracoesPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t, lang: language } = useTranslation();

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = (lang: string) => {
    localStorage.setItem("dc-language", lang);
    // Update html lang attribute
    document.documentElement.lang = lang;
    window.dispatchEvent(new Event('languageChange'));
  };

  const currentTheme = mounted ? theme : "system";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8 pb-12"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-400" />
          {t("settings.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 ml-8">{t("settings.subtitle")}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Coluna Esquerda */}
        <div className="space-y-6">
          <Section icon={Palette} title={t("settings.appearance")}>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{t("settings.systemTheme")}</p>
                  {mounted && resolvedTheme && (
                    <span className="inline-flex items-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter">
                      {resolvedTheme === "dark" ? `${t("settings.themeDark")} ${t("settings.themeActive")}` : `${t("settings.themeLight")} ${t("settings.themeActive")}`}
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: "light", label: t("settings.themeLight"), icon: Sun, colors: "bg-white border-slate-200" },
                    { value: "dark", label: t("settings.themeDark"), icon: Moon, colors: "bg-slate-900 border-slate-800" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setTheme(item.value)}
                      className={cn(
                        "group relative flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-200",
                        currentTheme === item.value
                          ? "border-indigo-600 bg-white dark:bg-slate-800 ring-4 ring-indigo-50 dark:ring-indigo-900/30 shadow-sm"
                          : "border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-800"
                      )}
                    >
                      <div className={cn("h-8 w-full rounded-lg border shadow-inner", item.colors)} />
                      <div className="flex items-center gap-2">
                        <item.icon className={cn("h-4 w-4", currentTheme === item.value ? "text-indigo-600" : "text-slate-400")} />
                        <span className={cn("text-xs font-bold", currentTheme === item.value ? "text-slate-900 dark:text-white" : "text-slate-500 dark:text-slate-400")}>
                          {item.label}
                        </span>
                      </div>
                      {currentTheme === item.value && (
                        <motion.div layoutId="activeTheme" className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-sm">
                          <div className="h-1.5 w-1.5 bg-white rounded-full" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <label className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 block">{t("settings.language")}</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                  </select>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {t("settings.langInfo")}
                </p>
              </div>
            </div>
          </Section>

          <SectionWithOverlay icon={Shield} title={t("settings.privacy")}>
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
              <ToggleRow
                icon={Eye}
                label={t("settings.publicProfile")}
                description={t("settings.publicProfileDesc")}
                value={true}
                onChange={() => { }}
              />
              <ToggleRow
                icon={EyeOff}
                label={t("settings.learningData")}
                description={t("settings.learningDataDesc")}
                value={false}
                onChange={() => { }}
              />
            </div>
          </SectionWithOverlay>
        </div>

        {/* Coluna Direita */}
        <div className="space-y-6">
          <SectionWithOverlay icon={Bell} title={t("settings.notifications")}>
            <div className="divide-y divide-slate-50 dark:divide-slate-700">
              <ToggleRow
                icon={Mail}
                label={t("settings.newsletter")}
                description={t("settings.newsletterDesc")}
                value={true}
                onChange={() => { }}
              />
              <ToggleRow
                icon={Smartphone}
                label={t("settings.mobileAlerts")}
                description={t("settings.mobileAlertsDesc")}
                value={true}
                onChange={() => { }}
              />
              <ToggleRow
                icon={Volume2}
                label={t("settings.soundFeedback")}
                description={t("settings.soundFeedbackDesc")}
                value={true}
                onChange={() => { }}
              />
            </div>
          </SectionWithOverlay>

          <SectionWithOverlay icon={Globe} title={t("settings.security")}>
            <div className="space-y-1">
              <LinkRow icon={Lock} label={t("settings.accountSecurity")} sublabel={t("settings.accountSecurityDesc")} />
              <LinkRow icon={Link2} label={t("settings.connectedAccounts")} sublabel={t("settings.connectedAccountsDesc")} />
              <LinkRow icon={Download} label={t("settings.downloadData")} sublabel={t("settings.downloadDataDesc")} />
              <div className="pt-2">
                <LinkRow icon={Trash2} label={t("settings.deleteAccount")} destructive />
              </div>
            </div>
          </SectionWithOverlay>

          <div className="flex flex-col items-center gap-2 pt-4">
            <div className="h-10 w-32 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center p-1">
              <div className="h-full w-1/2 bg-white dark:bg-slate-700 rounded-full shadow-sm flex items-center justify-center">
                <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase">Beta</span>
              </div>
              <div className="h-full w-1/2 flex items-center justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase">v1.1.0</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
              Digital Class Ecosystem
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Componentes ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-600">
      <div className="px-6 py-4 border-bottom border-slate-50 bg-slate-50/30 dark:bg-slate-800/70 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function SectionWithOverlay({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="relative rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-bottom border-slate-50 bg-slate-50/30 dark:bg-slate-800/70 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight">{title}</h2>
      </div>
      <div className="p-6 select-none">{children}</div>
      {/* Overlay "Em breve" */}
      <div className="absolute inset-0 z-10 bg-white/70 dark:bg-slate-900/70 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-3xl cursor-default">
        <div className="px-5 py-2.5 rounded-2xl bg-slate-900 dark:bg-white shadow-xl">
          <span className="text-sm font-black text-white dark:text-slate-900 uppercase tracking-widest">{t("settings.comingSoon")}</span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 font-medium">{t("settings.workingOnIt")}</p>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToggleRow({ icon: Icon, label, description, value, onChange }: any) {
  return (
    <div className="flex items-center gap-4 py-4 group">
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all",
        value ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" : "bg-slate-100 dark:bg-slate-700 text-slate-400"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed pr-4">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none focus:ring-2 focus:ring-indigo-500/20",
          value ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-600"
        )}
      >
        <motion.span
          animate={{ x: value ? 20 : 0 }}
          className="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform"
        />
      </button>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LinkRow({ icon: Icon, label, sublabel, destructive = false }: any) {
  return (
    <button className="flex w-full items-center gap-4 py-3 px-3 -mx-3 rounded-2xl transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 group">
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors",
        destructive ? "bg-red-50 dark:bg-red-900/20 text-red-500" : "bg-slate-100 dark:bg-slate-700 text-slate-400 group-hover:bg-white dark:group-hover:bg-slate-600 group-hover:shadow-sm"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 text-left">
        <p className={cn("text-sm font-bold", destructive ? "text-red-600 dark:text-red-400" : "text-slate-800 dark:text-slate-200")}>
          {label}
        </p>
        {sublabel && <p className="text-xs text-slate-400 font-medium">{sublabel}</p>}
      </div>
      <ChevronRight className={cn("h-4 w-4 transition-transform group-hover:translate-x-1", destructive ? "text-red-200" : "text-slate-300 dark:text-slate-500")} />
    </button>
  );
}