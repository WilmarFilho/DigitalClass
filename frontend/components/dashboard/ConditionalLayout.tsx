"use client";

import { usePathname } from "next/navigation";
import { DashboardLayout } from "./DashboardLayout";

export function ConditionalLayout({
  children,
  userName,
  userRole,
}: {
  children: React.ReactNode;
  userName: string;
  userRole: "student" | "teacher";
}) {
  const pathname = usePathname();
  const isFullscreen = pathname?.startsWith("/protected/estudos/sessao") || pathname?.startsWith("/protected/professores/area");

  if (isFullscreen) {
    return <>{children}</>;
  }

  return (
    <DashboardLayout userName={userName} userRole={userRole}>
      {children}
    </DashboardLayout>
  );
}
