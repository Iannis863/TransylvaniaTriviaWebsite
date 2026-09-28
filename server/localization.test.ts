import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MemStorage } from "./storage.js";
import { NotificationService } from "./notifications.js";
import { buildEventEmail, buildPasswordResetEmail, type EmailPayload } from "./email.js";
import { insertRegistrationSchema } from "../shared/schema.js";
import { getWeeklyGameData } from "../client/src/lib/weeklyGames.js";
import { setLanguage, getLanguage, t, translateFeedback } from "../client/src/lib/i18n.js";

const eventDate = new Date("2026-10-06T17:00:00Z");
const details = { email: "ana@example.com", name: "Ana", teamName: "Our Team", memberCount: 4, eventDate, isCaptain: true };

test("Romanian is the default; all email kinds and reset emails support both languages", () => {
  const data = { teamName: "Our Team", captainName: "Ana", email: "ana@example.com", memberCount: 4, editionId: "s1-e1" };
  assert.equal(insertRegistrationSchema.parse(data).language, "ro");
  assert.equal(insertRegistrationSchema.safeParse({ ...data, language: "fr" }).success, false);
  for (const kind of ["waitlist", "confirmation", "reminder"] as const) {
    const romanian = buildEventEmail(kind, details);
    assert.match(romanian.html, /lang="ro"/);
    assert.match(romanian.text, /Bună Ana/);
    assert.match(romanian.text, /octombrie.*20:00/);
    const english = buildEventEmail(kind, { ...details, language: "en" });
    assert.match(english.html, /lang="en"/);
    assert.match(english.text, /Hello Ana/);
    assert.match(english.text, /October.*20:00/);
  }
  assert.match(buildPasswordResetEmail("ana@example.com", "123456").html, /lang="ro"/);
  assert.match(buildPasswordResetEmail("ana@example.com", "123456", "en").text, /Your reset code: 123456/);
});

for (const language of ["ro", "en"] as const) test(`${language}: captain and members share the stored registration language through approval and reminders`, async context => {
  context.mock.timers.enable({ apis: ["Date"], now: new Date("2026-09-28T10:00:00Z") });
  const source = new MemStorage();
  const captain = await source.createUser({ name: "Ana", email: "ana@example.com", role: "MEMBER" });
  const member = await source.createUser({ name: "Mihai", email: "mihai@example.com", role: "MEMBER" });
  const team = await source.createTeam({ name: "Our Team", leaderId: captain.id, inviteCode: "LOCALE-TEST" });
  await source.updateUserTeam(member.id, team.id);
  const registration = await source.createRegistration({ language, teamId: team.id, teamName: team.name, captainName: captain.name, email: captain.email, memberCount: 2, editionId: "s1-e1", eventDate, status: "WAITLISTED" });
  const sent: EmailPayload[] = [];
  const service = new NotificationService(source, async payload => { sent.push(payload); return { success: true }; }, null);
  await service.queue(registration, "waitlist"); await service.deliver(registration.id);
  const confirmed = (await source.approveRegistration(registration.id))!;
  assert.equal(confirmed.language, language);
  await service.queue(confirmed, "confirmation"); await service.deliver(confirmed.id);
  context.mock.timers.setTime(new Date("2026-10-06T10:00:00Z").getTime());
  await service.queue((await source.getRegistration(confirmed.id))!, "reminder"); await service.deliver(confirmed.id);
  assert.equal(sent.length, 6);
  for (const email of sent) {
    assert.match(email.html, new RegExp(`lang="${language}"`));
    assert.ok(email.text.startsWith(`${language === "ro" ? "Bună" : "Hello"} ${email.to === captain.email ? "Ana" : "Mihai"}`));
  }
});

test("both languages have 40 distinct games, valid Wordle answers and 16 unique Connections tiles per week", () => {
  for (const language of ["ro", "en"] as const) {
    const words = JSON.parse(readFileSync(new URL(`../client/src/components/games/valid-words${language === "en" ? "-en" : ""}.json`, import.meta.url), "utf8"));
    const weeks = Array.from({ length: 40 }, (_, index) => getWeeklyGameData(index, language));
    for (const field of ["wordleWord", "timelineEvents", "connectionsGroups", "globleTarget", "targetPuzzle"] as const) {
      assert.equal(new Set(weeks.map(week => JSON.stringify(week[field]))).size, 40, `${language}: ${field}`);
    }
    for (const week of weeks) {
      assert.match(week.wordleWord, /^[A-Z]{5}$/);
      assert.ok(words.includes(week.wordleWord), `${language}: ${week.wordleWord} missing from dictionary`);
      assert.equal(new Set(week.connectionsGroups.flatMap(group => group.items)).size, 16, `${language}: week ${week.weekIndex}`);
      assert.deepEqual(getWeeklyGameData(week.weekIndex + 40, language).connectionsGroups, week.connectionsGroups);
    }
  }
});

test("locale defaults to Romanian and translates dynamic feedback without changing the submitted theme", () => {
  assert.equal(getLanguage(), "ro");
  const original = globalThis.document;
  Object.assign(globalThis, { document: { documentElement: { lang: "ro" }, title: "" } });
  try {
    setLanguage("en");
    assert.equal(t("Bine ai revenit, {0}!", ["Ana"]), "Welcome back, Ana!");
    assert.equal(t("A team name outside the catalog"), "A team name outside the catalog");
    assert.equal(translateFeedback('Nu a fost găsit niciun articol sau categorie Wikipedia pentru „Tema Mea". Fără o sursă de conținut verificabilă, tema nu poate susține o rundă de trivia.'), 'No Wikipedia article or category was found for “Tema Mea”. Without verifiable source material, the theme cannot support a trivia round.');
    assert.equal(translateFeedback('Tema are un potențial excelent de quizzabilitate. Punctul forte principal: profunzimea conținutului (95/100).'), 'The theme has excellent trivia potential. Main strength: content depth (95/100).');
    setLanguage("ro");
    assert.equal(t("Echipa Mea"), "Echipa Mea");
  } finally { Object.assign(globalThis, { document: original }); }
});

test("every weekly country resolves exactly once in the bundled map", async () => {
  const { countryCode } = await import("../client/src/lib/country-code.js");
  const map = JSON.parse(readFileSync(new URL("../client/public/data/countries.geojson", import.meta.url), "utf8"));
  for (let week = 0; week < 40; week++) {
    const target = getWeeklyGameData(week).globleTarget;
    assert.equal(map.features.filter((feature: any) => countryCode(feature.properties) === target).length, 1, target);
  }
});
