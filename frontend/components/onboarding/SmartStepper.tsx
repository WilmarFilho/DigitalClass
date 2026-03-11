"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, User, GraduationCap, Briefcase } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Role = "student" | "teacher" | null;

export function SmartStepper() {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>(null);
  const [goals, setGoals] = useState<string>("");
  const [hours, setHours] = useState<string>("2");

  const supabase = createClient();

  const handleNext = () => setStep((s) => Math.min(s + 1, 2));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));



  const handleSubmit = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    if (!token) {
      alert("Você precisa estar logado para salvar seu perfil.");
      return;
    }

    try {
      const basePath = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${basePath}/profiles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ 
          role, 
          learning_goals: goals ? [goals] : [], 
          hours_per_day: Number(hours) 
        })
      });

      if (res.ok) {
        alert("Perfil criado com sucesso!");
        // Redirecionaria para o dashboard
      } else {
        alert("Erro ao criar perfil. Verifique o console.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0,
    }),
  };

  return (
    <Card className="w-full relative overflow-hidden bg-white/50 dark:bg-neutral-900/50 backdrop-blur-xl border-white/20 dark:border-white/10 shadow-2xl rounded-3xl p-6 sm:p-10 min-h-[400px]">
      <AnimatePresence mode="wait" custom={1}>
        {step === 0 && (
          <motion.div
            key="step0"
            custom={1}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col h-full justify-between gap-8"
          >
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center">Como você quer usar a Digital Class?</h2>
                
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                <button
                  onClick={() => setRole("student")}
                  className={`relative p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 ${
                    role === "student" ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 h-[105%]" : "border-transparent bg-neutral-100 dark:bg-neutral-800"
                  }`}
                >
                  {role === "student" && (
                    <div className="absolute top-3 right-3 bg-indigo-500 rounded-full p-1 text-white">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <GraduationCap className={`w-12 h-12 ${role === "student" ? "text-indigo-500" : "text-neutral-500"}`} />
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">Sou Estudante</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Quero organizar meus estudos e usar IA para aprender mais rápido.</p>
                  </div>
                </button>

                <button
                  onClick={() => setRole("teacher")}
                  className={`relative p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 ${
                    role === "teacher" ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 h-[105%]" : "border-transparent bg-neutral-100 dark:bg-neutral-800"
                  }`}
                >
                  {role === "teacher" && (
                    <div className="absolute top-3 right-3 bg-indigo-500 rounded-full p-1 text-white">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <Briefcase className={`w-12 h-12 ${role === "teacher" ? "text-indigo-500" : "text-neutral-500"}`} />
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">Sou Professor</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Quero criar turmas, subir materiais e gerar flashcards para alunos.</p>
                  </div>
                </button>
              </div>
            </div>



            <div className="flex justify-end mt-auto">
              <Button onClick={handleNext} disabled={!role} className="rounded-xl px-8">
                Continuar
              </Button>
            </div>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            custom={1}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col h-full gap-8"
          >
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">
                {role === "student" ? "Quais são seus objetivos?" : "O que você ensina?"}
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goals">
                    {role === "student" ? "Ex: Passar em Medicina, Aprender Inglês..." : "Ex: Matemática para o ENEM, Programação Front-end..."}
                  </Label>
                  <Input 
                    id="goals" 
                    placeholder="Digite seus principais objetivos" 
                    value={goals}
                    onChange={(e) => setGoals(e.target.value)}
                    className="h-12 rounded-xl text-lg"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between mt-auto pt-8">
              <Button variant="ghost" onClick={handleBack} className="rounded-xl">Voltar</Button>
              <Button onClick={handleNext} disabled={!goals} className="rounded-xl px-8">
                Continuar
              </Button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            custom={1}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="flex flex-col h-full gap-8"
          >
            <div className="space-y-6">
              <h2 className="text-2xl font-bold">
                {role === "student" ? "Quanta dedicação por dia?" : "Como você produz conteúdo?"}
              </h2>
              
              {role === "student" ? (
                <div className="space-y-4">
                  <Label>Horas de estudo diárias pretendidas</Label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="1" max="12" 
                      value={hours} 
                      onChange={(e) => setHours(e.target.value)}
                      className="flex-1 accent-indigo-500 h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-2xl font-bold text-indigo-600 w-16 text-right">{hours}h</span>
                  </div>
                  <p className="text-sm text-neutral-500 mt-2">
                    A IA usará isso para montar seu calendário (Smart Scheduler).
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                   <p className="text-neutral-600 dark:text-neutral-400">
                    A IA ajudará a extrair Flashcards diretamente dos seus PDFs e vídeos.
                   </p>
                </div>
              )}
            </div>

            <div className="flex justify-between mt-auto pt-8">
              <Button variant="ghost" onClick={handleBack} className="rounded-xl">Voltar</Button>
              <Button onClick={handleSubmit} className="rounded-xl px-8 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30">
                Finalizar Cadastro
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
