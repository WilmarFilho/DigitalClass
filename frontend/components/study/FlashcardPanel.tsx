"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Loader2, ChevronLeft, ChevronRight, History, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
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

export function FlashcardPanel({ sessionId, subjectColor = "#6D44CC" }: FlashcardPanelProps) {
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
    <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
      {/* Header Estilizado */}
      <div 
        className="shrink-0 px-6 py-5 border-b border-slate-100"
        style={{ background: `linear-gradient(135deg, ${subjectColor}05, ${subjectColor}12)` }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white shadow-sm">
            <Layers className="h-5 w-5" style={{ color: subjectColor }} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">
              Flashcards
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              Memorização Ativa
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col custom-scrollbar">
        {loadingAssets && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        )}

        {/* Histórico com visual de Pill */}
        {batches.length > 0 && !loading && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setExpandedBatch(expandedBatch === 0 ? null : 0)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 text-left transition-colors hover:bg-slate-100"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <History className="h-3.5 w-3.5" />
                Histórico ({batches.length})
              </span>
              {expandedBatch === 0 ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>
            <AnimatePresence>
              {expandedBatch === 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 gap-2 mt-2 pl-2 border-l-2 border-slate-100">
                    {batches.map((batch, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleRevisar(batch)}
                        className="text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors bg-white border border-slate-100 shadow-sm"
                      >
                        Conjunto #{i + 1} • {batch.length} cards
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Estado Vazio */}
        {!hasContent && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-8 text-center">
            <div className="p-6 bg-slate-50 rounded-full">
              <Sparkles className="h-12 w-12 text-slate-200" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">Nenhum card gerado</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Transforme este tema em flashcards para fixar o conteúdo.</p>
            </div>
            <Button 
              onClick={handleGenerate} 
              className="bg-slate-900 hover:bg-black text-white rounded-xl px-8 font-bold text-xs uppercase tracking-widest shadow-lg shadow-slate-200"
            >
              Gerar agora
            </Button>
          </div>
        )}

        {/* Loading de Geração */}
        {loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-slate-200" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Criando flashcards...</p>
          </div>
        )}

        {/* Interface de Estudo */}
        {!loading && current && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center"
          >
            <div className="flex-1 flex flex-col justify-center min-h-[300px]">
              <Flashcard
                key={currentIndex}
                question={current.question}
                answer={current.answer}
                color={subjectColor}
              />
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 rounded-2xl p-2 border border-slate-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl hover:bg-white hover:shadow-sm"
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  Card {currentIndex + 1} / {cards.length}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-xl hover:bg-white hover:shadow-sm"
                  onClick={() => setCurrentIndex((i) => Math.min(cards.length - 1, i + 1))}
                  disabled={currentIndex >= cards.length - 1}
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full border-2 border-slate-100 rounded-2xl py-6 font-bold text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-[0.98]"
                onClick={() => {
                  setCurrentBatch(null);
                  setCurrentIndex(0);
                }}
              >
                Finalizar Revisão
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}