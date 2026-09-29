# Project review and deployment notes

## What the app does

Transylvania Trivia is a Romanian trivia-event website. The React/Vite client provides the event calendar and countdown, guest registration, accounts and invite-based teams, five collaborative weekly puzzles, theme suggestions, and an administrator panel. Express exposes the API from `api/index.js`. Drizzle accesses PostgreSQL; development can use in-memory storage. `shared/schedule.ts` supplies the event schedule, and `client/src/lib/weeklyGames.ts` supplies puzzle content. Email uses Resend.

The active production schema is initialized from `schema.sql`, with models in `shared/schema.ts`. The older Prisma schema and historical migrations are not the API's runtime model.

## Email behavior

- Guest registrations notify only the submitted captain/contact.
- Linked teams notify the current captain and every account member in that team, including mixed teams where some other attendees have no accounts. An account must actually belong to the team; matching a display name does not link it.
- Each person gets a separate email and their own greeting. Captain confirmations say “you registered your team”; member confirmations say “your team was registered by your captain.” Addresses are trimmed, normalized, and deduplicated.
- The event date is stored on new registrations. Legacy registrations resolve their selected edition from their signup season. Emails show the real date, 20:00 Romanian time, venue, per-person fee, and total team fee.
- Reminders become eligible at noon on the event date in `Europe/Bucharest`. They never use the Tuesday following signup and never send after the event starts.
- New confirmations are queued durably. A separate delivery row records each recipient, the exact message, a processing lease, and successful acceptance by Resend. Failed recipients remain pending; a successful recipient is not resent on normal retries. Resend idempotency keys cover ambiguous request retries within the provider's [24-hour retention window](https://resend.com/docs/dashboard/emails/idempotency-keys). There is no claim of indefinite exactly-once delivery after a crash.
- Missing credentials or provider failures do not count as successful delivery. The registration remains saved and the API reports email as pending. Provider acceptance is not proof of inbox delivery; monitor bounces in Resend.
- Reminder recipients are resolved at queue time, so leadership transfers and membership changes before that point are respected. Once queued, a message's contents are kept stable for idempotency.

## Vercel Hobby deployment

The checked-in cron is `0 10 * * *` (10:00 UTC daily), calling `/api/cron/notifications`. The application filters for that day's events. This is compatible with [Hobby's daily cron limit and approximate hourly timing](https://vercel.com/docs/cron-jobs/usage-and-pricing), so expect approximately 12:00–13:00 in winter and 13:00–14:00 in summer in Romania. Teams registering after noon on event day also queue their reminders in the registration request.

A long-running Node server instead checks pending notifications every five minutes. On Hobby, failures during the daily reminder run need a manual retry before the event or an external scheduler; the next day's cron deliberately will not send an outdated reminder. The protected endpoint can be called again with `Authorization: Bearer <CRON_SECRET>`. Failed deliveries have a one-minute retry cooldown. Each run handles at most 100 recipients and stops starting new sends near its four-minute budget. The default ten-team, six-member event fits within this batch size.

Before deploying:

1. Set a fresh `SESSION_SECRET` with at least 32 random characters, a strong `ADMIN_PASSWORD`, and a random `CRON_SECRET` in Vercel. `SESSION_SECRET` and a database are required in production. The old hardcoded admin password is no longer accepted.
2. Keep `DATABASE_URL` and `RESEND_API_KEY` configured. Resend must verify `contact@transilvaniatrivia.ro` as an allowed sender/domain. Database TLS now respects the connection URL rather than unconditionally disabling certificate verification. If the provider requires a private CA, supply `DATABASE_CA_CERT`.
3. Use Node 22.12 or later. Enable Vercel Fluid Compute for the API's configured 300-second maximum duration; [Hobby supports 300 seconds with Fluid Compute](https://vercel.com/docs/functions/configuring-functions/duration). The schema file is explicitly included in the function bundle.
4. The existing startup bootstrap runs the additive schema updates before accepting API requests. New operational tables are `app_sessions`, `app_email_deliveries`, and `app_edition_capacity`; registrations gain `event_date` and `confirmation_queued`. Historical registrations are marked as already queued to avoid sending old confirmations again. The database account needs the same schema-update privileges as before. Review/test this migration against a database copy before production rollout.
5. Users must log in again because stored browser user IDs are no longer authentication. New/reset passwords are hashed. Existing plaintext passwords upgrade on a valid login. To hash all remaining legacy passwords immediately, run `npm run passwords:migrate` with `DATABASE_URL` explicitly pointing to the intended database. This was not run against production.
6. Verify one guest booking and one linked-team booking, inspect all intended inboxes, and invoke the cron endpoint against a controlled event-day fixture before relying on live reminders. No production database or email credentials were used during local tests.

`APP_ORIGIN` is optional: when supplied, it must be the exact browser origin, without a trailing slash. Otherwise same-origin checks use the request host. Vercel's proxy is configured automatically; other HTTPS reverse proxies can set `TRUST_PROXY=1`. Local `npm run dev` loads `.env` if present. Leave `DATABASE_URL` unset for an empty in-memory preview; `SEED_DEMO_DATA=true` explicitly enables sample accounts/data for local previews only.

## Security and correctness changes

- Replaced `x-user-id` authentication with server-side sessions stored in PostgreSQL and HttpOnly, SameSite cookies; secure cookies are required in production. Login/register regenerate the session, logout destroys it, and password changes invalidate existing sessions. This follows the [Express session lifecycle](https://expressjs.com/en/resources/middleware/session/).
- Passwords are salted scrypt hashes. Legacy upgrades use compare-and-swap so they cannot overwrite a concurrent password reset. Password fields are omitted from all user/member/admin API responses.
- Public signup cannot grant administrator privileges. Team creation/joining derive the actor from the session. Kicks, transfers, team details, registrations, theme deletion, and puzzle progress enforce ownership/membership.
- Membership and leadership operations use a transaction and a shared PostgreSQL advisory lock. Parallel joins cannot exceed six members, and leader departure/account deletion promotes a successor atomically.
- Registration capacity and duplicate checks are serialized per edition. Capacity overrides persist in PostgreSQL and are displayed by the homepage. Unknown/past editions and fractional member counts are rejected; linked-team identity/contact fields come from the authenticated captain.
- Reset code attempts are consumed atomically, enforcing single use and the five-attempt limit even under concurrent requests. Reset codes and complete API response bodies are no longer logged.
- Added input bounds, mutation allowlists, origin checks, per-process request throttles, safe email HTML escaping, and generic unexpected-error responses. Removed implicit demo login, wildcard CORS, and unrestricted Vite development hosts.
- Event calculations use Bucharest time and the provided reference date, including winter and summer breaks. Current 2026–27 edition IDs remain compatible; subsequent seasons use year-qualified IDs so registrations do not collide across years.
- Puzzle progress writes are serialized and a stale unsolved save cannot undo a completed puzzle. The original solver remains associated with a completed puzzle.
- Startup waits for schema initialization. Production static paths and ESM bundling were corrected. The 3D globe loads on demand, and the Wikipedia theme cache now has a size bound.

## Validation and remaining limits

Run `npm run check`, `npm test`, and `npm run build`. The test runner removes inherited database/email credentials. Tests exercise recipients, personal greetings/escaping, partial failures, deduplication, reminder dates/DST, concurrent booking and joining, password hashing/reset limits, authentication, ownership, logout, and session invalidation through HTTP requests to a temporary local server.

Final local validation: 15 tests passed, TypeScript passed, and the production build passed. The build still flags large bundles; the 1.9 MB globe chunk is now deferred until that game is opened. The production-only npm audit reports zero known vulnerabilities.

The initial npm audit reported 27 findings (16 high, 7 moderate, 4 low). Dependency updates eliminate the high/low findings. Four moderate findings remain in the development-only `drizzle-kit → @esbuild-kit/esm-loader → @esbuild-kit/core-utils → esbuild` chain. They concern esbuild's development server; this app's Vite server uses a patched esbuild. npm proposes an incompatible Drizzle Kit downgrade for that chain. No forced downgrade or unsupported override is retained. Reassess when Drizzle Kit removes its legacy loader.

This review is not a penetration-test certification. Remaining architectural limitations:

- Puzzle answers/clues live in frontend code and solves are client-reported. Team isolation is enforced, but competitive anti-cheat would require moving game validation and secret-clue access to the server.
- Rate limits are per process, so a distributed/edge limiter is still needed for strong abuse protection across Vercel instances. Guest email addresses are intentionally not verified, so guest registration can still be abused to send bounded unsolicited mail.
- The authored schedule contains fixed month/day templates based on the 2026–27 season. Future event dates/themes need editorial review; year-qualified IDs prevent record collisions but do not invent a new season's Tuesday dates.
- Real PostgreSQL migrations/locking, live Vercel cron execution, HTTPS cookie behavior, and actual Resend delivery require staging verification. Local tests use in-memory storage and a mocked/disabled email provider.


## Weekly reset correction

Weeks without an event intentionally have no secret round or clue to reveal, even after all five games are solved. The weekly games and progress still reset; clue availability follows the event schedule. The hub text, clue modal, and API unlock status respect this rule.

All five games (Wordle, Sudoku, chronology, Connections, and guess the country) now advance every **Wednesday at 00:00 Europe/Bucharest**, immediately after Tuesday ends. The old Thursday epoch and elapsed-168-hour calculation were corrected. Calendar-based week boundaries preserve midnight through the March and October daylight-saving changes.

The hub supplies one weekly content snapshot to every game; puzzles are no longer frozen at JavaScript module load. A boundary timer resets mounted games and the unlocked clue together, with focus/visibility checks when a sleeping tab resumes. Manual resets also clear the actual game boards and guesses. Admin preview is explicitly labeled and stays local, with an option to return to the current week.

Saved progress now uses `week-YYYY-MM-DD` keys in the existing puzzle table's `edition_id` column. This gives every week its own 0/5 state, even between events or seasons. Existing edition-based history is retained but does not carry into the new weekly records; no database migration is needed for this key change. The API rejects old-week submissions instead of applying them to the next week's games. The authored content pools rotate and eventually repeat; adjacent weeks receive different puzzles.

Validation after this correction: 21 tests pass, including Wednesday midnight, both DST transitions, 120 adjacent content changes, event breaks, invalid previews, and an HTTP integration test that advances the clock across midnight and verifies all five games reset.

## Quick number game replaces Sudoku

The second game is now **Atinge Ținta (Reach the Target)**: three small numbers, a target, and two arithmetic steps. Players combine two tiles, then combine that result with the remaining tile. Whole, nonnegative results only; unlimited attempts, undo, restart, and an optional first-step hint keep it short and approachable. The 40 distinct authored puzzles rotate weekly on the same Wednesday boundary as the other games. Any valid solution is accepted, and the server replays the submitted moves before recording a completion.

The new game uses the `TARGET` progress type. Existing Sudoku records remain in history but do not complete the new game; other games' progress is retained. No schema migration is needed. Event-free weeks still have no clue to unlock. Tests cover the full supported week range, alternative solutions, invalid arithmetic and reused tiles, server rejection of invalid solves, team progress, and weekly rollover.

Validation: TypeScript and the production build pass; all 24 tests pass. An isolated Chrome smoke test exercises the desktop/mobile controls, hint, undo, restart, rejected fractional result, successful solve, progress counter, and preview-week rollover without runtime errors.

All five games now have 40 distinct weekly puzzles each (200 puzzles total), repeating only after the full 40-week cycle. A regression test checks every 40-week window across the cycle boundary and ignores cosmetic differences such as IDs, hints, and ordering when checking uniqueness. Reach the Target now has 16 additional puzzles; every supported week is still checked for solvability and small whole-number arithmetic. Validation after the expansion: 25 tests pass.

## Waitlist, email visibility, and quizmaster clues

Registrations now have `CONFIRMED` or `WAITLISTED` status. Only confirmed teams appear in the public team grid and capacity count. Starting from 10 places, accepting the ninth team expands capacity to 12; accepting the eleventh expands it to 15. Further signups join the waitlist. The quizmaster can approve individual waiting teams, raising capacity as needed to 16/16, 17/17, etc. A larger manual capacity does not bypass the automatic acceptance ceiling of 15. Existing waiting teams retain priority if a place is freed: new signups also wait, and promotion remains a quizmaster decision. Capacity does not shrink automatically after cancellations.

Registration and approval operations share an edition lock/transaction in PostgreSQL and a serialized operation queue in local memory. Repeated approvals are idempotent. The admin edition table shows waiting teams first, oldest signup first, with approval controls and separate confirmed/waiting counts. The signup form stays available when full and clearly distinguishes a waiting-list entry from a reservation. My Team and the account page show each upcoming registration's status and refresh it periodically.

Waitlisted teams receive a distinct, personalized email explaining that they have no reserved place. Captains and account members receive individual messages; guest teams notify their contact only. Confirmation is queued after acceptance, and reminders are restricted to confirmed teams. Unsent waitlist mail is suppressed after acceptance, and deleted registrations are checked before sending. Durable queue flags allow interrupted signup/approval requests to recover on the next scheduled run. Failed attempts retain their provider error/status for the admin panel. Vercel Hobby retains the existing daily 10:00 UTC cron; registration and approval also attempt delivery immediately. No real email was sent during local verification.

**Admin → Emailuri** displays all event templates for captain/member recipients plus the password-reset template, rendered by the same functions used for outgoing mail. Samples are explicitly labeled. It explains triggers, recipients, reminder timing, retries, sender, and the configured provider. The most recent 200 event deliveries show exact stored subject/body, last attempt, provider acceptance, cancellation/expiry, and errors. Provider acceptance does not prove inbox delivery. DNS verification is not inferred from API-key configuration. Real reset codes are not logged or exposed in the delivery list. HTML previews use sandboxed iframes with a restrictive content policy and send nothing.

**Admin → Ediții → Indiciul rundei 4** replaces the old title in the admin edition view with an editable clue. Overrides persist by edition ID and are fetched by the game hub after 5/5 completion. Public event titles stay separate. Event-free weeks still have no clue. Existing authored clues are defaults until edited. As with the previous client-side clues, the reveal is a UI gate rather than a competitive anti-cheat boundary; the clue endpoint is public to support guest play and preview mode.

Deployment adds registration status/waitlist-queue columns, the `app_edition_clues` table, and email attempt/cancellation fields through the existing additive schema initialization. Existing registrations remain confirmed. Drizzle declarations match the added tables/columns. Real PostgreSQL migration and cross-process locking still need staging verification; this workspace has no configured database. Local memory (including clue edits, accounts, and registrations) resets when the server restarts.

Validation: 29 automated tests pass, including threshold expansion, simultaneous overflow registrations and approvals, repeated approval, no automatic acceptance above 15, waitlist priority after cancellation, recipient-specific waitlist/confirmation messages, suppression of stale emails, reminder eligibility, authenticated team status, protected admin endpoints, exact previews, clue edits, and interrupted queue recovery. TypeScript and the production build pass. An isolated browser with disposable test data verified signup at 15/15, waitlist feedback, quizmaster approval to 16/16, account status updates, clue editing, and email previews on desktop/mobile. No test registrations were added to the user's running localhost server or any live database.

## Branded emails and replacement website logo

Confirmation, waitlist, reminder, and password-reset emails now share a gold/purple/dark layout with the supplied Transilvania Trivia logo at the top. The supplied artwork is processed to remove the black matte and saved as a transparent, email-sized `client/public/email-logo.png`; HTML uses its absolute HTTPS URL on transilvaniatrivia.ro, so that asset must ship with the deployment. The admin preview serves the identical image locally, with the sandbox's image policy restricted to that logo. Its frame remains script-free. Plain-text messages, personalized greetings, waitlist warnings, reset expiry, and delivery behavior are retained. Existing queued payload snapshots are not rewritten.

The same supplied artwork replaces `client/public/logo-main.png`, updating the homepage hero, navbar, and footer together. Email layout uses inline styles and presentation tables, with readable text and a logo alt label when remote images are blocked. Exact appearance remains dependent on the recipient's email application.

As requested, the temporary local registration-limit bypass has been removed from both the route and `.env`; the 15-attempts-per-15-minutes registration limit is restored. Validation: 30 automated tests pass, TypeScript and the build pass, and all seven captain/member/reset previews load the logo in the sandboxed browser. Desktop/mobile checks cover all four email types and the homepage logo. No real email was sent during these checks. See the release status below for the subsequent GitHub handoff.


## Romanian / English release and final checks

The floating RO / EN control is available on the public site, account page and admin panel. Every fresh page load starts in Romanian; the choice is not inferred from the browser or persisted across reloads. In-app navigation retains the selected language. Authored navigation, forms, validation messages, rules, calendar, account/team status, admin controls and game text use the same translation catalog. Names, team names and user-submitted themes are preserved.

Each language has 40 distinct weekly puzzles per game, retaining the Wednesday 00:00 Europe/Bucharest reset. English Wordle uses 40 five-letter answers and an English dictionary generated from the MIT-licensed `word-list` package (`node script/english-words.mjs`; license included). All chronology and Connections sets have English versions. The target puzzle's hint and country names also follow the language. Switching languages resets unfinished in-game attempts while retaining the team's solved-game progress. Duplicate or incorrect Connections entries encountered during translation were corrected, including duplicate Mureș tiles and misleading group labels.

Registration saves `language` (`ro` or `en`) in both memory and PostgreSQL. The additive SQL migration defaults older registrations to Romanian. Waitlist, confirmation/acceptance and reminder notifications all read the registration's stored language; every captain/member recipient uses that same language with their own name. Changing the website toggle later does not change that booking's emails. Password-reset emails follow the language of the reset request. Admin sample previews follow the toggle; stored delivery snapshots keep their original exact content and language. Existing queued snapshots are intentionally not rewritten.

Admin editions offer separate Romanian and optional English clue fields. Custom clues need an English version from the quizmaster; if it is missing, the Romanian clue is shown. Existing authored clues have English translations. Event-free weeks still have no secret clue. English overrides use the same clue table with a `:en` key suffix, so existing Romanian overrides remain valid.

`python3 script/transparent-logo.py /path/to/original/Logo.png` reproduces the transparent logo assets using Pillow. A soft alpha matte and colour unmatting retain the gold/purple glow; the email asset is resized to 368 pixels for a 184-pixel display. The original source artwork is not altered.

Final browser testing exposed and repaired two existing defects: account-page reloads redirected before session restoration, and unsupported WebGL could crash the whole page. The account now waits for authentication before redirecting and populates its fields after session restoration. The country game remains playable using distances/directions when 3D graphics are unavailable, offers a retry for failed data loading, and serves bundled country data. France and Norway now resolve through the dataset's administrative codes when ISO codes are missing. Mobile game tabs show readable names.

Validation: 36 automated tests pass, plus TypeScript and the production build. Coverage includes all 40 game sets in both languages, dictionary membership, 16 distinct Connections tiles per week, every country target, Romanian defaults, both email languages for all recipients through approval/reminders, and the previous security/waitlist/reset checks. Isolated desktop/mobile browser checks cover guest and captain registrations, language persistence in bookings, approval, team status, bilingual clues, all five games and all 14 email template previews. No real email or live database mutation was performed. Large JavaScript chunk warnings remain, particularly for the lazily loaded 3D globe.

Release handoff: the owner authorized pushing the release and follow-up fixes to `main`. Production needs a PostgreSQL connection (`DATABASE_URL`, or a supported Neon/Vercel alias) and `CRON_SECRET` for scheduled notifications. `SESSION_SECRET` is optional: a valid configured value is respected; otherwise the app uses a generated secret persisted in PostgreSQL. Local `.env` values are not committed. Live email delivery requires separate provider verification.

## Navigation, loading, and admin access fixes

The desktop navigation now measures before its first paint and snaps the visible highlight springs to the measured button. Both position and width update the text mask. Matching text weights, font/translation remeasurement, and reduced-motion handling prevent the initial split-color label. Mobile navigation has accessible names and expanded/current state.

Admin and account routes and individual game components load separately. The main production JavaScript bundle dropped from 1,111 kB to 826 kB (about 26%; gzip 353 kB to 264 kB). The lazy globe bundle remains large. Wordle now allocates exact matches before misplaced duplicate letters, respects keyboard focus/shortcuts, and saves a winning solve immediately so a delayed callback cannot restore reset progress.

Registration fills untouched fields when the account finishes loading and preserves typed values. A new edition remounts the registration form, clearing the previous edition's confirmation. Schedule selection now advances at exactly Wednesday midnight. The admin edition list batches registrations, capacity overrides, and clues in three reads instead of 120, plus the admin credential lookup.

`/admin` now authenticates against `app_admin_credentials`, row `site-admin`, column `password_hash`. Database initialization creates the table and inserts the owner's requested initial credential as a salted scrypt hash from the server-only bootstrap module. `ON CONFLICT DO NOTHING` preserves future password changes across deployments and simultaneous startups. The old `ADMIN_PASSWORD` environment variable no longer controls login. Local memory uses the same initial hash. Missing or unreadable credentials fail closed; the hash is never returned to clients or included in browser bundles. The admin login form distinguishes wrong passwords, rate limits, and connectivity failures.

Validation: all 45 regression tests, TypeScript, and the production build pass. Browser checks cover initial navigation frames, English labels, mobile navigation, correct/incorrect admin passwords, delayed account autofill, preserved manual edits, and confirmation clearing at edition rollover. Registration browser checks use mocked responses and send no emails or real bookings. Live deployment and PostgreSQL migration remain separate verification steps.

## Production database startup repair

Live diagnosis found that all API endpoints returned Vercel `FUNCTION_INVOCATION_FAILED`, while a direct Neon connection succeeded. Neon still contained the old tables and lacked sessions, admin credentials, email delivery, and clue tables. Database initialization previously ran during module import, and synchronous security setup could terminate startup before that initialization completed. A first rejected initialization promise also permanently poisoned the instance.

Startup now awaits database initialization before configuring sessions and routes. Schema changes and initial credentials run in one transaction under an advisory transaction lock, which works with Neon's transaction pooler. A schema hash avoids rerunning unchanged DDL on every cold start. A generated session secret is persisted in `app_runtime_settings` and shared across instances. Initialization failures are retryable; idle connection errors are handled; missing/malformed configuration returns sanitized JSON 503 diagnostics. `/api/health` verifies readiness and database connectivity.

The old Neon schema was upgraded successfully. The requested admin password was verified against its stored hash. Account and session writes were checked in a transaction that was rolled back, leaving no test accounts. Production-mode PostgreSQL engine testing also covered first-attempt connection failure and recovery, account signup/login/logout, secure session restoration, and admin login without environment-provided admin or session secrets. Regression coverage includes missing/malformed production config without module-import crashes.
