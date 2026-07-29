import { db, schema } from "./index";
import { ORGANIZATIONS, POSTS } from "@/lib/mock-data";

/**
 * Seeds the database from the Week-1 mock data so the app has real rows to render
 * before the scraper/generator have run. Idempotent-ish: clears and reinserts.
 * Run with: npm run db:seed
 */
async function seed() {
  console.log("Seeding database…");

  // Clear in FK-safe order.
  await db.delete(schema.posts);
  await db.delete(schema.contentItems);
  await db.delete(schema.websites);
  await db.delete(schema.organizations);

  for (const org of ORGANIZATIONS) {
    await db.insert(schema.organizations).values({
      id: org.id,
      name: org.name,
      shortName: org.shortName,
      facebookPage: org.facebookPage,
      facebookConnected: org.facebookConnected,
      storeUrl: org.storeUrl,
      postsPerDay: org.postsPerDay,
      postingTimes: org.postingTimes,
      autoApprove: org.autoApprove,
      brandVoice: org.brandVoice,
    });

    for (const site of org.websites) {
      await db.insert(schema.websites).values({
        orgId: org.id,
        url: site.url,
        label: site.label,
        status: site.status,
        lastScrapedAt: site.lastScrapedAt ? new Date(site.lastScrapedAt) : null,
      });
    }
    console.log(`  ✓ ${org.name} (${org.websites.length} site${org.websites.length === 1 ? "" : "s"})`);
  }

  for (const p of POSTS) {
    await db.insert(schema.posts).values({
      orgId: p.orgId,
      status: p.status,
      headline: p.headline,
      body: p.body,
      cta: p.cta,
      link: p.link,
      sourceWebsite: p.sourceWebsite,
      imageHint: p.imageHint,
      scheduledFor: p.scheduledFor ? new Date(p.scheduledFor) : null,
    });
  }
  console.log(`  ✓ ${POSTS.length} posts`);

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
