# Final website audit — 1 October 2026

The audit covered the live website, the production build, account/team/booking APIs, weekly games, administrator workflows, email generation, Romanian/English content, and loading performance. Concrete defects were fixed and regression coverage was expanded. This report distinguishes verified behavior from services that were not exercised against production.

## Changes made

### Accounts, teams, and bookings

- Concurrent signups and profile changes preserve normalized email uniqueness and return a useful conflict response instead of a duplicate account or unexpected server error.
- Password-reset code consumption and password updates are atomic. Changing an email address or deleting an account invalidates old codes before another account can reuse the address. Concurrent reset requests respect the cooldown, and a failed older email attempt cannot delete a replacement code.
- Session refreshes no longer overwrite newer authentication state. Invitation links are consumed once after signup, and unrelated URL parameters and section destinations are preserved.
- Account creation/login/team forms gained associated labels, autocomplete, input limits, submission guards, and usable scrolling on small screens. Failed logout leaves the user on the account page.
- Booking forms correctly follow loaded account details and team size. Account/team changes clear stale drafts; only captains can submit linked-team bookings. Server-owned team/captain/email fields are read-only for those bookings. Guest bookings remain available.
- Failed theme-history deletion no longer removes an item from the screen; leaving a team clears its displayed history. Team controls handle clipboard failures and wrap on narrow screens.
- Homepage team loading failures show a retry action rather than a misleading empty event. Requests cannot overwrite newer results, and the displayed schedule and team list stay aligned across an edition change.

### Emails, persistence, and administration

- Queued event emails are cancelled when the recipient leaves the team or the relevant contact email changes. Cancelled reminders reach a terminal state instead of remaining pending forever.
- Drizzle timestamp declarations now match the existing PostgreSQL `timestamptz` columns, preserving actual instants when the database returns timezone offsets. This is a mapping correction; no new database migration is required.
- Administrator theme approval/rejection/deletion now reports failed requests. Stale admin and email-preview requests cannot overwrite newer results or display the previous language's response.
- Administrator edit dialogs use the existing accessible dialog component, associate input labels, prevent repeated saves, and enforce the six-player booking limit. Registration/team edits use the server's saved response.
- Email wording now consistently uses the Transilvania Trivia brand, correct Romanian password-reset grammar, and singular/plural player labels.

### Games and recovery

- Switching game tabs preserves unfinished attempts. Hidden Wordle boards no longer consume keyboard input, and the hidden globe pauses rendering.
- Preview puzzles can be completed. Progress fetches, saves, and resets no longer overwrite one another with stale state, and reset is disabled while a save is pending.
- Timeline placement controls are visible on touchscreens; events in the same year accept either valid placement. Remaining-life reporting is correct.
- Narrow game layouts and Wordle completion wording were corrected.
- Failed lazy page downloads or unexpected render failures display a working reload action. The 404 page links back to the event.
- Reduced-motion preferences apply to CSS animations and section navigation.

### Romanian and English content

Reviewed live public pages, account/admin controls, forms, emails, all 40 weekly puzzle sets in each language, and schedule descriptions. Fixed grammar, diacritics, decimal formatting, ambiguous labels, and several incorrect puzzle answers. User-submitted theme names are preserved during feedback translation, even if a name matches a translation key. Romanian remains the default on a fresh page load.

The final static translation audit checked 789 literal translation calls and 911 catalog entries, with no missing English entries or placeholder mismatches. Unused historical example components are not part of the live routes and were not comprehensively rewritten.

Corrections verified against sources include:

- Constanța Casino inauguration: 1910. [Casino history](https://casinoulcomunal.ro/istoria-cazino/)
- Brașov workers' uprising: 1987. [IICCMER](https://www.iiccmer.ro/carusel-stiri/2017/15-noiembrie-1987-30-de-ani-dupa/)
- Dacia production start: 1968. [Dacia history](https://www.dacia.ro/despre-dacia/istoric.html)
- Romania's 2004 Olympic gymnastics golds: four. [Romanian Olympic Committee](https://www.cosrold.cosr.ro/jocuri-olimpice-de-vara/atena-2004)
- More precise labels distinguish Mosaic's launch from the first web browser, ARPANET's TCP/IP adoption from its invention, and euro cash from the currency's earlier introduction. [CERN](https://worldwideweb.cern.ch/history/), [Internet Society](https://www.internetsociety.org/internet/history-internet/brief-history-internet/), [ECB](https://www.ecb.europa.eu/euro/changeover/2002/html/index.en.html)

Historical source verification targeted identified mistakes and ambiguities; it was not independent source verification of every trivia claim.

## Loading improvements

Existing artwork was encoded as appropriately sized WebP files; original PNGs remain available, including the email-compatible logo. Prize images load lazily, logo space is reserved to avoid a layout jump, the hero logo is preloaded, and the duplicate CSS font import was removed.

| Asset | Original bytes | Web bytes |
| --- | ---: | ---: |
| Main logo | 2,884,988 | 569,208 |
| Beer prize | 8,066,040 | 45,976 |
| Wine prize | 1,801,430 | 11,490 |
| Shots prize | 2,904,303 | 51,928 |
| **Total** | **15,656,761** | **678,602** |

This reduces those four image downloads by **95.7%**. Reproduce the assets with `python3 script/optimize-web-images.py` using Pillow with WebP support.

Large JavaScript warnings remain: the main chunk is about 838 kB (267 kB gzip); the separately loaded 3D globe is about 1.92 MB (546 kB gzip). The globe downloads only when its game is first opened. These are build-size measurements, not a universal speed or Core Web Vitals guarantee.

## Validation

- TypeScript and production build checked.
- Backend/content regression coverage includes account lifecycle/concurrency, sessions and revocation, reset limits, ownership, six-member team limits and leadership changes, guest/captain booking, capacity/waitlist priority and approval, email recipients/retries/cancellation, scheduling/DST, Wednesday resets, both languages, all 40 content sets, and timestamp mappings.
- Repeatable browser coverage is in `tests/browser/site.spec.ts`. Run `npm run test:browser`; it builds the site and starts a separate server on `127.0.0.1:4177`, with database/provider credentials removed and no scheduler. It never loads `.env`. Test-only fixture routes exist exclusively in `script/browser-server.mjs`, outside the production entry point.
- Browser tests run in installed Google Chrome at 1440×900 and 390×844. Set `PLAYWRIGHT_CHANNEL=chromium` to use a separately installed Playwright Chromium browser. Tests verify real local account/booking requests, invitation signup, password-reset form with a test-issued code, session restoration, profile editing, login/logout, all game tabs in both languages, waitlist/approval, email previews, loading-error recovery, responsive overflow, and public navigation.
- Live read-only checks confirmed the canonical HTTPS redirect, homepage rendering at desktop/mobile widths, no observed page exceptions or horizontal overflow, and `/api/health` reporting an available database. The current public schedule and team list returned successfully. No test bookings/accounts were written to production.
- `npm audit --omit=dev`: **zero known vulnerabilities**. Full audit retains **four moderate development-only findings** in Drizzle Kit's legacy esbuild loader chain; npm's proposed remedy is an incompatible downgrade, so no forced downgrade was applied.

Final results: **64/64 automated backend/content tests passed; 18/18 desktop/mobile browser tests passed; TypeScript passed; production build passed; `git diff --check` passed.** All nine email template variants were previewed in both languages at both viewport sizes. Browser test assertions were corrected during development for exact labels and status cells; the final full run has no failures.

The audited changes and this report are intended for the owner-authorized push to `origin/main`. A GitHub push and successful local build do not by themselves establish deployment completion; the assistant's handoff records the actual push/deployment result.

## Limits and operational follow-up

No audit can prove that a website has zero defects under all conditions. This pass did not send real emails, run live Vercel cron, mutate production accounts/bookings, or run the new concurrency changes against a separate PostgreSQL staging database. Local integration tests use in-memory storage; timestamp mapping checks do not substitute for a full database integration test. Email preview/provider acceptance does not prove inbox delivery, and exact rendering varies by email client. Mobile browser emulation does not replace testing every physical device or Safari/Firefox version.

Previously documented architectural limits remain: per-process rate limiting across serverless instances, client-visible puzzle answers and client-reported solves, and editorial review of future-season schedule templates. Production secrets remain outside version control. See `docs/project-review.md` for deployment and cron details.
