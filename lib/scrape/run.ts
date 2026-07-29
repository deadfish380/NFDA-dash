import { createHash } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { scrapePage } from "./scrape";
import type { ScrapeReport, ScrapeSiteResult } from "./types";

/**
 * The scrape cycle: read every website row, fetch it, and store the content —
 * but only if it has actually changed. Dedup is by a hash of the page body:
 *   • no prior copy      → "new"       (insert)
 *   • body changed       → "updated"   (insert a new version)
 *   • body identical     → "unchanged" (skip — no duplicate row)
 * Returns a per-site report so the UI can show exactly what happened.
 *
 * @param orgId optional — limit to one organization.
 */
export async function runScrape(orgId?: string): Promise<ScrapeReport> {
  const sites = orgId
    ? await db.select().from(schema.websites).where(eq(schema.websites.orgId, orgId))
    : await db.select().from(schema.websites);

  const results: ScrapeSiteResult[] = [];

  for (const site of sites) {
    try {
      const page = await scrapePage(site.url);
      const hash = createHash("sha256").update(page.body).digest("hex");

      // Most recent stored copy of this exact page.
      const [latest] = await db
        .select({ hash: schema.contentItems.contentHash })
        .from(schema.contentItems)
        .where(eq(schema.contentItems.sourceUrl, page.sourceUrl))
        .orderBy(desc(schema.contentItems.scrapedAt))
        .limit(1);

      let status: ScrapeSiteResult["status"];
      if (!latest) status = "new";
      else if (latest.hash === hash) status = "unchanged";
      else status = "updated";

      if (status !== "unchanged") {
        await db.insert(schema.contentItems).values({
          orgId: site.orgId,
          websiteId: site.id,
          sourceUrl: page.sourceUrl,
          title: page.title,
          body: page.body,
          imageUrl: page.imageUrl,
          contentHash: hash,
        });
      }

      await db
        .update(schema.websites)
        .set({ status: "connected", lastScrapedAt: new Date() })
        .where(eq(schema.websites.id, site.id));

      results.push({
        label: site.label,
        url: site.url,
        status,
        chars: page.body.length,
        title: page.title,
        hasImage: Boolean(page.imageUrl),
      });
    } catch (err) {
      results.push({
        label: site.label,
        url: site.url,
        status: "failed",
        chars: 0,
        title: null,
        hasImage: false,
        message: (err as Error).message,
      });
    }
  }

  const summary = {
    new: results.filter((r) => r.status === "new").length,
    updated: results.filter((r) => r.status === "updated").length,
    unchanged: results.filter((r) => r.status === "unchanged").length,
    failed: results.filter((r) => r.status === "failed").length,
  };

  return { results, summary };
}

// Allow running directly as a script: `npm run scrape`
if (process.argv[1]?.endsWith("run.ts")) {
  runScrape(process.argv[2])
    .then((report) => {
      for (const r of report.results) {
        const note = r.status === "unchanged" ? "(skipped — unchanged)" : `${r.chars} chars`;
        console.log(`  ${r.status === "failed" ? "✗" : "✓"} ${r.label} — ${r.status} ${note}`);
      }
      const s = report.summary;
      console.log(`Done: ${s.new} new, ${s.updated} updated, ${s.unchanged} unchanged, ${s.failed} failed.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
