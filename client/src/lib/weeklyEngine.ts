import { getFullSchedule, getEditionDateTime, ScheduleEdition } from "@shared/schedule";

// Season 2 starts around Oct 2026. Let's set the Epoch to the first Thursday of September 2026.
// Weeks start on Thursday 00:00 and end on Wednesday 23:59:59.
export const EPOCH_START = new Date("2026-09-03T00:00:00+03:00");

export function getRealCurrentWeekIndex(): number {
  const now = new Date();
  const diffTime = now.getTime() - EPOCH_START.getTime();
  const weeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  return Math.max(0, weeks);
}

export function getCurrentWeekIndex(): number {
  // Check for admin preview override
  const previewStr = localStorage.getItem("admin_preview_week");
  if (previewStr !== null) {
    const previewNum = parseInt(previewStr, 10);
    if (!isNaN(previewNum)) return previewNum;
  }
  return getRealCurrentWeekIndex();
}

export function getWeekDateRange(weekIndex: number) {
  const startDate = new Date(EPOCH_START.getTime() + weekIndex * 7 * 24 * 60 * 60 * 1000);
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
  return { startDate, endDate };
}

export function getEditionForWeek(weekIndex: number): ScheduleEdition | null {
  const { startDate, endDate } = getWeekDateRange(weekIndex);
  
  // We check the schedule for the current academic year (2026-2027)
  const allEditions = getFullSchedule(2026);
  
  for (const ed of allEditions) {
    const eventDate = getEditionDateTime(ed, 2026);
    // If the event falls within this week's Thursday-Wednesday window
    if (eventDate.getTime() >= startDate.getTime() && eventDate.getTime() <= endDate.getTime()) {
      return ed;
    }
  }
  
  return null;
}
