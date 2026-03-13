"use client";

import Link from "next/link";
import { FileQuestion, ClipboardList } from "lucide-react";

export function LastAssets() {
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
          <p className="text-sm text-slate-400 italic mb-3">Nenhum flashcard ainda</p>
          <Link href="/protected/estudos" className="text-xs font-bold text-[#6D44CC] hover:text-[#F38B4B] transition-colors">
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
          <p className="text-sm text-slate-400 italic mb-3">Nenhum quiz ainda</p>
          <Link href="/protected/estudos" className="text-xs font-bold text-[#6D44CC] hover:text-[#F38B4B] transition-colors">
            Ver todos →
          </Link>
        </section>
      </div>
    </div>
  );
}