"use client";

import { Facebook, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { connectSelectedPage } from "@/app/actions";

/**
 * The page list on /connect. Connecting runs the server action and then does a
 * FULL-PAGE navigation to /organizations — a server-action redirect races with
 * the cookie/refresh and leaves the tab spinning, so we navigate hard instead.
 */
export function PagePicker({
  orgId,
  pages,
}: {
  orgId: string;
  pages: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  function connect(id: string) {
    setBusyId(id);
    start(async () => {
      await connectSelectedPage(orgId, id);
      window.location.assign("/organizations");
    });
  }

  return (
    <div className="space-y-2">
      {pages.map((page) => (
        <button
          key={page.id}
          type="button"
          onClick={() => connect(page.id)}
          disabled={pending}
          className="flex w-full items-center gap-3 rounded-md border border-border p-3 text-left transition-colors hover:bg-muted disabled:opacity-60"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Facebook className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{page.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">Page ID {page.id}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary">
            {busyId === page.id ? <Loader2 className="size-4 animate-spin" /> : null}
            {busyId === page.id ? "Connecting…" : "Connect"}
          </span>
        </button>
      ))}
    </div>
  );
}
