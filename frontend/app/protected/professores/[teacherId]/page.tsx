"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft, Loader2, UserPlus, Check, BookOpen, Users, FileText,
  Lock, DollarSign, Star,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { PostCard, Post } from "@/components/community/PostCard";
import { createClient } from "@/lib/supabase/client";

interface TeacherProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  banner_url: string | null;
  follower_count: number;
  area_count: number;
  post_count: number;
  is_following: boolean;
}

interface Area {
  id: string;
  title: string;
  description: string | null;
  color_code: string;
  monthly_price: number;
  payment_model: 'recurring' | 'one_time';
  banner_url: string | null;
}

type ActiveTab = "areas" | "posts";

export default function TeacherPublicPage() {
  const { t } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const teacherId = params.teacherId as string;

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("areas");
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [following, setFollowing] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setCurrentUserId(session.user.id);
    });
    loadProfile();
    loadAreas();
  }, [teacherId]);

  async function loadProfile() {
    setLoading(true);
    try {
      const data = await apiGet<TeacherProfile>(`/community/teachers/${teacherId}/profile`);
      setProfile(data);
      setFollowing(data.is_following);
    } catch {
      router.back();
    } finally {
      setLoading(false);
    }
  }

  async function loadAreas() {
    try {
      const { data } = await apiGet<any>(`/community/teachers/${teacherId}/areas?limit=20`);
      setAreas(data ?? []);
    } catch { }
  }

  async function loadPosts() {
    if (postsLoaded) return;
    setPostsLoading(true);
    try {
      const { data } = await apiGet<any>(`/community/teachers/${teacherId}/posts?limit=12`);
      setPosts(data ?? []);
      setPostsLoaded(true);
    } finally {
      setPostsLoading(false);
    }
  }

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab === "posts") loadPosts();
  };

  const handleToggleFollow = async () => {
    if (!profile) return;
    const prev = following;
    setFollowing(!following);
    setProfile((p) => p ? {
      ...p,
      follower_count: prev ? p.follower_count - 1 : p.follower_count + 1,
      is_following: !prev,
    } : null);
    try {
      await apiPost(`/community/follow/${teacherId}`, {});
    } catch {
      setFollowing(prev);
      setProfile((p) => p ? { ...p, follower_count: prev ? p.follower_count + 1 : p.follower_count - 1, is_following: prev } : null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-[#6D44CC]" />
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const isSelf = profile.id === currentUserId;

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#6D44CC] transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-[#E6E0F8]/70 dark:border-slate-800 overflow-hidden shadow-sm mb-8">
        {/* Banner */}
        <div className="relative h-36 bg-gradient-to-br from-[#6D44CC]/30 to-[#F38B4B]/30">
          {profile.banner_url && (
            <Image src={profile.banner_url} alt="" fill className="object-cover" />
          )}
        </div>

        <div className="px-6 pb-6 relative">
          {/* Avatar + actions row */}
          <div className="flex items-end justify-between -mt-8 mb-4">
            <div className="h-16 w-16 rounded-2xl border-4 border-white dark:border-slate-900 bg-[#6D44CC] flex items-center justify-center text-white font-bold text-xl overflow-hidden shadow-lg">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt="" width={64} height={64} className="object-cover w-full h-full" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            {!isSelf && (
              <button
                onClick={handleToggleFollow}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all",
                  following
                    ? "bg-[#E6E0F8] text-[#6D44CC] hover:bg-red-50 hover:text-red-500"
                    : "bg-[#6D44CC] text-white hover:bg-[#5a35b0] shadow-md shadow-[#6D44CC]/20"
                )}
              >
                {following ? (
                  <><Check className="h-4 w-4" />{t("feed.following")}</>
                ) : (
                  <><UserPlus className="h-4 w-4" />{t("feed.follow")}</>
                )}
              </button>
            )}
          </div>

          <h1 className="text-xl font-bold text-[#1A1A1A] dark:text-white">{profile.full_name}</h1>

          {/* Stats */}
          <div className="flex flex-col min-[431px]:flex-row items-start min-[431px]:items-center gap-4 min-[431px]:gap-6 mt-3">
            <Stat value={profile.follower_count} label="seguidores" icon={Users} />
            <Stat value={profile.area_count} label="áreas" icon={BookOpen} />
            <Stat value={profile.post_count} label="posts" icon={FileText} />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[#F0EEF9] dark:bg-slate-800 rounded-2xl w-fit mb-6">
        <TabBtn active={activeTab === "areas"} onClick={() => handleTabChange("areas")}>
          <BookOpen className="h-4 w-4" />{t("teacherPage.areas")}
        </TabBtn>
        <TabBtn active={activeTab === "posts"} onClick={() => handleTabChange("posts")}>
          <FileText className="h-4 w-4" />{t("teacherPage.posts")}
        </TabBtn>
      </div>

      {/* Areas tab */}
      {activeTab === "areas" && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          {areas.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{t("teacherPage.noAreas")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {areas.map((area) => (
                <AreaCard key={area.id} area={area} />
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Posts tab */}
      {activeTab === "posts" && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
          {postsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#6D44CC]" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Nenhuma publicação ainda.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} currentUserId={currentUserId} showMoreVisible={false} />
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Stat({ value, label, icon: Icon }: { value: number; label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <Icon className="h-4 w-4 text-[#6D44CC]/60" />
      <span className="font-bold text-[#1A1A1A] dark:text-white">{value}</span>
      <span className="text-slate-400">{label}</span>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
        active
          ? "bg-white dark:bg-slate-900 text-[#6D44CC] shadow-sm"
          : "text-slate-500 hover:text-[#6D44CC]"
      )}
    >
      {children}
    </button>
  );
}

function AreaCard({ area }: { area: Area }) {
  const { t } = useTranslation();
  return (
    <Link
      href={`/protected/professores/area/${area.id}`}
      className="group bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E0F8]/70 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      {/* Color bar / banner */}
      <div
        className="h-2 w-full"
        style={{ background: area.color_code || "#6D44CC" }}
      />
      {area.banner_url && (
        <div className="relative h-28 overflow-hidden">
          <Image src={area.banner_url} alt="" fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}
      <div className="p-4">
        <h3 className="font-bold text-[#1A1A1A] dark:text-white text-sm mb-1 line-clamp-1">{area.title}</h3>
        {area.description && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-3">{area.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-xs font-bold",
              area.monthly_price === 0 ? "text-green-500" : "text-[#6D44CC]"
            )}
          >
            {area.monthly_price === 0
              ? t("teacherPage.free")
              : `R$ ${area.monthly_price.toFixed(2).replace(".", ",")}${area.payment_model === 'one_time' ? t("teacherPage.oneTime") : t("teacherPage.perMonth")}`}
          </span>
          <span className="text-xs font-semibold text-white bg-[#6D44CC] px-3 py-1 rounded-full">
            {t("teacherPage.subscribe")}
          </span>
        </div>
      </div>
    </Link>
  );
}
