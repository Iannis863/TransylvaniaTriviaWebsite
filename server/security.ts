import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import type { Express, Request, RequestHandler } from "express";
import { pool, databaseSessionSecret } from "./db.js";
import { storage } from "./storage.js";
import type { User } from "../shared/schema.js";

const scrypt = promisify(scryptCallback);
declare module "express-session" {
  interface SessionData { userId: string; passwordFingerprint: string; }
}

export function safeEqual(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  // Existing accounts are upgraded after their next successful login.
  if (!stored.startsWith("scrypt:")) return safeEqual(password, stored);
  const [, salt, expected] = stored.split(":");
  if (!salt || !expected || !/^[a-f0-9]{128}$/.test(expected)) return false;
  const actual = await scrypt(password, salt, 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(expected, "hex"));
}
const fingerprint = (user: User) => createHash("sha256").update(user.password || "").digest("hex");
export function publicUser(user: User | undefined) {
  if (!user) return undefined;
  const { password: _password, welcomeQueued: _welcomeQueued, ...safe } = user;
  return safe;
}
export async function establishSession(req: Request, user: User, remember: boolean) {
  await new Promise<void>((resolve, reject) => req.session.regenerate(err => err ? reject(err) : resolve()));
  req.session.userId = user.id;
  req.session.passwordFingerprint = fingerprint(user);
  if (remember) req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
  await new Promise<void>((resolve, reject) => req.session.save(err => err ? reject(err) : resolve()));
}
export const requireUser: RequestHandler = async (req, res, next) => {
  try {
    const user = req.session?.userId ? await storage.getUser(req.session.userId) : undefined;
    if (!user || req.session.passwordFingerprint !== fingerprint(user)) {
      return void res.status(401).json({ message: "Neautentificat" });
    }
    res.locals.user = user;
    next();
  } catch (error) { next(error); }
};

// Bounded, per-process abuse protection. Use an edge rate limit as well on multi-instance hosts.
export function rateLimit(limit: number, windowMs = 15 * 60 * 1000): RequestHandler {
  const buckets = new Map<string, { count: number; until: number }>();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || "unknown";
    for (const [ip, bucket] of Array.from(buckets)) if (bucket.until <= now) buckets.delete(ip);
    const bucket = buckets.get(key) || { count: 0, until: now + windowMs };
    if (!buckets.has(key) && buckets.size >= 10000) {
      return void res.status(429).json({ message: "Prea multe cereri. Încearcă mai târziu." });
    }
    buckets.set(key, bucket);
    if (++bucket.count > limit) {
      res.setHeader("Retry-After", Math.ceil((bucket.until - now) / 1000));
      return void res.status(429).json({ message: "Prea multe cereri. Încearcă mai târziu." });
    }
    next();
  };
}

export function setupSecurity(app: Express) {
  const production = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  const configuredSecret = process.env.SESSION_SECRET;
  const secret = configuredSecret && configuredSecret.length >= 32 ? configuredSecret : databaseSessionSecret;
  if (production && !secret) throw new Error("Persistent session configuration is not initialized");
  if (production && !pool) throw new Error("DATABASE_URL is required in production");
  app.disable("x-powered-by");
  if (process.env.VERCEL) app.set("trust proxy", 1);
  else if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
  const PgStore = connectPgSimple(session);
  app.use(session({
    name: "tt.sid", secret: secret || randomBytes(32).toString("hex"),
    resave: false, saveUninitialized: false,
    store: pool ? new PgStore({ pool, tableName: "app_sessions", createTableIfMissing: false }) : undefined,
    cookie: { httpOnly: true, sameSite: "lax", secure: production },
  }));
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "same-origin");
    if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      const origin = req.get("origin");
      const expected = process.env.APP_ORIGIN || `${req.protocol}://${req.get("host")}`;
      if ((origin && origin !== expected) || req.get("sec-fetch-site") === "cross-site") {
        return void res.status(403).json({ message: "Origine neautorizată" });
      }
    }
    next();
  });
}
