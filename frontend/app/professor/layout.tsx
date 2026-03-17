import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ConditionalLayout } from "@/components/dashboard/ConditionalLayout";
import { LoaderScreen } from "@/components/ui/LoaderScreen";

async function ProfessorLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const userName = profile?.full_name;
  const userRole = (profile?.role as "student" | "teacher") ?? "teacher";

  return (
    <ConditionalLayout userName={userName} userRole={userRole}>
      {children}
    </ConditionalLayout>
  );
}

function ProfessorLayoutFallback() {
  return <LoaderScreen />;
}

export default function ProfessorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ProfessorLayoutFallback />}>
      <ProfessorLayoutContent>{children}</ProfessorLayoutContent>
    </Suspense>
  );
}
