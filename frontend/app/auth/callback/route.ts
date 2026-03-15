import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  console.log('--- AUTH CALLBACK INICIADO ---');
  console.log('Origin:', origin);
  console.log('Code presente:', !!code);

  if (!code) {
    console.error('Erro: Código ausente');
    return NextResponse.redirect(`${origin}/auth`);
  }

  try {
    const cookieStore = await cookies();
    console.log('Cookies lidos com sucesso');

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    console.log('Trocando código por sessão...');
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Erro na troca de código Supabase:", exchangeError.message);
      return NextResponse.redirect(`${origin}/auth/error?error=${encodeURIComponent(exchangeError.message)}`);
    }

    console.log('Sessão estabelecida. Buscando usuário...');
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Usuário ID:', user?.id);

    let redirectTo = "/onboarding";

    if (user) {
      console.log('Buscando perfil no banco...');
      const { data: profile, error: dbError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (dbError) console.error('Erro DB Profile:', dbError);

      if (profile?.role) {
        console.log('Perfil encontrado, role:', profile.role);
        redirectTo = "/protected";
      } else {
        console.log('Perfil não encontrado ou sem role, indo para onboarding');
      }
    }

    console.log('Redirecionando para:', redirectTo);
    return NextResponse.redirect(`${origin}${redirectTo}`);

  } catch (err) {
    console.error("ERRO CRÍTICO NO CALLBACK:", err);
    return NextResponse.redirect(`${origin}/auth/error?error=internal_server_error`);
  }
}