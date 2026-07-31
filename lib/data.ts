import "server-only";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Organization, Post, Website } from "@/lib/mock-data";
import type { ScrapedItem } from "@/lib/scrape/types";

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

/** Every stored content row, newest first — for the scraping-console table. */
export async function getScrapedItems(): Promise<ScrapedItem[]> {
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
    .orderBy(desc(schema.contentItems.scrapedAt));

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
