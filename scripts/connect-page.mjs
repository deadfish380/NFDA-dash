/**
 * Connect a business-owned Facebook page to an org using a System User token
 * (bypasses the OAuth picker, which can't see business-owned pages).
 *
 * Set in .env.local, then run:
 *   CONNECT_ORG=nfda \
 *   NFDA_REAL_PAGE_ID=<page id> NFDA_REAL_PAGE_TOKEN=<system user token> \
 *   node --env-file=.env.local scripts/connect-page.mjs
 *
 * It verifies the token can see the page, encrypts the token at rest (if
 * APP_ENCRYPTION_KEY is set), stores it on the org, and marks it connected.
 */
import postgres from "postgres";
import { createCipheriv, randomBytes, scryptSync } from "node:crypto";

const org = process.env.CONNECT_ORG || "nfda";
const pageId = process.env.NFDA_REAL_PAGE_ID;
const token = process.env.NFDA_REAL_PAGE_TOKEN;

if (!pageId || !token) {
  console.error("Missing NFDA_REAL_PAGE_ID or NFDA_REAL_PAGE_TOKEN in the environment.");
  process.exit(1);
}

// Mirror lib/crypto.ts so the app can decrypt it.
function encryptSecret(plain) {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret) return plain; // stored as-is; app reads plaintext fine
  const key = scryptSync(secret, "nfda-token-salt", 32);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return "enc:v1:" + Buffer.concat([iv, tag, enc]).toString("base64");
}

// 1. Verify the token can actually see/post this page.
const res = await fetch(
  `https://graph.facebook.com/v21.0/${pageId}?fields=id,name,access_token&access_token=${token}`,
);
const page = await res.json();
if (!res.ok) {
  console.error("Facebook rejected the token/page:", JSON.stringify(page?.error ?? page).slice(0, 300));
  process.exit(1);
}
console.log(`✓ token verified for page: ${page.name} (${page.id})`);

// Prefer the page-scoped access token Facebook returns, if any.
const pageToken = page.access_token || token;

// 2. Store it on the org.
const sql = postgres(process.env.DATABASE_URL, { prepare: false, ssl: "require", max: 1 });
await sql`
  UPDATE organizations
  SET facebook_page_id = ${page.id},
      facebook_page = ${page.name},
      facebook_page_token = ${encryptSecret(pageToken)},
      facebook_connected = true
  WHERE id = ${org}
`;
console.log(`✓ connected "${page.name}" to org "${org}". Facebook shows Connected now.`);
await sql.end();
