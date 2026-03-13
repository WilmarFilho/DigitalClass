import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Esta função faz o trabalho pesado
async function HomeRedirector() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role) {
    redirect("/protected");
  }

  redirect("/onboarding");
  return null;
}

export default function Home() {
  return (
    // O Suspense aqui avisa ao compilador: "Não tente adivinhar o que tem aqui no build"
    <Suspense fallback={null}>
      <HomeRedirector />
    </Suspense>
  );
}