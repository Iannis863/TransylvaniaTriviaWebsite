import express, { type Express, type RequestHandler } from "express";
import { z } from "zod";
import { storage } from "./storage.js";
import { LeaderboardError, parseLeaderboard, planLeaderboardImport, publicLeaderboard, validateLinks } from "./leaderboard.js";

export function registerLeaderboardRoutes(app: Express, checkAuth: RequestHandler) {
  app.get("/api/leaderboard", async (_req, res) => {
    try {
      const [identities, seasons, teams] = await Promise.all([storage.getLeaderboardIdentities(), storage.getLeaderboardSeasons(), storage.getAllTeams()]);
      res.set("Cache-Control", "no-store");
      res.json(publicLeaderboard(identities, seasons, teams));
    } catch { res.status(500).json({ message: "Clasamentul nu a putut fi încărcat." }); }
  });
  app.get("/api/admin/leaderboard", checkAuth, async (_req, res) => {
    try {
      const [identities, seasons, teams] = await Promise.all([storage.getLeaderboardIdentities(), storage.getLeaderboardSeasons(), storage.getAllTeams()]);
      res.set("Cache-Control", "no-store");
      res.json({ identities, seasons: seasons.map(({ id, startYear, number, updatedAt, data }) => ({ id, startYear, number, updatedAt, editions: data.editions.map(item => item.number) })), teams: teams.map(({ id, name }) => ({ id, name })) });
    } catch { res.status(500).json({ message: "Clasamentul nu a putut fi încărcat." }); }
  });
  app.post("/api/admin/leaderboard/import", checkAuth, (req, res, next) => {
    express.raw({ type: "application/octet-stream", limit: "2mb" })(req, res, error => {
      if (error) return void res.status(400).json({ message: "Fișierul Excel trebuie să aibă maximum 2 MB." });
      next();
    });
  }, async (req, res) => {
    try {
      const startYear = z.coerce.number().int().min(2026).max(2100).parse(req.query.year);
      const number = z.coerce.number().int().min(1).max(2).parse(req.query.season);
      if (!Buffer.isBuffer(req.body)) return void res.status(400).json({ message: "Fișier Excel invalid. Încarcă un fișier .xlsx neprotejat." });
      const parsed = await parseLeaderboard(req.body);
      const plan = req.query.preview === "1"
        ? await planLeaderboardImport(storage, parsed, startYear, number)
        : await storage.withTeamMutation(async source => {
          const plan = await planLeaderboardImport(source, parsed, startYear, number);
          for (const identity of plan.changed) await source.saveLeaderboardIdentity(identity);
          await source.saveLeaderboardSeason(plan.season);
          return plan;
        });
      res.json({ teams: plan.teams, editions: plan.editions, totalWarnings: plan.totalWarnings, autoLinked: plan.autoLinked, rows: plan.rows });
    } catch (error) {
      if (error instanceof LeaderboardError) return void res.status(400).json({ message: error.message });
      if (error instanceof z.ZodError) return void res.status(400).json({ message: "Selectează un sezon valid." });
      res.status(500).json({ message: "Clasamentul nu a putut fi salvat." });
    }
  });
  app.patch("/api/admin/leaderboard/teams/:id", checkAuth, async (req, res) => {
    try {
      const teamId = z.string().min(1).max(100).nullable().parse(req.body.teamId);
      const identity = await storage.withTeamMutation(async source => {
        const [identities, seasons] = await Promise.all([source.getLeaderboardIdentities(), source.getLeaderboardSeasons()]);
        const identity = identities.find(item => item.id === req.params.id);
        if (!identity) throw new LeaderboardError("Echipa din clasament nu a fost găsită.");
        if (teamId && !await source.getTeam(teamId)) throw new LeaderboardError("Echipa înregistrată nu a fost găsită.");
        identity.teamId = teamId;
        validateLinks(identities, seasons);
        await source.saveLeaderboardIdentity(identity);
        return identity;
      });
      res.json(identity);
    } catch (error) {
      if (error instanceof LeaderboardError) return void res.status(400).json({ message: error.message });
      if (error instanceof z.ZodError) return void res.status(400).json({ message: "Selectează o echipă validă." });
      res.status(500).json({ message: "Asocierea nu a putut fi salvată." });
    }
  });
}
