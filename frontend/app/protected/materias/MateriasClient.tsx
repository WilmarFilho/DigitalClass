"use client";

import { useState, useEffect, useCallback } from "react";
import { BookOpen, Plus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Modal } from "@/components/ui/modal";
import { apiGet, apiPost } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

const RECOMMENDATIONS_CACHE_KEY = "subjects_recommendations";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

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

function getCachedRecommendations(userId: string): RecommendedSubject[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RECOMMENDATIONS_CACHE_KEY);
    if (!raw) return null;
    const { data, userId: cachedUserId, timestamp } = JSON.parse(raw);
    if (cachedUserId !== userId || Date.now() - timestamp > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function setCachedRecommendations(userId: string, data: RecommendedSubject[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      RECOMMENDATIONS_CACHE_KEY,
      JSON.stringify({ data, userId, timestamp: Date.now() })
    );
  } catch {}
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

  const loadRecommendations = useCallback(async (uid: string) => {
    setLoadingRecs(true);
    const cached = getCachedRecommendations(uid);
    if (cached) {
      setRecommendations(cached);
      setLoadingRecs(false);
      return;
    }
    try {
      const data = await apiGet<RecommendedSubject[]>("/subjects/recommendations");
      setRecommendations(data);
      setCachedRecommendations(uid, data);
    } catch (e) {
      setRecommendations([]);
    } finally {
      setLoadingRecs(false);
    }
  }, []);

  const loadMySubjects = useCallback(async () => {
    setLoadingSubjects(true);
    try {
      const data = await apiGet<Subject[]>("/subjects");
      setMySubjects(data);
    } catch {
      setMySubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  }, []);

  useEffect(() => {
    loadUserId();
  }, [loadUserId]);

  useEffect(() => {
    if (!userId) return;
    loadRecommendations(userId);
  }, [userId, loadRecommendations]);

  useEffect(() => {
    loadMySubjects();
  }, [loadMySubjects]);

  const openRecommendationModal = (rec: RecommendedSubject) => {
    setSelectedRecommendation(rec);
    setRecommendationDeadline("");
    setModalError(null);
    setRecommendationModalOpen(true);
  };

  const addFromRecommendation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecommendation) return;
    setAddingId(selectedRecommendation.title);
    setModalError(null);
    try {
      await apiPost("/subjects", {
        title: selectedRecommendation.title,
        color_code: selectedRecommendation.color_code,
        target_hours: selectedRecommendation.suggested_hours,
        difficulty_level: selectedRecommendation.difficulty_level,
        is_custom: false,
        deadline: recommendationDeadline.trim() || undefined,
      });
      setRecommendationModalOpen(false);
      setSelectedRecommendation(null);
      await loadMySubjects();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Erro ao adicionar");
    } finally {
      setAddingId(null);
    }
  };

  const addManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = manualTitle.trim();
    const hours = parseInt(manualHours, 10);
    if (!title) {
      setModalError("Informe o nome da matéria");
      return;
    }
    if (isNaN(hours) || hours < 1 || hours > 500) {
      setModalError("Meta de horas deve ser entre 1 e 500");
      return;
    }
    setAddingId("manual");
    setModalError(null);
    try {
      await apiPost("/subjects", {
        title,
        target_hours: hours,
        deadline: manualDeadline.trim() || undefined,
        is_custom: true,
      });
      setManualTitle("");
      setManualHours("60");
      setManualDeadline("");
      setManualModalOpen(false);
      await loadMySubjects();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : "Erro ao adicionar");
    } finally {
      setAddingId(null);
    }
  };

  const alreadyAdded = (title: string) =>
    mySubjects.some((s) => s.title.toLowerCase() === title.toLowerCase());

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Minhas Matérias
        </h1>
        <p className="mt-1 text-slate-600">
          Sugestões personalizadas e suas matérias cadastradas
        </p>
      </div>

      {/* Sugestões IA */}
      <div className="rounded-xl border border-white/20 bg-white/70 backdrop-blur-md p-5 shadow-lg">
        <h3 className="font-semibold text-slate-900 flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Sugerido para você
        </h3>
        {loadingRecs ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : recommendations.length === 0 ? (
          <p className="text-slate-500 py-4">Nenhuma sugestão disponível. Complete seu onboarding.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((rec) => {
              const added = alreadyAdded(rec.title);
              return (
                <div
                  key={rec.title}
                  className="relative overflow-hidden rounded-xl border border-white/20 p-5 shadow-lg backdrop-blur-md transition-transform hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${rec.color_code}22 0%, ${rec.color_code}08 100%)`,
                    boxShadow: `0 8px 32px -8px ${rec.color_code}40`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className="h-12 w-12 rounded-xl shrink-0 shadow-inner"
                        style={{
                          backgroundColor: rec.color_code,
                          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2)`,
                        }}
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 truncate">{rec.title}</p>
                        <p className="text-sm text-slate-600">{rec.suggested_hours}h de estudo</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      disabled={added || addingId !== null}
                      onClick={() => openRecommendationModal(rec)}
                      className="shrink-0"
                    >
                      {added ? (
                        "Adicionada"
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Adicionar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Adicionar manualmente */}
      <div className="rounded-xl border border-white/20 bg-white/70 backdrop-blur-md p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Adicionar manualmente</h3>
          <Button
            size="sm"
            onClick={() => {
              setManualTitle("");
              setManualHours("60");
              setManualDeadline("");
              setModalError(null);
              setManualModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nova matéria
          </Button>
        </div>
      </div>

      {/* Modal: Nova matéria manual */}
      <Modal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        title="Nova matéria"
      >
        <form onSubmit={addManual} className="space-y-4">
          <div>
            <Label htmlFor="manual-title">Nome da matéria</Label>
            <Input
              id="manual-title"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="Ex: Cálculo I"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="manual-hours">Meta de horas</Label>
            <Input
              id="manual-hours"
              type="number"
              min={1}
              max={500}
              value={manualHours}
              onChange={(e) => setManualHours(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="manual-deadline">Prazo (opcional)</Label>
            <Input
              id="manual-deadline"
              type="date"
              value={manualDeadline}
              onChange={(e) => setManualDeadline(e.target.value)}
              className="mt-1"
            />
          </div>
          {modalError && (
            <p className="text-sm text-red-600">{modalError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setManualModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={addingId === "manual"}>
              {addingId === "manual" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Adicionar"
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal: Adicionar recomendação (apenas deadline) */}
      <Modal
        open={recommendationModalOpen}
        onClose={() => {
          setRecommendationModalOpen(false);
          setSelectedRecommendation(null);
        }}
        title={selectedRecommendation ? `Adicionar ${selectedRecommendation.title}` : "Adicionar matéria"}
      >
        {selectedRecommendation && (
          <form onSubmit={addFromRecommendation} className="space-y-4">
            <p className="text-sm text-slate-600">
              {selectedRecommendation.title} • {selectedRecommendation.suggested_hours}h de estudo
            </p>
            <div>
              <Label htmlFor="rec-deadline">Prazo (opcional)</Label>
              <Input
                id="rec-deadline"
                type="date"
                value={recommendationDeadline}
                onChange={(e) => setRecommendationDeadline(e.target.value)}
                className="mt-1"
              />
            </div>
            {modalError && (
              <p className="text-sm text-red-600">{modalError}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRecommendationModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={addingId !== null}>
                {addingId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Adicionar"
                )}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Minhas matérias */}
      <div className="rounded-xl border border-white/20 bg-white/70 backdrop-blur-md p-5 shadow-lg">
        <h3 className="font-semibold text-slate-900 mb-4">Minhas matérias</h3>
        {loadingSubjects ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          </div>
        ) : mySubjects.length === 0 ? (
          <p className="text-slate-500 py-4">
            Nenhuma matéria cadastrada. Adicione das sugestões ou manualmente.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mySubjects.map((s) => {
              const color = s.color_code || "#4F46E5";
              return (
                <div
                  key={s.id}
                  className="relative overflow-hidden rounded-xl border border-white/20 p-5 shadow-lg backdrop-blur-md transition-transform hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`,
                    boxShadow: `0 8px 32px -8px ${color}40`,
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="h-12 w-12 rounded-xl shrink-0"
                      style={{
                        backgroundColor: color,
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.2)`,
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{s.title}</p>
                      <p className="text-sm text-slate-600">
                        {s.completed_hours}h / {s.target_hours}h
                        {s.deadline && (
                          <span className="block text-xs text-slate-500 mt-0.5">
                            Prazo: {new Date(s.deadline).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
