"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Loader2, Sparkles, Calendar, Clock, Target, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { apiGet, apiPost } from "@/lib/api";
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
  const [recommendationModalOpen, setRecommendationModalOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecommendedSubject | null>(null);
  const [recommendationDeadline, setRecommendationDeadline] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  const loadUserId = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setUserId(user.id);
  }, []);

  const loadData = useCallback(async () => {
    setLoadingRecs(true);
    setLoadingSubjects(true);
    
    try {
      const [recsData, subsData] = await Promise.all([
        apiGet<RecommendedSubject[]>("/subjects/recommendations"),
        apiGet<Subject[]>("/subjects")
      ]);
      setRecommendations(recsData);
      setMySubjects(subsData);
    } catch (e) {
      console.error("Erro ao carregar matérias", e);
    } finally {
      setLoadingRecs(false);
      setLoadingSubjects(false);
    }
  }, []);

  useEffect(() => { loadUserId(); }, [loadUserId]);
  useEffect(() => { if (userId) loadData(); }, [userId, loadData]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addSubject = async (payload: any, isManual: boolean) => {
    setAddingId(isManual ? "manual" : payload.title);
    setModalError(null);
    try {
      await apiPost("/subjects", payload);
      setManualModalOpen(false);
      setRecommendationModalOpen(false);
      if (userId) loadData();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setModalError(e.message || "Erro ao adicionar");
    } finally {
      setAddingId(null);
    }
  };

  const alreadyAdded = (title: string) => 
    mySubjects.some((s) => s.title.toLowerCase() === title.toLowerCase());

  return (
    <div className="space-y-10 pb-10 animate-in fade-in duration-700">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingRecs ? (
            Array(3).fill(0).map((_, i) => <div key={i} className="h-32 rounded-3xl bg-slate-100 animate-pulse" />)
          ) : recommendations.map((rec) => {
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loadingSubjects ? (
             Array(3).fill(0).map((_, i) => <div key={i} className="h-40 rounded-3xl bg-slate-100 animate-pulse" />)
          ) : mySubjects.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-[#E6E0F8]">
              <BookOpen className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Sua grade está vazia</p>
            </div>
          ) : mySubjects.map((s) => {
            const progress = Math.min(Math.round((s.completed_hours / s.target_hours) * 100), 100);
            return (
              <div key={s.id} className="bg-white rounded-3xl border border-[#E6E0F8] p-6 shadow-sm hover:shadow-md transition-shadow">
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
                  <div className="text-right">
                    <span className="text-xs font-black text-[#6D44CC]">{progress}%</span>
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
                    <span>{s.completed_hours}H Concluídas</span>
                    <span>Meta: {s.target_hours}H</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modal: Manual */}
      <Modal open={manualModalOpen} onClose={() => setManualModalOpen(false)} title="Nova Matéria" className="max-w-md">
        <form onSubmit={(e) => {
          e.preventDefault();
          addSubject({ title: manualTitle, target_hours: parseInt(manualHours), deadline: manualDeadline || undefined, is_custom: true }, true);
        }} className="space-y-5">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase text-slate-500">Nome da Disciplina</Label>
            <Input placeholder="Ex: Anatomia Humana" value={manualTitle} onChange={e => setManualTitle(e.target.value)} className="h-12 rounded-xl border-[#E6E0F8]" />
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
    </div>
  );
}