import { getPuzzleWeekId, getRealCurrentWeekIndex, getWeekDateRange } from "../shared/puzzle-week.js";
import { bucharestParts } from "../shared/event-time.js";
import { getTargetPuzzle, isTargetSolution } from "../shared/target-game.js";
import type { Express, RequestHandler } from "express";
import { type Server } from "http";
import { storage } from "./storage.js";
import { insertRegistrationSchema } from "../shared/schema.js";
import { getCurrentOrNextEdition, getFullSchedule, getEditionDateTime } from "../shared/schedule.js";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import { expandedCapacity } from "../shared/booking.js";
import { buildEventEmail, buildPasswordResetEmail, FROM_EMAIL, sendPasswordResetCode } from "./email.js";
import { teamService, TeamError } from "./team-service.js";
import { notifications } from "./notifications.js";
import { reminderIsDue, runNotifications } from "./scheduler.js";
import { scoreQuizzability } from "./quizzability/index.js";
import { randomInt } from "crypto";
import { establishSession, hashPassword, verifyPassword, publicUser, requireUser, rateLimit, safeEqual } from "./security.js";

// Admin access uses the dedicated credential record, independently of player accounts and env settings.
const checkAuth: RequestHandler = async (req, res, next) => {
  try {
    const clientPassword = req.headers["x-admin-password"];
    if (typeof clientPassword !== "string" || !clientPassword || clientPassword.length > 1024) {
      return void res.status(401).json({ message: "Neautorizat. Parolă incorectă!" });
    }
    const passwordHash = await storage.getAdminPasswordHash();
    if (!passwordHash?.startsWith("scrypt:") || !await verifyPassword(clientPassword, passwordHash)) {
      return void res.status(401).json({ message: "Neautorizat. Parolă incorectă!" });
    }
    next();
  } catch (error) { next(error); }
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use("/api/admin", rateLimit(100));
  app.post("/api/admin/verify", rateLimit(10));
  app.get("/api/registrations", rateLimit(30));
  app.delete("/api/registrations/:id", rateLimit(30));
  app.delete("/api/theme-suggestions/:id", rateLimit(30));
  app.post("/api/teams/join", rateLimit(20));
  app.use("/api/auth", rateLimit(100));
  app.post("/api/auth/login", rateLimit(15));
  app.post("/api/auth/register", rateLimit(10));
  app.post("/api/auth/forgot-password", rateLimit(10));
  app.post("/api/auth/reset-password", rateLimit(15));
  app.post("/api/registrations", rateLimit(15));
  app.post("/api/theme-validator", rateLimit(10));
  app.use("/api/teams", requireUser);
  app.use("/api/games", requireUser);
  app.use("/api/auth/me", requireUser);

  app.post("/api/auth/logout", (req, res, next) => {
    req.session.destroy(error => {
      if (error) return next(error);
      res.clearCookie("tt.sid", { path: "/" });
      res.json({ ok: true });
    });
  });

  // ==========================================
  // 1. SCHEDULE & ACTIVE EDITION ENDPOINTS
  // ==========================================

  // Get current / next active edition and countdown details
  app.get("/api/schedule/current", async (_req, res) => {
    try {
      const activeState = getCurrentOrNextEdition(new Date());
      const allRegistrations = await storage.getRegistrations(activeState.currentEdition.id);
      const registeredTeams = allRegistrations.filter(r => r.status === "CONFIRMED");
      
      const capacity = expandedCapacity(registeredTeams.length, await storage.getEditionCapacityOverride(activeState.currentEdition.id) ?? activeState.currentEdition.maxTeams);
      res.json({
        ...activeState,
        currentEdition: { ...activeState.currentEdition, maxTeams: capacity },
        registeredCount: registeredTeams.length,
        maxTeams: capacity,
        isFull: registeredTeams.length >= Math.min(capacity, 15) || allRegistrations.some(r => r.status === "WAITLISTED"),
        waitlistCount: allRegistrations.filter(r => r.status === "WAITLISTED").length,
      });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Error fetching current schedule:", error);
      res.status(500).json({ message: "Eroare la calcularea programului activ" });
    }
  });

  // Get all seasons & editions
  app.get("/api/schedule/all", async (_req, res) => {
    try {
      const full = getFullSchedule();
      res.json(full);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      res.status(500).json({ message: "Eroare la obținerea calendarului complet" });
    }
  });

  // ==========================================
  // ─── ADMIN USERS ────────────────────────────────────────────────────────────

  // Get all users
  app.get("/api/admin/users", checkAuth, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers.map(publicUser));
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Eroare la încărcarea utilizatorilor" });
    }
  });

  // Delete user (admin)
  app.delete("/api/admin/users/:id", checkAuth, async (req, res) => {
    try {
      await teamService.leave(req.params.id, true);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      if (error instanceof TeamError) return res.status(error.status).json({ message: error.message });
      console.error("Team operation failed:", error);
      res.status(500).json({ message: "Eroare la actualizarea echipei" });
    }
  });

  // ==========================================
  // 2. REGISTRATION ENDPOINTS
  // ==========================================

  // Public Endpoint: Get registered teams for active edition (or specified edition)
  app.get("/api/registrations/active", async (req, res) => {
    try {
      const editionId = (req.query.editionId as string) || getCurrentOrNextEdition().currentEdition.id;
      const registeredList = await storage.getRegistrations(editionId);
      
      // Mask email / phone for public view
      const publicList = registeredList.filter(r => r.status === "CONFIRMED").map((r) => ({
        id: r.id,
        teamName: r.teamName,
        captainName: r.captainName,
        memberCount: r.memberCount,
        registeredAt: r.registeredAt,
        teamId: r.teamId,
      }));

      res.json({
        editionId,
        count: publicList.length,
        teams: publicList,
      });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Error fetching active registrations:", error);
      res.status(500).json({ message: "Eroare la încărcarea echipelor înscrise" });
    }
  });

  // Public Endpoint: Register a team for an edition
  app.post("/api/registrations", async (req, res) => {
    try {
      const active = getCurrentOrNextEdition();
      const body = {
        ...req.body,
        editionId: req.body.editionId || active.currentEdition.id,
      };

      const data: import("../shared/schema.js").InsertRegistration = insertRegistrationSchema.parse(body);

      const edition = [...getFullSchedule(), active.currentEdition].find(item => item.id === data.editionId);
      if (!edition) return res.status(400).json({ message: "Ediție invalidă" });
      const eventDate = getEditionDateTime(edition);
      if (eventDate <= new Date()) return res.status(400).json({ message: "Înscrierile pentru această ediție s-au închis" });
      data.eventDate = eventDate;
      if (data.teamId) {
        await requireUser(req, res, (error?: unknown) => { if (error) throw error; });
        if (res.headersSent) return;
        const team = await storage.getTeam(data.teamId);
        if (!team || team.leaderId !== req.session.userId) return res.status(403).json({ message: "Doar căpitanul poate înscrie echipa" });
        data.teamName = team.name;
        data.captainName = res.locals.user.name;
        data.email = res.locals.user.email;
      }
      const capacity = await storage.getEditionCapacityOverride(data.editionId) ?? edition.maxTeams;
      const registration = await storage.createRegistrationWithinCapacity(data, capacity);
      
      let emailStatus = "pending";
      try {
        await notifications.queue(registration, registration.status === "WAITLISTED" ? "waitlist" : "confirmation");
        if (registration.status === "WAITLISTED") await storage.markWaitlistQueued(registration.id);
        else await storage.markConfirmationQueued(registration.id);
        // Hobby cron runs once daily; registrations made afterward still receive today's reminder.
        if (reminderIsDue(registration)) await notifications.queue(registration, "reminder");
        const delivery = await notifications.deliver(registration.id);
        if (await notifications.reminderComplete(registration.id)) await storage.markReminderSent(registration.id);
        emailStatus = delivery.failed === 0 && delivery.sent > 0 ? "sent" : "pending";
      } catch (emailErr) {
        console.error("Failed to queue/send confirmation:", emailErr);
      }
      
      res.status(201).json({ ...registration, emailStatus });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      if (error instanceof Error && (error.message === "EDITION_FULL" || error.message === "DUPLICATE_REGISTRATION")) return res.status(409).json({ message: error.message === "EDITION_FULL" ? "Toate locurile sunt ocupate" : "Echipa este deja înscrisă" });
      console.error("Registration error:", error);
      res.status(500).json({ message: "Eroare la înregistrarea echipei" });
    }
  });

  // Protected Endpoint: Fetching all registrations across all editions
  app.get("/api/registrations", checkAuth, async (_req, res) => {
    try {
      const registrations = await storage.getRegistrations();
      res.json(registrations);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Get registrations error:", error);
      res.status(500).json({ message: "Eroare la obținerea înregistrărilor" });
    }
  });

  // Protected Endpoint: Delete registration
  app.delete("/api/registrations/:id", checkAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteRegistration(id);
      if (deleted) {
        res.status(200).json({ message: "Echipa a fost ștearsă cu succes" });
      } else {
        res.status(404).json({ message: "Înregistrarea nu a fost găsită" });
      }
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Delete registration error:", error);
      res.status(500).json({ message: "Eroare la ștergerea echipei" });
    }
  });

  // ==========================================
  // 3. AUTHENTICATION & USER ENDPOINTS
  // ==========================================

  // Register new User
  app.post("/api/auth/register", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().trim().min(2, "Numele trebuie să aibă cel puțin 2 caractere").max(100),
        email: z.string().trim().toLowerCase().email("Adresă de email invalidă").max(254),
        password: z.string().min(6, "Parola trebuie să aibă cel puțin 6 caractere").max(256),
        keepLoggedIn: z.boolean().optional(),
      });

      const data = schema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Există deja un cont cu această adresă de email!" });
      }

      const user = await storage.createUser({ name: data.name, email: data.email, role: "MEMBER", password: await hashPassword(data.password) });
      await establishSession(req, user, data.keepLoggedIn === true);
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        teamId: user.teamId,
      });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Register Error:", error);
      res.status(500).json({ message: "Eroare la crearea contului" });
    }
  });

  // Login User
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, keepLoggedIn } = z.object({ email: z.string().trim().toLowerCase().email().max(254), password: z.string().min(1).max(256), keepLoggedIn: z.boolean().optional() }).parse(req.body);
      if (!email || !password) {
        return res.status(400).json({ message: "Emailul și parola sunt obligatorii" });
      }

      let user = await storage.getUserByEmail(email);
      if (!user || !await verifyPassword(password, user.password)) {
        return res.status(401).json({ message: "Email sau parolă incorectă" });
      }

      if (!user.password?.startsWith("scrypt:")) {
        user = await storage.upgradeLegacyPassword(user.id, user.password!, await hashPassword(password));
        if (!user) return res.status(401).json({ message: "Email sau parolă incorectă" });
      }
      await establishSession(req, user, keepLoggedIn === true);
      let team = null;
      if (user.teamId) {
        team = await storage.getTeam(user.teamId);
      }

      res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          teamId: user.teamId,
        },
        team,
      });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Login Error:", error);
      res.status(500).json({ message: "Eroare la autentificare" });
    }
  });


  // ── Password Reset: Step 1 — send code to email ───────────────────────────
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email, language } = z.object({ email: z.string().trim().toLowerCase().email().max(254), language: z.enum(["ro", "en"]).default("ro") }).parse(req.body);
      if (!email) {
        return res.status(400).json({ message: "Adresa de email este obligatorie" });
      }

      const user = await storage.getUserByEmail(email);
      // Always respond with success to prevent email enumeration
      if (!user) {
        return res.json({ message: "Dacă există un cont cu acest email, vei primi un cod de resetare." });
      }

      // Rate-limit: don't allow a new code if one was sent less than 60 seconds ago
      const existing = await storage.getValidResetCode(email);
      if (existing && existing.createdAt.getTime() > Date.now() - 60 * 1000) {
        return res.json({ message: "Dacă există un cont cu acest email, vei primi un cod de resetare." });
      }

      const code = String(randomInt(100000, 1000000));
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await storage.createResetCode(email, code, expiresAt);

      const delivery = await sendPasswordResetCode(email, code, language);
      if (!delivery.success) await storage.deleteResetCodes(email);

      res.json({ message: "Dacă există un cont cu acest email, vei primi un cod de resetare." });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Forgot Password Error:", error);
      res.status(500).json({ message: "Eroare internă" });
    }
  });

  // ── Password Reset: Step 2 — verify code & set new password ───────────────
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const schema = z.object({
        email: z.string().trim().toLowerCase().email().max(254),
        code: z.string().regex(/^\d{6}$/),
        newPassword: z.string().min(6, "Parola trebuie să aibă cel puțin 6 caractere").max(256),
      });

      const { email, code, newPassword } = schema.parse(req.body);
      if (!await storage.consumeResetCode(email, code)) {
        return res.status(400).json({ message: "Cod invalid, expirat sau prea multe încercări. Solicită un cod nou." });
      }

      // Code is valid — update password
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(400).json({ message: "Contul nu a fost găsit." });
      }

      await storage.updateUser(user.id, { password: await hashPassword(newPassword) });

      res.json({ message: "Parola a fost schimbată cu succes!" });
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Reset Password Error:", error);
      res.status(500).json({ message: "Eroare internă" });
    }
  });

  // Get current user profile & team
  app.get("/api/auth/me", async (req, res, next) => {
    try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: "Neautentificat" });

    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "Utilizatorul nu a fost găsit" });

    const team = user.teamId ? await storage.getTeam(user.teamId) : null;
    const members = user.teamId ? await storage.getTeamMembers(user.teamId) : [];

    res.json({ user: publicUser(user), team, members: members.map(publicUser) });
    } catch (error) { next(error); }
  });
  // Update current user
  app.put("/api/auth/me", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Neautentificat" });
      const { name, email, phoneNumber } = z.object({
        name: z.string().trim().min(2).max(100),
        email: z.string().trim().toLowerCase().email().max(254),
        phoneNumber: z.string().trim().max(30).nullable().optional(),
      }).parse(req.body);
      const existing = await storage.getUserByEmail(email);
      if (existing && existing.id !== userId) return res.status(409).json({ message: "Email deja utilizat" });
      const updatedUser = await storage.updateUser(userId, { name, email, phoneNumber });
      res.json(publicUser(updatedUser));
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Update user error:", error);
      res.status(500).json({ message: "Eroare la actualizarea contului" });
    }
  });

  // Delete current user
  app.delete("/api/auth/me", async (req, res) => {
    try {
      await teamService.leave(req.session.userId!, true);
      req.session.destroy(() => {});
      res.clearCookie("tt.sid", { path: "/" });
      res.json({ success: true });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      if (error instanceof TeamError) return res.status(error.status).json({ message: error.message });
      console.error("Team operation failed:", error);
      res.status(500).json({ message: "Eroare la actualizarea echipei" });
    }
  });

  // Get current user's team theme suggestions
  app.get("/api/auth/me/theme-suggestions", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) return res.status(401).json({ message: "Neautentificat" });
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      
      const suggestions = await storage.getThemeSuggestions();
      // Filter suggestions by teamId
      const teamSuggestions = user.teamId ? suggestions.filter(s => s.teamId === user.teamId) : [];
      res.json(teamSuggestions);
    } catch (error: any) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Fetch theme suggestions error:", error);
      res.status(500).json({ message: "Eroare la obținerea sugestiilor" });
    }
  });

  // Leave team
  app.post("/api/teams/leave", async (req, res) => {
    try {
      const user = await teamService.leave(req.session.userId!);
      res.json(publicUser(user));
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      if (error instanceof TeamError) return res.status(error.status).json({ message: error.message });
      console.error("Team operation failed:", error);
      res.status(500).json({ message: "Eroare la actualizarea echipei" });
    }
  });


  // ==========================================
  // 4. TEAM MANAGEMENT ENDPOINTS
  // ==========================================

  // Create a Team
  app.post("/api/teams", async (req, res) => {
    try {
      const { name, tagline } = z.object({ name: z.string().trim().min(2).max(100), tagline: z.string().trim().max(300).optional() }).parse(req.body);
      res.status(201).json(await teamService.create(req.session.userId!, name, tagline));
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      if (error instanceof TeamError) return res.status(error.status).json({ message: error.message });
      console.error("Team operation failed:", error);
      res.status(500).json({ message: "Eroare la actualizarea echipei" });
    }
  });

  // Join a Team via Invite Code
  app.post("/api/teams/join", async (req, res) => {
    try {
      const { inviteCode } = z.object({ inviteCode: z.string().trim().toUpperCase().min(4).max(12) }).parse(req.body);
      const result = await teamService.join(req.session.userId!, inviteCode);
      res.json({ ...result, user: publicUser(result.user), members: result.members.map(publicUser) });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      if (error instanceof TeamError) return res.status(error.status).json({ message: error.message });
      console.error("Team operation failed:", error);
      res.status(500).json({ message: "Eroare la actualizarea echipei" });
    }
  });

  // Remove team member (kick)
  app.delete("/api/teams/:teamId/members/:userId", async (req, res) => {
    try {
      await teamService.kick(req.session.userId!, req.params.teamId, req.params.userId);
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      if (error instanceof TeamError) return res.status(error.status).json({ message: error.message });
      console.error("Team operation failed:", error);
      res.status(500).json({ message: "Eroare la actualizarea echipei" });
    }
  });

  // Transfer Leadership
  app.patch("/api/teams/:teamId/transfer-leadership", async (req, res) => {
    try {
      const { newLeaderId } = z.object({ newLeaderId: z.string().min(1).max(100) }).parse(req.body);
      await teamService.transfer(req.session.userId!, req.params.teamId, newLeaderId);
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      if (error instanceof TeamError) return res.status(error.status).json({ message: error.message });
      console.error("Team operation failed:", error);
      res.status(500).json({ message: "Eroare la actualizarea echipei" });
    }
  });

  // Get Team Details & Members
  app.get("/api/teams/:id", async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) return res.status(404).json({ message: "Echipa nu a fost găsită" });
      if (res.locals.user.teamId !== team.id) return res.status(403).json({ message: "Acces interzis" });
      const members = await storage.getTeamMembers(team.id);
      res.json({ team, members: members.map(publicUser) });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      res.status(500).json({ message: "Eroare la preluarea echipei" });
    }
  });

  // ==========================================
  // 5. WEEKLY PUZZLE PROGRESS ENDPOINTS
  // ==========================================

  // Get team progress for the current Wednesday–Tuesday puzzle week
  app.get("/api/games/progress/:weekId", async (req, res) => {
    try {
      const { weekId } = req.params;
      const teamId = res.locals.user.teamId as string;
      if (!teamId || (req.query.teamId && req.query.teamId !== teamId)) return res.status(403).json({ message: "Acces interzis" });
      if (weekId !== getPuzzleWeekId()) return res.status(409).json({ message: "Săptămâna jocurilor s-a schimbat. Reîncarcă jocurile." });
      const progressList = await storage.getPuzzleProgress(teamId, weekId);

      const gameTypes = ["WORDLE", "TARGET", "TIMELINE", "CONNECTIONS", "GLOBLE"];
      const gamesState: Record<string, { isSolved: boolean; data: any; solvedAt: any }> = {};

      gameTypes.forEach((type) => {
        const found = progressList.find((p) => p.gameType === type);
        gamesState[type] = {
          isSolved: !!found?.isSolved,
          data: found?.data || null,
          solvedAt: found?.solvedAt || null,
        };
      });

      const solvedCount = Object.values(gamesState).filter((g) => g.isSolved).length;
      const allCompleted = solvedCount === gameTypes.length;
      const { startDate, endDate } = getWeekDateRange(getRealCurrentWeekIndex());
      const hasEvent = getFullSchedule(bucharestParts(startDate).year, startDate).some(edition => {
        const eventDate = getEditionDateTime(edition);
        return eventDate >= startDate && eventDate <= endDate;
      });

      res.json({
        teamId,
        weekId,
        solvedCount,
        totalGames: gameTypes.length,
        allCompleted,
        secretClueUnlocked: hasEvent && allCompleted,
        games: gamesState,
      });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      res.status(500).json({ message: "Eroare la încărcarea progresului jocurilor" });
    }
  });

  // Submit puzzle solve / progress
  app.post("/api/games/progress", async (req, res) => {
    try {
      const { teamId, weekId, gameType, isSolved, data } = z.object({
        teamId: z.string().min(1), weekId: z.string().min(1).max(100),
        gameType: z.enum(["WORDLE", "TARGET", "TIMELINE", "CONNECTIONS", "GLOBLE"]),
        isSolved: z.boolean(), data: z.unknown().optional(),
      }).parse(req.body);
      if (teamId !== res.locals.user.teamId) return res.status(403).json({ message: "Acces interzis" });
      if (weekId !== getPuzzleWeekId()) return res.status(409).json({ message: "Săptămâna jocurilor s-a schimbat. Reîncarcă jocurile." });
      if (gameType === "TARGET" && isSolved) {
        const submitted = z.object({ moves: z.unknown() }).safeParse(data);
        if (!submitted.success || !isTargetSolution(getTargetPuzzle(getRealCurrentWeekIndex()), submitted.data.moves)) {
          return res.status(400).json({ message: "Folosește toate cele trei numere pentru a atinge ținta." });
        }
      }
      const solvedByUserId = req.session.userId;
      if (!teamId || !weekId || !gameType) {
        return res.status(400).json({ message: "teamId, weekId și gameType sunt obligatorii" });
      }

      const result = await storage.savePuzzleProgress({
        teamId,
        editionId: weekId,
        gameType,
        isSolved: !!isSolved,
        solvedByUserId: solvedByUserId || null,
        data: data || null,
        solvedAt: isSolved ? new Date() : undefined,
      });

      res.json(result);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("[POST /api/games/progress] Error:", error);
      res.status(500).json({ message: "Eroare la salvarea progresului jocului" });
    }
  });

  // Reset puzzle progress for testing / new session
  app.post("/api/games/progress/reset", async (req, res) => {
    try {
      const { teamId, weekId } = z.object({ teamId: z.string().min(1).max(100), weekId: z.string().min(1).max(100) }).parse(req.body);
      if (teamId !== res.locals.user.teamId) return res.status(403).json({ message: "Acces interzis" });
      if (!teamId || !weekId) {
        return res.status(400).json({ message: "teamId și weekId sunt obligatorii" });
      }
      if (weekId !== getPuzzleWeekId()) return res.status(409).json({ message: "Săptămâna jocurilor s-a schimbat. Reîncarcă jocurile." });
      await storage.resetPuzzleProgress(teamId, weekId);
      res.json({ message: "Progresul jocurilor a fost resetat la 0/5!" });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      res.status(500).json({ message: "Eroare la resetarea progresului" });
    }
  });

  // ==========================================
  // 6. THEME ELIGIBILITY VALIDATOR TOOL
  // ==========================================

  app.post("/api/theme-validator", async (req, res) => {
    try {
      const { theme } = req.body;
      if (!theme || typeof theme !== "string" || theme.trim().length < 2 || theme.length > 200) {
        return res
          .status(400)
          .json({ message: "Te rugăm să introduci o temă de cel puțin 2 caractere" });
      }

      const cleanTheme = theme.trim();

      // ── Run the quizzability scoring engine ──
      const quizzability = await scoreQuizzability(cleanTheme);

      // ── Map quizzability result to the existing frontend contract ──
      const score = quizzability.quizzability_score;

      let status: "APPROVED" | "BORDERLINE" | "REJECTED";
      if (quizzability.verdict === "acceptat") {
        status = "APPROVED";
      } else if (quizzability.verdict === "de verificat manual") {
        status = "BORDERLINE";
      } else {
        status = "REJECTED";
      }

      const isEligible = score >= 50;

      // Determine difficulty rating from score
      const difficultyRating = score >= 80
        ? "Ușoară (Accesibilă Tuturor)"
        : score >= 60
          ? "Medie (Rezonabilă)"
          : "Grea (Nișată)";

      // Determine category from verifiability flag
      let category = "Cultură Generală";
      if (quizzability.signals.verifiability_flag === "volatile") {
        category = "Actualitate (Volatilă)";
      } else if (quizzability.signals.verifiability_flag === "subjective") {
        category = "Opinie / Subiectiv";
      }

      // Generate sample questions
      const sampleQuestions = [
        `1. Care este cel mai reprezentativ moment istoric / figură asociată cu "${cleanTheme}"?`,
        `2. În ce an sau decadă a atins "${cleanTheme}" apogeul popularității globale?`,
        `3. Care este recordul mondial sau curiozitatea cea mai bizară din sfera "${cleanTheme}"?`,
      ];

      res.json({
        // ── Legacy fields (backward compat with ThemeValidator.tsx) ──
        themeName: cleanTheme,
        popularityScore: score,
        isEligible,
        status,
        category,
        feedback: quizzability.notes,
        difficultyRating,
        suggestedQuestions: sampleQuestions,

        // ── New quizzability breakdown ──
        quizzability: {
          quizzability_score: quizzability.quizzability_score,
          verdict: quizzability.verdict,
          signals: quizzability.signals,
          notes: quizzability.notes,
          suggested_reframe: quizzability.suggested_reframe,
        },
      });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Theme validator error:", error);
      res.status(500).json({ message: "Eroare la validarea temei" });
    }
  });

  // ============================================================
  // ADMIN PANEL ROUTES  (all protected by checkAuth middleware)
  // ============================================================

  // Verify admin password
  // Submit a suggestion for the authenticated team; approval remains an admin decision.
  app.post("/api/theme-suggestions", requireUser, rateLimit(10), async (req, res) => {
    try {
      const input = z.object({ themeName: z.string().trim().min(2).max(200), description: z.string().max(2000).nullable().optional(), editionId: z.string().max(100).nullable().optional() }).parse(req.body);
      if (!res.locals.user.teamId) return res.status(403).json({ message: "Alătură-te unei echipe pentru a propune o temă" });
      const evaluation = await scoreQuizzability(input.themeName);
      const data = { ...input, teamId: res.locals.user.teamId, proposedBy: res.locals.user.name, status: "PENDING", popularityScore: evaluation.quizzability_score };
      const suggestion = await storage.createThemeSuggestion(data);
      res.json(suggestion);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Error creating theme suggestion:", error);
      res.status(400).json({ message: "Date invalide" });
    }
  });

  // Verify admin password
  app.post("/api/admin/verify", checkAuth, (_req, res) => {
    res.json({ ok: true });
  });

  // Get all theme suggestions (Admin endpoint)
  app.get("/api/admin/theme-suggestions", checkAuth, async (_req, res) => {
    try {
      const suggestions = await storage.getThemeSuggestions();
      res.json(suggestions);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Error fetching suggestions:", error);
      res.status(500).json({ message: "Eroare la încărcarea sugestiilor" });
    }
  });

  // Update theme suggestion status (Admin endpoint)
  app.patch("/api/admin/theme-suggestions/:id/status", checkAuth, async (req, res) => {
    try {
      const { status } = req.body;
      if (status !== "APPROVED" && status !== "REJECTED") {
        return res.status(400).json({ message: "Status invalid" });
      }
      const updated = await storage.updateThemeSuggestionStatus(req.params.id, status);
      if (!updated) return res.status(404).json({ message: "Sugestia nu a fost găsită" });
      res.json(updated);
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Error updating suggestion:", error);
      res.status(500).json({ message: "Eroare la actualizarea sugestiei" });
    }
  });

  app.delete("/api/theme-suggestions/:id", async (req, res) => {
    try {
      if (req.headers["x-admin-password"]) {
        let allowed = false;
        await checkAuth(req, res, (error?: unknown) => { if (error) throw error; allowed = true; });
        if (!allowed) return;
      } else {
        await requireUser(req, res, (error?: unknown) => { if (error) throw error; });
        if (res.headersSent) return;
        const suggestion = (await storage.getThemeSuggestions()).find(item => item.id === req.params.id);
        if (!suggestion || !res.locals.user.teamId || suggestion.teamId !== res.locals.user.teamId) return res.status(403).json({ message: "Acces interzis" });
      }
      const deleted = await storage.deleteThemeSuggestion(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Sugestia nu a fost găsită" });
      res.json({ success: true });
    } catch (error) {
      if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
      console.error("Error deleting suggestion:", error);
      res.status(500).json({ message: "Eroare la ștergerea sugestiei" });
    }
  });

  // List all editions with live registration counts + capacity overrides
  app.get("/api/admin/editions", checkAuth, async (_req, res) => {
    try {
      const schedule = getFullSchedule();
      const [registrations, capacities, clues] = await Promise.all([
        storage.getRegistrations(), storage.getEditionCapacityOverrides(), storage.getEditionClues(),
      ]);
      const registrationsByEdition = new Map<string, typeof registrations>();
      for (const registration of registrations) {
        const group = registrationsByEdition.get(registration.editionId) ?? [];
        group.push(registration);
        registrationsByEdition.set(registration.editionId, group);
      }
      const result = schedule.map(ed => {
        const regs = registrationsByEdition.get(ed.id) ?? [];
        const registeredCount = regs.filter(r => r.status === "CONFIRMED").length;
        const eventDate = getEditionDateTime(ed);
        return {
          ...ed,
          eventDate,
          secretClueEn: clues.get(`${ed.id}:en`) ?? "",
          formattedDate: eventDate.toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", dateStyle: "long", timeStyle: "short" }),
          maxTeams: expandedCapacity(registeredCount, capacities.get(ed.id) ?? ed.maxTeams),
          registeredCount,
          waitlistCount: regs.filter(r => r.status === "WAITLISTED").length,
          secretClue: clues.get(ed.id) ?? ed.secretClue,
          registrations: regs,
        };
      });
      res.json(result);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
      res.status(500).json({ message: "Eroare la încărcarea edițiilor" });
    }
  });

  // Override capacity for an edition
  app.patch("/api/admin/editions/:editionId/capacity", checkAuth, async (req, res) => {
    try {
      const { editionId } = req.params;
      const maxTeams = z.number().int().min(1).max(1000).parse(req.body.maxTeams);
      if (!getFullSchedule().some(item => item.id === editionId)) return res.status(400).json({ message: "Ediție invalidă" });
      if (isNaN(maxTeams) || maxTeams < 1) return res.status(400).json({ message: "Valoare invalidă" });
      await storage.withEditionMutation(editionId, async source => {
        const confirmed = (await source.getRegistrations(editionId)).filter(r => r.status === "CONFIRMED").length;
        if (maxTeams < Math.max(10, confirmed)) throw new Error("CAPACITY_TOO_LOW");
        await source.setEditionCapacityOverride(editionId, expandedCapacity(confirmed, maxTeams));
      });
      res.json({ ok: true, editionId, maxTeams });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
      res.status(400).json({ message: "Capacitatea nu poate fi sub 10 sau sub numărul echipelor acceptate." });
    }
  });

  app.patch("/api/admin/editions/:editionId/clue", checkAuth, async (req, res) => {
    try {
      const clue = z.string().trim().min(1).max(2000).parse(req.body.clue);
      if (!getFullSchedule().some(ed => ed.id === req.params.editionId)) return res.status(400).json({ message: "Ediție invalidă" });
      const clueEn = z.string().trim().max(2000).optional().parse(req.body.clueEn);
      await storage.setEditionClue(req.params.editionId, clue);
      if (clueEn !== undefined) await storage.setEditionClue(`${req.params.editionId}:en`, clueEn);
      res.json({ clue });
    } catch { res.status(400).json({ message: "Introdu un indiciu de 1–2000 de caractere." }); }
  });

  // The clue is requested by the game UI only once all five puzzles are complete.
  // Like the existing client-authored puzzle answers, this is not an anti-cheat boundary.
  app.get("/api/editions/:editionId/clue", async (req, res) => {
    try {
      const ed = getFullSchedule().find(ed => ed.id === req.params.editionId);
      if (!ed) return res.status(404).json({ message: "Ediție invalidă" });
      res.set("Cache-Control", "no-store");
      const translated = req.query.language === "en" ? await storage.getEditionClue(`${ed.id}:en`) : undefined;
      res.json({ clue: translated || await storage.getEditionClue(ed.id) || ed.secretClue });
    } catch { res.status(500).json({ message: "Indiciul nu a putut fi încărcat." }); }
  });

  app.get("/api/teams/me/registrations", async (_req, res) => {
    try {
      const teamId = res.locals.user.teamId;
      const registrations = (await storage.getRegistrations()).filter(r => r.teamId && r.teamId === teamId);
      res.json(registrations.map(({ id, editionId, status, eventDate, registeredAt }) => ({ id, editionId, status, eventDate, registeredAt })));
    } catch { res.status(500).json({ message: "Înscrierile nu au putut fi încărcate." }); }
  });

  app.post("/api/admin/registrations/:id/approve", checkAuth, async (req, res) => {
    try {
      const registration = await storage.approveRegistration(req.params.id);
      if (!registration) return res.status(404).json({ message: "Înscriere inexistentă" });
      let emailStatus = "pending";
      try {
        await notifications.queue(registration, "confirmation");
        await storage.markConfirmationQueued(registration.id);
        if (reminderIsDue(registration)) await notifications.queue(registration, "reminder");
        const result = await notifications.deliver(registration.id);
        if (await notifications.reminderComplete(registration.id)) await storage.markReminderSent(registration.id);
        emailStatus = result.failed === 0 ? "queued-or-sent" : "pending";
      } catch { /* Durable confirmation flag allows the scheduler to retry after an interrupted approval. */ }
      res.json({ ...registration, emailStatus });
    } catch (error) {
      if (error instanceof Error && error.message === "EVENT_CLOSED") return res.status(409).json({ message: "Evenimentul a început deja." });
      res.status(500).json({ message: "Echipa nu a putut fi acceptată." });
    }
  });

  app.get("/api/admin/emails", checkAuth, async (req, res) => {
    try {
      const language = req.query.language === "en" ? "en" as const : "ro" as const;
      const details = { language, email: "ana@example.com", name: "Ana", teamName: "Echipa Exemplu", memberCount: 4, eventDate: getCurrentOrNextEdition().eventDate, isCaptain: true };
      const templates = (["confirmation", "waitlist", "reminder"] as const).flatMap(kind => [true, false].map(isCaptain => ({
        kind, audience: isCaptain ? "Căpitan / contact fără cont" : "Membru cu cont",
        payload: buildEventEmail(kind, { ...details, isCaptain, name: isCaptain ? "Ana" : "Mihai", email: isCaptain ? "ana@example.com" : "mihai@example.com" }),
      })));
      res.set("Cache-Control", "no-store");
      res.json({ from: FROM_EMAIL, provider: "Resend", configured: !!process.env.RESEND_API_KEY,
        templates: [...templates, { kind: "password-reset", audience: "Titularul contului (cod demonstrativ)", payload: buildPasswordResetEmail("ana@example.com", "123456", language) }],
        deliveries: await notifications.listDeliveries(),
      });
    } catch { res.status(500).json({ message: "Emailurile nu au putut fi încărcate." }); }
  });

  // Update a registration
  app.patch("/api/admin/registrations/:id", checkAuth, async (req, res) => {
    try {
      const updated = await storage.updateRegistration(req.params.id, insertRegistrationSchema.pick({ teamName: true, captainName: true, memberCount: true, email: true, phoneNumber: true }).partial().parse(req.body));
      if (!updated) return res.status(404).json({ message: "Înregistrare negăsită" });
      res.json(updated);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
      res.status(500).json({ message: "Eroare la actualizare" });
    }
  });

  // Delete a registration (remove a team from an edition)
  app.delete("/api/admin/registrations/:id", checkAuth, async (req, res) => {
    try {
      const ok = await storage.deleteRegistration(req.params.id);
      res.json({ ok });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
      res.status(500).json({ message: "Eroare la ștergere" });
    }
  });

  // List all teams with members
  app.get("/api/admin/teams", checkAuth, async (_req, res) => {
    try {
      const allTeams = await storage.getAllTeams();
      const withMembers = await Promise.all(
        allTeams.map(async (t) => ({ ...t, members: (await storage.getTeamMembers(t.id)).map(publicUser) }))
      );
      res.json(withMembers);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
      res.status(500).json({ message: "Eroare la încărcarea echipelor" });
    }
  });

  // Update a team
  app.patch("/api/admin/teams/:id", checkAuth, async (req, res) => {
    try {
      const updated = await storage.updateTeam(req.params.id, z.object({ name: z.string().trim().min(2).max(100).optional(), tagline: z.string().max(300).nullable().optional(), score: z.number().int().min(0).optional() }).parse(req.body));
      if (!updated) return res.status(404).json({ message: "Echipă negăsită" });
      res.json(updated);
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
      res.status(500).json({ message: "Eroare la actualizare" });
    }
  });

  // Delete a team entirely
  app.delete("/api/admin/teams/:id", checkAuth, async (req, res) => {
    try {
      const ok = await teamService.delete(req.params.id);
      res.json({ ok });
    } catch (err) {
      if (err instanceof ZodError) return res.status(400).json({ message: fromZodError(err).message });
      res.status(500).json({ message: "Eroare la ștergere" });
    }
  });

  app.get("/api/cron/notifications", async (req, res, next) => {
    const secret = process.env.CRON_SECRET;
    if (!secret || !safeEqual(req.get("authorization") || "", `Bearer ${secret}`)) return res.status(401).json({ message: "Unauthorized" });
    try { res.json(await runNotifications()); } catch (error) { next(error); }
  });
  return httpServer;
}
