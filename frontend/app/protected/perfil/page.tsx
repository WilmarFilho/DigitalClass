"use client";

import { useState, useEffect } from "react";
import {
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
import { motion, AnimatePresence } from "framer-motion";

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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setAuthUser({
          email: user.email ?? "",
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário",
          avatar_url: user.user_metadata?.avatar_url ?? null,
        });
      }

      try {
        const p = await apiGet<Profile>("/profiles/me");
        setProfile(p);
      } catch (err) {
        console.error("Erro ao carregar perfil", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSwitchRole = async () => {
    if (!profile) return;
    const newRole = profile.role === "student" ? "teacher" : "student";
    setSwitching(true);
    try {
      const updated = await apiPost<Profile>("/profiles", {
        ...profile,
        role: newRole,
      });
      setProfile(updated);
      setRole(updated.role);
      setSwitched(true);
      setTimeout(() => setSwitched(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(false);
    }
  };

  if (loading) return <ProfileSkeleton />;

  const displayName = profile?.full_name || authUser?.full_name || "Usuário";
  const initials = displayName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8 pb-12"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <div className="h-8 w-1.5 bg-indigo-600 rounded-full" />
          Meu Perfil
        </h1>
        <p className="text-sm text-slate-500 ml-3">Gerencie suas informações e preferências de conta.</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Coluna Esquerda */}
        <div className="lg:col-span-4 space-y-6">
          <div className="group relative rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md">
            <div className="h-32 bg-slate-900 relative">
               <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            </div>
            <div className="px-6 pb-8">
              <div className="-mt-14 mb-5 relative inline-block">
                {authUser?.avatar_url ? (
                  <img
                    src={authUser.avatar_url}
                    alt={displayName}
                    className="h-28 w-28 rounded-2xl border-4 border-white shadow-xl object-cover"
                  />
                ) : (
                  <div className="h-28 w-28 rounded-2xl border-4 border-white shadow-xl bg-gradient-to-tr from-slate-800 to-slate-600 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">{initials}</span>
                  </div>
                )}
                <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-white shadow border border-slate-100 flex items-center justify-center text-slate-400">
                   <Sparkles className="h-4 w-4" />
                </div>
              </div>

              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">{displayName}</h2>
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                  <Mail className="h-3.5 w-3.5" />
                  {authUser?.email}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <BadgeRole role={profile?.role || "student"} />
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-100 text-[11px] font-mono text-slate-400">
                  <Hash className="h-3 w-3" />
                  {profile?.id?.slice(0, 8)}
                </div>
              </div>
            </div>
          </div>

          {/* Meta Diária com design minimalista */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <Clock className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Meta de Estudo</h4>
              </div>
              <span className="text-2xl font-black text-slate-900">
                {profile?.hours_per_day ?? 0}<span className="text-sm font-medium text-slate-400">h</span>
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(((profile?.hours_per_day || 0) / 12) * 100, 100)}%` }}
                  className="h-full bg-orange-500 rounded-full"
                />
              </div>
              <p className="text-[11px] text-slate-400 flex items-center justify-between font-medium">
                <span>0h sugerido</span>
                <span>12h limite</span>
              </p>
            </div>
          </div>
        </div>

        {/* Coluna Direita */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-500" />
              Preferências Acadêmicas
            </h3>

            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Objetivos Atuais</label>
                <div className="flex flex-wrap gap-2">
                  {profile?.learning_goals?.length ? (
                    profile.learning_goals.map(goal => (
                      <span key={goal} className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-100/50">
                        {goal}
                      </span>
                    ))
                  ) : (
                    <EmptyTag label="Nenhum objetivo definido" />
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Áreas de Interesse</label>
                <div className="flex flex-wrap gap-2">
                  {profile?.interests?.length ? (
                    profile.interests.map(interest => (
                      <span key={interest} className="px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-100/50">
                        {interest}
                      </span>
                    ))
                  ) : (
                    <EmptyTag label="Nenhum interesse listado" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Troca de Role com UX Refinada */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-8 border-dashed">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-slate-400" />
                  Modo de Acesso
                </h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  Sua conta é híbrida. Você pode alternar sua visão entre 
                  <strong className="text-slate-700"> Mentor</strong> e 
                  <strong className="text-slate-700"> Aluno</strong> instantaneamente.
                </p>
              </div>

              <Button
                onClick={handleSwitchRole}
                disabled={switching}
                className={cn(
                  "relative overflow-hidden h-12 px-8 rounded-2xl transition-all font-bold shadow-sm",
                  switched ? "bg-emerald-500 hover:bg-emerald-600" : "bg-slate-900 hover:bg-slate-800"
                )}
              >
                <AnimatePresence mode="wait">
                  {switching ? (
                    <motion.div key="loading" exit={{ opacity: 0 }}><Loader2 className="h-5 w-5 animate-spin" /></motion.div>
                  ) : switched ? (
                    <motion.div key="done" initial={{ y: 20 }} animate={{ y: 0 }} className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" /> Perfil Atualizado
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                      Alternar para {profile?.role === "student" ? "Professor" : "Estudante"}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RoleSelectorCard 
                active={profile?.role === "student"}
                type="student"
                title="Visão Aluno"
                desc="Consuma conteúdos, responda quizzes e acompanhe seu progresso."
              />
              <RoleSelectorCard 
                active={profile?.role === "teacher"}
                type="teacher"
                title="Visão Professor"
                desc="Crie módulos, gerencie alunos e analise métricas de ensino."
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Subcomponentes auxiliares para organização e limpeza do código

function BadgeRole({ role }: { role: string }) {
  const isTeacher = role === "teacher";
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-tight",
      isTeacher ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-indigo-50 border-indigo-100 text-indigo-700"
    )}>
      {isTeacher ? <GraduationCap className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
      {isTeacher ? "Professor" : "Estudante"}
    </div>
  );
}

function RoleSelectorCard({ active, type, title, desc }: { active: boolean, type: 'student' | 'teacher', title: string, desc: string }) {
  const Icon = type === 'student' ? BookOpen : GraduationCap;
  return (
    <div className={cn(
      "p-5 rounded-2xl border-2 transition-all duration-300 relative overflow-hidden",
      active 
        ? "bg-white border-slate-900 shadow-md translate-y-[-2px]" 
        : "bg-transparent border-slate-200 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 hover:border-slate-300"
    )}>
      <div className={cn(
        "h-10 w-10 rounded-xl flex items-center justify-center mb-4",
        active ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
      )}>
        <Icon className="h-5 w-5" />
      </div>
      <h5 className="font-bold text-slate-900 mb-1">{title}</h5>
      <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
      {active && <div className="absolute top-3 right-3 h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />}
    </div>
  );
}

function EmptyTag({ label }: { label: string }) {
  return <span className="text-xs text-slate-400 italic font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{label}</span>;
}

function ProfileSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-pulse">
      <div className="h-10 w-48 bg-slate-200 rounded-lg" />
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4 h-96 bg-slate-100 rounded-3xl" />
        <div className="lg:col-span-8 h-96 bg-slate-100 rounded-3xl" />
      </div>
    </div>
  );
}