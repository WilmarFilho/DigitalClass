import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // O 'next' pode vir via parâmetro se você configurou no sign-in
  const nextParam = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth`);
  }

  try {
    const supabase = await createClient();

    // 1. Troca o código pela sessão (isso seta os cookies)
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Erro na troca de código:", exchangeError.message);
      return NextResponse.redirect(`${origin}/auth/error?message=session_error`);
    }

    // 2. Pegar usuário logado
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.redirect(`${origin}/auth/error?message=no_user`);
    }

    // 3. Lógica de Redirecionamento Baseada em Perfil
    // Envolvemos em try/catch para evitar que erro no banco dê 502 no login
    let redirectTo = "/onboarding";

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role) {
        redirectTo = "/protected"; // Ou sua dashboard
      }
    } catch (dbError) {
      console.error("Erro ao consultar perfil:", dbError);
      // Mesmo com erro no perfil, deixamos o usuário entrar (vai para o onboarding)
    }

    // 4. Redirecionamento Final usando a 'origin' da request para evitar erros de host
    return NextResponse.redirect(`${origin}${redirectTo}`);

  } catch (globalError) {
    console.error("Erro Crítico no Callback:", globalError);
    return NextResponse.redirect(`${origin}/auth/error?message=internal_server_error`);
  }
}