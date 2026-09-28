import express, { type Express } from "express";
import path from "node:path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  // Serve static files from the build output
  app.use(express.static(distPath));

  // If a route isn't an API call, serve index.html (SPA routing)
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
}
