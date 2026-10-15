# Release check — 15 October 2026

Reviewed the working site for security issues, responsive layout failures, and regressions before pushing to GitHub. The starting revision was `e313d49`. Changes preserve the existing visual theme, routes, event rules, content, and database schema.

## Fixes

- Weekly account-team registrations now recheck captain ownership and contact details while holding the same mutation lock as leadership transfers and team/account deletion. Previously a concurrent transfer could allow a former captain to complete a booking. A deterministic regression test reproduced the unauthorized 201 response before the fix, then verified a 403 response and a successful booking by the new captain afterward.
- Secret-clue dialogs now have a viewport-relative height limit and internal scrolling. At 320 × 568, the original locked dialog was 700px tall and extended above and below the screen. Confirmation dialogs receive the same limit for short landscape displays. Unbroken clues up to the supported 2000-character limit wrap without horizontal scrolling.
- The footer wraps its address/copyright and stacks until there is room for all columns. Its original content clipped at phone and tablet widths.
- Long valid team names, taglines, and theme suggestions wrap in account/team/progress views. Public team cards keep the member badge within the card and retain their existing truncated-name presentation.
- The Connections game label wraps at 320px instead of overflowing its panel by six pixels. Long English words also wrap inside their tiles.

## Dependency security

Installed the exact updated lockfile with `npm ci --offline`. Compatible fixes update `proxy-addr` from 2.0.7 to 2.0.8 and `source-map-js` from 1.2.1 to 1.2.2. Overrides use patched `postcss-selector-parser` 7.1.6 and the already-used esbuild 0.25.12 in the legacy Drizzle loader. The build-only `tailwindcss-animate` plugin is now a development dependency. Direct framework versions remain unchanged.

The live production audit (`npm audit --omit=dev`) reports **zero vulnerabilities**. The complete dependency audit retains five high findings propagated from a single [unpatched braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), confined to Tailwind development tooling. Its vulnerable nested-pattern parsing has no application request path; the project's build patterns are authored in the repository. An unrelated major Tailwind migration was not introduced as part of this check.

Verified the dependency overrides with byte-identical CSS on frozen source inputs, a legacy-loader TypeScript transform, an actual Drizzle generation covering all 17 tables into a temporary directory without connecting to a database, a proxy-trust smoke check, and `npm ls --all`.

Upstream advisories: [proxy-addr](https://github.com/advisories/GHSA-jqcg-44mw-7w3h), [source-map-js](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), [PostCSS selector parser](https://github.com/advisories/GHSA-rj75-hqrm-r3gf), [esbuild](https://github.com/advisories/GHSA-67mh-4wv8-2f99).

## Verification scope

Final checks passed:

- Clean lockfile installation with `npm ci --offline` and dependency-tree validation.
- TypeScript with `npm run check`.
- **86/86 backend, content, and API tests** with `npm test`.
- Production frontend/server build using `node --import tsx script/build.ts`.
- **62 browser tests passed**, including the original desktop/mobile flows and new regressions. Four duplicate viewport cases are intentionally skipped in the mobile project because the explicit 320/768/1024/2560px matrix already runs once in the desktop project. Both languages, 568 × 320 landscape dialogs, long names/clues, and normal/reduced motion are covered.
- Visual inspection of narrow/wide homepages, authentication/calendar dialogs, footer, Connections tiles, and locked/unlocked clue and reset dialogs.
- Live production dependency audit: zero findings. Full audit: five development-only findings from the one unpatched upstream issue described above.
- `git diff --check`.

The final browser run used temporary Playwright Chromium (`PLAYWRIGHT_BROWSERS_PATH=/private/tmp/trivia-playwright PLAYWRIGHT_CHANNEL=chromium npx playwright test`) after the installed Chrome application became unavailable. Browser files and screenshots were kept outside the repository.

Reviewed session regeneration and password revocation, account/team ownership checks, administrator access, mutation-origin checks, rate limiting, password reset atomicity/attempt limits, request and upload limits, PNG validation, workbook validation, parameterized database operations, email escaping, and fixed external-service hosts.

Tests use disposable memory storage, remove inherited database/email credentials, and send no real email. This review does not establish live PostgreSQL concurrency behavior, email inbox delivery, hosting configuration, or every physical browser/device. Existing documented process-local rate limiting, client-reported casual puzzle completion, and the large lazy globe bundle remain operational considerations.

Screenshots from the responsive checks are temporary review artifacts under `/private/tmp/trivia-final-*`; generated assets and local environment files are excluded from the commit.
