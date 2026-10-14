import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import express from "express";
import { createServer } from "node:http";
import ExcelJS from "exceljs";
import { zipSync } from "fflate";
import { leaderboardNameKey } from "../shared/leaderboard.js";
import { parseLeaderboard, planLeaderboardImport, publicLeaderboard, validateLinks } from "./leaderboard.js";
import { MemStorage, storage } from "./storage.js";
import { hashPassword, setupSecurity } from "./security.js";
import { registerRoutes } from "./routes.js";

async function workbook(headers: string[], rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Overall Ranking");
  sheet.addRow(headers);
  rows.forEach(row => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}
async function publish(source: MemStorage, buffer: Buffer, year = 2026, number = 1, now = new Date("2027-12-31T12:00:00Z")) {
  const parsed = await parseLeaderboard(buffer);
  return source.withTeamMutation(async source => {
    const plan = await planLeaderboardImport(source, parsed, year, number, now);
    for (const identity of plan.changed) await source.saveLeaderboardIdentity(identity);
    await source.saveLeaderboardSeason(plan.season);
    return plan;
  });
}
async function view(source: MemStorage) {
  return publicLeaderboard(await source.getLeaderboardIdentities(), await source.getLeaderboardSeasons(), await source.getAllTeams(), new Date("2027-12-31T12:00:00Z"));
}

test("the supplied Excel workbook imports all seven teams and preserves quarter points", async () => {
  const data = await parseLeaderboard(await readFile(new URL("../tests/fixtures/leaderboard-example.xlsx", import.meta.url)));
  assert.deepEqual(data.editions, [1]);
  assert.equal(data.rows.length, 7);
  assert.equal(data.rows[0].name, "Ciorbă cu Crutoane");
  assert.equal(data.rows[0].scores[1], 6425);
  assert.equal(data.totalWarnings, 0);
});

test("blank columns are unpublished, zero is a participation, formulas and decimal commas work, totals are recomputed", async () => {
  const data = await parseLeaderboard(await workbook(["Team name", "Edition 1", "Edition 2", "Edition 3", "Overall score"], [
    ["One Team", "64,25", { formula: "1+1", result: 2 }, null, { formula: "SUM(B2:C2)", result: 66.25 }],
    ["Zero Team", 0, "—", null, 99],
    ["Absent Team", null, "-", null, 0],
  ]));
  assert.deepEqual(data.editions, [1, 2]);
  assert.deepEqual(data.rows[0].scores, { 1: 6425, 2: 200 });
  assert.deepEqual(data.rows[1].scores, { 1: 0 });
  assert.deepEqual(data.rows[2].scores, {});
  assert.equal(data.totalWarnings, 1);
});

test("malformed, oversized and ambiguous workbooks and invalid scores are rejected", async () => {
  await assert.rejects(parseLeaderboard(Buffer.from("not excel")), /Excel invalid/);
  await assert.rejects(parseLeaderboard(Buffer.alloc(2 * 1024 * 1024 + 1)), /maximum 2 MB/);
  await assert.rejects(parseLeaderboard(Buffer.from(zipSync({ "large.xml": new Uint8Array(13 * 1024 * 1024) }))), /prea complex/);
  for (const value of [-1, 1.234, "NaN", "=WEBSERVICE(\"x\")", { formula: "1+1" }, { error: "#VALUE!" }]) {
    await assert.rejects(parseLeaderboard(await workbook(["Numele echipei", "Ediția 1", "Scor Final"], [["Team", value, 0]])));
  }
  await assert.rejects(parseLeaderboard(await workbook(["Team name", "Edition 1", "Total"], [[" Team   Name ", 1, 1], ["team name", 2, 2]])), /nume de echipe duplicate/);
  await assert.rejects(parseLeaderboard(await workbook(["Team name", "Edition 1", "Edition 1", "Total"], [["Team", 1, 2, 3]])), /coloane duplicate/);
});

test("reuploads replace edition results without duplicating totals, partial files preserve history and other seasons", async () => {
  const source = new MemStorage();
  const columns = ["Team name", "Edition 1", "Edition 2", "Total"];
  await publish(source, await workbook(columns, [["First Team", 10.25, 20, 30.25], ["Second Team", 20, null, 20]]));
  await publish(source, await workbook(["Team name", "Edition 2", "Total"], [["First Team", 25, 25], ["Third Team", 0, 0]]));
  let result = await view(source);
  assert.equal(result.rows.find(row => row.name === "First Team")!.total, 3525);
  assert.equal(result.rows.find(row => row.name === "Second Team")!.total, 2000);
  assert.equal(result.rows.find(row => row.name === "Third Team")!.total, 0);
  const file = await workbook(["Team name", "Edition 1", "Total"], [["First Team", 5.75, 5.75]]);
  await publish(source, file, 2026, 2);
  await publish(source, file, 2026, 2);
  await publish(source, file, 2027, 1);
  result = await view(source);
  assert.equal(result.seasons.length, 3);
  assert.equal(result.rows.find(row => row.name === "First Team")!.total, 4675);
  assert.deepEqual(result.seasons.map(item => item.id), ["2027-s1", "2026-s2", "2026-s1"]);
  assert.equal((await source.getLeaderboardIdentities()).length, 3);
});

test("future results cannot be published, and future stored results are excluded from public totals", async () => {
  const source = new MemStorage();
  const file = await workbook(["Team name", "Edition 1", "Edition 2", "Total"], [["Team", 10, 20, 30]]);
  await assert.rejects(publish(source, file, 2026, 1, new Date("2026-10-12T12:00:00Z")), /deja loc/);
  assert.equal((await source.getLeaderboardSeasons()).length, 0);
  assert.equal((await source.getLeaderboardIdentities()).length, 0);
  await publish(source, file);
  const result = publicLeaderboard(await source.getLeaderboardIdentities(), await source.getLeaderboardSeasons(), [], new Date("2026-10-12T12:00:00Z"));
  assert.deepEqual(result.seasons[0].editions.map(item => item.number), [1]);
  assert.equal(result.rows[0].total, 1000);
});

test("exact name matches link automatically; aliases merge across seasons and deletion preserves results", async () => {
  const source = new MemStorage();
  const user = await source.createUser({ name: "Captain", email: "captain@example.test", role: "MEMBER" });
  const team = await source.createTeam({ name: "Ciorbă cu Crutoane", leaderId: user.id, inviteCode: "LB-123456" });
  const sample = await readFile(new URL("../tests/fixtures/leaderboard-example.xlsx", import.meta.url));
  assert.equal((await publish(source, sample)).autoLinked, 1);
  await publish(source, await workbook(["Team name", "Edition 1", "Total"], [["New Team Name", 10.25, 10.25]]), 2026, 2);
  const identities = await source.getLeaderboardIdentities();
  const alias = identities.find(item => item.name === "New Team Name")!;
  alias.teamId = team.id;
  validateLinks(identities, await source.getLeaderboardSeasons());
  await source.saveLeaderboardIdentity(alias);
  let result = await view(source);
  assert.equal(result.rows.filter(row => row.teamId === team.id).length, 1);
  assert.equal(result.rows.find(row => row.teamId === team.id)!.total, 7450);
  await publish(source, sample);
  assert.equal((await view(source)).rows.find(row => row.teamId === team.id)!.total, 7450);
  await source.deleteTeam(team.id);
  result = await view(source);
  assert.equal(result.rows.find(row => row.name === "Ciorbă cu Crutoane")!.total, 6425);
  assert.equal(result.rows.every(row => row.teamId === null), true);
});

test("link conflicts cannot merge two competing teams from the same edition", async () => {
  const source = new MemStorage();
  await publish(source, await workbook(["Team name", "Edition 1", "Total"], [["First Team", 10, 10], ["Second Team", 20, 20]]));
  const identities = await source.getLeaderboardIdentities();
  identities.forEach(identity => { identity.teamId = "same-team"; });
  const seasons = await source.getLeaderboardSeasons();
  assert.throws(() => validateLinks(identities, seasons), /alt rând din aceeași ediție/);
});

test("admin API previews without mutation, protects writes, preserves manual links, rejects future imports, and omits private team data", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: new Date("2026-10-14T12:00:00Z") });
  const password = "leaderboard-admin-test";
  await storage.setAdminPasswordHash(await hashPassword(password));
  const user = await storage.createUser({ name: "Private Captain", email: "private@example.test", role: "MEMBER" });
  const team = await storage.createTeam({ name: "Registered Team", leaderId: user.id, inviteCode: "PRIVATE-LB" });
  const app = express(); setupSecurity(app); app.use(express.json());
  const server = createServer(app); await registerRoutes(server, app);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const headers = { "x-admin-password": password };
  const file = await workbook(["Team name", "Edition 1", "Total"], [["Workbook Team", 42.25, 42.25]]);
  const path = "/api/admin/leaderboard/import?year=2026&season=1";
  const upload = (suffix = "", authenticated = true, body = file) => fetch(base + path + suffix, { method: "POST", headers: { "content-type": "application/octet-stream", ...(authenticated ? headers : {}) }, body });
  assert.equal((await upload("", false)).status, 401);
  assert.equal((await fetch(base + "/api/admin/leaderboard")).status, 401);
  assert.equal((await upload("&preview=1")).status, 200);
  assert.equal((await storage.getLeaderboardIdentities()).length, 0);
  assert.equal((await upload()).status, 200);
  const identities = await storage.getLeaderboardIdentities();
  const identity = identities.find(item => item.nameKey === leaderboardNameKey("Workbook Team"))!;
  const link = (teamId: string | null) => fetch(base + `/api/admin/leaderboard/teams/${identity.id}`, { method: "PATCH", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ teamId }) });
  assert.equal((await link("nonexistent")).status, 400);
  assert.equal((await link(team.id)).status, 200);
  assert.equal((await upload()).status, 200);
  assert.equal((await storage.getLeaderboardIdentities()).find(item => item.id === identity.id)!.teamId, team.id);
  const response = await fetch(base + "/api/leaderboard");
  assert.equal(response.headers.get("cache-control"), "no-store");
  const result = await response.json();
  assert.equal(result.rows[0].name, team.name);
  assert.equal(result.rows[0].total, 4225);
  assert.equal(JSON.stringify(result).includes(user.email), false);
  assert.equal(JSON.stringify(result).includes(team.inviteCode), false);
  assert.equal((await upload("", true, await workbook(["Team name", "Edition 3", "Total"], [["Future Team", 10, 10]]))).status, 400);
  assert.equal((await storage.getLeaderboardIdentities()).length, 1);
  assert.equal((await link(null)).status, 200);
  assert.equal((await upload()).status, 200);
  assert.equal((await storage.getLeaderboardIdentities())[0].teamId, null, "An explicit unlink survives future imports");
});
