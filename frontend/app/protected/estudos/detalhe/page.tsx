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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Flashcard } from "@/components/study/Flashcard";
import { apiGet } from "@/lib/api";

interface SessionDetail {
  id: string;
  subject_id: string | null;
  duration_minutes: number | null;
  created_at: string;
  subjects: { id: string; title: string; color_code: string } | null;
  chat_messages: Array<{ role: string; content: string }>;
  quiz_batches: Array<Array<{ question: string; answer: string; options: string[] }>>;
  flashcard_batches: Array<Array<{ question: string; answer: string }>>;
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <p className="text-slate-600">{error ?? "Sessão não encontrada"}</p>
        <Button asChild variant="outline">
          <Link href="/protected/estudos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  if (loading || !detail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const subjectColor = detail.subjects?.color_code ?? "#4F46E5";
  const subjectTitle = detail.subjects?.title ?? "Matéria";
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const currentFlashcardBatch = detail.flashcard_batches[expandedFlashcard ?? 0];
  const currentCard = currentFlashcardBatch?.[flashcardIndex];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/protected/estudos">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Voltar
              </Link>
            </Button>
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: subjectColor }}
            />
            <div>
              <h1 className="font-semibold text-slate-800">{subjectTitle}</h1>
              <p className="text-xs text-slate-500">
                {formatDate(detail.created_at)} · {detail.duration_minutes ?? 0} min
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 p-6">
        {detail.chat_messages.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
              <MessageCircle className="h-5 w-5" style={{ color: subjectColor }} />
              Conversa com a IA
            </h2>
            <div className="space-y-4">
              {detail.chat_messages.map((msg, i) => (
                <div
                  key={i}
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
                </div>
              ))}
            </div>
          </section>
        )}

        {detail.quiz_batches.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
              <HelpCircle className="h-5 w-5" style={{ color: subjectColor }} />
              Questionários ({detail.quiz_batches.length})
            </h2>
            <div className="space-y-6">
              {detail.quiz_batches.map((batch, bi) => (
                <div key={bi} className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedQuiz(expandedQuiz === bi ? null : bi)}
                    className="flex w-full items-center justify-between text-left font-medium text-slate-700"
                  >
                    Questionário {bi + 1} · {batch.length} questões
                    <span>{expandedQuiz === bi ? "−" : "+"}</span>
                  </button>
                  {expandedQuiz === bi && (
                    <div className="mt-4 space-y-4">
                      {batch.map((q, qi) => {
                        const ans = (q.answer ?? "").toUpperCase().trim().charAt(0);
                        const idx = ans.charCodeAt(0) - 65;
                        const correctOpt = q.options?.[idx];
                        return (
                          <div key={qi} className="rounded-lg bg-white p-4 shadow-sm">
                            <p className="font-medium text-slate-800">{q.question}</p>
                            <p className="mt-2 text-sm text-emerald-700">
                              Resposta correta: {correctOpt ?? q.answer}
                            </p>
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

        {detail.flashcard_batches.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-800">
              <Layers className="h-5 w-5" style={{ color: subjectColor }} />
              Flashcards ({detail.flashcard_batches.length} conjuntos)
            </h2>
            <div className="space-y-4">
              {detail.flashcard_batches.map((batch, bi) => (
                <div key={bi} className="rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedFlashcard(expandedFlashcard === bi ? null : bi);
                      setFlashcardIndex(0);
                    }}
                    className="flex w-full items-center justify-between text-left font-medium text-slate-700"
                  >
                    Conjunto {bi + 1} · {batch.length} cards
                    <span>{expandedFlashcard === bi ? "−" : "+"}</span>
                  </button>
                  {expandedFlashcard === bi && currentCard && (
                    <div className="mt-4 flex flex-col items-center">
                      <div className="w-full max-w-sm">
                        <Flashcard
                          question={currentCard.question}
                          answer={currentCard.answer}
                          color={subjectColor}
                        />
                      </div>
                      <div className="mt-3 flex items-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFlashcardIndex((i) => Math.max(0, i - 1))}
                          disabled={flashcardIndex === 0}
                        >
                          Anterior
                        </Button>
                        <span className="text-sm text-slate-500">
                          {flashcardIndex + 1} / {batch.length}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setFlashcardIndex((i) => Math.min(batch.length - 1, i + 1))
                          }
                          disabled={flashcardIndex >= batch.length - 1}
                        >
                          Próximo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {detail.chat_messages.length === 0 &&
          detail.quiz_batches.length === 0 &&
          detail.flashcard_batches.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <p className="text-slate-500">
                Esta sessão não possui conteúdo gerado (chat, questionários ou flashcards).
              </p>
            </div>
          )}
      </main>
    </div>
  );
}
