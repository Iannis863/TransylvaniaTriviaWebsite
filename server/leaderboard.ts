import ExcelJS from "exceljs";
import { unzipSync } from "fflate";
import { randomUUID } from "node:crypto";
import { getEditionDateTime, getFullSchedule } from "../shared/schedule.js";
import { leaderboardNameKey, leaderboardScoreKey, type LeaderboardIdentity, type LeaderboardSeason, type PublicLeaderboard } from "../shared/leaderboard.js";
import type { IStorage } from "./storage.js";

export class LeaderboardError extends Error {}
export interface ImportedLeaderboard {
  editions: number[];
  rows: { name: string; nameKey: string; scores: Record<number, number> }[];
  totalWarnings: number;
}
function fail(message: string): never { throw new LeaderboardError(message); }
function scalar(value: ExcelJS.CellValue): unknown {
  if (value && typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value) return value.result;
    if ("richText" in value) return value.richText.map(item => item.text).join("");
  }
  return value;
}
function score(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || (typeof value === "string" && ["", "-", "—"].includes(value.trim()))) return null;
  const numeric = typeof value === "number" ? value : typeof value === "string" && /^\d+(?:[.,]\d{1,2})?$/.test(value.trim()) ? Number(value.trim().replace(",", ".")) : NaN;
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 100000 || Math.abs(numeric * 100 - Math.round(numeric * 100)) > 0.00001) fail("Scor invalid. Folosește numere pozitive cu maximum două zecimale sau celule goale.");
  return Math.round(numeric * 100);
}

export async function parseLeaderboard(buffer: Buffer): Promise<ImportedLeaderboard> {
  if (!buffer.length || buffer.length > 2 * 1024 * 1024) fail("Fișierul Excel trebuie să aibă maximum 2 MB.");
  try {
    // Inspect ZIP sizes without inflating any files before handing the workbook to ExcelJS.
    let expanded = 0, files = 0;
    unzipSync(buffer, { filter: entry => {
      expanded += entry.originalSize; files++;
      if (expanded > 12 * 1024 * 1024 || files > 200) fail("Fișierul Excel este prea complex. Încarcă doar tabelul de clasament.");
      return false;
    } });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    const candidates = workbook.worksheets.filter(sheet => {
      const first = leaderboardNameKey(String(scalar(sheet.getCell(1, 1).value) ?? ""));
      return ["numele echipei", "nume echipă", "team name", "team"].includes(first);
    });
    const sheet = candidates.find(item => item.name === "Overall Ranking") ?? (candidates.length === 1 ? candidates[0] : undefined);
    if (!sheet) fail("Nu am găsit tabelul. Prima coloană trebuie să fie «Numele echipei» sau «Team name».");
    if (sheet.rowCount > 2001 || sheet.columnCount > 102) fail("Tabelul poate avea maximum 2000 de echipe și 100 de ediții.");
    const columns: { column: number; edition: number }[] = [];
    let totalColumn = 0;
    for (let column = 2; column <= sheet.columnCount; column++) {
      const header = leaderboardNameKey(String(scalar(sheet.getCell(1, column).value) ?? "")).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (!header) continue;
      if (["scor final", "scor total", "total", "overall score", "overall", "final score"].includes(header)) {
        if (totalColumn) fail("Tabelul conține coloane duplicate.");
        totalColumn = column; continue;
      }
      const match = /^(?:editia|editie|edition)\s*#?\s*(\d+)$/.exec(header);
      if (!match || Number(match[1]) < 1 || Number(match[1]) > 100) fail("Coloanele trebuie să fie «Ediția 1», «Ediția 2» etc., urmate de «Scor Final».");
      const edition = Number(match[1]);
      if (columns.some(item => item.edition === edition)) fail("Tabelul conține coloane duplicate.");
      columns.push({ column, edition });
    }
    if (!columns.length || !totalColumn || totalColumn < Math.max(...columns.map(item => item.column))) fail("Coloanele trebuie să fie «Ediția 1», «Ediția 2» etc., urmate de «Scor Final».");
    const rows: ImportedLeaderboard["rows"] = [], names = new Set<string>(), played = new Set<number>();
    let totalWarnings = 0;
    for (let row = 2; row <= sheet.rowCount; row++) {
      const nameValue = scalar(sheet.getCell(row, 1).value);
      const values = columns.map(item => scalar(sheet.getCell(row, item.column).value));
      if ((nameValue === null || nameValue === undefined || nameValue === "") && values.every(value => value === null || value === undefined || value === "")) continue;
      if (typeof nameValue !== "string" || nameValue.trim().length < 2 || nameValue.trim().length > 100) fail("Fiecare rând trebuie să aibă un nume de echipă între 2 și 100 de caractere.");
      const name = nameValue.trim().replace(/\s+/g, " "), nameKey = leaderboardNameKey(name);
      if (names.has(nameKey)) fail("Tabelul conține nume de echipe duplicate.");
      names.add(nameKey);
      const scores: Record<number, number> = {};
      columns.forEach((item, index) => {
        // An unevaluated formula is not an absent score.
        const raw = sheet.getCell(row, item.column).value;
        if (raw && typeof raw === "object" && ("formula" in raw || "sharedFormula" in raw) && values[index] === undefined) fail("Salvează formulele calculate în Excel înainte de încărcare.");
        const units = score(values[index]);
        if (units !== null) { scores[item.edition] = units; played.add(item.edition); }
      });
      const suppliedTotal = score(scalar(sheet.getCell(row, totalColumn).value));
      if (suppliedTotal !== null && suppliedTotal !== Object.values(scores).reduce((sum, value) => sum + value, 0)) totalWarnings++;
      rows.push({ name, nameKey, scores });
    }
    if (!rows.length || !played.size) fail("Fișierul nu conține rezultate jucate.");
    return { rows, editions: Array.from(played).sort((a, b) => a - b), totalWarnings };
  } catch (error) {
    if (error instanceof LeaderboardError) throw error;
    return fail("Fișier Excel invalid. Încarcă un fișier .xlsx neprotejat.");
  }
}

export async function planLeaderboardImport(source: IStorage, imported: ImportedLeaderboard, startYear: number, number: number, now = new Date()) {
  const schedule = getFullSchedule(startYear, new Date(`${startYear}-07-01T12:00:00Z`)).filter(item => item.seasonNumber === number);
  const editionDates = new Map(schedule.map(item => [item.editionNumber, getEditionDateTime(item)]));
  for (const edition of imported.editions) {
    const date = editionDates.get(edition);
    if (!date || date >= now) fail("Poți publica rezultate doar pentru ediții care au avut deja loc în sezonul selectat.");
  }
  const id = `${startYear}-s${number}`;
  const [identities, seasons, registeredTeams] = await Promise.all([source.getLeaderboardIdentities(), source.getLeaderboardSeasons(), source.getAllTeams()]);
  const byName = new Map(identities.map(identity => [identity.nameKey, identity]));
  const changed: LeaderboardIdentity[] = [];
  let autoLinked = 0;
  const importedRows = imported.rows.map(row => {
    let identity = byName.get(row.nameKey);
    if (!identity) {
      const matches = registeredTeams.filter(team => leaderboardNameKey(team.name) === row.nameKey);
      identity = { id: randomUUID(), name: row.name, nameKey: row.nameKey, teamId: matches.length === 1 ? matches[0].id : null };
      if (identity.teamId) autoLinked++;
      byName.set(row.nameKey, identity); changed.push(identity);
    }
    return { identity, row };
  });
  const previous = seasons.find(season => season.id === id);
  const editions = previous?.data.editions.filter(edition => !imported.editions.includes(edition.number)) ?? [];
  for (const edition of imported.editions) {
    editions.push({ number: edition, eventDate: editionDates.get(edition)!.toISOString(), scores: Object.fromEntries(importedRows.filter(item => item.row.scores[edition] !== undefined).map(item => [item.identity.id, item.row.scores[edition]])) });
  }
  editions.sort((a, b) => a.number - b.number);
  const season: LeaderboardSeason = { id, startYear, number, updatedAt: now, data: { editions } };
  validateLinks(Array.from(byName.values()), [...seasons.filter(item => item.id !== id), season]);
  return { season, changed, autoLinked, teams: imported.rows.length, editions: imported.editions, totalWarnings: imported.totalWarnings,
    rows: imported.rows.map(row => ({ name: row.name, scores: row.scores, total: Object.values(row.scores).reduce((sum, value) => sum + value, 0) })) };
}

export function validateLinks(identities: LeaderboardIdentity[], seasons: LeaderboardSeason[]) {
  const links = new Map(identities.map(identity => [identity.id, identity.teamId]));
  for (const season of seasons) for (const edition of season.data.editions) {
    const seen = new Set<string>();
    for (const id of Object.keys(edition.scores)) {
      const teamId = links.get(id);
      if (!teamId) continue;
      if (seen.has(teamId)) fail("Această echipă este deja asociată cu alt rând din aceeași ediție. Elimină mai întâi asocierea veche.");
      seen.add(teamId);
    }
  }
}

export function publicLeaderboard(identities: LeaderboardIdentity[], seasons: LeaderboardSeason[], teams: { id: string; name: string }[], now = new Date()): PublicLeaderboard {
  const names = new Map(teams.map(team => [team.id, team.name]));
  const rows = new Map<string, PublicLeaderboard["rows"][number]>();
  const published = seasons.map(season => ({ ...season, data: { editions: season.data.editions.filter(edition => new Date(edition.eventDate) < now) } })).filter(season => season.data.editions.length);
  for (const identity of identities) {
    const linked = identity.teamId && names.has(identity.teamId) ? identity.teamId : null;
    const id = linked ? `team:${linked}` : identity.id;
    for (const season of published) for (const edition of season.data.editions) {
      const units = edition.scores[identity.id];
      if (units === undefined) continue;
      const row = rows.get(id) ?? { id, name: linked ? names.get(linked)! : identity.name, teamId: linked, scores: {}, total: 0 };
      const key = leaderboardScoreKey(season.id, edition.number);
      row.scores[key] = (row.scores[key] ?? 0) + units;
      row.total += units; rows.set(id, row);
    }
  }
  return { seasons: published.sort((a, b) => b.startYear - a.startYear || b.number - a.number).map(season => ({ id: season.id, startYear: season.startYear, number: season.number, updatedAt: season.updatedAt.toISOString(), editions: season.data.editions.map(({ number, eventDate }) => ({ number, eventDate })) })), rows: Array.from(rows.values()) };
}
