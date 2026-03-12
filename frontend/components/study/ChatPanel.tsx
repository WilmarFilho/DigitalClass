"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";

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
  subjectColor = "#4F46E5",
  subjectTitle = "este tema",
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loadingIntro, setLoadingIntro] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    async function loadChat() {
      setLoadingIntro(true);
      try {
        const existing = await apiGet<Array<{ role: string; content: string }>>(
          "/study/sessions/" + sessionId + "/chat/messages"
        );
        if (existing?.length > 0) {
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
            content: `Olá! Você está estudando ${subjectTitle}. Faça perguntas para aprofundar seu entendimento. Bom estudo!`,
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
        { role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div
        className="shrink-0 rounded-t-xl px-4 py-3"
        style={{ backgroundColor: `${subjectColor}15`, borderBottom: `2px solid ${subjectColor}` }}
      >
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <MessageCircle className="h-5 w-5" style={{ color: subjectColor }} />
          Chat com IA
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Pergunte o que quiser sobre o tema. A IA vai te ajudar a estudar.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4"
      >
        {loadingIntro && (
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Carregando introdução...</span>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  msg.role === "assistant" ? "bg-indigo-100" : "bg-slate-200"
                }`}
              >
                {msg.role === "assistant" ? (
                  <Bot className="h-4 w-4 text-indigo-600" />
                ) : (
                  <span className="text-xs font-bold text-slate-600">V</span>
                )}
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-800"
                }`}
              >
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="shrink-0 border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Faça uma pergunta..."
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={sending || loadingIntro}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending || loadingIntro}
            size="icon"
            className="shrink-0"
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
