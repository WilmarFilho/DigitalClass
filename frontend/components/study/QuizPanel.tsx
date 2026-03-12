"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Check, X, Loader2, History, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";

interface QuizQuestion {
  id?: string;
  question: string;
  answer: string;
  options: string[];
}

interface QuizPanelProps {
  sessionId: string;
  subjectColor?: string;
}

export function QuizPanel({ sessionId, subjectColor = "#4F46E5" }: QuizPanelProps) {
  const [batches, setBatches] = useState<QuizQuestion[][]>([]);
  const [currentBatch, setCurrentBatch] = useState<QuizQuestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [expandedBatch, setExpandedBatch] = useState<number | null>(null);

  const questions = currentBatch ?? [];
  const current = questions[currentIndex];
  const isLast = currentIndex >= questions.length - 1;
  const answered = selected !== null;

  const loadAssets = async () => {
    try {
      const data = await apiGet<{ quiz_batches: QuizQuestion[][] }>(
        "/study/sessions/" + sessionId + "/assets"
      );
      setBatches(data?.quiz_batches ?? []);
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
    setSelected(null);
    setCorrectCount(0);
    try {
      const data = await apiPost<QuizQuestion[]>("/study/sessions/" + sessionId + "/quiz/generate", {
        count: 5,
      });
      const items = Array.isArray(data) ? data : [];
      setCurrentBatch(items);
      setBatches((b) => [...b, items]);
    } catch {
      const fallback: QuizQuestion[] = [
        {
          question: "Questão de exemplo sobre o tema",
          answer: "A",
          options: ["Alternativa correta", "Alternativa B", "Alternativa C", "Alternativa D"],
        },
      ];
      setCurrentBatch(fallback);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (opt: string) => {
    if (answered || !current) return;
    const letter = String.fromCharCode(65 + current.options.indexOf(opt));
    setSelected(opt);
    if (letter === (current.answer ?? "").toUpperCase().trim().charAt(0)) {
      setCorrectCount((c) => c + 1);
    }
  };

  const handleNext = () => {
    if (isLast) {
      setCurrentBatch(null);
      setCurrentIndex(0);
      setSelected(null);
    } else {
      setCurrentIndex((i) => i + 1);
      setSelected(null);
    }
  };

  const handleRevisar = (batch: QuizQuestion[]) => {
    setCurrentBatch(batch);
    setCurrentIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setExpandedBatch(null);
  };

  const getOptionLetter = (opt: string) => {
    const i = current?.options.indexOf(opt);
    return i >= 0 ? String.fromCharCode(65 + i) : "";
  };

  const isCorrect = (opt: string) => {
    const letter = getOptionLetter(opt);
    const ans = (current?.answer ?? "").toUpperCase().trim().charAt(0);
    return letter === ans;
  };

  const hasContent = batches.length > 0 || currentBatch !== null || loading;

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div
        className="shrink-0 rounded-t-xl px-4 py-3"
        style={{ backgroundColor: `${subjectColor}15`, borderBottom: `2px solid ${subjectColor}` }}
      >
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <HelpCircle className="h-5 w-5" style={{ color: subjectColor }} />
          Questionários
        </h3>
        <p className="mt-1 text-xs text-slate-600">
          Gere questões e revise os questionários anteriores.
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 space-y-4">
        {loadingAssets && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        )}

        {batches.length > 0 && !loading && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setExpandedBatch(expandedBatch === 0 ? null : 0)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico ({batches.length} questionário{batches.length !== 1 ? "s" : ""})
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
                    Questionário {i + 1} · {batch.length} questões
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {!hasContent && !loading && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <HelpCircle className="h-12 w-12 text-slate-300" />
            <p className="text-center text-sm text-slate-500">
              Clique no botão para gerar um questionário com questões de múltipla escolha.
            </p>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar questionário"}
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        )}

        <AnimatePresence mode="wait">
          {!loading && current && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <p className="font-medium text-slate-800">{current.question}</p>
              <div className="space-y-2">
                {current.options.map((opt) => {
                  const letter = getOptionLetter(opt);
                  const correct = isCorrect(opt);
                  const showResult = answered && (opt === selected || correct);
                  return (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleSelect(opt)}
                      disabled={answered}
                      className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm transition-all ${
                        showResult
                          ? correct
                            ? "border-emerald-500 bg-emerald-50"
                            : opt === selected
                              ? "border-red-400 bg-red-50"
                              : "border-slate-200"
                          : selected === opt
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="font-semibold">{letter}.</span>
                        {opt}
                        {showResult &&
                          (correct ? (
                            <Check className="h-4 w-4 text-emerald-600 ml-auto" />
                          ) : opt === selected ? (
                            <X className="h-4 w-4 text-red-500 ml-auto" />
                          ) : null)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {answered && (
                <Button onClick={handleNext} className="w-full">
                  {isLast ? "Concluir" : "Próxima"}
                </Button>
              )}
              <p className="text-center text-xs text-slate-500">
                {currentIndex + 1} / {questions.length}
                {answered && ` · ${correctCount} correta(s)`}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && !current && hasContent && (
          <div className="flex flex-col items-center gap-4 py-4">
            <Button onClick={handleGenerate} disabled={loading}>
              Gerar novo questionário
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
