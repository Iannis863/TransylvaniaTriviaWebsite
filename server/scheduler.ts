import { storage } from "./storage.js";
import { notifications, registrationEventDate } from "./notifications.js";
import { bucharestDateKey, bucharestParts } from "../shared/event-time.js";
import type { Registration } from "../shared/schema.js";

export function reminderIsDue(registration: Registration, now = new Date()): boolean {
  const eventDate = registrationEventDate(registration);
  return registration.status === "CONFIRMED" && !registration.reminderSent && !!eventDate && eventDate > now &&
    bucharestDateKey(eventDate) === bucharestDateKey(now) && bucharestParts(now).hour >= 12;
}
let running: Promise<{ sent: number; failed: number }> | undefined;
export function runNotifications(now = new Date()) {
  if (running) return running;
  running = (async () => {
    const registrations = await storage.getRegistrations();
    for (const registration of registrations) {
      const eventDate = registrationEventDate(registration);
      if (eventDate && eventDate > now) {
        if (registration.status === "WAITLISTED" && !registration.waitlistQueued) {
          await notifications.queue(registration, "waitlist");
          await storage.markWaitlistQueued(registration.id);
        } else if (registration.status === "CONFIRMED" && !registration.confirmationQueued) {
          await notifications.queue(registration, "confirmation");
          await storage.markConfirmationQueued(registration.id);
        }
      }
    }
    const due = registrations.filter(registration => reminderIsDue(registration, now));
    for (const registration of due) await notifications.queue(registration, "reminder");
    await notifications.queuePendingAccountEmails(now);
    const result = await notifications.deliver(undefined, now);
    for (const registration of due) {
      if (await notifications.reminderComplete(registration.id)) await storage.markReminderSent(registration.id);
    }
    return result;
  })().finally(() => { running = undefined; });
  return running;
}
export function startScheduler() {
  const run = () => runNotifications().catch(error => console.error("[Scheduler] Notification run failed", error));
  void run();
  const timer = setInterval(run, 5 * 60000);
  timer.unref();
  console.log("[Scheduler] Checking pending mail every five minutes; reminders start at noon Europe/Bucharest.");
}
