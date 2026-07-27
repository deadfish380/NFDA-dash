"use client";

import { Check, ChevronsUpDown, Fish } from "lucide-react";
import { useState } from "react";
import { useOrg } from "@/components/shell/org-context";
import { cn } from "@/lib/utils";

/** Compact org picker at the top of the sidebar — the multi-org entry point. */
export function OrgSwitcher() {
  const { orgs, activeOrg, setActiveOrgId } = useOrg();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative px-3 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-md border border-border bg-card px-2.5 py-2 text-left transition-colors hover:bg-muted"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Fish className="size-4" />
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold">{activeOrg.shortName}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {activeOrg.websites.length} site{activeOrg.websites.length === 1 ? "" : "s"}
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close org menu"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-3 right-3 z-20 mt-1 overflow-hidden rounded-md border border-border bg-card p-1 shadow-lg">
            {orgs.map((org) => {
              const active = org.id === activeOrg.id;
              return (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => {
                    setActiveOrgId(org.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors",
                    active ? "bg-accent text-accent-foreground" : "hover:bg-muted",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{org.shortName}</span>
                    <span className="block truncate text-[11px] text-muted-foreground">{org.name}</span>
                  </span>
                  {active ? <Check className="size-4 shrink-0" /> : null}
                </button>
              );
            })}
          </div>
        </>
      ) : null}
    </div>
  );
}
