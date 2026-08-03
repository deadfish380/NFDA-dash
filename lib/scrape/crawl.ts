import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import {
  extractLinks,
  extractPage,
  fetchConditional,
  fetchHtml,
  normalizeUrl,
} from "./scrape";
import type { ScrapeSiteResult } from "./types";

// "Sitemap + shallow" crawl budget — enough to cover the important pages of a
// small org site without hammering it. Tune here, never per-site in code.
const MAX_PAGES = 50;
const MAX_DEPTH = 2; // links found while crawling are followed at most this deep
const PAGE_CONCURRENCY = 4;
const MAX_SITEMAPS = 5; // guard against sitemap-index fan-out
// Absolute wall-clock ceiling for one site. Per-page timeouts already bound this,
// but this guarantees a run ALWAYS ends even if a host misbehaves in a new way.
const MAX_CRAWL_MS = 120_000;

type SiteRow = typeof schema.websites.$inferSelect;
type QueueItem = { url: string; depth: number; via: "seed" | "sitemap" | "link" };

/**
 * Crawl one website: discover URLs (sitemap first, else follow same-origin links
 * up to MAX_DEPTH), fetch each with a conditional request so unchanged pages 304
 * and cost nothing, and store only content that actually changed. Every URL's
 * current state lives in `pages`; every changed body is appended to `content_items`.
 */
export async function crawlSite(site: SiteRow): Promise<ScrapeSiteResult> {
  const seed = normalizeUrl(site.url, site.url) ?? site.url;
  const seedHost = safeHost(seed);

  const priorRows = await db
    .select({
      url: schema.pages.url,
      etag: schema.pages.etag,
      lastModified: schema.pages.lastModified,
      contentHash: schema.pages.contentHash,
    })
    .from(schema.pages)
    .where(eq(schema.pages.websiteId, site.id));
  const prior = new Map(priorRows.map((r) => [r.url, r]));

  let sitemapUrls: string[] = [];
  try {
    sitemapUrls = await readSitemapUrls(seed, seedHost);
  } catch {
    // No sitemap is fine — we fall back to link-following below.
  }

  const deadline = Date.now() + MAX_CRAWL_MS;
  const seen = new Set<string>();
  const queue: QueueItem[] = [];
  const enqueue = (raw: string, depth: number, via: QueueItem["via"]) => {
    if (Date.now() > deadline) return; // stop growing the frontier once out of time
    const url = normalizeUrl(raw, seed);
    if (!url || seen.has(url)) return;
    if (safeHost(url) !== seedHost) return;
    if (seen.size >= MAX_PAGES) return;
    seen.add(url);
    queue.push({ url, depth, via });
  };

  enqueue(seed, 0, "seed");
  for (const u of sitemapUrls) enqueue(u, 0, "sitemap");
  for (const u of prior.keys()) enqueue(u, 0, "link");

  // With a sitemap or a known page set we already have the URL list; only a
  // first-ever crawl with neither needs live link-discovery (BFS).
  const haveUrlList = sitemapUrls.length > 0 || prior.size > 0;

  const counts = { discovered: 0, changed: 0, unchanged: 0, failed: 0 };
  let seedTitle: string | null = null;
  let anyImage = false;
  let changedChars = 0;
  let reachedAny = false;

  const processOne = async (item: QueueItem) => {
    // Out of time — drain the rest of the queue without touching the network.
    if (Date.now() > deadline) return;
    counts.discovered++;
    const before = prior.get(item.url);
    try {
      const cond = await fetchConditional(item.url, {
        etag: before?.etag,
        lastModified: before?.lastModified,
      });
      reachedAny = true;

      if (cond.status === 304) {
        counts.unchanged++;
        await touchUnchanged(site, item.url, cond.etag, cond.lastModified);
        return;
      }

      const page = extractPage(cond.html, item.url);
      const hash = createHash("sha256").update(page.body).digest("hex");
      if (item.url === seed) seedTitle = page.title;
      if (page.imageUrl) anyImage = true;

      // Only expand the frontier when there was no URL list to begin with.
      if (!haveUrlList && item.depth < MAX_DEPTH) {
        for (const link of extractLinks(cond.html, item.url)) enqueue(link, item.depth + 1, "link");
      }

      if (before?.contentHash === hash) {
        counts.unchanged++;
        await touchUnchanged(site, item.url, cond.etag, cond.lastModified);
        return;
      }

      counts.changed++;
      changedChars += page.body.length;
      await writeChanged(site, item, page, hash, cond.etag, cond.lastModified);
    } catch (err) {
      counts.failed++;
      await writeFailed(site, item, (err as Error).message);
    }
  };

  await drainQueue(queue, PAGE_CONCURRENCY, processOne);

  await db
    .update(schema.websites)
    .set({ status: reachedAny ? "connected" : "pending", lastScrapedAt: new Date() })
    .where(eq(schema.websites.id, site.id));

  const status: ScrapeSiteResult["status"] = !reachedAny
    ? "failed"
    : counts.changed === 0
      ? "unchanged"
      : prior.size === 0
        ? "new"
        : "updated";

  return {
    label: site.label,
    url: site.url,
    status,
    chars: changedChars,
    title: seedTitle,
    hasImage: anyImage,
    pages: counts,
    message: reachedAny ? undefined : "Site unreachable",
  };
}

// --- DB writes -------------------------------------------------------------

async function writeChanged(
  site: SiteRow,
  item: QueueItem,
  page: { title: string | null; body: string; imageUrl: string | null },
  hash: string,
  etag: string | null,
  lastModified: string | null,
) {
  const row = {
    title: page.title,
    etag,
    lastModified,
    contentHash: hash,
    status: "crawled" as const,
    chars: page.body.length,
    hasImage: Boolean(page.imageUrl),
    discoveredVia: item.via,
    error: null,
    lastCrawledAt: new Date(),
  };

  await db
    .insert(schema.pages)
    .values({ orgId: site.orgId, websiteId: site.id, url: item.url, ...row })
    .onConflictDoUpdate({ target: [schema.pages.websiteId, schema.pages.url], set: row });

  // Append the new body as a version — the history the AI writes from.
  await db.insert(schema.contentItems).values({
    orgId: site.orgId,
    websiteId: site.id,
    sourceUrl: item.url,
    title: page.title,
    body: page.body,
    imageUrl: page.imageUrl,
    contentHash: hash,
  });
}

async function touchUnchanged(
  site: SiteRow,
  url: string,
  etag: string | null,
  lastModified: string | null,
) {
  // Refresh validators when the server sent new ones; always bump the timestamp.
  const set: Record<string, unknown> = { status: "unchanged", lastCrawledAt: new Date() };
  if (etag) set.etag = etag;
  if (lastModified) set.lastModified = lastModified;
  await db
    .update(schema.pages)
    .set(set)
    .where(and(eq(schema.pages.websiteId, site.id), eq(schema.pages.url, url)));
}

async function writeFailed(site: SiteRow, item: QueueItem, message: string) {
  const err = message.slice(0, 300);
  await db
    .insert(schema.pages)
    .values({
      orgId: site.orgId,
      websiteId: site.id,
      url: item.url,
      status: "failed",
      discoveredVia: item.via,
      error: err,
      lastCrawledAt: new Date(),
    })
    // Keep any previously-good content hash/validators; just record the failure.
    .onConflictDoUpdate({
      target: [schema.pages.websiteId, schema.pages.url],
      set: { status: "failed", error: err, lastCrawledAt: new Date() },
    });
}

// --- Sitemap discovery -----------------------------------------------------

async function readSitemapUrls(seed: string, host: string): Promise<string[]> {
  const origin = new URL(seed).origin;
  const toVisit: string[] = [];
  const seenSitemaps = new Set<string>();

  // robots.txt often points at the real sitemap(s).
  try {
    const robots = await fetchHtml(`${origin}/robots.txt`);
    for (const m of robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)) toVisit.push(m[1]);
  } catch {
    // no robots — try the conventional location
  }
  toVisit.push(`${origin}/sitemap.xml`);

  const urls = new Set<string>();
  let budget = MAX_SITEMAPS;

  while (toVisit.length > 0 && budget > 0 && urls.size < MAX_PAGES) {
    const sm = toVisit.shift()!;
    if (seenSitemaps.has(sm)) continue;
    seenSitemaps.add(sm);
    budget--;

    let xml: string;
    try {
      xml = await fetchHtml(sm);
    } catch {
      continue;
    }

    const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
    if (/<sitemapindex/i.test(xml)) {
      for (const l of locs) toVisit.push(l); // nested sitemaps
      continue;
    }
    for (const l of locs) {
      const n = normalizeUrl(l, origin);
      if (n && safeHost(n) === host) urls.add(n);
      if (urls.size >= MAX_PAGES) break;
    }
  }

  return [...urls].slice(0, MAX_PAGES);
}

// --- Concurrency ------------------------------------------------------------

/**
 * Drain a queue that may GROW while draining (BFS enqueues as it goes), running
 * at most `limit` workers at once. Resolves when the queue is empty and idle.
 */
function drainQueue(
  queue: QueueItem[],
  limit: number,
  process: (item: QueueItem) => Promise<void>,
): Promise<void> {
  return new Promise((resolve) => {
    let active = 0;
    const pump = () => {
      if (queue.length === 0 && active === 0) return resolve();
      while (active < limit && queue.length > 0) {
        const item = queue.shift()!;
        active++;
        process(item)
          .catch(() => {})
          .finally(() => {
            active--;
            pump();
          });
      }
    };
    pump();
  });
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}
