import "server-only";
import { db, schema } from "@/lib/db";

/**
 * Persist an image and return a URL the dashboard (and Facebook) can load.
 *
 * Preferred (if configured): a public Supabase Storage bucket → CDN URL. Requires
 * SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) + SUPABASE_SERVICE_ROLE_KEY and a
 * public bucket (default "post-images").
 *
 * Fallback (no config needed): store the bytes in the `post_images` table and
 * return `/api/post-image/<id>` — a tiny, stable path. It keeps image bytes OUT of
 * the app-wide posts query, and in production resolves to a real https URL that
 * Facebook can load too. Uses the Storage REST API directly (no extra SDK).
 */
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "post-images";

function supabaseUrl(): string | null {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;
}

export function storageConfigured(): boolean {
  return Boolean(supabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function storeImage(
  bytes: Buffer,
  key: string,
  contentType = "image/png",
  orgId?: string,
): Promise<string> {
  const base = supabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (base && serviceKey) {
    const res = await fetch(`${base}/storage/v1/object/${BUCKET}/${key}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${serviceKey}`,
        "content-type": contentType,
        "x-upsert": "true",
      },
      body: new Uint8Array(bytes),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Image upload failed (${res.status}): ${detail.slice(0, 200)}`);
    }
    return `${base}/storage/v1/object/public/${BUCKET}/${key}`;
  }

  // DB-backed fallback — bytes live in post_images, served by a tiny route.
  const [row] = await db
    .insert(schema.postImages)
    .values({ orgId: orgId ?? null, contentType, data: bytes.toString("base64") })
    .returning({ id: schema.postImages.id });
  return `/api/post-image/${row.id}`;
}
