"use client";

import Link from "next/link";
import { FileQuestion, ClipboardList } from "lucide-react";

const mockFlashcards = [
  { id: "1", question: "Lei de Ohm: V = ?", subject: "Física" },
  { id: "2", question: "Fórmula de Bhaskara", subject: "Matemática" },
  { id: "3", question: "Ciclo do Carbono", subject: "Biologia" },
];

const mockQuizzes = [
  { id: "1", title: "Equações do 2º grau", subject: "Matemática", score: "8/10" },
  { id: "2", title: "Termodinâmica", subject: "Física", score: "7/10" },
];

export function LastAssets() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold text-slate-900 mb-4">Últimos Ativos</h3>

      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileQuestion className="h-4 w-4 text-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Flashcards</span>
          </div>
          <ul className="space-y-2">
            {mockFlashcards.map((f) => (
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
          <ul className="space-y-2">
            {mockQuizzes.map((q) => (
              <li key={q.id}>
                <Link
                  href="/protected/estudos"
                  className="block p-2 rounded-lg hover:bg-slate-50 text-sm"
                >
                  <p className="font-medium text-slate-900 truncate">{q.title}</p>
                  <p className="text-xs text-slate-500">
                    {q.subject} • {q.score}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
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
