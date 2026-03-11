import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  
  // URL to redirect to after sign in process completes
  const next = requestUrl.searchParams.get("next") ?? "/onboarding";

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Need the full list of cookies to get the chunked auth cookies
            return request.headers.get("cookie")
              ?.split(";")
              .map((c) => {
                const [name, ...value] = c.split("=");
                return { name: name.trim(), value: value.join("=").trim() };
              }) ?? [];
          },
          setAll(cookiesToSet) {
            // In a route handler, we don't have direct access to set cookies on the request
            // We set them on the response instead
          },
        },
      }
    );
    
    // We exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host'); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development';
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // TODO: Add error redirect route
  // return NextResponse.redirect(`${origin}/auth/auth-code-error`)
  return NextResponse.redirect(`${origin}/`);
}
