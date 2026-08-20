import { type NextRequest, NextResponse } from "next/server";
import { runScrape } from "@/lib/scrape/run";
import { cronAuthorized } from "@/lib/cron-auth";

// The daily "6am job" — Vercel Cron hits this (see vercel.json). Re-reads every
// org's websites; dedup means unchanged pages are skipped.
export const dynamic = "force-dynamic";
// Hobby caps functions at 60s. Raise this (up to 300) once on Vercel Pro.
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const report = await runScrape();
  return NextResponse.json({ ok: true, summary: report.summary });
}
