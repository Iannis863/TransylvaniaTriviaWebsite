# Leaderboards and weekly game resets — 14 October 2026

The homepage now has a bilingual leaderboard section and navigation link. Visitors can select the overall table, a published season, or an individual played edition. The overall score sums all published edition results across all seasons. Ties share a rank; blank scores indicate absence and zero indicates participation. A linked team's result is highlighted for its members, and the team dashboard displays the same overall total.

## Local owner testing

Run `npm run dev:local`, then open `http://localhost:3333`. The admin page is `http://localhost:3333/admin` with the local-only password `local-trivia-admin`. This launcher loads the sample's seven teams, uses disposable in-memory storage, ignores production database/email settings and `.env`, and does not run the mail scheduler. Test accounts, associations, uploads, and bookings reset when the process restarts. Vite reloads source changes while it runs. This mode does not publish or push changes.

## Weekly upload workflow

1. Open `/admin`, sign in, and select **Clasament / Leaderboard**.
2. Set the academic start year and season. Autumn 2026 is **2026 / Season 1**; spring 2027 is **2026 / Season 2**. Each academic year has its own history.
3. Upload an unprotected `.xlsx` workbook (maximum 2 MB). The supplied **Grading Sheet Overall.xlsx** is supported directly: `Numele echipei`, `Ediția 1`, additional edition columns, and `Scor Final`. English headers are also supported. Prefer the `Overall Ranking` worksheet; otherwise one worksheet with the expected first header is required.
4. Preview the import and inspect team names, edition scores, and totals. Scores support two decimal places. Excel formula cells require saved calculated values. Totals are calculated from edition scores; a discrepancy with Excel's final column is shown before publication.
5. Select **Publică acest clasament / Publish this leaderboard**.
6. Review team associations below the published history. New exact name matches (case and whitespace normalized, diacritics preserved) link automatically. Change or remove a link using its registered-team selector. Links remain in place on subsequent uploads. Teams created after an import can be linked here manually.

Every populated edition column is an authoritative replacement of that edition's results, including its team list. Include all participating teams for those editions. Editions absent from the file remain intact. Entirely blank edition columns are ignored, including blank future columns. Populated results for future or unknown editions are rejected. Repeat uploads update results without adding duplicate points. Other seasons are preserved.

The same registered team may be linked to different spreadsheet names from different editions/seasons. Its results then combine in the overall table. Linking two competing rows from the same edition to the same registered team is rejected. Removing an account/team preserves its historical results and detaches the identity link.

The sample is stored as a regression fixture, not automatically published to production. Upload it through the admin workflow to publish the first results.

## Persistence and access

`schema.sql` and `shared/schema.ts` declare `app_leaderboard_identities` and `app_leaderboard_seasons`. The existing versioned database initializer creates these tables transactionally on startup; no manual production `db:push` is required. Upload publication and manual linking run under the existing database transaction/advisory lock used for team mutations. Scores are stored as integer hundredths to keep sums and ties exact. Only admins can upload, preview, inspect links, or change associations. Public output contains names, optional registered-team IDs, and scores, without email addresses, invite codes, or membership details.

These changes were developed and validated locally for the owner-authorized push to `origin/main`. A GitHub push does not by itself verify a hosted deployment. No production database, registrations, or email provider was modified during this work.

## Weekly reset investigation

The existing server already stores each week's progress under a distinct `week-YYYY-MM-DD` key and rejects reads, solves, and resets for older weeks. All five question sets rotate every Wednesday at 00:00 in Europe/Bucharest, including daylight-saving changes; there are 40 distinct sets before the existing rotation repeats. There is no backend carryover in the exercised scenarios.

Two browser-side risks were addressed: relying only on a player's device clock to choose the week, and keeping the admin simulator week in persistent local storage. The browser now synchronizes with the public server-clock endpoint on initial load, every 30 seconds, and after focus/visibility changes. At the known Wednesday boundary it immediately remounts the entire games hub, clearing completion state, guesses, puzzle state, and open secret dialogs. A resumed tab reconciles with the server even when its device clock remains in the previous week. Failed clock requests retain the last known offset and retry on the next update. Simulator selection now uses tab session storage, and old persistent selections are ignored.

Progress responses explicitly disable caching, and the client verifies that each response belongs to its mounted week. Secret unlocking waits for pending saves to finish. These changes address plausible causes of the reported symptom; the specific person's browser and production records were unavailable, so its exact cause was not established.

## Navigation visual follow-up

The additional leaderboard link exposed header overflow at 1024px: the desktop navigation remained visible although the login button extended beyond the header. The header now fits the available width, uses its compact menu below 1280px, and keeps tab widths stable instead of shrinking the slider's geometry. Account names are bounded, while full names wrap in the compact menu. The invitation action remains available at desktop sizes, with its text/code expanded from 1440px. Signing in/out and changing languages remeasure the slider immediately.

Section links leave 100px for the floating header, keeping headings visible and the spring highlight aligned with the selected tab. The menu scrolls on short screens, closes with Escape while restoring focus, and closes when resizing into the desktop layout. Long captain names now wrap inside the quick-registration card rather than widening the page.

Additional browser coverage checks guest, member, and captain states in Romanian and English at 320, 390, 768, 1024, 1279, 1280, 1440, 1536, and 1920px. It checks header/button bounds, tab labels, menu bounds and dismissal, actual section navigation, account/sign-out actions, clipboard copying, long names, and spring/reduced-motion alignment. Screenshots were visually reviewed. These tests use a separate simulated API client only in the loopback fixture server so their repeated navigation does not consume another suite's login-rate bucket; production proxy settings and rate limits are unchanged.

## Calendar and language-toggle polish

The selected language now uses the same metallic gold gradient as the site's gold buttons. Calendar entries show only a larger localized weekday and date, including holidays and special editions; speculative event titles, descriptions, edition-number badges, and repeated time/capacity labels were removed from individual rows. The shared time and venue remain in the calendar introduction. The current edition retains its visual highlight and an accessible current-date marker.

Desktop/mobile browser checks cover both seasons, Romanian and English dates, absence of every schedule title/description, larger date typography, modal overflow, and the active language's gold gradient. Both seasons were reviewed in screenshots.

## Verification

Final results: **73/73 backend/content tests passed; 30/30 desktop/mobile browser tests passed; TypeScript, production build, and `git diff --check` passed.** Visual review covered both leaderboard viewport sizes, and the desktop test also checks 1024px overflow.

Automated coverage exercises the supplied seven-team workbook, fractional points, calculated/cached formulas, blank vs. zero scores, malformed/oversized workbooks, duplicate columns/names, ZIP expansion limits, repeated uploads, corrections, partial uploads, cross-year history, future-result rejection, automatic/manual linking, alias aggregation, association conflicts, explicit unlink preservation, and history after team deletion.

Desktop and mobile browser coverage exercises actual upload/preview/publication, linking, weekly updates, season/edition filters, tied ranks, team highlighting, dashboard totals, Romanian/English rendering, responsive overflow, Wednesday midnight rollover, question replacement, open-dialog reset, and suspended-tab/device-clock recovery. Existing account, booking, admin, localization, and all-game regression coverage remains in place. Tests use isolated in-memory storage with database and email credentials stripped; these checks do not substitute for a PostgreSQL staging integration or a production deployment check.

Run `npm run check`, `npm test`, and `npm run test:browser`. `node --import tsx script/build.ts` is an equivalent production-build invocation that avoids the tsx CLI's extra IPC socket in restrictive environments.

Excel parsing follows [ExcelJS's workbook API](https://github.com/exceljs/exceljs), with bounded ZIP inspection through [fflate](https://github.com/101arrowz/fflate). ExcelJS's UUID dependency is overridden to the patched compatible 11.x release. The final production dependency audit reports nine findings in unchanged pre-existing dependencies (including `proxy-addr`, Tailwind/PostCSS, and source-map tooling); the new Excel parser adds no remaining finding. These should be tracked separately; no forced framework upgrades were made here.
