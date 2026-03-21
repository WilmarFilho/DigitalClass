"use client";

import { useState, useEffect, useRef } from "react";
import { X, Heart, Send, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useTranslation } from "@/hooks/useTranslation";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  liked_by_me: boolean;
  like_count: number;
  author: { id: string; full_name: string; avatar_url: string | null };
  replies: Comment[];
}

interface CommentDrawerProps {
  open: boolean;
  onClose: () => void;
  postId: string;
  currentUserId: string;
  onCommentAdded?: () => void;
}

export function CommentDrawer({ open, onClose, postId, currentUserId, onCommentAdded }: CommentDrawerProps) {
  const { t } = useTranslation();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) loadComments();
  }, [open, postId]);

  useEffect(() => {
    if (replyTo) inputRef.current?.focus();
  }, [replyTo]);

  async function loadComments() {
    setLoading(true);
    try {
      const res = await apiGet<any>(`/community/posts/${postId}/comments?limit=30`);
      setComments(res.data ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function handleSend() {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      const body: any = { content: text.trim() };
      if (replyTo) body.parent_id = replyTo.id;
      const newComment = await apiPost<Comment>(`/community/posts/${postId}/comments`, body);
      if (replyTo) {
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyTo.id ? { ...c, replies: [...c.replies, newComment] } : c
          )
        );
        setExpandedReplies((prev) => new Set(prev).add(replyTo.id));
      } else {
        setComments((prev) => [...prev, { ...newComment, replies: [], like_count: 0, liked_by_me: false }]);
        onCommentAdded?.();
      }
      setText("");
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  }

  async function handleLikeComment(commentId: string) {
    const prev = comments.find((c) => c.id === commentId);
    if (!prev) return;
    setComments((cs) =>
      cs.map((c) =>
        c.id === commentId
          ? { ...c, liked_by_me: !c.liked_by_me, like_count: c.liked_by_me ? c.like_count - 1 : c.like_count + 1 }
          : c
      )
    );
    try {
      await apiPost(`/community/comments/${commentId}/like`, {});
    } catch {
      setComments((cs) =>
        cs.map((c) =>
          c.id === commentId
            ? { ...c, liked_by_me: prev.liked_by_me, like_count: prev.like_count }
            : c
        )
      );
    }
  }

  async function handleDelete(commentId: string, isReply: boolean, parentId?: string) {
    if (!confirm("Excluir este comentário?")) return;
    try {
      await apiDelete(`/community/comments/${commentId}`);
      if (isReply && parentId) {
        setComments((cs) =>
          cs.map((c) =>
            c.id === parentId ? { ...c, replies: c.replies.filter((r) => r.id !== commentId) } : c
          )
        );
      } else {
        setComments((cs) => cs.filter((c) => c.id !== commentId));
      }
    } catch { }
  }

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      next.has(commentId) ? next.delete(commentId) : next.add(commentId);
      return next;
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  const Initials = ({ name, url }: { name: string; url: string | null }) => {
    const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    return (
      <div className="h-8 w-8 rounded-full bg-[#6D44CC] flex items-center justify-center text-white font-bold text-xs shrink-0 overflow-hidden">
        {url ? <Image src={url} alt={name} width={32} height={32} className="object-cover w-full h-full" /> : <span>{initials}</span>}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:ml-72 fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              className="w-full z-[60] bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E6E0F8]/50 dark:border-slate-800 shrink-0">
                <h3 className="font-bold text-[#1A1A1A] dark:text-white">Comentários</h3>
                <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              {/* Comments List */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {loading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-[#6D44CC]" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-10">Nenhum comentário ainda. Seja o primeiro!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id}>
                      <div className="flex gap-3">
                        <Initials name={comment.author.full_name} url={comment.author.avatar_url} />
                        <div className="flex-1">
                          <div className="bg-[#F8F7FF] dark:bg-slate-800 rounded-2xl px-4 py-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold text-sm text-[#1A1A1A] dark:text-white">{comment.author.full_name}</span>
                              <span className="text-[11px] text-slate-400">{formatDate(comment.created_at)}</span>
                            </div>
                            <p className="text-sm text-[#3A3A3A] dark:text-slate-300">{comment.content}</p>
                          </div>
                          <div className="flex items-center gap-4 mt-1.5 px-1">
                            <button
                              onClick={() => handleLikeComment(comment.id)}
                              className={cn("flex items-center gap-1 text-xs font-medium transition-colors", comment.liked_by_me ? "text-red-500" : "text-slate-400 hover:text-red-400")}
                            >
                              <Heart className={cn("h-3.5 w-3.5", comment.liked_by_me && "fill-red-500")} />
                              {comment.like_count > 0 && <span>{comment.like_count}</span>}
                            </button>
                            <button
                              onClick={() => setReplyTo({ id: comment.id, name: comment.author.full_name })}
                              className="text-xs font-semibold text-slate-400 hover:text-[#6D44CC] transition-colors"
                            >
                              {t("feed.responder")}
                            </button>
                            {comment.user_id === currentUserId && (
                              <button
                                onClick={() => handleDelete(comment.id, false)}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors ml-auto"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                          {/* Replies toggle */}
                          {comment.replies.length > 0 && (
                            <button
                              onClick={() => toggleReplies(comment.id)}
                              className="flex items-center gap-1 mt-2 px-1 text-xs font-semibold text-[#6D44CC]"
                            >
                              {expandedReplies.has(comment.id) ? (
                                <><ChevronUp className="h-3.5 w-3.5" />{t("feed.ocultarRespostas")}</>
                              ) : (
                                <><ChevronDown className="h-3.5 w-3.5" />{t("feed.verRespostas").replace("{count}", String(comment.replies.length))}</>
                              )}
                            </button>
                          )}
                          {/* Replies */}
                          <AnimatePresence>
                            {expandedReplies.has(comment.id) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-3 space-y-3 pl-4 border-l-2 border-[#E6E0F8] dark:border-slate-700"
                              >
                                {comment.replies.map((reply) => (
                                  <div key={reply.id} className="flex gap-2">
                                    <Initials name={reply.author.full_name} url={reply.author.avatar_url} />
                                    <div className="flex-1">
                                      <div className="bg-[#F8F7FF] dark:bg-slate-800 rounded-2xl px-3 py-2">
                                        <div className="flex items-center justify-between mb-0.5">
                                          <span className="font-semibold text-xs text-[#1A1A1A] dark:text-white">{reply.author.full_name}</span>
                                          <span className="text-[10px] text-slate-400">{formatDate(reply.created_at)}</span>
                                        </div>
                                        <p className="text-xs text-[#3A3A3A] dark:text-slate-300">{reply.content}</p>
                                      </div>
                                      {reply.user_id === currentUserId && (
                                        <button
                                          onClick={() => handleDelete(reply.id, true, comment.id)}
                                          className="text-[11px] text-red-400 hover:text-red-600 ml-1 mt-1"
                                        >
                                          Excluir
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="shrink-0 px-5 pb-6 pt-3 border-t border-[#E6E0F8]/50 dark:border-slate-800">
                {replyTo && (
                  <div className="flex items-center justify-between mb-2 text-xs text-[#6D44CC] font-medium bg-[#E6E0F8]/40 rounded-xl px-3 py-2">
                    <span>Respondendo a <strong>{replyTo.name}</strong></span>
                    <button onClick={() => setReplyTo(null)}><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}
                <div className="flex gap-3 items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    value={text}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder={replyTo ? `Responder @${replyTo.name}...` : t("feed.comentar")}
                    className="flex-1 bg-[#F8F7FF] dark:bg-slate-800 border border-[#E6E0F8] dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-[#1A1A1A] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#6D44CC]/30 focus:border-[#6D44CC] transition-all"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!text.trim() || sending}
                    className="h-10 w-10 rounded-xl bg-[#6D44CC] flex items-center justify-center text-white disabled:opacity-40 hover:bg-[#5a35b0] transition-colors"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </motion.div>

          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
