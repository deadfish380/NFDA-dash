import { type NextRequest, NextResponse } from "next/server";
import { generateAllOrgs, generatePostsForOrg } from "@/lib/generate/pipeline";
import { cronAuthorized } from "@/lib/cron-auth";

// The daily generation job — writes each org's posts-per-day into the review
// queue (or schedules them when auto-approve is on). Slower than scrape because
// it calls the LLM and image model; needs a longer function budget than default.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const org = params.get("org");
  const force = params.get("force") === "1" || params.get("force") === "true";

  const results = org ? [await generatePostsForOrg(org, { force })] : await generateAllOrgs();
  return NextResponse.json({ ok: true, results });
}
