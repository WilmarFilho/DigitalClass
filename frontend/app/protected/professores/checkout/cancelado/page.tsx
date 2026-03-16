"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { XCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function CheckoutCanceladoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const areaId = searchParams.get("area_id");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 via-white to-slate-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md text-center"
      >
        {/* Cancel Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 12 }}
          className="mx-auto mb-8"
        >
          <div className="h-24 w-24 mx-auto rounded-full bg-red-100 flex items-center justify-center shadow-xl shadow-red-200/50">
            <XCircle className="h-12 w-12 text-red-500" />
          </div>
        </motion.div>

        {/* Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Pagamento Cancelado
          </h1>
          <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xs mx-auto">
            O pagamento não foi processado. Nenhuma cobrança foi realizada.
            Você pode tentar novamente quando quiser.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 flex flex-col gap-3"
        >
          <Button
            onClick={() => router.push("/protected/professores")}
            className="rounded-2xl bg-slate-900 hover:bg-black text-white px-8 py-3 font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Professores
          </Button>

          {areaId && (
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="rounded-2xl text-slate-500 hover:text-slate-800 font-bold text-xs uppercase tracking-widest"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
