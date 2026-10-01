import test from "node:test";
import assert from "node:assert/strict";
import { MemStorage } from "./storage.js";
import { getRegistrationRecipients, NotificationService, registrationEventDate } from "./notifications.js";
import { buildEventEmail, buildPasswordResetEmail, sendEmail, type EmailPayload } from "./email.js";
import { EMAIL_LOGO_URL } from "../shared/email-brand.js";
import { reminderIsDue } from "./scheduler.js";
import { getCurrentOrNextEdition } from "../shared/schedule.js";

const eventDate = new Date("2026-10-06T17:00:00Z");
async function fixture() {
  const source = new MemStorage();
  const captain = await source.createUser({ name: "Ana Captain", email: "ana@example.com", role: "MEMBER" });
  const member = await source.createUser({ name: "Dan Member", email: "dan@example.com", role: "MEMBER" });
  const team = await source.createTeam({ name: "Test Team", leaderId: captain.id, inviteCode: "TEST-123456" });
  await source.updateUserTeam(member.id, team.id);
  const registration = await source.createRegistration({ teamId: team.id, teamName: team.name, captainName: captain.name, email: captain.email, editionId: "s1-e1", memberCount: 4, eventDate });
  return { source, captain, member, team, registration };
}

test("guest registrations only notify the contact; linked teams include captain and members once", async t => {
  const { source, registration } = await fixture();
  assert.deepEqual((await getRegistrationRecipients(registration, source)).map(x => [x.email, x.name, x.isCaptain]), [
    ["ana@example.com", "Ana Captain", true], ["dan@example.com", "Dan Member", false],
  ]);
  assert.equal((await getRegistrationRecipients({ ...registration, teamId: null }, source)).length, 1);
  const members = await source.getTeamMembers(registration.teamId!);
  // Existing installations may contain duplicate addresses from before normalization.
  t.mock.method(source, "getTeamMembers", async () => [...members, { ...members[0], id: "legacy-duplicate", email: " ANA@example.com " }]);
  assert.equal((await getRegistrationRecipients(registration, source)).length, 2);
});

test("reminder recipients follow current membership and leadership", async () => {
  const { source, registration, captain, member, team } = await fixture();
  await source.updateUserTeam(captain.id, null);
  await source.updateTeam(team.id, { leaderId: member.id });
  assert.deepEqual(await getRegistrationRecipients(registration, source), [{ email: member.email, name: member.name, isCaptain: true }]);
});

test("messages distinguish captain and member and escape untrusted HTML", () => {
  const details = { language: "en" as const, email: "a@example.com", name: "Ana <img src=x>", teamName: "A & B <script>", memberCount: 4, eventDate, isCaptain: true };
  const captain = buildEventEmail("confirmation", details);
  assert.match(captain.text, /Hello Ana .*you registered your team/);
  assert.match(captain.text, /6 October 2026 at 20:00/);
  assert.match(captain.text, /40 LEI for the whole team/);
  assert.ok(!captain.html.includes("<script>"));
  assert.ok(!captain.html.includes("<img src=x>"));
  assert.equal((captain.html.match(/<img /g) ?? []).length, 1, "Only the brand logo is an HTML image");
  assert.match(captain.html, /&lt;script&gt;/);
  assert.match(buildEventEmail("confirmation", { ...details, isCaptain: false }).text, /was registered by your captain/);
  assert.match(buildEventEmail("reminder", details).text, /Hello Ana .*tonight/);
});

test("every email shares the branded logo layout and keeps readable text and escaped reset codes", () => {
  const details = { language: "en" as const, email: "a@example.com", name: "Ana", teamName: "Test Team", memberCount: 4, eventDate, isCaptain: true };
  const emails = [buildEventEmail("confirmation", details), buildEventEmail("waitlist", details), buildEventEmail("reminder", details), buildPasswordResetEmail(details.email, "123456")];
  for (const email of emails) {
    assert.ok(email.html.includes(`src="${EMAIL_LOGO_URL}"`));
    assert.ok(email.html.indexOf("<img ") < email.html.indexOf("<h1 "), "The logo precedes the email heading");
    assert.match(email.html, /alt="Transilvania Trivia"/);
    assert.match(email.html, /role="presentation"/);
    assert.ok(!email.html.includes("localhost") && !email.html.includes("data:image"));
    assert.ok(email.text.length > 40);
  }
  const reset = buildPasswordResetEmail(details.email, "<img src=x>");
  assert.ok(!reset.html.includes("<img src=x>"));
  assert.match(reset.html, /&lt;img src=x&gt;/);
  assert.match(emails[3].text, /10 minute/);
});

test("partial delivery retries only failures; repeated and concurrent runs do not resend successes", async () => {
  const { source, registration } = await fixture();
  const sent: EmailPayload[] = [];
  let failDan = true;
  const service = new NotificationService(source, async payload => {
    sent.push(payload);
    return { success: payload.to !== "dan@example.com" || !failDan };
  }, null);
  await service.queue(registration, "reminder");
  const now = new Date("2026-10-06T10:00:00Z");
  assert.deepEqual(await service.deliver(registration.id, now), { sent: 1, failed: 1 });
  assert.equal(await service.reminderComplete(registration.id), false);
  failDan = false;
  await service.queue(registration, "reminder");
  const retryTime = new Date(now.getTime() + 60000);
  await Promise.all([service.deliver(registration.id, retryTime), service.deliver(registration.id, retryTime)]);
  assert.equal(await service.reminderComplete(registration.id), true);
  assert.deepEqual(sent.map(x => x.to), ["ana@example.com", "dan@example.com", "dan@example.com"]);
});

test("a failed provider or missing API key never becomes a successful mock delivery", async () => {
  assert.equal(process.env.RESEND_API_KEY, undefined, "Run tests without real email credentials");
  assert.deepEqual(await sendEmail({ to: "x@example.com", subject: "test", text: "test", html: "test" }), { success: false, skipped: true });
});

test("reminders use the selected edition and Romanian noon, not signup's next Tuesday", async () => {
  const { registration } = await fixture();
  registration.registeredAt = new Date("2026-09-01T10:00:00Z");
  assert.equal(reminderIsDue(registration, new Date("2026-09-08T10:00:00Z")), false);
  assert.equal(reminderIsDue(registration, new Date("2026-10-06T08:59:59Z")), false);
  assert.equal(reminderIsDue(registration, new Date("2026-10-06T09:00:00Z")), true);
  assert.equal(reminderIsDue(registration, eventDate), false);
  assert.equal(reminderIsDue({ ...registration, reminderSent: true }, new Date("2026-10-06T10:00:00Z")), false);
  assert.equal(registrationEventDate({ ...registration, eventDate: null })?.toISOString(), eventDate.toISOString());
  const winter = { ...registration, eventDate: new Date("2027-01-05T18:00:00Z") };
  assert.equal(reminderIsDue(winter, new Date("2027-01-05T09:59:00Z")), false);
  assert.equal(reminderIsDue(winter, new Date("2027-01-05T10:00:00Z")), true);
});

test("schedule handles winter, summer breaks and annual IDs independently of server timezone", () => {
  assert.equal(getCurrentOrNextEdition(new Date("2027-01-01T00:00:00Z")).eventDate.toISOString(), "2027-01-05T18:00:00.000Z");
  assert.equal(getCurrentOrNextEdition(new Date("2026-09-26T10:00:00Z")).eventDate.toISOString(), "2026-10-06T17:00:00.000Z");
  const summer = getCurrentOrNextEdition(new Date("2027-06-01T00:00:00Z"));
  assert.equal(summer.eventDate.toISOString(), "2027-10-06T17:00:00.000Z");
  assert.equal(summer.currentEdition.id, "2027-s1-e1");
});

test("concurrent registrations waitlist overflow and cannot duplicate a linked team", async () => {
  const source = new MemStorage();
  const base = { editionId: "test", teamName: "Team A", captainName: "Ana", email: "a@example.com", memberCount: 2 };
  const results = await Promise.all(Array.from({ length: 20 }, (_, index) => source.createRegistrationWithinCapacity({ ...base, teamName: index === 0 ? "Team A" : `Team ${index}` }, 10)));
  assert.equal(results.filter(x => x.status === "CONFIRMED").length, 15);
  assert.equal(results.filter(x => x.status === "WAITLISTED").length, 5);
  assert.equal((await source.getRegistrations("test")).length, 20);
  await assert.rejects(source.createRegistrationWithinCapacity({ ...base, teamName: "  TEAM A  " }, 10), /DUPLICATE/);
});

test("provider requests keep stable idempotency keys and report HTTP/network errors", async () => {
  const previousFetch = globalThis.fetch;
  const requests: RequestInit[] = [];
  process.env.RESEND_API_KEY = "test-only-not-a-real-key";
  const payload = { to: "recipient@example.com", subject: "Hello", html: "<p>Hello</p>", text: "Hello" };
  try {
    globalThis.fetch = async (_url, init) => { requests.push(init!); return new Response('{"id":"fake"}', { status: 200 }); };
    assert.equal((await sendEmail(payload, "delivery-1")).success, true);
    await sendEmail(payload, "delivery-1");
    assert.equal((requests[0].headers as any)["Idempotency-Key"], (requests[1].headers as any)["Idempotency-Key"]);
    assert.equal(JSON.parse(requests[0].body as string).to, payload.to);
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    assert.equal((await sendEmail(payload, "delivery-2")).success, false);
    globalThis.fetch = async () => { throw new Error("network unavailable"); };
    assert.equal((await sendEmail(payload, "delivery-2")).success, false);
  } finally { globalThis.fetch = previousFetch; delete process.env.RESEND_API_KEY; }
});

test("completed puzzle progress keeps the original solver when a stale save arrives", async () => {
  const source = new MemStorage();
  const base = { teamId: "team", editionId: "edition", gameType: "WORDLE" };
  await source.savePuzzleProgress({ ...base, isSolved: true, solvedByUserId: "solver", data: { answer: "solved" } });
  const updated = await source.savePuzzleProgress({ ...base, isSolved: false, solvedByUserId: "other", data: { answer: "stale" } });
  assert.equal(updated.isSolved, true);
  assert.equal(updated.solvedByUserId, "solver");
  assert.deepEqual(updated.data, { answer: "solved" });
});

test("queued reminders cancel departed recipients and use the current contact before retrying", async () => {
  const { source, registration, member, team } = await fixture();
  const sent: EmailPayload[] = [];
  const service = new NotificationService(source, async payload => { sent.push(payload); return { success: true }; }, null);
  await service.queue(registration, "reminder");
  await source.updateUserTeam(member.id, null, "MEMBER");
  await service.deliver(registration.id, new Date("2026-10-06T10:00:00Z"));
  assert.deepEqual(sent.map(payload => payload.to), ["ana@example.com"]);
  assert.equal(await service.reminderComplete(registration.id), true, "Cancelled former members cannot keep a reminder pending forever");
  assert.ok((await service.listDeliveries()).find(item => item.email === member.email)?.cancelledAt);

  const guest = await source.createRegistration({ ...registration, teamId: undefined, teamName: "Guest contact", email: "old@example.com" });
  await service.queue(guest, "confirmation");
  const updated = (await source.updateRegistration(guest.id, { email: "new@example.com" }))!;
  await service.queue(updated, "confirmation");
  await service.deliver(guest.id, new Date("2026-10-06T10:00:00Z"));
  assert.deepEqual(sent.map(payload => payload.to), ["ana@example.com", "new@example.com"]);
  assert.ok((await service.listDeliveries()).find(item => item.email === "old@example.com")?.cancelledAt);
});
