"use client";

import { useState, useEffect, useRef } from "react";
import {
  MonitorPlay,
  Loader2,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  Video,
  FileText,
  GripVertical,
  Palette,
  Globe,
  Lock,
  AlertCircle,
  X,
  Eye,
  Settings2,
  LayoutDashboard,
} from "lucide-react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// --- Interfaces (Mantidas conforme seu backend) ---
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

export default function MinhaAreaPage() {
  const [area, setArea] = useState<TeacherArea | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const [lessonModal, setLessonModal] = useState(false);
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    type: "video" as "video" | "pdf",
    duration_minutes: "",
  });
  const [savingLesson, setSavingLesson] = useState(false);
  const [uploadingLesson, setUploadingLesson] = useState<string | null>(null);
  const [pendingUploadId, setPendingUploadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      setError("Não foi possível carregar os dados.");
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e.message || "Erro ao salvar");
    } finally {
      setSavingArea(false);
    }
  }

  async function handleCreateLesson() {
    if (!lessonForm.title.trim()) return;
    setSavingLesson(true);
    try {
      const created = await apiPost<Lesson>("/teachers/my-area/lessons", {
        ...lessonForm,
        duration_minutes: lessonForm.duration_minutes ? Number(lessonForm.duration_minutes) : null,
        order_index: lessons.length,
      });
      setLessons((prev) => [...prev, created]);
      setLessonModal(false);
      setLessonForm({ title: "", description: "", type: "video", duration_minutes: "" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e.message || "Erro ao criar aula");
    } finally {
      setSavingLesson(false);
    }
  }

  async function handleDeleteLesson(id: string) {
    if (!confirm("Remover esta aula permanentemente?")) return;
    try {
      await apiDelete(`/teachers/my-area/lessons/${id}`);
      setLessons((prev) => prev.filter((l) => l.id !== id));
    } catch {}
  }

  async function handleUpload(lessonId: string, file: File) {
    setUploadingLesson(lessonId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${BASE_URL}/teachers/my-area/lessons/${lessonId}/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session?.access_token}` },
        body: formData,
      });
      
      if (!res.ok) throw new Error("Falha no upload");
      const updated = await res.json() as Lesson;
      setLessons((prev) => prev.map((l) => (l.id === lessonId ? updated : l)));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e.message || "Erro no upload");
    } finally {
      setUploadingLesson(null);
      setPendingUploadId(null);
    }
  }

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Painel do Professor</h1>
            <p className="text-sm text-slate-500">Customize sua experiência e gerencie conteúdos.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {area && (
            <Button variant="outline" className="rounded-xl" asChild>
              <a href={`/area/${area.id}`} target="_blank">
                <Eye className="h-4 w-4 mr-2" /> Visualizar como Aluno
              </a>
            </Button>
          )}
          {area && !editingArea && (
            <Button className="rounded-xl bg-slate-900 hover:bg-slate-800" onClick={() => setEditingArea(true)}>
              <Settings2 className="h-4 w-4 mr-2" /> Editar Configurações
            </Button>
          )}
        </div>
      </header>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1 font-medium">{error}</span>
          <button onClick={() => setError(null)}><X className="h-5 w-5 hover:text-red-500" /></button>
        </motion.div>
      )}

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Coluna Esquerda: Configurações */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <Palette className="h-4 w-4 text-indigo-500" /> Identidade da Área
              </h2>
            </div>

            {/* LIVE PREVIEW BANNER */}
            <div className="px-6 pt-6">
              <div 
                className="h-28 rounded-2xl relative flex items-center justify-center overflow-hidden transition-all duration-500 group"
                style={{ backgroundColor: areaForm.color_code }}
              >
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
                <span className="relative z-10 text-white font-black text-xl drop-shadow-md text-center px-4 leading-tight">
                  {areaForm.title || "Nome da sua Área"}
                </span>
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/20 backdrop-blur-md rounded text-[10px] text-white/80 font-bold uppercase tracking-widest">Preview</div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <Field label="Nome da Área" required>
                <input
                  value={areaForm.title}
                  onChange={(e) => setAreaForm(p => ({ ...p, title: e.target.value }))}
                  disabled={!editingArea}
                  placeholder="Ex: Formação em React"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                />
              </Field>

              <Field label="Preço da Mensalidade">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm font-mono">R$</span>
                  <input
                    type="number"
                    value={areaForm.monthly_price}
                    onChange={(e) => setAreaForm(p => ({ ...p, monthly_price: Number(e.target.value) }))}
                    disabled={!editingArea}
                    className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                  />
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                 <Field label="Cor Identidade">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={areaForm.color_code}
                        onChange={(e) => setAreaForm(p => ({ ...p, color_code: e.target.value }))}
                        disabled={!editingArea}
                        className="h-11 w-14 cursor-pointer rounded-xl border border-slate-200 p-1 bg-white disabled:opacity-50"
                      />
                      <span className="text-xs font-mono text-slate-500 uppercase">{areaForm.color_code}</span>
                    </div>
                 </Field>
                 <Field label="Visibilidade">
                    <button
                      disabled={!editingArea}
                      onClick={() => setAreaForm(p => ({ ...p, is_private: !p.is_private }))}
                      className={cn(
                        "h-11 w-full rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all uppercase tracking-tight disabled:opacity-50",
                        areaForm.is_private ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-indigo-50 border-indigo-200 text-indigo-700"
                      )}
                    >
                      {areaForm.is_private ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                      {areaForm.is_private ? "Privada" : "Pública"}
                    </button>
                 </Field>
              </div>

              {editingArea && (
                <div className="pt-2 flex flex-col gap-2">
                  <Button 
                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-100"
                    disabled={!areaForm.title.trim() || savingArea}
                    onClick={handleSaveArea}
                  >
                    {savingArea ? <Loader2 className="h-4 w-4 animate-spin" /> : savedArea ? <><CheckCircle2 className="h-4 w-4 mr-2" /> Salvo!</> : "Salvar Alterações"}
                  </Button>
                  {area && (
                    <Button variant="ghost" className="text-slate-500 hover:bg-slate-100" onClick={() => setEditingArea(false)}>
                      Descartar Mudanças
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Coluna Direita: Conteúdo */}
        <main className="lg:col-span-8">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm min-h-[500px]">
            <div className="p-6 border-b border-slate-50 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <MonitorPlay className="h-4 w-4 text-indigo-500" /> Currículo do Curso
                </h2>
                <p className="text-xs text-slate-400 mt-1">{lessons.length} aulas cadastradas</p>
              </div>
              {area && (
                <Button onClick={() => setLessonModal(true)} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100">
                  <Plus className="h-4 w-4 mr-2" /> Nova Aula
                </Button>
              )}
            </div>

            <div className="p-6">
              {!area ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 border border-dashed border-slate-200 mb-4">
                    <MonitorPlay className="h-8 w-8" />
                  </div>
                  <h3 className="text-slate-900 font-bold">Inicie sua área</h3>
                  <p className="text-slate-400 text-sm max-w-[240px] mt-2">Você precisa salvar as configurações básicas antes de postar aulas.</p>
                </div>
              ) : lessons.length === 0 ? (
                <div className="py-20 text-center flex flex-col items-center">
                  <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                    <Upload className="h-8 w-8" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Sua área ainda não possui aulas.</p>
                  <Button variant="link" className="text-indigo-600" onClick={() => setLessonModal(true)}>Adicionar primeira aula agora</Button>
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
        </main>
      </div>

      <input ref={fileInputRef} type="file" accept="video/*,.pdf" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file && pendingUploadId) handleUpload(pendingUploadId, file);
        e.target.value = "";
      }} />

      {/* Modal Nova Aula */}
      <AnimatePresence>
        {lessonModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg rounded-[2.5rem] bg-white shadow-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                   <Plus className="h-6 w-6" />
                </div>
                <button onClick={() => setLessonModal(false)} className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight">Adicionar Aula</h3>
                  <p className="text-sm text-slate-500">Defina o título e o tipo de conteúdo para seus alunos.</p>
                </div>

                <div className="space-y-4">
                  <Field label="Título da Aula" required>
                    <input
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm(p => ({ ...p, title: e.target.value }))}
                      placeholder="Ex: Módulo 1 - Primeiros Passos"
                      className="w-full h-12 rounded-xl border border-slate-200 px-4 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </Field>

                  <Field label="Tipo de Conteúdo">
                    <div className="grid grid-cols-2 gap-3">
                      {(["video", "pdf"] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setLessonForm(p => ({ ...p, type: t }))}
                          className={cn(
                            "h-12 rounded-xl border flex items-center justify-center gap-3 text-sm font-bold transition-all uppercase tracking-tight",
                            lessonForm.type === t ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          )}
                        >
                          {t === "video" ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          {t === "video" ? "Vídeo Aula" : "Material PDF"}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>

                <div className="pt-4 flex gap-3">
                  <Button variant="ghost" className="flex-1 h-12 rounded-xl text-slate-500" onClick={() => setLessonModal(false)}>Cancelar</Button>
                  <Button className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100" disabled={!lessonForm.title.trim() || savingLesson} onClick={handleCreateLesson}>
                    {savingLesson ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Aula"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Subcomponentes Refatorados ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LessonRow({ lesson, index, uploading, onDelete, onUpload }: any) {
  return (
    <motion.li 
      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
      className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-500/5 transition-all"
    >
      <div className="cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-indigo-300 transition-colors">
        <GripVertical className="h-5 w-5" />
      </div>

      <div className={cn(
        "h-12 w-12 shrink-0 rounded-xl flex items-center justify-center transition-colors",
        lesson.content_url ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
      )}>
        {lesson.type === "video" ? <Video className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{index}</span>
          <h4 className="text-sm font-bold text-slate-800 truncate">{lesson.title}</h4>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {lesson.content_url ? (
             <span className="text-[10px] font-black text-emerald-600 uppercase flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Conteúdo Pronto
             </span>
          ) : (
             <span className="text-[10px] font-black text-amber-500 uppercase flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Aguardando Upload
             </span>
          )}
          <span className="h-1 w-1 rounded-full bg-slate-200" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{lesson.type}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button 
          size="sm" 
          variant={lesson.content_url ? "outline" : "default"} 
          className={cn("h-9 rounded-lg text-xs font-bold", !lesson.content_url && "bg-indigo-600 hover:bg-indigo-700")} 
          disabled={uploading} 
          onClick={onUpload}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Upload className="h-3.5 w-3.5 mr-1.5" /> {lesson.content_url ? "Trocar" : "Upload"}</>}
        </Button>
        <button onClick={onDelete} className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </motion.li>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Field({ label, required, children }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}