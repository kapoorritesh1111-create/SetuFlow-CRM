# PR-NS-09 Continuation Prompt

Continue from the PR-NS-08 hardened baseline. Treat the current repository as the single source of truth.

Priorities:
1. Run a full Vercel-equivalent build check.
2. Validate Catalog -> Quote line item persistence from drawer/wizard reopen/edit flows.
3. Validate Quote -> Order creation with copied line items and preserved quote versions.
4. Validate Order document uploads, metadata persistence, and dispatch readiness computation.
5. Validate Pipeline drag/drop stage persistence after refresh, including sort order and rollback.
6. Close remaining UX parity gaps against the HTML reference without breaking schema/RLS.

Required return:
- Full updated repo zip
- Internal DCC update
- Readiness percentages
- Next prompt for PR-NS-10
