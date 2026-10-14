import test from "node:test";
import assert from "node:assert/strict";
import { bucharestDateTimeInput, bucharestInputToISO, customEventInputSchema } from "../shared/custom-events.js";

test("custom event input keeps the chosen Romanian time across summer and winter offsets", () => {
  for (const [local, iso] of [
    ["2026-10-20T20:15", "2026-10-20T17:15:00.000Z"],
    ["2026-12-25T09:30", "2026-12-25T07:30:00.000Z"],
    ["2027-07-01T00:05", "2027-06-30T21:05:00.000Z"],
  ]) {
    assert.equal(bucharestInputToISO(local), iso);
    assert.equal(bucharestDateTimeInput(iso), local);
  }
});

test("custom event input rejects invalid dates and missing daylight-saving hours", () => {
  for (const local of ["2027-03-28T03:30", "2026-02-30T20:00", "2026-13-01T20:00", "2026-12-25T24:00", "2026-12-25T20:60", "2026-12-25", ""])
    assert.throws(() => bucharestInputToISO(local), RangeError, local);
  assert.equal(bucharestInputToISO("2026-10-25T03:30"), "2026-10-25T00:30:00.000Z");
});

test("custom event slugs normalize case and cannot take existing application routes", () => {
  const input = { name: "Hermes", slug: "  Hermes  ", title: "Hermes trivia", eventDate: "2026-12-25T18:00:00Z" };
  assert.equal(customEventInputSchema.parse(input).slug, "hermes");
  for (const slug of ["admin", "cont", "api", "assets", "has spaces", "a/b", "-bad", "bad-"])
    assert.equal(customEventInputSchema.safeParse({ ...input, slug }).success, false, slug);
});
