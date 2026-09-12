# SETU Mail Mobile App — Parallel Work Handoff

Updated: 2026-09-12
Active branch: `feat/setu-mail-mobile-app-20260912`
Draft PR: `#115`
Verified base checkpoint: `90b3071ad0da633f9849e84297b75f89538f33ad` — Batch 4 unified Communications notifications and Calendar autocomplete
Superseded branch/PR: `feat/setu-communications-mobile-shell` / `#113` — closed, do not merge

## Goal

Turn the existing Setu Mail / Calendar / Contacts experience into an Outlook-like mobile communications app that can be installed on iPhone and Android while continuing to use the same Setu Flow backend, authentication, organization model, mailboxes, calendar, contacts, CRM linking, notifications, Zoom integration, reminders, recurrence, and Setu Guru capabilities.

This is not a second backend and must not fork business logic from the desktop product.

## Current implementation status

### Mobile shell and navigation — implemented on PR #115

- Fixed bottom navigation with **Mail / Calendar / People**.
- A fourth **CRM** tab appears only when Communications was launched from Setu Flow CRM.
- CRM launch context supports `from=crm` or `source=crm` plus a safe internal `returnTo` path.
- The CRM return path is persisted while the user moves Mail -> Calendar -> People and is cleared when the user returns to CRM.
- Standalone launch context `?app=setu-mail` is preserved while moving between Mail / Calendar / People.
- iOS safe-area bottom padding is handled.
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

### Communications notifications — Batch 4 behavior preserved

PR #115 was recreated directly on verified Batch 4 main specifically to preserve the newer Communications notification work.

The shared shell continues to retain:

- `InAppNotificationCenter`.
- Organization/user scoped notification context.
- Unread Mail count.
- 30-second and focus refresh behavior.
- Desktop unread Mail rail badge.
- Batch 4 communication notification routing.

Existing Batch 4 server notification infrastructure already covers inbound Mail and Calendar reminders through the shared web-push stack. Do not build a second push system for SETU Mail.

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

- Mobile-first agenda/list view similar to Outlook Mobile.
- Compact date strip / month affordance.
- Today / Tomorrow / subsequent-day grouping.
- Clear event rows/cards with time, title, meeting state and join action.
- Floating create action.
- Preserve create/edit, invitation delivery, Zoom, recurrence, reminders, all-day, attendee, visibility, conflict and 24-hour behavior.

### People target

The first dedicated mobile implementation is already present. Remaining polish should focus on real user avatar/profile integration, more compact spacing, and any final interaction parity discovered during device testing.

## Push / notifications next work

Reuse the existing Setu Flow service worker and `push_subscriptions` infrastructure.

Do not create another push backend.

The next mobile-specific notification work should be:

1. Provide a visible mobile notification-permission affordance because the desktop top bar is hidden below the mobile breakpoint.
2. Reuse the existing browser push subscription flow and preference model.
3. Keep Batch 4 communication types and deep links authoritative.
4. Let the service worker use a notification-provided icon when available so SETU Mail notifications can show the SETU Mail icon while other CRM alerts retain the generic Setu Flow icon.
5. Keep general CRM operational notifications out of the standalone communications experience unless explicitly enabled later.

Communication push targets include:

- New inbound mail / reply received.
- Calendar invitation/change/cancellation where notification dispatch exists.
- Meeting reminders.

Notification click-through must continue to validate authenticated access and deep-link to the relevant message/event.

## Regression coverage

`tests/mail/mobile-communications-shell.test.mjs` is intentionally under `tests/mail` so the mobile contracts execute as part of `npm run test:mail` and therefore as part of the production build.

Coverage includes:

- Dedicated SETU Mail manifest and standalone start URL.
- Mail / Calendar / People shortcuts.
- Production PNG icon presence and maskable manifest declaration.
- Route-aware SETU Mail metadata.
- CRM return context and safe return path behavior.
- Standalone context preservation.
- Mobile safe-area bottom navigation.
- Dedicated People mobile/desktop split.
- People Email/Meeting/Archive actions.
- Android install prompt and iPhone Add-to-Home-Screen guidance.

## Verified Preview checkpoint

The exact-head Preview for commit `ae305ad432bfe510fd3803d21d2cbef07a6bddf7` reached **READY** after:

- Mail regression stage completed far enough for the build to proceed.
- Calendar regression suite passed 54/54.
- Next.js production compile succeeded.
- Type validation completed as part of the READY deployment.

Later icon/metadata commits must receive their own exact-head Preview validation before any merge.

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
9. Test notification permission, background push, lock-screen notification and deep link on real supported devices.
10. Verify exact-head Vercel Preview before merge.

## Shared files most likely to conflict

- `src/components/layout/mail-product-shell.tsx`
- `src/features/mail/components/mobile-setu-mail-workspace.tsx`
- `src/features/calendar/components/mobile-calendar-workspace.tsx`
- `src/features/contacts/components/contacts-workspace.tsx`

Prefer isolated mobile components composed from these surfaces rather than rewriting business logic.

## Remaining controlled batches

### Mobile Batch B — Mail Outlook-style polish

Delay invasive Mail workspace changes while the active Mail Reader-intelligence branch is moving. When stable:

- Compact Inbox header.
- Cleaner message rows: unread state, sender, subject, preview, timestamp.
- Full-screen Reader refinement.
- Full-screen Compose refinement.
- Touch-tuned folder drawer and mailbox switcher.
- Preserve all Batch 4+ notification and CRM-intelligence behavior.

### Mobile Batch C — Calendar Outlook-style polish

When current Calendar work is stable:

- Date strip / compact month affordance.
- Today / Tomorrow grouping.
- Improved agenda event cards.
- Keep floating create action.
- Preserve every authoritative Calendar lifecycle behavior.

### Mobile Batch D — People final polish

- Replace temporary profile chip with actual signed-in user/avatar where practical.
- Device-level spacing and keyboard testing.
- Confirm create/edit/archive, Email and Meeting actions on small phones.

### Mobile Batch E — Mobile notification onboarding

- Visible Enable Notifications affordance on mobile.
- Reuse existing web push registration/preferences.
- SETU Mail icon for communication pushes where payload-supported.
- App badge/unread behavior where browser/platform support allows it.

## Acceptance criteria

- Mobile Mail, Calendar and People switch in one tap from the fixed bottom bar.
- Standalone home-screen launch opens Mail directly.
- Standalone launch does not expose the full CRM shell by default.
- CRM-origin launch provides an obvious route back to CRM.
- Desktop Mail / Calendar / Contacts remain regression-safe.
- Existing Mail and Calendar behavior remains authoritative.
- No duplicate backend, mailbox store, calendar store, auth stack or push stack is introduced.
- iOS safe areas and Android install behavior are handled.
- Production PNG app/icon assets are used.
- Exact-head Preview is verified before merge.
- Formal combined Mail + Calendar UAT remains governed by the main completion plan and is not pulled forward by this mobile work.
