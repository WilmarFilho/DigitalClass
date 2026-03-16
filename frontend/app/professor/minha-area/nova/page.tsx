"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, ArrowLeft, Palette, Globe, Lock, AlertCircle, X } from "lucide-react";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TeacherArea {
  id: string;
  title: string;
  description: string | null;
  color_code: string;
  monthly_price: number;
  is_private: boolean;
  banner_url: string | null;
}

export default function NovaAreaPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const [areaForm, setAreaForm] = useState({
    title: "",
    description: "",
    color_code: "#4F46E5",
    monthly_price: 0,
    is_private: false,
  });
  
  const [savingArea, setSavingArea] = useState(false);

  async function handleCreateArea() {
    if (!areaForm.title.trim()) {
      setError("O nome da área é obrigatório.");
      return;
    }
    setSavingArea(true);
    try {
      const created = await apiPost<TeacherArea>("/teachers/areas", {
        ...areaForm,
        monthly_price: Number(areaForm.monthly_price),
      });
      router.push(`/professor/minha-area/${created.id}`);
    } catch (e: any) {
      setError(e.message || "Erro ao criar área.");
    } finally {
      setSavingArea(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 p-6 md:p-0">
      <Button variant="ghost" className="mb-4 text-slate-500" onClick={() => router.push("/professor/minha-area")}>
        <ArrowLeft className="h-4 w-4 mr-2" /> Voltar para Áreas
      </Button>

      <header>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Criar Nova Área</h1>
        <p className="text-sm text-slate-500 mt-2">Configure os detalhes iniciais do seu novo espaço de ensino.</p>
      </header>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1 font-medium">{error}</span>
          <button onClick={() => setError(null)}><X className="h-5 w-5 hover:text-red-500" /></button>
        </motion.div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Palette className="h-4 w-4 text-indigo-500" /> Identidade da Área
          </h2>
        </div>

        <div className="px-6 pt-6">
          <div 
            className="h-28 rounded-2xl relative flex items-center justify-center overflow-hidden transition-all duration-500 group"
            style={{ backgroundColor: areaForm.color_code }}
          >
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
            <span className="relative z-10 text-white font-black text-xl drop-shadow-md text-center px-4 leading-tight">
              {areaForm.title || "Nome da sua Área"}
            </span>
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/20 backdrop-blur-md rounded text-[10px] text-white/80 font-bold uppercase tracking-widest">Preview</div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <Field label="Nome da Área" required>
            <input
              value={areaForm.title}
              onChange={(e) => setAreaForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Ex: Formação em React"
              className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
            />
          </Field>
          
          <Field label="Descrição" required={false}>
            <textarea
              value={areaForm.description}
              onChange={(e) => setAreaForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Uma breve descrição sobre o que os alunos vão aprender..."
              className="w-full h-24 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
            />
          </Field>

          <Field label="Preço da Mensalidade">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm font-mono">R$</span>
              <input
                type="number"
                value={areaForm.monthly_price}
                onChange={(e) => setAreaForm(p => ({ ...p, monthly_price: Number(e.target.value) }))}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">Deixe 0 para área gratuita.</p>
          </Field>

          <div className="grid grid-cols-2 gap-4">
             <Field label="Cor Identidade">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={areaForm.color_code}
                    onChange={(e) => setAreaForm(p => ({ ...p, color_code: e.target.value }))}
                    className="h-11 w-14 cursor-pointer rounded-xl border border-slate-200 p-1 bg-white"
                  />
                  <span className="text-xs font-mono text-slate-500 uppercase">{areaForm.color_code}</span>
                </div>
             </Field>
             <Field label="Visibilidade">
                <button
                  onClick={() => setAreaForm(p => ({ ...p, is_private: !p.is_private }))}
                  className={cn(
                    "h-11 w-full rounded-xl border flex items-center justify-center gap-2 text-xs font-bold transition-all uppercase tracking-tight",
                    areaForm.is_private ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-indigo-50 border-indigo-200 text-indigo-700"
                  )}
                >
                  {areaForm.is_private ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
                  {areaForm.is_private ? "Privada" : "Pública"}
                </button>
             </Field>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
             <Button variant="ghost" className="rounded-xl text-slate-500" onClick={() => router.push("/professor/minha-area")}>Cancelar</Button>
             <Button 
                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 px-8"
                disabled={!areaForm.title.trim() || savingArea}
                onClick={handleCreateArea}
             >
                {savingArea ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Criar Área
             </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Field({ label, required, children, className }: any) {
  return (
    <div className={cn("space-y-2", className)}>
      <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
