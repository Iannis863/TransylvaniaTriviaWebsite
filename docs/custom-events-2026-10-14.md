# Custom events — 14 October 2026

Custom events have their own registration pages and team lists, separate from the seasonal quiz editions. An administrator chooses the page address, headline, subtitle, date and time, location, fee, maximum number of teams, prizes, and optional collaborator branding. Pages use the existing logo and registration styling, with a link back to the homepage at the bottom.

## Admin workflow

Open `/admin` and select **Evenimente speciale / Custom events**. Create an event, then set its public address, such as `/hermes` or `/christmas`. Addresses must be unique and cannot replace existing application routes. The event name is also used in registration emails. The page headline and subtitle are separate fields; a subtitle is optional.

Dates and times entered in the admin panel use **Europe/Bucharest**, including daylight-saving changes. The default venue is Insomnia Cafe & Bistro, the fee is 10 lei per person, and capacity is 10 teams. All these defaults can be changed for each event.

Save an event as a draft while preparing it. Publish it when the page is ready to share. Registration can be opened or closed independently of publication. Published pages remain available after their event starts, with registration closed and the confirmed teams visible.

Capacity is fixed at the number selected by the administrator. It does not use the normal edition's automatic 10 → 12 → 15 progression, and custom events can have more than 15 teams. When capacity is reached, submissions go to the waiting list. Increasing capacity does not automatically approve waiting teams; approve them from the event's team list. A capacity reduction cannot displace teams that are already confirmed.

Guests can register a team using the form. Signed-in team captains can register their existing team, preserving its account association. Each custom event is independent: booking a special event does not book a weekly edition or another special event.

The public page displays confirmed teams without private email addresses or phone numbers. The admin panel retains contact details, edit/remove actions, and waiting-list approvals. Unpublish an event to remove public access while keeping its registrations. Events with registrations cannot be deleted; empty events can be deleted.

## Prizes and collaboration

The final section of each custom event displays first-, second-, and third-place prizes. Defaults match the regular quiz's wine, beer, and shots, using the same illustrations. Administrators can edit each prize's title and description. Custom event pages omit the seasonal jackpot and the weekly page's fixed venue/time footer.

To add a collaborator, enable the collaboration option in the event editor, enter its name, and choose a PNG logo. The admin browser prepares a web copy automatically: it removes only fully transparent outer padding, fits the artwork proportionally inside a centered transparent square, and uses high-quality downsampling when needed. Small raster artwork is not enlarged during preparation. Opaque backgrounds and visible artwork are retained. The preview shows the exact prepared version that will be saved.

Originals can be much larger than the stored image: the browser accepts up to 20 MiB, 128 MiPixels (134,217,728 pixels), and 16384 pixels per side. This includes a 10660 × 10660 PNG. Prepared images fit within 1024 × 1024 pixels and the existing 1 MiB storage budget; only the prepared image is uploaded. If needed, dimensions are reduced further while keeping the artwork's aspect ratio and PNG transparency. Both public logos occupy identical responsive square display areas with a proportional contain fit, including previously uploaded logos.

For originals above 40 MiPixels, the browser first requests a proportional working bitmap with a maximum 2048px edge and high-quality resampling. Its returned dimensions are verified before scanning transparency or drawing the final logo. Unsupported or ignored resize requests close the bitmap and show a translated error; these very large originals never fall back to an unrestricted image-element decode. Smaller originals retain their native resolution until transparent margins are trimmed, preserving small artwork inside large padding. The browser may still use temporary native memory while decoding a large PNG; the API guarantees the requested bitmap dimensions, not a fixed peak-memory budget. The original file is never modified.

The collaborator appears beside the Transilvania Trivia logo only when collaboration is enabled. The editor supports replacing or removing the logo, and disabling collaboration restores the single-logo header. Processing uses [the browser's high-quality image resizing API](https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap) and [PNG canvas export](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob). Preparing the image before upload avoids [Vercel's function body-size limit](https://vercel.com/docs/functions/limitations#request-body-size).

Logos are stored in the database rather than the deployment filesystem. Public image access is limited to published events with collaboration enabled; draft previews require admin access. Existing event updates retain the logo and prize settings unless explicitly changed.

## Persistence and verification

Custom event definitions persist in the application database. Registrations reuse the existing booking and notification infrastructure with a dedicated event scope. The versioned database initializer creates the new table on startup.

Confirmation, waiting-list, and reminder emails use the custom event's name, time, location, fee, and page link. Reminders become eligible in the 24 hours before the event, matching the existing daily hosted cron. Rescheduling updates stored booking times and starts a new notification revision, including when an event returns to a previously used date. Pending deliveries use current details; unpublished events pause delivery. Editing an event does not alter weekly games or seasonal bookings.

## Local preview

Run `npm run dev:local`, then visit `http://localhost:3333/hermes` for a disposable sample event with capacity fixed at three teams. Open `http://localhost:3333/admin`, enter the local-only password `local-trivia-admin`, and select **Evenimente speciale** to edit it or create more events. The existing sample leaderboard remains available on the homepage.

The preview ignores `.env` and production database/email settings, uses in-memory data, and does not start the mail scheduler. Local accounts, bookings, and events reset on restart. This sample event is not inserted into the production database.

## Checks

Final results (15 October): **85/85 backend tests and 50/50 desktop/mobile browser tests passed**, along with TypeScript, the production build, and `git diff --check`. Automated checks use isolated memory storage and do not exercise a PostgreSQL staging deployment.

Coverage includes concurrent fixed-capacity bookings, capacity above 15, manual approvals, draft and closed pages, reserved/duplicate addresses, contact privacy, linked-team ownership during leadership changes, isolated season/event bookings, Romanian summer/winter times and invalid daylight-saving hours, event rescheduling, notification retry/recovery, admin creation/publication/editing, guest and captain signups, and long authored text at 320px. Existing homepage navigation, account, leaderboard, calendar, booking, email, and weekly-reset checks remain passing. Public pages and admin tables were also reviewed in desktop/mobile screenshots.

Prize/collaboration checks cover all three default prizes, placement after the team list, absence of the custom-page jackpot, admin prize editing, authentic PNG upload, prepared PNG bytes preserved by the public image response, existing-logo retention on edits, collaboration disabling/re-enabling, unpublished-logo privacy, and side-by-side logos at 320/390px. PNG validation exercises palettes, alpha, Adam7, split chunks, CRC errors, invalid filters, decompression limits, and oversized files. A full 1 MB prepared image is accepted by the dedicated save parser; unrelated API routes retain their existing 100 KB body limit.

Automatic-preparation coverage uploads a real 2.8 MB logo and a 5000 × 2000 PNG, verifies the stored square PNG budget, transparent corners, translucent edges, centered artwork, preserved 3:1 wordmark proportions, and matching logo frames at 320/390/1440px. Detailed noisy originals exercise further size reduction; tiny artwork stays at native resolution, fully transparent/malformed inputs are rejected, and cancelling preparation cannot overwrite a newly opened event's logo.

The 15 October extension adds a streamed, generated 10660 × 10660 PNG regression on desktop and mobile. It verifies that the browser receives the original dimensions, returns the requested 2048 × 2048 working bitmap, and prepares a PNG within the final size/byte budget with transparent corners and unchanged solid artwork color. Additional cases verify cleanup and a friendly error if a decoder ignores resizing, plus successful image-element fallback and object-URL cleanup for ordinary logos when ImageBitmap is unavailable. This checks the supplied logo's exact dimensions using a generated image; the full-resolution collaborator artwork was not available as a local test fixture.

The regression run exposed two existing homepage buttons that overflowed at 320px. Guest/no-team account buttons now wrap inside their cards, and the homepage hero content and calls to action fit narrow screens.

Run `npm run check`, `npm test`, and `npm run test:browser` to repeat the checks.
