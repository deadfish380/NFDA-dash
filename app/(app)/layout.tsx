"use client";

import { usePathname } from "next/navigation";
import { APP_NAV, MobileNav, Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

function titleFor(pathname: string): string {
  const item = APP_NAV.find((i) => (i.href === "/" ? pathname === "/" : pathname.startsWith(i.href)));
  return item?.label ?? "Dashboard";
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <MobileNav />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={titleFor(pathname)} />
        {children}
      </div>
    </div>
  );
}
