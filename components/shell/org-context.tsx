"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { ORGANIZATIONS, type Organization } from "@/lib/mock-data";

type OrgContextValue = {
  orgs: Organization[];
  activeOrg: Organization;
  setActiveOrgId: (id: string) => void;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: { children: ReactNode }) {
  const [activeOrgId, setActiveOrgId] = useState(ORGANIZATIONS[0].id);
  const activeOrg = useMemo(
    () => ORGANIZATIONS.find((o) => o.id === activeOrgId) ?? ORGANIZATIONS[0],
    [activeOrgId],
  );

  return (
    <OrgContext.Provider value={{ orgs: ORGANIZATIONS, activeOrg, setActiveOrgId }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
