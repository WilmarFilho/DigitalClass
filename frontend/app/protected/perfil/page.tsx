"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Camera,
  ImagePlus,
  Pencil,
  Plus,
  X,
  Users,
  UserCheck,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiGet, apiPost, apiPatch, apiUpload } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRole } from "@/contexts/RoleContext";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";
import { TeacherBankDetailsModal } from "@/components/perfil/TeacherBankDetailsModal";

interface Profile {
  id: string;
  role: "student" | "teacher";
  full_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  learning_goals: string[] | null;
  interests: string[] | null;
  hours_per_day: number | null;
  conta_bancaria?: string | null;
  chave_pix?: string | null;
  dia_repasse?: number | null;
  preferencia_repasse?: "pix" | "transferencia_bancaria" | null;
}

interface AuthUser {
  email: string;
  full_name: string;
  avatar_url: string | null;
}

interface TeacherStats {
  follower_count: number;
  subscriber_count: number;
  post_count: number;
}

export default function PerfilPage() {
  const { t } = useTranslation();
  const { setRole } = useRole();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [switched, setSwitched] = useState(false);
  const [teacherStats, setTeacherStats] = useState<TeacherStats | null>(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [hoursValue, setHoursValue] = useState(2);
  const [savingHours, setSavingHours] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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
        setHoursValue(p?.hours_per_day ?? 2);

        if (p?.role === "teacher" && p.id) {
          Promise.all([
            apiGet<any>(`/community/teachers/${p.id}/profile`).catch(() => null),
            apiGet<any>("/teachers/my-students").catch(() => null),
          ]).then(([communityProfile, studentsData]) => {
            setTeacherStats({
              follower_count: communityProfile?.follower_count ?? 0,
              subscriber_count: studentsData?.active_count ?? 0,
              post_count: communityProfile?.post_count ?? 0,
            });
          });
        }
      } catch (err) {
        console.error("Erro ao carregar perfil", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const updated = await apiUpload<Profile>("/profiles/me/avatar", file);
      setProfile(updated);
    } catch (err) {
      console.error("Erro no upload do avatar", err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const updated = await apiUpload<Profile>("/profiles/me/banner", file);
      setProfile(updated);
    } catch (err) {
      console.error("Erro no upload do banner", err);
    } finally {
      setUploadingBanner(false);
    }
  };

  const saveHours = useCallback(async (value: number) => {
    setSavingHours(true);
    try {
      const updated = await apiPatch<Profile>("/profiles/me", { hours_per_day: value });
      setProfile(updated);
      setHoursSaved(true);
      setTimeout(() => setHoursSaved(false), 2000);
    } catch (err) {
      console.error("Erro ao salvar meta", err);
    } finally {
      setSavingHours(false);
      setEditingHours(false);
    }
  }, []);

  const handleSwitchRole = async () => {
    if (!profile) return;
    const newRole = profile.role === "student" ? "teacher" : "student";
    if (newRole === "teacher" && (!profile.conta_bancaria || !profile.chave_pix)) {
      setIsBankModalOpen(true);
      return;
    }
    await performSwitch(newRole);
  };

  const submitBankDetailsAndSwitch = async (bankData: any) => {
    if (!profile) return;
    setSwitching(true);
    try {
      const updated = await apiPost<Profile>("/profiles", {
        ...profile,
        ...bankData,
        role: "teacher",
      });
      setProfile(updated);
      setRole("teacher");
      setIsBankModalOpen(false);
      setSwitched(true);
      setTimeout(() => setSwitched(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSwitching(false);
    }
  };

  const performSwitch = async (newRole: "student" | "teacher") => {
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
  const avatarSrc = profile?.avatar_url || authUser?.avatar_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8 pb-12"
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <div className="h-8 w-1.5 bg-indigo-600 rounded-full" />
          {t("perfil.title")}
        </h1>
        <p className="text-sm text-slate-500 ml-3">{t("perfil.subtitle")}</p>
      </header>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Coluna Esquerda */}
        <div className="lg:col-span-4 space-y-6">
          <div className="group relative rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md">
            {/* Banner com upload */}
            <div
              className="h-32 relative cursor-pointer group/banner"
              onClick={() => bannerInputRef.current?.click()}
              style={{
                background: profile?.banner_url
                  ? `url(${profile.banner_url}) center / cover no-repeat`
                  : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
              }}
            >
              <div className="absolute inset-0 bg-black/0 group-hover/banner:bg-black/40 transition-all flex items-center justify-center">
                <div className="opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center gap-2 text-white text-xs font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                  {uploadingBanner ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4" />
                      {t("perfil.changeBanner")}
                    </>
                  )}
                </div>
              </div>
              {!profile?.banner_url && (
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
              )}
            </div>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />

            <div className="px-6 pb-8">
              {/* Avatar com upload */}
              <div className="-mt-14 mb-5 relative inline-block">
                <div
                  className="relative cursor-pointer group/avatar"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      className="h-28 w-28 rounded-2xl border-4 border-white shadow-xl object-cover"
                    />
                  ) : (
                    <div className="h-28 w-28 rounded-2xl border-4 border-white shadow-xl bg-gradient-to-tr from-slate-800 to-slate-600 flex items-center justify-center">
                      <span className="text-4xl font-bold text-white">{initials}</span>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover/avatar:bg-black/40 transition-all flex items-center justify-center border-4 border-transparent">
                    <div className="opacity-0 group-hover/avatar:opacity-100 transition-opacity">
                      {uploadingAvatar ? (
                        <Loader2 className="h-6 w-6 animate-spin text-white" />
                      ) : (
                        <Camera className="h-6 w-6 text-white drop-shadow-lg" />
                      )}
                    </div>
                  </div>
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
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

              {/* Stats do professor */}
              {profile?.role === "teacher" && (
                <div className="mt-6 grid grid-cols-3 divide-x divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/60 overflow-hidden">
                  <TeacherStatItem
                    icon={Users}
                    value={teacherStats?.follower_count ?? "—"}
                    label="Seguidores"
                    color="text-[#6D44CC]"
                    bg="bg-[#E6E0F8]/50"
                  />
                  <TeacherStatItem
                    icon={UserCheck}
                    value={teacherStats?.subscriber_count ?? "—"}
                    label="Assinantes"
                    color="text-emerald-600"
                    bg="bg-emerald-50"
                  />
                  <TeacherStatItem
                    icon={FileText}
                    value={teacherStats?.post_count ?? "—"}
                    label="Posts"
                    color="text-orange-500"
                    bg="bg-orange-50"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Meta Diária Editável */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                  <Clock className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">{t("perfil.studyGoal")}</h4>
              </div>
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {hoursSaved && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1 text-emerald-600 text-xs font-bold"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t("perfil.saved")}
                    </motion.div>
                  )}
                </AnimatePresence>
                {!editingHours ? (
                  <button
                    onClick={() => setEditingHours(true)}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50"
                    title={t("perfil.editGoal")}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                ) : null}
                <span className="text-2xl font-black text-slate-900">
                  {editingHours ? hoursValue : (profile?.hours_per_day ?? 0)}<span className="text-sm font-medium text-slate-400">h</span>
                </span>
              </div>
            </div>

            {editingHours ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-4"
              >
                <input
                  type="range"
                  min={1}
                  max={12}
                  step={1}
                  value={hoursValue}
                  onChange={(e) => setHoursValue(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-orange-500"
                />
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>1h {t("perfil.min")}</span>
                  <span>12h {t("perfil.max")}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-xs"
                    onClick={() => saveHours(hoursValue)}
                    disabled={savingHours}
                  >
                    {savingHours ? <Loader2 className="h-4 w-4 animate-spin" /> : t("perfil.saveGoal")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl font-bold text-xs"
                    onClick={() => { setEditingHours(false); setHoursValue(profile?.hours_per_day ?? 2); }}
                  >
                    {t("perfil.cancel")}
                  </Button>
                </div>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(((profile?.hours_per_day || 0) / 12) * 100, 100)}%` }}
                    className="h-full bg-orange-500 rounded-full"
                  />
                </div>
                <p className="text-[11px] text-slate-400 flex items-center justify-between font-medium">
                  <span>0h {t("perfil.suggested")}</span>
                  <span>12h {t("perfil.max")}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Coluna Direita */}
        <div className="lg:col-span-8 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Target className="h-5 w-5 text-indigo-500" />
              {t("perfil.academicPrefs")}
            </h3>

            <div className="grid gap-8 md:grid-cols-2">
              <EditableTagList
                label={t("perfil.currentGoals")}
                items={profile?.learning_goals ?? []}
                colorScheme="indigo"
                placeholder={t("perfil.currentGoalsPlaceholder")}
                onSave={async (items) => {
                  const updated = await apiPatch<Profile>("/profiles/me", { learning_goals: items });
                  setProfile(updated);
                }}
              />

              <EditableTagList
                label={t("perfil.interests")}
                items={profile?.interests ?? []}
                colorScheme="purple"
                placeholder={t("perfil.interestsPlaceholder")}
                onSave={async (items) => {
                  const updated = await apiPatch<Profile>("/profiles/me", { interests: items });
                  setProfile(updated);
                }}
              />
            </div>
          </div>

          {/* Troca de Role com UX Refinada */}
          <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-8 border-dashed">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
              <div className="max-w-md">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5 text-slate-400" />
                  {t("perfil.accessMode")}
                </h3>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {t("perfil.accessModeDesc")}
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
                      <CheckCircle2 className="h-5 w-5" /> {t("perfil.profileUpdated")}
                    </motion.div>
                  ) : (
                    <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
                      {t("perfil.switch")}
                    </motion.div>
                  )}
                </AnimatePresence>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RoleSelectorCard
                active={profile?.role === "student"}
                type="student"
                title={t("perfil.studentVision")}
                desc={t("perfil.studentVisionDesc")}
              />
              <RoleSelectorCard
                active={profile?.role === "teacher"}
                type="teacher"
                title={t("perfil.teacherVision")}
                desc={t("perfil.teacherVisionDesc")}
              />
            </div>
          </div>
        </div>
      </div>

      <TeacherBankDetailsModal
        isOpen={isBankModalOpen}
        onOpenChange={setIsBankModalOpen}
        onSubmit={submitBankDetailsAndSwitch}
        isLoading={switching}
      />
    </motion.div>
  );
}

// Subcomponentes auxiliares para organização e limpeza do código

function BadgeRole({ role }: { role: string }) {
  const { t } = useTranslation();
  const isTeacher = role === "teacher";
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold uppercase tracking-tight",
      isTeacher ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-indigo-50 border-indigo-100 text-indigo-700"
    )}>
      {isTeacher ? <GraduationCap className="h-3.5 w-3.5" /> : <BookOpen className="h-3.5 w-3.5" />}
      {isTeacher ? t("sidebar.professor") : t("sidebar.estudante")}
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

function EditableTagList({ label, items, colorScheme, placeholder, onSave }: {
  label: string;
  items: string[];
  colorScheme: "indigo" | "purple";
  placeholder: string;
  onSave: (items: string[]) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [localItems, setLocalItems] = useState<string[]>(items);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  // Sincroniza o estado local quando os itens originais mudam (ex: carregamento inicial)
  useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const bgClass = colorScheme === "indigo" ? "bg-indigo-50 text-indigo-700 border-indigo-100/50" : "bg-purple-50 text-purple-700 border-purple-100/50";
  const btnClass = colorScheme === "indigo" ? "bg-indigo-100 text-indigo-600 hover:bg-indigo-200" : "bg-purple-100 text-purple-600 hover:bg-purple-200";

  const handleAdd = useCallback(() => {
    const tag = newTag.trim();
    if (tag && !localItems.includes(tag)) {
      setLocalItems(prev => [...prev, tag]);
      setNewTag("");
    }
  }, [newTag, localItems]);

  const handleRemove = (tag: string) => {
    setLocalItems(prev => prev.filter(t => t !== tag));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Se houver algo digitado no input, adiciona antes de salvar
      let finalItems = [...localItems];
      const pendingTag = newTag.trim();

      if (pendingTag && !finalItems.includes(pendingTag)) {
        finalItems.push(pendingTag);
      }

      await onSave(finalItems);
      setNewTag(""); // Limpa o input
      setEditing(false);
    } catch (err) {
      console.error("Erro ao salvar tags:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</label>
        {!editing && (
          <button
            onClick={() => {
              setLocalItems(items); // Garante que começa com o que está no banco
              setEditing(true);
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {editing ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {localItems.map(tag => (
              <span key={tag} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border", bgClass)}>
                {tag}
                <button onClick={() => handleRemove(tag)} className="hover:opacity-70 transition-opacity">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              placeholder={placeholder}
              className="flex-1 h-9 rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-xs font-medium outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"
            />
            <button
              type="button"
              onClick={handleAdd}
              className={cn("h-9 w-9 rounded-xl flex items-center justify-center transition-colors", btnClass)}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-slate-900 hover:bg-black text-white rounded-xl font-bold text-xs"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("perfil.confirmChanges")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl text-xs font-bold"
              onClick={() => {
                setEditing(false);
                setNewTag("");
              }}
            >
              {t("perfil.cancel")}
            </Button>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items && items.length > 0 ? items.map(tag => (
            <span key={tag} className={cn("px-3 py-1.5 rounded-xl text-xs font-semibold border", bgClass)}>
              {tag}
            </span>
          )) : (
            <EmptyTag label={colorScheme === "indigo" ? t("perfil.noGoals") : t("perfil.noInterests")} />
          )}
        </div>
      )}
    </div>
  );
}

function EmptyTag({ label }: { label: string }) {
  return <span className="text-xs text-slate-400 italic font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">{label}</span>;
}

function TeacherStatItem({
  icon: Icon,
  value,
  label,
  color,
  bg,
}: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-4 px-2">
      <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center", bg)}>
        <Icon className={cn("h-4 w-4", color)} />
      </div>
      <span className="text-lg font-black text-slate-900 leading-none">
        {value === "—" ? <span className="text-slate-300 text-base">—</span> : value}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center leading-tight">
        {label}
      </span>
    </div>
  );
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