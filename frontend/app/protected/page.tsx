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
  if (!user) redirect("/auth/login");

  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Estudante";

  return (
    <div className="space-y-6">
      <GreetingBanner userName={userName} />

      <StatsCards />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CalendarPreview />
        </div>
        <div className="space-y-6">
          <ConsistencyGraph />
          <LastAssets />
        </div>
      </div>
    </div>
  );
}



