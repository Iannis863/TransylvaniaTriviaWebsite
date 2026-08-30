import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ==========================================
// 1. USERS & ROLES
// ==========================================
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password"),
  role: text("role").default("MEMBER").notNull(), // 'TEAM_LEADER' | 'MEMBER' | 'ADMIN'
  avatar: text("avatar"),
  teamId: varchar("team_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(2, "Numele trebuie să aibă cel puțin 2 caractere"),
  email: z.string().email("Adresă de email invalidă"),
  password: z.string().min(6, "Parola trebuie să aibă cel puțin 6 caractere").optional(),
  role: z.enum(["TEAM_LEADER", "MEMBER", "ADMIN"]).default("MEMBER"),
  teamId: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ==========================================
// 2. TEAMS
// ==========================================
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  leaderId: varchar("leader_id").notNull(),
  inviteCode: varchar("invite_code", { length: 12 }).notNull().unique(),
  tagline: text("tagline"),
  score: integer("score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
export const seasons = pgTable("seasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  number: integer("number").notNull().unique(), // 1, 2
  name: text("name").notNull(),
  totalEditions: integer("total_editions").default(15).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
export const editions = pgTable("editions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seasonId: varchar("season_id").notNull(),
  editionNumber: integer("edition_number").notNull(), // 1 to 15
  eventDate: timestamp("event_date").notNull(),
  theme: text("theme"),
  isCompleted: boolean("is_completed").default(false).notNull(),
  maxTeams: integer("max_teams").default(25).notNull(),
  secretClue: text("secret_clue"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
export const registrations = pgTable("registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id"),
  editionId: varchar("edition_id").notNull(),
  teamName: text("team_name").notNull(),
  captainName: text("captain_name").notNull(),
  email: text("email").notNull(),
  phoneNumber: text("phone_number"),
  memberCount: integer("member_count").notNull(),
  reminderSent: boolean("reminder_sent").default(false).notNull(),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
});

export const insertRegistrationSchema = createInsertSchema(registrations).omit({
  id: true,
  registeredAt: true,
  reminderSent: true,
}).extend({
  teamName: z.string().min(2, "Numele echipei trebuie să aibă cel puțin 2 caractere"),
  captainName: z.string().min(2, "Numele căpitanului trebuie să aibă cel puțin 2 caractere"),
  email: z.string().email("Te rugăm să introduci o adresă de email validă"),
  phoneNumber: z.string().optional(),
  memberCount: z.number().min(1, "Este necesar cel puțin 1 membru").max(6, "Sunt permiși maximum 6 membri"),
  editionId: z.string(),
  teamId: z.string().optional(),
});

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrations.$inferSelect;

// Legacy alias for backwards compatibility
export const teamRegistrations = registrations;
export const insertTeamRegistrationSchema = insertRegistrationSchema;
export type TeamRegistration = Registration;
export type InsertTeamRegistration = InsertRegistration;

// ==========================================
// 6. WEEKLY PUZZLE PROGRESS
// ==========================================
export const weeklyPuzzleProgress = pgTable("weekly_puzzle_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull(),
  editionId: varchar("edition_id").notNull(),
  gameType: text("game_type").notNull(), // 'WORDLE' | 'SUDOKU' | 'REBUS' | 'TIMELINE' | 'CONNECTIONS' | 'GLOBLE'
  isSolved: boolean("is_solved").default(false).notNull(),
  solvedByUserId: varchar("solved_by_user_id"),
  data: jsonb("data"), // stores state, guesses, board status
  solvedAt: timestamp("solved_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
export const themeSuggestions = pgTable("theme_suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id"),
  editionId: varchar("edition_id"),
  themeName: text("theme_name").notNull(),
  description: text("description"),
  popularityScore: integer("popularity_score").default(0).notNull(),
  status: text("status").default("PENDING").notNull(), // 'PENDING' | 'APPROVED' | 'REJECTED'
  proposedBy: text("proposed_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertThemeSuggestionSchema = createInsertSchema(themeSuggestions).omit({
  id: true,
  createdAt: true,
});

export type InsertThemeSuggestion = z.infer<typeof insertThemeSuggestionSchema>;
export type ThemeSuggestion = typeof themeSuggestions.$inferSelect;

