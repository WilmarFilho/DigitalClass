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
  Pencil,
  Building,
  Copy,
  Wallet,
  ChevronDown,
  Check,
  X,
  User,
} from "lucide-react";
import { apiGet, apiPatch } from "@/lib/api";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

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

interface TeacherProfile {
  full_name: string | null;
  conta_bancaria: string | null;
  chave_pix: string | null;
  dia_repasse: number | null;
  preferencia_repasse: string | null;
}

export default function MeusAlunosPage() {
  const [data, setData] = useState<StudentsData | null>(null);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Edit payment state
  const [editingPayment, setEditingPayment] = useState(false);
  const [editFullName, setEditFullName] = useState("");
  const [editConta, setEditConta] = useState("");
  const [editPix, setEditPix] = useState("");
  const [editDia, setEditDia] = useState<number>(5);
  const [editPref, setEditPref] = useState<string>("pix");
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<StudentsData>("/teachers/my-students").catch(() => ({ students: [], active_count: 0, monthly_revenue: 0, total_revenue: 0 } as StudentsData)),
      apiGet<TeacherProfile>("/profiles/me").catch(() => null),
    ]).then(([studentsData, profileData]) => {
      setData(studentsData);
      setProfile(profileData);
      console.log(profileData);
    }).finally(() => setLoading(false));
  }, []);

  const openPaymentEdit = () => {
    setEditFullName(profile?.full_name || "");
    setEditConta(profile?.conta_bancaria || "");
    setEditPix(profile?.chave_pix || "");
    setEditDia(profile?.dia_repasse || 5);
    setEditPref(profile?.preferencia_repasse || "pix");
    setPaymentError(null);
    setEditingPayment(true);
  };

  const savePaymentDetails = async () => {
    setSavingPayment(true);
    setPaymentError(null);
    try {
      const updated = await apiPatch<TeacherProfile>("/profile", {
        full_name: editFullName,
        conta_bancaria: editConta,
        chave_pix: editPix,
        dia_repasse: editDia,
        preferencia_repasse: editPref,
      });
      setProfile(updated);
      setEditingPayment(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setPaymentError(e.message || "Erro ao salvar");
    } finally {
      setSavingPayment(false);
    }
  };

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
      <header className="flex flex-col md:flex-column md:items-start md:align-start md:justify-between lg:flex-row md:items-center justify-between gap-4">
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
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
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
            Os dados acima são baseados na sua configuração de precificação. Em breve teremos repasses de forma automática, por enquanto entre em contato com o suporte para realizar o saque.
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

      {/* Seção: Dados de Pagamento do Professor */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center border border-emerald-200">
              <Wallet className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 tracking-tight">Dados de Pagamento</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informações para repasse</p>
            </div>
          </div>
          {!editingPayment && (
            <button
              onClick={openPaymentEdit}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {editingPayment ? (
            <motion.div
              key="edit"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 space-y-5"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Nome Completo</label>
                <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                  <div className="pl-3 text-slate-400"><User className="h-4 w-4" /></div>
                  <input type="text" value={editFullName} onChange={e => setEditFullName(e.target.value)} placeholder="Seu nome completo" className="w-full bg-transparent px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Conta Bancária (Agência + Conta)</label>
                <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                  <div className="pl-3 text-slate-400"><Building className="h-4 w-4" /></div>
                  <input type="text" value={editConta} onChange={e => setEditConta(e.target.value)} placeholder="Ex: Ag 0001 Cc 1234567-8" className="w-full bg-transparent px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Chave PIX Principal</label>
                <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-1.5 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                  <div className="pl-3 text-slate-400"><Copy className="h-4 w-4" /></div>
                  <input type="text" value={editPix} onChange={e => setEditPix(e.target.value)} placeholder="E-mail, CPF ou Celular" className="w-full bg-transparent px-2 py-1.5 text-sm font-semibold text-slate-800 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Dia do Repasse</label>
                  <div className="relative">
                    <select value={editDia} onChange={e => setEditDia(Number(e.target.value))} className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer">
                      <option value={5}>Dia 5</option>
                      <option value={10}>Dia 10</option>
                      <option value={15}>Dia 15</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronDown className="h-4 w-4" /></div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Preferência</label>
                  <div className="relative">
                    <select value={editPref} onChange={e => setEditPref(e.target.value)} className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all cursor-pointer">
                      <option value="pix">PIX</option>
                      <option value="transferencia_bancaria">Transf. Bancária</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><ChevronDown className="h-4 w-4" /></div>
                  </div>
                </div>
              </div>
              {paymentError && (
                <p className="text-xs font-bold text-red-500 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" /> {paymentError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setEditingPayment(false)}
                  className="flex-1 h-12 rounded-xl font-bold border-slate-200"
                >
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
                <Button
                  onClick={savePaymentDetails}
                  disabled={savingPayment}
                  className="flex-1 h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20"
                >
                  {savingPayment ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Check className="h-4 w-4 mr-2" /> Salvar Alterações</>}
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6"
            >
              {!profile?.conta_bancaria && !profile?.chave_pix ? (
                <div className="py-8 text-center">
                  <Wallet className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm font-bold text-slate-400">Nenhum dado de pagamento cadastrado</p>
                  <p className="text-xs text-slate-400 mt-1">Clique em "Editar" para configurar seus dados bancários.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <PaymentField icon={User} label="Nome Completo" value={profile?.full_name} />
                  <PaymentField icon={Building} label="Conta Bancária" value={profile?.conta_bancaria} />
                  <PaymentField icon={Copy} label="Chave PIX" value={profile?.chave_pix} />
                  <PaymentField icon={Calendar} label="Dia do Repasse" value={profile?.dia_repasse ? `Dia ${profile.dia_repasse}` : null} />
                  <PaymentField icon={Wallet} label="Preferência" value={profile?.preferencia_repasse === "transferencia_bancaria" ? "Transf. Bancária" : "PIX"} />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Seções de Expansão (Mock) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ExpansionCard
          title="Cupons"
          description="Em breve você poderá criar cupons de desconto direto por aqui."
          icon={ArrowUpRight}
        />
        <ExpansionCard
          title="Relatórios"
          description="Métricas de conclusão de aulas por aluno, tempo de estudo e desempenho."
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PaymentField({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-100">
      <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-sm font-bold text-slate-800 truncate">{value || "—"}</p>
      </div>
    </div>
  );
}