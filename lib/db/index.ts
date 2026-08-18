import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Single db client. DATABASE_URL points at local Docker Postgres in dev and at
 * the Supabase transaction pooler in production — nothing else changes.
 * `prepare: false` is required for the transaction pooler.
 *
 * Pool size matters: with `max: 1`, two concurrent queries (e.g. Promise.all in
 * getOrganizations) share one pgbouncer transaction-mode connection, and the
 * interleaved responses corrupt the result ("Cannot read properties of undefined
 * (reading 'map')"). So we give a real pool locally and in dev, and keep it small
 * on serverless prod so many warm instances don't exhaust the pooler.
 */
const LOCAL_DEFAULT = "postgres://nfda:nfda@localhost:5434/nfda";
const connectionString = process.env.DATABASE_URL ?? LOCAL_DEFAULT;
const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
const isDev = process.env.NODE_ENV !== "production";

const globalForDb = globalThis as unknown as { __pg?: ReturnType<typeof postgres> };

const client =
  globalForDb.__pg ??
  postgres(connectionString, {
    prepare: false,
    ssl: isLocal ? false : "require",
    // Local/dev: a real pool so concurrent queries don't collide. Serverless
    // prod: small, since each warm instance holds its own pool.
    max: isLocal ? 10 : isDev ? 5 : 2,
    idle_timeout: 20,
    connect_timeout: 15,
  });

// Reuse across hot-reloads (dev) and warm invocations (serverless).
globalForDb.__pg = client;

export const db = drizzle(client, { schema });
export { schema };
