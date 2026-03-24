"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MonitorPlay,
  Loader2,
  Plus,
  Globe,
  Lock,
  AlertCircle,
  X,
  LayoutDashboard,
  Settings,
  BookOpen
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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

export default function MinhaAreaPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [areas, setAreas] = useState<TeacherArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => { load(1); }, []);

  async function load(pageNum = 1) {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const { data, meta } = await apiGet<any>(`/teachers/my-areas?page=${pageNum}&limit=9`);
      if (pageNum === 1) setAreas(data || []);
      else setAreas(prev => [...prev, ...(data || [])]);
      setHasMore(meta?.page < meta?.last_page);
      setPage(pageNum);
    } catch (e: any) {
      setError(t("minhaArea.errorLoad"));
    } finally {
      if (pageNum === 1) setLoading(false);
      else setLoadingMore(false);
    }
  }

  if (loading) return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20 p-6 md:p-0">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t("minhaArea.title")}</h1>
            <p className="text-sm text-slate-500">{t("minhaArea.subtitle")}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => router.push("/professor/minha-area/nova")} 
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100"
          >
            <Plus className="h-4 w-4 mr-2" /> {t("minhaArea.create")}
          </Button>
        </div>
      </header>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span className="flex-1 font-medium">{error}</span>
          <button onClick={() => setError(null)}><X className="h-5 w-5 hover:text-red-500" /></button>
        </motion.div>
      )}

      {areas.length === 0 ? (
         <div className="rounded-3xl border border-dashed border-slate-200 bg-white/50 p-20 text-center">
            <div className="bg-white h-20 w-20 rounded-3xl shadow-xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
               <MonitorPlay className="h-10 w-10 text-slate-200" />
            </div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{t("minhaArea.noAreas")}</h3>
            <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-widest mb-6">{t("minhaArea.noAreasDesc")}</p>
            <Button onClick={() => router.push("/professor/minha-area/nova")} className="rounded-xl bg-indigo-600 hover:bg-indigo-700">
               <Plus className="h-4 w-4 mr-2" /> {t("minhaArea.createAreaNow")}
            </Button>
         </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <AreaCard key={area.id} area={area} onClick={() => router.push(`/professor/minha-area/${area.id}`)} />
            ))}
          </div>

          {hasMore && (
            <div className="flex justify-center mt-6">
              <Button
                  variant="outline"
                  onClick={() => load(page + 1)}
                  disabled={loadingMore}
                  className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 font-bold h-12 px-8"
              >
                {loadingMore && <Loader2 className="animate-spin h-5 w-5 mr-2" />}
                {loadingMore ? t("minhaArea.loadingMore") : t("minhaArea.loadMoreAreas")}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AreaCard({ area, onClick }: { area: TeacherArea, onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <div 
      onClick={onClick}
      className="group relative cursor-pointer rounded-[28px] border border-slate-200 bg-white p-2 shadow-sm transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-1 overflow-hidden"
    >
      <div
        className="h-32 rounded-[22px] relative overflow-hidden transition-transform duration-700 group-hover:scale-[1.02]"
        style={{
          background: area.banner_url
            ? `url(${area.banner_url}) center/cover`
            : `linear-gradient(135deg, ${area.color_code}, ${area.color_code}88)`,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm">
           {area.is_private ? (
               <><Lock className="h-3 w-3 text-amber-500" /><span className="text-amber-600">{t("minhaArea.private")}</span></>
           ) : (
               <><Globe className="h-3 w-3 text-indigo-500" /><span className="text-indigo-600">{t("minhaArea.public")}</span></>
           )}
        </div>
      </div>

      <div className="px-4 pb-4 pt-4 flex flex-col flex-1">
        <h3 className="font-black text-slate-900 text-sm leading-tight tracking-tight group-hover:text-indigo-600 transition-colors">
          {area.title}
        </h3>
        {area.description && (
          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed font-medium">
            {area.description}
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
           <span className="text-xs font-black tracking-tighter text-slate-700">
             {area.monthly_price === 0
               ? t("minhaArea.free")
               : area.payment_model === 'one_time'
                 ? t("minhaArea.oneTimePrice", { price: area.monthly_price.toFixed(2) })
                 : t("minhaArea.pricePerMonth", { price: area.monthly_price.toFixed(2) })}
           </span>
           <div className="flex items-center gap-1.5 text-slate-400 group-hover:text-indigo-500 transition-colors">
              <span className="text-[10px] font-bold uppercase tracking-widest">{t("minhaArea.edit")}</span>
              <Settings className="h-3.5 w-3.5" />
           </div>
        </div>
      </div>
    </div>
  );
}