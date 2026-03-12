"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, GraduationCap, Briefcase, X, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Role = "student" | "teacher" | null;

const SUGGESTED_GOALS = [
  "Passar em Medicina",
  "Aprender Inglês",
  "ENEM",
  "Concurso Público",
  "Programação",
  "Vestibular",
];

const SUGGESTED_INTERESTS = [
  "Matemática",
  "Física",
  "Química",
  "Biologia",
  "História",
  "Geografia",
  "Literatura",
  "Programação",
  "Design",
  "Idiomas",
  "Ciências Humanas",
  "Ciências Exatas",
];

function TagInput({
  items,
  onAdd,
  onRemove,
  placeholder,
  suggestions,
}: {
  items: string[];
  onAdd: (s: string) => void;
  onRemove: (s: string) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");

  const handleAdd = (value: string) => {
    const v = value.trim();
    if (v && !items.includes(v)) {
      onAdd(v);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      handleAdd(input || (e as unknown as { target: { value: string } }).target?.value);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 min-h-12 p-2 rounded-xl border border-slate-200 bg-white focus-within:ring-2 focus-within:ring-slate-300 focus-within:border-slate-300 transition-all">
        {items.map((item) => (
          <motion.span
            key={item}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium"
          >
            {item}
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="p-0.5 rounded hover:bg-slate-200 transition-colors"
              aria-label={`Remover ${item}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => input && handleAdd(input)}
          placeholder={items.length === 0 ? placeholder : "Adicionar..."}
          autoComplete="off"
          className="flex-1 min-w-[120px] outline-none bg-transparent border-0 text-slate-800 placeholder:text-slate-400 py-1.5 focus:ring-0 focus:outline-none focus:border-0 shadow-none appearance-none [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
        />
      </div>
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions
            .filter((s) => !items.includes(s))
            .slice(0, 6)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleAdd(s)}
                className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

const HOURS_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

export function SmartStepper() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(0);
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>(null);
  const [learningGoals, setLearningGoals] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [hours, setHours] = useState<string>("2");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();
  const maxStep = role === "teacher" ? 2 : 3;

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "";
      if (name) setFullName((prev) => prev || name);
    });
  }, []);

  const handleNext = () => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, maxStep));
  };
  const handleBack = () => {
    setDirection(-1);
    const nextStep = Math.max(step - 1, 0);
    if (nextStep === 0) {
      setLearningGoals([]);
      setInterests([]);
    }
    setStep(nextStep);
  };

  const canProceed = () => {
    if (step === 0) return !!role && fullName.trim().length > 0;
    if (step === 1) return learningGoals.length > 0;
    if (step === 2) return interests.length > 0;
    return true;
  };

  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    console.log("[ONBOARDING] handleSubmit - session:", !!session, "token length:", token?.length ?? 0);
    if (token) {
      try {
        const parts = token.split(".");
        const payload = parts[1] ? JSON.parse(atob(parts[1])) : null;
        console.log("[ONBOARDING] JWT payload:", { sub: payload?.sub, exp: payload?.exp, alg: JSON.parse(atob(parts[0]))?.alg });
      } catch {
        console.log("[ONBOARDING] Could not decode JWT");
      }
    }

    if (!token) {
      setError("Você precisa estar logado para salvar seu perfil.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const basePath = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      console.log("[ONBOARDING] POST", `${basePath}/profiles`);
      const res = await fetch(`${basePath}/profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: fullName.trim() || undefined,
          role,
          learning_goals: learningGoals,
          interests: interests,
          hours_per_day: role === "student" ? Number(hours) : undefined,
        }),
      });

      if (res.ok) {
        router.push("/protected");
      } else {
        const data = await res.json().catch(() => ({}));
        console.log("[ONBOARDING] API error:", res.status, data);
        const msg = Array.isArray(data.message) ? data.message[0] : data.message;
        setError(msg || "Erro ao criar perfil. Tente novamente.");
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      setError(
        "Não foi possível conectar ao servidor. Verifique se o backend está rodando em " +
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001")
      );
    } finally {
      setLoading(false);
    }
  };

  const variants = {
    enter: (d: number) => ({
      x: d > 0 ? 80 : -80,
      opacity: 0,
      filter: "blur(4px)",
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
    },
    exit: (d: number) => ({
      x: d > 0 ? -80 : 80,
      opacity: 0,
      filter: "blur(4px)",
    }),
  };

  return (
    <Card className="w-full relative overflow-hidden bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl p-6 sm:p-10 min-h-[440px]">
      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: maxStep + 1 }, (_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= step ? "bg-slate-800" : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        {step === 0 && (
          <motion.div
            key="step0"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex flex-col h-full justify-between gap-8"
          >
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-slate-700">Qual é o seu nome?</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Digite seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                Como você quer usar a Digital Class?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(
                  [
                    {
                      id: "student" as const,
                      icon: GraduationCap,
                      title: "Sou Estudante",
                      desc: "Quero organizar meus estudos e usar IA para aprender mais rápido.",
                    },
                    {
                      id: "teacher" as const,
                      icon: Briefcase,
                      title: "Sou Professor",
                      desc: "Quero criar turmas, subir materiais e gerar flashcards para alunos.",
                    },
                  ] as const
                ).map(({ id, icon: Icon, title, desc }) => (
                  <motion.button
                    key={id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setRole(id)}
                    className={`relative p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-4 text-left ${
                      role === id
                        ? "border-slate-800 bg-slate-50 shadow-md"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    {role === id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 bg-slate-800 rounded-full p-1 text-white"
                      >
                        <Check className="w-4 h-4" />
                      </motion.div>
                    )}
                    <Icon
                      className={`w-12 h-12 ${
                        role === id ? "text-slate-800" : "text-slate-400"
                      }`}
                    />
                    <div className="text-center">
                      <h3 className="font-semibold text-lg text-slate-900">{title}</h3>
                      <p className="text-sm text-slate-500 mt-1">{desc}</p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="rounded-xl px-8 bg-slate-900 hover:bg-slate-800 text-white"
              >
                Continuar
              </Button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex flex-col h-full gap-8"
          >
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">
                {role === "student" ? "Quais são seus objetivos?" : "O que você ensina?"}
              </h2>
              <div className="space-y-2">
                <Label className="text-slate-700">
                  {role === "student"
                    ? "Adicione seus principais objetivos (ex: passar em Medicina, ENEM...)"
                    : "Adicione as áreas ou disciplinas que você ensina"}
                </Label>
                <TagInput
                  items={learningGoals}
                  onAdd={(s) => setLearningGoals((g) => [...g, s])}
                  onRemove={(s) => setLearningGoals((g) => g.filter((x) => x !== s))}
                  placeholder="Digite e pressione Enter para adicionar"
                  suggestions={SUGGESTED_GOALS}
                />
              </div>
            </div>
            <div className="flex justify-between mt-auto pt-6">
              <Button variant="ghost" onClick={handleBack} className="rounded-xl text-slate-600">
                Voltar
              </Button>
              <Button
                onClick={handleNext}
                disabled={learningGoals.length === 0}
                className="rounded-xl px-8 bg-slate-900 hover:bg-slate-800 text-white"
              >
                Continuar
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex flex-col h-full gap-8"
          >
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Quais áreas te interessam?
              </h2>
              <p className="text-slate-600">
                Isso ajuda a IA a recomendar matérias e conteúdo personalizado.
              </p>
              <div className="space-y-2">
                <Label className="text-slate-700">Interesses e áreas de estudo</Label>
                <TagInput
                  items={interests}
                  onAdd={(s) => setInterests((i) => [...i, s])}
                  onRemove={(s) => setInterests((i) => i.filter((x) => x !== s))}
                  placeholder="Digite ou escolha abaixo"
                  suggestions={SUGGESTED_INTERESTS}
                />
              </div>
            </div>

            {role === "teacher" && error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
              >
                {error}
              </motion.div>
            )}

            <div className="flex justify-between mt-auto pt-6">
              <Button variant="ghost" onClick={handleBack} className="rounded-xl text-slate-600">
                Voltar
              </Button>
              {role === "teacher" ? (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || interests.length === 0}
                  className="rounded-xl px-8 bg-slate-900 hover:bg-slate-800 text-white shadow-lg disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Finalizar Cadastro"
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={interests.length === 0}
                  className="rounded-xl px-8 bg-slate-900 hover:bg-slate-800 text-white"
                >
                  Continuar
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {step === 3 && role === "student" && (
          <motion.div
            key="step3"
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="flex flex-col h-full gap-8"
          >
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-900">
                Quanta dedicação por dia?
              </h2>
              <p className="text-slate-600">
                A IA usará isso para montar seu calendário inteligente.
              </p>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {HOURS_PRESETS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHours(String(h))}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        hours === String(h)
                          ? "bg-slate-800 text-white shadow-md"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <input
                    type="range"
                    min="1"
                    max="12"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="flex-1 h-3 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-800 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-800 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
                  />
                  <span className="text-2xl font-bold text-slate-900 w-14 text-right tabular-nums">
                    {hours}h
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm"
              >
                {error}
              </motion.div>
            )}

            <div className="flex justify-between mt-auto pt-6">
              <Button variant="ghost" onClick={handleBack} className="rounded-xl text-slate-600">
                Voltar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="rounded-xl px-8 bg-slate-900 hover:bg-slate-800 text-white shadow-lg disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Finalizar Cadastro"
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
