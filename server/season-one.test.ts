import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import { getFullSchedule, getEditionDateTime } from "../shared/schedule.js";
import { bucharestDateKey } from "../shared/event-time.js";
import { getPuzzleWeekId, getRealCurrentWeekIndex, getWeekDateRange } from "../shared/puzzle-week.js";
import { getEditionForWeek } from "../client/src/lib/weeklyEngine.js";
import { getWeeklyGameData } from "../client/src/lib/weeklyGames.js";
import { getTargetPuzzle } from "../shared/target-game.js";
import english from "../client/src/lib/locales/en.json";
import { setupSecurity } from "./security.js";
import { registerRoutes } from "./routes.js";

// Published event dates and the preceding Wednesday midnight in Romania.
const editions = [
  ["2026-10-06", "2026-09-30T00:00:00+03:00", "Seriale explicate prost"],
  ["2026-10-13", "2026-10-07T00:00:00+03:00", "Ghicește animalul după radiografie"],
  ["2026-10-20", "2026-10-14T00:00:00+03:00", "Ce s-a întâmplat aici?"],
  ["2026-10-27", "2026-10-21T00:00:00+03:00", "Cine este în această poză?"],
  ["2026-11-03", "2026-10-28T00:00:00+02:00", "Unde în lume?"],
  ["2026-11-10", "2026-11-04T00:00:00+02:00", "Ghicește filmul după emoji-uri."],
  ["2026-11-17", "2026-11-11T00:00:00+02:00", "Ghicește obiectul mărit"],
  ["2026-11-24", "2026-11-18T00:00:00+02:00", "Cine e artistul după numele real"],
  ["2026-12-01", "2026-11-25T00:00:00+02:00", "Istoria României"],
  ["2026-12-08", "2026-12-02T00:00:00+02:00", "Ghicește țara după graniță"],
  ["2026-12-15", "2026-12-09T00:00:00+02:00", "Ghicește limba după expresie."],
  ["2027-01-05", "2026-12-30T00:00:00+02:00", "Ghicește personalitatea după pagina Wikipedia"],
  ["2027-01-12", "2027-01-06T00:00:00+02:00", "Care eveniment a avut loc primul?"],
  ["2027-01-19", "2027-01-13T00:00:00+02:00", "Lumi din Jocurile Video."],
  ["2027-01-26", "2027-01-20T00:00:00+02:00", "Sporturi explicate prost"],
] as const;

test("all 15 Season 1 clues follow the published dates and Wednesday reset, including DST and New Year", () => {
  const schedule = getFullSchedule(2026, new Date("2026-09-29T12:00:00Z")).filter(ed => ed.seasonNumber === 1);
  assert.equal(schedule.length, editions.length);
  editions.forEach(([eventDay, unlockAt, clue], index) => {
    const start = new Date(unlockAt);
    const week = getRealCurrentWeekIndex(start);
    const edition = getEditionForWeek(week)!;
    assert.equal(edition.id, `s1-e${index + 1}`);
    assert.equal(bucharestDateKey(getEditionDateTime(schedule[index])), eventDay);
    assert.equal(edition.secretClue, clue);
    assert.equal(getWeeklyGameData(week).secretClue, clue);
    assert.ok((english as Record<string, string>)[clue], `Missing English translation for edition ${index + 1}`);
    assert.equal(getWeekDateRange(week).startDate.getTime(), start.getTime());
    const justBefore = getRealCurrentWeekIndex(new Date(start.getTime() - 1));
    assert.notEqual(getEditionForWeek(justBefore)?.id, edition.id, "Clue must not advance before midnight");
    const { endDate, nextResetAt } = getWeekDateRange(week);
    assert.equal(getEditionForWeek(getRealCurrentWeekIndex(endDate))?.id, edition.id, "Keep the clue through Tuesday night");
    assert.notEqual(getEditionForWeek(getRealCurrentWeekIndex(nextResetAt))?.id, edition.id, "Reset the clue with the games");
  });
  for (const practiceDay of ["2026-09-29", "2026-12-16", "2026-12-23"]) {
    assert.equal(getEditionForWeek(getRealCurrentWeekIndex(new Date(`${practiceDay}T12:00:00Z`))), null);
  }
});

test("each Season 1 edition unlocks after five games in its own week, with no carryover across breaks", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date(editions[0][1]) });
  const app = express();
  setupSecurity(app);
  app.use(express.json());
  const server = createServer(app);
  await registerRoutes(server, app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  let cookie = "";
  const request = async (path: string, method = "GET", body?: unknown) => {
    const response = await fetch(base + path, {
      method, headers: { "Content-Type": "application/json", cookie },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.headers.get("set-cookie")) cookie = response.headers.get("set-cookie")!.split(";")[0];
    return { status: response.status, body: await response.json() };
  };
  assert.equal((await request("/api/auth/register", "POST", { name: "Season Tester", email: "season@example.com", password: "test-season-password" })).status, 201);
  const team = await request("/api/teams", "POST", { name: "Season One Team" });
  assert.equal(team.status, 201);

  // Include both event-free holiday weeks, which still reset the games.
  const weeks = [
    ...editions.map(([, start, clue], index) => ({ start, clue, editionId: `s1-e${index + 1}` })),
    { start: "2026-12-16T00:00:00+02:00", clue: null, editionId: null },
    { start: "2026-12-23T00:00:00+02:00", clue: null, editionId: null },
  ].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  let previousWeek: string | undefined;
  for (const { start, clue, editionId } of weeks) {
    t.mock.timers.setTime(new Date(start).getTime());
    const weekId = getPuzzleWeekId();
    if (previousWeek) assert.equal((await request(`/api/games/progress/${previousWeek}`)).status, 409);
    const progress = await request(`/api/games/progress/${weekId}`);
    assert.equal(progress.status, 200);
    assert.equal(progress.body.solvedCount, 0);
    assert.equal(progress.body.secretClueUnlocked, false);
    for (const gameType of ["WORDLE", "TARGET", "TIMELINE", "CONNECTIONS", "GLOBLE"]) {
      const solved = await request("/api/games/progress", "POST", {
        teamId: team.body.id, weekId, gameType, isSolved: true,
        data: gameType === "TARGET" ? { moves: getTargetPuzzle(getRealCurrentWeekIndex()).solution } : undefined,
      });
      assert.equal(solved.status, 200);
      const current = await request(`/api/games/progress/${weekId}`);
      assert.equal(current.body.secretClueUnlocked, editionId !== null && gameType === "GLOBLE");
    }
    if (editionId) {
      const revealed = await request(`/api/editions/${editionId}/clue`);
      assert.equal(revealed.status, 200);
      assert.equal(revealed.body.clue, clue);
    }
    previousWeek = weekId;
  }
});
