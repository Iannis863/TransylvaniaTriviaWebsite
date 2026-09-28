export const EVENT_TIME_ZONE = "Europe/Bucharest";

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: EVENT_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
});
export function bucharestParts(date: Date) {
  const parts = partsFormatter.formatToParts(date);
  const value = (type: string) => Number(parts.find(part => part.type === type)!.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour") };
}
export function eventDateInBucharest(year: number, monthIndex: number, day: number): Date {
  const utc = new Date(Date.UTC(year, monthIndex, day, 20));
  const offset = bucharestParts(utc).hour - 20;
  return new Date(utc.getTime() - offset * 3600000);
}
export function bucharestDateKey(date: Date): string {
  const { year, month, day } = bucharestParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function formatEventDate(date: Date, language: "ro" | "en" = "en"): string {
  return new Intl.DateTimeFormat(language === "ro" ? "ro-RO" : "en-GB", { timeZone: EVENT_TIME_ZONE, dateStyle: "full", timeStyle: "short" }).format(date);
}
