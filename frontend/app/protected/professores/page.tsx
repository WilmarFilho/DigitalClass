"use client";

import { useState, useEffect } from "react";
import {
  GraduationCap,
  Search,
  Star,
  BookOpen,
  CheckCircle2,
  Loader2,
  PlayCircle,
  DollarSign,
  X,
  ArrowRight,
  Users,
} from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TeacherArea {
  id: string;
  title: string;
  description: string | null;
  color_code: string;
  monthly_price: number;
  banner_url: string | null;
  teacher: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface FollowingArea extends TeacherArea {
  subscribed_at: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  type: "video" | "pdf";
  content_url: string | null;
  duration_minutes: number | null;
  order_index: number;
}

type Tab = "following" | "explore";

export default function ProfessoresPage() {
  const [tab, setTab] = useState<Tab>("following");
  const [following, setFollowing] = useState<FollowingArea[]>([]);
  const [allAreas, setAllAreas] = useState<TeacherArea[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  const [selectedArea, setSelectedArea] = useState<TeacherArea | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  useEffect(() => {
    async function load() {
      const [f, a] = await Promise.all([
        apiGet<FollowingArea[]>("/teachers/following").catch(() => []),
        apiGet<TeacherArea[]>("/teachers/areas").catch(() => []),
      ]);
      setFollowing(f);
      setAllAreas(a);
      setLoading(false);
    }
    load();
  }, []);

  const followingIds = new Set(following.map((f) => f.id));

  const handleSubscribe = async (area: TeacherArea) => {
    setSubscribing(area.id);
    try {
      await apiPost(`/teachers/areas/${area.id}/subscribe`, {});
      const updated = await apiGet<FollowingArea[]>("/teachers/following");
      setFollowing(updated);
    } catch {
      // erro silencioso
    } finally {
      setSubscribing(null);
    }
  };

  const handleUnsubscribe = async (areaId: string) => {
    setSubscribing(areaId);
    try {
      await apiDelete(`/teachers/areas/${areaId}/subscribe`);
      setFollowing((prev) => prev.filter((f) => f.id !== areaId));
      if (selectedArea?.id === areaId) setSelectedArea(null);
    } catch {
      // erro silencioso
    } finally {
      setSubscribing(null);
    }
  };

  const openArea = async (area: TeacherArea) => {
    setSelectedArea(area);
    setLoadingLessons(true);
    try {
      const l = await apiGet<Lesson[]>(`/teachers/areas/${area.id}/lessons`);
      setLessons(l);
    } catch {
      setLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  };

  const filteredAll = allAreas.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.teacher.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const displayList = tab === "following" ? following : filteredAll;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-slate-200" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Conectando à Comunidade</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto pb-20">
      {/* Header com Design de Marca */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="h-1 w-8 bg-indigo-600 rounded-full" />
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Mentoria & Conteúdo</p>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <GraduationCap className="h-8 w-8 text-slate-900" />
            Especialistas
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 ">
          {tab === "explore" && (
            <div className="relative w-full sm:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar mentor ou área..."
                className="w-full rounded-2xl border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-bold shadow-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
              />
            </div>
          )}

          <div className="flex p-1.5 bg-slate-200/50 backdrop-blur-sm rounded-2xl w-full sm:w-auto">
            {(
              [
                { value: "following", label: `Meus Mentores (${following.length})` },
                { value: "explore", label: "Explorar" },
              ] as { value: Tab; label: string }[]
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={cn(
                  "flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  tab === value
                    ? "bg-white text-slate-900 shadow-md"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid de Conteúdo */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {displayList.length === 0 ? (
            <div className="rounded-[32px] border-2 border-dashed border-slate-200 bg-white/50 p-20 text-center">
              <div className="bg-white h-20 w-20 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
                <Users className="h-10 w-10 text-slate-200" />
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                {tab === "following" ? "Sua rede está vazia" : "Nenhum mentor encontrado"}
              </h3>
              <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest">
                {tab === "following" ? "Comece a seguir especialistas para liberar conteúdos." : "Tente um termo de busca diferente."}
              </p>
              {tab === "following" && (
                <Button
                  onClick={() => setTab("explore")}
                  className="mt-8 bg-slate-900 hover:bg-black text-white rounded-2xl px-8 font-black text-[10px] uppercase tracking-[0.2em]"
                >
                  Explorar Agora <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {displayList.map((area) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  isFollowing={followingIds.has(area.id)}
                  loadingSubscribe={subscribing === area.id}
                  onOpen={() => openArea(area)}
                  onSubscribe={() => handleSubscribe(area)}
                  onUnsubscribe={() => handleUnsubscribe(area.id)}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Drawer de Aulas */}
      <AnimatePresence>
        {selectedArea && (
          <LessonsPanel
            area={selectedArea}
            lessons={lessons}
            loading={loadingLessons}
            onClose={() => setSelectedArea(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── AreaCard (Visual Premium) ────────────────────────────────────────────────

function AreaCard({
  area,
  isFollowing,
  loadingSubscribe,
  onOpen,
  onSubscribe,
  onUnsubscribe,
}: {
  area: TeacherArea;
  isFollowing: boolean;
  loadingSubscribe: boolean;
  onOpen: () => void;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
}) {
  const initials = area.teacher.full_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="group relative rounded-[28px] border border-slate-200 bg-white p-2 shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-1 overflow-hidden flex flex-col">
      <div
        className="h-32 rounded-[22px] relative overflow-hidden transition-transform duration-700 group-hover:scale-[1.02]"
        style={{
          background: area.banner_url
            ? `url(${area.banner_url}) center/cover`
            : `linear-gradient(135deg, ${area.color_code}, ${area.color_code}88)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {isFollowing && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-[9px] font-black text-emerald-600 uppercase tracking-widest shadow-sm">
            <CheckCircle2 className="h-3 w-3" />
            Inscrito
          </div>
        )}
      </div>

      <div className="px-4 pb-4 pt-2 flex flex-col flex-1">
        <div className="-mt-10 mb-4 relative z-10">
          {area.teacher.avatar_url ? (
            <img
              src={area.teacher.avatar_url}
              alt={area.teacher.full_name}
              className="h-16 w-16 rounded-[20px] border-4 border-white shadow-lg object-cover"
            />
          ) : (
            <div
              className="h-16 w-16 rounded-[20px] border-4 border-white shadow-lg flex items-center justify-center text-xl font-black text-white"
              style={{ backgroundColor: area.color_code }}
            >
              {initials}
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="font-black text-slate-900 text-sm leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">
            {area.title}
          </h3>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
            {area.teacher.full_name}
          </p>

          {area.description && (
            <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed font-medium italic">
              &quot;{area.description}&quot;
            </p>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-900">
            <DollarSign className="h-3 w-3 text-slate-400" />
            <span className="text-xs font-black tracking-tighter">
              {area.monthly_price === 0 ? "FREE" : `R$ ${area.monthly_price.toFixed(2)}`}
            </span>
            <span className="text-[9px] font-bold text-slate-400 uppercase">/mês</span>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          {isFollowing ? (
            <>
              <Button
                size="sm"
                className="flex-1 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest h-10 shadow-lg shadow-slate-200"
                onClick={onOpen}
              >
                <BookOpen className="h-3.5 w-3.5 mr-2" />
                Aulas
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl font-black text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50"
                disabled={loadingSubscribe}
                onClick={onUnsubscribe}
              >
                {loadingSubscribe ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="w-full rounded-xl bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white transition-all font-black text-[10px] uppercase tracking-[0.2em] h-10 shadow-xl shadow-slate-100"
              disabled={loadingSubscribe}
              onClick={onSubscribe}
            >
              {loadingSubscribe ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Star className="h-3.5 w-3.5 mr-2 fill-current" />
                  Assinar Acesso
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── LessonsPanel (Framer Motion Drawer) ──────────────────────────────────────

function LessonsPanel({
  area,
  lessons,
  loading,
  onClose,
}: {
  area: TeacherArea;
  lessons: Lesson[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="relative w-full max-w-lg bg-white h-full shadow-[-20px_0_60px_-15px_rgba(0,0,0,0.1)] flex flex-col overflow-hidden"
      >
        {/* Header Drawer com Correção Definitiva de Blur */}
        <div className="relative h-48 w-full shrink-0 flex items-end p-8 overflow-hidden">
          {/* Camada de Fundo Isolada */}
          <div 
            className="absolute inset-0 z-0" 
            style={{ backgroundColor: area.color_code }}
          >
            {area.banner_url && (
              <div 
                className="absolute inset-0 bg-center bg-cover"
                style={{ backgroundImage: `url(${area.banner_url})` }}
              />
            )}
            {/* Overlay Gradiente Profundo */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/80" />
            {/* Camada de Blur Suave aplicada ao fundo */}
            <div className="absolute inset-0 backdrop-blur-[4px] pointer-events-none" />
          </div>

          <button
            onClick={onClose}
            className="absolute top-6 right-6 z-50 h-10 w-10 flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xl text-white hover:bg-white hover:text-slate-900 transition-all border border-white/30 shadow-lg"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="relative z-10 text-white w-full">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80 mb-2 drop-shadow-md">
              Treinamento Exclusivo
            </p>
            <h2 className="font-black text-2xl tracking-tight leading-none uppercase drop-shadow-xl">
              {area.title}
            </h2>
          </div>
        </div>

        {/* Lista de Aulas */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-white">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-slate-200" />
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sincronizando Módulos</p>
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-20 px-10">
              <div className="bg-slate-50 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <BookOpen className="h-8 w-8 text-slate-200" />
              </div>
              <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Vazio por enquanto</p>
              <p className="text-xs text-slate-400 mt-2 font-medium">O mentor ainda não liberou as aulas desta trilha.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Playlist de Conteúdo</span>
                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase">{lessons.length} Módulos</span>
              </div>
              <ul className="space-y-3">
                {lessons.map((lesson, i) => (
                  <LessonRow key={lesson.id} lesson={lesson} index={i + 1} color={area.color_code} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function LessonRow({
  lesson,
  index,
  color,
}: {
  lesson: Lesson;
  index: number;
  color: string;
}) {
  return (
    <li className="group flex items-center gap-4 rounded-3xl border border-slate-100 bg-white p-4 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-50 transition-all cursor-default">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110"
        style={{ backgroundColor: color }}
      >
        {lesson.type === "video" ? (
          <PlayCircle className="h-6 w-6" />
        ) : (
          <BookOpen className="h-6 w-6" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Módulo {index.toString().padStart(2, '0')}</span>
        </div>
        <p className="text-sm font-bold text-slate-800 truncate leading-tight group-hover:text-indigo-600 transition-colors">
          {lesson.title}
        </p>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[9px] font-black uppercase tracking-[0.1em] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">
            {lesson.type === "video" ? "Vídeo Aula" : "Material PDF"}
          </span>
          {lesson.duration_minutes && (
            <span className="text-[9px] font-bold text-slate-400">{lesson.duration_minutes} MINUTOS</span>
          )}
        </div>
      </div>

      {lesson.content_url && (
        <a
          href={lesson.content_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 h-10 w-10 flex items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-black transition-all shadow-md opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0"
        >
          <ArrowRight className="h-4 w-4" />
        </a>
      )}
    </li>
  );
}