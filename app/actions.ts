"use server";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { generatePost, type GeneratedDraft } from "@/lib/ai/generate";
import { generatePostImage } from "@/lib/ai/image";
import { storeImage } from "@/lib/storage";
import { getUserPages } from "@/lib/facebook/client";
import { getOrgContent } from "@/lib/data";
import { publishPost } from "@/lib/publish";
import { generatePostsForOrg, type GenerateResult } from "@/lib/generate/pipeline";
import { encryptSecret } from "@/lib/crypto";
import { runScrape } from "@/lib/scrape/run";
import type { ScrapeReport } from "@/lib/scrape/types";
import type { PostStatus } from "@/lib/post-status";

function refresh() {
  revalidatePath("/", "layout");
}

/** Approve / reject / move a post through its lifecycle. */
export async function setPostStatus(id: string, status: PostStatus) {
  await db.update(schema.posts).set({ status }).where(eq(schema.posts.id, id));
  refresh();
}

export async function updatePostContent(id: string, patch: { body: string; cta: string; link: string }) {
  await db.update(schema.posts).set(patch).where(eq(schema.posts.id, id));
  refresh();
}

/** Generate a draft (text + image) from scraped content + an optional idea. Not saved yet. */
export async function generateDraft(orgId: string, idea: string): Promise<GeneratedDraft> {
  const org = await db.query.organizations.findFirst({ where: eq(schema.organizations.id, orgId) });
  if (!org) throw new Error("Organization not found");
  const content = await getOrgContent(orgId);
  const site = await db.query.websites.findFirst({ where: eq(schema.websites.orgId, orgId) });

  const draft = await generatePost({
    orgName: org.name,
    brandVoice: org.brandVoice ?? "Warm, clear, community-minded.",
    ctaUrl: org.storeUrl ?? site?.url ?? "",
    sourceWebsite: site?.label ?? "",
    content,
    idea,
  });

  // Generate an image for the preview (best-effort — text still returns if it fails).
  try {
    const img = await generatePostImage({ orgName: org.name, imageHint: draft.imageHint, headline: draft.headline });
    if (img) {
      draft.imageUrl = await storeImage(img.bytes, `${orgId}/manual-${Date.now()}.png`, img.contentType, orgId);
    }
  } catch {
    // no image — fine
  }

  return draft;
}

/** Save a generated draft into the review queue. */
export async function saveDraft(orgId: string, draft: GeneratedDraft) {
  const dedupHash = createHash("sha256")
    .update(draft.body.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 400))
    .digest("hex");
  await db.insert(schema.posts).values({
    orgId,
    status: "needs_review",
    origin: "manual",
    headline: draft.headline,
    body: draft.body,
    cta: draft.cta,
    link: draft.link,
    sourceWebsite: draft.sourceWebsite,
    imageHint: draft.imageHint,
    imageUrl: draft.imageUrl ?? null,
    dedupHash,
  });
  refresh();
}

/**
 * Run the daily generation pipeline for an org on demand. Behaves exactly like
 * the real 6am cron: idempotent — if today's batch already exists it does nothing
 * and reports "already generated today", so clicking it repeatedly never piles up
 * duplicate posts. (The `npm run generate` CLI still forces, for dev testing.)
 */
export async function runGenerateNow(orgId: string): Promise<GenerateResult> {
  const result = await generatePostsForOrg(orgId, { force: false });
  refresh();
  return result;
}

/**
 * Publish a post to the org's Facebook page. Respects dry-run (simulated) — see
 * lib/facebook/client. Returns whether the post was simulated so the UI can say so.
 */
export async function publishPostNow(id: string): Promise<{ simulated: boolean }> {
  const result = await publishPost(id);
  refresh();
  return { simulated: result.simulated };
}

/** Manually re-read this org's websites now. Dedup means unchanged pages are skipped. */
export async function scrapeOrg(orgId: string): Promise<ScrapeReport> {
  const report = await runScrape(orgId);
  refresh();
  return report;
}

/** Set the daily automatic scrape time (HH:MM) for an org. */
export async function setScrapeTime(orgId: string, time: string) {
  await db.update(schema.organizations).set({ scrapeTime: time }).where(eq(schema.organizations.id, orgId));
  refresh();
}

export async function addWebsite(orgId: string, rawUrl: string) {
  const url = rawUrl.trim().startsWith("http") ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  await db.insert(schema.websites).values({
    orgId,
    url,
    label: url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    status: "pending",
  });
  refresh();
}

export async function updateOrgSettings(
  orgId: string,
  patch: { postsPerDay: number; postingTimes: string[]; autoApprove: boolean; brandVoice: string },
) {
  await db.update(schema.organizations).set(patch).where(eq(schema.organizations.id, orgId));
  refresh();
}

/** Finalize a Facebook connection after OAuth: store the chosen page + its token. */
export async function connectSelectedPage(orgId: string, pageId: string) {
  const jar = await cookies();
  const userToken = jar.get("fb_user_token")?.value;
  if (!userToken) throw new Error("Facebook session expired — start the connection again");

  const pages = await getUserPages(userToken);
  const page = pages.find((p) => p.id === pageId);
  if (!page) throw new Error("That page is no longer available");

  await db
    .update(schema.organizations)
    .set({
      facebookPageId: page.id,
      facebookPage: page.name,
      // Encrypted at rest when APP_ENCRYPTION_KEY is set (passthrough otherwise).
      facebookPageToken: encryptSecret(page.access_token),
      facebookConnected: true,
    })
    .where(eq(schema.organizations.id, orgId));

  jar.delete("fb_user_token");
  refresh();
}

/** Create a new organization (+ optional first website). Multi-org = new data. */
export async function createOrganization(name: string, firstSiteUrl: string) {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) throw new Error("Enter an organization name");

  await db.insert(schema.organizations).values({
    id: slug,
    name: name.trim(),
    shortName: name.trim().split(/\s+/)[0],
  });

  const site = firstSiteUrl.trim();
  if (site) {
    const url = site.startsWith("http") ? site : `https://${site}`;
    await db.insert(schema.websites).values({
      orgId: slug,
      url,
      label: url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
      status: "pending",
    });
  }
  refresh();
}

export async function disconnectFacebook(orgId: string) {
  await db
    .update(schema.organizations)
    .set({ facebookConnected: false, facebookPageId: null, facebookPageToken: null })
    .where(eq(schema.organizations.id, orgId));
  refresh();
}
