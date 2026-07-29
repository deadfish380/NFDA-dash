"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Organization, Post } from "@/lib/mock-data";

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
  const [activeOrgId, setActiveOrgId] = useState(orgs[0]?.id ?? "");
  const activeOrg = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];
  const activePosts = useMemo(
    () => posts.filter((p) => p.orgId === activeOrg?.id),
    [posts, activeOrg],
  );

  return (
    <OrgContext.Provider value={{ orgs, posts, activeOrg, activePosts, setActiveOrgId }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
