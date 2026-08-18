import type { NextRequest } from "next/server";

/**
 * Cron endpoints are protected by CRON_SECRET. Vercel Cron sends it as
 * `Authorization: Bearer <CRON_SECRET>`. When the secret is unset (local dev) we
 * allow the call so you can hit the endpoints by hand — always set it in prod.
 */
export function cronAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
