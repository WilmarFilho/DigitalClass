"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, Play, ExternalLink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiPost, apiDelete } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { CommentDrawer } from "./CommentDrawer";

export interface PostMedia {
  id: string;
  type: "image" | "video";
  url: string;
  order_index: number;
}

export interface PostAuthor {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export interface Post {
  id: string;
  teacher_id: string;
  type: "text" | "photo" | "video" | "clip";
  caption: string | null;
  created_at: string;
  author: PostAuthor;
  media: PostMedia[];
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
}

interface PostCardProps {
  post: Post;
  currentUserId: string;
  onDelete?: (id: string) => void;
  showDeleteButton?: boolean;
  showMoreVisible?: boolean;
}

export function PostCard({ post, currentUserId, onDelete, showDeleteButton, showMoreVisible = true }: PostCardProps) {
  const { t } = useTranslation();
  const [liked, setLiked] = useState(post.liked_by_me);
  const [likeCount, setLikeCount] = useState(post.like_count);
  const [commentCount, setCommentCount] = useState(post.comment_count);
  const [showComments, setShowComments] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLike = async () => {
    const prev = liked;
    setLiked(!liked);
    setLikeCount((c) => (prev ? c - 1 : c + 1));
    try {
      await apiPost(`/community/posts/${post.id}/like`, {});
    } catch {
      setLiked(prev);
      setLikeCount((c) => (prev ? c + 1 : c - 1));
    }
  };

  const handleDelete = async () => {
    if (!confirm(t("comunidade.confirmDelete"))) return;
    setDeleting(true);
    try {
      await apiDelete(`/community/posts/${post.id}`);
      onDelete?.(post.id);
    } catch {
      setDeleting(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  const initials = post.author?.full_name
    ? post.author.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E6E0F8]/70 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#6D44CC] flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden">
              {post.author?.avatar_url ? (
                <Image src={post.author.avatar_url} alt={post.author.full_name} width={40} height={40} className="object-cover w-full h-full" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <Link
                href={`/protected/professores/${post.teacher_id}`}
                className="font-semibold text-[#1A1A1A] dark:text-white text-sm hover:text-[#6D44CC] transition-colors"
              >
                {post.author?.full_name ?? "Professor"}
              </Link>
              <p className="text-[11px] text-slate-400">{formatDate(post.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showMoreVisible && (
              <Link
                href={`/protected/professores/${post.teacher_id}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#6D44CC] bg-[#E6E0F8]/50 hover:bg-[#E6E0F8] px-3 py-1.5 rounded-full transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("feed.verAreas")}
              </Link>
            )}
            {showDeleteButton && post.teacher_id === currentUserId && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-full text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Caption */}
        {post.caption && (
          <p className="px-5 pb-3 text-sm text-[#3A3A3A] dark:text-slate-300 leading-relaxed">
            {post.caption}
          </p>
        )}

        {/* Media */}
        {post.media && post.media.length > 0 && (
          <div className={cn(
            "w-full overflow-hidden",
            post.media.length === 1 ? "" : "grid gap-1",
            post.media.length === 2 && "grid-cols-2",
            post.media.length === 3 && "grid-cols-3",
            post.media.length >= 4 && "grid-cols-2",
          )}>
            {post.media.slice(0, 4).map((m, idx) => (
              <div
                key={m.id}
                className={cn(
                  "relative bg-black overflow-hidden",
                  post.media.length === 1 ? "aspect-video" : "aspect-square",
                  post.media.length >= 4 && idx === 0 && post.media.length % 2 !== 0 && "col-span-2"
                )}
              >
                {m.type === "image" ? (
                  <Image
                    src={m.url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="relative w-full h-full">
                    <video
                      src={m.url}
                      className="w-full h-full object-cover"
                      controls={post.type === "video"}
                      muted
                      playsInline
                    />
                    {post.type !== "video" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="h-12 w-12 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="h-5 w-5 text-[#6D44CC] ml-0.5" fill="#6D44CC" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {post.media.length > 4 && idx === 3 && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xl font-bold">+{post.media.length - 4}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-5 px-5 py-3 border-t border-[#E6E0F8]/40 dark:border-slate-800 mt-2">
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium transition-colors",
              liked ? "text-red-500" : "text-slate-400 hover:text-red-400"
            )}
          >
            <Heart className={cn("h-4.5 w-4.5", liked && "fill-red-500")} />
            <span>{likeCount}</span>
          </button>
          <button
            onClick={() => setShowComments(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-[#6D44CC] transition-colors"
          >
            <MessageCircle className="h-4.5 w-4.5" />
            <span>{commentCount}</span>
          </button>
        </div>
      </div>

      <CommentDrawer
        open={showComments}
        onClose={() => setShowComments(false)}
        postId={post.id}
        currentUserId={currentUserId}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
      />
    </>
  );
}


