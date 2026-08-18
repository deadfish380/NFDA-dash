import { type NextRequest, NextResponse } from "next/server";
import { runScrape } from "@/lib/scrape/run";
import { cronAuthorized } from "@/lib/cron-auth";

// The daily "6am job" — Vercel Cron hits this (see vercel.json). Re-reads every
// org's websites; dedup means unchanged pages are skipped.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const report = await runScrape();
  return NextResponse.json({ ok: true, summary: report.summary });
}
