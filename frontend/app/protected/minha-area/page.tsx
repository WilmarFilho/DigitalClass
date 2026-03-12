"use client";

import { useState, useEffect, useRef } from "react";
import {
  MonitorPlay,
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Upload,
  CheckCircle2,
  Video,
  FileText,
  GripVertical,
  DollarSign,
  Palette,
  Globe,
  Lock,
  AlertCircle,
  X,
} from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TeacherArea {
  id: string;
  title: string;
  description: string | null;
  color_code: string;
  monthly_price: number;
  is_private: boolean;
  banner_url: string | null;
}

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  type: "video" | "pdf";
  content_url: string | null;
  duration_minutes: number | null;
  order_index: number;
  created_at: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function getAuthHeaders(): Promise<HeadersInit> {
  const { createClient } = await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  const h: Record<string, string> = {};
  if (session?.access_token) h["Authorization"] = `Bearer ${session.access_token}`;
  return h;
}

export default function MinhaAreaPage() {
  const [area, setArea] = useState<TeacherArea | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formulário área
  const [areaForm, setAreaForm] = useState({
    title: "",
    description: "",
    color_code: "#4F46E5",
    monthly_price: 0,
    is_private: false,
  });
  const [savingArea, setSavingArea] = useState(false);
  const [savedArea, setSavedArea] = useState(false);
  const [editingArea, setEditingArea] = useState(false);

  // Modal nova aula
  const [lessonModal, setLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    type: "video" as "video" | "pdf",
    duration_minutes: "",
  });
  const [savingLesson, setSavingLesson] = useState(false);

  // Upload
  const [uploadingLesson, setUploadingLesson] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [a, l] = await Promise.all([
        apiGet<TeacherArea | null>("/teachers/my-area").catch(() => null),
        apiGet<Lesson[]>("/teachers/my-area/lessons").catch(() => []),
      ]);
      setArea(a);
      if (a) {
        setAreaForm({
          title: a.title,
          description: a.description ?? "",
          color_code: a.color_code,
          monthly_price: a.monthly_price,
          is_private: a.is_private,
        });
      } else {
        setEditingArea(true);
      }
      setLessons(l);
    } catch (e) {
      setError("Não foi possível carregar sua área.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveArea() {
    setSavingArea(true);
    try {
      const updated = await apiPost<TeacherArea>("/teachers/my-area", {
        ...areaForm,
        monthly_price: Number(areaForm.monthly_price),
      });
      setArea(updated);
      setEditingArea(false);
      setSavedArea(true);
      setTimeout(() => setSavedArea(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSavingArea(false);
    }
  }

  async function handleCreateLesson() {
    if (!lessonForm.title.trim()) return;
    setSavingLesson(true);
    try {
      const created = await apiPost<Lesson>("/teachers/my-area/lessons", {
        title: lessonForm.title,
        description: lessonForm.description || null,
        type: lessonForm.type,
        duration_minutes: lessonForm.duration_minutes
          ? Number(lessonForm.duration_minutes)
          : null,
        order_index: lessons.length,
      });
      setLessons((prev) => [...prev, created]);
      setLessonModal(false);
      setLessonForm({ title: "", description: "", type: "video", duration_minutes: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar aula");
    } finally {
      setSavingLesson(false);
    }
  }

  async function handleDeleteLesson(id: string) {
    if (!confirm("Remover esta aula?")) return;
    try {
      await apiDelete(`/teachers/my-area/lessons/${id}`);
      setLessons((prev) => prev.filter((l) => l.id !== id));
    } catch {
      // silencia
    }
  }

  async function handleUpload(lessonId: string, file: File) {
    setUploadingLesson(lessonId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE_URL}/teachers/my-area/lessons/${lessonId}/upload`, {
        method: "POST",
        headers,
        body: formData,
      });
      if (!res.ok) throw new Error("Falha no upload");
      const updated = await res.json() as Lesson;
      setLessons((prev) => prev.map((l) => (l.id === lessonId ? updated : l)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploadingLesson(null);
      setPendingUploadId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <MonitorPlay className="h-6 w-6" />
          Minha Área de Estudante
        </h1>
        {area && !editingArea && (
          <Button size="sm" variant="outline" onClick={() => setEditingArea(true)}>
            <Pencil className="h-4 w-4" />
            Editar área
          </Button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button className="ml-auto" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Coluna esquerda: configuração da área ── */}
        <div className="lg:col-span-1 space-y-6">

          {/* Card de configuração */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <h2 className="font-semibold text-slate-800 mb-5 flex items-center gap-2">
              <Palette className="h-4 w-4 text-slate-500" />
              {area ? "Configuração da área" : "Criar minha área"}
            </h2>

            {/* Preview do banner */}
            <div
              className="h-20 rounded-xl mb-5 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${areaForm.color_code}dd, ${areaForm.color_code}77)`,
              }}
            >
              <span className="text-white font-bold text-lg drop-shadow truncate px-4">
                {areaForm.title || "Prévia"}
              </span>
            </div>

            <div className="space-y-4">
              <Field label="Nome da área" required>
                <input
                  value={areaForm.title}
                  onChange={(e) => setAreaForm((p) => ({ ...p, title: e.target.value }))}
                  disabled={!editingArea}
                  placeholder="Ex: Matemática Avançada"
                  className="input-base disabled:opacity-60"
                />
              </Field>

              <Field label="Descrição">
                <textarea
                  value={areaForm.description}
                  onChange={(e) => setAreaForm((p) => ({ ...p, description: e.target.value }))}
                  disabled={!editingArea}
                  rows={3}
                  placeholder="Descreva o que os alunos vão aprender..."
                  className="input-base resize-none disabled:opacity-60"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Cor principal">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={areaForm.color_code}
                      onChange={(e) => setAreaForm((p) => ({ ...p, color_code: e.target.value }))}
                      disabled={!editingArea}
                      className="h-9 w-10 cursor-pointer rounded border border-slate-200 p-0.5 disabled:opacity-60"
                    />
                    <input
                      value={areaForm.color_code}
                      onChange={(e) => setAreaForm((p) => ({ ...p, color_code: e.target.value }))}
                      disabled={!editingArea}
                      className="input-base font-mono text-xs disabled:opacity-60"
                    />
                  </div>
                </Field>

                <Field label="Mensalidade (R$)">
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={areaForm.monthly_price}
                      onChange={(e) =>
                        setAreaForm((p) => ({ ...p, monthly_price: Number(e.target.value) }))
                      }
                      disabled={!editingArea}
                      className="input-base pl-8 disabled:opacity-60"
                    />
                  </div>
                </Field>
              </div>

              <Field label="Visibilidade">
                <div className="flex gap-2">
                  {[
                    { value: false, icon: Globe, label: "Pública" },
                    { value: true, icon: Lock, label: "Privada" },
                  ].map(({ value, icon: Icon, label }) => (
                    <button
                      key={String(value)}
                      disabled={!editingArea}
                      onClick={() => setAreaForm((p) => ({ ...p, is_private: value }))}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-all disabled:opacity-60",
                        areaForm.is_private === value
                          ? "border-indigo-400 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-300"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            {editingArea && (
              <div className="mt-5 flex gap-2">
                {area && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setEditingArea(false)}
                  >
                    Cancelar
                  </Button>
                )}
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!areaForm.title.trim() || savingArea}
                  onClick={handleSaveArea}
                >
                  {savingArea ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : savedArea ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Salvo!
                    </>
                  ) : (
                    area ? "Salvar alterações" : "Criar área"
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Stats */}
          {area && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Resumo</h3>
              <div className="space-y-3">
                <StatRow label="Total de aulas" value={String(lessons.length)} />
                <StatRow
                  label="Mensalidade"
                  value={
                    area.monthly_price === 0
                      ? "Gratuito"
                      : `R$ ${area.monthly_price.toFixed(2)}`
                  }
                />
                <StatRow
                  label="Visibilidade"
                  value={area.is_private ? "Privada" : "Pública"}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Coluna direita: aulas ── */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <MonitorPlay className="h-4 w-4 text-slate-500" />
                Aulas ({lessons.length})
              </h2>
              {area && (
                <Button
                  size="sm"
                  onClick={() => setLessonModal(true)}
                  disabled={!area}
                >
                  <Plus className="h-4 w-4" />
                  Nova aula
                </Button>
              )}
            </div>

            {!area ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <p className="text-sm text-slate-500">
                  Crie sua área primeiro para adicionar aulas.
                </p>
              </div>
            ) : lessons.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <MonitorPlay className="mx-auto h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500 font-medium">
                  Nenhuma aula ainda.
                </p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => setLessonModal(true)}
                >
                  <Plus className="h-4 w-4" />
                  Adicionar primeira aula
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {lessons.map((lesson, i) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson}
                    index={i + 1}
                    uploading={uploadingLesson === lesson.id}
                    onDelete={() => handleDeleteLesson(lesson.id)}
                    onUpload={() => {
                      setPendingUploadId(lesson.id);
                      fileInputRef.current?.click();
                    }}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,.pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && pendingUploadId) handleUpload(pendingUploadId, file);
          e.target.value = "";
        }}
      />

      {/* Modal nova aula */}
      {lessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-slate-900">Nova aula</h3>
              <button
                onClick={() => setLessonModal(false)}
                className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Título" required>
                <input
                  value={lessonForm.title}
                  onChange={(e) => setLessonForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Introdução à álgebra"
                  className="input-base"
                />
              </Field>

              <Field label="Descrição">
                <textarea
                  value={lessonForm.description}
                  onChange={(e) => setLessonForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder="Opcional..."
                  className="input-base resize-none"
                />
              </Field>

              <Field label="Tipo">
                <div className="flex gap-2">
                  {(["video", "pdf"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setLessonForm((p) => ({ ...p, type: t }))}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-all",
                        lessonForm.type === t
                          ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600"
                      )}
                    >
                      {t === "video" ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                      {t === "video" ? "Vídeo" : "PDF"}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Duração (minutos)">
                <input
                  type="number"
                  min={1}
                  value={lessonForm.duration_minutes}
                  onChange={(e) =>
                    setLessonForm((p) => ({ ...p, duration_minutes: e.target.value }))
                  }
                  placeholder="Ex: 30"
                  className="input-base"
                />
              </Field>
            </div>

            <div className="flex gap-2 mt-5">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setLessonModal(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={!lessonForm.title.trim() || savingLesson}
                onClick={handleCreateLesson}
              >
                {savingLesson ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar aula"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componentes auxiliares ──────────────────────────────────────────────────

function LessonRow({
  lesson,
  index,
  uploading,
  onDelete,
  onUpload,
}: {
  lesson: Lesson;
  index: number;
  uploading: boolean;
  onDelete: () => void;
  onUpload: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 hover:bg-white hover:border-slate-200 transition-all">
      <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />

      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-indigo-600 bg-indigo-100"
      >
        {lesson.type === "video" ? (
          <Video className="h-4 w-4" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">#{index}</span>
          <p className="text-sm font-medium text-slate-800 truncate">{lesson.title}</p>
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] font-medium uppercase text-slate-400">
            {lesson.type}
          </span>
          {lesson.duration_minutes && (
            <span className="text-[10px] text-slate-400">{lesson.duration_minutes} min</span>
          )}
          {lesson.content_url ? (
            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
              <CheckCircle2 className="h-3 w-3" />
              Arquivo enviado
            </span>
          ) : (
            <span className="text-[10px] text-amber-500">Sem arquivo</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-8 px-2.5 text-xs"
          disabled={uploading}
          onClick={onUpload}
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <>
              <Upload className="h-3.5 w-3.5" />
              {lesson.content_url ? "Substituir" : "Upload"}
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-slate-400 hover:text-red-500"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-slate-600">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}
