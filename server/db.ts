import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { seedAdminCredential } from "./admin-credential.js";

export let pool: pg.Pool | null = null;
let dbInstance: any = null;
export let databaseReady: Promise<unknown> = Promise.resolve();

if (process.env.DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    // Respect the connection URL's TLS settings; never silently disable certificate checks.
    ...(process.env.DATABASE_CA_CERT ? { ssl: { ca: process.env.DATABASE_CA_CERT, rejectUnauthorized: true } } : {}),
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  dbInstance = drizzle(pool, { schema });
  
  // Auto-init schema from schema.sql
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const schemaSql = fs.readFileSync(path.resolve(__dirname, "../schema.sql"), "utf-8");
    databaseReady = pool.query(schemaSql)
      .then(() => {
        console.log("[DB Init] Automatically created all app_ tables from schema.sql!");
        // Ensure new columns added later are patched
        return pool!.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone_number TEXT`);
      })
      .then(() => {
        // Drop problematic foreign keys for dynamically generated editions
        return pool!.query(`
          ALTER TABLE app_weekly_puzzle_progress DROP CONSTRAINT IF EXISTS app_weekly_puzzle_progress_edition_id_fkey;
          ALTER TABLE app_registrations DROP CONSTRAINT IF EXISTS app_registrations_edition_id_fkey;
          ALTER TABLE app_theme_suggestions DROP CONSTRAINT IF EXISTS app_theme_suggestions_edition_id_fkey;
        `);
      })
      .then(() => seedAdminCredential(pool!))
      .catch((err) => { console.error("[DB Init Error] Schema initialization failed"); throw err; });
  } catch (err: any) {
    throw new Error("Failed to read database schema", { cause: err });
  }
} else {
  console.log("[DB] No DATABASE_URL provided. Running in In-Memory Storage Mode for local preview.");
}

export const db = dbInstance;
