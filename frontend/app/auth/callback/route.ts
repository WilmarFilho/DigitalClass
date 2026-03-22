import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // Pega o host real
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "class.nkwflow.com";

  // FORÇA HTTPS em produção
  const protocol = "https";
  const origin = `${protocol}://${host}`;

  if (!code) {
    console.error('Erro: Código ausente no callback');
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
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch (error) {
              // O Next.js pode lançar erro se tentar setar cookie em Server Component,
              // mas em Route Handlers como este, funciona normalmente.
              console.error('Erro ao setar cookies:', error);
            }
          },
        },
      }
    );

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Erro na troca de código Supabase:", exchangeError.message);
      // Se falhar o PKCE, redireciona para a página de erro com a mensagem
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Usuário não encontrado após troca de código');
      return NextResponse.redirect(`${origin}/auth/error?error=no_user_found`);
    }

    // Lógica de redirecionamento baseada no perfil
    let redirectTo = "/onboarding";

    const { data: profile, error: dbError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (dbError) {
      console.error('Erro ao consultar tabela profiles:', dbError.message);
    }

    if (profile?.role) {
      redirectTo = "/protected";
    }

    // IMPORTANTE: Use a URL absoluta com a origin corrigida
    return NextResponse.redirect(`${origin}${redirectTo}`);

  } catch (err) {
    console.error("ERRO CRÍTICO NO CALLBACK:", err);
    // Fallback de segurança para não deixar a página em branco
    const fallbackOrigin = "https://class.nkwflow.com";
    return NextResponse.redirect(`${fallbackOrigin}/auth/error?error=internal_server_error`);
  }
}