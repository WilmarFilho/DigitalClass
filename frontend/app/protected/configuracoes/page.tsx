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

type Theme = "light" | "dark" | "system";
type Language = "pt-BR" | "en" | "es";

export default function ConfiguracoesPage() {
  const [theme, setTheme] = useState<Theme>("system");
  const [language, setLanguage] = useState<Language>("pt-BR");

  const [emailDigest, setEmailDigest] = useState(true);
  const [pushSessions, setPushSessions] = useState(true);
  const [pushReminders, setPushReminders] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);

  const [showProgress, setShowProgress] = useState(true);
  const [shareStats, setShareStats] = useState(false);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
        <Settings className="h-6 w-6" />
        Configurações
      </h1>

      {/* Grid principal: 2 colunas em telas grandes */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* ── Coluna esquerda ── */}
        <div className="flex flex-col gap-6">

          {/* Aparência */}
          <Section icon={Palette} title="Aparência">
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-slate-700">Tema</p>
                  <MockBadge />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "light", label: "Claro", icon: Sun },
                      { value: "dark", label: "Escuro", icon: Moon },
                      { value: "system", label: "Sistema", icon: Monitor },
                    ] as { value: Theme; label: string; icon: React.ElementType }[]
                  ).map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setTheme(value)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-3 text-sm font-medium transition-all",
                        theme === value
                          ? "border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-200"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-slate-700">Idioma</p>
                  <MockBadge />
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as Language)}
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                >
                  <option value="pt-BR">Português (Brasil)</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>
          </Section>

          {/* Conta */}
          <Section icon={Globe} title="Conta">
            <div className="space-y-1">
              <LinkRow icon={Lock} label="Alterar senha" />
              <Divider />
              <LinkRow icon={Link2} label="Vincular conta Google" />
              <Divider />
              <LinkRow icon={Download} label="Exportar meus dados" />
              <Divider />
              <LinkRow icon={Trash2} label="Excluir conta" destructive />
            </div>
            <MockBadge className="mt-4" />
          </Section>
        </div>

        {/* ── Coluna direita ── */}
        <div className="flex flex-col gap-6">

          {/* Notificações */}
          <Section icon={Bell} title="Notificações">
            <div className="space-y-1">
              <ToggleRow
                icon={Mail}
                label="Resumo semanal por e-mail"
                description="Receba um resumo das suas atividades toda segunda-feira."
                value={emailDigest}
                onChange={setEmailDigest}
              />
              <Divider />
              <ToggleRow
                icon={Smartphone}
                label="Notificações de sessão"
                description="Alertas ao iniciar e encerrar sessões de estudo."
                value={pushSessions}
                onChange={setPushSessions}
              />
              <Divider />
              <ToggleRow
                icon={Bell}
                label="Lembretes de meta diária"
                description="Lembrete quando sua meta do dia não foi cumprida."
                value={pushReminders}
                onChange={setPushReminders}
              />
              <Divider />
              <ToggleRow
                icon={Volume2}
                label="Efeitos sonoros"
                description="Sons ao completar flashcards e quizzes."
                value={soundEffects}
                onChange={setSoundEffects}
              />
            </div>
            <MockBadge className="mt-4" />
          </Section>

          {/* Privacidade */}
          <Section icon={Shield} title="Privacidade">
            <div className="space-y-1">
              <ToggleRow
                icon={Eye}
                label="Mostrar progresso publicamente"
                description="Outros usuários podem ver seu progresso e estatísticas."
                value={showProgress}
                onChange={setShowProgress}
              />
              <Divider />
              <ToggleRow
                icon={EyeOff}
                label="Compartilhar com a instituição"
                description="Permite que sua escola acompanhe seu desempenho geral."
                value={shareStats}
                onChange={setShareStats}
              />
            </div>
            <MockBadge className="mt-4" />
          </Section>

          {/* Versão */}
          <p className="text-center text-xs text-slate-400">
            Digital Class · v0.1.0-beta
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── componentes auxiliares ─────────────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <h2 className="flex items-center gap-2 font-semibold text-slate-800 mb-5">
        <Icon className="h-5 w-5 text-slate-500" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function Divider() {
  return <div className="border-t border-slate-100 my-1" />;
}

function ToggleRow({
  icon: Icon,
  label,
  description,
  value,
  onChange,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          value ? "bg-indigo-500" : "bg-slate-200"
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transition-transform",
            value ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}

function LinkRow({
  icon: Icon,
  label,
  destructive = false,
}: {
  icon: React.ElementType;
  label: string;
  destructive?: boolean;
}) {
  return (
    <button className="flex w-full items-center gap-3 py-3 text-sm transition-colors hover:text-indigo-600 group">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
        <Icon
          className={cn(
            "h-4 w-4 transition-colors",
            destructive ? "text-red-400" : "text-slate-500 group-hover:text-indigo-500"
          )}
        />
      </div>
      <span
        className={cn(
          "flex-1 text-left font-medium",
          destructive ? "text-red-500" : "text-slate-700 group-hover:text-indigo-600"
        )}
      >
        {label}
      </span>
      <ChevronRight
        className={cn(
          "h-4 w-4 transition-transform group-hover:translate-x-0.5",
          destructive ? "text-red-300" : "text-slate-400"
        )}
      />
    </button>
  );
}

function MockBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600",
        className
      )}
    >
      Em breve
    </span>
  );
}
