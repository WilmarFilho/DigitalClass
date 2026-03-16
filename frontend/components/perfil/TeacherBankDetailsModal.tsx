import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, AlertCircle, Building, Wallet, Check, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface BankDetailsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    conta_bancaria: string;
    chave_pix: string;
    dia_repasse: number;
    preferencia_repasse: "pix" | "transferencia_bancaria";
  }) => void;
  isLoading?: boolean;
}

export function TeacherBankDetailsModal({ isOpen, onOpenChange, onSubmit, isLoading }: BankDetailsModalProps) {
  const [contaBancaria, setContaBancaria] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [diaRepasse, setDiaRepasse] = useState<number>(5);
  const [preferencia, setPreferencia] = useState<"pix" | "transferencia_bancaria">("pix");
  
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contaBancaria.trim()) {
      setError("Conta bancária é obrigatória.");
      return;
    }
    if (!chavePix.trim()) {
      setError("Chave PIX é obrigatória.");
      return;
    }
    setError(null);
    onSubmit({
      conta_bancaria: contaBancaria,
      chave_pix: chavePix,
      dia_repasse: diaRepasse,
      preferencia_repasse: preferencia
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-white border-slate-200 shadow-2xl rounded-3xl">
        <div className="bg-slate-900 px-6 py-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="h-16 w-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg border-4 border-emerald-400/20 mb-4 transform rotate-3">
              <Wallet className="h-8 w-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black text-white mb-2">Configure seus Repasses</DialogTitle>
            <DialogDescription className="text-slate-300 text-sm max-w-sm">
              Para atuarmos com transparência e segurança, precisamos dos seus dados bancários antes de habilitar a visão de Professor.
            </DialogDescription>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Conta Bancária (Agência + Conta)
              </label>
              <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                <div className="pl-3 text-slate-400">
                  <Building className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={contaBancaria}
                  onChange={(e) => setContaBancaria(e.target.value)}
                  placeholder="Ex: Ag 0001 Cc 1234567-8"
                  className="w-full bg-transparent px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Sua Chave PIX Principal
              </label>
              <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                <div className="pl-3 text-slate-400">
                  <Copy className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={chavePix}
                  onChange={(e) => setChavePix(e.target.value)}
                  placeholder="E-mail, CPF ou Celular"
                  className="w-full bg-transparent px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none"
                  autoComplete="off"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Dia do Repasse
                </label>
                <div className="relative">
                  <select
                    value={diaRepasse}
                    onChange={(e) => setDiaRepasse(Number(e.target.value))}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer"
                  >
                    <option value={5}>Dia 5</option>
                    <option value={10}>Dia 10</option>
                    <option value={15}>Dia 15</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Preferência
                </label>
                <div className="relative">
                  <select
                    value={preferencia}
                    onChange={(e) => setPreferencia(e.target.value as any)}
                    className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer"
                  >
                    <option value="pix">PIX</option>
                    <option value="transferencia_bancaria">Transf. Bancária</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-8 pt-4 border-t border-slate-100 grid grid-cols-2 sm:space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl h-12 font-bold text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-xl h-12 font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
            >
              {isLoading ? "Salvando..." : "Salvar e Continuar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
