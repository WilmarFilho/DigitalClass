"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
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

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  const subjectColor = session.subjects?.color_code ?? "#4F46E5";
  const subjectTitle = session.subjects?.title ?? "Matéria";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
      {/* Header com cronômetro */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              saveDuration();
              router.push("/protected/estudos");
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Sair
          </Button>
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: subjectColor }}
          />
          <h1 className="font-semibold text-slate-800">{subjectTitle}</h1>
        </div>
        <SessionTimer
          initialSeconds={((session as { duration_minutes?: number }).duration_minutes ?? 0) * 60}
          onTick={(s) => { elapsedRef.current = s; }}
        />
      </header>

      {/* 3 colunas - scroll interno em cada painel */}
      <main className="flex-1 min-h-0 grid grid-cols-1 grid-rows-3 lg:grid-cols-3 lg:grid-rows-1 gap-4 p-4 overflow-hidden">
        <div className="min-h-0 flex flex-col overflow-hidden">
          <QuizPanel sessionId={sessionId} subjectColor={subjectColor} />
        </div>
        <div className="min-h-0 flex flex-col overflow-hidden">
          <ChatPanel
            sessionId={sessionId}
            subjectColor={subjectColor}
            subjectTitle={subjectTitle}
          />
        </div>
        <div className="min-h-0 flex flex-col overflow-hidden">
          <FlashcardPanel sessionId={sessionId} subjectColor={subjectColor} />
        </div>
      </main>
    </div>
  );
}
