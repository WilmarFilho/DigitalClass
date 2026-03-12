"use client";

import { useState, useEffect } from "react";
import { Layers, Loader2, ChevronLeft, ChevronRight, History, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Flashcard } from "./Flashcard";
import { apiGet, apiPost } from "@/lib/api";

interface FlashcardItem {
  id?: string;
  question: string;
  answer: string;
}

interface FlashcardPanelProps {
  sessionId: string;
  subjectColor?: string;
}

export function FlashcardPanel({ sessionId, subjectColor = "#4F46E5" }: FlashcardPanelProps) {
  const [batches, setBatches] = useState<FlashcardItem[][]>([]);
  const [currentBatch, setCurrentBatch] = useState<FlashcardItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null);

  const cards = currentBatch ?? [];
  const current = cards[currentIndex];

  const loadAssets = async () => {
    try {
      const data = await apiGet<{ flashcard_batches: FlashcardItem[][] }>(
        "/study/sessions/" + sessionId + "/assets"
      );
      setBatches(data?.flashcard_batches ?? []);
    } catch {
      setBatches([]);
    } finally {
      setLoadingAssets(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, [sessionId]);

  const handleGenerate = async () => {
    setLoading(true);
    setCurrentBatch(null);
    setCurrentIndex(0);
    try {
      const data = await apiPost<FlashcardItem[]>(
        "/study/sessions/" + sessionId + "/flashcards/generate",
        { count: 5 }
      );
      const items = Array.isArray(data) ? data : [];
      setCurrentBatch(items);
      setBatches((b) => [...b, items]);
    } catch {
      const fallback: FlashcardItem[] = [
        { question: "O que é o tema em estudo?", answer: "É um conceito fundamental para seu aprendizado." },
        { question: "Qual a importância?", answer: "Consolidar conhecimentos e preparar para provas." },
      ];
      setCurrentBatch(fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleRevisar = (batch: FlashcardItem[]) => {
    setCurrentBatch(batch);
    setCurrentIndex(0);
    setExpandedBatch(null);
  };

  const hasContent = batches.length > 0 || currentBatch !== null || loading;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div
        className="shrink-0 rounded-t-xl px-4 py-3"
        style={{ backgroundColor: `${subjectColor}15`, borderBottom: `2px solid ${subjectColor}` }}
      >
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <Layers className="h-5 w-5" style={{ color: subjectColor }} />
          Flashcards
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Gere cards e revise os conjuntos anteriores.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 flex flex-col">
        {loadingAssets && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}

        {batches.length > 0 && !loading && (
          <div className="space-y-2 mb-4">
            <button
              type="button"
              onClick={() => setExpandedBatch(expandedBatch === 0 ? null : 0)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico ({batches.length} conjunto{batches.length !== 1 ? "s" : ""})
              </span>
              {expandedBatch === 0 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {expandedBatch === 0 && (
              <div className="space-y-2 pl-2 border-l-2 border-slate-200">
                {batches.map((batch, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleRevisar(batch)}
                    className="block w-full rounded-lg bg-white px-3 py-2 text-left text-sm text-slate-600 shadow-sm ring-1 ring-slate-200 hover:ring-indigo-300"
                  >
                    Conjunto {i + 1} · {batch.length} cards
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!hasContent && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-8">
            <Layers className="h-12 w-12 text-slate-300" />
            <p className="text-center text-sm text-slate-500">
              Clique no botão para gerar flashcards sobre o tema.
            </p>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar flashcards"}
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        {!loading && current && (
          <div className="w-full max-w-sm space-y-4 mx-auto flex-1 flex flex-col">
            <Flashcard
              key={currentIndex}
              question={current.question}
              answer={current.answer}
              color={subjectColor}
            />
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-500">
                {currentIndex + 1} / {cards.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex((i) => Math.min(cards.length - 1, i + 1))}
                disabled={currentIndex >= cards.length - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => {
                setCurrentBatch(null);
                setCurrentIndex(0);
              }}
            >
              Concluir e gerar novos
            </Button>
          </div>
        )}

        {!loading && !current && hasContent && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-4">
            <Button onClick={handleGenerate} disabled={loading}>
              Gerar novos flashcards
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
