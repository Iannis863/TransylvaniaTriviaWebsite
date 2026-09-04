import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema.js";

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
  
  // Auto-patch schema: ensure 'name' column exists since it was recently added
  pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Jucător'`)
    .catch((err) => console.log("[DB Patch] Could not auto-add name column:", err.message));
} else {
  console.log("[DB] No DATABASE_URL provided. Running in In-Memory Storage Mode for local preview.");
}

export const db = dbInstance;

