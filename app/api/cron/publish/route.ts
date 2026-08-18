import { type NextRequest, NextResponse } from "next/server";
import { publishDuePosts } from "@/lib/publish";
import { cronAuthorized } from "@/lib/cron-auth";

// The posting job — publishes approved posts whose scheduled time has arrived.
// Run this frequently (e.g. hourly) so posts go out close to their posting time.
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await publishDuePosts();
  return NextResponse.json({ ok: true, ...result });
}
