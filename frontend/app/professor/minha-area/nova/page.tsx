"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Globe, Lock, AlertCircle, Layout, Settings, RefreshCw, CreditCard } from "lucide-react";
import { apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/useTranslation";

interface TeacherArea {
  id: string;
  title: string;
  description: string | null;
  color_code: string;
  monthly_price: number;
  payment_model: 'recurring' | 'one_time';
  is_private: boolean;
  banner_url: string | null;
}

const COLORS = [
  { id: "indigo", value: "#4F46E5" },
  { id: "blue", value: "#3B82F6" },
  { id: "green", value: "#22C55E" },
  { id: "yellow", value: "#EAB308" },
  { id: "orange", value: "#F97316" },
  { id: "red", value: "#EF4444" },
  { id: "purple", value: "#A855F7" },
  { id: "pink", value: "#EC4899" },
  { id: "teal", value: "#14B8A6" },
  { id: "gray", value: "#6B7280" },
];

export default function NovaAreaPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    color: "indigo",
    monthly_price: 0,
    is_private: false,
    payment_model: "recurring" as "recurring" | "one_time",
  });
  
  const selectedColor = COLORS.find(c => c.id === formData.color)?.value || COLORS[0].value;

  async function handleCreate() {
    if (!formData.title.trim()) {
      setError(t("novaArea.errorTitleRequired"));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const area = await apiPost<TeacherArea>("/teachers/areas", {
        title: formData.title,
        description: formData.description,
        color_code: selectedColor,
        monthly_price: Number(formData.monthly_price),
        is_private: formData.is_private,
        payment_model: formData.monthly_price > 0 ? formData.payment_model : 'recurring',
      });
      // In a real app we might use toast.success(t("minhaAreaEdit.saved")) here if toast was available
      router.push(`/professor/minha-area/${area.id}`);
    } catch (error: any) {
      console.error(error);
      setError(error.message || t("novaArea.errorCreate"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 p-6 md:p-0">
      <Button
        variant="ghost"
        className="gap-2 text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/professor/minha-area")}
      >
        <ArrowLeft className="w-4 h-4" />
        {t("novaArea.back")}
      </Button>

      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t("novaArea.title")}
        </h1>
        <p className="text-muted-foreground">
          {t("novaArea.subtitle")}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layout className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">{t("novaArea.identity")}</h2>
          </div>
        </div>

        <div className="px-6 pt-6">
          <div 
            className="h-28 rounded-2xl relative flex items-center justify-center overflow-hidden transition-all duration-500 group"
            style={{ backgroundColor: selectedColor }}
          >
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
            <span className="relative z-10 text-white font-black text-xl drop-shadow-md text-center px-4 leading-tight">
              <h3 className="font-bold text-lg leading-tight line-clamp-2">
                {formData.title || t("novaArea.areaNamePlaceholder")}
              </h3>
            </span>
            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/20 backdrop-blur-sm text-[10px] font-medium text-white uppercase tracking-wider">
              {t("novaArea.preview")}
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <Field label={t("novaArea.nameLabel")} required>
            <Input
              placeholder={t("novaArea.nameInputPlaceholder")}
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="bg-muted/50 border-none h-11"
            />
          </Field>
          
          <Field label={t("novaArea.descLabel")}>
            <textarea
              placeholder={t("novaArea.descPlaceholder")}
              className="w-full h-32 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </Field>

          <Field label={t("novaArea.priceLabel")}>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-sm font-mono">R$</span>
              <input
                type="number"
                value={formData.monthly_price}
                onChange={(e) => setFormData(p => ({ ...p, monthly_price: Number(e.target.value) }))}
                className="w-full h-11 rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{t("novaArea.priceHint")}</p>
          </Field>

          {/* SELETOR DE MODELO DE PAGAMENTO */}
          {formData.monthly_price > 0 && (
            <Field label={t("novaArea.paymentModelLabel")}>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_model: "recurring" })}
                  className={cn(
                    "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all text-center",
                    formData.payment_model === "recurring"
                      ? "bg-indigo-50 border-indigo-600 text-indigo-600"
                      : "bg-muted/30 border-transparent hover:bg-muted/50"
                  )}
                >
                  <RefreshCw className="w-5 h-5" />
                  <span className="text-sm font-bold">{t("novaArea.recurring")}</span>
                  <span className="text-[10px] text-slate-400">{t("novaArea.recurringDesc")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, payment_model: "one_time" })}
                  className={cn(
                    "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all text-center",
                    formData.payment_model === "one_time"
                      ? "bg-indigo-50 border-indigo-600 text-indigo-600"
                      : "bg-muted/30 border-transparent hover:bg-muted/50"
                  )}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-sm font-bold">{t("novaArea.oneTime")}</span>
                  <span className="text-[10px] text-slate-400">{t("novaArea.oneTimeDesc")}</span>
                </button>
              </div>
            </Field>
          )}

          {/* SIMULAÇÃO DE GANHOS */}
          {formData.monthly_price > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-4 space-y-3 overflow-hidden"
            >
              <div className="flex items-center gap-2 text-emerald-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
                <span className="text-[10px] font-black uppercase tracking-[0.15em]">{t("novaArea.earningsSim")}</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">{formData.payment_model === 'one_time' ? t("novaArea.oneTimeValue") : t("novaArea.monthlyValue")}</span>
                  <span className="font-black text-slate-800">R$ {formData.monthly_price.toFixed(2)}</span>
                </div>
                <div className="h-px bg-slate-200" />
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">{t("novaArea.stripeFee")}</span>
                  <span className="font-bold text-red-500">
                    - R$ {(formData.monthly_price * 0.0399 + 0.39).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">{t("novaArea.platformFee")}</span>
                  <span className="font-bold text-red-500">
                    - R$ {(formData.monthly_price * 0.20).toFixed(2)}
                  </span>
                </div>
                <div className="h-px bg-emerald-200" />
                <div className="flex justify-between items-center pt-1">
                  <span className="font-black text-emerald-700 text-[11px] uppercase tracking-wider">{t("novaArea.netEarnings")}</span>
                  <span className="font-black text-emerald-700 text-base">
                    R$ {Math.max(0, formData.monthly_price - (formData.monthly_price * 0.0399 + 0.39) - (formData.monthly_price * 0.20)).toFixed(2)}
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          <div className="pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <Settings className="w-5 h-5 text-indigo-500" />
              </div>
              <h2 className="text-lg font-semibold">{t("novaArea.baseSettings")}</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-medium">{t("novaArea.colorLabel")}</label>
                <div className="flex flex-wrap gap-3">
                  {COLORS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, color: color.id })}
                      className={cn(
                        "w-10 h-10 rounded-full border-2 transition-all",
                        formData.color === color.id
                          ? "border-foreground scale-110 shadow-lg"
                          : "border-transparent hover:scale-105"
                      )}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">{t("novaArea.visibilityLabel")}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_private: true })}
                    className={cn(
                      "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                      formData.is_private
                        ? "bg-indigo-50 border-indigo-600 text-indigo-600"
                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                    )}
                  >
                    <Lock className="w-4 h-4" />
                    <span className="text-sm font-medium">{t("novaArea.private")}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_private: false })}
                    className={cn(
                      "p-3 rounded-xl border-2 flex flex-col items-center gap-2 transition-all",
                      !formData.is_private
                        ? "bg-indigo-50 border-indigo-600 text-indigo-600"
                        : "bg-muted/30 border-transparent hover:bg-muted/50"
                    )}
                  >
                    <Globe className="w-4 h-4" />
                    <span className="text-sm font-medium">{t("novaArea.public")}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-muted">
            <Button
              variant="ghost"
              type="button"
              onClick={() => router.push("/professor/minha-area")}
            >
              {t("novaArea.cancel")}
            </Button>
            <Button
              className="px-8 min-w-[140px] bg-indigo-600 hover:bg-indigo-700"
              disabled={loading}
              onClick={handleCreate}
              type="button"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t("novaArea.createButton")
              )}
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
