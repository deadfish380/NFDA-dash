/**
 * Prints the complete set of environment variables to paste into Vercel.
 * Copies existing values from .env.local, generates the new secrets, and fills
 * in the live URL. Run:
 *
 *   node --env-file=.env.local scripts/vercel-env.mjs
 *
 * Then copy the output into Vercel → Settings → Environment Variables (Production).
 */
import { randomBytes } from "node:crypto";

const gen = () => randomBytes(32).toString("hex");
const URL = "https://nfda-facebook-recovery.vercel.app";
const e = process.env;

const rows = [
  // Copied from .env.local
  ["DATABASE_URL", e.DATABASE_URL],
  ["OPENAI_API_KEY", e.OPENAI_API_KEY],
  ["SUPABASE_SERVICE_ROLE_KEY", e.SUPABASE_SERVICE_ROLE_KEY],
  ["NEXT_PUBLIC_SUPABASE_URL", e.NEXT_PUBLIC_SUPABASE_URL ?? "https://ladjcajtpjjskrqodlvy.supabase.co"],
  ["SUPABASE_STORAGE_BUCKET", e.SUPABASE_STORAGE_BUCKET ?? "post-images"],
  ["META_APP_ID", e.META_APP_ID],
  ["META_APP_SECRET", e.META_APP_SECRET],
  // Fixed for production
  ["FACEBOOK_DRY_RUN", "false"],
  ["POST_IMAGES", "true"],
  ["APP_BASE_URL", URL],
  // Freshly generated secrets
  ["APP_ENCRYPTION_KEY", gen()],
  ["CRON_SECRET", gen()],
  ["SESSION_SECRET", gen()],
  // Login — change the email, keep or change the password
  ["ADMIN_EMAIL", "you@example.com"],
  ["ADMIN_PASSWORD", randomBytes(9).toString("base64url")],
];

console.log("\n# ---- paste into Vercel (Production) ----\n");
for (const [k, v] of rows) console.log(`${k}=${v ?? ""}`);
console.log("\n# ----------------------------------------");
console.log("# 1. Change ADMIN_EMAIL to your email (ADMIN_PASSWORD above is a random one — keep it or change it).");
console.log(`# 2. In the Meta app, add this OAuth redirect URI: ${URL}/api/facebook/callback`);
console.log("# 3. After saving these in Vercel, redeploy so they take effect.\n");
