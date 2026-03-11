import { Brain } from "lucide-react";

export default function EstudosPage() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
        <Brain className="h-6 w-6" />
        Meus Estudos
      </h1>
      <p className="mt-2 text-slate-600">
        Em breve: flashcards, quizzes e histórico de sessões.
      </p>
    </div>
  );
}
