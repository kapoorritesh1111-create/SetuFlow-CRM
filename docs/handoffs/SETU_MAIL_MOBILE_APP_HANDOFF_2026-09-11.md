# SETU Mail Mobile App — Parallel Work Handoff

Updated: 2026-09-12
Active branch: `feat/setu-mail-mobile-app-20260912`
Draft PR: `#115`
Current rebased main checkpoint: `72c730d48e4853725bbbaaa59664be1086a5071c` — S41-MAIL-009 Reader intelligence on top of Batch 4 Communications notifications
Superseded branch/PR: `feat/setu-communications-mobile-shell` / `#113` — closed, do not merge

## Goal

Turn the existing Setu Mail / Calendar / Contacts experience into an Outlook-like mobile communications app that can be installed on iPhone and Android while continuing to use the same Setu Flow backend, authentication, organization model, mailboxes, calendar, contacts, CRM linking, notifications, Zoom integration, reminders, recurrence, and Setu Guru capabilities.

This is not a second backend and must not fork business logic from the desktop product.

## Critical mobile auth / notification contract

SETU Mail must behave like a real mail app after the user signs in on a phone.

- Closing the PWA/browser, locking the phone, switching apps, or rebooting the phone must **not** be treated as a logout.
- The normal state is **stay signed in until the user explicitly signs out or the server/security policy revokes the session**.
- Do not introduce short cookie expiry, foreground-only auth, or a mobile-only session timeout.
- Continue using the existing Supabase SSR cookie session and refresh-token rotation. The middleware validates/refreshes the authenticated session and writes refreshed cookies back to the browser.
- The shared Communications shell already refreshes authenticated Mail state on load, every 30 seconds while active, and again on browser/app focus. This gives the session an immediate refresh opportunity whenever the installed app returns to the foreground.
- Background push must **not depend on the Mail UI being open**. The root service worker and stored `push_subscriptions` receive supported pushes while the installed app is closed/backgrounded, subject to OS/browser notification permission and platform delivery rules.
- Notification click-through still validates the real authenticated session before showing Mail/Calendar data. If a session was explicitly revoked, a fresh sign-in is correct behavior.
- Never keep a revoked password/session alive merely to avoid login. Persistence means normal long-lived signed-in behavior, not bypassing account security.

Practical phone expectation:

1. User signs in once.
2. User installs SETU Mail and enables notifications.
3. User can close SETU Mail.
4. New Mail / Calendar reminder push can still arrive through the service worker.
5. Tapping the notification opens the deep-linked Mail/Calendar item and silently uses/refreshes the existing session when it is still valid.

## Current implementation status

### Mobile shell and navigation — implemented on PR #115

- Fixed bottom navigation with **Mail / Calendar / People**.
- A fourth **CRM** tab appears only when Communications was launched from Setu Flow CRM.
- CRM launch context supports `from=crm` or `source=crm` plus a safe internal `returnTo` path.
- The CRM return path is persisted while the user moves Mail -> Calendar -> People and is cleared when the user returns to CRM.
- Standalone launch context `?app=setu-mail` is preserved while moving between Mail / Calendar / People.
- iOS safe-area bottom padding is handled.
- Unread Mail count is visible on the mobile Mail tab.
- Where the browser/platform supports the Badging API, unread Mail is mirrored to the installed app icon with `setAppBadge` / `clearAppBadge`.
- Desktop Mail/Calendar/Contacts rail remains separate and unchanged in behavior.

Recommended CRM launch form:

`/mail?from=crm&returnTo=/dashboard`

A more specific safe internal return path may be supplied when appropriate.

### Standalone PWA identity — implemented

Dedicated manifest:

`/setu-mail-manifest.webmanifest`

Start URL:

`/mail?app=setu-mail`

Dedicated route metadata is applied to Mail, Calendar and Contacts/People so those routes advertise SETU Mail rather than the generic SETU Flow CRM install identity.

Production icon assets now exist at:

- `/icons/setu-mail-192.png`
- `/icons/setu-mail-512.png`
- `/icons/setu-mail-apple-touch.png`
- `/icons/setu-mail.svg` remains as the vector source

The 512 icon is declared maskable in the SETU Mail manifest. Android shortcuts exist for Mail, Calendar and People.

### Install guidance — implemented

- Android-compatible `beforeinstallprompt` flow is handled on mobile Mail.
- iPhone users get explicit **Share -> Add to Home Screen** guidance.
- Install guidance is not shown when already running standalone.
- A dismissed prompt stays dismissed using local storage.

### People — substantial mobile implementation complete

A dedicated `MobilePeopleWorkspace` now exists without replacing desktop Contacts.

Mobile People provides:

- Outlook-style blue mobile header.
- Search.
- Alphabetical grouped people list.
- Initial/avatar circles.
- Best available secondary identity such as phone/email/company.
- Floating Add Person action.
- Full-screen person detail.
- Full-screen create/edit form.
- Email action into SETU Mail compose.
- Schedule Meeting action into SETU Calendar compose.
- Archive action.
- Existing Contacts API and database model are reused; no duplicate data store was introduced.

### Calendar — Outlook-style mobile agenda implementation now active on PR #115

Mobile Calendar now provides:

- Outlook-style blue mobile header.
- Compact current-week date strip.
- One-tap jump to dates in the strip.
- **Today** / **Tomorrow** labels.
- Forward agenda days, including **No plans yet** empty-day state.
- Compact event rows with start time, duration, title and location/meeting type.
- Join Meeting action when a meeting URL exists.
- Search across event title, notes, location, provider and attendees without changing server lifecycle behavior.
- Floating create action.
- Existing create/edit/delete, conflict handling, attendees, reminders, Zoom/custom/in-person provider behavior and Mail/Lead linking remain on the same `/api/calendar` lifecycle.

### Communications notifications — Batch 4 behavior preserved and extended

PR #115 was recreated directly on verified Batch 4 main, then rebased onto S41-MAIL-009, specifically to preserve newer Communications and Reader-intelligence work.

The shared shell continues to retain:

- `InAppNotificationCenter`.
- Organization/user scoped notification context.
- Unread Mail count.
- 30-second and focus refresh behavior.
- Desktop unread Mail rail badge.
- Batch 4 communication notification routing.

Existing Batch 4 server notification infrastructure already covers inbound Mail and Calendar reminders through the shared web-push stack. No second push backend is being introduced.

Communication pushes now carry the dedicated SETU Mail icon. The root service worker honors a notification-provided icon/badge and falls back to the generic Setu Flow icon for other CRM alerts, so Communications can be SETU Mail branded without rebranding unrelated CRM notifications.

## UX target

Use Outlook Mobile as the interaction reference, not as a pixel-for-pixel copy.

Primary mobile bottom navigation:

1. Mail
2. Calendar
3. People
4. CRM only for CRM-origin Communications sessions

### Mail target

- Opens to Inbox by default.
- Compact Outlook-like top hierarchy.
- Search and folder access one tap away.
- Reader is a focused full-screen mobile surface.
- Compose is full-screen.
- Existing folders, move, rules, signatures, attachments, mailbox switching, rich text, Setu Guru and CRM context must remain functional.
- Do not fake Focused/Other categories unless real product logic exists.

### Calendar target

The first Outlook-style agenda pass is now implemented. Remaining Calendar work is device-level polish and regression validation only unless testing exposes a real gap.

### People target

The first dedicated mobile implementation is already present. Remaining polish should focus on real user avatar/profile integration, more compact spacing, and any final interaction parity discovered during device testing.

## Push / notifications next work

Reuse the existing Setu Flow service worker and `push_subscriptions` infrastructure.

Do not create another push backend.

The remaining mobile-specific notification work should be:

1. Provide a visible mobile notification-permission affordance because the desktop top bar is hidden below the mobile breakpoint.
2. Reuse the existing browser push subscription flow and preference model.
3. Keep Batch 4 communication types and deep links authoritative.
4. Keep general CRM operational notifications out of the standalone communications experience unless explicitly enabled later.
5. Real-device test background delivery with SETU Mail closed/backgrounded.

Communication push targets include:

- New inbound mail / reply received.
- Calendar invitation/change/cancellation where notification dispatch exists.
- Meeting reminders.

Notification click-through must continue to validate authenticated access and deep-link to the relevant message/event.

## Regression coverage

`tests/mail/mobile-communications-shell.test.mjs` and `tests/mail/mobile-session-notifications.test.mjs` are intentionally under `tests/mail` so the mobile contracts execute as part of `npm run test:mail` and therefore as part of the production build.

`tests/calendar/mobile-outlook-agenda.test.mjs` runs under the Calendar regression suite.

Coverage includes:

- Dedicated SETU Mail manifest and standalone start URL.
- Mail / Calendar / People shortcuts.
- Production PNG icon presence and maskable manifest declaration.
- Route-aware SETU Mail metadata.
- CRM return context and safe return path behavior.
- Standalone context preservation.
- Mobile safe-area bottom navigation.
- Mobile unread Mail tab badge.
- Installed-app Badging API behavior.
- Dedicated People mobile/desktop split.
- People Email/Meeting/Archive actions.
- Android install prompt and iPhone Add-to-Home-Screen guidance.
- Supabase SSR/cookie-session contract and active-session refresh path.
- Background service-worker push path that does not require an open UI.
- SETU Mail push icon with generic CRM fallback.
- Outlook-style Calendar date strip, agenda labels, empty-day state, search and lifecycle preservation.

## Verified Preview checkpoints

- Earlier mobile shell Preview at `ae305ad432bfe510fd3803d21d2cbef07a6bddf7` reached **READY** with Mail/Calendar regressions and Next.js compile completing.
- Rebased Preview `cf7ae31023980a4a6beb11ed3f80df95aa6c959c` on top of S41-MAIL-009 also reached **READY**.
- Later Calendar / notification / badge heads must receive their own exact-head Preview validation before any merge.

## Parallel-development rule

Do not merge PR #115 while active Mail / Calendar completion work is still changing shared files.

Before final merge:

1. Fetch the latest verified `main`.
2. Recreate/rebase this mobile work on that exact head if main has advanced.
3. Preserve newer functional behavior from main in every shared-file conflict.
4. Run `npm run test:mail`.
5. Run `npm run test:calendar`.
6. Run strict type validation / production build.
7. Test iPhone-width and Android-width layouts.
8. Test direct standalone launch and CRM-origin launch separately.
9. Test sign-in persistence across PWA close/reopen and phone/browser restart where the platform allows it.
10. Test notification permission, background push, lock-screen notification and deep link on real supported devices with SETU Mail not in the foreground.
11. Verify exact-head Vercel Preview before merge.

## Shared files most likely to conflict

- `src/components/layout/mail-product-shell.tsx`
- `src/features/mail/components/mobile-setu-mail-workspace.tsx`
- `src/features/calendar/components/mobile-calendar-workspace.tsx`
- `src/features/contacts/components/contacts-workspace.tsx`
- `src/lib/notifications/communication-notification-service.ts`
- `public/sw.js`

Prefer isolated mobile components composed from these surfaces rather than rewriting business logic.

## Remaining controlled batches

### Mobile Batch B — Mail Outlook-style polish

Delay invasive Mail workspace changes while active Mail Reader-intelligence work is moving. When stable:

- Compact Inbox header.
- Cleaner message rows: unread state, sender, subject, preview, timestamp.
- Full-screen Reader refinement.
- Full-screen Compose refinement.
- Touch-tuned folder drawer and mailbox switcher.
- Preserve all Batch 4+ notification and CRM-intelligence behavior.

### Mobile Batch C — Calendar final polish

The primary Outlook-style agenda pass is implemented. Remaining work:

- Device-level spacing/touch validation.
- Verify long event titles, dense days, all-day events and small-screen behavior.
- Preserve every authoritative Calendar lifecycle behavior.

### Mobile Batch D — People final polish

- Replace temporary profile chip with actual signed-in user/avatar where practical.
- Device-level spacing and keyboard testing.
- Confirm create/edit/archive, Email and Meeting actions on small phones.

### Mobile Batch E — Mobile notification onboarding

- Visible Enable Notifications affordance on mobile.
- Reuse existing web push registration/preferences.
- Confirm background push while app is closed/backgrounded.
- Confirm SETU Mail icon on communication pushes.
- Confirm unread app badge behavior where browser/platform support allows it.

## Acceptance criteria

- Mobile Mail, Calendar and People switch in one tap from the fixed bottom bar.
- Standalone home-screen launch opens Mail directly.
- Standalone launch does not expose the full CRM shell by default.
- CRM-origin launch provides an obvious route back to CRM.
- Closing/reopening SETU Mail does not sign the user out under normal conditions.
- Background push does not require the Mail UI to remain open.
- Explicit logout/security revocation still ends the session correctly.
- Desktop Mail / Calendar / Contacts remain regression-safe.
- Existing Mail and Calendar behavior remains authoritative.
- No duplicate backend, mailbox store, calendar store, auth stack or push stack is introduced.
- iOS safe areas and Android install behavior are handled.
- Production PNG app/icon assets are used.
- Exact-head Preview is verified before merge.
- Formal combined Mail + Calendar UAT remains governed by the main completion plan and is not pulled forward by this mobile work.
