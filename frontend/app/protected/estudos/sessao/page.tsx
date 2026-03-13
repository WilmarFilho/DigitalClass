"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, BookOpen, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/study/ChatPanel";
import { QuizPanel } from "@/components/study/QuizPanel";
import { FlashcardPanel } from "@/components/study/FlashcardPanel";
import { SessionTimer } from "@/components/study/SessionTimer";
import { apiGet, apiPatch } from "@/lib/api";

interface Session {
  id: string;
  subject_id: string | null;
  subjects: { id: string; title: string; color_code: string } | null;
}

export default function SessaoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("sessionId");
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const elapsedRef = useRef(0);
  const saveDuration = useCallback(() => {
    const mins = Math.floor(elapsedRef.current / 60);
    if (mins > 0 && sessionId) {
      apiPatch("/study/sessions/" + sessionId, { duration_minutes: mins }).catch(() => {});
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setError("Sessão não encontrada");
      setLoading(false);
      return;
    }
    apiGet<Session>("/study/sessions/" + sessionId)
      .then(setSession)
      .catch(() => setError("Não foi possível carregar a sessão"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    const handleBeforeUnload = () => saveDuration();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") saveDuration();
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
           <p className="text-slate-400 font-black text-xs uppercase tracking-[0.2em] mb-2">Erro de Conexão</p>
           <h2 className="text-slate-800 font-bold text-lg">{error ?? "Sessão não encontrada"}</h2>
        </div>
        <Button asChild variant="outline" className="rounded-2xl border-2 font-bold px-8">
          <Link href="/protected/estudos">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para Estudos
          </Link>
        </Button>
      </div>
    );
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white">
        <Loader2 className="h-12 w-12 animate-spin text-slate-200" />
        <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Carregando Ambiente</p>
      </div>
    );
  }

  const subjectColor = session.subjects?.color_code ?? "#6D44CC";
  const subjectTitle = session.subjects?.title ?? "Matéria";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#F8FAFC]">
      {/* Header Premium */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md px-6 py-4 shadow-sm z-10">
        <div className="flex items-center gap-6">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all"
            onClick={() => {
              saveDuration();
              router.push("/protected/estudos");
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Sair
          </Button>
          
          <div className="h-8 w-[1px] bg-slate-200 hidden sm:block" />

          <div className="flex items-center gap-3">
            <div 
              className="p-2 rounded-lg shadow-inner flex items-center justify-center"
              style={{ backgroundColor: `${subjectColor}15` }}
            >
              <BookOpen className="h-4 w-4" style={{ color: subjectColor }} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                Sessão Ativa
              </p>
              <h1 className="font-black text-slate-900 text-sm uppercase tracking-tight leading-none">
                {subjectTitle}
              </h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <SessionTimer
            className="hidden md:flex border-none shadow-none bg-transparent"
            initialSeconds={((session as { duration_minutes?: number }).duration_minutes ?? 0) * 60}
            onTick={(s) => { elapsedRef.current = s; }}
          />
          <div className="h-10 w-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
        </div>
      </header>

      {/* Main Grid de 3 Colunas */}
      <main className="flex-1 min-h-0 grid grid-cols-1 grid-rows-3 lg:grid-cols-3 lg:grid-rows-1 gap-6 p-6 overflow-hidden">
        {/* Coluna Quiz */}
        <div className="min-h-0 flex flex-col overflow-hidden group transition-all duration-500 hover:scale-[1.01]">
          <QuizPanel sessionId={sessionId} subjectColor={subjectColor} />
        </div>

        {/* Coluna Chat (Central/Destaque) */}
        <div className="min-h-0 flex flex-col overflow-hidden transition-all duration-500 hover:scale-[1.01]">
          <ChatPanel
            sessionId={sessionId}
            subjectColor={subjectColor}
            subjectTitle={subjectTitle}
          />
        </div>

        {/* Coluna Flashcards */}
        <div className="min-h-0 flex flex-col overflow-hidden transition-all duration-500 hover:scale-[1.01]">
          <FlashcardPanel sessionId={sessionId} subjectColor={subjectColor} />
        </div>
      </main>

      {/* Footer Mobile/Info Sutil */}
      <footer className="px-6 py-2 flex justify-center lg:justify-end bg-white border-t border-slate-100">
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.4em]">
          AI Powered Study Ecosystem • NKW Tech 2026
        </p>
      </footer>
    </div>
  );
}