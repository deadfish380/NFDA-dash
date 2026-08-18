import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Organization, Post, Website } from "@/lib/mock-data";
import type { CrawledPage, ScrapedItem } from "@/lib/scrape/types";

/**
 * Server-only data access. Reads DB rows and maps them to the serializable DTO
 * shapes the client UI already renders (dates → ISO strings). Never import this
 * from a client component — it pulls in the postgres driver.
 */

// A flaky connection can hand back a garbled timestamp that parses into an
// invalid Date; fail soft (null) instead of crashing the whole page render.
function toISOStringOrNull(d: Date | null): string | null {
  if (!d || Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toWebsite(w: typeof schema.websites.$inferSelect): Website {
  return {
    id: w.id,
    url: w.url,
    label: w.label,
    status: w.status === "connected" ? "connected" : "pending",
    lastScrapedAt: toISOStringOrNull(w.lastScrapedAt),
  };
}

function toOrg(o: typeof schema.organizations.$inferSelect, websites: Website[]): Organization {
  return {
    id: o.id,
    name: o.name,
    shortName: o.shortName,
    facebookPage: o.facebookPage,
    facebookPageId: o.facebookPageId,
    facebookConnected: o.facebookConnected,
    storeUrl: o.storeUrl,
    postsPerDay: o.postsPerDay,
    postingTimes: o.postingTimes,
    autoApprove: o.autoApprove,
    brandVoice: o.brandVoice,
    websites,
  };
}

function toPost(p: typeof schema.posts.$inferSelect): Post {
  return {
    id: p.id,
    orgId: p.orgId,
    status: p.status as Post["status"],
    headline: p.headline,
    body: p.body,
    cta: p.cta,
    link: p.link,
    sourceWebsite: p.sourceWebsite,
    imageHint: p.imageHint,
    imageUrl: p.imageUrl,
    scheduledFor: toISOStringOrNull(p.scheduledFor),
    createdAt: toISOStringOrNull(p.createdAt) ?? new Date(0).toISOString(),
  };
}

export async function getOrganizations(): Promise<Organization[]> {
  const [orgs, sites] = await Promise.all([
    db.select().from(schema.organizations).orderBy(asc(schema.organizations.createdAt)),
    db.select().from(schema.websites).orderBy(asc(schema.websites.createdAt)),
  ]);
  return orgs.map((o) => toOrg(o, sites.filter((s) => s.orgId === o.id).map(toWebsite)));
}

export async function getAllPosts(): Promise<Post[]> {
  const rows = await db.select().from(schema.posts).orderBy(desc(schema.posts.createdAt));
  return rows.map(toPost);
}

/**
 * Recent stored content rows, newest first — for the scraping-console table.
 * Bounded so a long history never ships the whole table to the client.
 */
export async function getScrapedItems(limit = 500): Promise<ScrapedItem[]> {
  const rows = await db
    .select({
      id: schema.contentItems.id,
      orgId: schema.contentItems.orgId,
      sourceUrl: schema.contentItems.sourceUrl,
      title: schema.contentItems.title,
      body: schema.contentItems.body,
      imageUrl: schema.contentItems.imageUrl,
      scrapedAt: schema.contentItems.scrapedAt,
      websiteLabel: schema.websites.label,
    })
    .from(schema.contentItems)
    .leftJoin(schema.websites, eq(schema.contentItems.websiteId, schema.websites.id))
    .orderBy(desc(schema.contentItems.scrapedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    websiteLabel: r.websiteLabel ?? r.sourceUrl.replace(/^https?:\/\//, ""),
    sourceUrl: r.sourceUrl,
    title: r.title,
    chars: r.body.length,
    hasImage: Boolean(r.imageUrl),
    scrapedAt: toISOStringOrNull(r.scrapedAt) ?? new Date(0).toISOString(),
  }));
}

/**
 * Current crawl state of every discovered URL — powers the coverage view. One
 * row per page (not versioned), newest crawl first. Bounded for safety.
 */
export async function getCrawledPages(limit = 2000): Promise<CrawledPage[]> {
  const rows = await db
    .select({
      id: schema.pages.id,
      orgId: schema.pages.orgId,
      websiteId: schema.pages.websiteId,
      url: schema.pages.url,
      title: schema.pages.title,
      status: schema.pages.status,
      chars: schema.pages.chars,
      hasImage: schema.pages.hasImage,
      discoveredVia: schema.pages.discoveredVia,
      error: schema.pages.error,
      lastCrawledAt: schema.pages.lastCrawledAt,
      websiteLabel: schema.websites.label,
    })
    .from(schema.pages)
    .leftJoin(schema.websites, eq(schema.pages.websiteId, schema.websites.id))
    .orderBy(desc(schema.pages.lastCrawledAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    orgId: r.orgId,
    websiteId: r.websiteId,
    websiteLabel: r.websiteLabel ?? r.url.replace(/^https?:\/\//, ""),
    url: r.url,
    title: r.title,
    status: (r.status as CrawledPage["status"]) ?? "crawled",
    chars: r.chars,
    hasImage: r.hasImage,
    discoveredVia: r.discoveredVia,
    error: r.error,
    lastCrawledAt: toISOStringOrNull(r.lastCrawledAt),
  }));
}

/** Per-org daily scrape time (HH:MM), keyed by org id. */
export async function getScrapeSchedules(): Promise<Record<string, string>> {
  const rows = await db
    .select({ id: schema.organizations.id, scrapeTime: schema.organizations.scrapeTime })
    .from(schema.organizations);
  return Object.fromEntries(rows.map((r) => [r.id, r.scrapeTime]));
}

/** Concatenated scraped content for one org — the material the AI writes from. */
export async function getOrgContent(orgId: string): Promise<string> {
  const rows = await db
    .select({ body: schema.contentItems.body })
    .from(schema.contentItems)
    .where(eq(schema.contentItems.orgId, orgId));
  return rows.map((r) => r.body).join("\n\n");
}

export type ContentSource = {
  id: string;
  sourceUrl: string;
  title: string | null;
  body: string;
  imageUrl: string | null;
};

/**
 * One row per source URL for an org — the latest scraped version of each page —
 * so the generation pipeline can rotate through distinct pages instead of blending
 * the whole site into one blob. Newest content first.
 */
export async function getOrgContentSources(orgId: string): Promise<ContentSource[]> {
  const rows = await db
    .select({
      id: schema.contentItems.id,
      sourceUrl: schema.contentItems.sourceUrl,
      title: schema.contentItems.title,
      body: schema.contentItems.body,
      imageUrl: schema.contentItems.imageUrl,
      scrapedAt: schema.contentItems.scrapedAt,
    })
    .from(schema.contentItems)
    .where(eq(schema.contentItems.orgId, orgId))
    .orderBy(desc(schema.contentItems.scrapedAt));

  // Keep only the newest version of each URL, preserving newest-first order.
  const seen = new Set<string>();
  const out: ContentSource[] = [];
  for (const r of rows) {
    if (seen.has(r.sourceUrl)) continue;
    seen.add(r.sourceUrl);
    out.push({ id: r.id, sourceUrl: r.sourceUrl, title: r.title, body: r.body, imageUrl: r.imageUrl });
  }
  return out;
}
