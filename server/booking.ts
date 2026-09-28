import type { IStorage } from "./storage.js";
import type { InsertRegistration, Registration } from "../shared/schema.js";
import { expandedCapacity } from "../shared/booking.js";

// Called inside the same edition transaction for signups, approvals, and capacity edits.
export async function bookTeam(source: IStorage, data: InsertRegistration, initialCapacity: number): Promise<Registration> {
  const current = await source.getRegistrations(data.editionId);
  if (current.some(item => item.teamName.trim().toLowerCase() === data.teamName.trim().toLowerCase() || (data.teamId && item.teamId === data.teamId))) throw new Error("DUPLICATE_REGISTRATION");
  const confirmed = current.filter(item => item.status === "CONFIRMED").length;
  const previous = await source.getEditionCapacityOverride(data.editionId) ?? initialCapacity;
  const capacity = expandedCapacity(confirmed, previous);
  // Existing waiting teams keep priority when a place is freed. Promotion is always manual.
  const status = confirmed < Math.min(capacity, 15) && !current.some(item => item.status === "WAITLISTED") ? "CONFIRMED" : "WAITLISTED";
  const registration = await source.createRegistration({ ...data, status });
  await source.setEditionCapacityOverride(data.editionId, expandedCapacity(confirmed + (status === "CONFIRMED" ? 1 : 0), capacity));
  return registration;
}

export async function approveTeam(source: IStorage, id: string): Promise<Registration | undefined> {
  const registration = await source.getRegistration(id);
  if (!registration) return undefined;
  if (!registration.eventDate || new Date(registration.eventDate) <= new Date()) throw new Error("EVENT_CLOSED");
  if (registration.status === "CONFIRMED") return registration;
  const confirmed = (await source.getRegistrations(registration.editionId)).filter(item => item.status === "CONFIRMED").length;
  const previous = await source.getEditionCapacityOverride(registration.editionId) ?? 10;
  const result = await source.confirmRegistration(id);
  await source.setEditionCapacityOverride(registration.editionId, expandedCapacity(confirmed + 1, previous));
  return result;
}
