"use client";

import { createClient } from "@/lib/supabase/client";
import { Button, type ButtonProps } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoutButtonProps extends Omit<ButtonProps, "onClick"> {
  showIcon?: boolean;
}

export function LogoutButton({
  className,
  variant = "default",
  size = "default",
  showIcon = false,
  ...props
}: LogoutButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <Button
      onClick={logout}
      variant={variant}
      size={size}
      className={cn(className)}
      {...props}
    >
      {showIcon && <LogOut className="h-4 w-4" />}
      {t("sidebar.sair")}
    </Button>
  );
}
