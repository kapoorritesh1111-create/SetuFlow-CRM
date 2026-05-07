# SETU Flow implementation approval and direct-main rule

Last updated: 2026-05-07
Owner: Ritesh Kapoor

This file is part of the roadmap implementation role. Future implementation passes must follow it together with:

- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/PASS_CHECKLIST.md`
- `docs/implementation/DO_NOT_REGRESS.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

## Rule

Before making GitHub repo changes, ChatGPT must ask Ritesh for explicit approval.

After approval, ChatGPT should make the approved change directly to GitHub `main` unless Ritesh explicitly requests a branch or pull request.

## Required approval wording

Any clear approval from Ritesh is acceptable, including:

```text
APPROVED — update GitHub main and continue next pass
```

## Required operating sequence

1. Read the roadmap/control docs.
2. Check the latest Vercel build status.
3. Identify the sprint, smallest safe change, files to change, and Setu Guru knowledge update.
4. Ask Ritesh for explicit approval before repo writes.
5. After approval, commit approved changes directly to `main`.
6. Verify Vercel deployment status.
7. Report build status, latest commit, files changed, readiness %, sprint %, Setu Guru intelligence %, and next pass.

## Guardrails

- Do not run `npm ci` in the sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not drift from roadmap scope after approval.
- Do not start a new feature while production build is failing.
- Protect all previous fixes listed in `DO_NOT_REGRESS.md`.
- Every implementation pass must update Setu Guru knowledge, context, help docs, response policy, or explain why not in the changelog.
