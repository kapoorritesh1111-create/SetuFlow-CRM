# Next Prompt — PR-02 Route Truth + Shell Hardening

You are continuing work on the **current Setu Flow CRM cleaned baseline after PR-01**.

## Current truth
- PR-01 is complete.
- Legacy development, workspace mirror, preview, and planning surfaces have been removed.
- Root build/typecheck artifact files have been removed.
- The internal DCC at `public/internal-dcc/index.html` is the internal planning and readiness source of truth.
- Route truth is improved, but a **single canonical route manifest** still does not exist.

## Your task
Execute **PR-02 — Route Truth + Shell Hardening** directly against this repo.

### Required outcomes
1. Create a **single canonical route manifest** used by:
   - shell navigation
   - route tests
   - route/status contracts
2. Harden `src/components/layout/app-shell.tsx` by splitting responsibilities into smaller owned modules.
3. Keep pipeline visible as a core route in shell truth.
4. Remove any remaining route/config drift.
5. Refresh the internal DCC to reflect PR-02 progress.
6. Return the **updated repo zip** and the **next prompt** again.

## Constraints
- Treat this repo as the only source of truth.
- Do not reintroduce any `/development`, `/workspace`, `/previews`, or `/planning` production surfaces.
- Keep the DCC internal-only.
- Be direct and implementation-focused.

## Return format
1. Updated repo zip
2. Summary of PR-02 changes
3. Updated readiness %
4. Updated PR tracker snapshot
5. Updated sprint status
6. Next prompt for the following pass
