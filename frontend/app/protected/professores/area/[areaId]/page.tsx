"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  BookOpen,
  PlayCircle,
  FileText,
  Users,
  Megaphone,
  CheckCircle2,
  MessageSquare
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TeacherArea {
  id: string;
  title: string;
  description: string | null;
  color_code: string;
  monthly_price: number;
  banner_url: string | null;
  teacher: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
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
  module_id: string | null;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

export default function TeacherAreaPage() {
  const params = useParams<{ areaId: string }>();
  const areaId = params?.areaId;
  const router = useRouter();

  const [area, setArea] = useState<TeacherArea | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [activeTab, setActiveTab] = useState<"curriculum" | "notices">("curriculum");
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!areaId) return;
    async function load() {
      setLoading(true);
      try {
        const [a, s, n] = await Promise.all([
          apiGet<TeacherArea>(`/teachers/areas/${areaId}`),
          apiGet<Section[]>(`/teachers/areas/${areaId}/sections`).catch(() => []),
          apiGet<Notice[]>(`/teachers/areas/${areaId}/notices`).catch(() => []),
        ]);
        setArea(a);
        setSections(s);
        setNotices(n);

        let firstLesson: Lesson | null = null;
        for (const section of s) {
            for (const module of section.modules) {
                if (module.lessons && module.lessons.length > 0) {
                    firstLesson = module.lessons[0];
                    break;
                }
            }
            if (firstLesson) break;
        }
        if (firstLesson) setSelectedLessonId(firstLesson.id);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar esta área. Verifique se você tem acesso."
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [areaId]);

  let currentLesson: Lesson | null = null;
  for (const section of sections) {
     for (const module of section.modules) {
        const found = module.lessons?.find(l => l.id === selectedLessonId);
        if (found) {
           currentLesson = found;
           break;
        }
     }
     if (currentLesson) break;
  }
  
  if (!currentLesson && sections.length > 0 && sections[0].modules.length > 0 && sections[0].modules[0].lessons?.length > 0) {
      currentLesson = sections[0].modules[0].lessons[0];
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!area || error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-6">
        <p className="text-slate-600 text-center max-w-md">
          {error ??
            "Área não encontrada ou você não tem permissão para acessá-la."}
        </p>
        <Button
          variant="outline"
          onClick={() => router.push("/protected/professores")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para professores
        </Button>
      </div>
    );
  }

  const initials = area.teacher.full_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar personalizada do professor */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="mr-1"
            onClick={() => router.push("/protected/professores")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Área do Professor
          </span>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            {area.teacher.avatar_url ? (
              <img
                src={area.teacher.avatar_url}
                alt={area.teacher.full_name}
                className="h-12 w-12 rounded-2xl object-cover"
              />
            ) : (
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: area.color_code }}
              >
                {initials}
              </div>
            )}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Professor
              </p>
              <p className="text-sm font-bold text-slate-900">
                {area.teacher.full_name}
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-600 space-y-2">
            <p className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
              Sobre esta área
            </p>
            {area.description ? (
              <p className="leading-relaxed">{area.description}</p>
            ) : (
              <p className="italic text-slate-400">
                O professor ainda não adicionou uma descrição personalizada.
              </p>
            )}
          </div>
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-semibold text-slate-700">
                Conteúdo exclusivo para assinantes
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Use esta sidebar como seu mural: descrição, recados para os
              alunos, roadmap do curso e links importantes.
            </p>
          </div>
        </div>
      </aside>

      {/* Conteúdo principal */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Banner topo */}
        <div className="relative h-48 w-full overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: area.banner_url
                ? `url(${area.banner_url}) center/cover`
                : `linear-gradient(135deg, ${area.color_code}, ${area.color_code}99)`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/10" />
          <div className="relative z-10 h-full flex items-end px-6 py-5 gap-4">
            <div className="flex items-center gap-3">
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-black/30"
                style={{ backgroundColor: area.color_code }}
              >
                <BookOpen className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em]">
                  Área de Membros
                </p>
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">
                  {area.title}
                </h1>
              </div>
            </div>
          </div>
        </div>

        {/* Player + lista de módulos e avisos */}
        <div className="flex-1 min-h-0 flex flex-col bg-slate-50">
          <div className="px-4 py-2 border-b border-slate-200 text-xs text-slate-500 flex items-center justify-between bg-white z-10 relative">
            <div className="flex bg-slate-100 p-1 rounded-lg">
               <button onClick={() => setActiveTab("curriculum")} className={cn("px-4 py-1.5 rounded-md font-bold transition-all", activeTab === "curriculum" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}>Conteúdo</button>
               <button onClick={() => setActiveTab("notices")} className={cn("px-4 py-1.5 rounded-md font-bold transition-all flex items-center gap-1.5", activeTab === "notices" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}>
                  Avisos 
                  {notices.length > 0 && (
                     <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-[9px] min-w-[18px] text-center">{notices.length}</span>
                  )}
               </button>
            </div>
            <Link
              href="/protected/professores"
              className="hidden sm:inline-flex text-indigo-600 font-medium hover:underline"
            >
              Ver outros professores
            </Link>
          </div>

          {activeTab === "curriculum" ? (
             <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] gap-4 p-4 overflow-hidden">
                {/* Player / visualizador */}
                <section className="flex flex-col min-h-0 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
                        Aula em destaque
                      </p>
                      <p className="text-sm font-semibold text-slate-900 truncate max-w-[260px] md:max-w-md">
                        {currentLesson?.title ?? "Nenhuma aula selecionada"}
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 min-h-0 bg-slate-900 flex items-center justify-center relative">
                    {!currentLesson || !currentLesson.content_url ? (
                      <div className="text-center px-6 py-10 text-slate-400 text-sm">
                        O professor ainda não adicionou o conteúdo desta aula.
                      </div>
                    ) : currentLesson.type === "video" ? (
                      <video
                        controls
                        src={currentLesson.content_url}
                        className="w-full h-full max-h-[100%] absolute inset-0 bg-black outline-none border-none object-contain"
                      />
                    ) : (
                      <iframe
                        src={currentLesson.content_url}
                        className="w-full h-full min-h-[100%] bg-slate-100 border-none outline-none absolute inset-0"
                        title={currentLesson.title}
                      />
                    )}
                  </div>
                  {currentLesson?.description && (
                     <div className="p-4 bg-white border-t border-slate-100 max-h-40 overflow-y-auto w-full">
                        <p className="text-xs font-bold text-slate-800 uppercase tracking-widest mb-1">Descrição</p>
                        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{currentLesson.description}</p>
                     </div>
                  )}
                </section>

                {/* Lista de módulos */}
                <section className="flex flex-col min-h-0 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
                  <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
                      Módulos da área
                    </p>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-4">
                    {sections.length === 0 ? (
                      <p className="text-xs text-slate-500 text-center py-6">
                        Nenhuma seção disponível ainda.
                      </p>
                    ) : (
                      <ul className="space-y-6">
                        {sections.map((section, sIdx) => (
                           <li key={section.id}>
                              <h4 className="font-bold text-xs text-slate-800 tracking-wider mb-2 flex items-center gap-2">
                                 <div className="w-5 h-5 rounded flex items-center justify-center text-white bg-slate-800">{sIdx + 1}</div>
                                 <span className="uppercase">{section.title}</span>
                              </h4>
                              <div className="space-y-3 pl-3">
                                 {(!section.modules || section.modules.length === 0) ? (
                                    <p className="text-[10px] text-slate-400">Sem módulos.</p>
                                 ) : section.modules.map((module, mIdx) => (
                                    <div key={module.id} className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                                       <div className="bg-slate-50 px-3 py-2 border-b border-slate-100">
                                          <p className="text-xs font-bold text-slate-700">
                                             Módulo {mIdx + 1}: {module.title}
                                          </p>
                                          {module.description && <p className="text-[10px] text-slate-500 mt-0.5">{module.description}</p>}
                                       </div>
                                       <div className="p-2 space-y-1 bg-slate-50/30">
                                          {!module.lessons || module.lessons.length === 0 ? (
                                             <div className="text-[10px] text-slate-400 p-2 text-center">Nenhuma aula neste módulo.</div>
                                          ) : module.lessons.map((lesson, lIdx) => {
                                             const active = lesson.id === currentLesson?.id;
                                             return (
                                               <button
                                                   key={lesson.id}
                                                   type="button"
                                                   onClick={() => setSelectedLessonId(lesson.id)}
                                                   className={cn(
                                                   "w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left text-xs transition-all",
                                                   active
                                                       ? "border-indigo-500 bg-indigo-50 shadow-sm"
                                                       : "border-transparent bg-white hover:border-slate-200"
                                                   )}
                                               >
                                                   <div
                                                   className={cn(
                                                       "h-7 w-7 rounded-md flex items-center justify-center text-white shrink-0",
                                                       lesson.type === "video"
                                                       ? "bg-indigo-500"
                                                       : "bg-emerald-500"
                                                   )}
                                                   >
                                                   {lesson.type === "video" ? (
                                                       <PlayCircle className="h-3.5 w-3.5" />
                                                   ) : (
                                                       <FileText className="h-3.5 w-3.5" />
                                                   )}
                                                   </div>
                                                   <div className="flex-1 min-w-0">
                                                   <p className="font-semibold text-slate-900 truncate">
                                                       Aula {String(lIdx + 1).padStart(2, "0")} · {lesson.title}
                                                   </p>
                                                   <p className="text-[10px] text-slate-500 truncate">
                                                       {lesson.type === "video" ? "Vídeo aula" : "Material PDF"}
                                                       {lesson.duration_minutes ? ` • ${lesson.duration_minutes} min` : ""}
                                                   </p>
                                                   </div>
                                               </button>
                                             );
                                          })}
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </section>
             </div>
          ) : (
             <div className="flex-1 min-h-0 bg-white border-t border-slate-200 p-6 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-6">
                   <div className="mb-8">
                      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                         <Megaphone className="h-5 w-5 text-indigo-500" />
                         Mural de Avisos
                      </h2>
                      <p className="text-sm text-slate-500 mt-1">Fique por dentro das atualizações do professor {area.teacher.full_name}.</p>
                   </div>

                   {notices.length === 0 ? (
                      <div className="py-20 text-center flex flex-col items-center">
                        <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                          <MessageSquare className="h-8 w-8" />
                        </div>
                        <p className="text-slate-500 text-sm font-medium">Nenhum aviso no momento.</p>
                      </div>
                   ) : (
                      <div className="space-y-4">
                         {notices.map(notice => (
                            <div key={notice.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                               <h3 className="text-lg font-bold text-slate-800">{notice.title}</h3>
                               <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-wider mt-1 mb-4 flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Publicado em {new Date(notice.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'long', year: 'numeric' })}
                               </p>
                               <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                            </div>
                         ))}
                      </div>
                   )}
                </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
}

