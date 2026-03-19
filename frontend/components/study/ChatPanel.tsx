"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, Loader2, Bot, X, Plus, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  sessionId: string;
  subjectColor?: string;
  subjectTitle?: string;
}

interface SessionHighlight {
  id: string;
  text: string;
}

interface ChatMessage {
  role: string;
  content: string;
}

export function ChatPanel({
  sessionId,
  subjectColor = "#6D44CC",
  subjectTitle = "este tema",
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [highlights, setHighlights] = useState<SessionHighlight[]>([]);
  const [input, setInput] = useState("");
  const [loadingIntro, setLoadingIntro] = useState(true);
  const [savingHighlight, setSavingHighlight] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [nextSteps, setNextSteps] = useState<string[]>([]);

  const loadNextSteps = async (currentHistory: any[]) => {
    try {
      const steps = await apiPost<string[]>(`/study/sessions/${sessionId}/chat/next-steps`, {
        history: currentHistory
      });
      setNextSteps(steps);
    } catch (e) {
      setNextSteps([]);
    }
  };

  // Floating reference button state
  const [selectionRange, setSelectionRange] = useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [quotedText, setQuotedText] = useState<string | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    const dismissPopup = () => setSelectionRange(null);
    document.addEventListener("mousedown", dismissPopup);
    return () => document.removeEventListener("mousedown", dismissPopup);
  }, []);

  const handleTextSelection = async (e: React.MouseEvent) => {
    e.stopPropagation();

    setTimeout(async () => {
      const selection = window.getSelection();
      if (!selection) return;

      const text = selection.toString().trim();
      if (!text || text.length < 3) return;

      const anchorNode = selection.anchorNode;
      if (anchorNode && anchorNode.parentElement && !anchorNode.parentElement.closest('.assistant-message')) {
        return;
      }

      const exists = highlights.some(h => h.text.includes(text) || text.includes(h.text));
      if (!exists && !savingHighlight) {
        setSavingHighlight(true);
        try {
          const newHighlight = await apiPost<SessionHighlight>(
            `/study/sessions/${sessionId}/chat/highlights`,
            { text }
          );
          setHighlights(prev => [...prev, newHighlight]);
          selection.removeAllRanges();
        } catch (err) {
          console.error("Failed to save highlight:", err);
        } finally {
          setSavingHighlight(false);
        }
      }
    }, 0);
  };

  const handleMouseEnterHighlight = (e: React.MouseEvent, textString: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setSelectionRange({
      text: textString,
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
  };

  const handleSelectStep = async (step: string) => {
    if (sending) return;

    // 1. Limpa sugestões para evitar cliques duplos e dar feedback visual
    setNextSteps([]);

    // 2. Adiciona a mensagem do usuário ao chat visualmente
    const userMsg = { role: "user" as const, content: `Gostaria de aprender sobre: ${step}` };
    setMessages((m) => [...m, userMsg]);
    setSending(true);

    try {
      // 3. Bate no novo endpoint dedicado ou no chat passando o contexto
      const { message } = await apiPost<{ message: string }>(
        `/study/sessions/${sessionId}/chat/suggested-topic`,
        {
          topic: step,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }
      );

      const assistantMsg = { role: "assistant" as const, content: message };
      setMessages((m) => [...m, assistantMsg]);

      // 4. Carrega os PRÓXIMOS passos baseados nessa nova explicação
      loadNextSteps([...messages, userMsg, assistantMsg]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Não consegui iniciar esse tópico agora. Pode tentar digitar?" },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleMouseLeaveHighlight = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setSelectionRange(null);
    }, 150);
  };

  const handleMouseEnterPopup = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handleMouseLeavePopup = () => {
    handleMouseLeaveHighlight();
  };

  const handleQuoteInChat = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectionRange) {
      setQuotedText(selectionRange.text);
      setSelectionRange(null);
      window.getSelection()?.removeAllRanges();

      // Focus input
      setTimeout(() => {
        const inputEl = document.getElementById("chat-input");
        if (inputEl) inputEl.focus();
      }, 0);
    }
  };

  useEffect(() => {
    async function loadChat() {
      setLoadingIntro(true);
      try {
        const sessionDetailPromise = apiGet<any>("/study/sessions/" + sessionId + "/detail").catch(() => null);
        const detail = await sessionDetailPromise;
        if (detail && detail.highlights) {
          setHighlights(detail.highlights);
        }
        if (detail && detail.chat_messages && detail.chat_messages.length > 0) {
          setMessages(detail.chat_messages);
          setLoadingIntro(false);
          return;
        }

        const { message } = await apiGet<{ message: string }>(
          "/study/sessions/" + sessionId + "/chat/intro"
        );

        const introMsg = { role: "assistant", content: message };

        setMessages([introMsg]);
        loadNextSteps([introMsg]);

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

    // Construct the payload with quoted text if present
    const fullText = quotedText ? `> "${quotedText}"\n\n${text}` : text;
    setQuotedText(null);

    setMessages((m) => [...m, { role: "user", content: fullText }]);
    setSending(true);

    try {
      const { message } = await apiPost<{ message: string }>(
        "/study/sessions/" + sessionId + "/chat",
        {
          message: fullText,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }
      );

      const assistantMsg = { role: "assistant", content: message };
      setMessages(prev => [...prev, assistantMsg]);
      loadNextSteps([...messages, { role: "user", content: fullText }, assistantMsg]);


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
    <div className="flex relative h-full min-h-0 flex-col rounded-[24px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">

      {/* Pop-up de Citação */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectionRange && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 10 }}
              className="fixed z-50 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-800 p-1.5 shadow-xl pointer-events-auto"
              onMouseEnter={handleMouseEnterPopup}
              onMouseLeave={handleMouseLeavePopup}
              style={{
                left: selectionRange.x,
                top: selectionRange.y - 10,
                transform: 'translateX(-50%)'
              }}
            >
              <Button
                size="sm"
                variant="ghost"
                className="h-8 px-3 text-xs font-bold text-white hover:bg-slate-700 hover:text-white"
                onClick={handleQuoteInChat}
              >
                <MessageCircle className="mr-2 h-3.5 w-3.5" />
                Adicionar ao Chat
              </Button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

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
        onMouseUp={handleTextSelection}
        className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] [background-position:center]"
      >
        {loadingIntro && (
          <div className="flex items-center justify-center py-4 gap-2 text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-xs font-bold uppercase tracking-tighter">Iniciando conversa...</span>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            let renderedContent = <>{msg.content}</>;

            if (msg.role === "assistant" && highlights.length > 0) {
              let text = msg.content;
              const substrings: { start: number; end: number; match: string }[] = [];

              highlights.forEach(h => {
                let startIndex = 0;
                let idx;
                while ((idx = text.indexOf(h.text, startIndex)) > -1) {
                  substrings.push({ start: idx, end: idx + h.text.length, match: h.text });
                  startIndex = idx + h.text.length;
                }
              });

              if (substrings.length > 0) {
                substrings.sort((a, b) => a.start - b.start);

                // Merge overlapping or adjacent ranges
                const mergedRanges = [substrings[0]];
                for (let j = 1; j < substrings.length; j++) {
                  const last = mergedRanges[mergedRanges.length - 1];
                  const curr = substrings[j];
                  if (curr.start <= last.end) {
                    last.end = Math.max(last.end, curr.end);
                  } else {
                    mergedRanges.push(curr);
                  }
                }

                const parts = [];
                let lastEnd = 0;
                mergedRanges.forEach((range, rmIdx) => {
                  if (range.start > lastEnd) {
                    parts.push(<span key={`t-${rmIdx}`}>{text.slice(lastEnd, range.start)}</span>);
                  }
                  parts.push(
                    <mark
                      key={`m-${rmIdx}`}
                      className="bg-yellow-200 text-slate-900 rounded-sm px-0.5 shadow-sm cursor-pointer relative transition-colors hover:bg-yellow-300"
                      onMouseEnter={(e) => handleMouseEnterHighlight(e, text.slice(range.start, range.end))}
                      onMouseLeave={handleMouseLeaveHighlight}
                    >
                      {text.slice(range.start, range.end)}
                    </mark>
                  );
                  lastEnd = range.end;
                });

                if (lastEnd < text.length) {
                  parts.push(<span key={`t-end`}>{text.slice(lastEnd)}</span>);
                }

                renderedContent = <>{parts}</>;
              }
            }

            return (
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
                      : "bg-white border border-slate-100 text-slate-700 rounded-bl-none assistant-message"
                  )}
                >
                  <p className="whitespace-pre-wrap">{renderedContent}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {sending && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="h-8 w-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-[#6D44CC]" />
            </div>
          </motion.div>
        )}
      </div>

      <div className="flex flex-wrap md:flex-nowrap gap-3 px-4 py-3 mb-2 w-full justify-between items-stretch">
        <AnimatePresence mode="popLayout">
          {!sending && nextSteps.map((step, idx) => (
            <motion.button
              key={step}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: idx * 0.05 }}
              disabled={sending}
              onClick={() => handleSelectStep(step)}
              className={cn(
                // flex-1 faz com que cada card ocupe o mesmo espaço disponível
                // items-stretch no container pai garante que todos tenham a mesma altura
                "group relative flex flex-1 flex-col items-start gap-1.5 p-3 min-w-[120px]",
                "bg-white border border-slate-200 rounded-xl shadow-sm",
                "hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-500/10",
                "transition-all duration-200 active:scale-95 disabled:opacity-50 text-left"
              )}
            >
              {/* Ícone sutil no topo */}
              <div className="flex items-center justify-between w-full">
                <div className="p-1.5 bg-indigo-50 rounded-lg group-hover:bg-[#6D44CC] transition-colors">
                  <Sparkles className="h-3 w-3 text-[#6D44CC] group-hover:text-white" />
                </div>
                <ChevronRight className="h-3 w-3 text-slate-300 group-hover:text-[#6D44CC] transition-colors" />
              </div>

              {/* Texto do Tópico */}
              <div className="mt-1 w-full">
                <span className="block text-[9px] uppercase tracking-wider text-slate-400 font-black mb-0.5 group-hover:text-indigo-400 transition-colors">
                  Sugestão
                </span>
                <p className="text-xs font-bold text-slate-700 leading-tight line-clamp-2 group-hover:text-slate-900">
                  {step}
                </p>
              </div>

              {/* Overlay de brilho no hover */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-[#6D44CC]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Input de Mensagem */}
      <div className="shrink-0 p-4 bg-white border-t border-slate-100 flex flex-col gap-3">
        {quotedText && (
          <div className="relative flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 shadow-sm mx-1">
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-yellow-600 mb-1">
                Respondendo a citação
              </span>
              <p className="text-xs font-medium text-slate-700 leading-snug line-clamp-2 italic">
                "{quotedText}"
              </p>
            </div>
            <button
              onClick={() => setQuotedText(null)}
              className="mt-0.5 text-yellow-600 hover:text-yellow-800 transition-colors p-1 rounded-md hover:bg-yellow-100/50"
              title="Remover citação"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
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