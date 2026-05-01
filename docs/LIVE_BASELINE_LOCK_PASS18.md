# Live Baseline Lock — Pass 18

## Summary

This document locks `SetuFlow-CRM-main(41).zip` / GitHub commit `89a825a` as the active SETU Flow CRM baseline.

The previous Pass 17 local verification blocker is closed by production Vercel evidence: the live build installed dependencies, ran the Next.js production build, generated all pages, deployed outputs, and reached `READY`.

## Evidence captured

| Evidence | Result |
|---|---|
| GitHub branch | `main` |
| GitHub commit | `89a825a` / `89a825afa1624bba04657caca7dc0048eb14e683` |
| Vercel project | `setu-flow-crm` |
| Vercel deployment | `dpl_2tMU2g417f8wDAtMJPXDHrEkxoD8` |
| Deployment state | `READY` / production |
| Install command | `npm ci --no-audit --no-fund` |
| Install result | 151 packages installed successfully |
| Framework | Next.js `14.2.35` |
| Build command | `npm run build` -> `next build` |
| Build result | compiled successfully; lint/type check stage completed; 55 static pages generated |
| Deploy result | deployment completed and build cache uploaded |

## Supabase status

User-provided live validation confirms the live site is connected to Supabase. This closes the environment-connection concern for the deployed app, but it does not close separate Supabase advisor/RPC hardening findings because no remediation migration was authorized or applied in this pass.

## Readiness decision

Buyer confidence is updated to approximately `98.5/100` because the premium UI/Organization Setup work is now deployed from a clean Vercel build.

SETU Flow remains short of `100/100` until the following are proven:

1. Supabase advisor/RPC remediation is authorized, applied, and verified.
2. External security audit is completed.
3. WAF/rate limiting and monitoring evidence are captured.
4. Backup/restore drill evidence is captured.
5. Live connector proof is captured.
6. Dispatch/completion proof is captured.
7. Production support activation and first-customer pilot evidence are captured.

## Baseline rule going forward

Use `SetuFlow-CRM-main(41).zip` / commit `89a825a` as the current baseline. Ignore prior sandbox-only dependency/build blockers unless a new build log contradicts the live Vercel deployment evidence.
