import { readdirSync } from "node:fs";
import { spawn } from "node:child_process";

// Tests must never inherit production database or email credentials.
const env = { ...process.env, NODE_ENV: "test" };
for (const key of ["DATABASE_URL", "RESEND_API_KEY", "ADMIN_PASSWORD", "CRON_SECRET", "VERCEL", "SEED_DEMO_DATA", "APP_ORIGIN", "TRUST_PROXY"]) delete env[key];
const files = readdirSync("server").filter(name => name.endsWith(".test.ts")).map(name => `server/${name}`);
const child = spawn(process.execPath, ["--import", "tsx", "--test", ...files], { env, stdio: "inherit" });
child.on("error", error => { console.error(error); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
