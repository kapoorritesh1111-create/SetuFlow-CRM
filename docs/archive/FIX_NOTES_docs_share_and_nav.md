# Fixes — docs share link sign-in, copy popup, duplicate nav groups

## What was wrong
1. The share link asked external users to sign in. `/docs/[token]` is a Next route and
   was caught by the auth middleware. (The static `/internal/*.html` pages are reachable
   because the middleware doesn't gate them — which is why the legacy Share Doc link works.)
2. `/docs/[token]` also iframed the docs app *without* the share token, so even past the
   gate it wouldn't enter shared mode (it would show the internal nav / sign-in gate).
3. The "link copied" popup didn't actually copy (silent `navigator.clipboard` + `alert`).
4. The docs sidebar showed duplicate group headers (Business Workflows / Operations /
   Reference) because the nav grouped by adjacent array runs, and later-added topics reuse
   earlier group names.

## What changed
- `middleware.ts`: `/docs/`, `/qa/run/`, `/qa/report/` added to `PUBLIC_PREFIXES`. Each
  route validates its own DB token server-side; no broad data access is opened.
- `src/app/docs/[token]/page.tsx`: validates the tracked `docs_share_links` row
  (revoked/expired) → logs a `docs_share_views` row + increments `use_count` → redirects to
  `/internal/setuflow-docs.html?share_token=<base64 {recipient,expiry,issued}>`. Same proven
  shared-mode experience as the legacy Share Doc link, but tracked and revocable from SMC.
- `src/app/smc/wiki/docs-sharing.tsx`: real `CopyLinkModal` with an explicit **Copy** button
  (clipboard API + `execCommand` fallback), shown on mint and on each link's Copy action.
- `src/app/smc/qa/qa-workspace.tsx`: reuses `CopyLinkModal` for tester/report links.
- `public/internal/setuflow-docs-workspace.js`: `renderNav` now groups topics by name and
  renders each group exactly once.

## Verify after deploy
- Open a minted `/docs/<token>` in a private window → no sign-in, lands on the docs in
  shared mode with the "Shared review workspace · <recipient> · Expires …" banner.
- Revoke the link in SMC → the same URL now shows "isn't available".
- Copy button copies; the SMC list shows views / last-viewed / active vs expired.
- Docs sidebar shows each group once.

## Notes
- The legacy in-app "Share Doc" button still mints untracked client-side base64 links. To
  get every share tracked, consolidate it onto the SMC mint (follow-up).
- The larger "external users as scoped guests inside SMC with Chat" idea is unchanged and
  still recommended as its own PR, with the access boundaries (which Chat, read vs write,
  expiry) decided up front.
