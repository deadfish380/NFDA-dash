import "server-only";
import { createHash } from "node:crypto";
import { and, desc, eq, gte } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { generatePost, type GeneratedDraft } from "@/lib/ai/generate";
import { generatePostImage } from "@/lib/ai/image";
import { storeImage } from "@/lib/storage";
import { getOrgContentSources, type ContentSource } from "@/lib/data";
import type { PostStatus } from "@/lib/post-status";

/**
 * The daily generation pipeline — the piece that fulfills "two posts a day,
 * automatically". For an org it: picks fresh, not-recently-used scraped pages
 * (rotation), writes a post grounded in each, rejects anything too similar to a
 * recent post (dedup), generates an image, and drops it into the review queue —
 * or schedules it directly when the org has auto-approve on.
 */
export type GenerateResult = {
  orgId: string;
  created: number;
  skipped: number;
  reason?: string;
  posts: { headline: string; status: PostStatus; hasImage: boolean }[];
};

const SIMILARITY_LIMIT = 0.55; // Jaccard above this = "too close to a recent post"
const MIN_BODY = 200; // ignore near-empty scraped pages

export async function generatePostsForOrg(
  orgId: string,
  opts: { count?: number; force?: boolean } = {},
): Promise<GenerateResult> {
  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, orgId),
  });
  if (!org) return { orgId, created: 0, skipped: 0, reason: "organization not found", posts: [] };

  const count = opts.count ?? org.postsPerDay ?? 2;

  // Idempotency — don't re-generate today's batch if it already ran (unless forced).
  if (!opts.force) {
    const alreadyToday = await db
      .select({ id: schema.posts.id })
      .from(schema.posts)
      .where(
        and(
          eq(schema.posts.orgId, orgId),
          eq(schema.posts.origin, "auto"),
          gte(schema.posts.createdAt, startOfToday()),
        ),
      );
    if (alreadyToday.length >= count) {
      return { orgId, created: 0, skipped: count, reason: "already generated today", posts: [] };
    }
  }

  const sources = await getOrgContentSources(orgId);
  if (sources.length === 0) {
    return { orgId, created: 0, skipped: count, reason: "no scraped content — run a crawl first", posts: [] };
  }

  // Recent posts drive both dedup and rotation.
  const recent = await db
    .select({
      body: schema.posts.body,
      headline: schema.posts.headline,
      dedupHash: schema.posts.dedupHash,
      contentItemId: schema.posts.contentItemId,
    })
    .from(schema.posts)
    .where(eq(schema.posts.orgId, orgId))
    .orderBy(desc(schema.posts.createdAt))
    .limit(40);

  const usedHashes = new Set(recent.map((r) => r.dedupHash).filter(Boolean) as string[]);
  const recentNorms = recent.map((r) => normalize(r.body));
  const recentSourceIds = new Set(recent.map((r) => r.contentItemId).filter(Boolean) as string[]);
  const avoid = recent.slice(0, 8).map((r) => r.headline);

  const pool = rankSources(sources, recentSourceIds);
  const ctaUrl = org.storeUrl ?? sources[0].sourceUrl ?? "";
  const slots = nextSlots(org.postingTimes?.length ? org.postingTimes : ["09:00", "15:00"], count);

  const posts: GenerateResult["posts"] = [];
  let created = 0;
  let skipped = 0;
  let srcIdx = 0;

  while (created < count && srcIdx < pool.length) {
    const src = pool[srcIdx++];

    const draft = await writeUnique(org, src, ctaUrl, avoid, usedHashes, recentNorms);
    if (!draft) {
      skipped++;
      continue;
    }

    const hash = dedupHash(draft.body);
    usedHashes.add(hash);
    recentNorms.push(normalize(draft.body));
    avoid.unshift(draft.headline);

    const imageUrl = await makeImage(org.name, draft, orgId, hash, created).catch(() => src.imageUrl ?? null);

    const status: PostStatus = org.autoApprove ? "scheduled" : "needs_review";
    const scheduledFor = org.autoApprove ? (slots[created] ?? null) : null;

    await db.insert(schema.posts).values({
      orgId,
      status,
      origin: "auto",
      headline: draft.headline,
      body: draft.body,
      cta: draft.cta,
      link: draft.link,
      sourceWebsite: draft.sourceWebsite,
      imageHint: draft.imageHint,
      imageUrl: imageUrl ?? src.imageUrl ?? null,
      contentItemId: src.id,
      dedupHash: hash,
      scheduledFor,
    });

    created++;
    posts.push({ headline: draft.headline, status, hasImage: Boolean(imageUrl ?? src.imageUrl) });
  }

  return { orgId, created, skipped, posts };
}

/** Run the pipeline for every organization — the generation cron entry point. */
export async function generateAllOrgs(): Promise<GenerateResult[]> {
  const orgs = await db.select({ id: schema.organizations.id }).from(schema.organizations);
  const out: GenerateResult[] = [];
  for (const o of orgs) out.push(await generatePostsForOrg(o.id));
  return out;
}

// --- internals -------------------------------------------------------------

/** Generate a post for a source, regenerating once if it's too close to a recent one. */
async function writeUnique(
  org: typeof schema.organizations.$inferSelect,
  src: ContentSource,
  ctaUrl: string,
  avoid: string[],
  usedHashes: Set<string>,
  recentNorms: string[],
): Promise<GeneratedDraft | null> {
  const base = {
    orgName: org.name,
    brandVoice: org.brandVoice ?? "Warm, clear, community-minded.",
    ctaUrl,
    sourceWebsite: hostOf(src.sourceUrl),
    content: src.body,
  };

  for (let attempt = 0; attempt < 2; attempt++) {
    let draft: GeneratedDraft;
    try {
      draft = await generatePost({ ...base, avoid });
    } catch {
      return null;
    }
    if (!isDuplicate(draft.body, usedHashes, recentNorms)) return draft;
    // Too similar — push its headline into `avoid` and try once more.
    avoid = [draft.headline, ...avoid];
  }
  return null;
}

function isDuplicate(body: string, usedHashes: Set<string>, recentNorms: string[]): boolean {
  if (usedHashes.has(dedupHash(body))) return true;
  const norm = normalize(body);
  return recentNorms.some((r) => jaccard(r, norm) > SIMILARITY_LIMIT);
}

async function makeImage(
  orgName: string,
  draft: GeneratedDraft,
  orgId: string,
  hash: string,
  n: number,
): Promise<string | null> {
  const img = await generatePostImage({ orgName, imageHint: draft.imageHint, headline: draft.headline });
  if (!img) return null;
  return storeImage(img.bytes, `${orgId}/${hash.slice(0, 16)}-${n}.png`, img.contentType, orgId);
}

/** Not-recently-used pages first, then ones with an image, then the meatiest. */
function rankSources(sources: ContentSource[], usedIds: Set<string>): ContentSource[] {
  return [...sources]
    .filter((s) => s.body.trim().length > MIN_BODY || sources.every((x) => x.body.trim().length <= MIN_BODY))
    .sort((a, b) => {
      const au = usedIds.has(a.id) ? 1 : 0;
      const bu = usedIds.has(b.id) ? 1 : 0;
      if (au !== bu) return au - bu;
      const ai = a.imageUrl ? 0 : 1;
      const bi = b.imageUrl ? 0 : 1;
      if (ai !== bi) return ai - bi;
      return b.body.length - a.body.length;
    });
}

function nextSlots(times: string[], count: number): Date[] {
  const now = new Date();
  const sorted = [...times].sort();
  const slots: Date[] = [];
  for (let dayOffset = 0; dayOffset <= 14 && slots.length < count; dayOffset++) {
    for (const t of sorted) {
      const [h, m] = t.split(":").map(Number);
      const d = new Date(now);
      d.setDate(d.getDate() + dayOffset);
      d.setHours(h, m ?? 0, 0, 0);
      if (d.getTime() > now.getTime()) slots.push(d);
      if (slots.length >= count) break;
    }
  }
  return slots;
}

function normalize(body: string): string {
  return body.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

function dedupHash(body: string): string {
  return createHash("sha256").update(normalize(body).slice(0, 400)).digest("hex");
}

function jaccard(a: string, b: string): number {
  const A = new Set(a.split(" ").filter((w) => w.length > 3));
  const B = new Set(b.split(" ").filter((w) => w.length > 3));
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / (A.size + B.size - inter);
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
