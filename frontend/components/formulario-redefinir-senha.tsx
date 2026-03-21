"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      router.push("/protected");
    } catch (error: any) {
      setError(error instanceof Error ? error.message : t("auth.signUpError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4 md:gap-8", className)} {...props}>
      <div className="flex flex-col gap-1 md:gap-2">
        <h2 className="text-xl md:text-3xl font-bold tracking-tight text-gray-900">{t("auth.newPasswordTitle")}</h2>
        <p className="text-xs md:text-sm text-gray-500">
          {t("auth.newPasswordSubtitle")}
        </p>
      </div>

      <form onSubmit={handleUpdatePassword} className="space-y-3 md:space-y-5">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs uppercase font-bold text-gray-400 tracking-wider">
            {t("auth.newPasswordLabel")}
          </Label>
          <Input
            id="password"
            type="password"
            placeholder={t("auth.newPasswordPlaceholder")}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-10 md:h-12 text-sm md:text-base border-gray-200 focus:ring-[#6D44CC] focus:border-[#6D44CC]"
          />
        </div>

        {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-10 md:h-12 bg-[#6D44CC] hover:bg-[#5a38a8] text-white font-bold text-sm md:text-base rounded-md transition-all"
        >
          {isLoading ? t("auth.saving") : t("auth.saveNewPassword")}
        </Button>
      </form>
    </div>
  );
}
