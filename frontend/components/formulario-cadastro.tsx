"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { AuthError } from "@supabase/supabase-js";
import { useTranslation } from "@/hooks/useTranslation";

interface SignUpFormProps extends React.ComponentPropsWithoutRef<"div"> {
  onSwitch: () => void;
}

export function SignUpForm({ className, onSwitch, ...props }: SignUpFormProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);

  const handleGoToLogin = () => {
    setIsSuccessModalOpen(false);
    onSwitch();
  };

  const handleSuccessModalChange = (open: boolean) => {
    setIsSuccessModalOpen(open);

    if (!open) {
      onSwitch();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const emailRedirectTo = new URL("/auth/confirm", window.location.origin).toString();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo,
        },
      });
      if (signUpError) throw signUpError;
      setEmail("");
      setPassword("");
      setIsSuccessModalOpen(true);
    } catch (err: any) {
      setError(err instanceof AuthError ? err.message : t("auth.signUpError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4 md:gap-8", className)} {...props}>
      <div className="flex flex-col gap-1 md:gap-2">
        <h2 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900">{t("auth.signUpTitle")}</h2>
        <p className="text-xs md:text-sm text-gray-500">{t("auth.signUpSubtitle")}</p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-3 md:space-y-4">
        <div className="space-y-2">
          <Label className="text-xs uppercase font-bold text-gray-400">{t("auth.email")}</Label>
          <Input
            type="email"
            placeholder={t("auth.emailPlaceholder")}
            className="h-10 md:h-12 text-sm md:text-base"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs uppercase font-bold text-gray-400">{t("auth.password")}</Label>
          <Input
            type="password"
            className="h-10 md:h-12 text-sm md:text-base"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        <Button type="submit" disabled={isLoading} className="w-full h-10 md:h-12 bg-[#6D44CC] hover:bg-[#5a38a8] text-sm md:text-base">
          {isLoading ? t("auth.creating") : t("auth.signUpButton")}
        </Button>
      </form>

      <p className="text-center text-xs md:text-sm text-gray-500">
        {t("auth.alreadyHaveAccount")}{" "}
        <button onClick={onSwitch} type="button" className="text-[#F38B4B] font-bold hover:underline">
          {t("auth.loginAction")}
        </button>
      </p>

      <Dialog open={isSuccessModalOpen} onOpenChange={handleSuccessModalChange}>
        <DialogContent className="max-w-md rounded-3xl border-0 bg-white p-0 shadow-2xl">
          <div className="bg-[#6D44CC] px-6 py-7 text-white">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-black">
                {t("auth.signUpModalTitle")}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm text-white/85">
                {t("auth.signUpModalSubtitle")}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 pb-6 pt-5">
            <div className="rounded-2xl bg-[#F6F1FF] p-4 text-sm text-[#5A38A8]">
              {t("auth.signUpSuccess")}
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                onClick={handleGoToLogin}
                className="h-11 w-full bg-[#F38B4B] font-bold text-white hover:bg-[#db7636] sm:w-full"
              >
                {t("auth.backToLogin")}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
