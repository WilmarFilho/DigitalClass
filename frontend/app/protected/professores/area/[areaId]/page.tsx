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
  MessageSquare,
  MonitorPlay
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
  const [loadingModuleId, setLoadingModuleId] = useState<string | null>(null);

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
              Sobre esta área:
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
            <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
              <div className="p-6 md:p-8 space-y-12 max-w-7xl mx-auto">
                {sections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <BookOpen className="h-12 w-12 mb-4 opacity-20" />
                    <p className="font-medium">Nenhum conteúdo disponível ainda.</p>
                  </div>
                ) : (
                  sections.map((section, sIdx) => (
                    <section key={section.id} className="space-y-6">
                      {/* Header da Seção */}
                      <div className="flex items-center gap-4">
                        <span className="text-3xl md:text-4xl font-black text-slate-200/70 select-none">
                          {String(sIdx + 1).padStart(2, '0')}
                        </span>
                        <div className="h-px flex-1 bg-slate-200" />
                        <h3 className="text-[10px] md:text-sm font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">
                          {section.title}
                        </h3>
                      </div>

                      {/* Listagem Horizontal de Módulos */}
                      <div className="flex gap-4 md:gap-5 overflow-x-auto no-scrollbar -mx-4 px-4 py-4 -my-4">
                        {section.modules?.map((module, mIdx) => {
                          const isLoading = loadingModuleId === module.id;

                          return (
                            <button
                              key={module.id}
                              disabled={loadingModuleId !== null}
                              onClick={() => {
                                setLoadingModuleId(module.id);
                                router.push(`/protected/professores/area/${areaId}/modulo/${module.id}`);
                              }}
                              className="flex-shrink-0 w-[220px] min-[400px]:w-72 group text-left transition-all"
                            >
                              <div className={cn(
                                "relative aspect-[16/10] rounded-[2rem] md:rounded-3xl bg-white border border-slate-200 shadow-sm p-5 md:p-6 flex flex-col justify-between overflow-hidden transition-all duration-300",
                                !isLoading && "group-hover:border-indigo-500 group-hover:shadow-xl group-hover:shadow-indigo-500/10 group-hover:-translate-y-2",
                                isLoading && "border-indigo-500 ring-2 ring-indigo-50"
                              )}>

                                {/* Overlay de Loading */}
                                {isLoading && (
                                  <div className="absolute inset-0 z-20 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-2">
                                      <Loader2 className="h-6 w-6 md:h-8 md:w-8 animate-spin text-indigo-600" />
                                      <span className="text-[9px] md:text-[10px] font-black text-indigo-600 uppercase tracking-widest">Carregando</span>
                                    </div>
                                  </div>
                                )}

                                {/* Badge de Aulas */}
                                <div className={cn("flex justify-between items-start relative z-10 transition-opacity", isLoading && "opacity-20")}>
                                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    <MonitorPlay className="h-5 w-5 md:h-6 md:w-6" />
                                  </div>
                                  <span className="bg-slate-900 text-white text-[9px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-full uppercase tracking-wider">
                                    {module.lessons?.length || 0} Aulas
                                  </span>
                                </div>

                                <div className={cn("relative z-10 transition-opacity", isLoading && "opacity-20")}>
                                  <p className="text-[9px] md:text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    Ver Módulo
                                  </p>
                                  {/* Ajuste de fonte do título: text-base para telas pequenas, text-lg para o padrão */}
                                  <h4 className="font-black text-slate-900 text-base md:text-lg leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">
                                    {module.title}
                                  </h4>
                                </div>

                                {/* Elemento Decorativo */}
                                <div className={cn("absolute -right-6 -bottom-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity", isLoading && "opacity-0")}>
                                  <BookOpen className="h-24 w-24 md:h-32 md:w-32 text-slate-900" />
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ))
                )}
              </div>

              <style jsx global>{`
      .no-scrollbar::-webkit-scrollbar { display: none; }
      .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>
            </div>
          ) : (

            <div className="flex-1 overflow-y-auto bg-[#F8FAFC]">
              <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-10">

                {/* Header do Mural - Versão Clara e Justificada */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-8">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-indigo-600" />
                      <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Canal de Comunicação</span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Mural de Avisos</h2>
                    <p className="text-slate-500 text-sm max-w-md">
                      Informações e atualizações postadas por <span className="font-bold text-slate-700">{area?.teacher.full_name}</span>.
                    </p>
                  </div>

                  <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Megaphone className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase leading-none">Total de avisos</p>
                      <p className="text-sm font-black text-slate-900 leading-none mt-1">{notices.length} mensagens</p>
                    </div>
                  </div>
                </header>

                {/* Listagem de Avisos Justificada */}
                <div className="grid grid-cols-1 gap-6">
                  {notices.length === 0 ? (
                    <div className="py-24 flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 border-dashed">
                      <MessageSquare className="h-10 w-10 text-slate-200 mb-4" />
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Nenhum aviso disponível</p>
                    </div>
                  ) : (
                    notices.map((notice) => (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={notice.id}
                        className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
                      >
                        <div className="p-8">
                          {/* Topo do Card: Badge e Data Justificados */}
                          <div className="flex items-center justify-between mb-6">
                            <div className="px-3 py-1 rounded-full bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-wider border border-slate-200">
                              Notificação
                            </div>
                            <div className="flex items-center gap-2 text-slate-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span className="text-[11px] font-bold uppercase tracking-tighter">
                                {new Date(notice.created_at).toLocaleDateString("pt-BR", {
                                  day: '2-digit',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Conteúdo */}
                          <div className="space-y-4">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                              {notice.title}
                            </h3>
                            <div className="h-1 w-10 bg-indigo-600 rounded-full" />
                            <p className="text-slate-600 leading-relaxed text-sm md:text-base whitespace-pre-wrap">
                              {notice.content}
                            </p>
                          </div>

                          {/* Rodapé do Card: Estilo Justificado */}
                          <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center">
                                <Users className="h-3 w-3 text-slate-400" />
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">Visível para todos os alunos</span>
                            </div>

                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>

          )}
        </div>
      </main>
    </div>
  );
}

