"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { Search, Loader2, Rss, Users, Clapperboard, UserPlus, Check, Play, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { PostCard, Post } from "@/components/community/PostCard";
import { ClipPlayer } from "@/components/community/ClipPlayer";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Teacher {
  id: string;
  full_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  area_count: number;
  is_following: boolean;
}

type Tab = "explorar" | "feed" | "clips";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("feed");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setCurrentUserId(session.user.id);
    });
  }, []);

  const tabs = [
    { key: "explorar" as Tab, label: t("feed.tabExplorar"), icon: Users },
    { key: "feed" as Tab, label: t("feed.tabFeed"), icon: Rss },
    { key: "clips" as Tab, label: t("feed.tabClips"), icon: Clapperboard },
  ];

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#1A1A1A] dark:text-white tracking-tight">{t("feed.title")}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t("feed.subtitle")}</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 min-[481px]:flex gap-1 p-1 bg-[#F0EEF9] dark:bg-slate-800 rounded-2xl w-full min-[481px]:w-fit mb-8">
        {tabs.map(({ key, label, icon: Icon }, index) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "flex items-center justify-center min-[481px]:justify-start gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              // Faz o terceiro item (índice 2) ocupar as duas colunas se houver apenas 3 abas
              index === 2 && "max-[480px]:col-span-2",
              tab === key
                ? "bg-white dark:bg-slate-900 text-[#6D44CC] shadow-sm"
                : "text-slate-500 hover:text-[#6D44CC]"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "explorar" && (
          <motion.div key="explorar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <ExplorarTab currentUserId={currentUserId} />
          </motion.div>
        )}
        {tab === "feed" && (
          <motion.div key="feed" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <FeedTab currentUserId={currentUserId} />
          </motion.div>
        )}
        {tab === "clips" && (
          <motion.div key="clips" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <ClipsTab currentUserId={currentUserId} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Explorar Tab ─────────────────────────────────────────────────────────────

function ExplorarTab({ currentUserId }: { currentUserId: string }) {
  const { t } = useTranslation();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    load(1, search);
  }, [search]);

  async function load(p: number, q: string) {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const { data, meta } = await apiGet<any>(`/community/explore?page=${p}&limit=16&search=${encodeURIComponent(q)}`);
      if (p === 1) setTeachers(data);
      else setTeachers((prev) => [...prev, ...data]);
      setHasMore(meta.total > p * 16);
      setPage(p);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const toggleFollow = async (teacherId: string) => {
    const prev = teachers.find((t) => t.id === teacherId);
    setTeachers((ts) => ts.map((t) => t.id === teacherId ? { ...t, is_following: !t.is_following } : t));
    try {
      await apiPost(`/community/follow/${teacherId}`, {});
    } catch {
      setTeachers((ts) => ts.map((t) => t.id === teacherId ? { ...t, is_following: prev?.is_following ?? false } : t));
    }
  };

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6 max-w-lg">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("feed.searchPlaceholder")}
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-[#E6E0F8] dark:border-slate-700 rounded-2xl text-sm text-[#1A1A1A] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D44CC]/30 focus:border-[#6D44CC] transition-all"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#6D44CC]" />
        </div>
      ) : teachers.length === 0 ? (
        <EmptyState icon={Users} title={t("feed.noExplore")} desc="" />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teachers.map((teacher) => (
              <TeacherCard key={teacher.id} teacher={teacher} onToggleFollow={toggleFollow} currentUserId={currentUserId} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => load(page + 1, search)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-[#E6E0F8] dark:border-slate-700 rounded-xl text-sm font-semibold text-[#6D44CC] hover:bg-[#F0EEF9] transition-colors"
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : t("feed.loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TeacherCard({ teacher, onToggleFollow, currentUserId }: { teacher: Teacher; onToggleFollow: (id: string) => void; currentUserId: string }) {
  const { t } = useTranslation();
  const initials = teacher.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const isSelf = teacher.id === currentUserId;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E0F8]/70 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
      {/* Banner */}
      <div className="relative h-20 bg-gradient-to-br from-[#6D44CC]/20 to-[#F38B4B]/20">
        {teacher.banner_url && (
          <Image src={teacher.banner_url} alt="" fill className="object-cover" />
        )}
      </div>
      {/* Avatar */}
      <div className="px-4 -mt-6 pb-4 relative z-10">
        <div className="h-12 w-12 rounded-full border-2 border-white dark:border-slate-900 bg-[#6D44CC] flex items-center justify-center text-white font-bold text-sm overflow-hidden mb-3">
          {teacher.avatar_url ? (
            <Image src={teacher.avatar_url} alt="" width={48} height={48} className="object-cover w-full h-full" />
          ) : (
            <span>{initials}</span>
          )}
        </div>
        <p className="font-bold text-[#1A1A1A] dark:text-white text-sm truncate">{teacher.full_name}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {t("feed.areas").replace("{count}", String(teacher.area_count))}
        </p>
        {!isSelf && (
          <button
            onClick={() => onToggleFollow(teacher.id)}
            className={cn(
              "mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all",
              teacher.is_following
                ? "bg-[#E6E0F8] text-[#6D44CC] hover:bg-red-50 hover:text-red-500"
                : "bg-[#6D44CC] text-white hover:bg-[#5a35b0]"
            )}
          >
            {teacher.is_following ? (
              <><Check className="h-3.5 w-3.5" />{t("feed.following")}</>
            ) : (
              <><UserPlus className="h-3.5 w-3.5" />{t("feed.follow")}</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Feed Tab ─────────────────────────────────────────────────────────────────

function FeedTab({ currentUserId }: { currentUserId: string }) {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => { load(1); }, []);

  async function load(p: number) {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const { data, meta } = await apiGet<any>(`/community/feed?page=${p}&limit=10`);
      if (p === 1) setPosts(data);
      else setPosts((prev) => [...prev, ...data]);
      setHasMore(meta.total > p * 10);
      setPage(p);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const handleDelete = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));

  if (loading) return <LoadingSpinner />;

  if (posts.length === 0) return (
    <EmptyState
      icon={Rss}
      title={t("feed.noFeed")}
      desc={t("feed.noFeedDesc")}
    />
  );

  return (
    <div className=" mx-auto">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} onDelete={handleDelete} />
      ))}
      {hasMore && (
        <div className="flex justify-center pb-6">
          <button
            onClick={() => load(page + 1)}
            disabled={loadingMore}
            className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-[#E6E0F8] dark:border-slate-700 rounded-xl text-sm font-semibold text-[#6D44CC] hover:bg-[#F0EEF9] transition-colors"
          >
            {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : t("feed.loadMore")}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Clips Tab ────────────────────────────────────────────────────────────────

function ClipsTab({ currentUserId }: { currentUserId: string }) {
  const { t } = useTranslation();
  const [clips, setClips] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [showEntryBtn, setShowEntryBtn] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => { loadClips(); }, []);

  async function loadClips() {
    setLoading(true);
    try {
      const { data } = await apiGet<any>(`/community/clips?limit=20`);
      setClips(data ?? []);
    } finally {
      setLoading(false);
    }
  }

  // IntersectionObserver to track which clip is active
  useEffect(() => {
    if (!clips.length) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute("data-index") ?? "0", 10);
            setActiveIndex(index);
          }
        });
      },
      { threshold: 0.6 }
    );

    const container = containerRef.current;
    if (container) {
      Array.from(container.children).forEach((child) => {
        observerRef.current?.observe(child);
      });
    }
    return () => observerRef.current?.disconnect();
  }, [clips]);

  const handleEntryClick = () => {
    setShowEntryBtn(false);
    // Desktop: scroll suave até a grade de clips
    // Mobile: foca no container de scroll de tela cheia
    sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) return <LoadingSpinner />;

  if (clips.length === 0) return (
    <EmptyState icon={Clapperboard} title={t("feed.noClips")} desc={t("feed.noClipsDesc")} />
  );

  return (
    <div ref={sectionRef} className="-mx-6 md:-mx-10 mt-[4em] relative">
      {/* Desktop: grid layout */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 px-6 md:px-10">
        {clips.map((clip, i) => (
          <div key={clip.id} className="relative rounded-2xl overflow-hidden aspect-[9/16] bg-black shadow-md">
            <ClipPlayer clip={clip} currentUserId={currentUserId} isActive={activeIndex === i} />
          </div>
        ))}
      </div>

      {/* Mobile: TikTok-style full-screen vertical scroll */}
      <div
        ref={containerRef}
        className="md:hidden overflow-y-scroll snap-y snap-mandatory"
        style={{ height: "calc(95dvh - 64px)" }}
      >
        {clips.map((clip, i) => (
          <div
            key={clip.id}
            data-index={String(i)}
            className="relative w-full snap-start snap-always"
            style={{ height: "calc(95dvh - 64px)" }}
          >
            <ClipPlayer clip={clip} currentUserId={currentUserId} isActive={activeIndex === i} />
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showEntryBtn && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.9 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            /* Explicando as classes:
               - fixed: Fixa o elemento na tela.
               - bottom-10: Distância do rodapé.
               - left-1/2 e -translate-x-1/2: A técnica mais precisa para centralização horizontal.
               - md:hidden: Faz o botão desaparecer em telas maiores que 768px.
            */
            className="fixed bottom-10 left-0 w-full flex flex-col items-center justify-center z-40 md:hidden"
          >
            <button
              onClick={handleEntryClick}
              className="flex items-center gap-3 pl-4 pr-6 py-3.5 rounded-full bg-[#6D44CC] text-white font-bold text-sm shadow-2xl shadow-[#6D44CC]/40 hover:bg-[#5a35b0] active:scale-95 transition-all whitespace-nowrap"
            >
              <span className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Play className="h-4 w-4 fill-white ml-0.5" />
              </span>
              Assistir Clips
            </button>

            {/* Indicador visual de scroll */}
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
            >
              <ChevronDown className="h-5 w-5 text-[#6D44CC]/60" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-[#6D44CC]" />
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-20 w-20 rounded-2xl bg-[#E6E0F8]/40 flex items-center justify-center mb-4">
        <Icon className="h-9 w-9 text-[#6D44CC]/50" />
      </div>
      <p className="font-bold text-[#1A1A1A] dark:text-white text-lg">{title}</p>
      {desc && <p className="text-slate-400 text-sm mt-1 max-w-sm">{desc}</p>}
    </div>
  );
}
