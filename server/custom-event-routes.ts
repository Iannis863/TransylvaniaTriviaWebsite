import type { Express, RequestHandler, Response } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { customEventInputSchema, customEventRegistrationKey } from "../shared/custom-events.js";
import { insertRegistrationSchema } from "../shared/schema.js";
import { storage } from "./storage.js";
import { customEventAdminView, customEventView, CustomEventError, saveCustomEvent, removeCustomEvent } from "./custom-events.js";
import { notifications } from "./notifications.js";
import { rateLimit, requireUser } from "./security.js";
import { reminderIsDue } from "./scheduler.js";
import { CustomEventLogoError } from "./custom-event-logo.js";

function eventError(error: unknown, res: Response) {
  if (error instanceof CustomEventLogoError) return res.status(400).json({ message: error.message });
  if (error instanceof CustomEventError) return res.status(error.status).json({ message: error.message });
  if (error instanceof ZodError) return res.status(400).json({ message: fromZodError(error).message });
  const code = error instanceof Error ? error.message : "";
  if (code === "DUPLICATE_REGISTRATION") return res.status(409).json({ message: "Echipa este deja înscrisă la acest eveniment." });
  if (code === "EVENT_CLOSED") return res.status(409).json({ message: "Înscrierile pentru acest eveniment sunt închise." });
  if (code === "EVENT_SLUG_EXISTS" || (error && typeof error === "object" && "code" in error && error.code === "23505")) return res.status(409).json({ message: "Această adresă este deja folosită de un alt eveniment." });
  console.error("Custom event operation failed", error);
  return res.status(500).json({ message: "Evenimentul nu a putut fi actualizat." });
}

export function registerCustomEventRoutes(app: Express, checkAuth: RequestHandler) {
  app.get("/api/custom-events/:slug/collaborator-logo", async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const event = await storage.getCustomEventBySlug(req.params.slug);
      if (!event?.isPublished || !event.isCollaboration || !event.collaboratorLogoData) return res.status(404).json({ message: "Logo-ul nu a fost găsit." });
      res.set("Content-Type", "image/png");
      res.set("X-Content-Type-Options", "nosniff");
      res.set("Content-Disposition", 'inline; filename="collaborator-logo.png"');
      res.send(Buffer.from(event.collaboratorLogoData.slice("data:image/png;base64,".length), "base64"));
    } catch (error) { eventError(error, res); }
  });
  app.get("/api/admin/custom-events/:id/collaborator-logo", checkAuth, async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const event = await storage.getCustomEvent(req.params.id);
      if (!event) return res.status(404).json({ message: "Evenimentul nu a fost găsit." });
      res.json({ dataUrl: event.collaboratorLogoData ?? null });
    } catch (error) { eventError(error, res); }
  });
  app.get("/api/custom-events/:slug", async (req, res) => {
    try {
      const event = await storage.getCustomEventBySlug(req.params.slug);
      if (!event?.isPublished) return res.status(404).json({ message: "Evenimentul nu a fost găsit." });
      const registrations = await storage.getRegistrations(customEventRegistrationKey(event.id));
      const confirmed = registrations.filter(item => item.status === "CONFIRMED")
        .sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime() || a.id.localeCompare(b.id));
      const waiting = registrations.filter(item => item.status === "WAITLISTED").length;
      res.set("Cache-Control", "no-store");
      res.json({ event: customEventView(event), confirmedCount: confirmed.length, waitlistCount: waiting,
        isFull: confirmed.length >= event.maxTeams || waiting > 0,
        registrationClosed: !event.registrationOpen || event.eventDate <= new Date(),
        teams: confirmed.map(({ id, teamName, captainName, memberCount, teamId, registeredAt }) => ({ id, teamName, captainName, memberCount, teamId, registeredAt: registeredAt.toISOString() })) });
    } catch (error) { eventError(error, res); }
  });
  app.post("/api/custom-events/:slug/registrations", rateLimit(15), async (req, res) => {
    try {
      const event = await storage.getCustomEventBySlug(req.params.slug);
      if (!event?.isPublished) return res.status(404).json({ message: "Evenimentul nu a fost găsit." });
      const data = insertRegistrationSchema.parse({ ...req.body, editionId: customEventRegistrationKey(event.id) });
      let registration;
      if (data.teamId) {
        await requireUser(req, res, (error?: unknown) => { if (error) throw error; });
        if (res.headersSent) return;
        // Leadership transfers and deletion use this same lock. Validate the captain
        // and save the booking inside it, then acquire the independent event lock.
        registration = await storage.withTeamMutation(async source => {
          const team = await source.getTeam(data.teamId!);
          const captain = req.session.userId ? await source.getUser(req.session.userId) : undefined;
          if (!team || !captain || team.leaderId !== captain.id) throw new CustomEventError("Doar căpitanul poate înscrie echipa.", 403);
          return source.createRegistrationWithinCapacity({ ...data, teamName: team.name, captainName: captain.name, email: captain.email }, event.maxTeams);
        });
      } else {
        // The event transaction rechecks publication, opening, date, and capacity.
        registration = await storage.createRegistrationWithinCapacity(data, event.maxTeams);
      }
      let emailStatus = "pending";
      try {
        await notifications.queue(registration, registration.status === "WAITLISTED" ? "waitlist" : "confirmation");
        if (registration.status === "WAITLISTED") await storage.markWaitlistQueued(registration.id);
        else await storage.markConfirmationQueued(registration.id);
        if (reminderIsDue(registration)) await notifications.queue(registration, "reminder");
        const result = await notifications.deliver(registration.id);
        if (await notifications.reminderComplete(registration.id)) await storage.markReminderSent(registration.id);
        emailStatus = result.failed === 0 && result.sent > 0 ? "sent" : "pending";
      } catch (error) { console.error("Custom event notification failed", error); }
      res.status(201).json({ ...registration, emailStatus });
    } catch (error) { eventError(error, res); }
  });
  app.get("/api/admin/custom-events", checkAuth, async (_req, res) => {
    try {
      const events = (await storage.getCustomEvents()).sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());
      res.set("Cache-Control", "no-store");
      res.json(await Promise.all(events.map(event => customEventAdminView(storage, event))));
    } catch (error) { eventError(error, res); }
  });
  app.post("/api/admin/custom-events", checkAuth, async (req, res) => {
    try {
      const event = await saveCustomEvent(storage, customEventInputSchema.parse(req.body));
      res.status(201).json(await customEventAdminView(storage, event));
    } catch (error) { eventError(error, res); }
  });
  app.patch("/api/admin/custom-events/:id", checkAuth, async (req, res) => {
    try {
      const event = await saveCustomEvent(storage, customEventInputSchema.parse(req.body), req.params.id);
      try { await notifications.refreshCustomEvent(event.id); }
      catch (error) { console.error("Custom event notifications remain pending for scheduler recovery", error); }
      res.json(await customEventAdminView(storage, event));
    } catch (error) { eventError(error, res); }
  });
  app.delete("/api/admin/custom-events/:id", checkAuth, async (req, res) => {
    try { res.json({ ok: await removeCustomEvent(storage, req.params.id) }); }
    catch (error) { eventError(error, res); }
  });
}
