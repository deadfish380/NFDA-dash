"use client";

import { CheckCircle2, Clock, Globe, ImageIcon, Loader2, RefreshCw, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ScrapeCanvas } from "@/components/scrape/scrape-canvas";
import { Reveal } from "@/components/motion/reveal";
import { useOrg } from "@/components/shell/org-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { scrapeOrg, setScrapeTime } from "@/app/actions";
import type { ScrapedItem, ScrapeReport } from "@/lib/scrape/types";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function ScrapingConsole({
  items,
  schedules,
}: {
  items: ScrapedItem[];
  schedules: Record<string, string>;
}) {
  const { activeOrg } = useOrg();
  const router = useRouter();
  const [isScraping, startScrape] = useTransition();
  const [savingTime, startSaveTime] = useTransition();
  const [report, setReport] = useState<ScrapeReport | null>(null);
  const [time, setTime] = useState(schedules[activeOrg.id] ?? "06:00");

  const orgItems = items.filter((i) => i.orgId === activeOrg.id);

  function scrape() {
    startScrape(async () => {
      const r = await scrapeOrg(activeOrg.id);
      setReport(r);
      router.refresh();
    });
  }

  function saveTime(next: string) {
    setTime(next);
    startSaveTime(async () => {
      await setScrapeTime(activeOrg.id, next);
      router.refresh();
    });
  }

  return (
    <main className="flex-1 space-y-5 p-5 sm:p-6">
      <Reveal>
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Scraping — {activeOrg.shortName}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Read {activeOrg.name}&apos;s websites into the database. Unchanged pages are skipped automatically.
        </p>
      </Reveal>

      {/* Animated pipeline */}
      <Reveal>
        <ScrapeCanvas websiteCount={activeOrg.websites.length} itemCount={orgItems.length} active={isScraping} />
      </Reveal>

      {/* Controls: scrape now + schedule */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Sources</CardTitle>
              <Button size="sm" onClick={scrape} disabled={isScraping}>
                {isScraping ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                {isScraping ? "Reading…" : "Scrape now"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {activeOrg.websites.map((w) => (
                <div key={w.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                  <Globe className="size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{w.label}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {w.lastScrapedAt ? `Last read ${dateFmt.format(new Date(w.lastScrapedAt))}` : "Not read yet"}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-1 text-[11px] font-medium",
                      w.status === "connected" ? "text-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", w.status === "connected" ? "bg-brand-500" : "bg-warning")} />
                    {w.status === "connected" ? "Reading" : "Pending"}
                  </span>
                </div>
              ))}

              {report ? (
                <div className="mt-2 rounded-md border border-border bg-muted/40 p-3">
                  <div className="mb-1.5 text-xs text-muted-foreground">
                    {report.summary.new} new · {report.summary.updated} updated · {report.summary.unchanged} unchanged ·{" "}
                    {report.summary.failed} failed
                  </div>
                  <ul className="space-y-1">
                    {report.results.map((r) => (
                      <li key={r.url} className="flex items-center gap-2 text-xs">
                        {r.status === "failed" ? (
                          <XCircle className="size-3.5 shrink-0 text-danger" />
                        ) : (
                          <CheckCircle2 className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                        <span className="font-medium">{r.label}</span>
                        <span className="text-muted-foreground">
                          — {r.status}
                          {r.status !== "unchanged" && r.status !== "failed" ? ` (${r.chars.toLocaleString()} chars)` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </Reveal>

        <Reveal>
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="size-4" />
                Automatic daily scrape
              </div>
              <Input type="time" value={time} onChange={(e) => saveTime(e.target.value)} disabled={savingTime} />
              <p className="text-xs text-muted-foreground">
                Runs every day at this time in production. {savingTime ? "Saving…" : "Saved automatically."}
              </p>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      {/* What's in the database */}
      <Reveal>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Stored content ({orgItems.length})</CardTitle>
            <span className="text-xs text-muted-foreground">Newest first</span>
          </CardHeader>
          <CardContent>
            {orgItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing scraped yet — hit “Scrape now”.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Website</th>
                      <th className="pb-2 pr-3 font-medium">Title</th>
                      <th className="pb-2 pr-3 text-right font-medium">Chars</th>
                      <th className="pb-2 pr-3 font-medium">Image</th>
                      <th className="pb-2 font-medium">Scraped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgItems.map((it) => (
                      <tr key={it.id} className="border-b border-border/60 last:border-0">
                        <td className="py-2 pr-3 align-top">
                          <span className="font-medium">{it.websiteLabel}</span>
                        </td>
                        <td className="max-w-xs py-2 pr-3 align-top">
                          <span className="line-clamp-1 text-muted-foreground">{it.title ?? "—"}</span>
                        </td>
                        <td className="py-2 pr-3 text-right align-top tabular-nums text-muted-foreground">
                          {it.chars.toLocaleString()}
                        </td>
                        <td className="py-2 pr-3 align-top">
                          {it.hasImage ? (
                            <ImageIcon className="size-4 text-brand-500" />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 align-top text-muted-foreground">{dateFmt.format(new Date(it.scrapedAt))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </Reveal>
    </main>
  );
}
