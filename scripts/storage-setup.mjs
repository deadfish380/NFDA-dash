/**
 * One-shot setup + verification for post-image hosting on Supabase Storage.
 *
 * Prereqs (add to .env.local, and to Vercel env for production):
 *   NEXT_PUBLIC_SUPABASE_URL (already set) or SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← Supabase → Project Settings → API → service_role
 *   SUPABASE_STORAGE_BUCKET     (optional, defaults to "post-images")
 *
 * Run:  node --env-file=.env.local scripts/storage-setup.mjs
 *
 * It creates the public bucket if missing, uploads a tiny test image, fetches its
 * public URL to confirm it's reachable, then deletes the test object. If the final
 * line prints a working public URL, real post images will host correctly.
 */
const base = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "post-images";

if (!base || !key) {
  console.error("Missing env. Need SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const auth = { authorization: `Bearer ${key}`, apikey: key };

// 1x1 transparent PNG.
const testPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
const testKey = "_healthcheck/ping.png";

async function main() {
  // 1. Create the bucket (idempotent).
  const mk = await fetch(`${base}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...auth, "content-type": "application/json" },
    body: JSON.stringify({ name: bucket, id: bucket, public: true }),
  });
  if (mk.ok) console.log(`✓ bucket "${bucket}" created (public)`);
  else {
    const j = await mk.json().catch(() => ({}));
    if ((j.error ?? j.message ?? "").toLowerCase().includes("exist")) console.log(`✓ bucket "${bucket}" already exists`);
    else console.log(`… bucket create said: ${mk.status} ${JSON.stringify(j)} (continuing)`);
  }

  // 2. Upload a test object.
  const up = await fetch(`${base}/storage/v1/object/${bucket}/${testKey}`, {
    method: "POST",
    headers: { ...auth, "content-type": "image/png", "x-upsert": "true" },
    body: new Uint8Array(testPng),
  });
  if (!up.ok) {
    console.error(`✗ upload failed: ${up.status} ${await up.text()}`);
    process.exit(1);
  }
  console.log("✓ test image uploaded");

  // 3. Fetch the public URL.
  const publicUrl = `${base}/storage/v1/object/public/${bucket}/${testKey}`;
  const get = await fetch(publicUrl);
  console.log(get.ok ? `✓ public URL reachable (${get.status})` : `✗ public URL NOT reachable (${get.status}) — is the bucket public?`);

  // 4. Clean up the test object.
  await fetch(`${base}/storage/v1/object/${bucket}/${testKey}`, { method: "DELETE", headers: auth });

  console.log(`\nStorage is ${get.ok ? "READY ✅" : "NOT ready ❌"}. Public URL pattern:\n  ${base}/storage/v1/object/public/${bucket}/<path>`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
