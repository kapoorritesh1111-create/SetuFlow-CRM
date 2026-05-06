# Release Proof

_Last updated: 2026-05-05_

Use this file to capture proof for each release candidate.

## Required proof commands

```bash
npm test
npm run clean:verification
npm run verify
npm run build
```

The `verify` script must continue to include `clean:verification` before build/release handoff.

## Cleanup proof expectations

- No static reference HTML directories/files are present in the active package.
- No `supabase/.temp/` local CLI state is present.
- Mobile docs resolve under `docs/MOBILE.md` and `docs/MOBILE_SCAN_PRODUCTION.md`.
- README includes the latest live Supabase review summary before claiming schema readiness.

## Proof log template

| Check | Result | Notes |
| --- | --- | --- |
| `npm test` | Passed | 69/69 Node smoke tests passed during cleanup package verification. |
| `npm run clean:verification` | Passed | Verification artifacts are clean. |
| `npm run verify` | Not run in cleanup sandbox | Requires full typecheck/build dependency context. |
| `npm run build` | Not run in cleanup sandbox | Run in Vercel/CI or a full local dependency-installed environment. |
| Supabase advisor review | Reviewed | Follow-up hardening remains. |

## release:proof

The release proof flow should stay source-controlled and repeatable. Do not replace it with static HTML screenshots or manual-only notes.
