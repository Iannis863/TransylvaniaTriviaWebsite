import { randomUUID } from "node:crypto";
import type { Registration, User } from "../shared/schema.js";
import { getFullSchedule, getEditionDateTime } from "../shared/schedule.js";
import { bucharestParts } from "../shared/event-time.js";
import { getPuzzleWeekId, getRealCurrentWeekIndex, getWeekDateRange } from "../shared/puzzle-week.js";
import { pool } from "./db.js";
import { storage, type IStorage } from "./storage.js";
import { buildEventEmail, buildWelcomeEmail, buildGamesCompletedEmail, sendEmail, type EmailKind, type EmailPayload, type EmailResult } from "./email.js";

const GAME_TYPES = ["WORDLE", "TARGET", "TIMELINE", "CONNECTIONS", "GLOBLE"];
export const welcomeEmailScope = (userId: string) => `welcome:${userId}`;
export const gamesEmailScope = (teamId: string, weekId: string) => `games:${teamId}:${weekId}`;

function eventInPuzzleWeek(now: Date) {
  const { startDate, endDate } = getWeekDateRange(getRealCurrentWeekIndex(now));
  return getFullSchedule(bucharestParts(startDate).year, startDate).some(edition => {
    const date = getEditionDateTime(edition);
    return date >= startDate && date <= endDate;
  });
}

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
  id: string; registrationId: string | null; scopeKey: string;
  userId: string | null; teamId: string | null; weekId: string | null;
  kind: EmailKind | "welcome" | "games-completed"; email: string; payload: EmailPayload;
  eventDate: Date; sentAt: Date | null; lockedUntil: Date | null;
  cancelledAt: Date | null; lastAttemptAt: Date | null; lastError: string | null;
}
export class NotificationService {
  private deliveries = new Map<string, Delivery>();
  constructor(private source: IStorage = storage, private sender = sendEmail, private database = pool) {}

  private async enqueue(delivery: Delivery) {
    if (this.database) {
      await this.database.query(`INSERT INTO app_email_deliveries (id, registration_id, scope_key, user_id, team_id, week_id, kind, email, payload, event_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING`,
      [delivery.id, delivery.registrationId, delivery.scopeKey, delivery.userId, delivery.teamId, delivery.weekId, delivery.kind, delivery.email, delivery.payload, delivery.eventDate]);
    } else {
      const key = `${delivery.scopeKey}:${delivery.kind}:${delivery.email}`;
      if (!this.deliveries.has(key)) this.deliveries.set(key, delivery);
    }
  }

  async queueWelcome(user: User) {
    await this.enqueue({
      id: randomUUID(), registrationId: null, scopeKey: welcomeEmailScope(user.id), userId: user.id, teamId: null, weekId: null,
      kind: "welcome", email: user.email.trim().toLowerCase(),
      payload: buildWelcomeEmail({ ...user, language: user.language === "en" ? "en" : "ro" }),
      eventDate: new Date(new Date(user.createdAt).getTime() + 7 * 86400000),
      sentAt: null, lockedUntil: null, cancelledAt: null, lastAttemptAt: null, lastError: null,
    });
    await this.source.markWelcomeQueued(user.id);
  }

  async queueGamesCompleted(teamId: string, weekId: string, now = new Date()) {
    if (weekId !== getPuzzleWeekId(getRealCurrentWeekIndex(now)) || !eventInPuzzleWeek(now)) return;
    const progress = await this.source.getPuzzleProgress(teamId, weekId);
    if (!GAME_TYPES.every(type => progress.some(item => item.gameType === type && item.isSolved))) return;
    const team = await this.source.getTeam(teamId);
    if (!team) return;
    const members = await this.source.getTeamMembers(teamId);
    for (const member of members) {
      const email = member.email.trim().toLowerCase();
      await this.enqueue({
        id: randomUUID(), registrationId: null, scopeKey: gamesEmailScope(teamId, weekId), userId: member.id, teamId, weekId,
        kind: "games-completed", email,
        payload: buildGamesCompletedEmail({ email, name: member.name, teamName: team.name, language: member.language === "en" ? "en" : "ro" }),
        eventDate: getWeekDateRange(getRealCurrentWeekIndex(now)).nextResetAt,
        sentAt: null, lockedUntil: null, cancelledAt: null, lastAttemptAt: null, lastError: null,
      });
    }
  }

  // Recover notifications if a request ended after saving the account or final solve.
  async queuePendingAccountEmails(now = new Date()) {
    for (const user of await this.source.getUsersPendingWelcome()) await this.queueWelcome(user);
    if (!eventInPuzzleWeek(now)) return;
    const weekId = getPuzzleWeekId(getRealCurrentWeekIndex(now));
    for (const team of await this.source.getAllTeams()) await this.queueGamesCompleted(team.id, weekId, now);
  }

  async queue(registration: Registration, kind: EmailKind) {
    if ((kind === "waitlist") !== (registration.status === "WAITLISTED")) return;
    const eventDate = registrationEventDate(registration);
    if (!eventDate) throw new Error(`Unknown edition for registration ${registration.id}`);
    const recipients = await getRegistrationRecipients(registration, this.source);
    for (const recipient of recipients) {
      const delivery: Delivery = {
        id: randomUUID(), registrationId: registration.id, scopeKey: registration.id, userId: null, teamId: null, weekId: null, kind, email: recipient.email,
        payload: buildEventEmail(kind, { ...recipient, language: registration.language ?? "ro", teamName: registration.teamName, memberCount: registration.memberCount, eventDate }),
        eventDate, sentAt: null, lockedUntil: null, cancelledAt: null, lastAttemptAt: null, lastError: null,
      };
      await this.enqueue(delivery);
    }
  }

  async deliver(scopeKey?: string, now = new Date(), deadline = Date.now() + 240000): Promise<{ sent: number; failed: number }> {
    let pending: Delivery[];
    if (this.database) {
      // A lease prevents concurrent cron workers from sending the same recipient at once.
      const result = await this.database.query(`UPDATE app_email_deliveries SET locked_until = $1::timestamptz + interval '5 minutes'
        WHERE id IN (SELECT id FROM app_email_deliveries WHERE sent_at IS NULL AND cancelled_at IS NULL AND event_date > $1
          AND (locked_until IS NULL OR locked_until <= $1) AND ($2::text IS NULL OR COALESCE(scope_key, registration_id) = $2)
          ORDER BY event_date LIMIT 100 FOR UPDATE SKIP LOCKED)
        RETURNING id, registration_id AS "registrationId", scope_key AS "scopeKey", user_id AS "userId", team_id AS "teamId", week_id AS "weekId", kind, email, payload, event_date AS "eventDate"`, [now, scopeKey || null]);
      pending = result.rows;
    } else {
      pending = Array.from(this.deliveries.values()).filter(item => !item.sentAt && !item.cancelledAt && item.eventDate > now && (!item.lockedUntil || item.lockedUntil <= now) && (!scopeKey || item.scopeKey === scopeKey)).slice(0, 100);
      for (const item of pending) item.lockedUntil = new Date(now.getTime() + 5 * 60000);
    }
    const result = { sent: 0, failed: 0 };
    for (const item of pending) {
      if (!await this.deliveryIsRelevant(item, now)) {
        if (this.database) await this.database.query("UPDATE app_email_deliveries SET cancelled_at = $2, locked_until = NULL, last_error = 'Recipient or notification status changed' WHERE id = $1", [item.id, now]);
        else { item.cancelledAt = now; item.lockedUntil = null; item.lastError = "Recipient or notification status changed"; }
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
  private async deliveryIsRelevant(item: Delivery, now: Date): Promise<boolean> {
    if (item.registrationId) {
      const registration = await this.source.getRegistration(item.registrationId);
      if (!registration || ((item.kind === "waitlist") !== (registration.status === "WAITLISTED"))) return false;
      // A retry must not contact a removed member or the previous account/contact address.
      return (await getRegistrationRecipients(registration, this.source)).some(recipient => recipient.email === item.email);
    }
    const user = item.userId ? await this.source.getUser(item.userId) : undefined;
    if (!user || user.email.trim().toLowerCase() !== item.email) return false;
    if (item.kind === "welcome") return true;
    if (!item.teamId || user.teamId !== item.teamId || item.weekId !== getPuzzleWeekId(getRealCurrentWeekIndex(now))) return false;
    if (!eventInPuzzleWeek(now) || !await this.source.getTeam(item.teamId)) return false;
    const progress = await this.source.getPuzzleProgress(item.teamId, item.weekId);
    return GAME_TYPES.every(type => progress.some(game => game.gameType === type && game.isSolved));
  }
  async listDeliveries() {
    if (this.database) {
      const result = await this.database.query(`SELECT id, registration_id AS "registrationId", scope_key AS "scopeKey", user_id AS "userId", team_id AS "teamId", week_id AS "weekId", kind, email, payload,
        event_date AS "eventDate", sent_at AS "sentAt", cancelled_at AS "cancelledAt", last_attempt_at AS "lastAttemptAt", last_error AS "lastError"
        FROM app_email_deliveries ORDER BY COALESCE(last_attempt_at, event_date) DESC, id LIMIT 200`);
      return result.rows;
    }
    return Array.from(this.deliveries.values()).reverse().slice(0, 200);
  }
  async reminderComplete(registrationId: string): Promise<boolean> {
    if (this.database) {
      const result = await this.database.query("SELECT count(*)::int AS total, count(*) FILTER (WHERE sent_at IS NULL AND cancelled_at IS NULL)::int AS pending FROM app_email_deliveries WHERE registration_id = $1 AND kind = 'reminder'", [registrationId]);
      return result.rows[0].total > 0 && result.rows[0].pending === 0;
    }
    const entries = Array.from(this.deliveries.values()).filter(item => item.registrationId === registrationId && item.kind === "reminder");
    return entries.length > 0 && entries.every(item => item.sentAt || item.cancelledAt);
  }
}
export const notifications = new NotificationService();
