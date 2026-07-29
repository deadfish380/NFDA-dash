"use client";

import { usePathname } from "next/navigation";
import { OrgProvider } from "@/components/shell/org-context";
import { APP_NAV, MobileNav, Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";
import type { Organization, Post } from "@/lib/mock-data";

function titleFor(pathname: string): string {
  if (pathname.startsWith("/connect")) return "Connect Facebook";
  const item = APP_NAV.find((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)));
  return item?.label ?? "Dashboard";
}

/** Client shell: wires the org provider + chrome around server-fetched data. */
export function AppShell({
  orgs,
  posts,
  dryRun,
  children,
}: {
  orgs: Organization[];
  posts: Post[];
  dryRun: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <OrgProvider orgs={orgs} posts={posts}>
      <div className="flex min-h-screen">
        <Sidebar />
        <MobileNav />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar title={titleFor(pathname)} dryRun={dryRun} />
          {children}
        </div>
      </div>
    </OrgProvider>
  );
}
