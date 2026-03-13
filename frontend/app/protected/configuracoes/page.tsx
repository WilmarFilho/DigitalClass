"use client";

import { useState } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type Theme = "light" | "dark" | "system";
type Language = "pt-BR" | "en" | "es";

export default function ConfiguracoesPage() {
  const [theme, setTheme] = useState<Theme>("system");
  const [language, setLanguage] = useState<Language>("pt-BR");

  const [emailDigest, setEmailDigest] = useState(true);
  const [pushSessions, setPushSessions] = useState(true);
  const [] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);

  const [showProgress, setShowProgress] = useState(true);
  const [shareStats, setShareStats] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8 pb-12"
    >
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Settings className="h-6 w-6 text-slate-400" />
          Configurações
        </h1>
        <p className="text-sm text-slate-500 ml-8">Ajuste suas preferências de interface e privacidade.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Coluna Esquerda */}
        <div className="space-y-6">
          <Section icon={Palette} title="Aparência">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm font-bold text-slate-800">Tema do Sistema</p>
                  <MockBadge />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "light", label: "Claro", icon: Sun, colors: "bg-white border-slate-200" },
                    { value: "dark", label: "Escuro", icon: Moon, colors: "bg-slate-900 border-slate-800" },
                    { value: "system", label: "Sistema", icon: Monitor, colors: "bg-gradient-to-br from-white to-slate-200 border-slate-300" },
                  ].map((item) => (
                    <button
                      key={item.value}
                      onClick={() => setTheme(item.value as Theme)}
                      className={cn(
                        "group relative flex flex-col gap-3 rounded-2xl border p-4 transition-all duration-200",
                        theme === item.value
                          ? "border-indigo-600 bg-white ring-4 ring-indigo-50 shadow-sm"
                          : "border-slate-100 bg-slate-50/50 hover:border-slate-200 hover:bg-white"
                      )}
                    >
                      <div className={cn("h-8 w-full rounded-lg border shadow-inner", item.colors)} />
                      <div className="flex items-center gap-2">
                        <item.icon className={cn("h-4 w-4", theme === item.value ? "text-indigo-600" : "text-slate-400")} />
                        <span className={cn("text-xs font-bold", theme === item.value ? "text-slate-900" : "text-slate-500")}>
                          {item.label}
                        </span>
                      </div>
                      {theme === item.value && (
                        <motion.div layoutId="activeTheme" className="absolute -top-1.5 -right-1.5 h-5 w-5 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                          <div className="h-1.5 w-1.5 bg-white rounded-full" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="text-sm font-bold text-slate-800 mb-3 block">Idioma da Interface</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en">English (US)</option>
                    <option value="es">Español</option>
                  </select>
                </div>
              </div>
            </div>
          </Section>

          <Section icon={Shield} title="Privacidade">
            <div className="divide-y divide-slate-50">
              <ToggleRow
                icon={Eye}
                label="Perfil Público"
                description="Permite que outros alunos vejam seus certificados e progresso."
                value={showProgress}
                onChange={setShowProgress}
              />
              <ToggleRow
                icon={EyeOff}
                label="Dados de Aprendizado"
                description="Compartilhar métricas anônimas com a Digital Class para melhoria da IA."
                value={shareStats}
                onChange={setShareStats}
              />
            </div>
          </Section>
        </div>

        {/* Coluna Direita */}
        <div className="space-y-6">
          <Section icon={Bell} title="Notificações">
            <div className="divide-y divide-slate-50">
              <ToggleRow
                icon={Mail}
                label="Newsletter Semanal"
                description="Destaques da comunidade e novos cursos disponíveis."
                value={emailDigest}
                onChange={setEmailDigest}
              />
              <ToggleRow
                icon={Smartphone}
                label="Alertas Mobile"
                description="Notificações push sobre prazos e novas mensagens."
                value={pushSessions}
                onChange={setPushSessions}
              />
              <ToggleRow
                icon={Volume2}
                label="Feedback Sonoro"
                description="Sons discretos ao completar tarefas e quizzes."
                value={soundEffects}
                onChange={setSoundEffects}
              />
            </div>
          </Section>

          <Section icon={Globe} title="Segurança & Dados">
            <div className="space-y-1">
              <LinkRow icon={Lock} label="Segurança da Conta" sublabel="Alterar senha e 2FA" />
              <LinkRow icon={Link2} label="Contas Conectadas" sublabel="Google, GitHub ou Apple" />
              <LinkRow icon={Download} label="Download de Dados" sublabel="Exportar histórico em JSON/CSV" />
              <div className="pt-2">
                <LinkRow icon={Trash2} label="Excluir Minha Conta" destructive />
              </div>
            </div>
          </Section>

          <div className="flex flex-col items-center gap-2 pt-4">
            <div className="h-10 w-32 bg-slate-100 rounded-full flex items-center justify-center p-1">
               <div className="h-full w-1/2 bg-white rounded-full shadow-sm flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-900 uppercase">Beta</span>
               </div>
               <div className="h-full w-1/2 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">v0.1.0</span>
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

// ─── Componentes Refinados ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:border-slate-300">
      <div className="px-6 py-4 border-bottom border-slate-50 bg-slate-50/30 flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ToggleRow({ icon: Icon, label, description, value, onChange }: any) {
  return (
    <div className="flex items-center gap-4 py-4 group">
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-all",
        value ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-400"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed pr-4">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 outline-none focus:ring-2 focus:ring-indigo-500/20",
          value ? "bg-indigo-600" : "bg-slate-200"
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
    <button className="flex w-full items-center gap-4 py-3 px-3 -mx-3 rounded-2xl transition-all hover:bg-slate-50 group">
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors",
        destructive ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-400 group-hover:bg-white group-hover:shadow-sm"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 text-left">
        <p className={cn("text-sm font-bold", destructive ? "text-red-600" : "text-slate-800")}>
          {label}
        </p>
        {sublabel && <p className="text-xs text-slate-400 font-medium">{sublabel}</p>}
      </div>
      <ChevronRight className={cn("h-4 w-4 transition-transform group-hover:translate-x-1", destructive ? "text-red-200" : "text-slate-300")} />
    </button>
  );
}

function MockBadge() {
  return (
    <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">
      Cloud Sync
    </span>
  );
}