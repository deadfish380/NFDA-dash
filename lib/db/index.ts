import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Single db client. DATABASE_URL points at local Docker Postgres in dev and at
 * the Supabase transaction pooler in production — nothing else changes.
 * `prepare: false` is required for the transaction pooler. On serverless we keep
 * a tiny pool and cache the client on globalThis so each warm instance reuses one
 * connection instead of exhausting the pooler.
 */
const LOCAL_DEFAULT = "postgres://nfda:nfda@localhost:5434/nfda";
const connectionString = process.env.DATABASE_URL ?? LOCAL_DEFAULT;
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);

const globalForDb = globalThis as unknown as { __pg?: ReturnType<typeof postgres> };

const client =
  globalForDb.__pg ??
  postgres(connectionString, {
    prepare: false,
    ssl: isLocal ? false : "require",
    max: isLocal ? 10 : 1, // one connection per serverless instance
    idle_timeout: 20,
    connect_timeout: 15,
  });

// Reuse across hot-reloads (dev) and warm invocations (serverless).
globalForDb.__pg = client;

export const db = drizzle(client, { schema });
export { schema };
