export type RegistrationStatus = "CONFIRMED" | "WAITLISTED";
export function expandedCapacity(confirmedCount: number, previous = 10): number {
  return Math.max(previous, confirmedCount, confirmedCount >= 11 ? 15 : confirmedCount >= 9 ? 12 : 10);
}
