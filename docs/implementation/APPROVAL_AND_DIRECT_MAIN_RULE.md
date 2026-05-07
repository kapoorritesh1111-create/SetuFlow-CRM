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

## One final commit per pass

Each implementation pass should produce exactly one final GitHub commit to `main`.

Required workflow:

1. Prepare the full pass internally first.
2. Review the intended file set before writing.
3. Make one final commit only after the full pass is ready.
4. Let that single commit trigger one Vercel deployment.
5. Verify the single Vercel deployment and report status.

Do not commit file-by-file during normal implementation passes. If an emergency build fix is required after the final commit, state that it is a build-fix exception, keep it minimal, and verify Vercel again.

## Required approval wording

Any clear approval from Ritesh is acceptable, including:

```text
APPROVED — update GitHub main and continue next pass
```

For one-commit passes, preferred approval is:

```text
APPROVED — update GitHub main in one commit and continue next pass
```

## Required operating sequence

1. Read the roadmap/control docs.
2. Check the latest Vercel build status.
3. Identify the sprint, smallest safe change, files to change, and Setu Guru knowledge update.
4. Ask Ritesh for explicit approval before repo writes.
5. After approval, prepare the approved pass completely before committing.
6. Commit the approved pass directly to `main` as one final commit.
7. Verify Vercel deployment status for that commit.
8. Report build status, latest commit, files changed, readiness %, sprint %, Setu Guru intelligence %, and next pass.

## Guardrails

- Do not run `npm ci` in the sandbox.
- Do not put dev/debug notes on user-facing screens.
- Do not drift from roadmap scope after approval.
- Do not start a new feature while production build is failing.
- Protect all previous fixes listed in `DO_NOT_REGRESS.md`.
- Every implementation pass must update Setu Guru knowledge, context, help docs, response policy, or explain why not in the changelog.
- Keep normal passes to one final commit so Vercel receives one deployment trigger per pass.
