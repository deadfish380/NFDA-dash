/** Per-page counts rolled up for a website's crawl. */
export type CrawlPageCounts = {
  discovered: number; // total URLs considered
  changed: number; // new or updated content stored
  unchanged: number; // 304 or identical hash — skipped
  failed: number; // fetch/parse error
};

/** Per-website outcome of a scrape run (shared server ↔ client, no server imports). */
export type ScrapeSiteResult = {
  label: string;
  url: string;
  // Site-level rollup: "new" first crawl, "updated" if any page changed,
  // "unchanged" if nothing changed, "failed" if the site was unreachable.
  status: "new" | "updated" | "unchanged" | "failed";
  chars: number; // total chars of changed content this run
  title: string | null; // seed page title
  hasImage: boolean; // any crawled page had a lead image
  pages: CrawlPageCounts;
  message?: string;
};

export type ScrapeReport = {
  results: ScrapeSiteResult[];
  summary: { new: number; updated: number; unchanged: number; failed: number };
};

/** A stored content row, shaped for the scraping-console table. */
export type ScrapedItem = {
  id: string;
  orgId: string;
  websiteLabel: string;
  sourceUrl: string;
  title: string | null;
  chars: number;
  hasImage: boolean;
  scrapedAt: string;
};

/** Current crawl state of one URL — the provenance view (serializable DTO). */
export type CrawledPage = {
  id: string;
  orgId: string;
  websiteId: string;
  websiteLabel: string;
  url: string;
  title: string | null;
  status: "crawled" | "unchanged" | "failed";
  chars: number;
  hasImage: boolean;
  discoveredVia: string;
  error: string | null;
  lastCrawledAt: string | null;
};
