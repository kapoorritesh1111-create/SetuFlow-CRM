# Guest session + guest Chat (S33-GUEST-009) + Docs Hub tabs (S33-DOC-011)

ALL DB CHANGES ARE ALREADY APPLIED LIVE (tables guest_links, guest_chat_messages + member-select RLS).

## A) Docs Hub tabs  (S33-DOC-011)
/smc/wiki is now a tabbed workspace (WikiWorkspace): Documentation (embedded docs, full height) /
Share links (the existing table) / Guest access. Reclaims the vertical space the share table used to eat.

## B) Guest session + guest Chat  (S33-GUEST-009)
Locked design, built with maximal reuse:
- Entry: /guest/<token> (added to middleware PUBLIC_PREFIXES). A SETU-branded shell with 3 tabs:
  - Documentation - READ-ONLY, via the proven docs shared-mode token (no new docs code).
  - QA testing   - READ-WRITE, embeds /qa/run/<paired qa token> (an all-suites tester link minted
    alongside the guest link; reuses the whole existing tester flow incl. screenshots/findings).
  - Chat         - a PRIVATE, ISOLATED guest channel (dedicated table). It can never reach
    #engineering / #incidents because it isn't part of the SMC chat at all.
- Guest chat is token-validated server actions via service role, RATE LIMITED (<=8 guest msgs/60s,
  2000-char cap). Polls every 10s for team replies.
- Internal side: Docs Hub -> "Guest access" tab. Mint (name, email, expiry 3/7/14/30, default 7),
  copy the /guest/<token> link, see uses/status, revoke (also revokes the paired QA link), and
  read/reply to each guest's chat thread inline.

## Security posture
- No new anonymous RLS. Guest reads/writes go through service-role server actions AFTER validating
  the (unguessable UUID) token's revoked/expiry state. SMC reads use member-select RLS.
- Revoking a guest link immediately stops docs, QA and chat (and revokes the paired QA token).

## Apply / verify
Overwrite the files (paths preserved), `tsc --noEmit`, deploy.
1. Docs Hub: /smc/wiki shows three tabs; Documentation is full-height; Guest access mints a link.
2. Open /guest/<token> incognito: Documentation (read-only), QA testing (submit a run), Chat (send
   a message). MOST WORTH VERIFYING: guest chat send + the 10s poll + team reply from SMC appearing
   in the guest view, and the rate limit. Then revoke and confirm /guest/<token> is blocked.
