import { type NextRequest, NextResponse } from "next/server";
import { exchangeCodeForUserToken } from "@/lib/facebook/client";

/**
 * Facebook redirects here after login. Exchange the code for a user token, stash
 * it in a short-lived httpOnly cookie, and send the user to the page picker.
 */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const orgId = req.nextUrl.searchParams.get("state") ?? "";

  if (!code) {
    return NextResponse.redirect(new URL("/organizations?fb=cancelled", req.url));
  }

  try {
    const userToken = await exchangeCodeForUserToken(code, req.nextUrl.origin);
    const res = NextResponse.redirect(new URL(`/connect?orgId=${encodeURIComponent(orgId)}`, req.url));
    res.cookies.set("fb_user_token", userToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600, // 10 minutes — just long enough to pick a page
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.redirect(new URL("/organizations?fb=error", req.url));
  }
}
