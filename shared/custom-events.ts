import { z } from "zod";
import { bucharestParts } from "./event-time.js";

export const CUSTOM_EVENT_DEFAULTS = {
  venue: "Insomnia Cafe & Bistro",
  address: "Str. Universității nr. 2, Cluj-Napoca",
  feeLabel: "10 lei / persoană",
  maxTeams: 10,
};
export const CUSTOM_EVENT_DEFAULT_PRIZES = {
  first: { title: "Sticlă de Vin", description: "Sărbătoriți victoria cu vinul preferat: alb, roșu sau rosé." },
  second: { title: "Găleată de Bere", description: "O găleată cu beri reci pentru toți membrii echipei de pe locul secund." },
  third: { title: "Rând de shoturi", description: "Un rând de shoturi pentru a sărbători bronzul." },
};
export const CUSTOM_EVENT_LOGO_MAX_BYTES = 1024 * 1024;
// Originals are processed in the admin browser; only the optimized PNG is saved.
export const CUSTOM_EVENT_LOGO_SOURCE_MAX_BYTES = 20 * 1024 * 1024;
export const CUSTOM_EVENT_LOGO_SOURCE_MAX_PIXELS = 128 * 1024 * 1024;
export const CUSTOM_EVENT_LOGO_SOURCE_MAX_DIMENSION = 16384;
export const CUSTOM_EVENT_LOGO_TARGET_SIZE = 1024;
const customEventPrizeSchema = z.object({ title: z.string().trim().min(1).max(120), description: z.string().trim().max(600) });
export const customEventPrizesSchema = z.object({ first: customEventPrizeSchema, second: customEventPrizeSchema, third: customEventPrizeSchema });
export type CustomEventPrizes = z.infer<typeof customEventPrizesSchema>;
export const RESERVED_EVENT_SLUGS = new Set(["admin", "cont", "api", "assets", "games", "leaderboard", "calendar", "registration", "team", "prizes", "rulebook", "favicon", "robots", "sitemap", "src", "data", "public", "index"]);
export const customEventInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().min(2).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).refine(value => !RESERVED_EVENT_SLUGS.has(value)),
  title: z.string().trim().min(2).max(200),
  subtitle: z.string().trim().max(1000).default(""),
  eventDate: z.string().datetime({ offset: true }),
  venue: z.string().trim().min(2).max(160).default(CUSTOM_EVENT_DEFAULTS.venue),
  address: z.string().trim().min(2).max(240).default(CUSTOM_EVENT_DEFAULTS.address),
  feeLabel: z.string().trim().min(1).max(160).default(CUSTOM_EVENT_DEFAULTS.feeLabel),
  maxTeams: z.number().int().min(1).max(1000).default(CUSTOM_EVENT_DEFAULTS.maxTeams),
  isPublished: z.boolean().default(false),
  registrationOpen: z.boolean().default(true),
  prizes: customEventPrizesSchema.optional(),
  isCollaboration: z.boolean().optional(),
  collaboratorName: z.string().trim().max(120).optional(),
  collaboratorLogoData: z.string().max(Math.ceil(CUSTOM_EVENT_LOGO_MAX_BYTES / 3) * 4 + 32).nullable().optional(),
});
export type CustomEventInput = z.infer<typeof customEventInputSchema>;
export interface CustomEvent extends Omit<CustomEventInput, "eventDate" | "prizes" | "isCollaboration" | "collaboratorName" | "collaboratorLogoData"> {
  prizes: CustomEventPrizes;
  isCollaboration: boolean;
  collaboratorName: string;
  collaboratorLogoData: string | null;
  id: string;
  eventDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
export interface CustomEventView extends Omit<CustomEvent, "eventDate" | "createdAt" | "updatedAt" | "collaboratorLogoData"> {
  collaboratorLogoUrl: string | null;
  eventDate: string;
  createdAt: string;
  updatedAt: string;
}
export const customEventRegistrationKey = (id: string) => `event:${id}`;
export const customEventIdFromRegistrationKey = (key: string) => key.startsWith("event:") ? key.slice(6) : null;
export interface CustomEventPublicResponse {
  event: CustomEventView;
  teams: { id: string; teamName: string; captainName: string; memberCount: number; registeredAt: string; teamId: string | null }[];
  confirmedCount: number;
  waitlistCount: number;
  isFull: boolean;
  registrationClosed: boolean;
}
export interface CustomEventAdminView extends CustomEventView {
  confirmedCount: number;
  waitlistCount: number;
  registrations: { id: string; teamName: string; captainName: string; email: string; phoneNumber: string | null; memberCount: number; teamId: string | null; status: "CONFIRMED" | "WAITLISTED"; registeredAt: string }[];
}
export function bucharestDateTimeInput(instant: string | Date): string {
  const p = bucharestParts(new Date(instant));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
export function bucharestInputToISO(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new RangeError("Introdu o dată și o oră valide.");
  const [, year, month, day, hour, minute] = match.map(Number);
  if (year < 2026 || year > 2100) throw new RangeError("Introdu o dată și o oră valide.");
  for (const offset of [3, 2]) {
    const candidate = new Date(Date.UTC(year, month - 1, day, hour - offset, minute));
    const p = bucharestParts(candidate);
    if (p.year === year && p.month === month && p.day === day && p.hour === hour && p.minute === minute) return candidate.toISOString();
  }
  throw new RangeError("Ora aleasă nu există în România. Alege o altă oră.");
}
