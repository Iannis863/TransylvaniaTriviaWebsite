import { randomUUID } from "node:crypto";
import { CUSTOM_EVENT_DEFAULT_PRIZES, customEventRegistrationKey, type CustomEvent, type CustomEventInput, type CustomEventAdminView, type CustomEventView } from "../shared/custom-events.js";
import type { IStorage, StoredCustomEvent } from "./storage.js";
import { validateCustomEventLogoData } from "./custom-event-logo.js";

export class CustomEventError extends Error {
  constructor(message: string, public readonly status = 400) { super(message); }
}
export function customEventView(event: CustomEvent): CustomEventView {
  const { notificationRevision: _notificationRevision, collaboratorLogoData, ...fields } = event as StoredCustomEvent;
  return { ...fields, prizes: event.prizes ?? structuredClone(CUSTOM_EVENT_DEFAULT_PRIZES), isCollaboration: event.isCollaboration ?? false, collaboratorName: event.collaboratorName ?? "",
    collaboratorLogoUrl: event.isCollaboration && collaboratorLogoData ? `/api/custom-events/${event.slug}/collaborator-logo?v=${encodeURIComponent(event.updatedAt.toISOString())}` : null,
    eventDate: event.eventDate.toISOString(), createdAt: event.createdAt.toISOString(), updatedAt: event.updatedAt.toISOString() };
}
export async function customEventAdminView(source: IStorage, event: CustomEvent): Promise<CustomEventAdminView> {
  const registrations = (await source.getRegistrations(customEventRegistrationKey(event.id))).sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime());
  return { ...customEventView(event), confirmedCount: registrations.filter(item => item.status === "CONFIRMED").length,
    waitlistCount: registrations.filter(item => item.status === "WAITLISTED").length,
    registrations: registrations.map(({ id, teamName, captainName, email, phoneNumber, memberCount, teamId, status, registeredAt }) => ({ id, teamName, captainName, email, phoneNumber, memberCount, teamId, status, registeredAt: registeredAt.toISOString() })) };
}
export async function saveCustomEvent(source: IStorage, input: CustomEventInput, id?: string): Promise<CustomEvent> {
  const eventId = id ?? randomUUID();
  return source.withEditionMutation(customEventRegistrationKey(eventId), async locked => {
    const previous = id ? await locked.getCustomEvent(id) : undefined;
    if (id && !previous) throw new CustomEventError("Evenimentul nu a fost găsit.", 404);
    const matching = await locked.getCustomEventBySlug(input.slug);
    if (matching && matching.id !== eventId) throw new CustomEventError("Această adresă este deja folosită de un alt eveniment.", 409);
    const confirmed = (await locked.getRegistrations(customEventRegistrationKey(eventId))).filter(item => item.status === "CONFIRMED").length;
    if (input.maxTeams < confirmed) throw new CustomEventError(`Capacitatea nu poate fi mai mică decât cele ${confirmed} echipe confirmate.`, 409);
    const now = new Date();
    const isCollaboration = input.isCollaboration ?? previous?.isCollaboration ?? false;
    const collaboratorName = input.collaboratorName ?? previous?.collaboratorName ?? "";
    const collaboratorLogoData = input.collaboratorLogoData === undefined ? previous?.collaboratorLogoData ?? null
      : input.collaboratorLogoData === null ? null : validateCustomEventLogoData(input.collaboratorLogoData);
    if (isCollaboration && (!collaboratorName || !collaboratorLogoData)) throw new CustomEventError("Pentru colaborare, adaugă numele partenerului și un logo PNG.");
    const changedDate = !!previous && previous.eventDate.getTime() !== new Date(input.eventDate).getTime();
    const event: StoredCustomEvent = { ...input, id: eventId, eventDate: new Date(input.eventDate), createdAt: previous?.createdAt ?? now, updatedAt: now,
      prizes: input.prizes ?? previous?.prizes ?? structuredClone(CUSTOM_EVENT_DEFAULT_PRIZES),
      isCollaboration, collaboratorName, collaboratorLogoData,
      notificationRevision: (previous?.notificationRevision ?? 0) + (changedDate ? 1 : 0) };
    await locked.saveCustomEvent(event);
    if (changedDate) await locked.rescheduleCustomRegistrations(customEventRegistrationKey(eventId), event.eventDate);
    return event;
  });
}
export async function removeCustomEvent(source: IStorage, id: string): Promise<boolean> {
  return source.withEditionMutation(customEventRegistrationKey(id), async locked => {
    if (!await locked.getCustomEvent(id)) throw new CustomEventError("Evenimentul nu a fost găsit.", 404);
    if ((await locked.getRegistrations(customEventRegistrationKey(id))).length) throw new CustomEventError("Evenimentul are înscrieri și nu poate fi șters. Retrage-l de la publicare pentru a păstra istoricul.", 409);
    return locked.deleteCustomEvent(id);
  });
}
