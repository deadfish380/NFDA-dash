import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * The whole domain, as data. Organizations and their websites are rows — adding
 * a fourth org is an INSERT, never a code change. These tables back the exact
 * shapes the Week-1 UI already renders (see lib/mock-data.ts).
 */

export const organizations = pgTable("organizations", {
  // Human-readable slug (e.g. "nfda", "longview") — stable and URL-safe.
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  facebookPage: text("facebook_page"),
  facebookPageId: text("facebook_page_id"),
  // Encrypted at rest in production; null until the page is connected.
  facebookPageToken: text("facebook_page_token"),
  facebookConnected: boolean("facebook_connected").notNull().default(false),
  storeUrl: text("store_url"),
  postsPerDay: integer("posts_per_day").notNull().default(2),
  postingTimes: text("posting_times").array().notNull().default(["09:00", "15:00"]),
  // Daily automatic scrape time (HH:MM) — the "6am job" in production.
  scrapeTime: text("scrape_time").notNull().default("06:00"),
  autoApprove: boolean("auto_approve").notNull().default(false),
  brandVoice: text("brand_voice"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const websites = pgTable(
  "websites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    label: text("label").notNull(),
    // "connected" once we've successfully read it, else "pending".
    status: text("status").notNull().default("pending"),
    lastScrapedAt: timestamp("last_scraped_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("websites_org_idx").on(t.orgId)],
);

/** Raw content pulled from a website — the source material the AI writes from. */
export const contentItems = pgTable(
  "content_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    imageUrl: text("image_url"),
    // Hash of the body — lets a re-scrape skip a page whose content hasn't changed.
    contentHash: text("content_hash"),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Newest-content-per-org reads (scraping console, generation retrieval).
    index("content_items_org_scraped_idx").on(t.orgId, t.scrapedAt.desc()),
    // The dedup lookup: latest stored copy of one exact URL.
    index("content_items_url_scraped_idx").on(t.sourceUrl, t.scrapedAt.desc()),
    index("content_items_website_idx").on(t.websiteId),
  ],
);

/**
 * Crawl-state ledger — one row per discovered URL per website (not versioned).
 * Holds what we need to re-crawl cheaply: the validators (etag / last-modified)
 * for HTTP conditional requests, the last content hash, and the last outcome.
 * `content_items` stays the append-only history of bodies; this is "current
 * state of each page" and powers the coverage view in the scraping console.
 */
export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    websiteId: uuid("website_id")
      .notNull()
      .references(() => websites.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    title: text("title"),
    // HTTP validators — sent back as If-None-Match / If-Modified-Since so an
    // unchanged page returns 304 and we skip the download entirely.
    etag: text("etag"),
    lastModified: text("last_modified"),
    contentHash: text("content_hash"),
    // crawled (new/updated) | unchanged | failed
    status: text("status").notNull().default("crawled"),
    chars: integer("chars").notNull().default(0),
    hasImage: boolean("has_image").notNull().default(false),
    // How the URL was found: sitemap | link | seed (the website's own url).
    discoveredVia: text("discovered_via").notNull().default("link"),
    error: text("error"),
    lastCrawledAt: timestamp("last_crawled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("pages_website_url_idx").on(t.websiteId, t.url),
    index("pages_org_idx").on(t.orgId),
  ],
);

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    // draft | needs_review | approved | scheduled | posted | rejected
    status: text("status").notNull().default("draft"),
    headline: text("headline").notNull(),
    body: text("body").notNull(),
    cta: text("cta").notNull(),
    link: text("link").notNull(),
    sourceWebsite: text("source_website").notNull(),
    imageHint: text("image_hint").notNull().default(""),
    imageUrl: text("image_url"),
    // Which scraped content this post was written from — provenance + rotation.
    contentItemId: uuid("content_item_id"),
    // Normalized-body fingerprint — so the generator never re-saves a near-identical post.
    dedupHash: text("dedup_hash"),
    // How the draft was produced: manual (idea) | auto (daily pipeline).
    origin: text("origin").notNull().default("manual"),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    facebookPostId: text("facebook_post_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Queue/dashboard reads: an org's posts, newest first, filtered by status.
    index("posts_org_created_idx").on(t.orgId, t.createdAt.desc()),
    index("posts_org_status_idx").on(t.orgId, t.status),
    // The publish cron scans for scheduled posts whose time has come.
    index("posts_status_scheduled_idx").on(t.status, t.scheduledFor),
    // Dedup lookup — has this org posted something like this recently?
    index("posts_org_dedup_idx").on(t.orgId, t.dedupHash),
  ],
);

/**
 * Generated post images, kept out of the `posts` row so the app-wide posts query
 * never drags image bytes around. Served by /api/post-image/[id] — a tiny stable
 * URL that Facebook can also load in production. Only used when Supabase Storage
 * isn't configured (which returns CDN URLs instead).
 */
export const postImages = pgTable("post_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id"),
  contentType: text("content_type").notNull().default("image/png"),
  // base64-encoded image bytes.
  data: text("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Organization = typeof organizations.$inferSelect;
export type Website = typeof websites.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
