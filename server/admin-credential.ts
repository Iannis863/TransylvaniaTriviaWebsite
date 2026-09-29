// Server-only bootstrap credential. New deployments seed it once; later password changes survive restarts.
export const ADMIN_CREDENTIAL_ID = "site-admin";
export const INITIAL_ADMIN_PASSWORD_HASH = "scrypt:2fb059bbc162ee074a4b7da0111326e0:13d232062154bc2cf840975878300873c6afba514c38bef5f911153e3c49f97b0f049931a8b6ac4aeb4a0ef78436ff7502573445041dfa0ae3b8fe329a279acc";

export async function seedAdminCredential(database: { query: (text: string, values: string[]) => Promise<unknown> }) {
  await database.query(
    "INSERT INTO app_admin_credentials (id, password_hash) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING",
    [ADMIN_CREDENTIAL_ID, INITIAL_ADMIN_PASSWORD_HASH],
  );
}
