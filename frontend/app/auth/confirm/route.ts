import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/auth";
  const code = searchParams.get("code");

  // For email confirmation in SSR apps, Supabase recommends token_hash links.
  // If we receive an auth code here, the email template is still using the PKCE-style
  // ConfirmationURL flow, which depends on a code verifier stored in the initiating client.
  if (code && !token_hash) {
    redirect(
      "/auth/error?error=email_confirmation_requires_token_hash_template",
    );
  }

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      redirect(next);
    }

    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/auth/error?error=missing_confirmation_params");
}
