import * as cheerio from "cheerio";

export type ScrapedPage = {
  sourceUrl: string;
  title: string | null;
  body: string;
  imageUrl: string | null;
};

const UA =
  "Mozilla/5.0 (compatible; NFDA-Dashboard/1.0; +https://www.nfdadecoys.org)";

/**
 * Fetch a single page and pull the useful bits: a title, the main readable text,
 * and a lead image. Pure — no DB. The runner (run.ts) decides what to store.
 */
export async function scrapePage(url: string): Promise<ScrapedPage> {
  const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
  if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  // Strip non-content nodes before reading text.
  $("script, style, noscript, nav, footer, header, form, svg, iframe").remove();

  const title =
    $('meta[property="og:title"]').attr("content") ??
    $("title").first().text().trim() ??
    $("h1").first().text().trim() ??
    null;

  const image = absolutize(
    $('meta[property="og:image"]').attr("content") ??
      $('meta[name="twitter:image"]').attr("content") ??
      $("img").first().attr("src") ??
      null,
    url,
  );

  const root = $("main").length ? $("main") : $("article").length ? $("article") : $("body");
  const body = root
    .text()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000); // enough context for the model, without dumping the whole DOM

  return { sourceUrl: url, title: title?.slice(0, 300) ?? null, body, imageUrl: image };
}

function absolutize(src: string | null, base: string): string | null {
  if (!src) return null;
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}
