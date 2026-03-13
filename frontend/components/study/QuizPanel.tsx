"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, Check, X, Loader2, History, ChevronDown, ChevronUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost } from "@/lib/api";
import { cn } from "@/lib/utils";

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

export function QuizPanel({ sessionId, subjectColor = "#6D44CC" }: QuizPanelProps) {
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
    <div className="flex h-full min-h-0 flex-col rounded-[24px] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden font-sans">
      {/* Header */}
      <div 
        className="shrink-0 px-6 py-5 border-b border-slate-100"
        style={{ background: `linear-gradient(135deg, ${subjectColor}05, ${subjectColor}12)` }}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white shadow-sm">
            <HelpCircle className="h-5 w-5" style={{ color: subjectColor }} />
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-xs uppercase tracking-widest">
              Questionários
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
              Avaliação de Performance
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {loadingAssets && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          </div>
        )}

        {/* Histórico */}
        {batches.length > 0 && !loading && (
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setExpandedBatch(expandedBatch === 0 ? null : 0)}
              className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2.5 transition-colors hover:bg-slate-100"
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
                  className="overflow-hidden mt-2"
                >
                  <div className="grid grid-cols-1 gap-2 pl-2 border-l-2 border-slate-100">
                    {batches.map((batch, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleRevisar(batch)}
                        className="text-left px-3 py-2 rounded-lg text-[11px] font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors bg-white border border-slate-100 shadow-sm"
                      >
                        Quiz #{i + 1} • {batch.length} questões
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Empty State */}
        {!hasContent && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-12 text-center">
            <div className="p-6 bg-slate-50 rounded-full">
              <Trophy className="h-12 w-12 text-slate-200" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Pronto para o desafio?</p>
              <p className="text-xs text-slate-400 mt-1 max-w-[220px]">Gere questões personalizadas baseadas no seu estudo.</p>
            </div>
            <Button onClick={handleGenerate} className="bg-slate-900 hover:bg-black text-white rounded-xl px-8 font-bold text-xs uppercase tracking-widest shadow-lg">
              Gerar Questionário
            </Button>
          </div>
        )}

        {loading && (
          <div className="flex h-40 flex-col items-center justify-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-slate-200" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compilando questões...</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!loading && current && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 block">Pergunta {currentIndex + 1}</span>
                <p className="text-base font-bold text-slate-800 leading-snug">{current.question}</p>
              </div>

              <div className="space-y-3">
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
                      className={cn(
                        "w-full rounded-2xl border-2 px-5 py-4 text-left text-sm transition-all flex items-center gap-4 group",
                        showResult
                          ? correct
                            ? "border-emerald-500 bg-emerald-50 text-emerald-900"
                            : opt === selected
                              ? "border-red-400 bg-red-50 text-red-900"
                              : "border-slate-100 opacity-50"
                          : selected === opt
                            ? "border-[#6D44CC] bg-[#6D44CC]/5"
                            : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-md"
                      )}
                    >
                      <span className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-black text-xs transition-colors",
                        showResult 
                          ? correct ? "bg-emerald-500 text-white" : opt === selected ? "bg-red-400 text-white" : "bg-slate-100 text-slate-400"
                          : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                      )}>
                        {letter}
                      </span>
                      <span className="font-bold flex-1">{opt}</span>
                      {showResult && (
                        correct ? <Check className="h-5 w-5 text-emerald-500" /> : opt === selected ? <X className="h-5 w-5 text-red-400" /> : null
                      )}
                    </button>
                  );
                })}
              </div>

              {answered && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Button 
                    onClick={handleNext} 
                    className="w-full py-7 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl"
                  >
                    {isLast ? "Finalizar Quiz" : "Próxima Questão"}
                  </Button>
                </motion.div>
              )}

              <div className="flex items-center justify-between px-2">
                <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden mx-4">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-500" 
                    style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase">
                  {currentIndex + 1} / {questions.length}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && !current && hasContent && (
          <div className="flex flex-col items-center gap-4 py-6">
             <div className="text-center mb-4">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Resultado Final</p>
                <p className="text-3xl font-black text-slate-900">{correctCount} / {batches[batches.length-1]?.length || 0}</p>
             </div>
            <Button onClick={handleGenerate} variant="outline" className="rounded-xl border-2 font-bold text-xs uppercase tracking-widest py-6 px-8">
              Novo Questionário
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}