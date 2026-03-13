"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  sessionId: string;
  subjectColor?: string;
  subjectTitle?: string;
}

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

export function ChatPanel({
  sessionId,
  subjectColor = "#6D44CC",
  subjectTitle = "este tema",
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loadingIntro, setLoadingIntro] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    async function loadChat() {
      setLoadingIntro(true);
      try {
        const existing = await apiGet<Array<{ role: string; content: string }>>(
          "/study/sessions/" + sessionId + "/chat/messages"
        );
        if (existing && existing.length > 0) {
          setMessages(existing as ChatMessage[]);
          setLoadingIntro(false);
          return;
        }
        const { message } = await apiGet<{ message: string }>(
          "/study/sessions/" + sessionId + "/chat/intro"
        );
        setMessages([{ role: "assistant", content: message }]);
      } catch {
        setMessages([
          {
            role: "assistant",
            content: `Olá! Vamos aprofundar em ${subjectTitle}. O que você gostaria de esclarecer agora?`,
          },
        ]);
      } finally {
        setLoadingIntro(false);
      }
    }
    loadChat();
  }, [sessionId, subjectTitle]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);

    try {
      const { message } = await apiPost<{ message: string }>(
        "/study/sessions/" + sessionId + "/chat",
        {
          message: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }
      );
      setMessages((m) => [...m, { role: "assistant", content: message }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Ops, tive um problema. Pode repetir?" },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
      {/* Header com Gradiente Sutil */}
      <div 
        className="shrink-0 px-6 py-5 border-b border-slate-100"
        style={{ background: `linear-gradient(135deg, ${subjectColor}05, ${subjectColor}12)` }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white shadow-sm">
            <MessageCircle className="h-5 w-5" style={{ color: subjectColor }} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">
              Chat com Tutor IA
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              Dúvidas em tempo real
            </p>
          </div>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] [background-position:center]"
      >
        {loadingIntro && (
          <div className="flex items-center justify-center py-4 gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-tighter">Iniciando conversa...</span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex gap-3 items-end",
                msg.role === "user" ? "flex-row-reverse" : "flex-row"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-black text-[10px] shadow-sm mb-1",
                  msg.role === "assistant" 
                    ? "bg-white border border-slate-200 text-slate-400" 
                    : "bg-slate-900 text-white"
                )}
              >
                {msg.role === "assistant" ? <Bot className="h-4 w-4 text-[#6D44CC]" /> : "EU"}
              </div>
              
              <div
                className={cn(
                  "max-w-[85%] rounded-[20px] px-5 py-3 text-sm leading-relaxed shadow-sm font-medium",
                  msg.role === "user"
                    ? "bg-[#6D44CC] text-white rounded-br-none"
                    : "bg-white border border-slate-100 text-slate-700 rounded-bl-none"
                )}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {sending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-[#6D44CC]" />
            </div>
          </motion.div>
        )}
      </div>

      {/* Input de Mensagem */}
      <div className="shrink-0 p-4 bg-white border-t border-slate-100">
        <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-[#6D44CC] transition-all focus-within:ring-4 focus-within:ring-[#6D44CC]/5">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Tire sua dúvida agora..."
            className="flex-1 bg-transparent px-4 py-2 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
            disabled={sending || loadingIntro}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending || loadingIntro}
            size="icon"
            className="h-10 w-10 rounded-xl bg-[#6D44CC] hover:bg-[#5B39AB] text-white transition-all shadow-md active:scale-95 shrink-0"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}