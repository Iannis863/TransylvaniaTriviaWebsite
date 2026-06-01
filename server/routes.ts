import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { insertTeamRegistrationSchema } from "../shared/schema.js"; 
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { sendRegistrationConfirmation } from "./email.js";

// Helper function to check the password header securely
function checkAuth(req: any, res: any, next: () => void) {
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
  
  // Public Endpoint: Anyone can register a team
  app.post("/api/registrations", async (req, res) => {
    try {
      const data = insertTeamRegistrationSchema.parse(req.body);
      const registration = await storage.createTeamRegistration(data);
      
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
        res.status(500).json({ message: "Failed to register team" });
      }
    }
  });

  // Protected Endpoint: Fetching teams requires the password
  app.get("/api/registrations", checkAuth, async (req, res) => {
    try {
      const registrations = await storage.getTeamRegistrations();
      res.json(registrations);
    } catch (error) {
      console.error("Get registrations error:", error);
      res.status(500).json({ message: "Failed to get registrations" });
    }
  });

  // Protected Endpoint: Deleting teams requires the password
  app.delete("/api/registrations/:id", checkAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTeamRegistration(id);
      if (deleted) {
        res.status(200).json({ message: "Team deleted successfully" });
      } else {
        res.status(404).json({ message: "Team not found" });
      }
    } catch (error) {
      console.error("Delete registration error:", error);
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  return httpServer;
}
