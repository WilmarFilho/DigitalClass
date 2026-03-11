import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { LoaderScreen } from "@/components/ui/LoaderScreen";

async function ProtectedLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Estudante";

  // Delay bruto para visualizar a animação do loader (remover em produção)
  await new Promise((r) => setTimeout(r, 2500));

  return (
    <DashboardLayout userName={userName}>
      {children}
    </DashboardLayout>
  );
}

function ProtectedLayoutFallback() {
  return <LoaderScreen />;
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ProtectedLayoutFallback />}>
      <ProtectedLayoutContent>{children}</ProtectedLayoutContent>
    </Suspense>
  );
}
