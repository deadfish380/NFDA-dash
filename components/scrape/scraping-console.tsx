"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Globe,
  ImageIcon,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ScrapeCanvas } from "@/components/scrape/scrape-canvas";
import { Reveal } from "@/components/motion/reveal";
import { useOrg } from "@/components/shell/org-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { scrapeOrg, setScrapeTime } from "@/app/actions";
import type { CrawledPage, ScrapeReport } from "@/lib/scrape/types";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type SiteGroup = {
  websiteId: string;
  label: string;
  pages: CrawledPage[];
  total: number;
  fresh: number; // last crawl stored new/updated content
  unchanged: number; // skipped — already had it
  failed: number;
  lastCrawledAt: string | null;
};

export function ScrapingConsole({
  pages,
  schedules,
}: {
  pages: CrawledPage[];
  schedules: Record<string, string>;
}) {
  const { activeOrg } = useOrg();
  const router = useRouter();
  const [isScraping, startScrape] = useTransition();
  const [savingTime, startSaveTime] = useTransition();
  const [report, setReport] = useState<ScrapeReport | null>(null);
  const [time, setTime] = useState(schedules[activeOrg.id] ?? "06:00");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const orgPages = useMemo(() => pages.filter((p) => p.orgId === activeOrg.id), [pages, activeOrg.id]);

  // Group pages by website, ordered to match the org's website list.
  const groups = useMemo<SiteGroup[]>(() => {
    const byId = new Map<string, CrawledPage[]>();
    for (const p of orgPages) {
      const arr = byId.get(p.websiteId) ?? [];
      arr.push(p);
      byId.set(p.websiteId, arr);
    }
    return activeOrg.websites.map((w) => {
      const wp = (byId.get(w.id) ?? []).sort((a, b) => b.chars - a.chars);
      return {
        websiteId: w.id,
        label: w.label,
        pages: wp,
        total: wp.length,
        fresh: wp.filter((p) => p.status === "crawled").length,
        unchanged: wp.filter((p) => p.status === "unchanged").length,
        failed: wp.filter((p) => p.status === "failed").length,
        lastCrawledAt:
          wp.map((p) => p.lastCrawledAt).filter(Boolean).sort().at(-1) ?? w.lastScrapedAt ?? null,
      };
    });
  }, [orgPages, activeOrg.websites]);

  const totalPages = orgPages.length;

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

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <main className="flex-1 space-y-5 p-5 sm:p-6">
      <Reveal>
        <h2 className="text-lg font-semibold tracking-tight sm:text-xl">Scraping — {activeOrg.shortName}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Every page we&apos;ve read from {activeOrg.name}&apos;s websites. Unchanged pages are skipped automatically on
          each run.
        </p>
      </Reveal>

      <Reveal>
        <ScrapeCanvas websiteCount={activeOrg.websites.length} itemCount={totalPages} active={isScraping} />
      </Reveal>

      {/* Controls: scrape now + schedule */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Websites</CardTitle>
              <Button size="sm" onClick={scrape} disabled={isScraping}>
                {isScraping ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                {isScraping ? "Crawling…" : "Scrape now"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {groups.map((g) => (
                <div key={g.websiteId} className="rounded-md border border-border px-3 py-2">
                  <div className="flex items-center gap-3">
                    <Globe className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{g.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {g.lastCrawledAt ? `Last crawled ${dateFmt.format(new Date(g.lastCrawledAt))}` : "Not crawled yet"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums">{g.total}</div>
                      <div className="text-[11px] text-muted-foreground">pages</div>
                    </div>
                  </div>
                </div>
              ))}

              {report ? (
                <div className="mt-2 rounded-md border border-border bg-muted/40 p-3">
                  <div className="mb-1.5 text-xs text-muted-foreground">Last run</div>
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
                          — {r.pages.discovered} pages · {r.pages.changed} changed · {r.pages.unchanged} unchanged
                          {r.pages.failed ? ` · ${r.pages.failed} failed` : ""}
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
                Automatic daily crawl
              </div>
              <Input type="time" value={time} onChange={(e) => saveTime(e.target.value)} disabled={savingTime} />
              <p className="text-xs text-muted-foreground">
                Runs every day at this time in production. {savingTime ? "Saving…" : "Saved automatically."}
              </p>
            </CardContent>
          </Card>
        </Reveal>
      </div>

      {/* Per-site crawl coverage */}
      <Reveal>
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Crawl coverage ({totalPages} pages)</CardTitle>
            <span className="text-xs text-muted-foreground">Click a site to see every page</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {totalPages === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nothing crawled yet — hit “Scrape now”.</p>
            ) : (
              groups.map((g) => {
                const open = expanded.has(g.websiteId);
                return (
                  <div key={g.websiteId} className="overflow-hidden rounded-md border border-border">
                    <button
                      type="button"
                      onClick={() => toggle(g.websiteId)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60"
                    >
                      {open ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">{g.label}</span>
                      <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Pill tone="brand">{g.total} pages</Pill>
                        {g.fresh > 0 ? <Pill tone="brand">{g.fresh} fresh</Pill> : null}
                        {g.unchanged > 0 ? <Pill tone="muted">{g.unchanged} unchanged</Pill> : null}
                        {g.failed > 0 ? <Pill tone="danger">{g.failed} failed</Pill> : null}
                      </span>
                    </button>

                    {open ? (
                      <div className="overflow-x-auto border-t border-border">
                        <table className="w-full min-w-[640px] text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                              <th className="px-3 py-2 font-medium">Page</th>
                              <th className="px-3 py-2 font-medium">Status</th>
                              <th className="px-3 py-2 text-right font-medium">Chars</th>
                              <th className="px-3 py-2 font-medium">Image</th>
                              <th className="px-3 py-2 font-medium">Found via</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.pages.map((p) => (
                              <tr key={p.id} className="border-b border-border/60 last:border-0">
                                <td className="max-w-sm px-3 py-2 align-top">
                                  <div className="truncate font-medium">{pathOf(p.url)}</div>
                                  {p.title ? (
                                    <div className="truncate text-[11px] text-muted-foreground">{p.title}</div>
                                  ) : null}
                                  {p.error ? (
                                    <div className="mt-0.5 flex items-center gap-1 text-[11px] text-danger">
                                      <AlertTriangle className="size-3" />
                                      {p.error}
                                    </div>
                                  ) : null}
                                </td>
                                <td className="px-3 py-2 align-top">
                                  <PageStatus status={p.status} />
                                </td>
                                <td className="px-3 py-2 text-right align-top tabular-nums text-muted-foreground">
                                  {p.chars.toLocaleString()}
                                </td>
                                <td className="px-3 py-2 align-top">
                                  {p.hasImage ? (
                                    <ImageIcon className="size-4 text-brand-500" />
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 align-top text-muted-foreground">{p.discoveredVia}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </Reveal>
    </main>
  );
}

function Pill({ tone, children }: { tone: "brand" | "muted" | "danger"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
        tone === "brand" && "bg-muted text-foreground/80",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "danger" && "bg-danger/10 text-danger",
      )}
    >
      {children}
    </span>
  );
}

function PageStatus({ status }: { status: CrawledPage["status"] }) {
  const map = {
    crawled: { label: "Fresh", dot: "bg-brand-500", text: "text-foreground/80" },
    unchanged: { label: "Unchanged", dot: "bg-muted-foreground", text: "text-muted-foreground" },
    failed: { label: "Failed", dot: "bg-danger", text: "text-danger" },
  } as const;
  const s = map[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", s.text)}>
      <span className={cn("size-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? "/ (home)" : u.pathname;
  } catch {
    return url;
  }
}
