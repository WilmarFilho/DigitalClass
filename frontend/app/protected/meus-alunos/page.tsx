"use client";

import { useState, useEffect } from "react";
import {
  UsersRound,
  TrendingUp,
  DollarSign,
  Calendar,
  Loader2,
  Search,
  UserCircle2,
  AlertCircle,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  full_name: string;
  avatar_url: string | null;
  subscribed_at: string;
}

interface StudentsData {
  students: Student[];
  active_count: number;
  monthly_revenue: number;
  total_revenue: number;
}

export default function MeusAlunosPage() {
  const [data, setData] = useState<StudentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiGet<StudentsData>("/teachers/my-students")
      .then(setData)
      .catch(() => setData({ students: [], active_count: 0, monthly_revenue: 0, total_revenue: 0 }))
      .finally(() => setLoading(false));
  }, []);

  const filtered = (data?.students ?? []).filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
        <UsersRound className="h-6 w-6" />
        Meus Alunos
      </h1>

      {/* Cards de métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={UsersRound}
          label="Alunos ativos"
          value={String(data?.active_count ?? 0)}
          color="indigo"
        />
        <MetricCard
          icon={DollarSign}
          label="Receita mensal"
          value={`R$ ${(data?.monthly_revenue ?? 0).toFixed(2)}`}
          color="emerald"
          badge="Mock"
        />
        <MetricCard
          icon={TrendingUp}
          label="Receita acumulada"
          value={`R$ ${(data?.total_revenue ?? 0).toFixed(2)}`}
          color="purple"
          badge="Mock"
        />
        <MetricCard
          icon={Calendar}
          label="Novos este mês"
          value={String(
            filtered.filter((s) => {
              const d = new Date(s.subscribed_at);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length
          )}
          color="amber"
        />
      </div>

      {/* Aviso pagamentos mockados */}
      <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>
          Os dados de faturamento são <strong>estimados</strong> com base na mensalidade
          configurada. O módulo de pagamentos será integrado em breve.
        </span>
      </div>

      {/* Tabela de alunos */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">
            Alunos ativos ({data?.active_count ?? 0})
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar aluno..."
              className="flex h-8 rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-48"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <UsersRound className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <p className="text-slate-500 text-sm">
              {search ? "Nenhum aluno encontrado." : "Você ainda não tem alunos."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((student) => (
              <StudentRow key={student.id} student={student} />
            ))}
          </div>
        )}
      </div>

      {/* Seções mockadas de financeiro */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MockSection title="Histórico de pagamentos" description="Em breve: visualize todos os pagamentos recebidos, datas e status." />
        <MockSection title="Planos e precificação" description="Em breve: configure múltiplos planos, cupons e períodos de trial." />
      </div>
    </div>
  );
}

// ─── Componentes ─────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  badge,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: "indigo" | "emerald" | "purple" | "amber";
  badge?: string;
}) {
  const colors = {
    indigo: "bg-indigo-100 text-indigo-600",
    emerald: "bg-emerald-100 text-emerald-600",
    purple: "bg-purple-100 text-purple-600",
    amber: "bg-amber-100 text-amber-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", colors[color])}>
          <Icon className="h-5 w-5" />
        </div>
        {badge && (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
            {badge}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function StudentRow({ student }: { student: Student }) {
  const initials = student.full_name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const since = new Date(student.subscribed_at).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
      {student.avatar_url ? (
        <img
          src={student.avatar_url}
          alt={student.full_name}
          className="h-10 w-10 rounded-full object-cover shrink-0"
        />
      ) : (
        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
          {initials}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{student.full_name}</p>
        <p className="text-xs text-slate-500">Desde {since}</p>
      </div>

      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700 shrink-0">
        Ativo
      </span>
    </div>
  );
}

function MockSection({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-slate-700 text-sm">{title}</h3>
        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600">
          Em breve
        </span>
      </div>
      <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
