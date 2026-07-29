import { ScrapingConsole } from "@/components/scrape/scraping-console";
import { getScrapedItems, getScrapeSchedules } from "@/lib/data";

export default async function ScrapingPage() {
  const [items, schedules] = await Promise.all([getScrapedItems(), getScrapeSchedules()]);
  return <ScrapingConsole items={items} schedules={schedules} />;
}
