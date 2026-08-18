import { type NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";

// Serves a DB-stored post image by id. A stable, cacheable URL — used when
// Supabase Storage isn't configured. In production this is a real https URL that
// Facebook can load when attaching the photo.
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [row] = await db
    .select({ data: schema.postImages.data, contentType: schema.postImages.contentType })
    .from(schema.postImages)
    .where(eq(schema.postImages.id, id))
    .limit(1);

  if (!row) return new NextResponse("Not found", { status: 404 });

  const bytes = Buffer.from(row.data, "base64");
  return new NextResponse(bytes, {
    headers: {
      "content-type": row.contentType,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
