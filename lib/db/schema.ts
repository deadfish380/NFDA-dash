import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
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

export const websites = pgTable("websites", {
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
});

/** Raw content pulled from a website — the source material the AI writes from. */
export const contentItems = pgTable("content_items", {
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
});

export const posts = pgTable("posts", {
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
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
  postedAt: timestamp("posted_at", { withTimezone: true }),
  facebookPostId: text("facebook_post_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Organization = typeof organizations.$inferSelect;
export type Website = typeof websites.$inferSelect;
export type ContentItem = typeof contentItems.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
