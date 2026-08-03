import * as cheerio from "cheerio";

export type ScrapedPage = {
  sourceUrl: string;
  title: string | null;
  body: string;
  imageUrl: string | null;
};

/** Result of a conditional fetch — 304 means "unchanged, nothing downloaded". */
export type ConditionalFetch =
  | { status: 200; html: string; etag: string | null; lastModified: string | null }
  | { status: 304; html: null; etag: string | null; lastModified: string | null };

const UA =
  "Mozilla/5.0 (compatible; NFDA-Dashboard/1.0; +https://www.nfdadecoys.org)";

// A single page must not stall the whole run — `fetch` has no default timeout.
const FETCH_TIMEOUT_MS = 12_000;

// Skip obvious non-HTML endpoints when crawling links.
const NON_HTML = /\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|css|js|xml|ico|woff2?)($|\?)/i;

/**
 * Fetch a single page and pull the useful bits. Convenience wrapper around
 * fetch + extractPage — used by callers that don't care about caching validators.
 */
export async function scrapePage(url: string): Promise<ScrapedPage> {
  const html = await fetchHtml(url);
  return extractPage(html, url);
}

/**
 * Pure DOM → content. No network, no DB. Pulls a title, the main readable text,
 * and a lead image from already-fetched HTML so the crawler can hash and store it.
 */
export function extractPage(html: string, url: string): ScrapedPage {
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

/**
 * Same-origin, HTML-looking links from a page — the crawl frontier. Fragments and
 * query strings are dropped so `/events` and `/events#top` don't both get crawled.
 */
export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);
  const base = new URL(baseUrl);
  const out = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const norm = normalizeUrl(href, baseUrl);
    if (!norm) return;
    const u = new URL(norm);
    if (u.hostname !== base.hostname) return; // same origin only
    if (NON_HTML.test(u.pathname)) return;
    out.add(norm);
  });

  return [...out];
}

/** Absolute URL, stripped of hash and trailing slash; null if unparseable/non-http. */
export function normalizeUrl(href: string, base: string): string | null {
  try {
    const u = new URL(href, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    u.hash = "";
    let s = u.toString();
    if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
    return s;
  } catch {
    return null;
  }
}

/**
 * Conditional GET: send the stored ETag / Last-Modified so an unchanged page comes
 * back as 304 with no body — the whole point of "don't re-download what hasn't
 * changed". Returns validators from the response so we can store the fresh ones.
 */
export async function fetchConditional(
  url: string,
  validators: { etag?: string | null; lastModified?: string | null },
): Promise<ConditionalFetch> {
  const headers: Record<string, string> = { "user-agent": UA };
  if (validators.etag) headers["if-none-match"] = validators.etag;
  if (validators.lastModified) headers["if-modified-since"] = validators.lastModified;

  // The deadline must cover the BODY read too — a server can send headers fast
  // then stall the stream, and `res.text()` has no timeout of its own.
  return withDeadline(url, async (signal) => {
    const res = await fetch(url, { headers, redirect: "follow", signal });
    const etag = res.headers.get("etag");
    const lastModified = res.headers.get("last-modified");
    if (res.status === 304) return { status: 304, html: null, etag, lastModified };
    if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
    const html = await res.text(); // still under `signal` — aborting cancels this
    return { status: 200, html, etag, lastModified };
  });
}

/**
 * Fetch a URL as text with a hard timeout and a friendly UA. Shared by the
 * single-page scraper, the sitemap reader, and the crawler.
 */
export async function fetchHtml(url: string): Promise<string> {
  return withDeadline(url, async (signal) => {
    const res = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow", signal });
    if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
    return res.text(); // under `signal` — a stalled body download is aborted
  });
}

/**
 * Run a fetch routine under a single hard deadline that covers the whole request
 * — connect, headers, AND body. `run` must do all its awaiting on `signal` while
 * the timer is live; the timer is only cleared once `run` fully resolves.
 */
async function withDeadline<T>(url: string, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await run(controller.signal);
  } catch (err) {
    if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError")) {
      throw new Error(`Timed out after ${FETCH_TIMEOUT_MS}ms for ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function absolutize(src: string | null, base: string): string | null {
  if (!src) return null;
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}
