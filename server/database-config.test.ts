import test from "node:test";
import assert from "node:assert/strict";
import { getDatabaseConnectionString } from "./database-config.js";

test("database config accepts the standard Neon and Vercel variables with DATABASE_URL taking precedence", () => {
  const pooled = "postgresql://user:password@database.invalid/app?sslmode=require";
  assert.equal(getDatabaseConnectionString({}), undefined);
  for (const key of ["DATABASE_URL", "POSTGRES_URL", "NEON_DATABASE_URL", "POSTGRES_PRISMA_URL"]) {
    assert.equal(getDatabaseConnectionString({ [key]: `  ${pooled}  ` }), pooled);
  }
  assert.equal(getDatabaseConnectionString({ DATABASE_URL: pooled, POSTGRES_URL: "postgresql://other.invalid/other" }), pooled);
  assert.equal(getDatabaseConnectionString({ DATABASE_URL: " ", POSTGRES_URL: pooled }), pooled);
});

test("invalid database URLs produce safe diagnostics without leaking credentials", () => {
  for (const value of ["mailto:user:secret@database.invalid", "https://database.invalid", "not-a-url-secret"]) {
    assert.throws(() => getDatabaseConnectionString({ DATABASE_URL: value }), error => {
      assert.equal((error as { code: string }).code, "DATABASE_URL_INVALID");
      assert.equal(String(error).includes(value), false);
      return true;
    });
  }
});
