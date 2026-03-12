"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Brain, Plus, BookOpen, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { apiGet, apiPost } from "@/lib/api";

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

// Mock para quando não houver sessões reais
const MOCK_SESSIONS: Omit<StudySession, "id" | "subject_id">[] = [
  { duration_minutes: 45, created_at: new Date(Date.now() - 86400000).toISOString(), subjects: { id: "1", title: "Matemática", color_code: "#4F46E5" } },
  { duration_minutes: 30, created_at: new Date(Date.now() - 172800000).toISOString(), subjects: { id: "2", title: "Física", color_code: "#059669" } },
  { duration_minutes: 60, created_at: new Date(Date.now() - 259200000).toISOString(), subjects: { id: "3", title: "Português", color_code: "#DC2626" } },
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
        setSubjects(subjectsData.map((s) => ({ ...s, color_code: s.color_code || "#4F46E5" })));
        setSessions(
          sessionsData.length > 0
            ? sessionsData
            : (MOCK_SESSIONS.map((m, i) => ({
                ...m,
                id: `mock-${i}`,
                subject_id: m.subjects?.id ?? null,
              })) as StudySession[])
        );
      } catch {
        setSessions(
          MOCK_SESSIONS.map((m, i) => ({
            ...m,
            id: `mock-${i}`,
            subject_id: m.subjects?.id ?? null,
          })) as StudySession[]
        );
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
      const session = await apiPost<StudySession>("/study/sessions", {
        subject_id: selectedSubjectId,
      });
      setNewSessionOpen(false);
      setSelectedSubjectId("");
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Brain className="h-6 w-6" />
          Meus Estudos
        </h1>
        <Button
          onClick={() => {
            setNewSessionOpen(true);
            setSelectedSubjectId(subjects[0]?.id ?? "");
            setError(null);
          }}
          disabled={subjects.length === 0}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova sessão
        </Button>
      </div>

      {subjects.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
          Adicione matérias em{" "}
          <Link href="/protected/materias" className="font-medium underline">
            Minhas Matérias
          </Link>{" "}
          antes de iniciar uma sessão de estudo.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : (
          sessions.slice(0, 9).map((s) => (
            <Link
              key={s.id}
              href={`/protected/estudos/detalhe?sessionId=${s.id}`}
              className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300"
            >
              <div
                className="h-1.5 w-12 rounded-full mb-4"
                style={{ backgroundColor: s.subjects?.color_code ?? "#4F46E5" }}
              />
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${s.subjects?.color_code ?? "#4F46E5"}20` }}
                >
                  <BookOpen
                    className="h-5 w-5"
                    style={{ color: s.subjects?.color_code ?? "#4F46E5" }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-900 truncate">
                    {s.subjects?.title ?? "Matéria"}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="h-3.5 w-3.5" />
                    {s.duration_minutes ?? 0} min · {formatDate(s.created_at)}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <Modal
        open={newSessionOpen}
        onClose={() => {
          setNewSessionOpen(false);
          setError(null);
        }}
        title="Iniciar nova sessão"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Escolha a matéria para esta sessão de estudo.
          </p>
          <div>
            <label className="text-sm font-medium text-slate-700">Matéria</label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="mt-1 flex h-9 w-full rounded-md border border-slate-200 bg-white text-slate-900 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            >
              <option value="">Selecione...</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setNewSessionOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleStartSession} disabled={creating || !selectedSubjectId}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Iniciar"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
