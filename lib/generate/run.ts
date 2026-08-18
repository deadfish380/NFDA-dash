import { generateAllOrgs, generatePostsForOrg, type GenerateResult } from "./pipeline";

/**
 * Manual generation trigger — `npm run generate` (all orgs) or
 * `npm run generate <orgId>` (one org, forced). Mirrors `npm run scrape` for
 * testing the daily pipeline without waiting for the cron.
 */
if (process.argv[1]?.endsWith("run.ts")) {
  const orgId = process.argv[2];
  const count = process.argv[3] ? Number(process.argv[3]) : undefined;
  const work: Promise<GenerateResult[]> = orgId
    ? generatePostsForOrg(orgId, { force: true, count }).then((r) => [r])
    : generateAllOrgs();

  work
    .then((results) => {
      for (const r of results) {
        console.log(
          `${r.orgId}: ${r.created} created, ${r.skipped} skipped${r.reason ? ` (${r.reason})` : ""}`,
        );
        for (const p of r.posts) {
          console.log(`   • [${p.status}${p.hasImage ? ", image" : ""}] ${p.headline}`);
        }
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
