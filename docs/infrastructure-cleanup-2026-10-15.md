# Infrastructure cleanup — 15 October 2026

The owner requested a repository-wide audit and cleanup without changing the working website's appearance or behavior. All implementation and verification took place locally before publication. The reference revision is `325d804b5d47eabbda0e2dda86cbc878f6609655`.

## Audit method

Reviewed the tracked repository, application entry points, React import graph (including lazy imports), API routers, persistence contracts, shared models, static/dynamic asset references, build/deployment configuration, package/lockfile imports, tests/fixtures, maintenance generators, and historical documentation. A missing direct source import alone was not treated as sufficient evidence to remove a dependency: type packages, CLI tools, CSS plugins, peer dependencies, generators, and runtime data were checked separately.

Deletion decisions required no current runtime, test, configuration, or useful maintenance consumer. Original artwork was retained in one canonical place and its moves were hash-verified. Database schema/upgrade logic, historical migrations, data licenses, fixed email image URLs, external integrations, and assistant tooling were preserved.

## Files and code removed

| Area | Cleanup and evidence |
| --- | --- |
| Obsolete frontend sections | Removed `Announcement`, `CountdownTimer`, `FormatSection`, `JackpotSection`, `MechanicsSection`, `RegistrationForm`, and `RulesSection`. No reachable route imports them; the current hero, live registration, rulebook, and prize components already implement the live behavior. |
| Component examples | Removed eight unreferenced preview components under `components/examples/`. They were neither routes nor test fixtures. |
| Generated UI scaffolding | Removed 33 unreachable modules and the unused `use-mobile` hook. Removed an inert tooltip provider with no tooltip consumers. The final graph retains all 56 reachable client TS/TSX modules, including lazy pages/games. |
| Dead pieces inside live files | Removed unused imports/locals/props, unused UI exports and branches, the obsolete `apiRequest` helper, unused CSS utilities/variables, and obsolete Tailwind chart/sidebar/accordion configuration. Retained the classes and DOM used by live components. |
| Duplicate/obsolete images | Removed all ten historical `attached_assets/` PNGs, eight unused public logo/summer-break variants, and duplicate copies. Runtime URLs were checked against JSX, CSS, HTML, server email branding, tests, and scripts. |
| Root experiments/editor artifacts | Removed `Ex-CSS.txt`, `extract_events.cjs`, `fast_cross.py`, `generate_cross.py`, `patch_restart.cjs`, `ro_words.txt`, `test_distance.js`, and the tracked `.ThemeValidator.tsx.swp`. These are stale exploratory/patch/editor artifacts without active consumers; the distance script referenced a nonexistent dataset. |
| Old hosting/documentation | Removed `.replit`, its three Vite plugins/conditional code, the unused `@assets` alias, `replit.md`, and the superseded original `design_guidelines.md` brief. Current run/deployment/component documentation is in the new root README. |
| Superseded database artifacts | Removed the unused Prisma schema (no Prisma package/runtime exists) and `patch.sql`, whose constraint upgrades are already performed by the active database initializer. No SQL was executed against any live database. |
| Backend helpers | Removed the unconsumed quizzability calibration module/export, three unused locals, five obsolete storage methods, and unused `SeasonInfo`/`RegistrationStatus` types. The active topic-scoring engine and all API route registrations remain. |

The five removed storage methods are `getUserByUsername`, `createTeamRegistration`, `getTeamRegistrations`, `deleteTeamRegistration`, and `incrementResetCodeAttempts`. Each appeared only as an interface declaration and the two memory/database implementations, with no caller or dynamic dispatch. Atomic reset-code/password replacement methods, active registrations, and seeding behavior are retained.

## Assets and deployment

Moved the original logo and four derived/source PNGs into [`assets/source/`](../assets/source/): `logo-original.png`, `logo-main.png`, `prize_beer.png`, `prize_wine.png`, and `prize_shots.png`. All five moves preserve SHA-256 hashes and bytes. Updated both image generators and the upload regression fixture path.

The 25 initial obsolete asset/experiment removals eliminate **29,376,924 bytes**. Moving the four source PNGs out of `client/public/` removes another **15,656,761 bytes from static deployment output**, while preserving them in the repository for editing/regeneration. The eight retained public files total **1,628,715 bytes**, including country data and attribution. Every retained public file is byte-identical to the reference revision.

The optimized logo/prize WebP URLs, favicon, country GeoJSON, and `/email-logo.png` stay unchanged. The latter must remain available for already-sent email messages. The full-size original logo is no longer duplicated at the repository root/public folder. A clean build removes obsolete copied files from ignored `dist/` output.

| Measurement | Before | After |
| --- | ---: | ---: |
| Repository files (excluding ignored/generated state) | 271 | 194 |
| Repository file contents, approximately | 51.5 MB | 21.9 MB |
| Direct package declarations | 97 | 53 |
| Lockfile package entries, including root | 845 | 740 |
| Built static files | 34 | 22 |
| Built static output bytes | 30,947,426 | 4,833,856 |
| Built CSS bytes | 119,047 | 86,049 |
| Built client JavaScript bytes | 3,128,457 | 3,117,742 |

The static deployment is **84.38% smaller**. This measures deployment contents; it does not imply the same percentage change in page-load time, because many removed originals were never requested by the live pages. File counts include the new README, example environment file, source-art guide, and this report, with five source images moved rather than discarded. Git history is preserved, so the historical `.git` size is not reduced by deleting current files.

## Dependencies, build, and maintenance

Removed 44 unused direct packages: generated UI dependencies, obsolete authentication/CORS/WebSocket/Resend SDK packages, unused icon/theme/animation packages, and Replit-only plugins. The application still sends Resend messages through its existing native HTTP implementation and still uses its existing server-side session implementation. `three` remains because the live globe requires it; `word-list` remains for dictionary regeneration. Type-only PostgreSQL declarations moved to development dependencies. Remaining locked package versions were not upgraded or downgraded.

Simplified the server build to explicitly leave npm packages external. Replaced the development cache-buster's hidden transitive `nanoid` import with Node's built-in `randomUUID`. Corrected the legacy-password maintenance script's obsolete `databaseReady` import to the current `ensureDatabaseReady()` function. It was not run against a database.

TypeScript now checks `script/**/*.ts` and root TypeScript configs in addition to application code, targets ES2022, and rejects unused locals/parameters. The existing npm install-script allowlist is retained and aligned with the exact already-locked esbuild/fsevents versions. `.env.example` documents optional configuration without secrets. Ignore rules now cover editor swap files, logs, and TypeScript build metadata while allowing the example environment file.

## Intentionally retained

- `schema.sql`, `shared/schema.ts`, all tables/columns/compatibility mappings, initializer upgrades, and historical Drizzle migration/snapshot files. Cleanup does not alter production data or its upgrade history.
- All current routes, pages, games, season schedules, admin simulator, theme validation, leaderboards, custom events, booking rules, account/team operations, email templates, notification retry behavior, and external asset/service URLs.
- Game dictionaries, English dictionary license, country boundaries/attribution, and dynamic translation catalogs. Static-key searching cannot safely establish that a data-driven server message/translation is unused.
- Build, preview, browser/backend test runners; the explicit legacy-password migration tool; dictionary and image generators; fixtures used by tests/local preview.
- Dated audit reports as history, with a current-README pointer added to the older deployment review. Developer `.agents/`, `.claude/`, `skills-lock.json`, and UI-generator configuration remain useful tooling, outside the static application output.
- Active dependencies' transitive packages and known large lazy globe bundle. Replacing libraries or upgrading versions is a separate change from removing proven-unused dependencies.

## Verification

All checks passed locally against the cleaned project:

- A clean `npm ci --offline` installation using the committed dependency versions and the aligned install-script allowlist.
- Expanded `npm run check`, including the maintenance TypeScript scripts and root configs.
- **85/85 backend/content/API tests**.
- Production client/server build.
- **50/50 desktop/mobile browser tests**, exercising real local account/team/booking requests, weekly resets, all five games in both languages, navigation for guests/members/teams, leaderboard import/history/linking, custom-event management/prizes/collaboration, and very large PNG processing.
- Built production-server import and sanitized missing-database response, with database/email credentials removed.
- Restored development/Vite preview on localhost:3333: memory-only health, homepage, and sample Hermes page load without application errors.
- All 75 named API route/middleware registrations match the reference commit; schema, migration, database-upgrade, and Vercel configuration files remain byte-unchanged.
- Python generator syntax and source-path checks; source moves and every retained public asset verified byte-identical.
- `git diff --check`.

An independent before/after comparison exported reference commit `325d804` into a temporary directory and built it separately. Two memory-only fixture servers rendered identical fixtures at 1440 × 900 and 390 × 844. The browser clock was fixed, animations disabled, fonts/images loaded, and random fixture invitation codes/emails normalized identically on both sides. **All 20 screenshot pairs were pixel-identical: 50,313,318 pixels compared, zero differences.** Computed element layouts/styles also matched exactly, with no browser application errors.

Compared views: full guest homepage, full signed-team homepage, calendar, authentication dialog, full custom collaboration event, admin login, edition dashboard, custom-event list/editor, and full account page. Temporary screenshots/layout snapshots and the JSON comparison report were retained at `/private/tmp/trivia-cleanup-visual/` during handoff rather than adding generated images to the repository. The comparison fixture servers were stopped afterward.

No production database writes, real outgoing emails, or live cron runs form part of this cleanup's verification. The existing automated integration suites use memory storage; they do not establish PostgreSQL staging behavior, every physical device/browser, or external service uptime. Database schema/upgrade files and external integration behavior were deliberately unchanged.
