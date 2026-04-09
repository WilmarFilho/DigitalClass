"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { BookOpen, Plus, Loader2, Sparkles, Calendar, Clock, Target, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { useTranslation } from "@/hooks/useTranslation";
import {
  buildManualSubjectPayload,
  buildRecommendationSubjectPayload,
  calculateSubjectProgress,
  formatSubjectDeadline,
  hasMoreSubjects,
  hasSubjectAlreadyAdded,
} from "./materias.utils";

interface RecommendedSubject {
  title: string;
  suggested_hours: number;
  color_code: string;
  difficulty_level: number;
}

interface Subject {
  id: string;
  title: string;
  color_code: string;
  target_hours: number;
  completed_hours: number;
  completed_minutes?: number;
  deadline: string | null;
  difficulty_level: number | null;
  is_custom: boolean;
  created_at: string;
}

interface SubjectsResponse {
  data: Subject[];
  meta?: {
    page?: number;
    last_page?: number;
  };
}

type SubjectPayload = {
  title: string;
  target_hours: number;
  deadline?: string;
  is_custom?: boolean;
  color_code?: string;
  difficulty_level?: number;
};

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

const gridVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function MateriasClient() {
  const { t } = useTranslation();
  const [recommendations, setRecommendations] = useState<RecommendedSubject[]>([]);
  const [mySubjects, setMySubjects] = useState<Subject[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [manualHours, setManualHours] = useState("60");
  const [manualDeadline, setManualDeadline] = useState("");
  const [manualColor, setManualColor] = useState("#44baccff");
  const [recommendationModalOpen, setRecommendationModalOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendedSubject | null>(null);
  const [recommendationDeadline, setRecommendationDeadline] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Edit state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubject, setEditSubject] = useState<Subject | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editDeadline, setEditDeadline] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteSubject, setDeleteSubject] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async (pageNum = 1) => {
    if (pageNum === 1) {
      setLoadingRecs(true);
      setLoadingSubjects(true);
    } else {
      setLoadingMore(true);
    }

    try {
      if (pageNum === 1) {
        const [recsData, subsResponse] = await Promise.all([
          apiGet<RecommendedSubject[]>("/subjects/recommendations"),
          apiGet<SubjectsResponse>(`/subjects?page=1&limit=6`)
        ]);
        setRecommendations(recsData);
        setMySubjects(subsResponse.data || []);
        setHasMore(hasMoreSubjects(subsResponse.meta));
        setPage(1);
      } else {
        const subsResponse = await apiGet<SubjectsResponse>(`/subjects?page=${pageNum}&limit=6`);
        setMySubjects(prev => [...prev, ...(subsResponse.data || [])]);
        setHasMore(hasMoreSubjects(subsResponse.meta));
        setPage(pageNum);
      }
    } catch (e) {
      console.error("Error loading subjects data:", e);
    } finally {
      setLoadingRecs(false);
      setLoadingSubjects(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const supabase = createClient();
        await supabase.auth.getUser();
      } catch (error) {
        console.error("Failed to resolve current user on materias screen:", error);
      } finally {
        if (active) {
          loadData(1);
        }
      }
    }

    bootstrap();

    return () => {
      active = false;
    };
  }, [loadData]);

  const addSubject = async (payload: SubjectPayload, isManual: boolean) => {
    setAddingId(isManual ? "manual" : payload.title);
    setModalError(null);
    try {
      await apiPost("/subjects", payload);
      setManualModalOpen(false);
      setRecommendationModalOpen(false);
      setManualTitle("");
      setManualHours("60");
      setManualDeadline("");
      setManualColor("#44baccff");
      await loadData(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setModalError(e.message || t("materias.addError"));
    } finally {
      setAddingId(null);
    }
  };

  const alreadyAdded = (title: string) => hasSubjectAlreadyAdded(mySubjects, title);

  const openEditModal = (s: Subject) => {
    setEditSubject(s);
    setEditTitle(s.title);
    setEditColor(s.color_code || "#6D44CC");
    setEditHours(String(s.target_hours));
    setEditDeadline(s.deadline ? s.deadline.slice(0, 10) : "");
    setModalError(null);
    setEditModalOpen(true);
  };

  const handleEditSubject = async () => {
    if (!editSubject) return;
    setEditSaving(true);
    setModalError(null);
    try {
      await apiPut(`/subjects/${editSubject.id}`, {
        title: editTitle,
        color_code: editColor,
        target_hours: parseInt(editHours),
        deadline: editDeadline || undefined,
      });
      setEditModalOpen(false);
      await loadData(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setModalError(e.message || t("materias.editError"));
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteSubject = async () => {
    if (!deleteSubject) return;
    setDeleting(true);
    setModalError(null);
    try {
      await apiDelete(`/subjects/${deleteSubject.id}`);
      setDeleteModalOpen(false);
      await loadData(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setModalError(e.message || t("materias.deleteError"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <motion.div
      className="space-y-10 pb-10"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >

      {/* Loading de Tela Inicial */}
      {(loadingRecs && loadingSubjects) ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-[#6D44CC] animate-spin mb-4" />
          <h2 className="text-[#1A1A1A] font-black text-lg">{t("materias.loadingAI")}</h2>
          <p className="text-slate-400 font-medium text-sm mt-1">{t("materias.waitSeconds")}</p>
        </div>
      ) : (
        <>
          {/* Header Central */}
          <motion.div
            variants={sectionVariants}
            className="flex flex-col justify-between gap-4 rounded-3xl border border-[#E6E0F8] bg-white p-6 shadow-sm md:items-center lg:flex-row lg:p-8"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#F5F3FF] rounded-2xl border border-[#E6E0F8]">
                <BookOpen className="h-7 w-7 text-[#6D44CC]" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">{t("materias.title")}</h1>
                <p className="text-sm font-medium text-slate-400">{t("materias.subtitle")}</p>
              </div>
            </div>
            <Button
              onClick={() => { setManualModalOpen(true); setModalError(null); }}
              className="bg-[#6D44CC] hover:bg-[#5B39A8] text-white rounded-xl px-6 h-12 font-bold shadow-lg shadow-[#6D44CC]/20"
            >
              <Plus className="h-5 w-5 mr-2" /> {t("materias.add")}
            </Button>
          </motion.div>

          {/* Seção de Sugestões IA */}
          <motion.section variants={sectionVariants} className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{t("materias.suggestedAI")}</h3>
            </div>

            <motion.div variants={gridVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {recommendations.map((rec) => {
                const added = alreadyAdded(rec.title);
                return (
                  <motion.div
                    key={rec.title}
                    variants={cardVariants}
                    className="group relative overflow-hidden rounded-3xl border border-[#E6E0F8] bg-white p-6 transition-shadow hover:shadow-xl"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <Sparkles className="h-12 w-12 text-[#6D44CC]" />
                    </div>

                    <div className="flex flex-col h-full justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-inner" style={{ backgroundColor: rec.color_code }}>
                          <BookOpen className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#1A1A1A] truncate">{rec.title}</p>
                          <p className="text-xs font-bold text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {t("materias.estimatedHours", { hours: rec.suggested_hours })}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant={added ? "secondary" : "outline"}
                        className={cn(
                          "w-full rounded-xl font-bold text-xs h-10 transition-all",
                          added ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "border-[#E6E0F8] text-[#6D44CC] hover:bg-[#F5F3FF]"
                        )}
                        disabled={added || !!addingId}
                        onClick={() => { setSelectedRecommendation(rec); setRecommendationModalOpen(true); }}
                      >
                        {added ? <><CheckCircle2 className="h-4 w-4 mr-2" /> {t("materias.alreadyAdded")}</> : t("materias.addToGrid")}
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.section>

          {/* Seção Minhas Matérias */}
          <motion.section variants={sectionVariants} className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Target className="h-5 w-5 text-[#6D44CC]" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">{t("materias.inProgress")}</h3>
            </div>

            <motion.div variants={gridVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {mySubjects.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-[#E6E0F8]">
                  <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t("materias.noSubjects")}</p>
                </div>
              ) : mySubjects.map((s) => {
                const { completedMinutes, progress, completedHoursRounded, targetMinutes } = calculateSubjectProgress(s);

                return (
                  <motion.div
                    key={s.id}
                    variants={cardVariants}
                    className="group relative rounded-3xl border border-[#E6E0F8] bg-white p-5 shadow-sm transition-shadow hover:shadow-md min-[1200px]:p-6"
                  >
                    <div
                      className="absolute inset-x-5 top-0 h-1 rounded-b-full min-[1200px]:inset-x-6"
                      style={{ backgroundColor: s.color_code || "#6D44CC" }}
                    />

                    <div className="mb-5 flex flex-col gap-4">
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm" style={{ backgroundColor: s.color_code || "#6D44CC" }}>
                          <span className="text-sm font-black">{s.title.charAt(0)}</span>
                        </div>
                        <div className="min-w-0 space-y-2">
                          <p className="truncate pr-2 text-base font-black leading-tight text-[#1A1A1A]">{s.title}</p>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em]">
                            <span
                              className="rounded-full px-2.5 py-1 text-white"
                              style={{ backgroundColor: s.color_code || "#6D44CC" }}
                            >
                              {progress}% completo
                            </span>
                            <span className="rounded-full bg-[#F5F3FF] px-2.5 py-1 text-[#6D44CC]">
                              {t("materias.hoursCompleted", { hours: completedHoursRounded })}
                            </span>
                          </div>
                          {s.deadline && (
                            <p className="flex items-center gap-1 text-[11px] font-bold text-red-400">
                              <Calendar className="h-3 w-3" /> {formatSubjectDeadline(s.deadline, t("language"))}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 rounded-2xl border border-[#E6E0F8] bg-[#FBFAFF] px-3 py-2 text-right">
                          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Meta</p>
                          <p className="text-sm font-black text-[#6D44CC]">{s.target_hours}h</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-[#F3EFFC] bg-[#FCFBFF] p-4">
                      <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {completedMinutes} min
                        </span>
                        <span>{targetMinutes} min</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#F0EBFF]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full"
                          style={{ width: `${progress}%`, backgroundColor: s.color_code || "#6D44CC" }}
                        />
                      </div>
                      <div className="flex flex-col gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 min-[1200px]:flex-row min-[1200px]:items-center min-[1200px]:justify-between">
                        <span>{t("materias.hoursCompleted", { hours: completedHoursRounded })}</span>
                        <span>{t("materias.goal", { hours: s.target_hours })}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2 border-t border-[#F3EFFC] pt-4">
                      <button
                        onClick={() => openEditModal(s)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5F3FF] px-4 py-2.5 text-sm font-bold text-[#6D44CC] transition-colors hover:bg-[#EEE9FF]"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => { setDeleteSubject(s); setModalError(null); setDeleteModalOpen(true); }}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-500 transition-colors hover:bg-red-100"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </button>
                    </div>
                  </motion.div>
                );
              })}
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
                  {loadingMore ? t("materias.loading") : t("materias.loadMore")}
                </Button>
              </div>
            )}
          </motion.section>

          {/* Modal: Manual */}
          <Modal open={manualModalOpen} onClose={() => setManualModalOpen(false)} title={t("materias.newSubject")} className="max-w-md">
            <form onSubmit={(e) => {
              e.preventDefault();
              addSubject(buildManualSubjectPayload({
                title: manualTitle,
                targetHours: manualHours,
                deadline: manualDeadline,
                color: manualColor,
              }), true);
            }} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">{t("materias.subjectName")}</Label>
                <Input placeholder={t("materias.subjectPlaceholder")} value={manualTitle} onChange={e => setManualTitle(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">{t("materias.subjectColor")}</Label>
                <Input type="color" value={manualColor} onChange={e => setManualColor(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">{t("materias.workload")}</Label>
                  <Input type="number" value={manualHours} onChange={e => setManualHours(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">{t("materias.deadline")}</Label>
                  <Input type="date" value={manualDeadline} onChange={e => setManualDeadline(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
                </div>
              </div>

              {modalError && <p className="text-xs font-bold text-red-500">{modalError}</p>}
              <Button type="submit" disabled={!!addingId} className="w-full bg-[#6D44CC] h-12 rounded-xl font-bold">
                {addingId ? <Loader2 className="animate-spin h-5 w-5" /> : t("materias.createSubject")}
              </Button>
            </form>
          </Modal>

          {/* Modal: Recomendação */}
          <Modal open={recommendationModalOpen} onClose={() => setRecommendationModalOpen(false)} title={t("materias.confirmSuggestion")} className="max-w-md">
            {selectedRecommendation && (
              <form onSubmit={(e) => {
                e.preventDefault();
                addSubject(
                  buildRecommendationSubjectPayload(
                    selectedRecommendation,
                    recommendationDeadline,
                  ),
                  false,
                );
              }} className="space-y-6">
                <div className="p-4 rounded-2xl bg-[#F5F3FF] border border-[#E6E0F8] flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-black" style={{ backgroundColor: selectedRecommendation.color_code }}>
                    {selectedRecommendation.title.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-[#1A1A1A]">{selectedRecommendation.title}</p>
                    <p className="text-[10px] font-black text-[#6D44CC] uppercase tracking-widest">{t("materias.suggestedHours", { hours: selectedRecommendation.suggested_hours })}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">{t("materias.haveDeadline")}</Label>
                  <Input type="date" value={recommendationDeadline} onChange={e => setRecommendationDeadline(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
                </div>
                {modalError && <p className="text-xs font-bold text-red-500">{modalError}</p>}
                <Button type="submit" disabled={!!addingId} className="w-full bg-[#6D44CC] h-12 rounded-xl font-bold">
                  {addingId ? <Loader2 className="animate-spin h-5 w-5" /> : t("materias.confirmAddition")}
                </Button>
              </form>
            )}
          </Modal>

          {/* Modal: Editar Matéria */}
          <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title={t("materias.editSubject")} className="max-w-md">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">{t("materias.subjectName")}</Label>
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">{t("materias.color")}</Label>
                <Input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">{t("materias.workload")}</Label>
                  <Input type="number" value={editHours} onChange={e => setEditHours(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">{t("materias.deadline")}</Label>
                  <Input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
                </div>
              </div>
              {modalError && <p className="text-xs font-bold text-red-500">{modalError}</p>}
              <Button onClick={handleEditSubject} disabled={editSaving} className="w-full bg-[#6D44CC] h-12 rounded-xl font-bold">
                {editSaving ? <Loader2 className="animate-spin h-5 w-5" /> : t("materias.saveChanges")}
              </Button>
            </div>
          </Modal>

          {/* Modal: Confirmar Exclusão */}
          <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title={t("materias.deleteSubject")} className="max-w-sm">
            {deleteSubject && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-black" style={{ backgroundColor: deleteSubject.color_code || "#6D44CC" }}>
                    {deleteSubject.title.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-[#1A1A1A]">{deleteSubject.title}</p>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">{t("materias.cannotUndo")}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">{t("materias.deleteConfirm")}</p>
                {modalError && <p className="text-xs font-bold text-red-500">{modalError}</p>}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setDeleteModalOpen(false)} className="flex-1 h-12 rounded-xl font-bold border-[#E6E0F8]">
                    {t("materias.cancel")}
                  </Button>
                  <Button onClick={handleDeleteSubject} disabled={deleting} className="flex-1 h-12 rounded-xl font-bold bg-red-500 hover:bg-red-600">
                    {deleting ? <Loader2 className="animate-spin h-5 w-5" /> : t("materias.delete")}
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}
    </motion.div>
  );
}
