"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-4">
      <h1 className="text-4xl font-bold mb-4">{t("notFound.title")}</h1>
      <p className="text-muted-foreground mb-8">
        {t("notFound.description")}.
      </p>
      <Link href="/auth">
        <Button>{t("notFound.backToLogin")}</Button>
      </Link>
    </div>
  );
}
