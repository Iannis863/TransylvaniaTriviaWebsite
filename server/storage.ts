import { 
  type User, type InsertUser, 
  type Team, type InsertTeam,
  type Registration, type InsertRegistration, 
  type WeeklyPuzzleProgress, type InsertPuzzleProgress,
  type ThemeSuggestion, type InsertThemeSuggestion,
  users, teams, registrations, weeklyPuzzleProgress, themeSuggestions
} from "../shared/schema.js";
import { getCurrentOrNextEdition } from "../shared/schedule.js";
import { db } from "./db.js";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User Operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<Pick<User, "name" | "email" | "phoneNumber" | "password">>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  updateUserTeam(userId: string, teamId: string | null, role?: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Team Operations
  getTeam(id: string): Promise<Team | undefined>;
  getTeamByInviteCode(code: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  getTeamMembers(teamId: string): Promise<User[]>;
  getAllTeams(): Promise<Team[]>;

  // Registration Operations
  getRegistrations(editionId?: string): Promise<Registration[]>;
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  deleteRegistration(id: string): Promise<boolean>;
  markReminderSent(id: string): Promise<void>;

  // Legacy Team Registration methods
  createTeamRegistration(registration: InsertRegistration): Promise<Registration>;
  getTeamRegistrations(editionId?: string): Promise<Registration[]>;
  deleteTeamRegistration(id: string): Promise<boolean>;

  // Weekly Mini-Games Progress
  getPuzzleProgress(teamId: string, editionId: string): Promise<WeeklyPuzzleProgress[]>;
  savePuzzleProgress(progress: InsertPuzzleProgress): Promise<WeeklyPuzzleProgress>;
  resetPuzzleProgress(teamId: string, editionId: string): Promise<void>;

  // Theme Suggestions
  getThemeSuggestions(editionId?: string): Promise<ThemeSuggestion[]>;
  createThemeSuggestion(suggestion: InsertThemeSuggestion): Promise<ThemeSuggestion>;
  updateThemeSuggestionStatus(id: string, status: "APPROVED" | "REJECTED"): Promise<ThemeSuggestion | undefined>;

  // ── Admin Operations ──────────────────────────────────────────────────────
  updateRegistration(id: string, data: Partial<Pick<Registration, "teamName" | "captainName" | "memberCount" | "email" | "phoneNumber">>): Promise<Registration | undefined>;
  updateTeam(id: string, data: Partial<Pick<Team, "name" | "tagline" | "score" | "leaderId">>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<boolean>;
  getEditionCapacityOverride(editionId: string): Promise<number | undefined>;
  setEditionCapacityOverride(editionId: string, maxTeams: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private teams: Map<string, Team> = new Map();
  private registrations: Map<string, Registration> = new Map();
  private puzzleProgress: Map<string, WeeklyPuzzleProgress> = new Map();
  private themeSuggestions: Map<string, ThemeSuggestion> = new Map();
  private editionCapacityOverrides: Map<string, number> = new Map();

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    const active = getCurrentOrNextEdition();
    const editionId = active.currentEdition.id;

    // Seed Demo Users
    const leaderUser: User = {
      id: "usr_vlad_leader",
      name: "Vlad Dracul (Captain)",
      email: "vlad@transilvaniatrivia.ro",
      password: "password123",
      role: "TEAM_LEADER",
      avatar: "🧛",
      teamId: "team_night_scholars",
      createdAt: new Date(),
    };
    const memberUser: User = {
      id: "usr_elena_member",
      name: "Elena Carpatina",
      email: "elena@transilvaniatrivia.ro",
      password: "password123",
      role: "MEMBER",
      avatar: "🧙‍♀️",
      teamId: "team_night_scholars",
      createdAt: new Date(),
    };
    this.users.set(leaderUser.id, leaderUser);
    this.users.set(memberUser.id, memberUser);

    // Seed Demo Team
    const demoTeam: Team = {
      id: "team_night_scholars",
      name: "Cărturarii Nopții",
      leaderId: leaderUser.id,
      inviteCode: "NOCT-77",
      tagline: "Cunoașterea este singura noastră armă împotriva întunericului.",
      score: 1420,
      createdAt: new Date(),
    };
    this.teams.set(demoTeam.id, demoTeam);

    // Seed Demo Registered Teams for Upcoming Edition
    const initialRegistrations: InsertRegistration[] = [
      {
        editionId,
        teamId: demoTeam.id,
        teamName: "Cărturarii Nopții",
        captainName: "Vlad Dracul",
        email: "vlad@transilvaniatrivia.ro",
        phoneNumber: "+40 722 001 001",
        memberCount: 5,
      },
      {
        editionId,
        teamId: "team_dracula_scholars",
        teamName: "Geniile Carpaților",
        captainName: "Andrei Popescu",
        email: "andrei@exemplu.ro",
        phoneNumber: "+40 733 123 456",
        memberCount: 6,
      },
      {
        editionId,
        teamId: "team_transilvania_nerds",
        teamName: "Ordinul Dragonului",
        captainName: "Ioana Radu",
        email: "ioana@exemplu.ro",
        phoneNumber: "+40 744 987 654",
        memberCount: 4,
      },
      {
        editionId,
        teamId: "team_vampire_quiz",
        teamName: "Strigoii din Insomnia",
        captainName: "Mihai Ionescu",
        email: "mihai@exemplu.ro",
        phoneNumber: "+40 755 333 222",
        memberCount: 5,
      },
      {
        editionId,
        teamId: "team_brain_beasts",
        teamName: "Alchimiștii din Cluj",
        captainName: "Sorina Munteanu",
        email: "sorina@exemplu.ro",
        phoneNumber: "+40 766 888 999",
        memberCount: 3,
      },
      {
        editionId,
        teamId: "team_joker_cards",
        teamName: "Asul din Mânecă",
        captainName: "Cosmin Vasile",
        email: "cosmin@exemplu.ro",
        phoneNumber: "+40 777 555 444",
        memberCount: 6,
      },
    ];

    for (const reg of initialRegistrations) {
      const id = randomUUID();
      this.registrations.set(id, {
        id,
        teamId: reg.teamId || null,
        editionId: reg.editionId,
        teamName: reg.teamName,
        captainName: reg.captainName,
        email: reg.email,
        phoneNumber: reg.phoneNumber || null,
        memberCount: reg.memberCount,
        reminderSent: false,
        registeredAt: new Date(Date.now() - Math.floor(Math.random() * 86400000 * 2)),
      });
    }

    // All weekly puzzles start strictly UNRESOLVED (0/6) by default
  }

  async resetPuzzleProgress(teamId: string, editionId: string): Promise<void> {
    const keysToDelete: string[] = [];
    this.puzzleProgress.forEach((val, key) => {
      if (val.teamId === teamId && val.editionId === editionId) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach((k) => this.puzzleProgress.delete(k));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.getUserByEmail(username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      name: insertUser.name,
      email: insertUser.email,
      password: insertUser.password || null,
      role: insertUser.role || "MEMBER",
      avatar: insertUser.avatar || "👤",
      teamId: insertUser.teamId || null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, data: Partial<Pick<User, "name" | "email" | "phoneNumber" | "password">>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...data };
    this.users.set(id, updated);
    return updated;
  }
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async updateUserTeam(userId: string, teamId: string | null, role?: string): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;
    const updated: User = {
      ...user,
      teamId,
      role: role || user.role,
    };
    this.users.set(userId, updated);
    return updated;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamByInviteCode(code: string): Promise<Team | undefined> {
    return Array.from(this.teams.values()).find(
      (t) => t.inviteCode.toUpperCase() === code.trim().toUpperCase()
    );
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = randomUUID();
    const team: Team = {
      id,
      name: insertTeam.name,
      leaderId: insertTeam.leaderId,
      inviteCode: insertTeam.inviteCode.toUpperCase(),
      tagline: insertTeam.tagline || null,
      score: 0,
      createdAt: new Date(),
    };
    this.teams.set(id, team);
    await this.updateUserTeam(insertTeam.leaderId, id, "TEAM_LEADER");
    return team;
  }

  async getTeamMembers(teamId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter((u) => u.teamId === teamId);
  }

  async getAllTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getRegistrations(editionId?: string): Promise<Registration[]> {
    const all = Array.from(this.registrations.values());
    if (!editionId) return all;
    return all.filter((r) => r.editionId === editionId);
  }

  async createRegistration(registration: InsertRegistration): Promise<Registration> {
    const id = randomUUID();
    const newReg: Registration = {
      id,
      teamId: registration.teamId || null,
      editionId: registration.editionId,
      teamName: registration.teamName,
      captainName: registration.captainName,
      email: registration.email,
      phoneNumber: registration.phoneNumber || null,
      memberCount: registration.memberCount,
      reminderSent: false,
      registeredAt: new Date(),
    };
    this.registrations.set(id, newReg);
    return newReg;
  }

  async deleteRegistration(id: string): Promise<boolean> {
    return this.registrations.delete(id);
  }

  async markReminderSent(id: string): Promise<void> {
    const reg = this.registrations.get(id);
    if (reg) {
      reg.reminderSent = true;
    }
  }

  // Legacy mappings
  async createTeamRegistration(registration: InsertRegistration): Promise<Registration> {
    return this.createRegistration(registration);
  }

  async getTeamRegistrations(editionId?: string): Promise<Registration[]> {
    return this.getRegistrations(editionId);
  }

  async deleteTeamRegistration(id: string): Promise<boolean> {
    return this.deleteRegistration(id);
  }

  async getPuzzleProgress(teamId: string, editionId: string): Promise<WeeklyPuzzleProgress[]> {
    return Array.from(this.puzzleProgress.values()).filter(
      (p) => p.teamId === teamId && p.editionId === editionId
    );
  }

  async savePuzzleProgress(progress: InsertPuzzleProgress): Promise<WeeklyPuzzleProgress> {
    const key = `${progress.teamId}_${progress.editionId}_${progress.gameType}`;
    const existing = this.puzzleProgress.get(key);
    const isSolvedBool = progress.isSolved ?? false;

    if (existing) {
      const updated: WeeklyPuzzleProgress = {
        ...existing,
        isSolved: isSolvedBool,
        solvedByUserId: progress.solvedByUserId || existing.solvedByUserId,
        data: progress.data || existing.data,
        solvedAt: isSolvedBool ? (existing.solvedAt || new Date()) : null,
        updatedAt: new Date(),
      };
      this.puzzleProgress.set(key, updated);
      return updated;
    }

    const id = randomUUID();
    const newRecord: WeeklyPuzzleProgress = {
      id,
      teamId: progress.teamId,
      editionId: progress.editionId,
      gameType: progress.gameType,
      isSolved: isSolvedBool,
      solvedByUserId: progress.solvedByUserId || null,
      data: progress.data || null,
      solvedAt: isSolvedBool ? new Date() : null,
      updatedAt: new Date(),
    };
    this.puzzleProgress.set(key, newRecord);
    return newRecord;
  }

  async getThemeSuggestions(editionId?: string): Promise<ThemeSuggestion[]> {
    const all = Array.from(this.themeSuggestions.values());
    if (!editionId) return all;
    return all.filter((t) => t.editionId === editionId);
  }

  async createThemeSuggestion(suggestion: InsertThemeSuggestion): Promise<ThemeSuggestion> {
    const id = randomUUID();
    const record: ThemeSuggestion = {
      id,
      teamId: suggestion.teamId || null,
      editionId: suggestion.editionId || null,
      themeName: suggestion.themeName,
      description: suggestion.description || null,
      popularityScore: suggestion.popularityScore || 0,
      status: suggestion.status || "PENDING",
      proposedBy: suggestion.proposedBy,
      createdAt: new Date(),
    };
    this.themeSuggestions.set(id, record);
    return record;
  }

  async updateThemeSuggestionStatus(id: string, status: "APPROVED" | "REJECTED"): Promise<ThemeSuggestion | undefined> {
    const sug = this.themeSuggestions.get(id);
    if (!sug) return undefined;
    const updated = { ...sug, status };
    this.themeSuggestions.set(id, updated);
    return updated;
  }

  // ── Admin Operations ───────────────────────────────────────────────────────

  async updateRegistration(id: string, data: Partial<Pick<Registration, "teamName" | "captainName" | "memberCount" | "email" | "phoneNumber">>): Promise<Registration | undefined> {
    const reg = this.registrations.get(id);
    if (!reg) return undefined;
    const updated = { ...reg, ...data };
    this.registrations.set(id, updated);
    return updated;
  }

  async updateTeam(id: string, data: Partial<Pick<Team, "name" | "tagline" | "score" | "leaderId">>): Promise<Team | undefined> {
    const team = this.teams.get(id);
    if (!team) return undefined;
    const updated = { ...team, ...data };
    this.teams.set(id, updated);
    return updated;
  }

  async deleteTeam(id: string): Promise<boolean> {
    // Detach all members from this team
    this.users.forEach((user, uid) => {
      if (user.teamId === id) this.users.set(uid, { ...user, teamId: null, role: "MEMBER" });
    });
    // Remove all registrations linked to this team
    this.registrations.forEach((reg, rid) => {
      if (reg.teamId === id) this.registrations.delete(rid);
    });
    return this.teams.delete(id);
  }

  async getEditionCapacityOverride(editionId: string): Promise<number | undefined> {
    return this.editionCapacityOverrides.get(editionId);
  }

  async setEditionCapacityOverride(editionId: string, maxTeams: number): Promise<void> {
    this.editionCapacityOverrides.set(editionId, maxTeams);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.id, id));
    return result;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [result] = await db.select().from(users).where(eq(users.email, email));
    return result;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.getUserByEmail(username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [result] = await db.insert(users).values(insertUser).returning();
    return result;
  }

  async updateUser(id: string, data: Partial<Pick<User, "name" | "email" | "phoneNumber" | "password">>): Promise<User | undefined> {
    const [result] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return result;
  }
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async deleteUser(id: string): Promise<boolean> {
    const [result] = await db.delete(users).where(eq(users.id, id)).returning();
    return !!result;
  }

  async updateUserTeam(userId: string, teamId: string | null, role?: string): Promise<User | undefined> {
    const updateValues: any = { teamId };
    if (role) updateValues.role = role;
    const [result] = await db.update(users).set(updateValues).where(eq(users.id, userId)).returning();
    return result;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [result] = await db.select().from(teams).where(eq(teams.id, id));
    return result;
  }

  async getTeamByInviteCode(code: string): Promise<Team | undefined> {
    const [result] = await db.select().from(teams).where(eq(teams.inviteCode, code));
    return result;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [result] = await db.insert(teams).values(insertTeam).returning();
    await this.updateUserTeam(insertTeam.leaderId, result.id, "TEAM_LEADER");
    return result;
  }

  async getTeamMembers(teamId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.teamId, teamId));
  }

  async getAllTeams(): Promise<Team[]> {
    return await db.select().from(teams);
  }

  async getRegistrations(editionId?: string): Promise<Registration[]> {
    if (editionId) {
      return await db.select().from(registrations).where(eq(registrations.editionId, editionId));
    }
    return await db.select().from(registrations);
  }

  async createRegistration(registration: InsertRegistration): Promise<Registration> {
    const [result] = await db.insert(registrations).values(registration).returning();
    return result;
  }

  async deleteRegistration(id: string): Promise<boolean> {
    const result = await db.delete(registrations).where(eq(registrations.id, id)).returning();
    return result.length > 0;
  }

  async markReminderSent(id: string): Promise<void> {
    await db.update(registrations).set({ reminderSent: true }).where(eq(registrations.id, id));
  }

  async createTeamRegistration(registration: InsertRegistration): Promise<Registration> {
    return this.createRegistration(registration);
  }

  async getTeamRegistrations(editionId?: string): Promise<Registration[]> {
    return this.getRegistrations(editionId);
  }

  async deleteTeamRegistration(id: string): Promise<boolean> {
    return this.deleteRegistration(id);
  }

  async getPuzzleProgress(teamId: string, editionId: string): Promise<WeeklyPuzzleProgress[]> {
    return await db.select().from(weeklyPuzzleProgress).where(
      and(
        eq(weeklyPuzzleProgress.teamId, teamId),
        eq(weeklyPuzzleProgress.editionId, editionId)
      )
    );
  }

  async savePuzzleProgress(progress: InsertPuzzleProgress): Promise<WeeklyPuzzleProgress> {
    const [existing] = await db.select().from(weeklyPuzzleProgress).where(
      and(
        eq(weeklyPuzzleProgress.teamId, progress.teamId),
        eq(weeklyPuzzleProgress.editionId, progress.editionId),
        eq(weeklyPuzzleProgress.gameType, progress.gameType)
      )
    );

    if (existing) {
      const [updated] = await db.update(weeklyPuzzleProgress).set({
        isSolved: progress.isSolved,
        solvedByUserId: progress.solvedByUserId || existing.solvedByUserId,
        data: progress.data || existing.data,
        solvedAt: progress.isSolved ? (existing.solvedAt || new Date()) : null,
        updatedAt: new Date(),
      }).where(eq(weeklyPuzzleProgress.id, existing.id)).returning();
      return updated;
    }

    const [result] = await db.insert(weeklyPuzzleProgress).values(progress).returning();
    return result;
  }

  async resetPuzzleProgress(teamId: string, editionId: string): Promise<void> {
    await db.delete(weeklyPuzzleProgress).where(
      and(
        eq(weeklyPuzzleProgress.teamId, teamId),
        eq(weeklyPuzzleProgress.editionId, editionId)
      )
    );
  }

  async getThemeSuggestions(editionId?: string): Promise<ThemeSuggestion[]> {
    if (editionId) {
      return await db.select().from(themeSuggestions).where(eq(themeSuggestions.editionId, editionId));
    }
    return await db.select().from(themeSuggestions);
  }

  async createThemeSuggestion(suggestion: InsertThemeSuggestion): Promise<ThemeSuggestion> {
    const [result] = await db.insert(themeSuggestions).values(suggestion).returning();
    return result;
  }

  async updateThemeSuggestionStatus(id: string, status: "APPROVED" | "REJECTED"): Promise<ThemeSuggestion | undefined> {
    const [result] = await db.update(themeSuggestions).set({ status }).where(eq(themeSuggestions.id, id)).returning();
    return result;
  }

  // ── Admin Operations ───────────────────────────────────────────────────────

  async updateRegistration(id: string, data: Partial<Pick<Registration, "teamName" | "captainName" | "memberCount" | "email" | "phoneNumber">>): Promise<Registration | undefined> {
    const [result] = await db.update(registrations).set(data).where(eq(registrations.id, id)).returning();
    return result;
  }

  async updateTeam(id: string, data: Partial<Pick<Team, "name" | "tagline" | "score" | "leaderId">>): Promise<Team | undefined> {
    const [result] = await db.update(teams).set(data).where(eq(teams.id, id)).returning();
    return result;
  }

  async deleteTeam(id: string): Promise<boolean> {
    await db.update(users).set({ teamId: null, role: "MEMBER" }).where(eq(users.teamId, id));
    await db.delete(registrations).where(eq(registrations.teamId, id));
    const result = await db.delete(teams).where(eq(teams.id, id)).returning();
    return result.length > 0;
  }

  // Capacity overrides are runtime-only (not persisted to DB — admin can set per restart)
  private static capacityOverrides: Map<string, number> = new Map();

  async getEditionCapacityOverride(editionId: string): Promise<number | undefined> {
    return DatabaseStorage.capacityOverrides.get(editionId);
  }

  async setEditionCapacityOverride(editionId: string, maxTeams: number): Promise<void> {
    DatabaseStorage.capacityOverrides.set(editionId, maxTeams);
  }
}

// Fallback to MemStorage if DATABASE_URL is not set or during testing
export const storage: IStorage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
