# Release Readiness

_Last updated: 2026-05-05_

## Current readiness

| Gate | Status | Notes |
| --- | --- | --- |
| Repo cleanup | Ready | Static reference HTMLs, local Supabase temp state, duplicate root mobile docs, and one-off patch scripts were removed. |
| Documentation consolidation | Ready | README and active docs now point to Markdown/source/tests as the package truth. |
| Supabase reviewed | Ready for documentation | Live schema and advisors were reviewed before README update. No DDL was changed. |
| Mobile docs/tests | Ready for smoke tests | Mobile docs now live under `docs/`; Share vCard and signed-in identity remain required behavior. |
| Database security hardening | Follow-up required | RLS policies, security-definer exposure, function search paths, and Auth leaked-password protection need dedicated hardening. |
| Full build | Requires CI/local dependency install | Run `npm run verify` and `npm run build` in a normal dependency-installed environment. |

## Reference HTML status

Reference HTML handoff pages are intentionally removed from the active package for now. Do not restore them unless a future sprint explicitly reintroduces generated/static reference artifacts.

## Release commands

```bash
npm test
npm run clean:verification
npm run verify
npm run build
```

## Definition of ready

A release candidate is ready only when:

1. smoke tests pass,
2. clean verification passes,
3. TypeScript/build pass in CI or local dev,
4. Supabase security advisor items are accepted or addressed for the target release,
5. docs match the live schema and route behavior.
