"use client";

import { CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { scrapeOrg } from "@/app/actions";
import { Button } from "@/components/ui/button";
import type { ScrapeReport, ScrapeSiteResult } from "@/lib/scrape/types";
import { cn } from "@/lib/utils";

const STATUS_STYLE: Record<ScrapeSiteResult["status"], { label: string; dot: string }> = {
  new: { label: "New content stored", dot: "bg-brand-500" },
  updated: { label: "Updated — new version stored", dot: "bg-brand-400" },
  unchanged: { label: "Unchanged — skipped (no duplicate)", dot: "bg-muted-foreground/50" },
  failed: { label: "Failed", dot: "bg-danger" },
};

export function ScrapePanel({ orgId }: { orgId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [report, setReport] = useState<ScrapeReport | null>(null);

  function run() {
    startTransition(async () => {
      const r = await scrapeOrg(orgId);
      setReport(r);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Scraping</span>
        <Button size="sm" variant="outline" onClick={run} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {isPending ? "Reading websites…" : "Scrape now"}
        </Button>
      </div>

      {report ? (
        <div className="rounded-md border border-border bg-muted/40 p-3">
          <div className="mb-2 text-xs text-muted-foreground">
            {report.summary.new} new · {report.summary.updated} updated · {report.summary.unchanged} unchanged ·{" "}
            {report.summary.failed} failed
          </div>
          <ul className="space-y-1.5">
            {report.results.map((r) => {
              const s = STATUS_STYLE[r.status];
              return (
                <li key={r.url} className="flex items-start gap-2 text-xs">
                  {r.status === "failed" ? (
                    <XCircle className="mt-0.5 size-3.5 shrink-0 text-danger" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={cn("size-1.5 rounded-full", s.dot)} />
                      <span className="font-medium">{r.label}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {s.label}
                      {r.status !== "failed" && r.status !== "unchanged"
                        ? ` · ${r.chars.toLocaleString()} chars${r.hasImage ? " · image found" : ""}`
                        : ""}
                      {r.message ? ` · ${r.message}` : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Reads each website above, stores new/changed content, and skips anything unchanged.
        </p>
      )}
    </div>
  );
}
