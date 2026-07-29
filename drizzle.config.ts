import { defineConfig } from "drizzle-kit";

// drizzle-kit doesn't auto-load .env.local; do it here so db:push targets the
// configured database (Supabase in prod, local Docker otherwise).
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local — fall back to the local default below
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://nfda:nfda@localhost:5434/nfda",
  },
});
