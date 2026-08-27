/**
 * One-shot migration from the OLD Supabase project (in .env.local) to the NEW
 * client-owned project. Copies schema + all data, rewrites image URLs, creates
 * the storage bucket, and best-effort copies the images. Safe to re-run
 * (ON CONFLICT DO NOTHING) and only READS from the old project.
 *
 *   1. Fill NEW_DB_PASSWORD below (new project → Settings → Database → Password;
 *      reset it there if you don't know it).
 *   2. Run:  node --env-file=.env.local scripts/migrate-to-new-supabase.mjs
 */
import postgres from "postgres";

// ---- NEW project (client-owned) — all secrets come from the environment,
// NEVER hardcoded, so this file is safe to commit to a public repo. Set:
//   NEW_DB_PASSWORD, NEW_SUPABASE_URL, NEW_SUPABASE_SERVICE_ROLE_KEY
const NEW_DB_PASSWORD = process.env.NEW_DB_PASSWORD ?? "";
const NEW_PROJECT_HOST = process.env.NEW_DB_HOST ?? "aws-0-us-west-2.pooler.supabase.com";
const NEW_PROJECT_USER = process.env.NEW_DB_USER ?? "postgres.kdxkuezzetpsurpngocx";
const NEW_DIRECT_URL = `postgresql://${NEW_PROJECT_USER}:${NEW_DB_PASSWORD}@${NEW_PROJECT_HOST}:5432/postgres`;
const NEW_STORAGE_BASE = process.env.NEW_SUPABASE_URL ?? "";
const NEW_STORAGE_KEY = process.env.NEW_SUPABASE_SERVICE_ROLE_KEY ?? "";

// ---- OLD project (from .env.local) ----
const OLD_DB_URL = process.env.DATABASE_URL;
const OLD_STORAGE_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://ladjcajtpjjskrqodlvy.supabase.co";
const OLD_STORAGE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "post-images";

if (!NEW_DB_PASSWORD || !NEW_STORAGE_BASE || !NEW_STORAGE_KEY) {
  console.error("Set NEW_DB_PASSWORD, NEW_SUPABASE_URL and NEW_SUPABASE_SERVICE_ROLE_KEY in the environment first.");
  process.exit(1);
}
if (!OLD_DB_URL) {
  console.error("DATABASE_URL (old project) not found in .env.local");
  process.exit(1);
}

const oldSql = postgres(OLD_DB_URL, { prepare: false, ssl: "require", max: 3 });
const newSql = postgres(NEW_DIRECT_URL, { prepare: false, ssl: "require", max: 3 });

// ---- Schema (mirrors lib/db/schema.ts) ----
const DDL = [
  `CREATE TABLE IF NOT EXISTS "organizations" (
     "id" text PRIMARY KEY NOT NULL,
     "name" text NOT NULL, "short_name" text NOT NULL,
     "facebook_page" text, "facebook_page_id" text, "facebook_page_token" text,
     "facebook_connected" boolean NOT NULL DEFAULT false,
     "store_url" text,
     "posts_per_day" integer NOT NULL DEFAULT 2,
     "posting_times" text[] NOT NULL DEFAULT '{"09:00","15:00"}',
     "scrape_time" text NOT NULL DEFAULT '06:00',
     "auto_approve" boolean NOT NULL DEFAULT false,
     "brand_voice" text,
     "created_at" timestamptz NOT NULL DEFAULT now())`,
  `CREATE TABLE IF NOT EXISTS "websites" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
     "url" text NOT NULL, "label" text NOT NULL,
     "status" text NOT NULL DEFAULT 'pending',
     "last_scraped_at" timestamptz,
     "created_at" timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS "websites_org_idx" ON "websites" ("org_id")`,
  `CREATE TABLE IF NOT EXISTS "content_items" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
     "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE cascade,
     "source_url" text NOT NULL, "title" text, "body" text NOT NULL,
     "image_url" text, "content_hash" text,
     "scraped_at" timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS "content_items_org_scraped_idx" ON "content_items" ("org_id","scraped_at" DESC)`,
  `CREATE INDEX IF NOT EXISTS "content_items_url_scraped_idx" ON "content_items" ("source_url","scraped_at" DESC)`,
  `CREATE INDEX IF NOT EXISTS "content_items_website_idx" ON "content_items" ("website_id")`,
  `CREATE TABLE IF NOT EXISTS "pages" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
     "website_id" uuid NOT NULL REFERENCES "websites"("id") ON DELETE cascade,
     "url" text NOT NULL, "title" text, "etag" text, "last_modified" text,
     "content_hash" text, "status" text NOT NULL DEFAULT 'crawled',
     "chars" integer NOT NULL DEFAULT 0, "has_image" boolean NOT NULL DEFAULT false,
     "discovered_via" text NOT NULL DEFAULT 'link', "error" text,
     "last_crawled_at" timestamptz,
     "created_at" timestamptz NOT NULL DEFAULT now())`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "pages_website_url_idx" ON "pages" ("website_id","url")`,
  `CREATE INDEX IF NOT EXISTS "pages_org_idx" ON "pages" ("org_id")`,
  `CREATE TABLE IF NOT EXISTS "posts" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     "org_id" text NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
     "status" text NOT NULL DEFAULT 'draft', "headline" text NOT NULL,
     "body" text NOT NULL, "cta" text NOT NULL, "link" text NOT NULL,
     "source_website" text NOT NULL, "image_hint" text NOT NULL DEFAULT '',
     "image_url" text, "content_item_id" uuid, "dedup_hash" text,
     "origin" text NOT NULL DEFAULT 'manual',
     "scheduled_for" timestamptz, "posted_at" timestamptz, "facebook_post_id" text,
     "created_at" timestamptz NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS "posts_org_created_idx" ON "posts" ("org_id","created_at" DESC)`,
  `CREATE INDEX IF NOT EXISTS "posts_org_status_idx" ON "posts" ("org_id","status")`,
  `CREATE INDEX IF NOT EXISTS "posts_status_scheduled_idx" ON "posts" ("status","scheduled_for")`,
  `CREATE INDEX IF NOT EXISTS "posts_org_dedup_idx" ON "posts" ("org_id","dedup_hash")`,
  `CREATE TABLE IF NOT EXISTS "post_images" (
     "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
     "org_id" text, "content_type" text NOT NULL DEFAULT 'image/png',
     "data" text NOT NULL, "created_at" timestamptz NOT NULL DEFAULT now())`,
];

// FK order matters for the copy.
const TABLES = ["organizations", "websites", "content_items", "pages", "posts", "post_images"];

async function copyTable(name) {
  const rows = await oldSql`SELECT * FROM ${oldSql(name)}`;
  const batch = name === "post_images" ? 20 : 200;
  for (let i = 0; i < rows.length; i += batch) {
    const chunk = rows.slice(i, i + batch);
    if (chunk.length) await newSql`INSERT INTO ${newSql(name)} ${newSql(chunk)} ON CONFLICT (id) DO NOTHING`;
  }
  const [c] = await newSql`SELECT count(*)::int n FROM ${newSql(name)}`;
  console.log(`  ${name.padEnd(15)} read ${String(rows.length).padStart(4)} → new total ${c.n}`);
}

async function migrateStorage() {
  // Create the public bucket on the new project.
  const mk = await fetch(`${NEW_STORAGE_BASE}/storage/v1/bucket`, {
    method: "POST",
    headers: { authorization: `Bearer ${NEW_STORAGE_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  console.log(mk.ok ? `  bucket "${BUCKET}" ready` : `  bucket: ${mk.status} (likely already exists)`);

  if (!OLD_STORAGE_KEY) {
    console.log("  (old service key missing — skipping image copy; new posts will regenerate images)");
    return;
  }

  // Our objects live at <orgId>/<file>. List folders, then files in each.
  const listAt = async (prefix) => {
    const r = await fetch(`${OLD_STORAGE_BASE}/storage/v1/object/list/${BUCKET}`, {
      method: "POST",
      headers: { authorization: `Bearer ${OLD_STORAGE_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: "name", order: "asc" } }),
    });
    return r.ok ? await r.json() : [];
  };

  let copied = 0;
  const top = await listAt("");
  for (const folder of top) {
    if (folder.id) continue; // it's a file at root, skip (our files are nested)
    const files = await listAt(`${folder.name}/`);
    for (const f of files) {
      const path = `${folder.name}/${f.name}`;
      const dl = await fetch(`${OLD_STORAGE_BASE}/storage/v1/object/public/${BUCKET}/${path}`);
      if (!dl.ok) continue;
      const bytes = Buffer.from(await dl.arrayBuffer());
      const up = await fetch(`${NEW_STORAGE_BASE}/storage/v1/object/${BUCKET}/${path}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${NEW_STORAGE_KEY}`,
          "content-type": dl.headers.get("content-type") ?? "image/jpeg",
          "x-upsert": "true",
        },
        body: new Uint8Array(bytes),
      });
      if (up.ok) copied++;
    }
  }
  console.log(`  copied ${copied} image(s) to the new bucket`);
}

async function main() {
  console.log("Old:", OLD_DB_URL.split("@")[1]?.split("/")[0]);
  console.log("New: aws-0-us-west-2.pooler.supabase.com:5432 (kdxkuezzetpsurpngocx)\n");

  console.log("1) Creating schema on the new project…");
  for (const ddl of DDL) await newSql.unsafe(ddl);
  console.log("   schema ready\n");

  console.log("2) Copying data…");
  for (const t of TABLES) await copyTable(t);

  console.log("\n3) Rewriting image URLs (old Supabase → new)…");
  const oldRef = OLD_STORAGE_BASE.replace(/^https?:\/\//, "").split(".")[0];
  const upd = await newSql`UPDATE posts SET image_url = replace(image_url, ${oldRef}, 'kdxkuezzetpsurpngocx') WHERE image_url LIKE ${"%" + oldRef + "%"}`;
  console.log(`   rewrote ${upd.count} post image URL(s)`);

  console.log("\n4) Migrating storage…");
  await migrateStorage().catch((e) => console.log("   storage step warning:", e.message));

  console.log("\n✅ Migration done. Now point .env.local + Vercel at the new project and redeploy.");
  await oldSql.end();
  await newSql.end();
}

main().catch((e) => {
  console.error("\n✗ Migration failed:", e.message);
  process.exit(1);
});
