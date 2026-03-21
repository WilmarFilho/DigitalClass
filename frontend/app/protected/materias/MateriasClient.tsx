"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Loader2, Sparkles, Calendar, Clock, Target, CheckCircle2, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

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

export function MateriasClient() {
  const [userId, setUserId] = useState<string | null>(null);
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

  const loadUserId = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  }, []);

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
          apiGet<any>(`/subjects?page=1&limit=6`)
        ]);
        setRecommendations(recsData);
        setMySubjects(subsResponse.data || []);
        setHasMore(subsResponse.meta?.page < subsResponse.meta?.last_page);
        setPage(1);
      } else {
        const subsResponse = await apiGet<any>(`/subjects?page=${pageNum}&limit=6`);
        setMySubjects(prev => [...prev, ...(subsResponse.data || [])]);
        setHasMore(subsResponse.meta?.page < subsResponse.meta?.last_page);
        setPage(pageNum);
      }
    } catch (e) {
      console.error("Erro ao carregar matérias", e);
    } finally {
      setLoadingRecs(false);
      setLoadingSubjects(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadUserId(); }, [loadUserId]);
  useEffect(() => { if (userId) loadData(1); }, [userId, loadData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addSubject = async (payload: any, isManual: boolean) => {
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
      if (userId) loadData(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setModalError(e.message || "Erro ao adicionar");
    } finally {
      setAddingId(null);
    }
  };

  const alreadyAdded = (title: string) =>
    mySubjects.some((s) => s.title.toLowerCase() === title.toLowerCase());

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
      if (userId) loadData(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setModalError(e.message || "Erro ao editar");
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
      if (userId) loadData(1);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setModalError(e.message || "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-700">

      {/* Loading de Tela Inicial */}
      {(loadingRecs && loadingSubjects) ? (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="h-12 w-12 text-[#6D44CC] animate-spin mb-4" />
          <h2 className="text-[#1A1A1A] font-black text-lg">Carregando Materias e Sugestões da IA</h2>
          <p className="text-slate-400 font-medium text-sm mt-1">Isso pode levar alguns segundos...</p>
        </div>
      ) : (
        <>
          {/* Header Central */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-8 rounded-3xl border border-[#E6E0F8] shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#F5F3FF] rounded-2xl border border-[#E6E0F8]">
                <BookOpen className="h-7 w-7 text-[#6D44CC]" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">Minhas Matérias</h1>
                <p className="text-sm font-medium text-slate-400">Personalize sua grade e acompanhe seu progresso</p>
              </div>
            </div>
            <Button
              onClick={() => { setManualModalOpen(true); setModalError(null); }}
              className="bg-[#6D44CC] hover:bg-[#5B39A8] text-white rounded-xl px-6 h-12 font-bold shadow-lg shadow-[#6D44CC]/20"
            >
              <Plus className="h-5 w-5 mr-2" /> NOVA MATÉRIA
            </Button>
          </div>

          {/* Seção de Sugestões IA */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Sugerido pela IA</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {recommendations.map((rec) => {
                const added = alreadyAdded(rec.title);
                return (
                  <div
                    key={rec.title}
                    className="group relative overflow-hidden rounded-3xl border border-[#E6E0F8] bg-white p-6 transition-all hover:shadow-xl hover:-translate-y-1"
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
                            <Clock className="h-3 w-3" /> {rec.suggested_hours}H ESTIMADAS
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
                        {added ? <><CheckCircle2 className="h-4 w-4 mr-2" /> JÁ ADICIONADA</> : "ADICIONAR À GRADE"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Seção Minhas Matérias */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <Target className="h-5 w-5 text-[#6D44CC]" />
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Em Andamento</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {mySubjects.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-[#E6E0F8]">
                  <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sua grade está vazia</p>
                </div>
              ) : mySubjects.map((s) => {
                const completedMinutes = s.completed_minutes || 0;
                const targetMinutes = Math.max(s.target_hours * 60, 1);
                const progress = Math.min(Math.round((completedMinutes / targetMinutes) * 100), 100);
                const completedHoursRounded = Math.floor(completedMinutes / 60);

                return (
                  <div key={s.id} className="group bg-white rounded-3xl border border-[#E6E0F8] p-6 shadow-sm hover:shadow-md transition-shadow relative">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: s.color_code || "#6D44CC" }}>
                          <span className="text-sm font-black">{s.title.charAt(0)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[#1A1A1A] truncate text-sm">{s.title}</p>
                          {s.deadline && (
                            <p className="text-[10px] font-bold text-red-400 flex items-center gap-1 uppercase">
                              <Calendar className="h-3 w-3" /> {new Date(s.deadline).toLocaleDateString("pt-BR")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#6D44CC]">{progress}%</span>
                        <div className="flex gap-1 opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditModal(s)}
                            className="p-1.5 rounded-lg bg-[#F5F3FF] text-slate-400 text-[#6D44CC] transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setDeleteSubject(s); setModalError(null); setDeleteModalOpen(true); }}
                            className="p-1.5 rounded-lg bg-red-50 text-slate-400 text-red-500 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="h-2 w-full bg-[#F5F3FF] rounded-full overflow-hidden">
                        <div
                          className="h-full transition-all duration-1000"
                          style={{ width: `${progress}%`, backgroundColor: s.color_code || "#6D44CC" }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        <span>{completedHoursRounded}H Concluídas</span>
                        <span>Meta: {s.target_hours}H</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {hasMore && (
              <div className="flex justify-center mt-6">
                <Button
                  variant="outline"
                  onClick={() => loadData(page + 1)}
                  disabled={loadingMore}
                  className="rounded-xl border-[#E6E0F8] text-[#6D44CC] hover:bg-[#F5F3FF] font-bold h-12 px-8"
                >
                  {loadingMore && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
                  {loadingMore ? "CARREGANDO..." : "CARREGAR MAIS MATÉRIAS"}
                </Button>
              </div>
            )}
          </section>

          {/* Modal: Manual */}
          <Modal open={manualModalOpen} onClose={() => setManualModalOpen(false)} title="Nova Matéria" className="max-w-md">
            <form onSubmit={(e) => {
              e.preventDefault();
              addSubject({ title: manualTitle, target_hours: parseInt(manualHours), deadline: manualDeadline || undefined, is_custom: true, color_code: manualColor }, true);
            }} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Nome da Disciplina</Label>
                <Input placeholder="Ex: Anatomia Humana" value={manualTitle} onChange={e => setManualTitle(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Cor para a Disciplina</Label>
                <Input type="color" value={manualColor} onChange={e => setManualColor(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Carga Horária (H)</Label>
                  <Input type="number" value={manualHours} onChange={e => setManualHours(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Prazo Final</Label>
                  <Input type="date" value={manualDeadline} onChange={e => setManualDeadline(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
                </div>
              </div>

              {modalError && <p className="text-xs font-bold text-red-500">{modalError}</p>}
              <Button type="submit" disabled={!!addingId} className="w-full bg-[#6D44CC] h-12 rounded-xl font-bold">
                {addingId ? <Loader2 className="animate-spin h-5 w-5" /> : "CRIAR MATÉRIA"}
              </Button>
            </form>
          </Modal>

          {/* Modal: Recomendação */}
          <Modal open={recommendationModalOpen} onClose={() => setRecommendationModalOpen(false)} title="Confirmar Sugestão" className="max-w-md">
            {selectedRecommendation && (
              <form onSubmit={(e) => {
                e.preventDefault();
                addSubject({
                  title: selectedRecommendation.title,
                  color_code: selectedRecommendation.color_code,
                  target_hours: selectedRecommendation.suggested_hours,
                  difficulty_level: selectedRecommendation.difficulty_level,
                  deadline: recommendationDeadline || undefined
                }, false);
              }} className="space-y-6">
                <div className="p-4 rounded-2xl bg-[#F5F3FF] border border-[#E6E0F8] flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-black" style={{ backgroundColor: selectedRecommendation.color_code }}>
                    {selectedRecommendation.title.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-[#1A1A1A]">{selectedRecommendation.title}</p>
                    <p className="text-[10px] font-black text-[#6D44CC] uppercase tracking-widest">{selectedRecommendation.suggested_hours} HORAS SUGERIDAS</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Você tem um prazo para concluir?</Label>
                  <Input type="date" value={recommendationDeadline} onChange={e => setRecommendationDeadline(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
                </div>
                {modalError && <p className="text-xs font-bold text-red-500">{modalError}</p>}
                <Button type="submit" disabled={!!addingId} className="w-full bg-[#6D44CC] h-12 rounded-xl font-bold">
                  {addingId ? <Loader2 className="animate-spin h-5 w-5" /> : "CONFIRMAR ADIÇÃO"}
                </Button>
              </form>
            )}
          </Modal>

          {/* Modal: Editar Matéria */}
          <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Editar Matéria" className="max-w-md">
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Nome da Disciplina</Label>
                <Input value={editTitle} onChange={e => setEditTitle(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-slate-500">Cor</Label>
                <Input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Carga Horária (H)</Label>
                  <Input type="number" value={editHours} onChange={e => setEditHours(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-slate-500">Prazo Final</Label>
                  <Input type="date" value={editDeadline} onChange={e => setEditDeadline(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
                </div>
              </div>
              {modalError && <p className="text-xs font-bold text-red-500">{modalError}</p>}
              <Button onClick={handleEditSubject} disabled={editSaving} className="w-full bg-[#6D44CC] h-12 rounded-xl font-bold">
                {editSaving ? <Loader2 className="animate-spin h-5 w-5" /> : "SALVAR ALTERAÇÕES"}
              </Button>
            </div>
          </Modal>

          {/* Modal: Confirmar Exclusão */}
          <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Excluir Matéria" className="max-w-sm">
            {deleteSubject && (
              <div className="space-y-6">
                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center text-white font-black" style={{ backgroundColor: deleteSubject.color_code || "#6D44CC" }}>
                    {deleteSubject.title.charAt(0)}
                  </div>
                  <div>
                    <p className="font-bold text-[#1A1A1A]">{deleteSubject.title}</p>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest">ESTA AÇÃO NÃO PODE SER DESFEITA</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">Tem certeza que deseja excluir esta matéria? Todo o progresso registrado será perdido.</p>
                {modalError && <p className="text-xs font-bold text-red-500">{modalError}</p>}
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setDeleteModalOpen(false)} className="flex-1 h-12 rounded-xl font-bold border-[#E6E0F8]">
                    CANCELAR
                  </Button>
                  <Button onClick={handleDeleteSubject} disabled={deleting} className="flex-1 h-12 rounded-xl font-bold bg-red-500 hover:bg-red-600">
                    {deleting ? <Loader2 className="animate-spin h-5 w-5" /> : "EXCLUIR"}
                  </Button>
                </div>
              </div>
            )}
          </Modal>
        </>
      )}
    </div>
  );
}