import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";
import { readFile } from "node:fs/promises";
import { getDatabaseConnectionString } from "./database-config.js";
import { initializeDatabase } from "./database-init.js";

export let pool: pg.Pool | null = null;
export let db: ReturnType<typeof drizzle> | null = null;
export let databaseSessionSecret: string | undefined;
let configurationError: unknown;
let ready: Promise<void> | undefined;

try {
  const connectionString = getDatabaseConnectionString();
  if (connectionString) {
    pool = new pg.Pool({
      connectionString,
      // Respect the URL's TLS settings and validate custom certificates when provided.
      ...(process.env.DATABASE_CA_CERT ? { ssl: { ca: process.env.DATABASE_CA_CERT, rejectUnauthorized: true } } : {}),
      max: 1,
      connectionTimeoutMillis: 20000,
      idleTimeoutMillis: 10000,
      maxLifetimeSeconds: 300,
    });
    // Idle Neon connections may close when its compute suspends. The pool replaces them on demand.
    pool.on("error", () => console.error("[DB] An idle connection closed; the next request will reconnect."));
    db = drizzle(pool, { schema });
  }
} catch (error) { configurationError = error; }

export function ensureDatabaseReady(): Promise<void> {
  if (configurationError) return Promise.reject(configurationError);
  if (!pool) {
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      return Promise.reject(Object.assign(new Error("A database connection is required."), { code: "DATABASE_URL_MISSING" }));
    }
    return Promise.resolve();
  }
  if (!ready) {
    ready = (async () => {
      const schemaSql = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
      databaseSessionSecret = await initializeDatabase(pool!, schemaSql);
      console.log("[DB] Database initialized.");
    })().catch(error => {
      // A temporary wake-up or network failure must not poison this Vercel instance forever.
      ready = undefined;
      console.error("[DB] Initialization failed; a later request will retry.");
      throw Object.assign(new Error("Database initialization failed."), { code: "DATABASE_UNAVAILABLE", cause: error });
    });
  }
  return ready;
}
