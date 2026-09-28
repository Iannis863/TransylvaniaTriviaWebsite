// Run explicitly with DATABASE_URL set to the intended database.
// Uses compare-and-swap updates so a simultaneous password reset cannot be overwritten.
import { databaseReady, pool } from "../server/db.js";
import { storage } from "../server/storage.js";
import { hashPassword } from "../server/security.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required; no passwords were changed");
try {
  await databaseReady;
  let updated = 0;
  for (const user of await storage.getAllUsers()) {
    if (!user.password || user.password.startsWith("scrypt:")) continue;
    if (await storage.upgradeLegacyPassword(user.id, user.password, await hashPassword(user.password))) updated++;
  }
  console.log(`Hashed ${updated} legacy passwords. No password values were logged.`);
} finally {
  await pool?.end();
}
