"use client";

import { createContext, useContext, useState } from "react";

type Role = "student" | "teacher";

interface RoleContextValue {
  role: Role;
  setRole: (role: Role) => void;
}

const RoleContext = createContext<RoleContextValue>({
  role: "student",
  setRole: () => {},
});

export function RoleProvider({
  children,
  initialRole,
}: {
  children: React.ReactNode;
  initialRole: Role;
}) {
  const [role, setRole] = useState<Role>(initialRole);

  return (
    <RoleContext.Provider value={{ role, setRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
