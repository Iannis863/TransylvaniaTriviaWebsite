import { getFullSchedule, getEditionDateTime, type ScheduleEdition } from "../../../shared/schedule.js";
import { bucharestParts } from "../../../shared/event-time.js";
import { getRealCurrentWeekIndex, getWeekDateRange } from "../../../shared/puzzle-week.js";
export { EPOCH_START, getRealCurrentWeekIndex, getWeekDateRange, getPuzzleWeekId } from "../../../shared/puzzle-week.js";

export function getPreviewWeekIndex(): number | null {
  try {
    const value = localStorage.getItem("admin_preview_week");
    if (value === null || !/^\d+$/.test(value)) return null;
    const index = Number(value);
    return Number.isSafeInteger(index) && index <= 10000 ? index : null;
  } catch { return null; }
}

export function getCurrentWeekIndex(now = new Date()): number {
  return getPreviewWeekIndex() ?? getRealCurrentWeekIndex(now);
}

export function getEditionForWeek(weekIndex: number): ScheduleEdition | null {
  const { startDate, endDate } = getWeekDateRange(weekIndex);
  const allEditions = getFullSchedule(bucharestParts(startDate).year, startDate);
  return allEditions.find(edition => {
    const eventDate = getEditionDateTime(edition);
    return eventDate >= startDate && eventDate <= endDate;
  }) ?? null;
}
