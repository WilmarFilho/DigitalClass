"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
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
  ArrowLeft,
  BookOpen,
  FolderOpen,
  Megaphone,
  MessageSquare,
  ImagePlus,
  Camera,
  Play,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { apiGet, apiPost, apiDelete, apiUpload, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface TeacherArea {
  id: string;
  title: string;
  description: string | null;
  color_code: string;
  monthly_price: number;
  is_private: boolean;
  banner_url: string | null;
  ai_tutor_enabled: boolean;
  ai_last_sync_at: string;
}

interface Section {
  id: string;
  title: string;
  order_index: number;
  modules: Module[];
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  lessons: Lesson[];
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

interface Notice {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function EditAreaPage() {
  const params = useParams();
  const router = useRouter();
  const areaId = params.id as string;

  const [area, setArea] = useState<TeacherArea | null>(null);

  // Data State for the Content
  const [activeTab, setActiveTab] = useState<"curriculum" | "notices">("curriculum");
  const [sections, setSections] = useState<Section[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  const [noticeModal, setNoticeModal] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ title: "", content: "" });
  const [savingNotice, setSavingNotice] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | { title: string; message: string } | null>(null);

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
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  const [sectionModal, setSectionModal] = useState(false);
  const [sectionForm, setSectionForm] = useState({ title: "" });
  const [savingSection, setSavingSection] = useState(false);

  const [moduleModal, setModuleModal] = useState<{ sectionId: string } | null>(null);
  const [moduleForm, setModuleForm] = useState({ title: "", description: "" });
  const [savingModule, setSavingModule] = useState(false);

  const [lessonModal, setLessonModal] = useState<{ moduleId: string } | null>(null);
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
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);
  const [editLessonModal, setEditLessonModal] = useState<{ lesson: Lesson; moduleId: string } | null>(null);
  const [editLessonForm, setEditLessonForm] = useState({ description: "" });
  const [savingEditLesson, setSavingEditLesson] = useState(false);
  const [materialsModal, setMaterialsModal] = useState<{ lesson: Lesson; moduleId: string } | null>(null);
  const [materials, setMaterials] = useState<{ id: string; type: string; title: string; url: string }[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const materialFileRef = useRef<HTMLInputElement>(null);
  const [needsSync, setNeedsSync] = useState(false);

  useEffect(() => { load(); }, [areaId]);

  const fetchMaterials = useCallback(async (lessonId: string) => {
    setLoadingMaterials(true);
    try {
      const list = await apiGet<{ id: string; type: string; title: string; url: string }[]>(`/teachers/lessons/${lessonId}/materials`);
      setMaterials(list);
    } catch {
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  }, []);

  useEffect(() => {
    const lessonId = materialsModal?.lesson?.id;
    if (!lessonId) return;
    fetchMaterials(lessonId);
  }, [materialsModal?.lesson?.id, fetchMaterials]);

  async function load() {
    setLoading(true);
    try {
      const a = await apiGet<TeacherArea>(`/teachers/my-areas/${areaId}`);
      setArea(a);
      setAreaForm({
        title: a.title,
        description: a.description ?? "",
        color_code: a.color_code,
        monthly_price: a.monthly_price,
        is_private: a.is_private,
      });

      const s = await apiGet<Section[]>(`/teachers/my-areas/${areaId}/sections`).catch(() => []);
      setSections(s);

      // 1. Extraímos todas as aulas de forma segura (usando optional chaining)
      const allLessons = s.flatMap(section =>
        section.modules?.flatMap(module => module.lessons || []) || []
      );

      // 2. Encontramos a data da aula mais recente
      const lastLessonDate = allLessons.length > 0
        ? new Date(Math.max(...allLessons.map(l => new Date(l.created_at).getTime())))
        : null;

      // 3. Calculamos o sync comparando com a data mais recente encontrada
      const mustSync = a.ai_tutor_enabled && (
        !a.ai_last_sync_at ||
        (lastLessonDate && lastLessonDate > new Date(a.ai_last_sync_at))
      );

      setNeedsSync(!!mustSync);

      const n = await apiGet<Notice[]>(`/teachers/my-areas/${areaId}/notices`).catch(() => []);
      setNotices(n);
    } catch (e: any) {
      setError("Não foi possível carregar os dados desta área.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveArea() {
    setSavingArea(true);
    try {
      const updated = await apiPost<TeacherArea>(`/teachers/my-areas/${areaId}`, {
        ...areaForm,
        monthly_price: Number(areaForm.monthly_price),
      });
      setArea(updated);
      setEditingArea(false);
      setSavedArea(true);
      setTimeout(() => setSavedArea(false), 2500);
    } catch (e: any) {
      setError(e.message || "Erro ao salvar");
    } finally {
      setSavingArea(false);
    }
  }

  // --- Section actions ---
  async function handleCreateSection() {
    if (!sectionForm.title.trim()) return;
    setSavingSection(true);
    try {
      const created = await apiPost<Section>(`/teachers/my-areas/${areaId}/sections`, {
        title: sectionForm.title,
        order_index: sections.length
      });
      setSections((prev) => [...prev, { ...created, modules: [] }]);
      setSectionModal(false);
      setSectionForm({ title: "" });
    } catch (e: any) {
      setError(e.message || "Erro ao criar seção");
    } finally {
      setSavingSection(false);
    }
  }

  async function handleDeleteSection(id: string) {
    if (!confirm("Remover esta seção? Todos os módulos nela serão removidos.")) return;
    try {
      await apiDelete(`/teachers/sections/${id}`);
      setSections((prev) => prev.filter(s => s.id !== id));
    } catch { }
  }

  // --- Module actions ---
  async function handleCreateModule() {
    if (!moduleModal || !moduleForm.title.trim()) return;
    setSavingModule(true);
    try {
      const section = sections.find(s => s.id === moduleModal.sectionId);
      const created = await apiPost<Module>(`/teachers/sections/${moduleModal.sectionId}/modules`, {
        title: moduleForm.title,
        description: moduleForm.description || null,
        order_index: section?.modules.length || 0,
      });
      setSections(prev => prev.map(s => {
        if (s.id === moduleModal.sectionId) {
          return { ...s, modules: [...s.modules, { ...created, lessons: [] }] };
        }
        return s;
      }));
      setModuleModal(null);
      setModuleForm({ title: "", description: "" });
    } catch (e: any) {
      setError(e.message || "Erro ao criar módulo");
    } finally {
      setSavingModule(false);
    }
  }

  async function handleDeleteModule(sectionId: string, moduleId: string) {
    if (!confirm("Remover este módulo permanentemente?")) return;
    try {
      await apiDelete(`/teachers/modules/${moduleId}`);
      setSections(prev => prev.map(s => {
        if (s.id === sectionId) return { ...s, modules: s.modules.filter(m => m.id !== moduleId) };
        return s;
      }));
    } catch { }
  }

  // --- Lesson actions ---
  async function handleCreateLesson() {
    if (!lessonModal || !lessonForm.title.trim()) return;
    setSavingLesson(true);
    try {
      const section = sections.find(s => s.modules.some(m => m.id === lessonModal.moduleId));
      const module = section?.modules.find(m => m.id === lessonModal.moduleId);

      const created = await apiPost<Lesson>(`/teachers/my-areas/${areaId}/lessons`, {
        ...lessonForm,
        module_id: lessonModal.moduleId,
        duration_minutes: lessonForm.duration_minutes ? Number(lessonForm.duration_minutes) : null,
        order_index: module?.lessons.length || 0,
      });

      setSections(prev => prev.map(s => {
        return {
          ...s,
          modules: s.modules.map(m => {
            if (m.id === lessonModal.moduleId) return { ...m, lessons: [...(m.lessons || []), created] };
            return m;
          })
        };
      }));

      setLessonModal(null);
      setLessonForm({ title: "", description: "", type: "video", duration_minutes: "" });
    } catch (e: any) {
      setError(e.message || "Erro ao criar aula");
    } finally {
      setSavingLesson(false);
    }
  }

  async function handleUpdateLesson(lessonId: string, description: string) {
    setSavingEditLesson(true);
    try {
      const updated = await apiPost<Lesson>(`/teachers/my-areas/${areaId}/lessons/${lessonId}`, { description: description || null });
      setSections(prev => prev.map(s => ({
        ...s,
        modules: s.modules.map(m => ({
          ...m,
          lessons: m.lessons.map(l => l.id === lessonId ? { ...l, ...updated } : l)
        }))
      })));
      setEditLessonModal(null);
    } catch (e: any) {
      setError(e.message || "Erro ao atualizar");
    } finally {
      setSavingEditLesson(false);
    }
  }

  async function handleDeleteLesson(moduleId: string, lessonId: string) {
    if (!confirm("Remover esta aula permanentemente?")) return;
    try {
      await apiDelete(`/teachers/my-areas/${areaId}/lessons/${lessonId}`);
      setSections(prev => prev.map(s => {
        return {
          ...s,
          modules: s.modules.map(m => {
            if (m.id === moduleId) return { ...m, lessons: m.lessons.filter(l => l.id !== lessonId) };
            return m;
          })
        };
      }));
    } catch { }
  }

  const MAX_VIDEO_SIZE_MB = 500;

  async function handleUpload(lessonId: string, file: File) {
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      setError(`O arquivo é muito grande. O limite máximo é ${MAX_VIDEO_SIZE_MB} MB. Seu arquivo tem ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
      return;
    }
    setUploadingLesson(lessonId);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${BASE_URL}/teachers/my-areas/${areaId}/lessons/${lessonId}/upload`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session?.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        let errorMessage = "Falha no upload";

        try {
          // Tenta ler o corpo da resposta
          const errBody = await res.json();

          // O NestJS coloca o erro em 'message'. 
          // Pode ser string ou Array de strings (caso do ValidationPipe)
          if (errBody && errBody.message) {
            errorMessage = Array.isArray(errBody.message)
              ? errBody.message[0]
              : errBody.message;
          }
        } catch (parseError) {
          // Se não for JSON (ex: erro de Proxy ou Nginx), usa o status text
          if (res.status === 413) {
            errorMessage = `O arquivo é muito grande para o servidor (Limite: ${MAX_VIDEO_SIZE_MB}MB).`;
          } else {
            errorMessage = `Erro técnico (${res.status}): ${res.statusText}`;
          }
        }

        throw new Error(errorMessage);
      }

      const updated = await res.json() as Lesson;

      setSections(prev => prev.map(s => {
        return {
          ...s,
          modules: s.modules.map(m => {
            return { ...m, lessons: m.lessons.map(l => l.id === lessonId ? updated : l) };
          })
        };
      }));

    } catch (e: any) {
      console.error("Upload Error:", e);
      setError(e.message || "Erro no upload");
    } finally {
      setUploadingLesson(null);
      setPendingUploadId(null);
    }
  }

  // --- Notice actions ---
  async function handleCreateNotice() {
    if (!noticeForm.title.trim() || !noticeForm.content.trim()) return;
    setSavingNotice(true);
    try {
      const created = await apiPost<Notice>(`/teachers/my-areas/${areaId}/notices`, noticeForm);
      setNotices(prev => [created, ...prev]);
      setNoticeModal(false);
      setNoticeForm({ title: "", content: "" });
    } catch (e: any) {
      setError(e.message || "Erro ao criar aviso");
    } finally {
      setSavingNotice(false);
    }
  }

  async function handleUploadMaterial(lessonId: string, file: File, type: 'image' | 'file' | 'executable') {
    setUploadingMaterial(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE_URL}/teachers/lessons/${lessonId}/materials/upload?type=${type}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${session?.access_token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("Falha no upload");
      await res.json();
      await fetchMaterials(lessonId);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Erro ao enviar material");
    } finally {
      setUploadingMaterial(false);
    }
  }

  async function handleDeleteMaterial(materialId: string) {
    try {
      await apiDelete(`/teachers/materials/${materialId}`);
      setMaterials(prev => prev.filter(m => m.id !== materialId));
    } catch (e: any) {
      setError(e.message || "Erro ao remover");
    }
  }

  async function handleDeleteNotice(id: string) {
    if (!confirm("Remover este aviso?")) return;
    try {
      await apiDelete(`/teachers/my-areas/${areaId}/notices/${id}`);
      setNotices(prev => prev.filter(n => n.id !== id));
    } catch { }
  }

  const [isSyncing, setIsSyncing] = useState(false);

  const handleToggleAi = async () => {
    if (!area) return;
    try {
      await apiPatch(`/teachers/my-areas/${areaId}/ai-settings`, {});
      setArea({ ...area, ai_tutor_enabled: !area.ai_tutor_enabled });
    } catch (error) {
      console.error("Erro ao alterar tutor de IA");
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const updatedArea = await apiPost<TeacherArea>(`/teachers/my-areas/${areaId}/ai-sync`, {});
      setArea(updatedArea);
      console.log("Base de conhecimento atualizada!");
    } catch (error) {
      console.error("Falha na sincronização");
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4 sm:px-6 lg:px-0">
      <Button variant="ghost" className="mb-4 text-slate-500" onClick={() => router.push("/professor/minha-area")}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Áreas
      </Button>

      <header className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
              style={{ backgroundColor: areaForm.color_code }}
            >
              <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                {area?.title || "Carregando..."}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">Gerencie configurações, módulos e aulas.</p>
            </div>
          </div>

          {/* Toggle do Tutor de IA no canto direito do título */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Tutor de IA</span>
              <span className="text-xs font-bold text-slate-600">{area?.ai_tutor_enabled ? 'Ativado' : 'Desativado'}</span>
            </div>
            <Switch
              checked={area?.ai_tutor_enabled}
              onCheckedChange={handleToggleAi}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {area && (
            <Button variant="outline" className="rounded-xl text-xs sm:text-sm" asChild>
              <a href={`/protected/professores/area/${area.id}`} target="_blank">
                <Eye className="h-4 w-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Visualizar como</span> Aluno
              </a>
            </Button>
          )}
          {!editingArea && (
            <Button className="rounded-xl bg-slate-900 hover:bg-slate-800 text-xs sm:text-sm" onClick={() => setEditingArea(true)}>
              <Settings2 className="h-4 w-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Editar</span> Configurações
            </Button>
          )}

          {/* Botão de Sync - Aparece apenas se a IA estiver ativa e houver novos conteúdos */}
          {needsSync && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Button
                onClick={handleSync}
                disabled={isSyncing}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs sm:text-sm border-none shadow-sm animate-pulse-slow"
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Atualizar IA
              </Button>
            </motion.div>
          )}
        </div>

        {/* Versão Mobile do Toggle de IA */}
        <div className="flex md:hidden items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-bold text-slate-700">Tutor de IA Especialista</span>
          </div>
          <Switch
            checked={area?.ai_tutor_enabled}
            onCheckedChange={handleToggleAi}
          />
        </div>
      </header>



      <div className="grid gap-6 xl:grid-cols-12">
        {/* Coluna Esquerda: Configurações */}
        <aside className="xl:col-span-4 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-50">
              <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                <Palette className="h-4 w-4 text-indigo-500" /> Identidade da Área
              </h2>
            </div>

            <div className="px-4 sm:px-6 pt-4 sm:pt-6">
              <div
                className="h-28 rounded-2xl relative flex items-center justify-center overflow-hidden transition-all duration-500 group cursor-pointer"
                style={area?.banner_url ? { backgroundImage: `url(${area.banner_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { backgroundColor: areaForm.color_code }}
                onClick={() => editingArea && bannerFileRef.current?.click()}
              >
                {!area?.banner_url && <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />}
                <span className="relative z-10 text-white font-black text-xl drop-shadow-md text-center px-4 leading-tight">
                  {areaForm.title || "Nome da sua Área"}
                </span>
                {editingArea && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-white text-xs font-bold bg-black/50 px-4 py-2 rounded-full backdrop-blur-sm">
                      {uploadingBanner ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ImagePlus className="h-4 w-4" /> Alterar Banner</>}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/20 backdrop-blur-md rounded text-[10px] text-white/80 font-bold uppercase tracking-widest">Preview</div>
              </div>
              <input ref={bannerFileRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !areaId) return;
                setUploadingBanner(true);
                try {
                  const supabase = createClient();
                  const { data: { session } } = await supabase.auth.getSession();
                  const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
                  const formData = new FormData();
                  formData.append("file", file);
                  const res = await fetch(`${BASE_URL}/teachers/my-areas/${areaId}/banner`, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${session?.access_token}` },
                    body: formData,
                  });
                  if (!res.ok) throw new Error("Upload falhou");
                  const updated = await res.json() as TeacherArea;
                  setArea(updated);
                } catch (err) {
                  console.error(err);
                } finally {
                  setUploadingBanner(false);
                  e.target.value = '';
                }
              }} />
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
              <Field label="Nome da Área" required>
                <input
                  value={areaForm.title}
                  onChange={(e) => setAreaForm(p => ({ ...p, title: e.target.value }))}
                  disabled={!editingArea}
                  placeholder="Ex: Formação em React"
                  className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all disabled:opacity-50"
                />
              </Field>

              <Field label="Descrição da Área" required>
                <input
                  value={areaForm.description}
                  onChange={(e) => setAreaForm(p => ({ ...p, description: e.target.value }))}
                  disabled={!editingArea}
                  placeholder="Conteudo do ensino superior"
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

              {areaForm.monthly_price > 0 && (
                <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                    <span className="text-[10px] font-black uppercase tracking-[0.15em]">Simulação de Ganhos</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Valor da Mensalidade</span>
                      <span className="font-black text-slate-800">R$ {areaForm.monthly_price.toFixed(2)}</span>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Taxa Stripe (~3.99% + R$0,39)</span>
                      <span className="font-bold text-red-500">
                        - R$ {(areaForm.monthly_price * 0.0399 + 0.39).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Taxa Plataforma (20%)</span>
                      <span className="font-bold text-red-500">
                        - R$ {(areaForm.monthly_price * 0.20).toFixed(2)}
                      </span>
                    </div>
                    <div className="h-px bg-emerald-200" />
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-black text-emerald-700 text-[11px] uppercase tracking-wider">Seu ganho líquido</span>
                      <span className="font-black text-emerald-700 text-base">
                        R$ {Math.max(0, areaForm.monthly_price - (areaForm.monthly_price * 0.0399 + 0.39) - (areaForm.monthly_price * 0.20)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

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
                    <Button variant="ghost" className="text-slate-500 hover:bg-slate-100" onClick={() => {
                      setEditingArea(false);
                      setAreaForm({
                        title: area.title,
                        description: area.description ?? "",
                        color_code: area.color_code,
                        monthly_price: area.monthly_price,
                        is_private: area.is_private,
                      });
                    }}>
                      Descartar Mudanças
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Coluna Direita: Conteúdo */}
        <main className="xl:col-span-8 min-w-0">
          <div className="flex bg-slate-100/50 p-1 sm:p-1.5 rounded-2xl w-full sm:w-fit border border-slate-200/60 mb-4 sm:mb-6">
            <button onClick={() => setActiveTab("curriculum")} className={cn("flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all", activeTab === "curriculum" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Conteúdo e Módulos</button>
            <button onClick={() => setActiveTab("notices")} className={cn("flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all", activeTab === "notices" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700")}>Mural de Avisos</button>
          </div>

          {activeTab === "curriculum" ? (
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm min-h-[400px] sm:min-h-[500px]">
              <div className="p-4 sm:p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                    <MonitorPlay className="h-4 w-4 text-indigo-500" /> Currículo do Curso
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Organize em Seções e Módulos</p>
                </div>
                <Button onClick={() => setSectionModal(true)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" /> Nova Seção
                </Button>
              </div>

              <div className="p-3 sm:p-6">
                {sections.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                      <FolderOpen className="h-8 w-8" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Esta área não tem nenhuma seção de conteúdo.</p>
                    <Button variant="link" className="text-indigo-600" onClick={() => setSectionModal(true)}>Adicionar primeira seção</Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {sections.map((section, sIndex) => (
                      <div key={section.id} className="rounded-2xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white border-b border-slate-100 gap-2">
                          <h3 className="font-black text-slate-800 flex items-center gap-2 text-sm sm:text-base min-w-0">
                            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs shrink-0">{sIndex + 1}</div>
                            <span className="truncate">{section.title}</span>
                          </h3>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button size="sm" variant="ghost" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 h-8 text-xs" onClick={() => setModuleModal({ sectionId: section.id })}>
                              <Plus className="h-3 w-3 mr-1" /> <span className="hidden sm:inline">Novo </span>Módulo
                            </Button>
                            <button onClick={() => handleDeleteSection(section.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="p-2 sm:p-4 space-y-3 sm:space-y-4">
                          {(!section.modules || section.modules.length === 0) ? (
                            <div className="text-center py-6 text-sm text-slate-400 font-medium">Esta seção não tem módulos.</div>
                          ) : (
                            section.modules.map((module, mIndex) => (
                              <div key={module.id} className="rounded-xl border border-slate-200 bg-white">
                                <div className="flex items-center justify-between p-2 sm:p-3 border-b border-slate-50 gap-2">
                                  <h4 className="font-bold text-xs sm:text-sm text-slate-800 truncate min-w-0">Módulo {mIndex + 1}: {module.title}</h4>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 text-xs px-1.5 sm:px-2" onClick={() => setLessonModal({ moduleId: module.id })}>
                                      <Plus className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Aula</span>
                                    </Button>
                                    <button onClick={() => handleDeleteModule(section.id, module.id)} className="h-7 w-7 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>

                                <div className="p-2 sm:p-3">
                                  {(!module.lessons || module.lessons.length === 0) ? (
                                    <div className="text-center py-4 text-xs text-slate-400 font-medium">Módulo vazio.</div>
                                  ) : (
                                    <ul className="space-y-2">
                                      {module.lessons.map((lesson, lIndex) => (
                                        <LessonRow
                                          key={lesson.id}
                                          lesson={lesson}
                                          index={lIndex + 1}
                                          uploading={uploadingLesson === lesson.id}
                                          onDelete={() => handleDeleteLesson(module.id, lesson.id)}
                                          onUpload={() => {
                                            setPendingUploadId(lesson.id);
                                            fileInputRef.current?.click();
                                          }}
                                          onPreview={() => setPreviewLesson(lesson)}
                                          onEdit={() => {
                                            setEditLessonModal({ lesson, moduleId: module.id });
                                            setEditLessonForm({ description: lesson.description ?? "" });
                                          }}
                                        />
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl sm:rounded-3xl border border-slate-200 bg-white shadow-sm min-h-[400px] sm:min-h-[500px]">
              <div className="p-4 sm:p-6 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-slate-800 flex items-center gap-2 text-sm sm:text-base">
                    <Megaphone className="h-4 w-4 text-indigo-500" /> Mural de Avisos
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Comunique-se com seus alunos</p>
                </div>
                <Button onClick={() => setNoticeModal(true)} className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" /> Novo Aviso
                </Button>
              </div>

              <div className="p-3 sm:p-6">
                {notices.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                      <MessageSquare className="h-8 w-8" />
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Nenhum aviso publicado ainda.</p>
                    <Button variant="link" className="text-indigo-600" onClick={() => setNoticeModal(true)}>Criar primeiro aviso</Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notices.map(notice => (
                      <div key={notice.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800">{notice.title}</h4>
                            <p className="text-xs text-slate-400 mt-1">{new Date(notice.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                          </div>
                          <button onClick={() => handleDeleteNotice(notice.id)} className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-sm text-slate-600 mt-4 whitespace-pre-wrap">{notice.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <input ref={fileInputRef} type="file" accept="video/*,.pdf" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file && pendingUploadId) handleUpload(pendingUploadId, file);
        e.target.value = "";
      }} />

      {/* Modals Area */}

      {/* Modal Section */}
      <AnimatePresence>
        {sectionModal && (
          <div className=" md:ml-72 fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md rounded-[2.5rem] bg-white shadow-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Plus className="h-6 w-6" /></div>
                <button onClick={() => setSectionModal(false)} className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Nova Seção</h3>
                  <p className="text-sm text-slate-500">Ex: Introdução, Formação Básica, etc.</p>
                </div>
                <Field label="Nome da Seção" required>
                  <input value={sectionForm.title} onChange={e => setSectionForm({ title: e.target.value })} className="w-full h-12 rounded-xl border border-slate-200 px-4 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                </Field>
                <Button className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100" disabled={!sectionForm.title.trim() || savingSection} onClick={handleCreateSection}>
                  {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Seção"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Module */}
      <AnimatePresence>
        {moduleModal && (
          <div className=" md:ml-72 fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-md rounded-[2.5rem] bg-white shadow-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Plus className="h-6 w-6" /></div>
                <button onClick={() => setModuleModal(null)} className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Novo Módulo</h3>
                  <p className="text-sm text-slate-500">Crie os módulos que conterão suas aulas.</p>
                </div>
                <Field label="Nome do Módulo" required>
                  <input value={moduleForm.title} onChange={e => setModuleForm(p => ({ ...p, title: e.target.value }))} className="w-full h-12 rounded-xl border border-slate-200 px-4 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                </Field>
                <Field label="Descrição" required={false}>
                  <textarea value={moduleForm.description} onChange={e => setModuleForm(p => ({ ...p, description: e.target.value }))} className="w-full h-24 rounded-xl border border-slate-200 px-4 py-2 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" />
                </Field>
                <Button className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100" disabled={!moduleForm.title.trim() || savingModule} onClick={handleCreateModule}>
                  {savingModule ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Módulo"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Lesson */}
      <AnimatePresence>
        {lessonModal && (
          <div className=" md:ml-72 fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg rounded-[2.5rem] bg-white shadow-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Plus className="h-6 w-6" />
                </div>
                <button onClick={() => setLessonModal(null)} className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
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
                  <Button variant="ghost" className="flex-1 h-12 rounded-xl text-slate-500" onClick={() => setLessonModal(null)}>Cancelar</Button>
                  <Button className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100" disabled={!lessonForm.title.trim() || savingLesson} onClick={handleCreateLesson}>
                    {savingLesson ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Aula"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Preview Aula */}
      <AnimatePresence>
        {previewLesson && (
          <div className=" md:ml-72 fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={() => setPreviewLesson(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-slate-900 overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
                <h3 className="font-bold text-white truncate">{previewLesson.title}</h3>
                <Button variant="ghost" size="icon" className="text-slate-300 hover:text-white" onClick={() => setPreviewLesson(null)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="aspect-video bg-black">
                {previewLesson.content_url ? (
                  previewLesson.type === "video" ? (
                    <video controls src={previewLesson.content_url} className="w-full h-full object-contain" />
                  ) : (
                    <iframe src={previewLesson.content_url} className="w-full h-full border-none" title={previewLesson.title} />
                  )
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-4">
                    <MonitorPlay className="h-12 w-12 opacity-20" />
                    <p className="text-sm">Faça o upload do conteúdo para pré-visualizar.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Editar Aula (descrição + materiais) */}
      <AnimatePresence>
        {editLessonModal && (
          <div className=" md:ml-72 fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-[2.5rem] bg-white shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-black text-slate-900">Editar aula: {editLessonModal.lesson.title}</h3>
                <button onClick={() => setEditLessonModal(null)} className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-4">
                <Field label="Descrição da aula">
                  <textarea
                    value={editLessonForm.description}
                    onChange={(e) => setEditLessonForm({ description: e.target.value })}
                    placeholder="Descreva o conteúdo desta aula..."
                    className="w-full h-32 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                  />
                </Field>
                <div className="pt-4">
                  <Button
                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700"
                    disabled={savingEditLesson}
                    onClick={() => handleUpdateLesson(editLessonModal.lesson.id, editLessonForm.description)}
                  >
                    {savingEditLesson ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar descrição"}
                  </Button>
                </div>
                <div className="border-t border-slate-100 pt-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Materiais complementares</p>
                  <p className="text-sm text-slate-400 mb-3">Gerencie materiais na área do aluno ao assistir a aula.</p>
                  <Button variant="outline" className="w-full rounded-xl" onClick={() => {
                    setMaterialsModal({ lesson: editLessonModal.lesson, moduleId: editLessonModal.moduleId });
                    setEditLessonModal(null);
                  }}>
                    <FolderOpen className="h-4 w-4 mr-2" /> Gerenciar materiais desta aula
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Materiais Complementares */}
      <AnimatePresence>
        {materialsModal && (
          <div className=" md:ml-72 fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-[2.5rem] bg-white shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-3 mb-6">
                <h3 className="text-lg font-black text-slate-900 truncate min-w-0">Materiais: {materialsModal.lesson.title}</h3>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => fetchMaterials(materialsModal.lesson.id)} disabled={loadingMaterials} title="Recarregar">
                    <RefreshCw className={cn("h-4 w-4 text-slate-500", loadingMaterials && "animate-spin")} />
                  </Button>
                  <button onClick={() => setMaterialsModal(null)} className="h-9 w-9 rounded-full hover:bg-slate-100 flex items-center justify-center">
                    <X className="h-5 w-5 text-slate-400" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-500 mb-4">Adicione fotos, arquivos ou executáveis como material complementar para seus alunos.</p>
              <div className="space-y-3 mb-6">
                {loadingMaterials ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-indigo-500" /></div>
                ) : materials.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">Nenhum material adicionado.</p>
                ) : (
                  materials.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-indigo-600 hover:underline truncate flex-1 min-w-0">
                        {m.title}
                      </a>
                      <span className="text-[10px] font-bold text-slate-400 uppercase mx-2">{m.type}</span>
                      <button onClick={() => handleDeleteMaterial(m.id)} className="text-slate-400 hover:text-red-500 p-1">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Adicionar material</p>
                <input
                  ref={materialFileRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.zip,.exe"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && materialsModal) {
                      const type = file.type.startsWith('image/') ? 'image' : /\.(exe|msi)$/i.test(file.name) ? 'executable' : 'file';
                      handleUploadMaterial(materialsModal.lesson.id, file, type);
                      e.target.value = '';
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={uploadingMaterial}
                    onClick={() => materialFileRef.current?.click()}
                  >
                    {uploadingMaterial ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    Enviar arquivo
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Notice */}
      <AnimatePresence>
        {noticeModal && (
          <div className=" md:ml-72 fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-lg rounded-[2.5rem] bg-white shadow-2xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Megaphone className="h-6 w-6" /></div>
                <button onClick={() => setNoticeModal(false)} className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors">
                  <X className="h-5 w-5 text-slate-400" />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-900">Novo Aviso</h3>
                  <p className="text-sm text-slate-500">O aviso ficará em destaque na área do aluno.</p>
                </div>
                <Field label="Título do Aviso" required>
                  <input value={noticeForm.title} onChange={e => setNoticeForm(p => ({ ...p, title: e.target.value }))} placeholder="Ex: Aviso Importante!" className="w-full h-12 rounded-xl border border-slate-200 px-4 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                </Field>
                <Field label="Mensagem" required>
                  <textarea value={noticeForm.content} onChange={e => setNoticeForm(p => ({ ...p, content: e.target.value }))} placeholder="Escreva a mensagem aqui..." className="w-full h-32 rounded-xl border border-slate-200 px-4 py-3 font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none" />
                </Field>
                <Button className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100" disabled={!noticeForm.title.trim() || !noticeForm.content.trim() || savingNotice} onClick={handleCreateNotice}>
                  {savingNotice ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar Aviso"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Error */}
      <AnimatePresence>
        {error && (
          <div className=" md:ml-72 fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md overflow-hidden rounded-[2.5rem] bg-white shadow-2xl"
            >
              <div className="relative p-8">
                <div className="flex items-center justify-center mb-6">
                  <div className="h-20 w-20 rounded-3xl bg-red-50 flex items-center justify-center text-red-500 shadow-inner">
                    <AlertCircle className="h-10 w-10" />
                  </div>
                </div>

                <div className="text-center space-y-2 mb-8">
                  <h3 className="text-2xl font-black text-slate-900 leading-tight">
                    {typeof error === "string" ? "Ops! Ocorreu um problema" : error.title}
                  </h3>
                  <p className="text-slate-500 font-medium leading-relaxed">
                    {typeof error === "string" ? error : error.message}
                  </p>
                </div>

                <Button
                  onClick={() => setError(null)}
                  className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]"
                >
                  Entendido
                </Button>

                <div className="mt-6 flex justify-center">
                  <div className="px-3 py-1 bg-slate-50 rounded-full border border-slate-100 italic text-[10px] text-slate-400 font-medium">
                    Se o problema persistir, entre em contato com o suporte.
                  </div>
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
function LessonRow({ lesson, index, uploading, onDelete, onUpload, onPreview, onEdit }: any) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      /* Mudança principal: flex-col abaixo de 990px (custom: max-[990px]) e itens-start */
      className="group flex flex-col min-[1100px]:flex-row min-[1100px]:items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 min-[1100px]:p-3 hover:bg-white hover:border-indigo-100 hover:shadow-md hover:shadow-indigo-500/5 transition-all"
    >
      {/* Wrapper para o conteúdo da esquerda (Ícone + Título) */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
        <div className="hidden min-[1100px]:block cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-indigo-300 transition-colors">
          <GripVertical className="h-4 w-4" />
        </div>

        <div className={cn(
          "h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-colors",
          lesson.content_url ? "bg-emerald-50 text-emerald-600" : "bg-slate-200 text-slate-400"
        )}>
          {lesson.type === "video" ? <Video className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-slate-800 truncate">{lesson.title}</h4>
          <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
            {lesson.content_url ? (
              <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Conteúdo Pronto
              </span>
            ) : (
              <span className="text-[9px] font-black text-amber-500 uppercase flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> Aguardando Upload
              </span>
            )}
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{lesson.type}</span>
          </div>
        </div>
      </div>

      {/* Container de Botões: Embaixo no mobile, Lado no desktop */}
      <div className="flex items-center gap-2 shrink-0 pt-3 min-[990px]:pt-0 border-t border-slate-100 min-[990px]:border-0 w-full min-[990px]:w-auto justify-between min-[990px]:justify-end">
        <div className="flex items-center gap-2">
          {lesson.content_url && (
            <Button
              size="sm"
              variant="outline"
              className="h-9 w-9 min-[500px]:w-auto min-[500px]:px-3 rounded-xl text-indigo-600 border-indigo-200 hover:bg-indigo-50 text-[11px] font-bold transition-all"
              onClick={onPreview}
            >
              <Play className="h-3.5 w-3.5 min-[500px]:mr-1" />
              <span className="hidden lg:inline">Ver</span>
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="h-9 w-9 min-[500px]:w-auto min-[500px]:px-3 rounded-xl text-slate-600 border-slate-200 hover:bg-slate-100 text-[11px] font-bold transition-all"
            onClick={onEdit}
          >
            <Settings2 className="h-3.5 w-3.5 min-[500px]:mr-1" />
            <span className="hidden lg:inline">Editar</span>
          </Button>

          <Button
            size="sm"
            variant={lesson.content_url ? "outline" : "default"}
            className={cn(
              "h-9 w-9 min-[500px]:w-auto min-[500px]:px-3 rounded-xl text-[11px] font-bold transition-all",
              !lesson.content_url && "bg-indigo-600 hover:bg-indigo-700"
            )}
            disabled={uploading}
            onClick={onUpload}
          >
            {uploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Upload className={cn("h-3.5 w-3.5", lesson.content_url || "min-[500px]:mr-1")} />
                <span className="hidden min-[500px]:inline">
                  {lesson.content_url ? "Trocar" : "Upload"}
                </span>
              </>
            )}
          </Button>
        </div>

        <button
          onClick={onDelete}
          className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
        >
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
