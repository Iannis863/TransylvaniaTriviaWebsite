import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, json, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==========================================
// 1. USERS & ROLES
// ==========================================
export const users = pgTable("app_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  role: text("role").default("MEMBER").notNull(), // 'TEAM_LEADER' | 'MEMBER' | 'ADMIN'
  avatar: text("avatar"),
  teamId: varchar("team_id"),
  phoneNumber: text("phone_number"),
  language: text("language").notNull().default("ro"),
  welcomeQueued: boolean("welcome_queued").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  welcomeQueued: true,
}).extend({
  name: z.string().min(2, "Numele trebuie să aibă cel puțin 2 caractere"),
  email: z.string().trim().toLowerCase().max(254).email("Adresă de email invalidă"),
  password: z.string().min(6, "Parola trebuie să aibă cel puțin 6 caractere").optional(),
  phoneNumber: z.string().trim().max(30).optional(),
  role: z.enum(["TEAM_LEADER", "MEMBER", "ADMIN"]).default("MEMBER"),
  language: z.enum(["ro", "en"]).optional(),
  teamId: z.string().min(1).max(100).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const adminCredentials = pgTable("app_admin_credentials", {
  id: varchar("id").primaryKey(),
  passwordHash: text("password_hash").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const runtimeSettings = pgTable("app_runtime_settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
});

// ==========================================
// 2. TEAMS
// ==========================================
export const teams = pgTable("app_teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  leaderId: varchar("leader_id").notNull(),
  inviteCode: varchar("invite_code", { length: 12 }).notNull().unique(),
  tagline: text("tagline"),
  score: integer("score").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  score: true,
}).extend({
  name: z.string().min(2, "Numele echipei trebuie să aibă cel puțin 2 caractere"),
  leaderId: z.string(),
  inviteCode: z.string().min(4),
  tagline: z.string().optional(),
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

// ==========================================
// 3. SEASONS
// ==========================================
export const seasons = pgTable("app_seasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: integer("number").notNull().unique(), // 1, 2
  name: text("name").notNull(),
  totalEditions: integer("total_editions").default(15).notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertSeasonSchema = createInsertSchema(seasons).omit({
  id: true,
  createdAt: true,
});

export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type Season = typeof seasons.$inferSelect;

// ==========================================
// 4. EDITIONS
// ==========================================
export const editions = pgTable("app_editions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seasonId: varchar("season_id").notNull(),
  editionNumber: integer("edition_number").notNull(), // 1 to 15
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  theme: text("theme"),
  isCompleted: boolean("is_completed").default(false).notNull(),
  maxTeams: integer("max_teams").default(10).notNull(),
  secretClue: text("secret_clue"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertEditionSchema = createInsertSchema(editions).omit({
  id: true,
  createdAt: true,
});

export type InsertEdition = z.infer<typeof insertEditionSchema>;
export type Edition = typeof editions.$inferSelect;

// ==========================================
// 5. REGISTRATIONS
// ==========================================
export const registrations = pgTable("app_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id"),
  editionId: varchar("edition_id").notNull(),
  teamName: text("team_name").notNull(),
  captainName: text("captain_name").notNull(),
  email: text("email").notNull(),
  phoneNumber: text("phone_number"),
  memberCount: integer("member_count").notNull(),
  language: text("language").$type<"ro" | "en">().default("ro").notNull(),
  confirmationQueued: boolean("confirmation_queued").default(false).notNull(),
  waitlistQueued: boolean("waitlist_queued").default(false).notNull(),
  status: text("status").$type<"CONFIRMED" | "WAITLISTED">().default("CONFIRMED").notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }),
  reminderSent: boolean("reminder_sent").default(false).notNull(),
  registeredAt: timestamp("registered_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertRegistrationSchema = createInsertSchema(registrations).omit({
  id: true,
  registeredAt: true,
  reminderSent: true,
  eventDate: true,
  confirmationQueued: true,
  waitlistQueued: true,
  status: true,
}).extend({
  teamName: z.string().trim().max(100).min(2, "Numele echipei trebuie să aibă cel puțin 2 caractere"),
  captainName: z.string().trim().max(100).min(2, "Numele căpitanului trebuie să aibă cel puțin 2 caractere"),
  email: z.string().trim().toLowerCase().max(254).email("Te rugăm să introduci o adresă de email validă"),
  phoneNumber: z.string().trim().max(30).optional(),
  memberCount: z.number().int().min(1, "Este necesar cel puțin 1 membru").max(6, "Sunt permiși maximum 6 membri"),
  language: z.enum(["ro", "en"]).default("ro"),
  editionId: z.string().min(1).max(100),
  teamId: z.string().min(1).max(100).optional(),
});

export type InsertRegistration = Omit<z.infer<typeof insertRegistrationSchema>, "language"> & { language?: "ro" | "en" } & { eventDate?: Date; status?: "CONFIRMED" | "WAITLISTED" };
export type Registration = typeof registrations.$inferSelect;

// Legacy alias for backwards compatibility
export const teamRegistrations = registrations;
export const insertTeamRegistrationSchema = insertRegistrationSchema;
export type TeamRegistration = Registration;
export type InsertTeamRegistration = InsertRegistration;

// ==========================================
// 6. WEEKLY PUZZLE PROGRESS
// ==========================================
// Puzzle progress uses week-YYYY-MM-DD keys in the legacy edition_id column.
// This keeps weekly resets independent of event dates without deleting historical progress.
export const weeklyPuzzleProgress = pgTable("app_weekly_puzzle_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  editionId: varchar("edition_id").notNull(),
  gameType: text("game_type").notNull(), // 'WORDLE' | 'TARGET' | 'TIMELINE' | 'CONNECTIONS' | 'GLOBLE'; legacy types remain in history
  isSolved: boolean("is_solved").default(false).notNull(),
  solvedByUserId: varchar("solved_by_user_id"),
  data: jsonb("data"), // stores state, guesses, board status
  solvedAt: timestamp("solved_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertPuzzleProgressSchema = createInsertSchema(weeklyPuzzleProgress).omit({
  id: true,
  updatedAt: true,
});

export type InsertPuzzleProgress = z.infer<typeof insertPuzzleProgressSchema>;
export type WeeklyPuzzleProgress = typeof weeklyPuzzleProgress.$inferSelect;

// ==========================================
// 7. THEME SUGGESTIONS
// ==========================================
export const themeSuggestions = pgTable("app_theme_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id"),
  editionId: varchar("edition_id"),
  themeName: text("theme_name").notNull(),
  description: text("description"),
  popularityScore: integer("popularity_score").default(0).notNull(),
  status: text("status").default("PENDING").notNull(), // 'PENDING' | 'APPROVED' | 'REJECTED'
  proposedBy: text("proposed_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertThemeSuggestionSchema = createInsertSchema(themeSuggestions).omit({
  id: true,
  createdAt: true,
});

export type InsertThemeSuggestion = z.infer<typeof insertThemeSuggestionSchema>;
export type ThemeSuggestion = typeof themeSuggestions.$inferSelect;

// ==========================================
// 8. PASSWORD RESET CODES
// ==========================================
export const passwordResetCodes = pgTable("app_password_reset_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull(),
  code: varchar("code", { length: 6 }).notNull(),
  attempts: integer("attempts").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type PasswordResetCode = typeof passwordResetCodes.$inferSelect;


// Operational tables are also declared here so drizzle-kit does not treat them as unmanaged.
export const editionCapacity = pgTable("app_edition_capacity", {
  editionId: varchar("edition_id").primaryKey(),
  maxTeams: integer("max_teams").notNull(),
});
export const editionClues = pgTable("app_edition_clues", {
  editionId: varchar("edition_id").primaryKey(),
  clue: text("clue").notNull(),
});
export const emailDeliveries = pgTable("app_email_deliveries", {
  id: varchar("id").primaryKey(),
  registrationId: varchar("registration_id").references(() => registrations.id, { onDelete: "cascade" }),
  scopeKey: text("scope_key"),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: "cascade" }),
  weekId: text("week_id"),
  kind: text("kind").notNull(),
  email: text("email").notNull(),
  payload: jsonb("payload").notNull(),
  eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  lastError: text("last_error"),
}, table => [
  uniqueIndex("app_email_deliveries_registration_id_kind_email_key").on(table.registrationId, table.kind, table.email),
  uniqueIndex("app_email_deliveries_scope_kind_email_key").on(table.scopeKey, table.kind, table.email),
]);
export const appSessions = pgTable("app_sessions", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire", { precision: 6 }).notNull(),
}, table => [index("IDX_app_sessions_expire").on(table.expire)]);
