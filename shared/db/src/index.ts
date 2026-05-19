import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL environment variable is required in production");
}

const isProd = process.env.NODE_ENV === "production";
// Cloud Postgres (Render, Neon, Supabase) requires SSL; local dev does not.
const useSsl =
  isProd ||
  process.env.DATABASE_SSL === "true" ||
  /sslmode=require/i.test(DATABASE_URL ?? "");

/**
 * Real Drizzle/Postgres connection.
 * If DATABASE_URL is missing in dev, it will fail gracefully when called.
 */
export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
