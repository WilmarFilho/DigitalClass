"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brain, Plus, BookOpen, Clock, Loader2, ChevronRight, History, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { apiGet, apiPost } from "@/lib/api";
import { Label } from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  title: string;
  color_code: string;
}

interface StudySession {
  id: string;
  subject_id: string | null;
  duration_minutes: number | null;
  created_at: string;
  subjects: { id: string; title: string; color_code: string } | null;
}

const MOCK_SESSIONS: Omit<StudySession, "id" | "subject_id">[] = [
  { duration_minutes: 45, created_at: new Date(Date.now() - 86400000).toISOString(), subjects: { id: "1", title: "Matemática", color_code: "#6366f1" } },
  { duration_minutes: 30, created_at: new Date(Date.now() - 172800000).toISOString(), subjects: { id: "2", title: "Física", color_code: "#10b981" } },
  { duration_minutes: 60, created_at: new Date(Date.now() - 259200000).toISOString(), subjects: { id: "3", title: "Português", color_code: "#f43f5e" } },
];

export function EstudosClient() {
  const router = useRouter();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [sessionsData, subjectsData] = await Promise.all([
          apiGet<StudySession[]>("/study/sessions?limit=10"),
          apiGet<Array<Subject & { color_code?: string }>>("/subjects"),
        ]);
        setSubjects(subjectsData.map((s) => ({ ...s, color_code: s.color_code || "#6D44CC" })));
        setSessions(
          sessionsData.length > 0
            ? sessionsData
            : (MOCK_SESSIONS.map((m, i) => ({ ...m, id: `mock-${i}`, subject_id: m.subjects?.id ?? null })) as StudySession[])
        );
      } catch {
        setSessions(MOCK_SESSIONS.map((m, i) => ({ ...m, id: `mock-${i}`, subject_id: m.subjects?.id ?? null })) as StudySession[]);
        setSubjects([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleStartSession = async () => {
    if (!selectedSubjectId) {
      setError("Selecione uma matéria");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const session = await apiPost<StudySession>("/study/sessions", { subject_id: selectedSubjectId });
      setNewSessionOpen(false);
      router.push(`/protected/estudos/sessao?sessionId=${session.id}&subjectId=${selectedSubjectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao iniciar sessão");
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return "Hoje";
    if (diff === 1) return "Ontem";
    if (diff < 7) return `${diff} dias atrás`;
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-10 animate-in fade-in duration-700">
      {/* Header com Glassmorphism */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-[#E6E0F8] shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#F5F3FF] rounded-2xl border border-[#E6E0F8] shadow-inner">
            <Brain className="h-7 w-7 text-[#6D44CC]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Meus Estudos</h1>
            <p className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-[#6D44CC]" /> Últimas sessões e histórico de foco
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setNewSessionOpen(true);
            setSelectedSubjectId(subjects[0]?.id ?? "");
            setError(null);
          }}
          disabled={subjects.length === 0}
          className="bg-[#6D44CC] hover:bg-[#5B39A8] text-white rounded-xl px-8 h-12 font-bold shadow-lg shadow-[#6D44CC]/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="h-5 w-5 mr-2" /> NOVA SESSÃO
        </Button>
      </div>

      {/* Alerta de Matéria Pendente */}
      {subjects.length === 0 && !loading && (
        <div className="group relative overflow-hidden rounded-3xl border border-amber-200 bg-amber-50/50 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">Nenhuma matéria encontrada</p>
              <p className="text-xs font-medium text-amber-700/80">Você precisa cadastrar disciplinas antes de começar a cronometrar seus estudos.</p>
            </div>
            <Link href="/protected/materias">
              <Button size="sm" variant="outline" className="border-amber-200 hover:bg-amber-100 text-amber-800 font-bold rounded-lg transition-colors">
                Ir para Matérias
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Grid de Sessões Recentes */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <History className="h-5 w-5 text-slate-400" />
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Histórico Recente</h3>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-32 rounded-3xl bg-slate-50 border border-slate-100 animate-pulse" />
            ))
          ) : (
            sessions.slice(0, 9).map((s) => (
              <Link
                key={s.id}
                href={`/protected/estudos/detalhe?sessionId=${s.id}`}
                className="group relative overflow-hidden rounded-3xl border border-[#E6E0F8] bg-white p-6 transition-all hover:shadow-xl hover:border-[#6D44CC]/30"
              >
                {/* Indicador lateral de cor */}
                <div
                  className="absolute left-0 top-0 bottom-0 w-1.5 opacity-80"
                  style={{ backgroundColor: s.subjects?.color_code ?? "#6D44CC" }}
                />

                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div
                      className="p-2.5 rounded-xl"
                      style={{ backgroundColor: `${s.subjects?.color_code ?? "#6D44CC"}15` }}
                    >
                      <BookOpen className="h-5 w-5" style={{ color: s.subjects?.color_code ?? "#6D44CC" }} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">
                      {formatDate(s.created_at)}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-[#1A1A1A] truncate group-hover:text-[#6D44CC] transition-colors">
                      {s.subjects?.title ?? "Matéria"}
                    </h3>
                    <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-[#F5F3FF] px-2 py-1 rounded-md">
                        <Clock className="h-3.5 w-3.5 text-[#6D44CC]" />
                        {s.duration_minutes ?? 0} MIN
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300 ml-auto group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Modal: Iniciar Sessão */}
      <Modal
        open={newSessionOpen}
        onClose={() => setNewSessionOpen(false)}
        title="O que vamos estudar agora?"
        className="max-w-md p-0 overflow-hidden"
      >
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              {/* Substituição do Select Nativo por uma UI Customizada */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Selecione a Disciplina
                </Label>
                <div className="grid grid-cols-1 gap-3 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                  {subjects.map((s) => {
                    const isSelected = selectedSubjectId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedSubjectId(s.id)}
                        className={cn(
                          "flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left",
                          isSelected
                            ? "border-[#6D44CC] bg-[#F5F3FF] shadow-md shadow-[#6D44CC]/5"
                            : "border-[#E6E0F8] bg-white hover:border-[#D1C9F0]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-white"
                            style={{ backgroundColor: s.color_code }}
                          >
                            <span className="text-xs font-black">{s.title.charAt(0)}</span>
                          </div>
                          <span className={cn(
                            "font-bold text-sm",
                            isSelected ? "text-[#6D44CC]" : "text-slate-700"
                          )}>
                            {s.title}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="h-5 w-5 rounded-full bg-[#6D44CC] flex items-center justify-center">
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-[#F5F3FF] rounded-2xl p-4 border border-[#E6E0F8]">
              <div className="flex gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm italic text-[#6D44CC] text-xs font-bold">Dica:</div>
                <p className="text-xs text-[#6D44CC] font-medium leading-relaxed">
                  Tente manter o foco por pelo menos 25 minutos para entrar em estado de flow.
                </p>
              </div>
            </div>
          </div>

          {error && <p className="text-xs font-bold text-red-500 animate-bounce">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setNewSessionOpen(false)} className="flex-1 h-12 rounded-xl font-bold text-slate-400">
              DEPOIS
            </Button>
            <Button
              onClick={handleStartSession}
              disabled={creating || !selectedSubjectId}
              className="flex-[2] h-12 bg-[#6D44CC] rounded-xl font-bold shadow-lg shadow-[#6D44CC]/20"
            >
              {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : "COMEÇAR AGORA"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}