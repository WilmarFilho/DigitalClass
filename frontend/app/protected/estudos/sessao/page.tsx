"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, BookOpen, LayoutDashboard, Brain, MessageCircle, Layers, ChevronLeft, ChevronRight, Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/study/ChatPanel";
import { QuizPanel } from "@/components/study/QuizPanel";
import { FlashcardPanel } from "@/components/study/FlashcardPanel";
import { SessionTimer } from "@/components/study/SessionTimer";
import { apiGet, apiPatch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

interface Session {
  id: string;
  subject_id: string | null;
  subjects: { id: string; title: string; color_code: string } | null;
  calendar_events?: { id: string; duration_minutes: number } | null;
}

const PANELS_CONFIG = [
  { key: "quiz" as const, labelKey: "studySession.quizLabel", icon: Brain },
  { key: "chat" as const, labelKey: "studySession.chatLabel", icon: MessageCircle },
  { key: "flashcards" as const, labelKey: "studySession.flashcardsLabel", icon: Layers },
] as const;

// Custom breakpoint: 1200px
function useIsCompact() {
  const [isCompact, setIsCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1199px)");
    setIsCompact(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsCompact(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isCompact;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? "-100%" : "100%",
    opacity: 0,
  }),
};

export default function SessaoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId");
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { t } = useTranslation();

  // Mobile panel navigation
  const isCompact = useIsCompact();
  const [[activePanel, direction], setActivePanel] = useState<[number, number]>([1, 0]); // Start on Chat
  const [timerPopup, setTimerPopup] = useState(false);

  const PANELS = PANELS_CONFIG.map(p => ({ ...p, label: t(p.labelKey as any) }));

  const paginate = (newIndex: number) => {
    setActivePanel([newIndex, newIndex > activePanel ? 1 : -1]);
  };

  const elapsedRef = useRef(0);
  const saveDuration = useCallback((isFinished = false) => {
    const mins = Math.floor(elapsedRef.current / 60);
    if ((mins > 0 || isFinished) && sessionId) {
      apiPatch("/study/sessions/" + sessionId, {
        duration_minutes: mins,
        is_finished: isFinished
      }).catch(() => { });
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setError(t("studySession.notFound"));
      setLoading(false);
      return;
    }
    apiGet<Session>("/study/sessions/" + sessionId)
      .then(setSession)
      .catch(() => setError(t("studySession.loadError")))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    const handleBeforeUnload = () => saveDuration(false);
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveDuration(false);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [saveDuration]);

  if (!sessionId || error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 p-6">
        <div className="text-center">
          <p className="text-slate-400 font-black text-xs uppercase tracking-[0.2em] mb-2">{t("studySession.connectionError")}</p>
          <h2 className="text-slate-800 font-bold text-lg">{error ?? t("studySession.notFound")}</h2>
        </div>
        <Button asChild variant="outline" className="rounded-2xl border-2 font-bold px-8">
          <Link href="/protected/estudos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("studySession.backToStudies")}
          </Link>
        </Button>
      </div>
    );
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-slate-200" />
        <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t("studySession.loadingEnv")}</p>
      </div>
    );
  }

  const subjectColor = session.subjects?.color_code ?? "#6D44CC";
  const subjectTitle = session.subjects?.title ?? "Matéria";

  // Panels rendered for compact mode — all always mounted but only active one is visible
  const panelComponents = [
    <QuizPanel key="quiz" sessionId={sessionId} subjectColor={subjectColor} />,
    <ChatPanel key="chat" sessionId={sessionId} subjectColor={subjectColor} subjectTitle={subjectTitle} />,
    <FlashcardPanel key="flashcards" sessionId={sessionId} subjectColor={subjectColor} />,
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC]">
      {/* Header Premium */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-3 sm:px-6 py-3 sm:py-4 shadow-sm z-10">
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all shrink-0"
            onClick={() => {
              saveDuration(true);
              router.push("/protected/estudos");
            }}
          >
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">{t("sidebar.sair")}</span>
          </Button>

          <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div
              className="p-1.5 sm:p-2 rounded-lg shadow-inner flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${subjectColor}15` }}
            >
              <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: subjectColor }} />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5 sm:mb-1">
                {t("studySession.activeSession")}
              </p>
              <h1 className="font-black text-slate-900 text-xs sm:text-sm uppercase tracking-tight leading-none truncate">
                {subjectTitle}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Desktop/Tablet: Prominent Timer Card */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 shadow-lg shadow-slate-300/30 border border-slate-700/50">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
            </div>
            <SessionTimer
              className="border-none shadow-none bg-transparent p-0 [&_span.font-mono]:text-white [&_span.font-mono]:text-base [&_svg]:text-slate-400 [&_.hidden]:!block [&_.hidden_span]:text-slate-500"
              initialSeconds={((session as { duration_minutes?: number }).duration_minutes ?? 0) * 60}
              onTick={(s) => { elapsedRef.current = s; }}
            />
            {session.calendar_events && session.calendar_events.duration_minutes > 0 && (
              <>
                <div className="h-5 w-px bg-slate-600" />
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t("studySession.goal")}</span>
                  <span className="text-xs font-black text-amber-400 tabular-nums">{session.calendar_events.duration_minutes} min</span>
                </div>
              </>
            )}
          </div>

          {/* Mobile: Timer Icon Button */}
          <button
            onClick={() => setTimerPopup(true)}
            className="md:hidden relative h-10 w-10 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shadow-lg shadow-slate-300/30 active:scale-95 transition-transform"
          >
            <Timer className="h-4.5 w-4.5 text-white" />
            <span className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white">
              <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-60" />
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Timer Popup */}
      <AnimatePresence>
        {timerPopup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 md:hidden" onClick={() => setTimerPopup(false)}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="relative w-full max-w-xs rounded-[2rem] bg-white shadow-2xl p-6 space-y-5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Popup Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center">
                    <Timer className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t("studySession.timer")}</p>
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" /> {t("studySession.inSession")}
                    </p>
                  </div>
                </div>
                <button onClick={() => setTimerPopup(false)} className="h-8 w-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                  <X className="h-4 w-4 text-slate-400" />
                </button>
              </div>

              {/* Timer Display */}
              <div className="flex flex-col items-center py-4">
                <SessionTimer
                  className="border-none shadow-none bg-transparent p-0 [&_span.font-mono]:text-3xl [&_span.font-mono]:text-slate-900 [&_svg]:hidden"
                  initialSeconds={((session as { duration_minutes?: number }).duration_minutes ?? 0) * 60}
                  onTick={(s) => { elapsedRef.current = s; }}
                />
              </div>

              {/* Meta Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{t("estudos.materia")}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subjectColor }} />
                    <span className="text-xs font-bold text-slate-700">{subjectTitle}</span>
                  </div>
                </div>
                {session.calendar_events && session.calendar_events.duration_minutes > 0 && (
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100">
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">{t("studySession.goal")}</span>
                    <span className="text-xs font-bold text-amber-700">{session.calendar_events.duration_minutes} {t("materias.minutes")}</span>
                  </div>
                )}
              </div>

              {/* Close Button */}
              <Button
                className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 font-bold"
                onClick={() => setTimerPopup(false)}
              >
                {t("studySession.close")}
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Desktop: 3-Column Grid — Compact: Single Panel with Slide */}
      {!isCompact ? (
        <main className="flex-1 min-h-0 grid grid-cols-3 grid-rows-1 gap-6 p-6 overflow-hidden">
          <div className="min-h-0 flex flex-col overflow-hidden group transition-all duration-500 hover:scale-[1.01]">
            <QuizPanel sessionId={sessionId} subjectColor={subjectColor} />
          </div>
          <div className="min-h-0 flex flex-col overflow-hidden transition-all duration-500 hover:scale-[1.01]">
            <ChatPanel sessionId={sessionId} subjectColor={subjectColor} subjectTitle={subjectTitle} />
          </div>
          <div className="min-h-0 flex flex-col overflow-hidden transition-all duration-500 hover:scale-[1.01]">
            <FlashcardPanel sessionId={sessionId} subjectColor={subjectColor} />
          </div>
        </main>
      ) : (
        <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {/* Mobile Panel Navigation Header */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-white border-b border-slate-100">
            <button
              onClick={() => activePanel > 0 && paginate(activePanel - 1)}
              disabled={activePanel === 0}
              className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center transition-all",
                activePanel === 0 ? "text-slate-200" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-90"
              )}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl">
              {PANELS.map((panel, i) => {
                const Icon = panel.icon;
                const isActive = i === activePanel;
                return (
                  <button
                    key={panel.key}
                    onClick={() => paginate(i)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300",
                      isActive
                        ? "bg-white text-slate-900 shadow-sm shadow-slate-200/60"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className={cn("transition-all duration-300", isActive ? "max-w-[80px] opacity-100" : "max-w-0 opacity-0 overflow-hidden sm:max-w-[80px] sm:opacity-100")}>
                      {panel.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => activePanel < PANELS.length - 1 && paginate(activePanel + 1)}
              disabled={activePanel === PANELS.length - 1}
              className={cn(
                "h-8 w-8 rounded-xl flex items-center justify-center transition-all",
                activePanel === PANELS.length - 1 ? "text-slate-200" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-90"
              )}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Dot Indicators */}
          <div className="flex justify-center gap-1.5 py-2 bg-[#F8FAFC]">
            {PANELS.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === activePanel ? "w-6 bg-slate-800" : "w-1.5 bg-slate-300"
                )}
              />
            ))}
          </div>

          {/* Animated Panel */}
          <div className="flex-1 min-h-0 relative overflow-hidden px-3 sm:px-4 pb-3 sm:pb-4">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={activePanel}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 350, damping: 35 },
                  opacity: { duration: 0.2 },
                }}
                className="absolute inset-0 px-3 sm:px-4 pb-3 sm:pb-4 flex flex-col min-h-0"
              >
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden rounded-2xl">
                  {panelComponents[activePanel]}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="px-4 sm:px-6 py-2 flex justify-center lg:justify-end bg-white border-t border-slate-100">
        <p className="text-[8px] sm:text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] sm:tracking-[0.4em]">
          AI Powered Study Ecosystem • NKW Tech 2026
        </p>
      </footer>
    </div>
  );
}