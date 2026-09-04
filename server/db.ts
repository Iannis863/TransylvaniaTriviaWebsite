import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

let pool: pg.Pool | null = null;
let dbInstance: any = null;

if (process.env.DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 1,
    connectionTimeoutMillis: 5000,
  });
  dbInstance = drizzle(pool, { schema });
  
  // Auto-init schema from schema.sql
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const schemaSql = fs.readFileSync(path.resolve(__dirname, "../schema.sql"), "utf-8");
    pool.query(schemaSql)
      .then(() => {
        console.log("[DB Init] Automatically created all app_ tables from schema.sql!");
        // Ensure new columns added later are patched
        return pool!.query(`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone_number TEXT`);
      })
      .catch((err) => console.error("[DB Init Error] Failed to execute schema.sql:", err.message));
  } catch (err: any) {
    console.error("[DB Init Error] Failed to read schema.sql:", err.message);
  }
} else {
  console.log("[DB] No DATABASE_URL provided. Running in In-Memory Storage Mode for local preview.");
}

export const db = dbInstance;

