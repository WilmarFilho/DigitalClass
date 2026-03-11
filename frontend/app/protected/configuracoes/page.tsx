import { Settings } from "lucide-react";

export default function ConfiguracoesPage() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
        <Settings className="h-6 w-6" />
        Configurações
      </h1>
      <p className="mt-2 text-slate-600">
        Em breve: personalize sua experiência.
      </p>
    </div>
  );
}
