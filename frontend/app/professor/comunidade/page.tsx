"use client";

import { useState, useEffect, useRef } from "react";
import {
  Plus, Type, Image as ImageIcon, Video, Film, X, Loader2,
  Trash2, Users, Heart, MessageCircle, Upload,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";
import { PostCard, Post } from "@/components/community/PostCard";
import { createClient } from "@/lib/supabase/client";

type PostType = "text" | "photo" | "video" | "clip";

const POST_TYPES: { type: PostType; label: string; icon: React.ElementType; accept: string }[] = [
  { type: "text", label: "Texto", icon: Type, accept: "" },
  { type: "photo", label: "Foto", icon: ImageIcon, accept: "image/*" },
  { type: "video", label: "Vídeo", icon: Video, accept: "video/*" },
  { type: "clip", label: "Clip", icon: Film, accept: "video/*" },
];

interface MediaPreview {
  file: File;
  preview: string;
  type: "image" | "video";
}

export default function ComunidadePage() {
  const { t } = useTranslation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) setCurrentUserId(session.user.id);
    });
    loadPosts(1);
  }, []);

  async function loadPosts(p: number) {
    if (p === 1) setLoading(true); else setLoadingMore(true);
    try {
      const { data, meta } = await apiGet<any>(`/community/my-posts?page=${p}&limit=12`);
      if (p === 1) setPosts(data);
      else setPosts((prev) => [...prev, ...data]);
      setHasMore(meta.total > p * 12);
      setPage(p);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const handlePostCreated = (post: Post) => {
    setPosts((prev) => [post, ...prev]);
    setShowModal(false);
  };

  const handleDelete = (id: string) => setPosts((prev) => prev.filter((p) => p.id !== id));

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between items-start gap-6 mb-8 lg:gap-4">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold text-[#1A1A1A] dark:text-white tracking-tight">
            {t("comunidade.title")}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {t("comunidade.subtitle")}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[#6D44CC] text-white rounded-xl font-semibold text-sm hover:bg-[#5a35b0] transition-colors shadow-md shadow-[#6D44CC]/20 active:scale-95 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          {t("comunidade.newPost")}
        </button>
      </div>

      {/* Posts */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#6D44CC]" />
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-20 w-20 rounded-2xl bg-[#E6E0F8]/40 flex items-center justify-center mb-4">
            <Users className="h-9 w-9 text-[#6D44CC]/50" />
          </div>
          <p className="font-bold text-[#1A1A1A] dark:text-white text-lg">{t("comunidade.noPosts")}</p>
          <p className="text-slate-400 text-sm mt-1 max-w-sm">{t("comunidade.noPostsDesc")}</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-6 flex items-center gap-2 px-6 py-3 bg-[#6D44CC] text-white rounded-xl font-semibold text-sm hover:bg-[#5a35b0] transition-colors"
          >
            <Plus className="h-4 w-4" />
            {t("comunidade.newPost")}
          </button>
        </div>
      ) : (
        <>
          <div className="mx-auto space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUserId}
                onDelete={handleDelete}
                showDeleteButton={true}
                showMoreVisible={false}
              />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-8">
              <button
                onClick={() => loadPosts(page + 1)}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-[#E6E0F8] dark:border-slate-700 rounded-xl text-sm font-semibold text-[#6D44CC] hover:bg-[#F0EEF9] transition-colors"
              >
                {loadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : t("feed.loadMore")}
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Post Modal */}
      <AnimatePresence>
        {showModal && (
          <CreatePostModal
            onClose={() => setShowModal(false)}
            onCreated={handlePostCreated}
            currentUserId={currentUserId}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Create Post Modal ────────────────────────────────────────────────────────

function CreatePostModal({
  onClose,
  onCreated,
  currentUserId,
}: {
  onClose: () => void;
  onCreated: (post: Post) => void;
  currentUserId: string;
}) {
  const { t } = useTranslation();
  const [postType, setPostType] = useState<PostType>("text");
  const [caption, setCaption] = useState("");
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTypeConfig = POST_TYPES.find((p) => p.type === postType)!;

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const isVideo = postType === "video" || postType === "clip";
    const maxFiles = isVideo ? 1 : 4;
    const selected = files.slice(0, maxFiles);

    const previews: MediaPreview[] = selected.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: isVideo ? "video" : "image",
    }));

    setMediaPreviews((prev) => isVideo ? previews : [...prev, ...previews].slice(0, 4));
  };

  const removeMedia = (index: number) => {
    setMediaPreviews((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  };

  const handlePublish = async () => {
    if (!caption.trim() && mediaPreviews.length === 0) return;
    setPublishing(true);

    try {
      const supabase = createClient();
      const mediaItems: { url: string; type: "image" | "video" }[] = [];

      if (mediaPreviews.length > 0) {
        setUploading(true);
        for (let i = 0; i < mediaPreviews.length; i++) {
          const m = mediaPreviews[i];
          const ext = m.file.name.split(".").pop();
          const path = `${currentUserId}/${Date.now()}_${i}.${ext}`;
          const { error } = await supabase.storage.from("community").upload(path, m.file, { upsert: false });
          if (error) throw new Error(error.message);
          const { data: { publicUrl } } = supabase.storage.from("community").getPublicUrl(path);
          mediaItems.push({ url: publicUrl, type: m.type });
          setUploadProgress(Math.round(((i + 1) / mediaPreviews.length) * 100));
        }
        setUploading(false);
      }

      const post = await apiPost<Post>("/community/posts", {
        type: postType,
        caption: caption.trim() || null,
        media: mediaItems,
      });

      onCreated(post);
    } catch (err: any) {
      alert(err.message ?? "Erro ao publicar");
      setPublishing(false);
      setUploading(false);
    }
  };

  return (
    <>
      {/* Overlay / Container Principal */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        // Removido o onClick daqui para não fechar ao clicar no modal em si
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
      >
        {/* Este div invisível abaixo captura o clique fora para fechar o modal, 
         sem interferir nos cliques dentro do conteúdo.
      */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-[80] w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()} // Impede que o clique no modal feche ele
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-[#E6E0F8]/50 dark:border-slate-800">
            <h2 className="text-lg font-bold text-[#1A1A1A] dark:text-white">
              {t("comunidade.newPost")}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5 text-slate-400" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Post type selector */}
            <div className="grid grid-cols-2 min-[565px]:flex gap-2">
              {POST_TYPES.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => {
                    setPostType(type);
                    setMediaPreviews([]);
                  }}
                  className={cn(
                    // Removido o flex-1 para o grid funcionar corretamente nas colunas
                    "flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 text-xs font-semibold transition-all w-full",
                    postType === type
                      ? "border-[#6D44CC] bg-[#E6E0F8]/40 text-[#6D44CC]"
                      : "border-[#E6E0F8] dark:border-slate-700 text-slate-400 hover:border-[#6D44CC]/30 hover:text-[#6D44CC]"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Caption */}
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t("comunidade.captionPlaceholder")}
              rows={4}
              className="w-full bg-[#F8F7FF] dark:bg-slate-800 border border-[#E6E0F8] dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-[#1A1A1A] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D44CC]/30 focus:border-[#6D44CC] resize-none transition-all"
            />

            {/* Media upload */}
            {postType !== "text" && (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={currentTypeConfig.accept}
                  multiple={postType === "photo"}
                  onChange={handleFilesSelected}
                  className="hidden"
                />

                {mediaPreviews.length === 0 ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-[#E6E0F8] dark:border-slate-700 rounded-2xl py-8 flex flex-col items-center gap-2 text-slate-400 hover:border-[#6D44CC]/40 hover:text-[#6D44CC] transition-colors"
                  >
                    <Upload className="h-7 w-7" />
                    <span className="text-sm font-medium">{t("comunidade.uploadMedia")}</span>
                    <span className="text-xs opacity-70">
                      {postType === "photo" ? "Até 4 imagens" : "Um vídeo"}
                    </span>
                  </button>
                ) : (
                  <div className={cn(
                    "grid gap-2",
                    mediaPreviews.length === 1 ? "grid-cols-1" : "grid-cols-2"
                  )}>
                    {mediaPreviews.map((m, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden aspect-square bg-black">
                        {m.type === "image" ? (
                          <Image src={m.preview} alt="" fill className="object-cover" />
                        ) : (
                          <video src={m.preview} className="w-full h-full object-cover" muted controls />
                        )}
                        <button
                          onClick={() => removeMedia(i)}
                          className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 flex items-center justify-center"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}
                    {postType === "photo" && mediaPreviews.length < 4 && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-xl border-2 border-dashed border-[#E6E0F8] dark:border-slate-700 flex items-center justify-center text-slate-400 hover:border-[#6D44CC]/40 hover:text-[#6D44CC] transition-colors"
                      >
                        <Plus className="h-7 w-7" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Upload progress */}
            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Fazendo upload...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="h-1.5 bg-[#E6E0F8] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#6D44CC] rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-5 border-t border-[#E6E0F8]/50 dark:border-slate-800">
            <button
              onClick={onClose}
              disabled={publishing}
              className="flex-1 py-3 rounded-xl border border-[#E6E0F8] dark:border-slate-700 text-slate-500 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t("comunidade.cancel")}
            </button>
            <button
              onClick={handlePublish}
              disabled={publishing || (!caption.trim() && mediaPreviews.length === 0)}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-[#6D44CC] text-white font-semibold text-sm hover:bg-[#5a35b0] disabled:opacity-50 transition-colors"
            >
              {publishing ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{t("comunidade.publishing")}</>
              ) : (
                t("comunidade.publish")
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}
