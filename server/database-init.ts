import { createHash, randomBytes } from "node:crypto";
import type { Pool } from "pg";
import { seedAdminCredential } from "./admin-credential.js";

const runtimeSettingsSql = `CREATE TABLE IF NOT EXISTS app_runtime_settings (
  key VARCHAR PRIMARY KEY,
  value TEXT NOT NULL
)`;

const legacyUpgradesSql = `
  ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone_number TEXT;
  ALTER TABLE app_weekly_puzzle_progress DROP CONSTRAINT IF EXISTS app_weekly_puzzle_progress_edition_id_fkey;
  ALTER TABLE app_registrations DROP CONSTRAINT IF EXISTS app_registrations_edition_id_fkey;
  ALTER TABLE app_theme_suggestions DROP CONSTRAINT IF EXISTS app_theme_suggestions_edition_id_fkey;
`;

export async function initializeDatabase(pool: Pick<Pool, "connect">, schemaSql: string): Promise<string> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // This transaction lock also works with Neon's transaction pooler.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('transilvania-trivia-schema'))");
    await client.query(runtimeSettingsSql);
    const version = createHash("sha256").update(schemaSql + legacyUpgradesSql).digest("hex");
    const current = await client.query("SELECT value FROM app_runtime_settings WHERE key = 'schema_version'");
    if (current.rows[0]?.value !== version) {
      await client.query(schemaSql);
      await client.query(legacyUpgradesSql);
      await client.query("INSERT INTO app_runtime_settings (key, value) VALUES ('schema_version', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", [version]);
    }
    await seedAdminCredential(client);
    // Generated per database, never committed to source or exposed to the browser.
    await client.query("INSERT INTO app_runtime_settings (key, value) VALUES ('session_secret', $1) ON CONFLICT (key) DO NOTHING", [randomBytes(48).toString("hex")]);
    const session = await client.query("SELECT value FROM app_runtime_settings WHERE key = 'session_secret'");
    const secret = session.rows[0]?.value;
    if (typeof secret !== "string" || secret.length < 32) throw new Error("Invalid stored session configuration");
    await client.query("COMMIT");
    return secret;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch { /* Preserve the initialization error. */ }
    throw error;
  } finally { client.release(); }
}
