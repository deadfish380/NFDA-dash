/** Per-website outcome of a scrape run (shared server ↔ client, no server imports). */
export type ScrapeSiteResult = {
  label: string;
  url: string;
  status: "new" | "updated" | "unchanged" | "failed";
  chars: number;
  title: string | null;
  hasImage: boolean;
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
