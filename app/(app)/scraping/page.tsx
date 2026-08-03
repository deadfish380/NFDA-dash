import { ScrapingConsole } from "@/components/scrape/scraping-console";
import { getCrawledPages, getScrapeSchedules } from "@/lib/data";

export default async function ScrapingPage() {
  const [pages, schedules] = await Promise.all([getCrawledPages(), getScrapeSchedules()]);
  return <ScrapingConsole pages={pages} schedules={schedules} />;
}
