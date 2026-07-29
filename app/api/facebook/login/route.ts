import { type NextRequest, NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/facebook/client";

/** Kick off Facebook login. The org id rides along in `state` back to the callback. */
export function GET(req: NextRequest) {
  const orgId = req.nextUrl.searchParams.get("orgId") ?? "";
  return NextResponse.redirect(getAuthUrl(orgId, req.nextUrl.origin));
}
