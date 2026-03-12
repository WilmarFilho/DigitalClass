"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FileQuestion, ClipboardList, Loader2 } from "lucide-react";
import { apiGet } from "@/lib/api";

interface FlashcardAsset {
  id: string;
  question: string;
  subject: string;
}

interface QuizAsset {
  id: string;
  title: string;
  subject: string;
}

interface LastAssetsResponse {
  flashcards: FlashcardAsset[];
  quizzes: QuizAsset[];
}

export function LastAssets() {
  const [data, setData] = useState<LastAssetsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<LastAssetsResponse>("/dashboard/last-assets?limit=5")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const flashcards = data?.flashcards ?? [];
  const quizzes = data?.quizzes ?? [];

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="font-semibold text-slate-900 mb-4">Últimos Ativos</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-4">Últimos Ativos</h3>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileQuestion className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Flashcards</span>
          </div>
          {flashcards.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">Nenhum flashcard ainda</p>
          ) : (
            <ul className="space-y-2">
              {flashcards.map((f) => (
                <li key={f.id}>
                  <Link
                    href="/protected/estudos"
                    className="block p-2 rounded-lg hover:bg-slate-50 text-sm"
                  >
                    <p className="font-medium text-slate-900 truncate">{f.question}</p>
                    <p className="text-xs text-slate-500">{f.subject}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/protected/estudos"
            className="text-xs text-indigo-600 font-medium hover:underline mt-1 inline-block"
          >
            Ver todos →
          </Link>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center gap-2 mb-2">
            <ClipboardList className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-slate-700">Quizzes</span>
          </div>
          {quizzes.length === 0 ? (
            <p className="text-sm text-slate-500 py-2">Nenhum quiz ainda</p>
          ) : (
            <ul className="space-y-2">
              {quizzes.map((q) => (
                <li key={q.id}>
                  <Link
                    href="/protected/estudos"
                    className="block p-2 rounded-lg hover:bg-slate-50 text-sm"
                  >
                    <p className="font-medium text-slate-900 truncate">{q.title}</p>
                    <p className="text-xs text-slate-500">{q.subject}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/protected/estudos"
            className="text-xs text-indigo-600 font-medium hover:underline mt-1 inline-block"
          >
            Ver todos →
          </Link>
        </div>
      </div>
    </div>
  );
}
