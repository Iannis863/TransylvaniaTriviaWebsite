const DATABASE_VARIABLES = ["DATABASE_URL", "POSTGRES_URL", "NEON_DATABASE_URL", "POSTGRES_PRISMA_URL"] as const;

export function getDatabaseConnectionString(env: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = DATABASE_VARIABLES.map(key => env[key]?.trim()).find(Boolean);
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    if (!["postgres:", "postgresql:"].includes(parsed.protocol) || !parsed.hostname) throw new Error();
    return value;
  } catch {
    // Never include the connection string or driver parse error: both can contain credentials.
    throw Object.assign(new Error("The database connection setting is not a PostgreSQL URL."), { code: "DATABASE_URL_INVALID" });
  }
}
