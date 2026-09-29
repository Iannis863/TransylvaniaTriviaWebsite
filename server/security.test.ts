import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { hashPassword, verifyPassword, setupSecurity } from "./security.js";
import { registerRoutes } from "./routes.js";
import { storage } from "./storage.js";
import { getCurrentOrNextEdition } from "../shared/schedule.js";

test("password hashing uses unique salts and supports legacy upgrade verification", async () => {
  const first = await hashPassword("correct password");
  const second = await hashPassword("correct password");
  assert.notEqual(first, second);
  assert.equal(await verifyPassword("correct password", first), true);
  assert.equal(await verifyPassword("wrong", first), false);
  assert.equal(await verifyPassword("legacy", "legacy"), true);
  assert.equal(await verifyPassword("wrong", "legacy"), false);
  assert.equal(await verifyPassword("anything", "scrypt:malformed"), false);
});

test("API requires real sessions, protects teams, excludes passwords, and revokes logout/reset sessions", async t => {
  assert.equal(process.env.DATABASE_URL, undefined, "Integration tests must not use a real database");
  const app = express();
  setupSecurity(app);
  app.use(express.json());
  const server = createServer(app);
  await registerRoutes(server, app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const address = server.address() as { port: number };
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const request = async (path: string, method = "GET", body?: unknown, cookie?: string, extraHeaders = {}) => {
    const res = await fetch(baseUrl + path, { method, headers: { "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...extraHeaders }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json(), cookie: res.headers.get("set-cookie")?.split(";")[0], rawCookie: res.headers.get("set-cookie") };
  };
  assert.equal((await request("/api/auth/me", "GET", undefined, undefined, { "x-user-id": "usr_vlad_leader" })).status, 401);
  assert.equal((await request("/api/admin/users", "GET", undefined, undefined, { "x-admin-password": "unconfigured-admin-password" })).status, 401);
  assert.equal((await request("/api/cron/notifications")).status, 401);
  const captain = await request("/api/auth/register", "POST", { name: "Ana", email: " ANA@test.example ", password: "secret123", role: "ADMIN", keepLoggedIn: true });
  assert.equal(captain.status, 201);
  assert.equal(captain.body.role, "MEMBER");
  assert.equal(captain.body.password, undefined);
  assert.match(captain.rawCookie!, /HttpOnly/);
  assert.match(captain.rawCookie!, /SameSite=Lax/);
  assert.match(captain.rawCookie!, /Expires=/);
  assert.ok((await storage.getUser(captain.body.id))?.password?.startsWith("scrypt:"));
  const team = await request("/api/teams", "POST", { name: "Secure Team", leaderId: "other-user" }, captain.cookie);
  assert.equal(team.status, 201);
  assert.equal(team.body.leaderId, captain.body.id);
  const member = await request("/api/auth/register", "POST", { name: "Dan", email: "dan@test.example", password: "secret123" });
  assert.ok(!member.rawCookie!.includes("Expires="));
  const joined = await request("/api/teams/join", "POST", { inviteCode: team.body.inviteCode.toLowerCase(), userId: captain.body.id }, member.cookie);
  assert.equal(joined.status, 200);
  assert.equal(joined.body.user.id, member.body.id);
  assert.equal(joined.body.members.some((x: any) => "password" in x), false);
  assert.equal((await request(`/api/teams/${team.body.id}/members/${member.body.id}`, "DELETE")).status, 401);
  assert.equal((await request(`/api/teams/${team.body.id}/members/${captain.body.id}`, "DELETE", undefined, member.cookie)).status, 403);
  const registration = { editionId: getCurrentOrNextEdition().currentEdition.id, teamId: team.body.id, teamName: "Fake Name", captainName: "Fake Captain", email: "fake@example.com", memberCount: 2 };
  assert.equal((await request("/api/registrations", "POST", registration)).status, 401);
  assert.equal((await request("/api/registrations", "POST", registration, member.cookie)).status, 403);
  const registered = await request("/api/registrations", "POST", registration, captain.cookie);
  assert.equal(registered.status, 201);
  assert.equal(registered.body.teamName, "Secure Team");
  assert.equal(registered.body.email, "ana@test.example");
  assert.equal(registered.body.emailStatus, "pending");
  assert.equal((await request("/api/registrations", "POST", registration, captain.cookie)).status, 409);
  assert.equal((await request("/api/games/progress/any?teamId=other", "GET", undefined, member.cookie)).status, 403);
  assert.equal((await request("/api/games/progress", "POST", { teamId: "other", weekId: "test", gameType: "WORDLE", isSolved: true }, member.cookie)).status, 403);
  assert.equal((await request("/api/teams/leave", "POST", {}, member.cookie, { origin: "https://evil.example" })).status, 403);
  assert.equal((await request(`/api/teams/${team.body.id}/transfer-leadership`, "PATCH", { newLeaderId: member.body.id }, captain.cookie)).status, 200);
  assert.equal((await request("/api/auth/me", "GET", undefined, captain.cookie)).body.user.password, undefined);
  assert.equal((await request("/api/auth/logout", "POST", {}, captain.cookie)).status, 200);
  assert.equal((await request("/api/auth/me", "GET", undefined, captain.cookie)).status, 401);
  const login = await request("/api/auth/login", "POST", { email: "ANA@TEST.EXAMPLE", password: "secret123" });
  assert.equal(login.status, 200);
  await storage.updateUser(captain.body.id, { password: await hashPassword("changed123") });
  assert.equal((await request("/api/auth/me", "GET", undefined, login.cookie)).status, 401);
});

test("reset codes are single-use and the five-attempt limit withstands concurrent guesses", async () => {
  const { MemStorage } = await import("./storage.js");
  const source = new MemStorage();
  await source.createResetCode("reset@example.com", "123456", new Date(Date.now() + 60000));
  await Promise.all(Array.from({ length: 6 }, () => source.consumeResetCode("reset@example.com", "000000")));
  assert.equal(await source.consumeResetCode("reset@example.com", "123456"), false);
  await source.createResetCode("reset@example.com", "123456", new Date(Date.now() + 60000));
  assert.deepEqual(await Promise.all([source.consumeResetCode("reset@example.com", "123456"), source.consumeResetCode("reset@example.com", "123456")]), [true, false]);
});

test("concurrent joins preserve the six-person team limit and leader exit promotes one member", async () => {
  const { MemStorage } = await import("./storage.js");
  const { TeamService } = await import("./team-service.js");
  const source = new MemStorage();
  const service = new TeamService(source);
  const leader = await source.createUser({ name: "Leader", email: "leader@example.com", role: "MEMBER" });
  const team = await service.create(leader.id, "Concurrent Team");
  const candidates = await Promise.all(Array.from({ length: 7 }, (_, i) => source.createUser({ name: `Member ${i}`, email: `member${i}@example.com`, role: "MEMBER" })));
  const joins = await Promise.allSettled(candidates.map(user => service.join(user.id, team.inviteCode)));
  assert.equal(joins.filter(result => result.status === "fulfilled").length, 5);
  assert.equal((await source.getTeamMembers(team.id)).length, 6);
  await service.leave(leader.id, true);
  const remaining = await source.getTeamMembers(team.id);
  assert.equal(remaining.length, 5);
  assert.equal(remaining.filter(user => user.role === "TEAM_LEADER").length, 1);
  assert.equal((await source.getTeam(team.id))?.leaderId, remaining.find(user => user.role === "TEAM_LEADER")?.id);
});

test("a legacy password upgrade cannot overwrite a simultaneous password reset", async () => {
  const { MemStorage } = await import("./storage.js");
  const source = new MemStorage();
  const user = await source.createUser({ name: "Legacy", email: "legacy@example.com", role: "MEMBER", password: "old-password" });
  const resetHash = await hashPassword("new-password");
  await source.updateUser(user.id, { password: resetHash });
  assert.equal(await source.upgradeLegacyPassword(user.id, "old-password", await hashPassword("old-password")), undefined);
  assert.equal((await source.getUser(user.id))?.password, resetHash);
});
