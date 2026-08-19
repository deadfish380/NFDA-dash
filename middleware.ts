import { NextResponse, type NextRequest } from "next/server";

/**
 * Simple single-admin gate. When ADMIN_PASSWORD is set, every page requires a
 * valid session cookie; otherwise the visitor is bounced to /login. With no
 * ADMIN_PASSWORD set (local dev) the gate is OFF and everything is open.
 *
 * Public exceptions (never gated):
 *  - /login              the login page + its action
 *  - /api/cron/*         hit by the scheduler with CRON_SECRET, not a browser
 *  - /api/post-image/*   fetched by Facebook to load post images — MUST be public
 */
const PUBLIC_PREFIXES = ["/login", "/api/cron", "/api/post-image"];

export function middleware(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return NextResponse.next(); // gate disabled

  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const expected = process.env.SESSION_SECRET || password;
  if (req.cookies.get("nfda_session")?.value === expected) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

// Run on everything except Next internals and static files.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
