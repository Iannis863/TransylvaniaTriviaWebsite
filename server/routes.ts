import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { 
  insertRegistrationSchema, 
  insertUserSchema, 
  insertTeamSchema,
  insertPuzzleProgressSchema,
  insertThemeSuggestionSchema
} from "../shared/schema.js"; 
import { getCurrentOrNextEdition, getFullSchedule } from "../shared/schedule.js";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import { sendRegistrationConfirmation } from "./email.js";

// Helper function to check the password header securely
function checkAuth(req: Request, res: Response, next: () => void) {
  const adminPassword = process.env.ADMIN_PASSWORD || "TriviaAdmin2026!";
  const clientPassword = req.headers["x-admin-password"];

  if (!clientPassword || clientPassword !== adminPassword) {
    return res.status(401).json({ message: "Neautorizat. Parolă incorectă!" });
  }
  next();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // ==========================================
  // 1. SCHEDULE & ACTIVE EDITION ENDPOINTS
  // ==========================================

  // Get current / next active edition and countdown details
  app.get("/api/schedule/current", async (_req, res) => {
    try {
      const activeState = getCurrentOrNextEdition(new Date());
      const registeredTeams = await storage.getRegistrations(activeState.currentEdition.id);
      
      res.json({
        ...activeState,
        registeredCount: registeredTeams.length,
        maxTeams: activeState.currentEdition.maxTeams,
        isFull: registeredTeams.length >= activeState.currentEdition.maxTeams,
      });
    } catch (error) {
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
      res.status(500).json({ message: "Eroare la obținerea calendarului complet" });
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
      const publicList = registeredList.map((r) => ({
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

      const data = insertRegistrationSchema.parse(body);

      // Check if registration limit reached
      const currentList = await storage.getRegistrations(data.editionId);
      if (currentList.length >= active.currentEdition.maxTeams) {
        return res.status(400).json({ 
          message: `Toate cele ${active.currentEdition.maxTeams} locuri pentru această ediție sunt ocupate!` 
        });
      }

      // Check if team name already registered for this edition
      const duplicate = currentList.find(
        (t) => t.teamName.trim().toLowerCase() === data.teamName.trim().toLowerCase()
      );
      if (duplicate) {
        return res.status(400).json({ 
          message: "O echipă cu acest nume este deja înscrisă pentru această ediție!" 
        });
      }

      const registration = await storage.createRegistration(data);
      
      try {
        await sendRegistrationConfirmation(
          data.email,
          data.teamName,
          data.captainName,
          data.memberCount
        );
      } catch (emailErr) {
        console.error("Failed to send confirmation email:", emailErr);
      }
      
      res.status(201).json(registration);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Eroare la înregistrarea echipei" });
      }
    }
  });

  // Protected Endpoint: Fetching all registrations across all editions
  app.get("/api/registrations", checkAuth, async (_req, res) => {
    try {
      const registrations = await storage.getRegistrations();
      res.json(registrations);
    } catch (error) {
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
        name: z.string().min(2, "Numele trebuie să aibă cel puțin 2 caractere"),
        email: z.string().email("Adresă de email invalidă"),
        password: z.string().min(6, "Parola trebuie să aibă cel puțin 6 caractere"),
        role: z.enum(["TEAM_LEADER", "MEMBER", "ADMIN"]).default("MEMBER"),
      });

      const data = schema.parse(req.body);
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ message: "Există deja un cont cu această adresă de email!" });
      }

      const user = await storage.createUser(data);
      res.status(201).json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        teamId: user.teamId,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Eroare la crearea contului" });
    }
  });

  // Login User
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Emailul și parola sunt obligatorii" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Email sau parolă incorectă" });
      }

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
    } catch (error) {
      res.status(500).json({ message: "Eroare la autentificare" });
    }
  });

  // Mock / Fast Google OAuth Login
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { email, name, avatar } = req.body;
      if (!email || !name) {
        return res.status(400).json({ message: "Date OAuth incomplete" });
      }

      let user = await storage.getUserByEmail(email);
      if (!user) {
        user = await storage.createUser({
          name,
          email,
          avatar: avatar || "👤",
          role: "MEMBER",
        });
      }

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
    } catch (error) {
      res.status(500).json({ message: "Eroare la autentificarea Google" });
    }
  });

  // Get current user profile & team
  app.get("/api/auth/me", async (req, res) => {
    const userId = req.headers["x-user-id"] as string;
    if (!userId) {
      // Default to demo leader for ease of testing
      const defaultUser = await storage.getUser("usr_vlad_leader");
      if (defaultUser) {
        const team = defaultUser.teamId ? await storage.getTeam(defaultUser.teamId) : null;
        const members = defaultUser.teamId ? await storage.getTeamMembers(defaultUser.teamId) : [];
        return res.json({ user: defaultUser, team, members });
      }
      return res.status(401).json({ message: "Neautentificat" });
    }

    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "Utilizatorul nu a fost găsit" });

    const team = user.teamId ? await storage.getTeam(user.teamId) : null;
    const members = user.teamId ? await storage.getTeamMembers(user.teamId) : [];

    res.json({ user, team, members });
  });

  // ==========================================
  // 4. TEAM MANAGEMENT ENDPOINTS
  // ==========================================

  // Create a Team
  app.post("/api/teams", async (req, res) => {
    try {
      const { name, leaderId, tagline } = req.body;
      if (!name || !leaderId) {
        return res.status(400).json({ message: "Numele echipei și ID-ul liderului sunt obligatorii" });
      }

      // Generate 6-char unique invite code e.g. TRIV-88
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const codePrefix = name.replace(/[^A-Za-z]/g, "").substring(0, 4).toUpperCase() || "TEAM";
      const inviteCode = `${codePrefix}-${randomSuffix}`;

      const team = await storage.createTeam({
        name,
        leaderId,
        inviteCode,
        tagline,
      });

      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Eroare la crearea echipei" });
    }
  });

  // Join a Team via Invite Code
  app.post("/api/teams/join", async (req, res) => {
    try {
      const { inviteCode, userId } = req.body;
      if (!inviteCode || !userId) {
        return res.status(400).json({ message: "Codul de invitație și ID-ul utilizatorului sunt obligatorii" });
      }

      const team = await storage.getTeamByInviteCode(inviteCode);
      if (!team) {
        return res.status(404).json({ message: "Codul de invitație nu este valid sau echipa nu există!" });
      }

      const members = await storage.getTeamMembers(team.id);
      if (members.length >= 6) {
        return res.status(400).json({ message: "Echipa are deja numărul maxim de 6 membri!" });
      }

      const updatedUser = await storage.updateUserTeam(userId, team.id, "MEMBER");
      res.json({ team, user: updatedUser, members: [...members, updatedUser] });
    } catch (error) {
      res.status(500).json({ message: "Eroare la alăturarea în echipă" });
    }
  });

  // Get Team Details & Members
  app.get("/api/teams/:id", async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) return res.status(404).json({ message: "Echipa nu a fost găsită" });
      const members = await storage.getTeamMembers(team.id);
      res.json({ team, members });
    } catch (error) {
      res.status(500).json({ message: "Eroare la preluarea echipei" });
    }
  });

  // ==========================================
  // 5. WEEKLY PUZZLE PROGRESS ENDPOINTS
  // ==========================================

  // Get team progress for an edition
  app.get("/api/games/progress/:editionId", async (req, res) => {
    try {
      const { editionId } = req.params;
      const teamId = (req.query.teamId as string) || "team_night_scholars";
      const progressList = await storage.getPuzzleProgress(teamId, editionId);

      const gameTypes = ["WORDLE", "SUDOKU", "TIMELINE", "CONNECTIONS", "GLOBLE"];
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

      res.json({
        teamId,
        editionId,
        solvedCount,
        totalGames: gameTypes.length,
        allCompleted,
        secretClueUnlocked: allCompleted,
        games: gamesState,
      });
    } catch (error) {
      res.status(500).json({ message: "Eroare la încărcarea progresului jocurilor" });
    }
  });

  // Submit puzzle solve / progress
  app.post("/api/games/progress", async (req, res) => {
    try {
      const { teamId, editionId, gameType, isSolved, solvedByUserId, data } = req.body;
      if (!teamId || !editionId || !gameType) {
        return res.status(400).json({ message: "teamId, editionId și gameType sunt obligatorii" });
      }

      const result = await storage.savePuzzleProgress({
        teamId,
        editionId,
        gameType,
        isSolved: !!isSolved,
        solvedByUserId: solvedByUserId || null,
        data: data || null,
        solvedAt: isSolved ? new Date() : undefined,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Eroare la salvarea progresului jocului" });
    }
  });

  // Reset puzzle progress for testing / new session
  app.post("/api/games/progress/reset", async (req, res) => {
    try {
      const { teamId, editionId } = req.body;
      if (!teamId || !editionId) {
        return res.status(400).json({ message: "teamId și editionId sunt obligatorii" });
      }
      await storage.resetPuzzleProgress(teamId, editionId);
      res.json({ message: "Progresul jocurilor a fost resetat la 0/6!" });
    } catch (error) {
      res.status(500).json({ message: "Eroare la resetarea progresului" });
    }
  });

  // ==========================================
  // 6. THEME ELIGIBILITY VALIDATOR TOOL
  // ==========================================

  app.post("/api/theme-validator", async (req, res) => {
    try {
      const { theme, proposedBy, teamId, editionId } = req.body;
      if (!theme || typeof theme !== "string" || theme.trim().length < 3) {
        return res.status(400).json({ message: "Te rugăm să introduci o temă de cel puțin 3 caractere" });
      }

      const cleanTheme = theme.trim();
      const lower = cleanTheme.toLowerCase();

      // Feasibility algorithm: analyzes popularity, breadth, suitability for pub trivia
      let score = 50;
      let status: "APPROVED" | "BORDERLINE" | "REJECTED" = "APPROVED";
      let feedback = "";
      let category = "Cultură Generală";
      let sampleQuestions: string[] = [];

      // Keyword suitability checks
      const broadKeywords = [
        "muzica", "film", "cinema", "ani", "istorie", "geografie", "arta", "stiinta", 
        "jocuri", "literatura", "sport", "gastronomie", "univers", "rock", "harry potter", 
        "disney", "mitologie", "marvel", "star wars", "animale", "tehnologie", "seriale",
        "romania", "transilvania", "europa", "clasic", "cultura"
      ];

      const tooNarrowKeywords = [
        "viata mea", "vecinul", "apartamentul 4", "masina mea", "pisica mea", "nimic"
      ];

      const matchedBroad = broadKeywords.filter((kw) => lower.includes(kw));
      const matchedNarrow = tooNarrowKeywords.some((kw) => lower.includes(kw));

      if (matchedNarrow) {
        score = 12;
        status = "REJECTED";
        feedback = "Tema este mult prea personală sau îngustă pentru un concurs public de 10 echipe.";
      } else if (matchedBroad.length > 0) {
        score = Math.min(98, 70 + matchedBroad.length * 10 + Math.floor(Math.random() * 10));
        status = score >= 65 ? "APPROVED" : "BORDERLINE";
        feedback = `Tema "${cleanTheme}" este excelentă! Are suficientă profunzime și interes pentru toate categoriile de jucători.`;
      } else {
        // General calculation based on length and structure
        const wordCount = cleanTheme.split(/\s+/).length;
        score = Math.min(85, Math.max(45, wordCount * 18 + Math.floor(Math.random() * 15)));
        status = score >= 60 ? "APPROVED" : "BORDERLINE";
        feedback = `Tema "${cleanTheme}" are potențial. Asigură-te că pot fi formulate 10 întrebări variate (de la ușor la greu).`;
      }

      // Generate dynamic sample questions for preview
      sampleQuestions = [
        `1. Care este cel mai reprezentativ moment istoric / figură asociată cu "${cleanTheme}"?`,
        `2. În ce an sau decadă a atins "${cleanTheme}" apogeul popularității globale?`,
        `3. Care este recordul mondial sau curiozitatea cea mai bizară din sfera "${cleanTheme}"?`
      ];

      // Save suggestion to storage
      if (status === "APPROVED") {
        await storage.createThemeSuggestion({
          themeName: cleanTheme,
          description: feedback,
          popularityScore: score,
          status: "PENDING",
          proposedBy: proposedBy || "Echipa de pe ultimul loc",
          teamId: teamId || null,
          editionId: editionId || null,
        });
      }

      res.json({
        theme: cleanTheme,
        score,
        status,
        feedback,
        category,
        sampleQuestions,
        isEligible: score >= 60,
      });
    } catch (error) {
      console.error("Theme validator error:", error);
      res.status(500).json({ message: "Eroare la validarea temei" });
    }
  });

  // ============================================================
  // ADMIN PANEL ROUTES  (all protected by checkAuth middleware)
  // ============================================================

  // Verify admin password
  app.post("/api/admin/verify", checkAuth, (_req, res) => {
    res.json({ ok: true });
  });

  // List all editions with live registration counts + capacity overrides
  app.get("/api/admin/editions", checkAuth, async (_req, res) => {
    try {
      const schedule = getFullSchedule();
      const result = await Promise.all(
        schedule.map(async (ed) => {
          const regs = await storage.getRegistrations(ed.id);
          const override = await storage.getEditionCapacityOverride(ed.id);
          return {
            ...ed,
            maxTeams: override ?? ed.maxTeams,
            registeredCount: regs.length,
            registrations: regs,
          };
        })
      );
      res.json(result);
    } catch (err) {
      res.status(500).json({ message: "Eroare la încărcarea edițiilor" });
    }
  });

  // Override capacity for an edition
  app.patch("/api/admin/editions/:editionId/capacity", checkAuth, async (req, res) => {
    try {
      const { editionId } = req.params;
      const maxTeams = parseInt(req.body.maxTeams, 10);
      if (isNaN(maxTeams) || maxTeams < 1) return res.status(400).json({ message: "Valoare invalidă" });
      await storage.setEditionCapacityOverride(editionId, maxTeams);
      res.json({ ok: true, editionId, maxTeams });
    } catch (err) {
      res.status(500).json({ message: "Eroare la actualizarea capacității" });
    }
  });

  // Update a registration
  app.patch("/api/admin/registrations/:id", checkAuth, async (req, res) => {
    try {
      const updated = await storage.updateRegistration(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Înregistrare negăsită" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Eroare la actualizare" });
    }
  });

  // Delete a registration (remove a team from an edition)
  app.delete("/api/admin/registrations/:id", checkAuth, async (req, res) => {
    try {
      const ok = await storage.deleteRegistration(req.params.id);
      res.json({ ok });
    } catch (err) {
      res.status(500).json({ message: "Eroare la ștergere" });
    }
  });

  // List all teams with members
  app.get("/api/admin/teams", checkAuth, async (_req, res) => {
    try {
      const allTeams = await storage.getAllTeams();
      const withMembers = await Promise.all(
        allTeams.map(async (t) => ({ ...t, members: await storage.getTeamMembers(t.id) }))
      );
      res.json(withMembers);
    } catch (err) {
      res.status(500).json({ message: "Eroare la încărcarea echipelor" });
    }
  });

  // Update a team
  app.patch("/api/admin/teams/:id", checkAuth, async (req, res) => {
    try {
      const updated = await storage.updateTeam(req.params.id, req.body);
      if (!updated) return res.status(404).json({ message: "Echipă negăsită" });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ message: "Eroare la actualizare" });
    }
  });

  // Delete a team entirely
  app.delete("/api/admin/teams/:id", checkAuth, async (req, res) => {
    try {
      const ok = await storage.deleteTeam(req.params.id);
      res.json({ ok });
    } catch (err) {
      res.status(500).json({ message: "Eroare la ștergere" });
    }
  });

  return httpServer;
}
