"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("following");
  const [following, setFollowing] = useState<FollowingArea[]>([]);
  const [allAreas, setAllAreas] = useState<TeacherArea[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<string | null>(null);

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
    } catch {
      // erro silencioso
    } finally {
      setSubscribing(null);
    }
  };

  const openArea = (area: TeacherArea) => {
    window.open(`/protected/professores/area/${area.id}`, '_blank');
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

// LessonsPanel removido em favor de uma página dedicada de área (/protected/professores/area/[areaId])