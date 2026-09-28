import express from "express";
import { registerRoutes } from "../server/routes.js";
import { serveStatic } from "../server/static.js";
import { createServer } from "http";
import { startScheduler } from "../server/scheduler.js";
import { setupSecurity } from "../server/security.js";
import { databaseReady } from "../server/db.js";

// Vercel Hobby supports this duration when Fluid Compute is enabled.
export const config = { maxDuration: 300 };

const app = express();
const httpServer = createServer(app);

// Global Middleware
setupSecurity(app);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));

export function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      log(logLine);
    }
  });
  next();
});

// Setup logic
const ready = (async () => {
  await databaseReady;
  await registerRoutes(httpServer, app);

  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = status >= 500 ? "Internal Server Error" : err.message;
    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    // In local dev, we might still want Vite
    const { setupVite } = await import("../server/vite.js");
    await setupVite(httpServer, app);
  }

  // ONLY listen if NOT on Vercel
  if (!process.env.VERCEL) {
    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      log(`serving on port ${port}`);
      startScheduler();
    });
  }
})();

export default async function handler(req, res) {
  await ready;
  return app(req, res);
}
