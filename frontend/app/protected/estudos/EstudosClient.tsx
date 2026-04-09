"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Brain, Plus, BookOpen, Clock, Loader2, ChevronRight, History, AlertCircle, CheckCircle2, Calendar, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { apiGet, apiPost } from "@/lib/api";
import { Label } from "@radix-ui/react-label";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

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

interface CalendarEvent {
  id: string;
  subject_id: string;
  scheduled_date: string;
  duration_minutes: number;
  subjects: { id: string; title: string; color_code: string } | null;
}

const pageVariants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1] as const,
      staggerChildren: 0.1,
      delayChildren: 0.06,
    },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const listVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function EstudosClient() {
  const router = useRouter();
  const { t, lang } = useTranslation();
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [weekEvents, setWeekEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSessionOpen, setNewSessionOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [startingEventId, setStartingEventId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const loadData = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const now = new Date();
      if (pageNum === 1) {
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        const todayStr = now.toISOString().slice(0, 10);

        const [sessionsRes, subjectsRes, calendarData] = await Promise.all([
          apiGet<any>("/study/sessions?page=1&limit=9"),
          apiGet<any>("/subjects?limit=100"),
          apiGet<CalendarEvent[]>(`/calendar/events?month=${monthKey}`),
        ]);

        const subjectsData = subjectsRes.data || [];
        setSubjects(subjectsData.map((s: any) => ({ ...s, color_code: s.color_code || "#6D44CC" })));
        setSessions(sessionsRes.data || []);
        setHasMore(sessionsRes.meta?.page < sessionsRes.meta?.last_page);
        setTodayEvents(calendarData.filter(e => e.scheduled_date === todayStr));

        // Calculate week events
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        const endOfWeek = new Date(now);
        endOfWeek.setDate(now.getDate() - now.getDay() + 6); // Saturday
        const startStr = startOfWeek.toISOString().slice(0, 10);
        const endStr = endOfWeek.toISOString().slice(0, 10);

        setWeekEvents(calendarData.filter(e => e.scheduled_date >= startStr && e.scheduled_date <= endStr).sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)));
      } else {
        const sessionsRes = await apiGet<any>(`/study/sessions?page=${pageNum}&limit=9`);
        setSessions((prev) => [...prev, ...(sessionsRes.data || [])]);
        setHasMore(sessionsRes.meta?.page < sessionsRes.meta?.last_page);
      }
      setPage(pageNum);
    } catch {
      if (pageNum === 1) {
        setSessions([]);
        setSubjects([]);
        setTodayEvents([]);
        setWeekEvents([]);
      }
    } finally {
      if (pageNum === 1) setLoading(false);
      else setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadData(1);
  }, [loadData]);

  const handleStartSession = async () => {
    if (!selectedEventId) {
      setError(t("estudos.selectEventError"));
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const payload: any = {};
      let finalSubjectId = "";

      if (selectedEventId) {
        const ev = weekEvents.find(e => e.id === selectedEventId);
        if (ev) {
          payload.subject_id = ev.subject_id;
          payload.calendar_event_id = ev.id;
          finalSubjectId = ev.subject_id;
        }
      }

      const session = await apiPost<StudySession>("/study/sessions", payload);
      setNewSessionOpen(false);
      router.push(`/protected/estudos/sessao?sessionId=${session.id}&subjectId=${finalSubjectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("estudos.startSessionError"));
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
    if (diff === 0) return t("estudos.today");
    if (diff === 1) return t("estudos.yesterday");
    if (diff < 7) return t("estudos.daysAgo", { days: diff });
    return d.toLocaleDateString(lang, { day: "numeric", month: "short" });
  };

  return (
    <motion.div
      className="mx-auto max-w-6xl space-y-10 pb-10"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header com Glassmorphism */}
      <motion.div
        variants={sectionVariants}
        className="flex flex-col justify-between gap-6 rounded-3xl border border-[#E6E0F8] bg-white p-6 shadow-sm md:flex-row md:items-center md:p-8"
      >
        <div className="flex items-center gap-4 max-[870px]:hidden">
          <div className="p-3 bg-[#F5F3FF] rounded-2xl border border-[#E6E0F8] shadow-inner">
            <Brain className="h-7 w-7 text-[#6D44CC]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">{t("estudos.title")}</h1>
            <p className="text-sm font-medium text-slate-400 flex items-center gap-1.5">
              <History className="h-3.5 w-3.5 text-[#6D44CC]" /> {t("estudos.subtitle")}
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setNewSessionOpen(true);
            if (weekEvents.length > 0) {
              const todayStr = new Date().toISOString().slice(0, 10);
              const todayEvent = weekEvents.find(e => e.scheduled_date === todayStr);
              setSelectedEventId(todayEvent ? todayEvent.id : weekEvents[0].id);
            } else {
              setSelectedEventId(null);
            }
            setError(null);
          }}
          disabled={weekEvents.length === 0}
          className="bg-[#6D44CC] hover:bg-[#5B39A8] text-white rounded-xl px-8 h-12 font-bold shadow-lg shadow-[#6D44CC]/20 transition-all hover:scale-[1.02]"
        >
          <Plus className="h-5 w-5 mr-2" /> {t("estudos.newSession")}
        </Button>
      </motion.div>

      {/* Alerta de Matéria Pendente */}
      {subjects.length === 0 && !loading && (
        <motion.div
          variants={sectionVariants}
          className="group relative overflow-hidden rounded-3xl border border-amber-200 bg-amber-50/50 p-6 backdrop-blur-sm"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">{t("estudos.noSubjects")}</p>
              <p className="text-xs font-medium text-amber-700/80">{t("estudos.noSubjectsDesc")}</p>
            </div>
            <Link href="/protected/materias">
              <Button size="sm" variant="outline" className="border-amber-200 hover:bg-amber-100 text-amber-800 font-bold rounded-lg transition-colors">
                {t("estudos.goToSubjects")}
              </Button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Agendados para Hoje */}
      {todayEvents.length > 0 && (
        <motion.div variants={sectionVariants} className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Calendar className="h-5 w-5 text-[#6D44CC]" />
            <h3 className="text-sm font-black text-[#1A1A1A] uppercase tracking-[0.2em]">{t("estudos.plannedToday")}</h3>
          </div>
          <motion.div
            variants={listVariants}
            className="grid grid-cols-1 gap-6 min-[890px]:grid-cols-2 min-[1365px]:grid-cols-3"
          >
            {todayEvents.map((ev) => (
              <motion.div
                key={ev.id}
                variants={cardVariants}
                className="group relative h-full overflow-hidden rounded-3xl border-2 border-[#6D44CC]/20 bg-white p-6 transition-all hover:border-[#6D44CC]/40 hover:shadow-xl"
              >
                <div className="flex h-full flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div
                      className="p-2.5 rounded-xl bg-[#F5F3FF]"
                    >
                      <BookOpen className="h-5 w-5 text-[#6D44CC]" />
                    </div>
                    <span className="text-[10px] font-black text-[#6D44CC] uppercase tracking-widest bg-[#F5F3FF] px-2 py-1 rounded-md">
                      {t("estudos.today")}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-[#1A1A1A] truncate">
                      {ev.subjects?.title ?? "Matéria"}
                    </h3>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                        <Clock className="h-3.5 w-3.5 text-[#6D44CC]" />
                        {ev.duration_minutes} MIN
                      </div>
                      <Button
                        size="sm"
                        onClick={async () => {
                          setStartingEventId(ev.id);
                          try {
                            const session = await apiPost<{ id: string }>("/study/sessions", {
                              subject_id: ev.subject_id,
                              calendar_event_id: ev.id
                            });
                            router.push(`/protected/estudos/sessao?sessionId=${session.id}&subjectId=${ev.subject_id}`);
                          } catch (err) {
                            console.error(err);
                            setStartingEventId(null);
                          }
                        }}
                        disabled={startingEventId !== null}
                        className="bg-[#6D44CC] hover:bg-[#5B39A8] h-8 text-[10px] font-black rounded-xl"
                      >
                        {startingEventId === ev.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3 mr-1.5" />
                        )}
                        {t("estudos.start")}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* Grid de Sessões Recentes */}
      <motion.div variants={sectionVariants} className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <History className="h-5 w-5 text-slate-400" />
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{t("estudos.recentHistory")}</h3>
        </div>

        <motion.div
          variants={listVariants}
          className="grid grid-cols-1 gap-6 min-[890px]:grid-cols-2 min-[1365px]:grid-cols-3"
        >
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-32 rounded-3xl bg-slate-50 border border-slate-100 animate-pulse" />
            ))
          ) : sessions.length === 0 ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-dashed border-[#E6E0F8]">
              <div className="w-16 h-16 mb-4 rounded-full bg-[#F5F3FF] flex items-center justify-center">
                <Brain className="h-8 w-8 text-[#D1C9F0]" />
              </div>
              <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{t("estudos.noSessions")}</h3>
              <p className="text-sm font-medium text-slate-400 max-w-sm">
                {t("estudos.noSessionsDesc")}
              </p>
            </div>
          ) : (
            sessions.map((s) => (
              <motion.div key={s.id} variants={cardVariants} className="h-full">
                <Link
                  href={`/protected/estudos/detalhe?sessionId=${s.id}`}
                  className="group relative flex h-full overflow-hidden rounded-3xl border border-[#E6E0F8] bg-white p-6 transition-all hover:border-[#6D44CC]/30 hover:shadow-xl"
                >
                  <div
                    className="absolute bottom-0 left-0 top-0 w-1.5 opacity-80"
                    style={{ backgroundColor: s.subjects?.color_code ?? "#6D44CC" }}
                  />

                  <div className="flex w-full flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div
                        className="rounded-xl p-2.5"
                        style={{ backgroundColor: `${s.subjects?.color_code ?? "#6D44CC"}15` }}
                      >
                        <BookOpen className="h-5 w-5" style={{ color: s.subjects?.color_code ?? "#6D44CC" }} />
                      </div>
                      <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {formatDate(s.created_at)}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h3 className="truncate font-bold text-[#1A1A1A] transition-colors group-hover:text-[#6D44CC]">
                        {s.subjects?.title ?? "Matéria"}
                      </h3>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center gap-1.5 rounded-md bg-[#F5F3FF] px-2 py-1 text-xs font-bold text-slate-500">
                          <Clock className="h-3.5 w-3.5 text-[#6D44CC]" />
                          {s.duration_minutes ?? 0} MIN
                        </div>
                        <ChevronRight className="ml-auto h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))
          )}
        </motion.div>

        {hasMore && (
          <div className="flex justify-center mt-6">
            <Button
              variant="outline"
              onClick={() => loadData(page + 1)}
              disabled={loadingMore}
              className="rounded-xl border-[#E6E0F8] text-[#6D44CC] hover:bg-[#F5F3FF] font-bold h-12 px-8"
            >
              {loadingMore && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
              {loadingMore ? t("estudos.loading") : t("estudos.loadMore")}
            </Button>
          </div>
        )}
      </motion.div>

      {/* Modal: Iniciar Sessão */}
      <Modal
        open={newSessionOpen}
        onClose={() => setNewSessionOpen(false)}
        title={t("estudos.modalTitle")}
        className="max-w-md p-0 overflow-hidden"
      >
        <div className="p-8 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              {/* Eventos Planejados */}
              {weekEvents.length > 0 ? (
                <div className="space-y-2 mb-4">
                  <Label className="text-[10px] font-black uppercase text-[#6D44CC] tracking-widest">
                    {t("estudos.weekPlanning")}
                  </Label>
                  <div className="grid grid-cols-1 gap-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {weekEvents.map((ev) => {
                      const isSelected = selectedEventId === ev.id;
                      const dateObj = new Date(ev.scheduled_date + 'T12:00:00'); // Prevent timezone shift
                      const dateFormatted = dateObj.toLocaleDateString(lang, { weekday: 'short', day: '2-digit', month: '2-digit' }).toUpperCase();

                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => {
                            setSelectedEventId(ev.id);
                          }}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-2xl border-2 transition-all duration-200 text-left",
                            isSelected
                              ? "border-[#6D44CC] bg-[#F5F3FF] shadow-md shadow-[#6D44CC]/5"
                              : "border-[#E6E0F8] bg-white hover:border-[#D1C9F0]"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl flex flex-col items-center justify-center bg-[#F5F3FF] border border-[#E6E0F8]">
                              <span className="text-[8px] font-bold text-slate-500 uppercase">{dateFormatted.split(',')[0]}</span>
                              <span className="text-xs font-black text-[#6D44CC]">{dateFormatted.split(' ')[1]}</span>
                            </div>
                            <div>
                              <span className={cn(
                                "font-bold text-sm block",
                                isSelected ? "text-[#6D44CC]" : "text-slate-700"
                              )}>
                                {ev.subjects?.title}
                              </span>
                              <span className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-slate-400">
                                <Clock className="h-3 w-3" />
                                {ev.duration_minutes} min
                              </span>
                            </div>
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
              ) : (
                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Calendar className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-500">{t("estudos.noEventsWeek")}</p>
                  <p className="text-xs text-slate-400 mt-1">{t("estudos.createEventsFirst")}</p>
                </div>
              )}
            </div>

            <div className="bg-[#F5F3FF] rounded-2xl p-4 border border-[#E6E0F8]">
              <div className="flex gap-3">
                <div className="p-2 bg-white rounded-xl shadow-sm italic text-[#6D44CC] text-xs font-bold">{t("estudos.tip")}</div>
                <p className="text-xs text-[#6D44CC] font-medium leading-relaxed">
                  {t("estudos.tipDesc")}
                </p>
              </div>
            </div>
          </div>

          {error && <p className="text-xs font-bold text-red-500 animate-bounce">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setNewSessionOpen(false)} className="flex-1 h-12 rounded-xl font-bold text-slate-400">
              {t("estudos.later")}
            </Button>
            <Button
              onClick={handleStartSession}
              disabled={creating || !selectedEventId}
              className="flex-[2] h-12 bg-[#6D44CC] rounded-xl font-bold shadow-lg shadow-[#6D44CC]/20"
            >
              {creating ? <Loader2 className="h-5 w-5 animate-spin" /> : t("estudos.startNow")}
            </Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
}
