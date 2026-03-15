import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  console.log('teste')

  if (!code) {
    return NextResponse.redirect(`${origin}/auth`);
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    // 1. Troca o código pela sessão
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Erro na troca de código:", exchangeError.message);
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    // 2. Pegar usuário logado
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // 3. Decidir redirecionamento baseado no perfil
    let redirectTo = "/onboarding";

    if (user) {
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.role) {
          redirectTo = "/protected";
        }
      } catch (dbError) {
        console.error("Erro ao consultar perfil:", dbError);
      }
    }

    return NextResponse.redirect(`${origin}${redirectTo}`);
  } catch (err) {
    console.error("Erro crítico no callback:", err);
    return NextResponse.redirect(`${origin}/auth/error?error=internal_server_error`);
  }
}