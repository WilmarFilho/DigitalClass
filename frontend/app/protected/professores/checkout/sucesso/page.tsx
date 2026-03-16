"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function CheckoutSucessoPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const areaId = searchParams.get("area_id");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          if (areaId) {
            window.open(`/protected/professores/area/${areaId}`, '_self');
          } else {
            router.push("/protected/professores");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [areaId, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-indigo-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md text-center"
      >
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200, damping: 12 }}
          className="mx-auto mb-8"
        >
          <div className="h-24 w-24 mx-auto rounded-full bg-emerald-100 flex items-center justify-center shadow-xl shadow-emerald-200/50">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
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
            Assinatura Confirmada!
          </h1>
          <p className="text-slate-500 text-sm font-medium leading-relaxed max-w-xs mx-auto">
            Seu pagamento foi processado com sucesso. Agora você já tem acesso
            completo à área de membros.
          </p>
        </motion.div>

        {/* Countdown */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 space-y-4"
        >
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
            Redirecionando em {countdown}s...
          </p>

          <Button
            onClick={() => {
              if (areaId) {
                window.open(`/protected/professores/area/${areaId}`, '_self');
              } else {
                router.push("/protected/professores");
              }
            }}
            className="rounded-2xl bg-slate-900 hover:bg-black text-white px-8 py-3 font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200"
          >
            {countdown > 0 ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4 mr-2" />
            )}
            Acessar Área de Membros
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
