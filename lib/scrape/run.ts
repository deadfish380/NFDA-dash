import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { crawlSite } from "./crawl";
import { mapWithConcurrency } from "./pool";
import type { ScrapeReport, ScrapeSiteResult } from "./types";

/**
 * The scrape cycle: for every website, run a sitemap-first shallow crawl. Each
 * page is fetched conditionally, so an unchanged page returns 304 and is skipped
 * without downloading; changed pages are stored as new content versions. The
 * per-site rollup lets the UI show exactly what happened. This is the 6am job.
 *
 * @param orgId optional — limit to one organization.
 */

// Websites are crawled in parallel (each crawl is itself bounded internally), but
// with a small cap so we never open dozens of concurrent crawls at once.
const SITE_CONCURRENCY = 3;

export async function runScrape(orgId?: string): Promise<ScrapeReport> {
  const sites = orgId
    ? await db.select().from(schema.websites).where(eq(schema.websites.orgId, orgId))
    : await db.select().from(schema.websites);

  const results: ScrapeSiteResult[] = await mapWithConcurrency(sites, SITE_CONCURRENCY, crawlSite);

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
        const p = r.pages;
        console.log(
          `  ${r.status === "failed" ? "✗" : "✓"} ${r.label} — ${r.status} ` +
            `(${p.discovered} pages: ${p.changed} changed, ${p.unchanged} unchanged, ${p.failed} failed)`,
        );
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
