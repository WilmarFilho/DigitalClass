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

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  type: "video" | "pdf";
  content_url: string | null;
  duration_minutes: number | null;
  order_index: number;
}

export default function TeacherAreaPage() {
  const params = useParams<{ areaId: string }>();
  const areaId = params?.areaId;
  const router = useRouter();

  const [area, setArea] = useState<TeacherArea | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!areaId) return;
    async function load() {
      setLoading(true);
      try {
        const [a, l] = await Promise.all([
          apiGet<TeacherArea>(`/teachers/areas/${areaId}`),
          apiGet<Lesson[]>(`/teachers/areas/${areaId}/lessons`),
        ]);
        setArea(a);
        setLessons(l);
        if (l.length > 0) setSelectedLessonId(l[0].id);
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

  const currentLesson =
    lessons.find((l) => l.id === selectedLessonId) ?? lessons[0] ?? null;

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

        {/* Player + lista de módulos */}
        <div className="flex-1 min-h-0 grid grid-rows-[auto,1fr] bg-slate-50">
          <div className="px-4 py-2 border-b border-slate-200 text-xs text-slate-500 flex items-center justify-between">
            <span>
              {lessons.length} módulo{lessons.length === 1 ? "" : "s"} nesta área
            </span>
            <Link
              href="/protected/professores"
              className="hidden sm:inline-flex text-indigo-600 font-medium hover:underline"
            >
              Ver outros professores
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)] gap-4 p-4 overflow-hidden min-h-0">
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
              <div className="flex-1 min-h-0 bg-slate-900 flex items-center justify-center">
                {!currentLesson || !currentLesson.content_url ? (
                  <div className="text-center px-6 py-10 text-slate-400 text-sm">
                    O professor ainda não adicionou o conteúdo desta aula.
                  </div>
                ) : currentLesson.type === "video" ? (
                  <video
                    controls
                    src={currentLesson.content_url}
                    className="w-full h-full max-h-[520px] bg-black"
                  />
                ) : (
                  <iframe
                    src={currentLesson.content_url}
                    className="w-full h-full min-h-[360px] bg-slate-900"
                    title={currentLesson.title}
                  />
                )}
              </div>
            </section>

            {/* Lista de módulos */}
            <section className="flex flex-col min-h-0 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
                  Módulos da área
                </p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                {lessons.length === 0 ? (
                  <p className="text-xs text-slate-500 px-2 py-4">
                    O professor ainda não liberou módulos nesta área.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {lessons.map((lesson, index) => {
                      const active = lesson.id === currentLesson?.id;
                      return (
                        <li key={lesson.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedLessonId(lesson.id)}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-xs transition-all",
                              active
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            )}
                          >
                            <div
                              className={cn(
                                "h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0",
                                lesson.type === "video"
                                  ? "bg-indigo-500"
                                  : "bg-emerald-500"
                              )}
                            >
                              {lesson.type === "video" ? (
                                <PlayCircle className="h-4 w-4" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                Módulo {String(index + 1).padStart(2, "0")} ·{" "}
                                {lesson.title}
                              </p>
                              <p className="text-[10px] text-slate-500 truncate">
                                {lesson.type === "video"
                                  ? "Vídeo aula"
                                  : "Material PDF"}
                                {lesson.duration_minutes
                                  ? ` • ${lesson.duration_minutes} min`
                                  : ""}
                              </p>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

