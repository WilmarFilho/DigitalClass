"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useTranslation();

  useEffect(() => {
    // Simular carregamento inicial
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-in fade-in duration-700">
      <div className="text-center space-y-6 max-w-md">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            {t("onboarding.welcome")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("onboarding.subtitle")}
          </p>
        </div>

        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            {t("onboarding.loading")}
          </p>
        </div>
      </div>
    </div>
  );
}