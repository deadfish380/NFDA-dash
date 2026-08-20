"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Organization, Post } from "@/lib/mock-data";

const ACTIVE_ORG_KEY = "nfda_active_org";

type OrgContextValue = {
  orgs: Organization[];
  posts: Post[];
  activeOrg: Organization;
  activePosts: Post[];
  setActiveOrgId: (id: string) => void;
};

const OrgContext = createContext<OrgContextValue | null>(null);

/** Holds server-fetched orgs/posts; only the active-org selection is client state. */
export function OrgProvider({
  orgs,
  posts,
  children,
}: {
  orgs: Organization[];
  posts: Post[];
  children: ReactNode;
}) {
  // Start with the first org (matches server render), then restore the last
  // chosen org from localStorage on mount — avoids a hydration mismatch.
  const [activeOrgId, setActiveOrgId] = useState(orgs[0]?.id ?? "");

  useEffect(() => {
    const saved = localStorage.getItem(ACTIVE_ORG_KEY);
    if (saved && orgs.some((o) => o.id === saved)) setActiveOrgId(saved);
  }, [orgs]);

  const selectOrg = useCallback((id: string) => {
    setActiveOrgId(id);
    try {
      localStorage.setItem(ACTIVE_ORG_KEY, id);
    } catch {
      // storage unavailable (private mode) — selection just won't persist
    }
  }, []);

  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];
  const activePosts = useMemo(
    () => posts.filter((p) => p.orgId === activeOrg?.id),
    [posts, activeOrg],
  );

  return (
    <OrgContext.Provider value={{ orgs, posts, activeOrg, activePosts, setActiveOrgId: selectOrg }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
