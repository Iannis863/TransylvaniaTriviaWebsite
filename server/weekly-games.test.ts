import test from "node:test";
import { getTargetPuzzle, isTargetSolution } from "../shared/target-game.js";
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { getRealCurrentWeekIndex, getWeekDateRange, getPuzzleWeekId } from "../shared/puzzle-week.js";
import { getEditionForWeek, getPreviewWeekIndex } from "../client/src/lib/weeklyEngine.js";
import { getWeeklyGameData } from "../client/src/lib/weeklyGames.js";
import { setupSecurity } from "./security.js";
import { registerRoutes } from "./routes.js";
import { storage } from "./storage.js";

// Romania is UTC+3 in summer and UTC+2 in winter; the reset must remain local midnight.
test("all weekly content rolls over at Wednesday 00:00 Romania time, never Thursday", () => {
  for (const boundary of ["2026-09-29T21:00:00Z", "2026-10-27T22:00:00Z", "2027-03-30T21:00:00Z"]) {
    const midnight = new Date(boundary);
    const before = new Date(midnight.getTime() - 1);
    const previous = getRealCurrentWeekIndex(before);
    const next = getRealCurrentWeekIndex(midnight);
    assert.equal(next, previous + 1);
    assert.equal(getWeekDateRange(next).startDate.getTime(), midnight.getTime());
    assert.equal(getRealCurrentWeekIndex(new Date(midnight.getTime() + 86400000)), next);
    const oldContent = getWeeklyGameData(previous);
    const newContent = getWeeklyGameData(next);
    for (const field of ["wordleWord", "targetPuzzle", "timelineEvents", "connectionsGroups", "globleTarget"] as const) {
      assert.notDeepEqual(oldContent[field], newContent[field], `${field} must advance at ${boundary}`);
    }
  }
});

test("DST weeks last 167 or 169 hours without moving Wednesday's reset", () => {
  const autumn = getWeekDateRange(getRealCurrentWeekIndex(new Date("2026-10-22T12:00:00Z")));
  const spring = getWeekDateRange(getRealCurrentWeekIndex(new Date("2027-03-25T12:00:00Z")));
  assert.equal((autumn.nextResetAt.getTime() - autumn.startDate.getTime()) / 3600000, 169);
  assert.equal((spring.nextResetAt.getTime() - spring.startDate.getTime()) / 3600000, 167);
  assert.equal(autumn.nextResetAt.toISOString(), "2026-10-27T22:00:00.000Z");
  assert.equal(spring.nextResetAt.toISOString(), "2027-03-30T21:00:00.000Z");
});

test("all five games vary between adjacent weeks, including content-pool wraparound", () => {
  for (let index = 0; index < 120; index++) {
    const current = getWeeklyGameData(index);
    const next = getWeeklyGameData(index + 1);
    assert.deepEqual(getWeeklyGameData(index), current, "The weekly content must be deterministic");
    for (const field of ["wordleWord", "targetPuzzle", "timelineEvents", "connectionsGroups", "globleTarget"] as const) {
      assert.notDeepEqual(current[field], next[field], `${field} repeats between weeks ${index} and ${index + 1}`);
    }
    assert.match(current.wordleWord, /^[A-Z]{5}$/);
    assert.match(current.globleTarget, /^[A-Z]{3}$/);
    assert.equal(isTargetSolution(current.targetPuzzle, current.targetPuzzle.solution), true);
  }
});

test("each game has 40 distinct puzzles with no repeats inside any 40-week rotation", () => {
  const signatures = (week: number) => {
    const data = getWeeklyGameData(week);
    return {
      wordle: data.wordleWord,
      country: data.globleTarget,
      target: JSON.stringify({ numbers: [...data.targetPuzzle.numbers].sort((a, b) => a - b), target: data.targetPuzzle.target }),
      // Ignore IDs, hints, and display order: cosmetic changes are not new puzzles.
      chronology: JSON.stringify(data.timelineEvents.map(event => JSON.stringify([event.content, event.year])).sort()),
      connections: JSON.stringify(data.connectionsGroups.map(group => JSON.stringify([...group.items].sort())).sort()),
    };
  };
  for (let start = 0; start < 40; start++) {
    const weeks = Array.from({ length: 40 }, (_, offset) => signatures(start + offset));
    for (const game of Object.keys(weeks[0]) as (keyof ReturnType<typeof signatures>)[]) {
      assert.equal(new Set(weeks.map(week => week[game])).size, 40, `${game} repeats within the 40 weeks starting at ${start}`);
    }
    assert.deepEqual(signatures(start + 40), signatures(start), "The full rotation repeats after 40 weeks");
  }
});

test("weekly progress keys change during event breaks and across calendar years", () => {
  const september = getRealCurrentWeekIndex(new Date("2026-09-16T12:00:00Z"));
  assert.equal(getEditionForWeek(september), null);
  assert.equal(getEditionForWeek(september + 1), null);
  assert.equal(getWeeklyGameData(september).hasEvent, false);
  assert.equal(getWeeklyGameData(september).secretClue, null);
  assert.notEqual(getPuzzleWeekId(september), getPuzzleWeekId(september + 1));
  const eventWeek = getRealCurrentWeekIndex(new Date("2026-10-06T16:00:00Z"));
  assert.equal(getEditionForWeek(eventWeek)?.id, "s1-e1");
  assert.equal(getWeeklyGameData(eventWeek).hasEvent, true);
  assert.equal(getWeeklyGameData(eventWeek).secretClue, getEditionForWeek(eventWeek)?.secretClue);
  assert.equal(getEditionForWeek(eventWeek + 1)?.id, "s1-e2");
  assert.notEqual(getPuzzleWeekId(eventWeek), getPuzzleWeekId(eventWeek + 52));
});

test("invalid preview values do not choose nonexistent puzzles", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    for (const value of ["", "-1", "NaN", "1.5", "1oops", "10001"]) {
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => value } });
      assert.equal(getPreviewWeekIndex(), null);
    }
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => "4" } });
    assert.equal(getPreviewWeekIndex(), 4);
    assert.throws(() => getWeeklyGameData(-1), RangeError);
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("API starts all five games fresh at midnight and rejects stale-week writes", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-22T20:59:59Z") });
  const leader = await storage.createUser({ name: "Weekly Tester", email: "weekly@example.com", password: "test-password", role: "MEMBER" });
  const team = await storage.createTeam({ name: "Weekly Test Team", leaderId: leader.id, inviteCode: "WEEK-123456" });
  const app = express();
  setupSecurity(app);
  app.use(express.json());
  const server = createServer(app);
  await registerRoutes(server, app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  let cookie = "";
  const request = async (path: string, method = "GET", body?: unknown) => {
    const response = await fetch(baseUrl + path, { method, headers: { "Content-Type": "application/json", cookie }, body: body === undefined ? undefined : JSON.stringify(body) });
    const nextCookie = response.headers.get("set-cookie");
    if (nextCookie) cookie = nextCookie.split(";")[0];
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await request("/api/auth/login", "POST", { email: leader.email, password: "test-password" })).status, 200);
  const previousWeek = getPuzzleWeekId();
  await storage.savePuzzleProgress({ teamId: team.id, editionId: previousWeek, gameType: "SUDOKU", isSolved: true, solvedByUserId: leader.id });
  assert.equal((await request(`/api/games/progress/${previousWeek}`)).body.solvedCount, 0, "Historical Sudoku does not complete the replacement game");
  assert.equal((await request("/api/games/progress", "POST", { teamId: team.id, weekId: previousWeek, gameType: "TARGET", isSolved: true, data: { moves: [] } })).status, 400);
  assert.equal((await request("/api/games/progress", "POST", { teamId: team.id, weekId: previousWeek, gameType: "SUDOKU", isSolved: true })).status, 400);
  for (const gameType of ["WORDLE", "TARGET", "TIMELINE", "CONNECTIONS", "GLOBLE"]) {
    assert.equal((await request("/api/games/progress", "POST", { teamId: team.id, weekId: previousWeek, gameType, isSolved: true, data: gameType === "TARGET" ? { moves: getTargetPuzzle(getRealCurrentWeekIndex()).solution } : undefined })).status, 200);
  }
  const completedWithoutEvent = await request(`/api/games/progress/${previousWeek}`);
  assert.equal(completedWithoutEvent.body.solvedCount, 5);
  assert.equal(completedWithoutEvent.body.secretClueUnlocked, false, "Practice weeks never unlock an event clue");
  t.mock.timers.setTime(new Date("2026-09-22T21:00:00Z").getTime());
  const currentWeek = getPuzzleWeekId();
  const fresh = await request(`/api/games/progress/${currentWeek}`);
  assert.equal(fresh.status, 200);
  assert.equal(fresh.body.solvedCount, 0);
  assert.equal(fresh.body.secretClueUnlocked, false);
  assert.equal(Object.values(fresh.body.games).every((game: any) => !game.isSolved && game.data === null), true);
  assert.equal((await request("/api/games/progress", "POST", { teamId: team.id, weekId: previousWeek, gameType: "WORDLE", isSolved: true })).status, 409);
  assert.equal((await request("/api/games/progress/reset", "POST", { teamId: team.id, weekId: previousWeek })).status, 409);
  assert.equal((await request("/api/games/progress", "POST", { teamId: team.id, weekId: currentWeek, gameType: "WORDLE", isSolved: true })).status, 200);
  assert.equal((await request(`/api/games/progress/${currentWeek}`)).body.solvedCount, 1);
  assert.equal((await request("/api/games/progress/reset", "POST", { teamId: team.id, weekId: currentWeek })).status, 200);
  assert.equal((await request(`/api/games/progress/${currentWeek}`)).body.solvedCount, 0);
  assert.equal((await storage.getPuzzleProgress(team.id, previousWeek)).length, 6, "Old history, including Sudoku, remains separate from the new week");
  t.mock.timers.setTime(new Date("2026-10-06T16:00:00Z").getTime());
  const eventWeekId = getPuzzleWeekId();
  assert.equal((await request(`/api/games/progress/${eventWeekId}`)).body.secretClueUnlocked, false);
  for (const gameType of ["WORDLE", "TARGET", "TIMELINE", "CONNECTIONS", "GLOBLE"]) {
    assert.equal((await request("/api/games/progress", "POST", { teamId: team.id, weekId: eventWeekId, gameType, isSolved: true, data: gameType === "TARGET" ? { moves: getTargetPuzzle(getRealCurrentWeekIndex()).solution } : undefined })).status, 200);
  }
  assert.equal((await request(`/api/games/progress/${eventWeekId}`)).body.secretClueUnlocked, true, "Event weeks unlock the clue after all five games");
});
