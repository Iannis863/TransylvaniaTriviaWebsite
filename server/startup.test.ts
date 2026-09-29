import test from "node:test";
import assert from "node:assert/strict";
import { retryableInitialization, startupFailure } from "./startup.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

test("concurrent cold-start requests share failure and recover on the next request", async () => {
  let attempts = 0;
  let rejectFirst!: (error: Error) => void;
  const app = { ready: true };
  const initialize = retryableInitialization(async () => {
    attempts += 1;
    if (attempts === 1) {
      await new Promise<void>((_resolve, reject) => { rejectFirst = reject; });
    }
    return app;
  });
  const first = initialize();
  const concurrent = initialize();
  const rejected = assert.rejects(first, /temporarily unavailable/);
  assert.equal(first, concurrent);
  await Promise.resolve();
  rejectFirst(new Error("temporarily unavailable"));
  await rejected;

  assert.equal(await initialize(), app);
  assert.equal(await initialize(), app);
  assert.equal(attempts, 2);
});

test("synchronous initialization exceptions also leave startup retryable", async () => {
  let attempts = 0;
  const initialize = retryableInitialization(() => {
    if (++attempts === 1) throw new Error("invalid configuration");
    return Promise.resolve("ready");
  });
  await assert.rejects(initialize(), /invalid configuration/);
  assert.equal(await initialize(), "ready");
});

test("startup failures expose only approved codes and never connection credentials", () => {
  const privateDetail = "postgresql://owner:private-password@example.invalid/database";
  for (const [code, expected] of [
    ["DATABASE_URL_MISSING", "DATABASE_URL_MISSING"],
    ["DATABASE_URL_INVALID", "DATABASE_URL_INVALID"],
    ["DATABASE_UNAVAILABLE", "DATABASE_UNAVAILABLE"],
    ["ECONNREFUSED", "BACKEND_STARTUP_FAILED"],
  ]) {
    const failure = startupFailure(Object.assign(new Error(privateDetail), { code, detail: privateDetail }));
    assert.equal(failure.code, expected);
    assert.equal(JSON.stringify(failure).includes(privateDetail), false);
  }
  assert.equal(startupFailure(privateDetail).code, "BACKEND_STARTUP_FAILED");
  assert.equal(startupFailure(null).code, "BACKEND_STARTUP_FAILED");
});

test("the production entry point responds with JSON instead of crashing when database config is missing or malformed", async () => {
  const run = promisify(execFile);
  for (const [value, expected] of [["", "DATABASE_URL_MISSING"], ["invalid-private-setting", "DATABASE_URL_INVALID"]]) {
    const env = { ...process.env, NODE_ENV: "production", VERCEL: "1", DATABASE_URL: value };
    for (const key of ["POSTGRES_URL", "POSTGRES_PRISMA_URL", "NEON_DATABASE_URL", "SESSION_SECRET"]) delete (env as NodeJS.ProcessEnv)[key];
    const { stdout, stderr } = await run(process.execPath, ["--import", "tsx", "--input-type=module", "-e", `
      const {default: handler} = await import('./api/index.js');
      const headers = {};
      const response = {setHeader(name, value) {headers[name] = value;}, end(body) {console.log(JSON.stringify({status:this.statusCode, headers, body:JSON.parse(body)}));}};
      await handler({url:'/api/health', method:'GET'}, response);
    `], { env });
    const response = JSON.parse(stdout.trim());
    assert.equal(response.status, 503);
    assert.equal(response.body.code, expected);
    assert.match(response.headers["Content-Type"], /application\/json/);
    assert.equal(response.headers["Cache-Control"], "no-store");
    assert.equal((stdout + stderr).includes("invalid-private-setting"), false);
  }
});
