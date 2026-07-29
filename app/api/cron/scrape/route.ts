import { type NextRequest, NextResponse } from "next/server";
import { runScrape } from "@/lib/scrape/run";

// The daily "6am job" — Vercel Cron hits this (see vercel.json). Re-reads every
// org's websites; dedup means unchanged pages are skipped.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the secret is set.
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const report = await runScrape();
  return NextResponse.json({ ok: true, summary: report.summary });
}
