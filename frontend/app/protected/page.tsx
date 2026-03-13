export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GreetingBanner } from "@/components/dashboard/GreetingBanner";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { CalendarPreview } from "@/components/dashboard/CalendarPreview";
import { ConsistencyGraph } from "@/components/dashboard/ConsistencyGraph";
import { LastAssets } from "@/components/dashboard/LastAssets";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect("/auth");

  // Extração robusta do nome para o Banner
  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Estudante";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Banner Principal - Roxo com ícone de livro */}
      <GreetingBanner userName={userName} />

      {/* Seção de Métricas (Horas, Meta, Sequência, Matérias) */}
      <section>
        <StatsCards />
      </section>

      {/* Grid Principal: Calendário e Engajamento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Coluna da Esquerda: Calendário (Ocupa 2/3) */}
        <div className="lg:col-span-2 space-y-6">
          <CalendarPreview />
        </div>

        {/* Coluna da Direita: Consistência e Ativos (Ocupa 1/3) */}
        <div className="flex flex-col gap-8">
          <ConsistencyGraph />
          <LastAssets />
        </div>
      </div>
    </div>
  );
}