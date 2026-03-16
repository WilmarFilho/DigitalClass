"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  HelpCircle,
  Layers,
  Bot,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Highlighter,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Flashcard } from "@/components/study/Flashcard";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SessionDetail {
  id: string;
  subject_id: string | null;
  duration_minutes: number | null;
  created_at: string;
  subjects: { id: string; title: string; color_code: string } | null;
  chat_messages: Array<{ role: string; content: string }>;
  quiz_batches: Array<Array<{ question: string; answer: string; options: string[] }>>;
  flashcard_batches: Array<Array<{ question: string; answer: string }>>;
  highlights: Array<{ id: string; text: string; created_at: string }>;
}

export default function DetalheSessaoPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedQuiz, setExpandedQuiz] = useState<number | null>(null);
  const [expandedFlashcard, setExpandedFlashcard] = useState<number | null>(null);
  const [flashcardIndex, setFlashcardIndex] = useState(0);

  useEffect(() => {
    if (!sessionId) {
      setError("Sessão não encontrada");
      setLoading(false);
      return;
    }
    apiGet<SessionDetail>("/study/sessions/" + sessionId + "/detail")
      .then(setDetail)
      .catch(() => setError("Não foi possível carregar a sessão"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (!sessionId || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#FAFAFE] p-6 text-center">
        <div className="p-4 bg-red-50 rounded-full">
          <ArrowLeft className="h-10 w-10 text-red-400" />
        </div>
        <p className="text-slate-600 font-medium">{error ?? "Sessão não encontrada"}</p>
        <Button asChild className="bg-[#6D44CC] hover:bg-[#5B39A8] rounded-xl px-8">
          <Link href="/protected/estudos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Estudos
          </Link>
        </Button>
      </div>
    );
  }

  if (loading || !detail) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAFAFE] gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#6D44CC]" />
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando detalhes...</p>
      </div>
    );
  }

  const subjectColor = detail.subjects?.color_code ?? "#6D44CC";
  const subjectTitle = detail.subjects?.title ?? "Matéria";

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const currentFlashcardBatch = detail.flashcard_batches[expandedFlashcard ?? 0];
  const currentCard = currentFlashcardBatch?.[flashcardIndex];

  return (
    <div className="min-h-screen bg-[#FAFAFE] pb-20">
      {/* Header Sticky com Estilo Premium */}
      <header className="sticky top-0 z-30 border-b border-[#E6E0F8] bg-white/80 backdrop-blur-md px-4 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/protected/estudos">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-[#F5F3FF] text-[#6D44CC]">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: subjectColor }} />
                <h1 className="text-lg font-black text-[#1A1A1A] tracking-tight">{subjectTitle}</h1>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(detail.created_at)}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatTime(detail.created_at)}</span>
                <span className="text-[#6D44CC]">{detail.duration_minutes ?? 0} MINUTOS</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-10 p-6 mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Seção de Conversa com IA */}
        {detail.chat_messages.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Bot className="h-5 w-5 text-[#6D44CC]" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Mentoria IA</h3>
            </div>
            <div className="rounded-[32px] border border-[#E6E0F8] bg-white p-6 shadow-sm space-y-6">
              {detail.chat_messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
                >
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl shadow-sm border",
                    msg.role === "assistant" ? "bg-[#F5F3FF] border-[#E6E0F8]" : "bg-white border-slate-100"
                  )}>
                    {msg.role === "assistant" ? (
                      <Bot className="h-5 w-5 text-[#6D44CC]" />
                    ) : (
                      <span className="text-xs font-black text-slate-400 tracking-tighter">VOCÊ</span>
                    )}
                  </div>
                  <div className={cn(
                    "max-w-[80%] rounded-[24px] px-5 py-3.5 text-sm leading-relaxed shadow-sm",
                    msg.role === "user"
                      ? "bg-[#6D44CC] text-white rounded-tr-none"
                      : "bg-[#F8F9FC] text-slate-700 border border-[#F1F0FB] rounded-tl-none"
                  )}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trechos Marcados */}
        {detail.highlights && detail.highlights.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Highlighter className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Trechos Marcados</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {detail.highlights.map((highlight, index) => (
                <div key={index} className="relative group overflow-hidden rounded-3xl border border-amber-100 bg-amber-50/30 p-5 transition-all hover:shadow-md">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-300" />
                  <p className="text-sm font-bold text-amber-900 leading-relaxed italic mb-3">
                    "{highlight.text}"
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600/60 uppercase">
                    <Clock className="h-3 w-3" /> {formatTime(highlight.created_at)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Questionários */}
        {detail.quiz_batches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <HelpCircle className="h-5 w-5 text-[#6D44CC]" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Questionários</h3>
            </div>
            <div className="space-y-3">
              {detail.quiz_batches.map((batch, bi) => (
                <div key={bi} className="overflow-hidden rounded-3xl border border-[#E6E0F8] bg-white transition-all shadow-sm">
                  <button
                    type="button"
                    onClick={() => setExpandedQuiz(expandedQuiz === bi ? null : bi)}
                    className={cn(
                      "flex w-full items-center justify-between p-5 text-left transition-colors",
                      expandedQuiz === bi ? "bg-[#F5F3FF]" : "hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-xl border border-[#E6E0F8] shadow-sm">
                        <HelpCircle className="h-4 w-4 text-[#6D44CC]" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#1A1A1A]">Conjunto de Questões #{bi + 1}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{batch.length} perguntas geradas</p>
                      </div>
                    </div>
                    {expandedQuiz === bi ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </button>
                  {expandedQuiz === bi && (
                    <div className="p-5 space-y-4 bg-slate-50/50 border-t border-[#E6E0F8]">
                      {batch.map((q, qi) => {
                        const ans = (q.answer ?? "").toUpperCase().trim().charAt(0);
                        const idx = ans.charCodeAt(0) - 65;
                        const correctOpt = q.options?.[idx];
                        return (
                          <div key={qi} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                            <p className="font-bold text-slate-800 text-sm mb-3">{q.question}</p>
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 border border-emerald-100">
                              <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                                <Bot className="h-3 w-3 text-white" />
                              </div>
                              <p className="text-xs font-bold text-emerald-700">
                                Resposta: {correctOpt ?? q.answer}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Flashcards */}
        {detail.flashcard_batches.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Layers className="h-5 w-5 text-[#6D44CC]" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Flashcards Revistos</h3>
            </div>
            <div className="space-y-4">
              {detail.flashcard_batches.map((batch, bi) => (
                <div key={bi} className="rounded-[32px] border border-[#E6E0F8] bg-white p-4 shadow-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedFlashcard(expandedFlashcard === bi ? null : bi);
                      setFlashcardIndex(0);
                    }}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-[#F5F3FF] flex items-center justify-center text-[#6D44CC] font-black">
                        {bi + 1}
                      </div>
                      <div>
                        <p className="font-black text-[#1A1A1A]">Deck de Estudo</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{batch.length} cards disponíveis</p>
                      </div>
                    </div>
                    {expandedFlashcard === bi ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronRight className="h-5 w-5 text-slate-400" />}
                  </button>

                  {expandedFlashcard === bi && currentCard && (
                    <div className="mt-4 flex flex-col items-center pb-6 animate-in zoom-in-95 duration-300">
                      <div className="w-full max-w-sm drop-shadow-xl">
                        <Flashcard
                          question={currentCard.question}
                          answer={currentCard.answer}
                          color={subjectColor}
                        />
                      </div>
                      <div className="mt-8 flex items-center gap-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl font-bold text-[#6D44CC] hover:bg-[#F5F3FF]"
                          onClick={() => setFlashcardIndex((i) => Math.max(0, i - 1))}
                          disabled={flashcardIndex === 0}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                        </Button>
                        <div className="px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                          {flashcardIndex + 1} / {batch.length}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="rounded-xl font-bold text-[#6D44CC] hover:bg-[#F5F3FF]"
                          onClick={() =>
                            setFlashcardIndex((i) => Math.min(batch.length - 1, i + 1))
                          }
                          disabled={flashcardIndex >= batch.length - 1}
                        >
                          Próximo <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Estado Vazio Refinado */}
        {detail.chat_messages.length === 0 &&
          detail.quiz_batches.length === 0 &&
          detail.flashcard_batches.length === 0 && (
            <div className="rounded-[40px] border border-dashed border-[#E6E0F8] bg-white p-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-[#F5F3FF]">
                <Bot className="h-8 w-8 text-[#6D44CC]/40" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Sessão Silenciosa</h3>
              <p className="mx-auto max-w-xs text-sm font-medium text-slate-400 leading-relaxed mt-2">
                Nesta sessão você optou por estudar sem a interação da IA. O tempo foi contabilizado com sucesso!
              </p>
            </div>
          )}
      </main>
    </div>
  );
}