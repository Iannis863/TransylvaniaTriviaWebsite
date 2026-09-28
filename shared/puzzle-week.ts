import { bucharestDateKey, bucharestParts, eventDateInBucharest } from "./event-time.js";

const DAY_MS = 24 * 60 * 60 * 1000;
// Week zero starts on Wednesday, September 2, 2026, at 00:00 in Romania.
const EPOCH_CALENDAR_DAY = Date.UTC(2026, 8, 2);
export const EPOCH_START = new Date("2026-09-02T00:00:00+03:00");

export function getRealCurrentWeekIndex(now = new Date()): number {
  const { year, month, day } = bucharestParts(now);
  // Count Romanian calendar days, not elapsed 168-hour periods (DST weeks vary in length).
  return Math.max(0, Math.floor((Date.UTC(year, month - 1, day) - EPOCH_CALENDAR_DAY) / (7 * DAY_MS)));
}

export function getWeekDateRange(weekIndex: number) {
  if (!Number.isSafeInteger(weekIndex) || weekIndex < 0 || weekIndex > 10000) throw new RangeError("Invalid puzzle week");
  const midnight = (index: number) => {
    const day = new Date(EPOCH_CALENDAR_DAY + index * 7 * DAY_MS);
    // Both boundaries are Wednesdays, so there is no clock change between midnight and 20:00.
    return new Date(eventDateInBucharest(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()).getTime() - 20 * 3600000);
  };
  const startDate = midnight(weekIndex);
  const nextResetAt = midnight(weekIndex + 1);
  return { startDate, endDate: new Date(nextResetAt.getTime() - 1), nextResetAt };
}

export function getPuzzleWeekId(weekIndex = getRealCurrentWeekIndex()): string {
  return `week-${bucharestDateKey(getWeekDateRange(weekIndex).startDate)}`;
}
