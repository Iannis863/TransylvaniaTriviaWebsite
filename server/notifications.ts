import { randomUUID } from "node:crypto";
import type { Registration } from "../shared/schema.js";
import { getFullSchedule, getEditionDateTime } from "../shared/schedule.js";
import { bucharestParts } from "../shared/event-time.js";
import { pool } from "./db.js";
import { storage, type IStorage } from "./storage.js";
import { buildEventEmail, sendEmail, type EmailKind, type EmailPayload, type EmailResult } from "./email.js";

export interface Recipient { email: string; name: string; isCaptain: boolean; }
export async function getRegistrationRecipients(registration: Registration, source: IStorage = storage): Promise<Recipient[]> {
  const recipients = new Map<string, Recipient>();
  const add = (email: string, name: string, isCaptain: boolean) => {
    const key = email.trim().toLowerCase();
    if (key && !recipients.has(key)) recipients.set(key, { email: key, name, isCaptain });
  };
  const team = registration.teamId ? await source.getTeam(registration.teamId) : undefined;
  if (team) {
    // The team's current leader is authoritative, including after leadership transfers.
    const [leader, members] = await Promise.all([source.getUser(team.leaderId), source.getTeamMembers(team.id)]);
    if (leader) add(leader.email, leader.name, true);
    for (const member of members) add(member.email, member.name, member.id === team.leaderId);
    if (!leader) add(registration.email, registration.captainName, true);
  } else {
    add(registration.email, registration.captainName, true);
  }
  return Array.from(recipients.values());
}

export function registrationEventDate(registration: Registration): Date | undefined {
  if (registration.eventDate) return new Date(registration.eventDate);
  // Legacy rows predate event_date. Resolve their edition from the signup season, never the next Tuesday.
  const registeredAt = new Date(registration.registeredAt);
  const year = bucharestParts(registeredAt).year;
  const schedule = getFullSchedule(year, registeredAt);
  const edition = schedule.find(item => item.id === registration.editionId || item.id.replace(/^\d{4}-/, "") === registration.editionId);
  if (!edition) return undefined;
  const eventDate = getEditionDateTime(edition);
  if (eventDate.getTime() + 4 * 3600000 < registeredAt.getTime()) {
    return getEditionDateTime({ ...edition, year: edition.year! + 1 });
  }
  return eventDate;
}
interface Delivery {
  id: string; registrationId: string; kind: EmailKind; email: string; payload: EmailPayload;
  eventDate: Date; sentAt: Date | null; lockedUntil: Date | null;
  cancelledAt: Date | null; lastAttemptAt: Date | null; lastError: string | null;
}
export class NotificationService {
  private deliveries = new Map<string, Delivery>();
  constructor(private source: IStorage = storage, private sender = sendEmail, private database = pool) {}

  async queue(registration: Registration, kind: EmailKind) {
    if ((kind === "waitlist") !== (registration.status === "WAITLISTED")) return;
    const eventDate = registrationEventDate(registration);
    if (!eventDate) throw new Error(`Unknown edition for registration ${registration.id}`);
    const recipients = await getRegistrationRecipients(registration, this.source);
    for (const recipient of recipients) {
      const delivery: Delivery = {
        id: randomUUID(), registrationId: registration.id, kind, email: recipient.email,
        payload: buildEventEmail(kind, { ...recipient, language: registration.language ?? "ro", teamName: registration.teamName, memberCount: registration.memberCount, eventDate }),
        eventDate, sentAt: null, lockedUntil: null, cancelledAt: null, lastAttemptAt: null, lastError: null,
      };
      if (this.database) {
        await this.database.query(`INSERT INTO app_email_deliveries (id, registration_id, kind, email, payload, event_date)
          VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (registration_id,kind,email) DO NOTHING`,
        [delivery.id, registration.id, kind, delivery.email, delivery.payload, eventDate]);
      } else {
        const key = `${registration.id}:${kind}:${recipient.email}`;
        if (!this.deliveries.has(key)) this.deliveries.set(key, delivery);
      }
    }
  }

  async deliver(registrationId?: string, now = new Date(), deadline = Date.now() + 240000): Promise<{ sent: number; failed: number }> {
    let pending: Delivery[];
    if (this.database) {
      // A lease prevents concurrent cron workers from sending the same recipient at once.
      const result = await this.database.query(`UPDATE app_email_deliveries SET locked_until = $1::timestamptz + interval '5 minutes'
        WHERE id IN (SELECT id FROM app_email_deliveries WHERE sent_at IS NULL AND cancelled_at IS NULL AND event_date > $1
          AND (locked_until IS NULL OR locked_until <= $1) AND ($2::varchar IS NULL OR registration_id = $2)
          ORDER BY event_date LIMIT 100 FOR UPDATE SKIP LOCKED)
        RETURNING id, registration_id AS "registrationId", kind, email, payload, event_date AS "eventDate"`, [now, registrationId || null]);
      pending = result.rows;
    } else {
      pending = Array.from(this.deliveries.values()).filter(item => !item.sentAt && !item.cancelledAt && item.eventDate > now && (!item.lockedUntil || item.lockedUntil <= now) && (!registrationId || item.registrationId === registrationId)).slice(0, 100);
      for (const item of pending) item.lockedUntil = new Date(now.getTime() + 5 * 60000);
    }
    const result = { sent: 0, failed: 0 };
    for (const item of pending) {
      const registration = await this.source.getRegistration(item.registrationId);
      if (!registration || ((item.kind === "waitlist") !== (registration.status === "WAITLISTED"))) {
        if (this.database) await this.database.query("UPDATE app_email_deliveries SET cancelled_at = $2, locked_until = NULL, last_error = 'Registration removed or status changed' WHERE id = $1", [item.id, now]);
        else { item.cancelledAt = now; item.lockedUntil = null; item.lastError = "Registration removed or status changed"; }
        continue;
      }
      if (Date.now() + 16000 >= deadline) {
        // Leave enough time to persist results and release unsent recipients for the next run.
        if (this.database) await this.database.query("UPDATE app_email_deliveries SET locked_until = NULL WHERE id = $1", [item.id]);
        else item.lockedUntil = null;
        continue;
      }
      let outcome: EmailResult;
      try { outcome = await this.sender(item.payload, item.id); }
      catch { outcome = { success: false }; }
      if (outcome.success) result.sent++; else result.failed++;
      if (this.database) {
        await this.database.query("UPDATE app_email_deliveries SET sent_at = $2, locked_until = $3, last_attempt_at = $4, last_error = $5 WHERE id = $1", [item.id, outcome.success ? now : null, outcome.success ? null : new Date(now.getTime() + 60000), now, outcome.success ? null : outcome.skipped ? "RESEND_API_KEY missing" : outcome.error ?? "Email provider request failed"]);
      } else {
        item.sentAt = outcome.success ? now : null; item.lockedUntil = outcome.success ? null : new Date(now.getTime() + 60000);
        item.lastAttemptAt = now; item.lastError = outcome.success ? null : outcome.skipped ? "RESEND_API_KEY missing" : outcome.error ?? "Email provider request failed";
      }
      // Resend's default account rate limit is low; keep recipient sends sequential.
      if (process.env.NODE_ENV !== "test" && !outcome.skipped) await new Promise(resolve => setTimeout(resolve, 600));
    }
    return result;
  }
  async listDeliveries() {
    if (this.database) {
      const result = await this.database.query(`SELECT id, registration_id AS "registrationId", kind, email, payload,
        event_date AS "eventDate", sent_at AS "sentAt", cancelled_at AS "cancelledAt", last_attempt_at AS "lastAttemptAt", last_error AS "lastError"
        FROM app_email_deliveries ORDER BY COALESCE(last_attempt_at, event_date) DESC, id LIMIT 200`);
      return result.rows;
    }
    return Array.from(this.deliveries.values()).reverse().slice(0, 200);
  }
  async reminderComplete(registrationId: string): Promise<boolean> {
    if (this.database) {
      const result = await this.database.query("SELECT count(*)::int AS total, count(*) FILTER (WHERE sent_at IS NULL)::int AS pending FROM app_email_deliveries WHERE registration_id = $1 AND kind = 'reminder'", [registrationId]);
      return result.rows[0].total > 0 && result.rows[0].pending === 0;
    }
    const entries = Array.from(this.deliveries.values()).filter(item => item.registrationId === registrationId && item.kind === "reminder");
    return entries.length > 0 && entries.every(item => item.sentAt);
  }
}
export const notifications = new NotificationService();
