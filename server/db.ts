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
  
  // Auto-patch schema: ensure all users columns exist
  const patchQueries = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Jucător'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR NOT NULL DEFAULT 'MEMBER'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '👤'`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id VARCHAR`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL`
  ];
  
  Promise.all(patchQueries.map(q => pool!.query(q)))
    .then(() => console.log("[DB Patch] Successfully auto-patched users table."))
    .catch((err) => console.log("[DB Patch] Could not auto-add columns:", err.message));
} else {
  console.log("[DB] No DATABASE_URL provided. Running in In-Memory Storage Mode for local preview.");
}

export const db = dbInstance;

