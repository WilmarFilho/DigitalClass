import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  // AJUSTE DE ORIGEM: Força o uso do domínio real vindo dos headers do Proxy (Nginx)
  // Se não houver headers, ele tenta usar o host da requisição ou o domínio padrão
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "class.nkwflow.com";
  const protocol = request.headers.get("x-forwarded-proto") || "https";
  const origin = `${protocol}://${host}`;

  console.log('--- AUTH CALLBACK INICIADO ---');
  console.log('Origin Calculada:', origin);
  console.log('Code presente:', !!code);

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

    console.log('Trocando código por sessão...');
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Erro na troca de código Supabase:", exchangeError.message);
      // Se falhar o PKCE, redireciona para a página de erro com a mensagem
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    console.log('Sessão estabelecida. Buscando usuário...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Usuário não encontrado após troca de código');
      return NextResponse.redirect(`${origin}/auth/error?error=no_user_found`);
    }

    console.log('Usuário ID:', user.id);

    // Lógica de redirecionamento baseada no perfil
    let redirectTo = "/onboarding";

    console.log('Buscando perfil no banco...');
    const { data: profile, error: dbError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (dbError) {
      console.error('Erro ao consultar tabela profiles:', dbError.message);
    }

    if (profile?.role) {
      console.log('Perfil encontrado, role:', profile.role);
      redirectTo = "/protected";
    } else {
      console.log('Perfil não encontrado ou sem role, seguindo para onboarding');
    }

    console.log('Finalizando: Redirecionando para', `${origin}${redirectTo}`);

    // IMPORTANTE: Use a URL absoluta com a origin corrigida
    return NextResponse.redirect(`${origin}${redirectTo}`);

  } catch (err) {
    console.error("ERRO CRÍTICO NO CALLBACK:", err);
    // Fallback de segurança para não deixar a página em branco
    const fallbackOrigin = "https://class.nkwflow.com";
    return NextResponse.redirect(`${fallbackOrigin}/auth/error?error=internal_server_error`);
  }
}