"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileQuestion, ClipboardList, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api";

interface Flashcard {
  id: string;
  question: string;
  subject: string;
}

interface Quiz {
  id: string;
  title: string;
  subject: string;
}

interface AssetsResponse {
  flashcards: Flashcard[];
  quizzes: Quiz[];
}

export function LastAssets() {
  const [data, setData] = useState<AssetsResponse>({ flashcards: [], quizzes: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<AssetsResponse>("/dashboard/last-assets")
      .then((res) => setData(res))
      .catch((err) => console.error("Error fetching last assets:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl border border-[#E6E0F8] bg-white p-6 shadow-sm">
      <h3 className="text-lg font-bold text-[#1A1A1A] mb-6">Últimos Ativos</h3>
      
      <div className="space-y-8">
        {/* Flashcards */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-[#F5F3FF] rounded-lg">
              <FileQuestion className="h-4 w-4 text-[#6D44CC]" />
            </div>
            <span className="font-bold text-sm text-[#4A4A4A]">Flashcards</span>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
          ) : data.flashcards.length > 0 ? (
            <ul className="space-y-3 mb-4">
              {data.flashcards.map((fc) => (
                <li key={fc.id} className="text-sm pb-2 border-b border-slate-50 last:border-0">
                  <p className="font-medium text-slate-700 truncate">{fc.question}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{fc.subject}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic mb-3">Nenhum flashcard ainda</p>
          )}

          <Link href="/protected/estudos" className="text-xs font-bold text-[#6D44CC] hover:text-[#F38B4B] transition-colors inline-block mt-2">
            Ver todos →
          </Link>
        </section>

        {/* Quizzes */}
        <section className="pt-6 border-t border-[#E6E0F8]">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 bg-[#FFF2E9] rounded-lg">
              <ClipboardList className="h-4 w-4 text-[#F38B4B]" />
            </div>
            <span className="font-bold text-sm text-[#4A4A4A]">Quizzes</span>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-slate-300" /></div>
          ) : data.quizzes.length > 0 ? (
            <ul className="space-y-3 mb-4">
              {data.quizzes.map((quiz) => (
                <li key={quiz.id} className="text-sm pb-2 border-b border-slate-50 last:border-0">
                  <p className="font-medium text-slate-700 truncate">{quiz.title}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{quiz.subject}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic mb-3">Nenhum quiz ainda</p>
          )}

          <Link href="/protected/estudos" className="text-xs font-bold text-[#6D44CC] hover:text-[#F38B4B] transition-colors inline-block mt-2">
            Ver todos →
          </Link>
        </section>
      </div>
    </div>
  );
}