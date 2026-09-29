import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { storage } from "./storage.js";
import { hashPassword, setupSecurity } from "./security.js";
import { registerRoutes } from "./routes.js";
import { ADMIN_CREDENTIAL_ID, INITIAL_ADMIN_PASSWORD_HASH, seedAdminCredential } from "./admin-credential.js";

test("admin bootstrap inserts a salted hash without overwriting an existing credential", async () => {
  const statements: { text: string; values: string[] }[] = [];
  await seedAdminCredential({ query: async (text, values) => { statements.push({ text, values }); } });
  assert.equal(statements.length, 1);
  assert.match(statements[0].text, /ON CONFLICT \(id\) DO NOTHING$/);
  assert.deepEqual(statements[0].values, [ADMIN_CREDENTIAL_ID, INITIAL_ADMIN_PASSWORD_HASH]);
  assert.match(INITIAL_ADMIN_PASSWORD_HASH, /^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
});

test("admin login and protected routes use the stored credential, reject legacy env passwords, and fail closed", async t => {
  const originalHash = await storage.getAdminPasswordHash();
  const originalEnv = process.env.ADMIN_PASSWORD;
  const password = randomBytes(24).toString("hex");
  const rotatedPassword = randomBytes(24).toString("hex");
  process.env.ADMIN_PASSWORD = "obsolete-environment-password";
  await storage.setAdminPasswordHash(await hashPassword(password));
  t.after(async () => {
    await storage.setAdminPasswordHash(originalHash!);
    if (originalEnv === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = originalEnv;
  });
  const app = express();
  setupSecurity(app);
  app.use(express.json());
  const server = createServer(app);
  await registerRoutes(server, app);
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).json({ message: "Internal Server Error" });
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const request = async (path: string, candidate?: string, method = "POST") => {
    const response = await fetch(base + path, { method, headers: candidate ? { "x-admin-password": candidate } : {} });
    return { status: response.status, body: await response.json() };
  };

  assert.equal((await request("/api/admin/verify")).status, 401);
  assert.equal((await request("/api/admin/verify", "wrong-password")).status, 401);
  assert.equal((await request("/api/admin/verify", process.env.ADMIN_PASSWORD)).status, 401);
  assert.deepEqual(await request("/api/admin/verify", password), { status: 200, body: { ok: true } });
  assert.equal((await request("/api/admin/users", "wrong-password", "GET")).status, 401);
  const users = await request("/api/admin/users", password, "GET");
  assert.equal(users.status, 200);
  assert.equal(JSON.stringify(users.body).includes(await storage.getAdminPasswordHash() ?? ""), false);

  const missing = t.mock.method(storage, "getAdminPasswordHash", async () => undefined);
  assert.equal((await request("/api/admin/verify", password)).status, 401);
  missing.mock.restore();
  const unavailable = t.mock.method(storage, "getAdminPasswordHash", async () => { throw new Error("Database unavailable"); });
  assert.equal((await request("/api/admin/verify", password)).status, 500);
  unavailable.mock.restore();

  await storage.setAdminPasswordHash(await hashPassword(rotatedPassword));
  assert.equal((await request("/api/admin/verify", password)).status, 401);
  assert.equal((await request("/api/admin/verify", rotatedPassword)).status, 200);
  assert.equal((await request("/api/admin/users", rotatedPassword, "GET")).status, 200);
});
