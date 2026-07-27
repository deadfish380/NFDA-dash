import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Single db client. DATABASE_URL points at local Docker Postgres in dev and at
 * Supabase in production — nothing else changes. `prepare: false` keeps it
 * compatible with Supabase's transaction pooler. Falls back to the docker-compose
 * default so local dev works with zero config.
 */
const LOCAL_DEFAULT = "postgres://nfda:nfda@localhost:5434/nfda";
const connectionString = process.env.DATABASE_URL ?? LOCAL_DEFAULT;

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export { schema };
