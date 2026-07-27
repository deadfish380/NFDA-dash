"use client";

import { Facebook, Menu } from "lucide-react";
import { useOrg } from "@/components/shell/org-context";
import { useShell } from "@/components/shell/shell-context";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({ title }: { title: string }) {
  const { openMobileNav } = useShell();
  const { activeOrg } = useOrg();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-3 backdrop-blur sm:h-16 sm:gap-4 sm:px-5">
      <button
        type="button"
        aria-label="Open menu"
        onClick={openMobileNav}
        className="flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
      >
        <Menu className="size-5" />
      </button>

      <h1 className="min-w-0 truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>

      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium sm:inline-flex",
            activeOrg.facebookConnected ? "text-foreground/80" : "text-muted-foreground",
          )}
        >
          <Facebook
            className={cn("size-3.5", activeOrg.facebookConnected ? "text-primary" : "text-muted-foreground")}
          />
          {activeOrg.facebookConnected ? "Facebook connected" : "Not connected"}
        </span>
        <ThemeToggle />
      </div>
    </header>
  );
}
