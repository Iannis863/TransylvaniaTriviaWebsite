import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { MemStorage, storage } from "./storage.js";
import { NotificationService, notifications, welcomeEmailScope, gamesEmailScope } from "./notifications.js";
import { buildWelcomeEmail, buildGamesCompletedEmail, buildEventEmail, type EmailPayload } from "./email.js";
import { getPuzzleWeekId, getRealCurrentWeekIndex, getWeekDateRange } from "../shared/puzzle-week.js";
import { registerRoutes } from "./routes.js";
import { setupSecurity } from "./security.js";

const now = new Date("2026-10-02T10:00:00Z");
const games = ["WORDLE", "TARGET", "TIMELINE", "CONNECTIONS", "GLOBLE"];
async function teamFixture() {
  const source = new MemStorage();
  const captain = await source.createUser({ name: "Ana", email: "ana@example.com", role: "MEMBER" });
  const member = await source.createUser({ name: "Dan", email: "dan@example.com", role: "MEMBER", language: "en" });
  const team = await source.createTeam({ name: "Curioșii", leaderId: captain.id, inviteCode: "MAIL-TEST" });
  await source.updateUserTeam(member.id, team.id);
  const weekId = getPuzzleWeekId(getRealCurrentWeekIndex(now));
  const solve = async (types = games, week = weekId) => {
    for (const gameType of types) await source.savePuzzleProgress({ teamId: team.id, editionId: week, gameType, isSolved: true });
  };
  return { source, captain, member, team, weekId, solve };
}

test("welcome and completion emails localize copy, escape names, link to the right sections, and retain gold masks", () => {
  for (const language of ["ro", "en"] as const) {
    const details = { email: "ana@example.com", name: "Ana <script>&", teamName: "A <img src=x>", createdAt: now, language };
    const welcome = buildWelcomeEmail(details);
    const completion = buildGamesCompletedEmail(details);
    assert.match(welcome.text, /13:00/);
    assert.match(welcome.text, /ana@example.com/);
    assert.match(welcome.text, language === "ro" ? /codul de invitație/ : /invitation code/);
    assert.match(welcome.html, /href="https:\/\/transilvaniatrivia.ro\/#team"/);
    assert.match(completion.html, /href="https:\/\/transilvaniatrivia.ro\/#games"/);
    for (const email of [welcome, completion]) {
      assert.match(email.html, new RegExp(`lang="${language}"`));
      assert.ok(!email.html.includes("<script>") && !email.html.includes("<img src=x>"));
      assert.match(email.html, /&lt;script&gt;&amp;/);
      assert.match(email.html, /email-text-ffc30b/);
      assert.match(email.html, /email-bg-ffc30b/);
      assert.match(email.html, /linear-gradient\(#ffc30b,#ffc30b\)/);
      assert.match(email.html, /background-clip:text; color:transparent/);
      assert.match(email.html, /div > u \+ .trivia-email-body/);
    }
    assert.match(completion.html, /A &lt;img src=x&gt;/);
  }
  const event = buildEventEmail("confirmation", { email: "a@example.com", name: "Ana", teamName: "Team", memberCount: 4, eventDate: now, isCaptain: true });
  assert.equal((event.html.match(/border-bottom:1px solid #38204e/g) ?? []).length, 3, "Only internal detail rows have separators");
  assert.equal((buildWelcomeEmail({ email: "a@example.com", name: "Ana", createdAt: now }).html.match(/border-bottom:1px solid #38204e/g) ?? []).length, 2);
});

test("welcome failures retry with the same delivery ID; concurrent calls cannot resend a success", async t => {
  t.mock.timers.enable({ apis: ["Date"], now });
  const source = new MemStorage();
  const user = await source.createUser({ name: "Ana", email: "ana@example.com", role: "MEMBER", language: "en" });
  let success = false;
  const sent: { payload: EmailPayload; id: string | undefined }[] = [];
  const service = new NotificationService(source, async (payload, id) => { sent.push({ payload, id }); return { success }; }, null);
  await service.queueWelcome(user);
  assert.equal((await source.getUsersPendingWelcome()).length, 0);
  assert.deepEqual(await service.deliver(welcomeEmailScope(user.id), now), { sent: 0, failed: 1 });
  success = true;
  await service.queueWelcome(user);
  const retryAt = new Date(now.getTime() + 61000);
  await Promise.all([service.deliver(undefined, retryAt), service.deliver(undefined, retryAt)]);
  await service.queueWelcome(user);
  await service.deliver(undefined, retryAt);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].id, sent[1].id);
  assert.match(sent[1].payload.html, /lang="en"/);
  assert.equal((await service.listDeliveries()).length, 1);
});

test("completion needs all five current games and an event; retries and weekly resets preserve per-member deduplication", async t => {
  t.mock.timers.enable({ apis: ["Date"], now });
  const { source, member, captain, team, weekId, solve } = await teamFixture();
  const sent: EmailPayload[] = [];
  let failMember = true;
  const service = new NotificationService(source, async payload => { sent.push(payload); return { success: payload.to !== member.email || !failMember }; }, null);
  await solve(games.slice(0, 4));
  await service.queueGamesCompleted(team.id, weekId, now);
  assert.equal((await service.listDeliveries()).length, 0);
  await solve(["SUDOKU"]);
  await service.queueGamesCompleted(team.id, weekId, now);
  assert.equal((await service.listDeliveries()).length, 0, "Legacy Sudoku cannot replace a current game");
  await solve(["GLOBLE"]);
  await Promise.all([service.queueGamesCompleted(team.id, weekId, now), service.queueGamesCompleted(team.id, weekId, now)]);
  assert.equal((await service.listDeliveries()).length, 2);
  await Promise.all([service.deliver(gamesEmailScope(team.id, weekId), now), service.deliver(gamesEmailScope(team.id, weekId), now)]);
  assert.equal(sent.length, 2);
  assert.match(sent.find(item => item.to === captain.email)!.html, /lang="ro"/);
  assert.match(sent.find(item => item.to === member.email)!.html, /lang="en"/);
  failMember = false;
  await service.deliver(undefined, new Date(now.getTime() + 61000));
  assert.equal(sent.length, 3);
  assert.equal(sent.filter(item => item.to === captain.email).length, 1);
  await source.resetPuzzleProgress(team.id, weekId);
  await solve();
  await service.queueGamesCompleted(team.id, weekId, now);
  await service.deliver(undefined, new Date(now.getTime() + 120000));
  assert.equal(sent.length, 3, "Resetting and completing the same week must not send another notification");
  const nextWeek = new Date("2026-10-09T10:00:00Z");
  const nextId = getPuzzleWeekId(getRealCurrentWeekIndex(nextWeek));
  await solve(games, nextId);
  await service.queueGamesCompleted(team.id, nextId, nextWeek);
  await service.deliver(undefined, nextWeek);
  assert.equal(sent.length, 5, "A new event week can notify both members again");
  const practice = new Date("2026-09-16T10:00:00Z");
  const practiceId = getPuzzleWeekId(getRealCurrentWeekIndex(practice));
  await solve(games, practiceId);
  await service.queueGamesCompleted(team.id, practiceId, practice);
  assert.equal((await service.listDeliveries()).length, 4, "Practice weeks never promise an unavailable secret");
  await service.queueGamesCompleted(team.id, weekId, nextWeek);
  assert.equal((await service.listDeliveries()).length, 4, "Old weeks cannot generate new notifications");
});

test("pending game mail is cancelled for departed members and expires at the weekly reset", async t => {
  t.mock.timers.enable({ apis: ["Date"], now });
  const { source, member, captain, team, weekId, solve } = await teamFixture();
  const sent: EmailPayload[] = [];
  const service = new NotificationService(source, async payload => { sent.push(payload); return { success: true }; }, null);
  await solve();
  await service.queueGamesCompleted(team.id, weekId, now);
  await source.updateUserTeam(member.id, null);
  await service.deliver(undefined, now);
  assert.deepEqual(sent.map(item => item.to), [captain.email]);
  assert.ok((await service.listDeliveries()).find(item => item.email === member.email)?.cancelledAt);
  const expires = new NotificationService(source, async () => { assert.fail("Expired mail must not be sent"); }, null);
  await expires.queueGamesCompleted(team.id, weekId, now);
  const reset = getWeekDateRange(getRealCurrentWeekIndex(now)).nextResetAt;
  assert.deepEqual(await expires.deliver(undefined, reset), { sent: 0, failed: 0 });
});

test("scheduler recovery queues missed welcomes and completed teams without duplicating them", async t => {
  t.mock.timers.enable({ apis: ["Date"], now });
  const { source, solve } = await teamFixture();
  await solve();
  const service = new NotificationService(source, async () => ({ success: true }), null);
  await service.queuePendingAccountEmails(now);
  await service.queuePendingAccountEmails(now);
  const deliveries = await service.listDeliveries();
  assert.equal(deliveries.filter(item => item.kind === "welcome").length, 2);
  assert.equal(deliveries.filter(item => item.kind === "games-completed").length, 2);
  assert.deepEqual(await service.deliver(undefined, now), { sent: 4, failed: 0 });
});

test("account registration queues a localized welcome and succeeds even when delivery is unavailable", async t => {
  t.mock.timers.enable({ apis: ["Date"], now });
  const app = express();
  setupSecurity(app);
  app.use(express.json());
  const server = createServer(app);
  await registerRoutes(server, app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const register = (body: unknown) => fetch(`${baseUrl}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const body = { name: "Welcome Tester", email: "welcome-api@example.com", password: "secret123", language: "en" };
  const response = await register(body);
  assert.equal(response.status, 201);
  assert.ok(response.headers.get("set-cookie"));
  const user = await response.json();
  assert.equal(user.password, undefined);
  assert.equal((await storage.getUser(user.id))?.language, "en");
  const deliveries = (await notifications.listDeliveries()).filter(item => item.userId === user.id);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].kind, "welcome");
  assert.equal(deliveries[0].sentAt, null);
  assert.match(deliveries[0].payload.html, /lang="en"/);
  assert.equal((await register(body)).status, 400);
  assert.equal((await notifications.listDeliveries()).filter(item => item.userId === user.id).length, 1);
  const normal = await register({ ...body, email: "romanian-api@example.com", language: undefined });
  assert.equal(normal.status, 201);
  const romanian = await normal.json();
  assert.equal((await storage.getUser(romanian.id))?.language, "ro");
  t.mock.method(notifications, "queueWelcome", async () => { throw new Error("temporary queue failure"); });
  const interrupted = await register({ ...body, email: "recover-api@example.com" });
  assert.equal(interrupted.status, 201, "Email failure must not undo successful account creation");
  const recover = await interrupted.json();
  assert.equal((await storage.getUser(recover.id))?.welcomeQueued, false, "The scheduler can recover an interrupted enqueue");
});
