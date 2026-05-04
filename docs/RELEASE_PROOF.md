# Release Proof

Current proof baseline: clean current repository baseline.

## Verification commands

```text
npm test
66/66 tests passed
```

The `release:proof` command remains wired through `package.json` and the route manifest contract.

## Proof scope

- Public onboarding form is unauthenticated.
- Onboarding submission persists through the public API route.
- Admin notification handoff points to the admin onboarding setup route and can be resent from the admin command center.
- Admin onboarding remains protected.
- Workspace URL format is `companyname.setuflowcrm.com`.
- Default workflow setup data is editable/removable by admin.
- Product categories remain client-created.
- Internal DCC and reference HTMLs are current.
- Old archive and retired files are removed from the active repo.
