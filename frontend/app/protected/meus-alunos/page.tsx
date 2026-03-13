"use client";

import { useState, useEffect } from "react";
import {
  UsersRound,
  TrendingUp,
  DollarSign,
  Calendar,
  Loader2,
  Search,
  AlertCircle,
  MoreHorizontal,
  ArrowUpRight,
  Filter,
} from "lucide-react";
import { apiGet } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

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
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-8 pb-12"
    >
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UsersRound className="h-7 w-7 text-indigo-600" />
            Gestão de Alunos
          </h1>
          <p className="text-sm text-slate-500 mt-1 ml-9">Acompanhe seu crescimento e faturamento em tempo real.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="h-10 w-64 rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm"
            />
          </div>
          <button className="h-10 w-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-slate-600">
            <Filter className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Cards de métricas com design de Dashboard Financeiro */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={UsersRound}
          label="Total de Alunos"
          value={String(data?.active_count ?? 0)}
          subValue="+12% que mês passado"
          color="indigo"
        />
        <MetricCard
          icon={DollarSign}
          label="MRR (Mensal)"
          value={`R$ ${(data?.monthly_revenue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subValue="Estimativa atual"
          color="emerald"
          badge="Estimado"
        />
        <MetricCard
          icon={TrendingUp}
          label="Faturamento Total"
          value={`R$ ${(data?.total_revenue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subValue="Acumulado histórico"
          color="purple"
          badge="Estimado"
        />
        <MetricCard
          icon={Calendar}
          label="Novas Matrículas"
          value={String(
            filtered.filter((s) => {
              const d = new Date(s.subscribed_at);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length
          )}
          subValue="Nos últimos 30 dias"
          color="amber"
        />
      </div>

      {/* Alerta de Integração de Pagamento */}
      <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm group hover:border-indigo-200 transition-all">
        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
          <AlertCircle className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-indigo-900 font-semibold leading-none">Módulo de Pagamento Digital Class</p>
          <p className="text-xs text-indigo-700/70 mt-1">
            Os dados acima são baseados na sua configuração de precificação. A integração com Checkout direto está sendo finalizada.
          </p>
        </div>
        <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-200">
          Saber mais
        </button>
      </div>

      {/* Lista de Alunos */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <h2 className="font-bold text-slate-800 tracking-tight">
            Base de Alunos <span className="ml-2 text-xs font-medium px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full">{filtered.length}</span>
          </h2>
        </div>

        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="py-20 text-center"
            >
              <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <UsersRound className="h-10 w-10 text-slate-200" />
              </div>
              <p className="text-slate-500 font-medium">
                {search ? "Nenhum aluno corresponde à sua busca." : "Sua base de alunos está vazia."}
              </p>
            </motion.div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/20 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="px-6 py-4">Aluno</th>
                    <th className="px-6 py-4">Data de Ingresso</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((student) => (
                    <StudentTableRow key={student.id} student={student} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Seções de Expansão (Mock) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ExpansionCard 
          title="Faturamento & Checkout" 
          description="Em breve você poderá emitir cobranças, criar cupons de desconto e gerenciar assinaturas recorrentes direto por aqui."
          icon={ArrowUpRight}
        />
        <ExpansionCard 
          title="Relatórios de Engajamento" 
          description="Métricas de conclusão de aulas por aluno, tempo de estudo e desempenho em quizzes para identificar alunos em risco."
          icon={TrendingUp}
        />
      </div>
    </motion.div>
  );
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MetricCard({ icon: Icon, label, value, subValue, color, badge }: any) {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };

  return (
    <div className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border transition-all", colorMap[color as keyof typeof colorMap])}>
          <Icon className="h-6 w-6" />
        </div>
        {badge && (
          <span className="px-2 py-1 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-tight">
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide flex items-center gap-1">
          {subValue}
        </p>
      </div>
    </div>
  );
}

function StudentTableRow({ student }: { student: Student }) {
  const initials = student.full_name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  const since = new Date(student.subscribed_at).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <motion.tr 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="group hover:bg-slate-50/80 transition-colors"
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          {student.avatar_url ? (
            <img src={student.avatar_url} alt="" className="h-10 w-10 rounded-xl object-cover ring-2 ring-white shadow-sm" />
          ) : (
            <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
              {initials}
            </div>
          )}
          <span className="text-sm font-bold text-slate-800">{student.full_name}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-xs text-slate-500 font-medium">{since}</span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase border border-emerald-100">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Ativo
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <button className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-sm border border-transparent hover:border-slate-200 transition-all">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </td>
    </motion.tr>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ExpansionCard({ title, description, icon: Icon }: any) {
  return (
    <div className="relative group rounded-3xl border border-dashed border-slate-300 bg-slate-50/40 p-8 transition-all hover:bg-white hover:border-indigo-300">
      <div className="absolute top-6 right-6 opacity-10 group-hover:opacity-100 transition-opacity">
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 uppercase">Coming Soon</span>
      </div>
      <div className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-4 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-bold text-slate-800 text-base mb-2">{title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed max-w-sm">{description}</p>
    </div>
  );
}