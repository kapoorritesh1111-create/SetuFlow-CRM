# Repo Cleanup Recommendations

This file lists what to delete, archive, or keep after the current review.

## Delete now

These files appear to be one-off patch scripts and should not remain in the canonical product repo:

- `pr26_update.py`
- `update_batch6.py`

## Archive or consolidate soon

These are likely historical planning/reference files. They should not compete with the internal DCC and current docs as active truth surfaces:

- `docs/master-plan.md`
- `docs/REWORK_PLAN.md`
- `docs/PRODUCT.md`
- `docs/Current Schema.md`

Recommended action:

- either move them into an `/archive` folder
- or merge any still-useful content into `README.md`, `docs/ARCHITECTURE.md`, and `public/internal-dcc/index.html`

## Keep

These should stay and remain actively maintained:

- `README.md`
- `public/internal-dcc/index.html`
- `docs/WORKFLOW_DIAGRAM.md`
- `docs/ARCHITECTURE.md`
- `docs/RELEASE_READINESS.md`
- `docs/BUYER_DEMO_SCRIPT.md`
- `docs/DEMO_DATA_AUDIT.md`
- `NEXT_PROMPT.md`
- `docs/SOP_RUNBOOK_INDEX.md`
- `docs/RELEASE_PROOF.md`

## Cleanup principle

The repo should have:

- one internal readiness truth surface
- one current workflow document
- one current architecture document
- one current release-readiness document
- one current buyer/investor demo script

Anything else should be either archived or explicitly labeled as historical.
