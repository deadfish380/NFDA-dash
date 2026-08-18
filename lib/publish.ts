import "server-only";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { postToPage } from "@/lib/facebook/client";
import { decryptSecret } from "@/lib/crypto";

/**
 * Publish one post to its org's Facebook page (photo when it has a hosted image,
 * else a link post). Respects dry-run. Shared by the manual "Post now" button and
 * the publish cron so both behave identically.
 */
export async function publishPost(postId: string): Promise<{ id: string; simulated: boolean }> {
  const post = await db.query.posts.findFirst({ where: eq(schema.posts.id, postId) });
  if (!post) throw new Error("Post not found");
  const org = await db.query.organizations.findFirst({
    where: eq(schema.organizations.id, post.orgId),
  });
  if (!org) throw new Error("Organization not found");

  const result = await postToPage({
    pageId: org.facebookPageId ?? "test_page",
    pageToken: decryptSecret(org.facebookPageToken) ?? "",
    message: post.body,
    link: post.link,
    imageUrl: post.imageUrl,
  });

  await db
    .update(schema.posts)
    .set({ status: "posted", postedAt: new Date(), facebookPostId: result.id })
    .where(eq(schema.posts.id, postId));

  return result;
}

/**
 * Publish every post that's due: approved (status "scheduled") with either no set
 * time or a time that has passed. The publish cron entry point.
 */
export async function publishDuePosts(): Promise<{
  attempted: number;
  posted: number;
  simulated: number;
  failures: { id: string; error: string }[];
}> {
  const now = new Date();
  const due = await db
    .select({ id: schema.posts.id })
    .from(schema.posts)
    .where(
      and(
        eq(schema.posts.status, "scheduled"),
        or(isNull(schema.posts.scheduledFor), lte(schema.posts.scheduledFor, now)),
      ),
    );

  let posted = 0;
  let simulated = 0;
  const failures: { id: string; error: string }[] = [];

  for (const row of due) {
    try {
      const r = await publishPost(row.id);
      posted++;
      if (r.simulated) simulated++;
    } catch (err) {
      failures.push({ id: row.id, error: (err as Error).message });
    }
  }

  return { attempted: due.length, posted, simulated, failures };
}
