"use client";

import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Clock,
  Target,
  Sparkles,
  GraduationCap,
  BookOpen,
  ArrowLeftRight,
  Loader2,
  CheckCircle2,
  Hash,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";

interface Profile {
  id: string;
  role: "student" | "teacher";
  full_name: string | null;
  learning_goals: string[] | null;
  interests: string[] | null;
  hours_per_day: number | null;
}

interface AuthUser {
  email: string;
  full_name: string;
  avatar_url: string | null;
}

export default function PerfilPage() {
  const { setRole } = useRole();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [switched, setSwitched] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setAuthUser({
          email: user.email ?? "",
          full_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Usuário",
          avatar_url: user.user_metadata?.avatar_url ?? null,
        });
      }
      try {
        const p = await apiGet<Profile>("/profiles/me");
        setProfile(p);
      } catch {
        // sem perfil ainda
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleSwitchRole = async () => {
    if (!profile) return;
    const newRole = profile.role === "student" ? "teacher" : "student";
    setSwitching(true);
    try {
      const updated = await apiPost<Profile>("/profiles", {
        role: newRole,
        full_name: profile.full_name,
        learning_goals: profile.learning_goals,
        interests: profile.interests,
        hours_per_day: profile.hours_per_day,
      });
      setProfile(updated);
      setRole(updated.role);
      setSwitched(true);
      setTimeout(() => setSwitched(false), 2500);
    } catch {
      // silencia
    } finally {
      setSwitching(false);
    }
  };

  const roleLabel = (role: string) =>
    role === "teacher" ? "Professor" : "Estudante";

  const roleColor = (role: string) =>
    role === "teacher"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : "bg-indigo-100 text-indigo-700 border-indigo-200";

  const RoleIcon = profile?.role === "teacher" ? GraduationCap : BookOpen;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const displayName = profile?.full_name || authUser?.full_name || "Usuário";
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
        <User className="h-6 w-6" />
        Meu Perfil
      </h1>

      {/* Grid principal: 3 colunas em telas grandes */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* ── Coluna esquerda: card de identidade ── */}
        <div className="lg:col-span-1 flex flex-col gap-6">

          {/* Card de avatar + nome */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="h-28 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
            <div className="px-6 pb-6">
              <div className="-mt-12 mb-4">
                {authUser?.avatar_url ? (
                  <img
                    src={authUser.avatar_url}
                    alt={displayName}
                    className="h-24 w-24 rounded-2xl border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-2xl border-4 border-white shadow-lg bg-indigo-600 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white">{initials}</span>
                  </div>
                )}
              </div>
              <h2 className="text-lg font-bold text-slate-900">{displayName}</h2>
              {profile?.role && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 mt-2 rounded-full border px-3 py-1 text-xs font-semibold",
                    roleColor(profile.role)
                  )}
                >
                  <RoleIcon className="h-3.5 w-3.5" />
                  {roleLabel(profile.role)}
                </span>
              )}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate">{authUser?.email ?? "—"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Hash className="h-4 w-4 text-slate-400 shrink-0" />
                  <span className="truncate font-mono text-xs">{profile?.id?.slice(0, 16) ?? "—"}…</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card de meta diária */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">Meta diária</p>
                <p className="text-xl font-bold text-slate-900">
                  {profile?.hours_per_day != null ? `${profile.hours_per_day}h` : "—"}
                </p>
              </div>
            </div>
            {profile?.hours_per_day != null && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>0h</span>
                  <span>{profile.hours_per_day}h</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400"
                    style={{ width: `${Math.min((profile.hours_per_day / 8) * 100, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400">por dia de estudo</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Coluna direita: detalhes + trocar papel ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Objetivos e interesses */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-5">Informações de aprendizado</h3>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-indigo-400" />
                  <p className="text-sm font-medium text-slate-700">Objetivos</p>
                </div>
                {profile?.learning_goals && profile.learning_goals.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.learning_goals.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Nenhum objetivo cadastrado</p>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <p className="text-sm font-medium text-slate-700">Interesses</p>
                </div>
                {profile?.interests && profile.interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-purple-100 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 italic">Nenhum interesse cadastrado</p>
                )}
              </div>
            </div>
          </div>

          {/* Card de troca de papel */}
          {profile && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5 text-slate-500" />
                    Trocar papel
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Alterne entre <strong>Estudante</strong> e <strong>Professor</strong> para
                    acessar diferentes áreas da plataforma.
                  </p>
                </div>
                <Button
                  onClick={handleSwitchRole}
                  disabled={switching}
                  variant={switched ? "outline" : "default"}
                  size="sm"
                  className={cn(
                    "shrink-0",
                    switched && "border-emerald-400 text-emerald-700"
                  )}
                >
                  {switching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : switched ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Alterado!
                    </>
                  ) : (
                    <>
                      <ArrowLeftRight className="h-4 w-4" />
                      Alternar
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <RoleCard
                  role="student"
                  currentRole={profile.role}
                  icon={BookOpen}
                  title="Estudante"
                  description="Acesse sessões de estudo, flashcards e quizzes personalizados com IA."
                  color="indigo"
                />
                <RoleCard
                  role="teacher"
                  currentRole={profile.role}
                  icon={GraduationCap}
                  title="Professor"
                  description="Gerencie turmas, crie conteúdos e acompanhe o desempenho dos alunos."
                  color="emerald"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RoleCard({
  role,
  currentRole,
  icon: Icon,
  title,
  description,
  color,
}: {
  role: "student" | "teacher";
  currentRole: "student" | "teacher";
  icon: React.ElementType;
  title: string;
  description: string;
  color: "indigo" | "emerald";
}) {
  const isActive = role === currentRole;
  const ringCls =
    color === "indigo"
      ? "ring-indigo-400 border-indigo-200"
      : "ring-emerald-400 border-emerald-200";
  const iconBg =
    color === "indigo"
      ? "bg-indigo-100 text-indigo-600"
      : "bg-emerald-100 text-emerald-600";

  return (
    <div
      className={cn(
        "rounded-xl border p-5 transition-all",
        isActive
          ? `${ringCls} ring-2 bg-white shadow-sm`
          : "border-slate-200 bg-slate-50 opacity-55"
      )}
    >
      <div
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl mb-4",
          iconBg
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{description}</p>
      {isActive && (
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Papel atual
        </span>
      )}
    </div>
  );
}
