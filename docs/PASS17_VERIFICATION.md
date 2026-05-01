# Pass 17 — Dependency Restoration + Verification Follow-up

Date: 2026-05-01

## Objective

Pass 17 was opened to restore a clean dependency environment after Pass 16, run the required verification commands, and keep the Internal DCC/README/release readiness docs honest before claiming a buyer-confidence lift.

## Baseline read first

`public/internal-dcc/index.html` was read first and remained the single source of truth. The Pass 16 baseline stated:

- Buyer confidence: ~97.5/100.
- `npm run test:all` had previously stopped at `tsx: not found`.
- `npm run build` had previously stopped at `next: not found`.
- Buyer confidence should not move toward 98-99 until dependencies are restored and test/build/deploy evidence is clean.

## Dependency remediation applied

- Added `tsx` to `devDependencies` in `package.json`.
- Added the corresponding root package-lock dependency declaration so the missing test runner is visible to package managers.

This addresses the direct Pass 16 test-script defect where `test:all` referenced `tsx` but the project did not declare it.

## Local verification attempted

Required commands were attempted in order from the extracted ZIP baseline.

```bash
npm install
npm ci --ignore-scripts --no-audit --no-fund
npm run test:all
npm run build
```

### Result

The sandbox could not complete `npm install` / `npm ci`; both commands stalled before producing an installable `node_modules` directory. Because `node_modules` was not restored, the required project-local binaries remained unavailable in this environment.

- `npm run test:all` remains blocked locally until dependencies install.
- `npm run build` remains blocked locally until `next` installs.
- No clean local build/test claim is made in this pass.

## Partial verification signal

Using Node 22's built-in TypeScript stripping, `tests/pricing/fx-resolution.helpers.test.ts` was smoke-checked outside the project scripts and completed successfully with 19 passing assertions. This is a useful smoke signal only; it is not a replacement for the required `npm run test:all` command.

## Vercel / Supabase status

- No Supabase data was mutated.
- No remediation migrations were applied.
- Vercel deployment proof was not claimed because the local dependency install/build gate did not close first.

## Readiness decision

Buyer confidence remains held at ~97.5/100. The Pass 16 UI implementation remains useful and code-present, but customer/investor readiness should not move to 98-99 until:

1. A network-enabled clean environment regenerates/validates dependencies.
2. `npm run test:all` passes.
3. `npm run build` passes.
4. Vercel deployment/build evidence is captured.

## Next recommended pass

Pass 18 should run in a network-enabled Node 22/npm 10 environment, regenerate a complete lockfile if needed, run the required commands, fix any surfaced TypeScript/build issues, and only then update buyer confidence.
