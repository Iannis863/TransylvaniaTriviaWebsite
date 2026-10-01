import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { DuplicateEmailError, MemStorage, storage } from "./storage.js";
import { setupSecurity, verifyPassword } from "./security.js";
import { registerRoutes } from "./routes.js";

const userData = (email: string) => ({ name: "Account Test", email, password: "secret123", role: "MEMBER" as const });

test("concurrent account creation and email edits preserve normalized email uniqueness", async () => {
  const source = new MemStorage();
  const created = await Promise.allSettled([
    source.createUser(userData(" Mixed@Example.com ")),
    source.createUser(userData("mixed@example.com")),
  ]);
  assert.equal(created.filter(result => result.status === "fulfilled").length, 1);
  assert.ok(created.some(result => result.status === "rejected" && result.reason instanceof DuplicateEmailError));
  const first = (await source.getUserByEmail("MIXED@example.com"))!;
  assert.equal(first.email, "mixed@example.com");
  const second = await source.createUser(userData("second@example.com"));
  await assert.rejects(source.updateUser(second.id, { email: " MIXED@example.com " }), DuplicateEmailError);
  assert.equal((await source.getUser(second.id))?.email, "second@example.com");
  const changes = await Promise.allSettled([
    source.updateUser(first.id, { email: "shared@example.com" }),
    source.updateUser(second.id, { email: "SHARED@example.com" }),
  ]);
  assert.equal(changes.filter(result => result.status === "fulfilled").length, 1);
});

test("email changes and account deletion invalidate reset codes before an address is reused", async () => {
  const source = new MemStorage();
  const original = await source.createUser(userData("reused@example.com"));
  await source.createResetCode(original.email, "123456", new Date(Date.now() + 60000));
  await source.updateUser(original.id, { email: "new@example.com" });
  await source.createUser(userData("reused@example.com"));
  assert.equal(await source.consumeResetCode("reused@example.com", "123456"), false);
  await source.createResetCode("new@example.com", "654321", new Date(Date.now() + 60000));
  await source.deleteUser(original.id);
  await source.createUser(userData("new@example.com"));
  assert.equal(await source.consumeResetCode("new@example.com", "654321"), false);
});

test("API resolves simultaneous duplicate signups and completes password-reset, session revocation, and deletion flows", async t => {
  assert.equal(process.env.DATABASE_URL, undefined);
  assert.equal(process.env.RESEND_API_KEY, undefined);
  const app = express();
  setupSecurity(app);
  app.use(express.json());
  const server = createServer(app);
  await registerRoutes(server, app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const request = async (path: string, method = "GET", body?: unknown, cookie?: string) => {
    const response = await fetch(base + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  };
  const attempts = await Promise.all([
    request("/api/auth/register", "POST", userData("simultaneous@example.com")),
    request("/api/auth/register", "POST", userData(" SIMULTANEOUS@example.com ")),
  ]);
  assert.deepEqual(attempts.map(result => result.status).sort(), [201, 409]);
  const account = attempts.find(result => result.status === 201)!;
  assert.equal((await request("/api/auth/login", "POST", { email: "simultaneous@example.com", password: "wrong-password" })).status, 401);
  await storage.createResetCode("simultaneous@example.com", "123456", new Date(Date.now() + 60000));
  assert.equal((await request("/api/auth/reset-password", "POST", { email: "simultaneous@example.com", code: "000000", newPassword: "new-secret" })).status, 400);
  assert.equal((await request("/api/auth/reset-password", "POST", { email: "simultaneous@example.com", code: "123456", newPassword: "new-secret" })).status, 200);
  assert.equal(await verifyPassword("new-secret", (await storage.getUser(account.body.id))!.password), true);
  assert.equal((await request("/api/auth/me", "GET", undefined, account.cookie)).status, 401);
  assert.equal((await request("/api/auth/reset-password", "POST", { email: "simultaneous@example.com", code: "123456", newPassword: "another-secret" })).status, 400);
  const login = await request("/api/auth/login", "POST", { email: "simultaneous@example.com", password: "new-secret" });
  assert.equal(login.status, 200);
  assert.equal((await request("/api/auth/me", "DELETE", undefined, login.cookie)).status, 200);
  assert.equal((await request("/api/auth/me", "GET", undefined, login.cookie)).status, 401);
  assert.equal(await storage.getUser(account.body.id), undefined);
});

test("reset issuance cannot follow an address to a different account, and resetting consumes and writes atomically", async () => {
  const source = new MemStorage();
  const original = await source.createUser(userData("owner@example.com"));
  const expires = new Date(Date.now() + 60000);
  await source.createResetCode(original.email, "123456", expires, original.id);
  await source.updateUser(original.id, { email: "moved@example.com" });
  const replacement = await source.createUser(userData("owner@example.com"));
  assert.equal(await source.createResetCode(original.email, "654321", expires, original.id), false);
  assert.equal(await source.resetUserPassword(original.email, "123456", "old-reset-hash"), false);
  assert.equal((await source.getUser(replacement.id))?.password, "secret123");
  assert.equal(await source.createResetCode(replacement.email, "222222", expires, replacement.id), true);
  assert.deepEqual(await Promise.all([
    source.resetUserPassword(replacement.email, "222222", "first-reset-hash"),
    source.resetUserPassword(replacement.email, "222222", "second-reset-hash"),
  ]), [true, false]);
  assert.equal((await source.getUser(replacement.id))?.password, "first-reset-hash");
  assert.equal((await source.getUser(original.id))?.password, "secret123");
});

test("simultaneous reset requests issue only one code and a failed older delivery cannot remove its replacement", async () => {
  const source = new MemStorage();
  const user = await source.createUser(userData("reset-request@example.com"));
  const expiry = new Date(Date.now() + 60000);
  assert.deepEqual(await Promise.all([
    source.createResetCode(user.email, "111111", expiry, user.id),
    source.createResetCode(user.email, "222222", expiry, user.id),
  ]), [true, false]);
  assert.equal((await source.getValidResetCode(user.email))?.code, "111111");
  await source.createResetCode(user.email, "333333", expiry);
  await source.deleteResetCodes(user.email, "111111");
  assert.equal((await source.getValidResetCode(user.email))?.code, "333333");
});
