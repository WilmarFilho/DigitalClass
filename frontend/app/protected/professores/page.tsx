"use client";

import { useState, useEffect } from "react";
import {
  GraduationCap,
  Search,
  Star,
  Users,
  BookOpen,
  CheckCircle2,
  Loader2,
  PlayCircle,
  DollarSign,
  X,
} from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

  // Painel de aulas
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
      // silencia
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
      // silencia
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <GraduationCap className="h-6 w-6" />
          Meus Professores
        </h1>
      </div>

      {/* Abas */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 w-fit">
        {(
          [
            { value: "following", label: `Seguindo (${following.length})` },
            { value: "explore", label: "Explorar" },
          ] as { value: Tab; label: string }[]
        ).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              "rounded-lg px-4 py-1.5 text-sm font-medium transition-all",
              tab === value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Busca (só na aba explorar) */}
      {tab === "explore" && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar professores ou áreas..."
            className="flex h-9 w-full rounded-md border border-input bg-white pl-9 pr-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      )}

      {/* Grid de cards */}
      {displayList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <GraduationCap className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">
            {tab === "following"
              ? "Você ainda não segue nenhum professor."
              : "Nenhuma área encontrada."}
          </p>
          {tab === "following" && (
            <button
              onClick={() => setTab("explore")}
              className="mt-2 text-sm text-indigo-600 font-medium hover:underline"
            >
              Explorar professores →
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {displayList.map((area) => {
            const isFollowing = followingIds.has(area.id);
            return (
              <AreaCard
                key={area.id}
                area={area}
                isFollowing={isFollowing}
                loadingSubscribe={subscribing === area.id}
                onOpen={() => openArea(area)}
                onSubscribe={() => handleSubscribe(area)}
                onUnsubscribe={() => handleUnsubscribe(area.id)}
              />
            );
          })}
        </div>
      )}

      {/* Drawer lateral de aulas */}
      {selectedArea && (
        <LessonsPanel
          area={selectedArea}
          lessons={lessons}
          loading={loadingLessons}
          onClose={() => setSelectedArea(null)}
        />
      )}
    </div>
  );
}

// ─── AreaCard ────────────────────────────────────────────────────────────────

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
    <div className="group rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col transition-shadow hover:shadow-md">
      {/* Banner colorido */}
      <div
        className="h-20 relative"
        style={{
          background: area.banner_url
            ? `url(${area.banner_url}) center/cover`
            : `linear-gradient(135deg, ${area.color_code}cc, ${area.color_code}66)`,
        }}
      >
        {isFollowing && (
          <span className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            Seguindo
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        {/* Avatar professor */}
        <div className="-mt-8 mb-3">
          {area.teacher.avatar_url ? (
            <img
              src={area.teacher.avatar_url}
              alt={area.teacher.full_name}
              className="h-12 w-12 rounded-xl border-2 border-white shadow object-cover"
            />
          ) : (
            <div
              className="h-12 w-12 rounded-xl border-2 border-white shadow flex items-center justify-center text-sm font-bold text-white"
              style={{ backgroundColor: area.color_code }}
            >
              {initials}
            </div>
          )}
        </div>

        <h3 className="font-semibold text-slate-900 text-sm leading-tight">{area.title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{area.teacher.full_name}</p>

        {area.description && (
          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed flex-1">
            {area.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5" />
            {area.monthly_price === 0
              ? "Gratuito"
              : `R$ ${area.monthly_price.toFixed(2)}/mês`}
          </span>
        </div>

        <div className="mt-3 flex gap-2">
          {isFollowing && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={onOpen}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Ver aulas
            </Button>
          )}
          <Button
            size="sm"
            variant={isFollowing ? "ghost" : "default"}
            className={cn(
              "flex-1 text-xs",
              isFollowing && "text-slate-500 hover:text-red-500"
            )}
            disabled={loadingSubscribe}
            onClick={isFollowing ? onUnsubscribe : onSubscribe}
          >
            {loadingSubscribe ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : isFollowing ? (
              "Deixar de seguir"
            ) : (
              <>
                <Star className="h-3.5 w-3.5" />
                Seguir
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── LessonsPanel ─────────────────────────────────────────────────────────────

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
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="flex-1 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Painel */}
      <div className="w-full max-w-md bg-white flex flex-col shadow-2xl">
        {/* Header */}
        <div
          className="h-24 relative shrink-0"
          style={{
            background: `linear-gradient(135deg, ${area.color_code}ee, ${area.color_code}88)`,
          }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 rounded-lg bg-white/20 p-1.5 text-white hover:bg-white/30 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute bottom-0 left-0 right-0 px-5 pb-3">
            <h2 className="font-bold text-white text-lg leading-tight truncate">
              {area.title}
            </h2>
            <p className="text-white/80 text-xs">{area.teacher.full_name}</p>
          </div>
        </div>

        {/* Aulas */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-10 w-10 text-slate-300 mb-3" />
              <p className="text-sm text-slate-500">
                Nenhuma aula publicada ainda.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {lessons.map((lesson, i) => (
                <LessonRow key={lesson.id} lesson={lesson} index={i + 1} color={area.color_code} />
              ))}
            </ul>
          )}
        </div>
      </div>
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
    <li className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 hover:bg-white hover:border-slate-200 transition-all">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white text-sm font-bold"
        style={{ backgroundColor: color }}
      >
        {lesson.type === "video" ? (
          <PlayCircle className="h-5 w-5" />
        ) : (
          <BookOpen className="h-5 w-5" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">#{index}</span>
          <p className="text-sm font-medium text-slate-800 truncate">{lesson.title}</p>
        </div>
        {lesson.description && (
          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{lesson.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {lesson.type === "video" ? "Vídeo" : "PDF"}
          </span>
          {lesson.duration_minutes && (
            <span className="text-[10px] text-slate-400">{lesson.duration_minutes} min</span>
          )}
        </div>
      </div>
      {lesson.content_url && (
        <a
          href={lesson.content_url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-lg bg-white border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Abrir
        </a>
      )}
    </li>
  );
}
