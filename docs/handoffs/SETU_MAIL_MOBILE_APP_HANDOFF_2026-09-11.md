# SETU Mail Mobile App — Parallel Work Handoff

Date: 2026-09-11
Branch: `feat/setu-communications-mobile-shell`
Base checkpoint: `7dd2c3d134e64122387cfd2ed374f64570bd0807`

## Goal

Turn the existing Setu Mail / Calendar / Contacts experience into an Outlook-like mobile communications app that can be installed on iPhone and Android while continuing to use the same Setu Flow backend, authentication, organization model, mailboxes, calendar, contacts, CRM linking, notifications, Zoom integration, reminders, recurrence, and Setu Guru capabilities.

The mobile app is not a second backend and must not fork business logic from the desktop product.

## UX target

Use Outlook Mobile as the interaction reference, not as a pixel-for-pixel copy.

Primary bottom navigation:

1. Mail
2. Calendar
3. People
4. CRM only when the communications module was launched from Setu Flow CRM

The selected area should be obvious, touch targets should be at least mobile-friendly size, and the navigation must remain fixed above the safe-area inset.

### Mail

- Opens to Inbox by default.
- Outlook-like compact top bar and message list hierarchy.
- Search and folder access stay one tap away.
- Reader opens as a focused mobile surface.
- Compose opens full-screen.
- Existing folders, move, rules, signatures, attachments, mailbox switching, rich text, Setu Guru and CRM context must remain functional.

### Calendar

- Mobile-first agenda/list view similar to Outlook's mobile calendar.
- Current date and selected date visible in the header.
- Clear event cards with time, title, meeting state and join action.
- Floating create action is acceptable.
- Existing create/edit, invitation delivery, Zoom, recurrence, reminders, all-day, attendee, visibility and 24-hour behavior must remain intact.

### People

- Rename the mobile-facing Contacts label to People.
- Alphabetical list with avatar/initials, primary display name, and best secondary identity such as company, email or phone.
- Search from the top bar.
- New-contact action should be prominent.
- Contact detail should be mobile-first and preserve email, schedule-meeting and CRM-link actions.

## CRM return behavior

When Setu Mail is opened from CRM mobile, use a launch URL such as:

`/mail?from=crm&returnTo=/dashboard`

or a more specific safe internal return path.

The mobile communications shell stores the fact that the session came from CRM and exposes a fourth `CRM` bottom tab. Mail -> Calendar -> People navigation should preserve this context. Tapping CRM clears the temporary communications return context and returns the user to the safe internal route.

If Setu Mail is opened directly from a home-screen install, do not show the CRM tab by default. This keeps the standalone app focused on communications.

## PWA / installable app

A dedicated manifest has been introduced at:

`/setu-mail-manifest.webmanifest`

with start URL:

`/mail?app=setu-mail`

A Setu Mail icon source has been introduced at:

`/icons/setu-mail.svg`

Before production release, generate and include production PNG assets for at least 192x192, 512x512 and Apple touch icon sizes from the approved Setu Mail artwork. Keep a maskable Android icon with safe padding.

The Setu Mail routes need route-aware metadata so the standalone communications install uses the Setu Mail manifest and Setu Mail icon rather than the generic Setu Flow CRM manifest.

## Push notifications

Reuse the existing Setu Flow service worker / push infrastructure. Do not build a second push stack.

Communications-specific push targets should include:

- New inbound mail
- Reply received
- Calendar invitation
- Calendar change or cancellation
- Meeting reminder

Notification click should deep-link to the relevant mail message or calendar event when an authenticated session is available.

Do not send general CRM operational alerts through the Setu Mail app unless explicitly enabled later.

## Work already started on the branch

- Added `MobileCommunicationsChrome` with Mail / Calendar / People fixed bottom navigation.
- Added conditional CRM return tab driven by `from=crm` / `source=crm` and a safe `returnTo` path.
- Wired the mobile communications chrome into `MailProductShell` without changing desktop rail behavior.
- Added dedicated Setu Mail web app manifest.
- Added vector Setu Mail app-icon source.

## Important parallel-development rule

Do not merge this branch while Mail / Calendar completion work is actively changing shared files on `main`.

Before merge:

1. Fetch latest `main`.
2. Rebase or recreate this work on the latest verified Mail / Calendar head.
3. Resolve shared-file changes by preserving the newer functional behavior from main.
4. Re-run strict type checks and production build.
5. Run Mail and Calendar regression suites.
6. Test mobile behavior at iPhone-width and Android-width breakpoints.
7. Test direct standalone launch and CRM-origin launch separately.
8. Test exact-head Preview deployment before merge.

## Files most likely to conflict with ongoing work

- `src/components/layout/mail-product-shell.tsx`
- `src/features/mail/components/mobile-setu-mail-workspace.tsx`
- `src/features/calendar/components/mobile-calendar-workspace.tsx`
- `src/features/contacts/components/contacts-workspace.tsx`

Prefer adding small isolated mobile components and composing them from these files rather than rewriting the current business logic.

## Remaining implementation batches

### Mobile Batch A — Shell and navigation

- Finish responsive top chrome for Mail / Calendar / People.
- Keep fixed bottom tabs.
- Preserve CRM return context.
- Add route-aware Setu Mail manifest / icon metadata.
- Add regression tests for route selection and CRM return behavior.

### Mobile Batch B — Mail Outlook-style polish

- Compact inbox header.
- Focused/Other only if product logic supports it; do not fake categories.
- Cleaner message rows with unread state, sender, subject, preview and timestamp.
- Full-screen reader.
- Full-screen compose.
- Folder drawer and mailbox switcher tuned for touch.

### Mobile Batch C — Calendar Outlook-style polish

- Date strip / compact month affordance.
- Agenda grouping for Today / Tomorrow / subsequent days.
- Improved event cards.
- Floating create event button.
- Preserve all existing Calendar behaviors.

### Mobile Batch D — People polish

- Outlook-style alphabetical people list.
- Initial/avatar circles.
- Search and add button.
- Mobile contact detail surface.
- Keep CRM linking optional and explicit.

### Mobile Batch E — Install + push

- PNG / maskable / Apple icons.
- Install guidance.
- Notification permission onboarding.
- Mail/calendar deep-link push handling.
- Badge-count behavior where supported.

## Acceptance criteria

- Mobile Mail, Calendar and People can be switched with one tap from the fixed bottom bar.
- Standalone home-screen launch opens Mail directly.
- Direct app launch does not expose the full CRM shell.
- CRM-origin launch provides an obvious way back to CRM.
- Desktop Mail / Calendar / Contacts remain unchanged unless specifically required.
- Existing Mail and Calendar functionality remains regression-safe.
- No duplicate backend, mailbox store, calendar store, auth stack or push stack is introduced.
- iOS safe areas and Android install behavior are handled.
- Exact-head Preview is verified before merge.
- Formal combined Mail + Calendar UAT remains governed by the main completion plan; this mobile work must not pull UAT forward.
