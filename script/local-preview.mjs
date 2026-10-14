// Owner testing uses disposable data and never loads .env or starts the mail scheduler.
for (const key of ['DATABASE_URL', 'POSTGRES_URL', 'NEON_DATABASE_URL', 'POSTGRES_PRISMA_URL', 'RESEND_API_KEY', 'ADMIN_PASSWORD', 'CRON_SECRET', 'VERCEL', 'SEED_DEMO_DATA', 'APP_ORIGIN', 'TRUST_PROXY', 'SESSION_SECRET']) delete process.env[key];
process.env.NODE_ENV = 'development';

const { default: express } = await import('express');
const { createServer } = await import('node:http');
const { readFile } = await import('node:fs/promises');
const { setupSecurity, hashPassword } = await import('../server/security.ts');
const { storage, MemStorage } = await import('../server/storage.ts');
const { parseLeaderboard, planLeaderboardImport } = await import('../server/leaderboard.ts');
const { registerRoutes } = await import('../server/routes.ts');
const { setupVite } = await import('../server/vite.ts');

if (!(storage instanceof MemStorage)) throw new Error('Local preview requires in-memory storage');
await storage.setAdminPasswordHash(await hashPassword('local-trivia-admin'));
const sample = await readFile(new URL('../tests/fixtures/leaderboard-example.xlsx', import.meta.url));
const plan = await planLeaderboardImport(storage, await parseLeaderboard(sample), 2026, 1);
for (const identity of plan.changed) await storage.saveLeaderboardIdentity(identity);
await storage.saveLeaderboardSeason(plan.season);

const app = express();
setupSecurity(app);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: 'memory', preview: true }));
const server = createServer(app);
await registerRoutes(server, app);
app.use((error, _req, res, _next) => res.status(error.status || 500).json({ message: error.status ? error.message : 'Internal Server Error' }));
await setupVite(server, app);
const port = Number(process.env.PORT || 3333);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid local preview port');
server.listen(port, '127.0.0.1', () => {
  console.log(`Local preview: http://localhost:${port}`);
  console.log(`Admin: http://localhost:${port}/admin — password: local-trivia-admin`);
  console.log('Sample leaderboard loaded. Test data resets on restart; live data and emails are untouched.');
});
