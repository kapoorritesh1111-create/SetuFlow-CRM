# Mobile App Notes

_Last updated: 2026-05-05_

The mobile app is a phone-first operating layer for SETU Flow. It supports signed-in field work without replacing the desktop workspace.

## Routes

| Route | Purpose |
| --- | --- |
| `/mobile` | Standalone mobile dashboard entry. |
| `/mobile/leads` | Mobile lead list and role-aware summaries. |
| `/mobile/capture` | Business-card/lead capture surface. |
| `/mobile/quote` | Mobile quote quick access. |
| `/mobile/notifications` | Mobile notifications shell. |
| `/mobile/settings` | Mobile settings shell. |
| `/dashboard` and `/leads` | Canonical signed-in routes render the mobile shell on phone viewports while preserving desktop layouts on larger screens. |

## Required behavior

- Preserve signed-in identity in canonical mobile surfaces.
- Keep **Share vCard** available from the mobile navigation/card flow.
- Do not replace desktop workspaces; phone layouts should be responsive overlays or route-group-specific shells.
- Keep feature flag checks wired through `src/features/mobile/lib/mobile-feature-flag.ts`.
- Business-card scan must show safe readiness state without exposing secrets.

## Scan and vCard flows

- Business-card scan provider setup lives in `docs/MOBILE_SCAN_PRODUCTION.md`.
- Contact exchange routes remain under `src/app/(app)/contact-exchange/`.
- Share vCard is part of the signed-in mobile experience and should remain visible in mobile navigation/tests.

## Reference HTML policy

Previous static mobile blueprint/reference HTML pages were removed during cleanup. Future mobile changes should be documented here and proven through React source/tests, not static HTML handoff files.
