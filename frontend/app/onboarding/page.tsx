"use client";

import { useTranslation } from "@/hooks/useTranslation";
import { SmartStepper } from "@/components/onboarding/SmartStepper";

export default function OnboardingPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 animate-in fade-in duration-700">
      <div className="w-full max-w-2xl">
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            {t("onboarding.welcome")}
          </h1>
          <p className="text-lg text-muted-foreground">
            {t("onboarding.subtitle")}
          </p>
        </div>
        <SmartStepper />
      </div>
    </div>
  );
}