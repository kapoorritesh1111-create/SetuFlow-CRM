# Repo Cleanup Recommendations

This file lists what to delete, archive, or keep after PR-35.

## Delete now

These files are generated or one-off patch artifacts and should not remain in the canonical repo baseline:

- `pr26_update.py`
- `update_batch6.py`
- `tsconfig.tsbuildinfo`
- `*.out`
- transient install/build/test logs

## Archive or consolidate soon

These are useful historical references, but they should not compete with the DCC and current release docs as active truth surfaces:

- `docs/Current Schema.md`
- `docs/ARCHITECTURE_DIAGRAM.md` if it duplicates `docs/ARCHITECTURE.md` and the DCC
- older planning files in `docs/Archive/`
- any superseded release note or readiness memo that says less than:
  - `public/internal-dcc/index.html`
  - `docs/RELEASE_READINESS.md`
  - `docs/PR_TRACKER.md`

Recommended action:

- archive historical planning and superseded snapshots under a clearly labeled archive path
- keep one current architecture explanation, one current readiness explanation, and one current buyer/investor readiness surface
- avoid leaving generated artifacts checked in unless they are intentionally part of release proof

## Keep and actively maintain

- `README.md`
- `public/internal-dcc/index.html`
- `docs/WORKFLOW_DIAGRAM.md`
- `docs/ARCHITECTURE.md`
- `docs/RELEASE_READINESS.md`
- `docs/BUYER_DEMO_SCRIPT.md`
- `docs/BUYER_JOURNEY_VERIFICATION.md`
- `docs/INTEGRATION_PROOF.md`
- `docs/AI_GUARDRAILS.md`
- `docs/SECURITY_HARDENING.md`
- `NEXT_PROMPT.md`

## Cleanup principle

The repo should have:

- one internal readiness truth surface
- one current workflow explanation
- one current architecture explanation
- one current release-readiness explanation
- one current buyer/investor demo explanation
- one current security-hardening explanation

Anything else should be either archived, deleted, or explicitly labeled as historical.
