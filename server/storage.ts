import { bookTeam, approveTeam } from "./booking.js";
import { 
  type User, type InsertUser, 
  type Team, type InsertTeam,
  type Registration, type InsertRegistration, 
  type WeeklyPuzzleProgress, type InsertPuzzleProgress,
  type ThemeSuggestion, type InsertThemeSuggestion,
  type PasswordResetCode,
  users, teams, registrations, weeklyPuzzleProgress, themeSuggestions, passwordResetCodes, adminCredentials
} from "../shared/schema.js";
import { getCurrentOrNextEdition } from "../shared/schedule.js";
import { db } from "./db.js";
import { randomUUID } from "crypto";
import { eq, and, gt, sql } from "drizzle-orm";
import { ADMIN_CREDENTIAL_ID, INITIAL_ADMIN_PASSWORD_HASH } from "./admin-credential.js";

export interface IStorage {
  getAdminPasswordHash(): Promise<string | undefined>;
  setAdminPasswordHash(passwordHash: string): Promise<void>;
  withTeamMutation<T>(operation: (source: IStorage) => Promise<T>): Promise<T>;
  // User Operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<Pick<User, "name" | "email" | "phoneNumber" | "password">>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  upgradeLegacyPassword(id: string, previous: string, hashed: string): Promise<User | undefined>;
  updateUserTeam(userId: string, teamId: string | null, role?: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;

  // Team Operations
  getTeam(id: string): Promise<Team | undefined>;
  getTeamByInviteCode(code: string): Promise<Team | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  getTeamMembers(teamId: string): Promise<User[]>;
  getAllTeams(): Promise<Team[]>;

  withEditionMutation<T>(editionId: string, operation: (source: IStorage) => Promise<T>): Promise<T>;
  getRegistration(id: string): Promise<Registration | undefined>;
  confirmRegistration(id: string): Promise<Registration | undefined>;
  approveRegistration(id: string): Promise<Registration | undefined>;
  markWaitlistQueued(id: string): Promise<void>;
  getEditionClue(editionId: string): Promise<string | undefined>;
  getEditionClues(): Promise<Map<string, string>>;
  setEditionClue(editionId: string, clue: string): Promise<void>;
  // Registration Operations
  getRegistrations(editionId?: string): Promise<Registration[]>;
  createRegistration(registration: InsertRegistration): Promise<Registration>;
  createRegistrationWithinCapacity(registration: InsertRegistration, capacity: number): Promise<Registration>;
  markConfirmationQueued(id: string): Promise<void>;
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
  deleteThemeSuggestion(id: string): Promise<boolean>;

  // ── Admin Operations ──────────────────────────────────────────────────────
  updateRegistration(id: string, data: Partial<Pick<Registration, "teamName" | "captainName" | "memberCount" | "email" | "phoneNumber">>): Promise<Registration | undefined>;
  updateTeam(id: string, data: Partial<Pick<Team, "name" | "tagline" | "score" | "leaderId">>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<boolean>;
  getEditionCapacityOverride(editionId: string): Promise<number | undefined>;
  getEditionCapacityOverrides(): Promise<Map<string, number>>;
  setEditionCapacityOverride(editionId: string, maxTeams: number): Promise<void>;

  // ── Password Reset Codes ──────────────────────────────────────────────────
  createResetCode(email: string, code: string, expiresAt: Date): Promise<void>;
  consumeResetCode(email: string, code: string): Promise<boolean>;
  getValidResetCode(email: string): Promise<PasswordResetCode | undefined>;
  incrementResetCodeAttempts(id: string): Promise<void>;
  deleteResetCodes(email: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private adminPasswordHash = INITIAL_ADMIN_PASSWORD_HASH;
  async getAdminPasswordHash() { return this.adminPasswordHash; }
  async setAdminPasswordHash(passwordHash: string) { this.adminPasswordHash = passwordHash; }
  private users: Map<string, User> = new Map();
  private teams: Map<string, Team> = new Map();
  private registrations: Map<string, Registration> = new Map();
  private puzzleProgress: Map<string, WeeklyPuzzleProgress> = new Map();
  private themeSuggestions: Map<string, ThemeSuggestion> = new Map();
  private editionClues = new Map<string, string>();
  private bookingMutation: Promise<unknown> = Promise.resolve();
  private editionCapacityOverrides: Map<string, number> = new Map();

  private teamMutation: Promise<unknown> = Promise.resolve();
  async withTeamMutation<T>(operation: (source: IStorage) => Promise<T>): Promise<T> {
    const result = this.teamMutation.then(() => operation(this));
    this.teamMutation = result.catch(() => undefined);
    return result;
  }

  constructor() {
    if (process.env.SEED_DEMO_DATA === "true") this.seedInitialData();
  }

  private seedInitialData() {
    const active = getCurrentOrNextEdition();
    const editionId = active.currentEdition.id;

    // Seed Demo Users
    const leaderUser: User = {
      id: "usr_vlad_leader",
      name: "Vlad Dracul (Captain)",
      email: "vlad@transilvaniatrivia.ro",
      phoneNumber: null,
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
      phoneNumber: null,
      password: "password123",
      role: "MEMBER",
      avatar: "🧙‍♀️",
      teamId: "team_night_scholars",
      createdAt: new Date(),
    };
    const adminUser: User = {
      id: "usr_admin",
      name: "Quizmaster Admin",
      email: "admin@transilvaniatrivia.ro",
      phoneNumber: null,
      password: "password123",
      role: "ADMIN",
      avatar: "👑",
      teamId: null,
      createdAt: new Date(),
    };
    this.users.set(leaderUser.id, leaderUser);
    this.users.set(memberUser.id, memberUser);
    this.users.set(adminUser.id, adminUser);

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
        language: "ro",
        confirmationQueued: true,
        waitlistQueued: false,
        status: "CONFIRMED",
        eventDate: active.eventDate,
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
      (u) => u.email.trim().toLowerCase() === email.trim().toLowerCase()
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
      phoneNumber: insertUser.phoneNumber || null,
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

  async upgradeLegacyPassword(id: string, previous: string, hashed: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user || user.password !== previous) return undefined;
    const updated = { ...user, password: hashed };
    this.users.set(id, updated);
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    this.puzzleProgress.forEach(progress => { if (progress.solvedByUserId === id) progress.solvedByUserId = null; });
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
      language: registration.language ?? "ro",
      confirmationQueued: false,
      waitlistQueued: false,
      status: registration.status ?? "CONFIRMED",
      eventDate: registration.eventDate || null,
      reminderSent: false,
      registeredAt: new Date(),
    };
    this.registrations.set(id, newReg);
    return newReg;
  }

  async withEditionMutation<T>(_editionId: string, operation: (source: IStorage) => Promise<T>): Promise<T> {
    const result = this.bookingMutation.then(() => operation(this));
    this.bookingMutation = result.catch(() => undefined);
    return result;
  }
  async getRegistration(id: string) { return this.registrations.get(id); }
  async confirmRegistration(id: string) {
    const reg = this.registrations.get(id);
    if (!reg) return undefined;
    const result: Registration = { ...reg, status: "CONFIRMED", confirmationQueued: false };
    this.registrations.set(id, result);
    return result;
  }
  async approveRegistration(id: string) {
    const reg = await this.getRegistration(id);
    return reg ? this.withEditionMutation(reg.editionId, source => approveTeam(source, id)) : undefined;
  }
  async markWaitlistQueued(id: string) {
    const reg = this.registrations.get(id);
    if (reg) reg.waitlistQueued = true;
  }
  async getEditionClue(id: string) { return this.editionClues.get(id); }
  async getEditionClues() { return new Map(this.editionClues); }
  async setEditionClue(id: string, clue: string) { this.editionClues.set(id, clue); }
  async createRegistrationWithinCapacity(registration: InsertRegistration, capacity: number): Promise<Registration> {
    return this.withEditionMutation(registration.editionId, source => bookTeam(source, registration, capacity));
  }
  async markConfirmationQueued(id: string): Promise<void> {
    const reg = this.registrations.get(id);
    if (reg) reg.confirmationQueued = true;
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
    const isSolvedBool = !!existing?.isSolved || (progress.isSolved ?? false);

    if (existing) {
      const updated: WeeklyPuzzleProgress = {
        ...existing,
        isSolved: isSolvedBool,
        solvedByUserId: existing.isSolved ? existing.solvedByUserId : (progress.solvedByUserId || existing.solvedByUserId),
        data: existing.isSolved ? existing.data : (progress.data ?? existing.data),
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
    const suggestion = this.themeSuggestions.get(id);
    if (!suggestion) return undefined;
    
    const updated = { ...suggestion, status };
    this.themeSuggestions.set(id, updated);
    return updated;
  }

  async deleteThemeSuggestion(id: string): Promise<boolean> {
    return this.themeSuggestions.delete(id);
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
    this.puzzleProgress.forEach((progress, key) => { if (progress.teamId === id) this.puzzleProgress.delete(key); });
    this.themeSuggestions.forEach(suggestion => { if (suggestion.teamId === id) suggestion.teamId = null; });
    return this.teams.delete(id);
  }

  async getEditionCapacityOverride(editionId: string): Promise<number | undefined> {
    return this.editionCapacityOverrides.get(editionId);
  }

  async getEditionCapacityOverrides() { return new Map(this.editionCapacityOverrides); }

  async setEditionCapacityOverride(editionId: string, maxTeams: number): Promise<void> {
    this.editionCapacityOverrides.set(editionId, maxTeams);
  }

  // ── Password Reset Codes (in-memory for dev) ─────────────────────────────
  private resetCodes: Map<string, PasswordResetCode> = new Map();

  async createResetCode(email: string, code: string, expiresAt: Date): Promise<void> {
    const id = randomUUID();
    this.resetCodes.set(email.toLowerCase(), {
      id,
      email: email.toLowerCase(),
      code,
      attempts: 0,
      expiresAt,
      createdAt: new Date(),
    });
  }

  async getValidResetCode(email: string): Promise<PasswordResetCode | undefined> {
    const entry = this.resetCodes.get(email.toLowerCase());
    if (!entry) return undefined;
    if (entry.expiresAt < new Date()) {
      this.resetCodes.delete(email.toLowerCase());
      return undefined;
    }
    return entry;
  }

  async consumeResetCode(email: string, code: string): Promise<boolean> {
    const key = email.toLowerCase();
    const entry = this.resetCodes.get(key);
    if (!entry || entry.expiresAt <= new Date() || entry.attempts >= 5) return false;
    entry.attempts++;
    if (entry.code !== code) return false;
    this.resetCodes.delete(key);
    return true;
  }

  async incrementResetCodeAttempts(id: string): Promise<void> {
    this.resetCodes.forEach((entry, key) => {
      if (entry.id === id) {
        this.resetCodes.set(key, { ...entry, attempts: entry.attempts + 1 });
      }
    });
  }

  async deleteResetCodes(email: string): Promise<void> {
    this.resetCodes.delete(email.toLowerCase());
  }
}

export class DatabaseStorage implements IStorage {
  constructor(private database: any = db) {}
  async getAdminPasswordHash(): Promise<string | undefined> {
    const [credential] = await this.database.select({ passwordHash: adminCredentials.passwordHash })
      .from(adminCredentials).where(eq(adminCredentials.id, ADMIN_CREDENTIAL_ID));
    return credential?.passwordHash;
  }
  async setAdminPasswordHash(passwordHash: string): Promise<void> {
    await this.database.insert(adminCredentials).values({ id: ADMIN_CREDENTIAL_ID, passwordHash })
      .onConflictDoUpdate({ target: adminCredentials.id, set: { passwordHash, updatedAt: new Date() } });
  }
  async withTeamMutation<T>(operation: (source: IStorage) => Promise<T>): Promise<T> {
    return this.database.transaction(async (tx: any) => {
      // Serializes membership/leadership changes across server instances.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('app-team-mutations'))`);
      return operation(new DatabaseStorage(tx));
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [result] = await this.database.select().from(users).where(eq(users.id, id));
    return result;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [result] = await this.database.select().from(users).where(sql`lower(trim(${users.email})) = ${email.trim().toLowerCase()}`);
    return result;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return this.getUserByEmail(username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [result] = await this.database.insert(users).values(insertUser).returning();
    return result;
  }

  async updateUser(id: string, data: Partial<Pick<User, "name" | "email" | "phoneNumber" | "password">>): Promise<User | undefined> {
    const [result] = await this.database.update(users).set(data).where(eq(users.id, id)).returning();
    return result;
  }
  async getAllUsers(): Promise<User[]> {
    return await this.database.select().from(users);
  }

  async upgradeLegacyPassword(id: string, previous: string, hashed: string): Promise<User | undefined> {
    const [user] = await this.database.update(users).set({ password: hashed })
      .where(and(eq(users.id, id), eq(users.password, previous))).returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const [result] = await this.database.delete(users).where(eq(users.id, id)).returning();
    return !!result;
  }

  async updateUserTeam(userId: string, teamId: string | null, role?: string): Promise<User | undefined> {
    const updateValues: any = { teamId };
    if (role) updateValues.role = role;
    const [result] = await this.database.update(users).set(updateValues).where(eq(users.id, userId)).returning();
    return result;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [result] = await this.database.select().from(teams).where(eq(teams.id, id));
    return result;
  }

  async getTeamByInviteCode(code: string): Promise<Team | undefined> {
    const [result] = await this.database.select().from(teams).where(eq(teams.inviteCode, code.trim().toUpperCase()));
    return result;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [result] = await this.database.insert(teams).values(insertTeam).returning();
    await this.updateUserTeam(insertTeam.leaderId, result.id, "TEAM_LEADER");
    return result;
  }

  async getTeamMembers(teamId: string): Promise<User[]> {
    return await this.database.select().from(users).where(eq(users.teamId, teamId));
  }

  async getAllTeams(): Promise<Team[]> {
    return await this.database.select().from(teams);
  }

  async getRegistrations(editionId?: string): Promise<Registration[]> {
    if (editionId) {
      return await this.database.select().from(registrations).where(eq(registrations.editionId, editionId));
    }
    return await this.database.select().from(registrations);
  }

  async createRegistration(registration: InsertRegistration): Promise<Registration> {
    const [result] = await this.database.insert(registrations).values(registration).returning();
    return result;
  }

  async withEditionMutation<T>(editionId: string, operation: (source: IStorage) => Promise<T>): Promise<T> {
    return this.database.transaction(async (tx: any) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${editionId}))`);
      return operation(new DatabaseStorage(tx));
    });
  }
  async getRegistration(id: string): Promise<Registration | undefined> {
    const [result] = await this.database.select().from(registrations).where(eq(registrations.id, id));
    return result;
  }
  async confirmRegistration(id: string): Promise<Registration | undefined> {
    const [result] = await this.database.update(registrations).set({ status: "CONFIRMED", confirmationQueued: false }).where(eq(registrations.id, id)).returning();
    return result;
  }
  async approveRegistration(id: string) {
    const reg = await this.getRegistration(id);
    return reg ? this.withEditionMutation(reg.editionId, source => approveTeam(source, id)) : undefined;
  }
  async markWaitlistQueued(id: string) {
    await this.database.update(registrations).set({ waitlistQueued: true }).where(eq(registrations.id, id));
  }
  async getEditionClue(id: string): Promise<string | undefined> {
    const result = await this.database.execute(sql`SELECT clue FROM app_edition_clues WHERE edition_id = ${id}`);
    return result.rows[0]?.clue;
  }
  async getEditionClues(): Promise<Map<string, string>> {
    const result = await this.database.execute(sql`SELECT edition_id, clue FROM app_edition_clues`);
    return new Map(result.rows.map((row: { edition_id: string; clue: string }) => [row.edition_id, row.clue]));
  }
  async setEditionClue(id: string, clue: string) {
    await this.database.execute(sql`INSERT INTO app_edition_clues (edition_id, clue) VALUES (${id}, ${clue}) ON CONFLICT (edition_id) DO UPDATE SET clue = EXCLUDED.clue`);
  }
  async createRegistrationWithinCapacity(registration: InsertRegistration, capacity: number): Promise<Registration> {
    return this.withEditionMutation(registration.editionId, source => bookTeam(source, registration, capacity));
  }
  async markConfirmationQueued(id: string): Promise<void> {
    await this.database.update(registrations).set({ confirmationQueued: true }).where(eq(registrations.id, id));
  }

  async deleteRegistration(id: string): Promise<boolean> {
    const result = await this.database.delete(registrations).where(eq(registrations.id, id)).returning();
    return result.length > 0;
  }

  async markReminderSent(id: string): Promise<void> {
    await this.database.update(registrations).set({ reminderSent: true }).where(eq(registrations.id, id));
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
    return await this.database.select().from(weeklyPuzzleProgress).where(
      and(
        eq(weeklyPuzzleProgress.teamId, teamId),
        eq(weeklyPuzzleProgress.editionId, editionId)
      )
    );
  }

  async savePuzzleProgress(progress: InsertPuzzleProgress): Promise<WeeklyPuzzleProgress> {
    return this.database.transaction(async (tx: any) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`puzzle:${progress.teamId}:${progress.editionId}`}))`);
      const [existing] = await tx.select().from(weeklyPuzzleProgress).where(and(
        eq(weeklyPuzzleProgress.teamId, progress.teamId), eq(weeklyPuzzleProgress.editionId, progress.editionId), eq(weeklyPuzzleProgress.gameType, progress.gameType)
      ));
      if (existing) {
        const [updated] = await tx.update(weeklyPuzzleProgress).set({
          isSolved: existing.isSolved || progress.isSolved,
          solvedByUserId: existing.isSolved ? existing.solvedByUserId : progress.solvedByUserId,
          data: existing.isSolved ? existing.data : (progress.data ?? existing.data),
          solvedAt: existing.solvedAt || (progress.isSolved ? new Date() : null), updatedAt: new Date(),
        }).where(eq(weeklyPuzzleProgress.id, existing.id)).returning();
        return updated;
      }
      const [result] = await tx.insert(weeklyPuzzleProgress).values(progress).returning();
      return result;
    });
  }

  async resetPuzzleProgress(teamId: string, editionId: string): Promise<void> {
    await this.database.delete(weeklyPuzzleProgress).where(
      and(
        eq(weeklyPuzzleProgress.teamId, teamId),
        eq(weeklyPuzzleProgress.editionId, editionId)
      )
    );
  }

  async getThemeSuggestions(editionId?: string): Promise<ThemeSuggestion[]> {
    if (editionId) {
      return await this.database.select().from(themeSuggestions).where(eq(themeSuggestions.editionId, editionId));
    }
    return await this.database.select().from(themeSuggestions);
  }

  async createThemeSuggestion(suggestion: InsertThemeSuggestion): Promise<ThemeSuggestion> {
    const [result] = await this.database.insert(themeSuggestions).values(suggestion).returning();
    return result;
  }

  async updateThemeSuggestionStatus(id: string, status: "APPROVED" | "REJECTED"): Promise<ThemeSuggestion | undefined> {
    const [result] = await this.database.update(themeSuggestions).set({ status }).where(eq(themeSuggestions.id, id)).returning();
    return result;
  }
  async deleteThemeSuggestion(id: string): Promise<boolean> {
    const [result] = await this.database.delete(themeSuggestions).where(eq(themeSuggestions.id, id)).returning();
    return !!result;
  }

  // ── Admin Operations ───────────────────────────────────────────────────────

  async updateRegistration(id: string, data: Partial<Pick<Registration, "teamName" | "captainName" | "memberCount" | "email" | "phoneNumber">>): Promise<Registration | undefined> {
    const [result] = await this.database.update(registrations).set(data).where(eq(registrations.id, id)).returning();
    return result;
  }

  async updateTeam(id: string, data: Partial<Pick<Team, "name" | "tagline" | "score" | "leaderId">>): Promise<Team | undefined> {
    const [result] = await this.database.update(teams).set(data).where(eq(teams.id, id)).returning();
    return result;
  }

  async deleteTeam(id: string): Promise<boolean> {
    await this.database.update(users).set({ teamId: null, role: "MEMBER" }).where(eq(users.teamId, id));
    await this.database.delete(registrations).where(eq(registrations.teamId, id));
    const result = await this.database.delete(teams).where(eq(teams.id, id)).returning();
    return result.length > 0;
  }

  async getEditionCapacityOverride(editionId: string): Promise<number | undefined> {
    const result = await this.database.execute(sql`SELECT max_teams FROM app_edition_capacity WHERE edition_id = ${editionId}`);
    return result.rows[0]?.max_teams;
  }

  async getEditionCapacityOverrides(): Promise<Map<string, number>> {
    const result = await this.database.execute(sql`SELECT edition_id, max_teams FROM app_edition_capacity`);
    return new Map(result.rows.map((row: { edition_id: string; max_teams: number }) => [row.edition_id, row.max_teams]));
  }

  async setEditionCapacityOverride(editionId: string, maxTeams: number): Promise<void> {
    await this.database.execute(sql`INSERT INTO app_edition_capacity (edition_id, max_teams) VALUES (${editionId}, ${maxTeams}) ON CONFLICT (edition_id) DO UPDATE SET max_teams = EXCLUDED.max_teams`);
  }

  // ── Password Reset Codes ─────────────────────────────────────────────────
  async createResetCode(email: string, code: string, expiresAt: Date): Promise<void> {
    await this.database.transaction(async (tx: any) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`reset:${email.toLowerCase()}`}))`);
      await tx.delete(passwordResetCodes).where(eq(passwordResetCodes.email, email.toLowerCase()));
      await tx.insert(passwordResetCodes).values({ email: email.toLowerCase(), code, expiresAt });
    });
  }

  async getValidResetCode(email: string): Promise<PasswordResetCode | undefined> {
    const [result] = await this.database.select()
      .from(passwordResetCodes)
      .where(and(
        eq(passwordResetCodes.email, email.toLowerCase()),
        gt(passwordResetCodes.expiresAt, new Date())
      ));
    return result;
  }

  async consumeResetCode(email: string, code: string): Promise<boolean> {
    return this.database.transaction(async (tx: any) => {
      const [entry] = await tx.select().from(passwordResetCodes)
        .where(eq(passwordResetCodes.email, email.toLowerCase())).for("update");
      if (!entry || entry.expiresAt <= new Date() || entry.attempts >= 5) return false;
      if (entry.code !== code) {
        await tx.update(passwordResetCodes).set({ attempts: entry.attempts + 1 }).where(eq(passwordResetCodes.id, entry.id));
        return false;
      }
      await tx.delete(passwordResetCodes).where(eq(passwordResetCodes.email, email.toLowerCase()));
      return true;
    });
  }

  async incrementResetCodeAttempts(id: string): Promise<void> {
    const entry = await this.database.select().from(passwordResetCodes).where(eq(passwordResetCodes.id, id));
    if (entry.length > 0) {
      await this.database.update(passwordResetCodes)
        .set({ attempts: sql`${passwordResetCodes.attempts} + 1` })
        .where(eq(passwordResetCodes.id, id));
    }
  }

  async deleteResetCodes(email: string): Promise<void> {
    await this.database.delete(passwordResetCodes).where(eq(passwordResetCodes.email, email.toLowerCase()));
  }
}

// Fallback to MemStorage if DATABASE_URL is not set or during testing
export const storage: IStorage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
