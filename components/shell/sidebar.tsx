"use client";

import {
  LayoutDashboard,
  Inbox,
  Sparkles,
  Waypoints,
  Building2,
  Plug,
  Settings,
  HandCoins,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrgSwitcher } from "@/components/shell/org-switcher";
import { useShell } from "@/components/shell/shell-context";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard; soon?: boolean };

export const APP_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/queue", label: "Post Queue", icon: Inbox },
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/scraping", label: "Scraping", icon: Waypoints },
  { href: "/organizations", label: "Organizations", icon: Building2 },
  { href: "/connections", label: "Connections", icon: Plug },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/grants", label: "Grants", icon: HandCoins, soon: true },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
      {APP_NAV.map(({ href, label, icon: Icon, soon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors md:py-2",
              active
                ? "bg-accent text-accent-foreground"
                : "text-sidebar-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-[18px] shrink-0" />
            <span className="flex-1">{label}</span>
            {soon ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Soon
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function Footer() {
  return (
    <div className="border-t border-border p-3">
      <p className="px-2 text-[11px] leading-relaxed text-muted-foreground">
        Reads your websites, writes posts, you approve — then it posts to Facebook.
      </p>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
      <OrgSwitcher />
      <NavLinks />
      <Footer />
    </aside>
  );
}

export function MobileNav() {
  const { mobileNavOpen, closeMobileNav } = useShell();

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        tabIndex={mobileNavOpen ? 0 : -1}
        className={cn(
          "fixed inset-0 z-40 bg-brand-900/40 backdrop-blur-[2px] transition-opacity duration-200 md:hidden",
          mobileNavOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={closeMobileNav}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] flex-col border-r border-border bg-sidebar shadow-sm transition-transform duration-200 ease-out md:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full pointer-events-none",
        )}
        aria-hidden={!mobileNavOpen}
      >
        <div className="flex items-center justify-between gap-2 pr-2">
          <div className="flex-1">
            <OrgSwitcher />
          </div>
          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMobileNav}
            className="mt-3 flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <NavLinks onNavigate={closeMobileNav} />
        <Footer />
      </aside>
    </>
  );
}
