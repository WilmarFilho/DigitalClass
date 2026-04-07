"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  PlayCircle,
  FileText,
  CheckCircle2,
  ChevronRight,
  MonitorPlay,
  Download,
  X,
  Menu,
  MessageSquare,
  Send
} from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LessonProgress {
  completed: boolean;
  watched_until_percent: number;
}

interface LessonMaterial {
  id: string;
  type: string;
  title: string;
  url: string;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  type: "video" | "pdf" | "live";
  content_url: string | null;
  duration_minutes: number | null;
  progress?: LessonProgress | null;
  materials?: LessonMaterial[];
  live_session?: {
    id: string;
    status: "draft" | "scheduled" | "ready" | "live" | "ended" | "canceled";
    scheduled_at: string | null;
    started_at: string | null;
    ended_at: string | null;
    playback_url: string | null;
    replay_url: string | null;
    resolved_content_url: string | null;
  } | null;
}

interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  student?: { id: string; full_name: string; avatar_url: string | null };
}

export default function ModulePlayerPage() {
  const params = useParams<{ areaId: string; moduleId: string }>();
  const router = useRouter();

  const [module, setModule] = useState<Module | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [markingProgress, setMarkingProgress] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressSentRef = useRef<Set<string>>(new Set());

  const [quiz, setQuiz] = useState<any[] | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  // Resetar o quiz ao trocar de aula
  useEffect(() => {
    setQuiz(null);
    setShowResult(false);
    setScore(0);
    setSelectedOption(null);
    setCurrentQuestionIndex(0);
  }, [selectedLessonId]);

  async function handleGenerateQuiz() {
    if (!selectedLessonId) return;

    // Limpeza total dos estados antes de gerar o novo
    setGeneratingQuiz(true);
    setQuiz(null);
    setShowResult(false);
    setScore(0);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);

    try {
      const questions = await apiPost<any[]>(`/study/lessons/${selectedLessonId}/quiz`, {});
      setQuiz(questions);
    } catch (error) {
      console.error("Erro ao gerar quiz");
    } finally {
      setGeneratingQuiz(false);
    }
  }

  const handleAnswer = (optionIndex: number) => {
    if (selectedOption !== null) return;

    const letters = ['A', 'B', 'C', 'D'];
    const answerLetter = letters[optionIndex];
    setSelectedOption(answerLetter);

    if (answerLetter === quiz![currentQuestionIndex].answer) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      if (currentQuestionIndex < quiz!.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedOption(null);
      } else {
        setShowResult(true);
      }
    }, 1500);
  };

  const updateLessonProgress = useCallback((lessonId: string, progress: Partial<LessonProgress>) => {
    setModule(prev => prev ? {
      ...prev,
      lessons: prev.lessons.map(l => l.id === lessonId
        ? { ...l, progress: { ...(l.progress || { completed: false, watched_until_percent: 0 }), ...progress } }
        : l
      )
    } : null);
  }, []);

  const completedCount = module?.lessons.filter(l => l.progress?.completed).length ?? 0;
  const progressPercent = module?.lessons?.length ? Math.round((completedCount / module.lessons.length) * 100) : 0;

  useEffect(() => {
    if (!params?.moduleId) return;
    async function loadModule() {
      setError(null);
      try {
        const data = await apiGet<Module>(`/teachers/modules/${params.moduleId}`);
        setModule(data);
        if (data.lessons?.length) {
          setSelectedLessonId(data.lessons[0].id);
          data.lessons.filter(l => l.progress?.completed).forEach(l => progressSentRef.current.add(l.id));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar módulo");
      } finally {
        setLoading(false);
      }
    }
    loadModule();
  }, [params?.moduleId]);

  useEffect(() => {
    if (!selectedLessonId) return;
    apiGet<Comment[]>(`/teachers/lessons/${selectedLessonId}/comments`).then(setComments).catch(() => setComments([]));
  }, [selectedLessonId]);

  useEffect(() => {
    const lesson = module?.lessons.find((item) => item.id === selectedLessonId);
    if (!lesson || lesson.type !== "live") return;

    apiGet<{ lesson_id: string; live_session: Lesson["live_session"] }>(`/teachers/lessons/${lesson.id}/live`)
      .then((payload) => {
        setModule((prev) => prev ? ({
          ...prev,
          lessons: prev.lessons.map((item) => item.id === lesson.id ? {
            ...item,
            live_session: payload.live_session ?? null,
            content_url: payload.live_session?.resolved_content_url ?? null,
          } : item),
        }) : null);
      })
      .catch(() => undefined);
  }, [module?.id, selectedLessonId]);

  const currentLesson = module?.lessons.find(l => l.id === selectedLessonId);

  useEffect(() => {
    let hls: any = null;
    const video = videoRef.current;

    if (!video || !currentLesson?.content_url) return;

    if (currentLesson.type === "video" || currentLesson.type === "live") {
      const url = currentLesson.content_url;

      if (url.includes('.m3u8')) {
        import('hls.js').then(({ default: Hls }) => {
          if (Hls.isSupported()) {
            hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(video);
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = url;
          }
        });
      } else {
        video.src = url;
      }
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [currentLesson?.content_url, currentLesson?.type]);


  async function handleMarkProgress(lessonId: string, completed: boolean) {
    setMarkingProgress(lessonId);
    try {
      await apiPost(`/teachers/lessons/${lessonId}/progress`, { completed });
      updateLessonProgress(lessonId, { completed });
    } finally {
      setMarkingProgress(null);
    }
  }

  async function handleVideoProgress(lessonId: string, percent: number) {
    const completed = percent >= 95;
    try {
      await apiPost(`/teachers/lessons/${lessonId}/progress`, { completed, watched_until_percent: percent });
      updateLessonProgress(lessonId, { completed, watched_until_percent: percent });
    } catch { }
  }

  async function handlePostComment() {
    if (!selectedLessonId || !commentText.trim()) return;
    setPostingComment(true);
    try {
      const created = await apiPost<Comment>(`/teachers/lessons/${selectedLessonId}/comments`, { content: commentText.trim() });
      setComments(prev => [...prev, created]);
      setCommentText("");
    } finally {
      setPostingComment(false);
    }
  }

  const handleSelectLesson = (id: string) => {
    setSelectedLessonId(id);
    setIsSidebarOpen(false);
    progressSentRef.current.delete(id);
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-white">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
    </div>
  );

  if (error || !module) return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-white p-6">
      <p className="text-center text-slate-600">{error || "Módulo não encontrado."}</p>
      <Button variant="outline" onClick={() => router.push(`/protected/professores/area/${params?.areaId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a área
      </Button>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      {/* Header Minimalista */}
      <header className="h-16 border-b border-slate-100 flex items-center justify-between px-6 shrink-0 z-50 bg-white">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full hover:bg-slate-100"
            onClick={() => router.push(`/protected/professores/area/${params.areaId}`)}
          >
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Button>
          <div className="h-8 w-px bg-slate-100 mx-2 hidden md:block" />
          <div className="min-w-0">
            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mb-1">Módulo atual</p>
            <h1 className="text-sm font-black text-slate-900 leading-none truncate max-w-[150px] md:max-w-md">
              {module?.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 mr-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Progresso:</span>
            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-[10px] font-black text-slate-500">{progressPercent}%</span>
          </div>

          {/* Botão Hambúrguer - Visível apenas abaixo de 1024px */}
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden rounded-xl border-slate-200"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu className="h-5 w-5 text-slate-600" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

        {/* Overlay com Blur (Fundo) */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* LADO ESQUERDO: PLAYER E CONTEÚDO */}
        <div className="flex-1 flex flex-col min-w-0 bg-white overflow-y-auto custom-scrollbar">
          <div className="aspect-video w-full bg-black relative shadow-2xl shrink-0">
            {currentLesson?.content_url ? (
              currentLesson.type === "video" || currentLesson.type === "live" ? (
                <video
                  ref={videoRef}
                  controls
                  controlsList="nodownload"
                  className="w-full h-full object-contain"
                  onEnded={() => selectedLessonId && handleVideoProgress(selectedLessonId, 100)}
                  onTimeUpdate={() => {
                    const v = videoRef.current;
                    if (!v || !selectedLessonId || v.duration <= 0) return;
                    const pct = (v.currentTime / v.duration) * 100;
                    if (pct >= 95 && !progressSentRef.current.has(selectedLessonId)) {
                      progressSentRef.current.add(selectedLessonId);
                      handleVideoProgress(selectedLessonId, pct);
                    }
                  }}
                />
              ) : (
                <iframe src={currentLesson.content_url} className="w-full h-full border-none" title={currentLesson.title} />
              )
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4">
                <MonitorPlay className="h-12 w-12 opacity-20" />
                {currentLesson?.type === "live" ? (
                  <>
                    <p className="text-sm font-medium">A live ainda não começou.</p>
                    <p className="text-xs text-slate-400">
                      {currentLesson.live_session?.scheduled_at
                        ? `Agendada para ${new Date(currentLesson.live_session.scheduled_at).toLocaleString("pt-BR")}`
                        : "Aguarde o professor preparar a transmissão."}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-medium">Conteúdo não disponível.</p>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 bg-white p-6 md:p-12">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-6 gap-4">
                <div className="space-y-1">
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                    {currentLesson?.title}
                  </h2>
                  <div className="flex items-center gap-3 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1"><PlayCircle className="h-3 w-3" /> {currentLesson?.type === "live" ? "live" : currentLesson?.type}</span>
                    {currentLesson?.duration_minutes && <span>• {currentLesson.duration_minutes} min</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!currentLesson?.progress?.completed && currentLesson && (
                    <Button
                      variant="outline"
                      className="rounded-xl font-bold text-xs gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      disabled={markingProgress === currentLesson.id}
                      onClick={() => handleMarkProgress(currentLesson.id, true)}
                    >
                      {markingProgress === currentLesson.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {currentLesson.type === "video" ? "Marcar como assistido" : "Marcar como lido"}
                    </Button>
                  )}
                  {currentLesson?.progress?.completed && (
                    <span className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" /> Concluído
                    </span>
                  )}
                </div>
              </div>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{currentLesson?.description || "Sem descrição."}</p>

              {currentLesson && (currentLesson.materials?.length ?? 0) > 0 && (
                <div className="border-t border-slate-100 pt-6">
                  <h4 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                    <Download className="h-4 w-4" /> Materiais complementares
                  </h4>
                  <div className="flex flex-wrap gap-3">
                    {currentLesson.materials!.map(m => (
                      <a
                        key={m.id}
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 text-sm font-medium text-slate-700 hover:text-indigo-700 transition-colors"
                      >
                        <Download className="h-4 w-4" /> {m.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* SEÇÃO DE QUIZ IA */}
              <div className="border-t border-slate-100 pt-10 mt-10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <MonitorPlay className="h-4 w-4 text-indigo-600" /> Desafio de Fixação IA
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">Gere um questionário exclusivo baseado no conteúdo desta aula.</p>
                  </div>

                  {!quiz && (
                    <Button
                      onClick={handleGenerateQuiz}
                      disabled={generatingQuiz}
                      className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 border-none transition-all active:scale-95"
                    >
                      {generatingQuiz ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analisando aula...
                        </>
                      ) : (
                        <>
                          <MonitorPlay className="h-4 w-4 mr-2" />
                          Gerar Questionário
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {/* RENDERIZAÇÃO DO QUIZ ATIVO */}
                {quiz && !showResult && (
                  <div className="bg-slate-50 rounded-3xl border border-slate-100 p-6 md:p-8 relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full">
                        Questão {currentQuestionIndex + 1} de {quiz.length}
                      </span>
                      <div className="flex gap-1">
                        {quiz.map((_, i) => (
                          <div key={i} className={cn(
                            "h-1.5 w-6 rounded-full transition-all",
                            i === currentQuestionIndex ? "bg-indigo-600" : i < currentQuestionIndex ? "bg-emerald-500" : "bg-slate-200"
                          )} />
                        ))}
                      </div>
                    </div>

                    <h5 className="text-lg font-bold text-slate-900 mb-8 leading-tight">
                      {quiz[currentQuestionIndex].question}
                    </h5>

                    <div className="grid gap-3">
                      {quiz[currentQuestionIndex].options.map((option: string, idx: number) => {
                        const letter = ['A', 'B', 'C', 'D'][idx];
                        const isSelected = selectedOption === letter;
                        const isCorrect = letter === quiz[currentQuestionIndex].answer;

                        return (
                          <button
                            key={idx}
                            disabled={selectedOption !== null}
                            onClick={() => handleAnswer(idx)}
                            className={cn(
                              "group w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all duration-200",
                              selectedOption === null
                                ? "border-white bg-white hover:border-indigo-100 hover:shadow-md"
                                : isSelected
                                  ? (isCorrect ? "border-emerald-500 bg-emerald-50" : "border-red-500 bg-red-50")
                                  : (isCorrect && selectedOption !== null ? "border-emerald-500 bg-emerald-50" : "border-transparent bg-white opacity-50")
                            )}
                          >
                            <div className={cn(
                              "h-8 w-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0 transition-colors",
                              selectedOption === null ? "bg-slate-100 text-slate-400 group-hover:bg-indigo-600 group-hover:text-white" :
                                isCorrect ? "bg-emerald-500 text-white" : isSelected ? "bg-red-500 text-white" : "bg-slate-100 text-slate-400"
                            )}>
                              {letter}
                            </div>
                            <span className="text-sm font-bold text-slate-700">{option}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* RESULTADO FINAL */}
                {showResult && quiz && (
                  <div className="bg-emerald-500 rounded-3xl p-8 text-center text-white shadow-xl shadow-emerald-200">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4" />
                    <h5 className="text-2xl font-black mb-2">Desafio Concluído!</h5>
                    <p className="text-emerald-100 font-medium mb-6">
                      Você acertou <span className="text-white font-black">{score}</span> de {quiz.length} questões.
                    </p>
                    <Button
                      variant="secondary"
                      className="rounded-xl font-bold bg-white text-emerald-600 hover:bg-emerald-50 border-none"
                      onClick={() => {
                        setQuiz(null);
                        handleGenerateQuiz();
                      }}
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-100 pt-6 mt-6">
                <h4 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Comentários ({comments.length})
                </h4>
                <div className="space-y-4 mb-4">
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                        {c.student?.full_name?.charAt(0) ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-500">{c.student?.full_name ?? "Aluno"}</p>
                        <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{c.content}</p>
                        <p className="text-[10px] text-slate-400 mt-2">{new Date(c.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Escreva um comentário..."
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePostComment()}
                  />
                  <Button
                    className="rounded-xl shrink-0"
                    disabled={!commentText.trim() || postingComment}
                    onClick={handlePostComment}
                  >
                    {postingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* LADO DIREITO: COLUNA DE AULAS (Com Logica de Drawer no Mobile) */}
        <aside className={cn(
          "fixed inset-y-0 right-0 w-[85%] max-w-[350px] bg-slate-50 z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-[400px] lg:z-0 lg:shadow-none lg:border-l lg:border-slate-100 flex flex-col",
          isSidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}>
          <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between shrink-0">
            <h3 className="font-black text-slate-900 text-sm uppercase tracking-tighter">Conteúdo</h3>

            {/* Botão de Fechar no Mobile */}
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setIsSidebarOpen(false)}>
              <X className="h-5 w-5 text-slate-500" />
            </Button>

            <span className="hidden lg:block text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
              {(module?.lessons ?? []).length} AULAS
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {(module?.lessons ?? []).map((lesson, index) => {
              const isActive = lesson.id === selectedLessonId;
              return (
                <button
                  key={lesson.id}
                  onClick={() => handleSelectLesson(lesson.id)}
                  className={cn(
                    "w-full group flex items-start gap-4 p-4 rounded-2xl transition-all duration-200 text-left border",
                    isActive
                      ? "bg-white border-indigo-200 shadow-sm shadow-indigo-500/5 ring-1 ring-indigo-50"
                      : "bg-transparent border-transparent hover:bg-slate-200/50"
                  )}
                >
                  <div className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-black text-xs",
                    isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-white border border-slate-200 text-slate-400"
                  )}>
                    {String(index + 1).padStart(2, '0')}
                  </div>

                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className={cn("text-[13px] font-bold leading-tight mb-1 line-clamp-2", isActive ? "text-indigo-600" : "text-slate-700")}>
                      {lesson.title}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 opacity-50 text-[9px] font-black uppercase">
                        {lesson.type === "video" ? <PlayCircle className="h-3 w-3" /> : lesson.type === "pdf" ? <FileText className="h-3 w-3" /> : <MonitorPlay className="h-3 w-3" />}
                        {lesson.type === "live" ? "ao vivo" : lesson.type}
                      </div>
                      {lesson.progress?.completed && (
                        <div className="flex items-center gap-1 text-emerald-500 text-[9px] font-black uppercase">
                          <CheckCircle2 className="h-3 w-3" /> Concluído
                        </div>
                      )}
                      {isActive && !lesson.progress?.completed && (
                        <div className="flex items-center gap-1 text-indigo-500 text-[9px] font-black uppercase">
                          Assistindo
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className={cn("h-4 w-4 mt-1 transition-transform", isActive ? "text-indigo-600 translate-x-1" : "text-slate-300 opacity-0 group-hover:opacity-100")} />
                </button>
              );
            })}
          </div>
        </aside>
      </main>

      {/* Estilos Globais Customizados */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
      `}</style>
    </div>
  );
}
