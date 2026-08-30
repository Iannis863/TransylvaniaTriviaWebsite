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
} else {
  console.log("[DB] No DATABASE_URL provided. Running in In-Memory Storage Mode for local preview.");
}

export const db = dbInstance;

