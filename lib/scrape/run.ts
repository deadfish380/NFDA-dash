import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { scrapePage } from "./scrape";

/**
 * The scrape cycle: read every website row, fetch it, store the content, and mark
 * the site "connected". In Week 2 this runs on a schedule (the 6am job) and after
 * a user adds a new website. Runnable now with: npm run scrape
 *
 * @param orgId optional — limit to one organization.
 */
export async function runScrape(orgId?: string): Promise<{ scraped: number; failed: number }> {
  const sites = orgId
    ? await db.select().from(schema.websites).where(eq(schema.websites.orgId, orgId))
    : await db.select().from(schema.websites);

  let scraped = 0;
  let failed = 0;

  for (const site of sites) {
    try {
      const page = await scrapePage(site.url);
      await db.insert(schema.contentItems).values({
        orgId: site.orgId,
        websiteId: site.id,
        sourceUrl: page.sourceUrl,
        title: page.title,
        body: page.body,
        imageUrl: page.imageUrl,
      });
      await db
        .update(schema.websites)
        .set({ status: "connected", lastScrapedAt: new Date() })
        .where(eq(schema.websites.id, site.id));
      scraped++;
      console.log(`  ✓ ${site.label} — ${page.body.length} chars`);
    } catch (err) {
      failed++;
      console.warn(`  ✗ ${site.label} — ${(err as Error).message}`);
    }
  }

  return { scraped, failed };
}

// Allow running directly as a script.
if (process.argv[1]?.endsWith("run.ts")) {
  runScrape(process.argv[2])
    .then((r) => {
      console.log(`Scrape complete: ${r.scraped} ok, ${r.failed} failed.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
