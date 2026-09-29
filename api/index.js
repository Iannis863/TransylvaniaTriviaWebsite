import express from "express";
import { registerRoutes } from "../server/routes.js";
import { serveStatic } from "../server/static.js";
import { createServer } from "http";
import { startScheduler } from "../server/scheduler.js";
import { setupSecurity } from "../server/security.js";
import { ensureDatabaseReady, pool } from "../server/db.js";
import { retryableInitialization, startupFailure } from "../server/startup.js";

// Vercel Hobby supports this duration when Fluid Compute is enabled.
export const config = { maxDuration: 300 };

export function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

function sendStartupFailure(res, error) {
  const failure = startupFailure(error);
  console.error(`[API Init] ${failure.code}`);
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Retry-After", "5");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.statusCode = 503;
  return res.end(JSON.stringify(failure));
}

// Initialize lazily on Vercel. A failed attempt must not poison the instance forever.
const initialize = retryableInitialization(async () => {
  await ensureDatabaseReady();
  const app = express();
  const httpServer = createServer(app);
  setupSecurity(app);
  app.use(express.json({ limit: "100kb" }));
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    res.on("finish", () => {
      if (path.startsWith("/api")) log(`${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms`);
    });
    next();
  });

  app.get("/api/health", async (_req, res) => {
    try {
      if (pool) await pool.query("SELECT 1");
      res.json({ status: "ok", database: pool ? "connected" : "memory" });
    } catch {
      sendStartupFailure(res, { code: "DATABASE_UNAVAILABLE" });
    }
  });
  await registerRoutes(httpServer, app);

  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = status >= 500 ? "Internal Server Error" : err.message;
    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
    serveStatic(app);
  } else {
    // In local dev, we might still want Vite
    const { setupVite } = await import("../server/vite.js");
    await setupVite(httpServer, app);
  }

  return { app, httpServer };
});

// Local development and npm start still run a normal, long-lived HTTP server.
if (!process.env.VERCEL) {
  initialize().then(({ httpServer }) => {
    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      log(`serving on port ${port}`);
      startScheduler();
    });
  }).catch(error => {
    console.error(`[API Init] ${startupFailure(error).code}`);
    process.exitCode = 1;
  });
}

export default async function handler(req, res) {
  let app;
  try {
    ({ app } = await initialize());
  } catch (error) {
    return sendStartupFailure(res, error);
  }
  return app(req, res);
}
