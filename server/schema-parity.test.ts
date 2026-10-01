import test from "node:test";
import assert from "node:assert/strict";
import { users, teams, seasons, editions, registrations, weeklyPuzzleProgress, themeSuggestions, passwordResetCodes, appSessions } from "../shared/schema.js";

test("PostgreSQL timestamp mappings preserve actual instants for every time-zone-aware schema column", () => {
  const columns = [users.createdAt, teams.createdAt, seasons.startDate, seasons.endDate, seasons.createdAt, editions.eventDate, editions.createdAt, registrations.eventDate, registrations.registeredAt, weeklyPuzzleProgress.solvedAt, weeklyPuzzleProgress.updatedAt, themeSuggestions.createdAt, passwordResetCodes.expiresAt, passwordResetCodes.createdAt];
  for (const column of columns) {
    assert.equal(column.getSQLType(), "timestamp with time zone", column.name);
    assert.equal(column.mapFromDriverValue("2026-09-30 20:42:10.123+03").toISOString(), "2026-09-30T17:42:10.123Z", column.name);
    assert.equal(column.mapFromDriverValue("2026-09-30 13:42:10.123-04").toISOString(), "2026-09-30T17:42:10.123Z", column.name);
  }
  assert.equal(appSessions.expire.getSQLType(), "timestamp (6)", "The session store's existing timestamp column stays unchanged");
});
