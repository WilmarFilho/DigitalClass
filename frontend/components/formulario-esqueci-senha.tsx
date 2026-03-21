"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSuccess(true);
    } catch (error: any) {
      setError(error instanceof Error ? error.message : t("auth.signUpError"));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className={cn("flex flex-col gap-4 md:gap-8", className)} {...props}>
        <div className="flex flex-col gap-1 md:gap-2">
          <h2 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900">{t("auth.checkEmailTitle")}</h2>
          <p className="text-xs md:text-sm text-gray-500">
            {t("auth.checkEmailSubtitle")}
          </p>
        </div>

        <div className="bg-[#E6E0F8] rounded-lg p-4 md:p-6">
          <p className="text-xs md:text-sm text-[#6D44CC] font-semibold">
            {t("auth.checkEmailInfo")}
          </p>
        </div>

        <Link
          href="/auth"
          className="inline-flex items-center justify-center w-full h-10 md:h-12 bg-[#6D44CC] hover:bg-[#5a38a8] text-white font-bold text-sm md:text-base rounded-md transition-all"
        >
          {t("auth.backToLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-4 md:gap-8", className)} {...props}>
      <div className="flex flex-col gap-1 md:gap-2">
        <h2 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900">{t("auth.resetPasswordTitle")}</h2>
        <p className="text-xs md:text-sm text-gray-500">
          {t("auth.resetPasswordSubtitle")}
        </p>
      </div>

      <form onSubmit={handleForgotPassword} className="space-y-3 md:space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs uppercase font-bold text-gray-400 tracking-wider">
            {t("auth.emailLabel")}
          </Label>
          <Input
            id="email"
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 md:h-12 text-sm md:text-base border-gray-200 focus:ring-[#6D44CC] focus:border-[#6D44CC]"
          />
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 md:h-12 bg-[#6D44CC] hover:bg-[#5a38a8] text-white font-bold text-sm md:text-base rounded-md transition-all"
        >
          {isLoading ? t("auth.sending") : t("auth.sendResetLink")}
        </Button>
      </form>

      <p className="text-center text-xs md:text-sm text-gray-500">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link href="/auth" className="text-[#F38B4B] font-bold hover:underline">
          {t("auth.loginButton")}
        </Link>
      </p>
    </div>
  );
}
