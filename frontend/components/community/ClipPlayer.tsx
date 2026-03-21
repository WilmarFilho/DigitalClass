"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, MessageCircle, ExternalLink, Volume2, VolumeX, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiPost } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { CommentDrawer } from "./CommentDrawer";
import { Post } from "./PostCard";

interface ClipPlayerProps {
  clip: Post;
  currentUserId: string;
  isActive: boolean;
}

export function ClipPlayer({ clip, currentUserId, isActive }: ClipPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(clip.liked_by_me);
  const [likeCount, setLikeCount] = useState(clip.like_count);
  const [commentCount, setCommentCount] = useState(clip.comment_count);
  const [showComments, setShowComments] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      video.pause();
      video.currentTime = 0;
      setPlaying(false);
    }
  }, [isActive]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setPlaying(true));
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const handleLike = async () => {
    const prev = liked;
    setLiked(!liked);
    setLikeCount((c) => (prev ? c - 1 : c + 1));
    try {
      await apiPost(`/community/posts/${clip.id}/like`, {});
    } catch {
      setLiked(prev);
      setLikeCount((c) => (prev ? c + 1 : c - 1));
    }
  };

  const videoUrl = clip.media[0]?.url;
  const initials = clip.author?.full_name
    ? clip.author.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <>
      <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            loop
            muted={muted}
            playsInline
            className="w-full h-full object-cover"
            onClick={togglePlay}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#6D44CC] to-[#F38B4B]">
            <p className="text-white text-lg font-bold px-8 text-center">{clip.caption}</p>
          </div>
        )}

        {/* Play/Pause overlay */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-opacity duration-200",
            playing ? "opacity-0 hover:opacity-100" : "opacity-100"
          )}
          onClick={togglePlay}
        >
          {!playing && (
            <div className="h-16 w-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <Play className="h-8 w-8 text-white ml-1" fill="white" />
            </div>
          )}
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

        {/* Top controls */}
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
            className="h-9 w-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
          >
            {muted ? <VolumeX className="h-4 w-4 text-white" /> : <Volume2 className="h-4 w-4 text-white" />}
          </button>
        </div>

        {/* Right actions */}
        <div className="absolute right-4 bottom-24 z-10 flex flex-col items-center gap-5">
          <button onClick={handleLike} className="flex flex-col items-center gap-1">
            <div className={cn(
              "h-11 w-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center",
              liked && "bg-red-500/70"
            )}>
              <Heart className={cn("h-5 w-5 text-white", liked && "fill-white")} />
            </div>
            <span className="text-white text-xs font-bold drop-shadow">{likeCount}</span>
          </button>

          <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
            <div className="h-11 w-11 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
            <span className="text-white text-xs font-bold drop-shadow">{commentCount}</span>
          </button>

          <Link href={`/protected/professores/${clip.teacher_id}`}>
            <div className="h-11 w-11 rounded-full bg-[#6D44CC]/80 backdrop-blur-sm flex items-center justify-center">
              <ExternalLink className="h-5 w-5 text-white" />
            </div>
            <span className="text-white text-[10px] font-bold drop-shadow text-center block mt-1">Áreas</span>
          </Link>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-4 left-4 right-16 z-10">
          <Link href={`/protected/professores/${clip.teacher_id}`} className="flex items-center gap-2.5 mb-2">
            <div className="h-9 w-9 rounded-full border-2 border-white overflow-hidden bg-[#6D44CC] flex items-center justify-center text-white font-bold text-xs shrink-0">
              {clip.author?.avatar_url ? (
                <Image src={clip.author.avatar_url} alt="" width={36} height={36} className="object-cover w-full h-full" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <span className="text-white font-bold text-sm drop-shadow">{clip.author?.full_name}</span>
          </Link>
          {clip.caption && (
            <p className="text-white text-sm drop-shadow leading-snug line-clamp-2">{clip.caption}</p>
          )}
        </div>
      </div>

      <CommentDrawer
        open={showComments}
        onClose={() => setShowComments(false)}
        postId={clip.id}
        currentUserId={currentUserId}
        onCommentAdded={() => setCommentCount((c) => c + 1)}
      />
    </>
  );
}
