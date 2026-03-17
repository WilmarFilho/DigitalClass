"use client";

import { usePathname } from "next/navigation";
import { DashboardLayout } from "./DashboardLayout";
import { RoleProvider } from "@/contexts/RoleContext";

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

  return (
    <RoleProvider initialRole={userRole}>
      {isFullscreen ? (
        <>{children}</>
      ) : (
        <DashboardLayout userName={userName} userRole={userRole}>
          {children}
        </DashboardLayout>
      )}
    </RoleProvider>
  );
}
