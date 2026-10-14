import express, { type Express } from "express";

export function setupRequestBodyParsers(app: Express) {
  // A 1 MB PNG becomes about 1.34 MB in a JSON data URL. Only custom-event
  // save requests get the larger limit; the rest of the API retains 100 KB.
  app.post("/api/admin/custom-events", express.json({ limit: "1536kb" }));
  app.patch("/api/admin/custom-events/:id", express.json({ limit: "1536kb" }));
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false }));
}
