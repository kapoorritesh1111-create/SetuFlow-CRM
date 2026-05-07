# SETU Flow Implementation Decision Changelog

This log records important implementation decisions so future chats and passes can continue without drift.

---

## 2026-05-07 — Current production baseline

Decision:

- Treat the latest Vercel READY production commit as the working baseline unless Ritesh explicitly locks a different commit.
- Sprint 1 and Sprint 2 are complete at 100%.

Reason:

- Production is now advancing through small approved one-commit passes on `main`.

---

## 2026-05-07 — HSN questions must use live research and catalog review

Decision:

- Setu Guru HSN questions like “what is HSN code for vacuum cooked banana chips” must route to live org search/research, not static Products help.
- `isSetuGuruOrgSearchQuestion()` now treats HSN/HS code, tariff, duty, document requirement, and margin benchmark questions as live org/research questions.
- `/api/setu-guru/org-search` now checks the matching catalog product for HSN research questions.
- For banana chips, Setu Guru returns draft candidate HSN `2008.99.99`, checks the catalog HSN for the matched Banana Chips product, and asks for human approval before any catalog update if the value is missing or different.
- No write-back endpoint was added in this pass.

Files:

- `src/lib/setu-guru/guru-response-policy.ts`
- `src/lib/setu-guru/live-research.ts`
- `src/app/api/setu-guru/org-search/route.ts`
- `tests/setu-guru.test.mjs`
- `docs/help/setu-guru.md`
- `docs/implementation/SETU_FLOW_MASTER_ROADMAP.md`
- `docs/implementation/CHANGELOG_DECISIONS.md`

Reason:

- The screenshot showed Setu Guru answering an HSN question with generic Products help.
- Ritesh expects Setu Guru to research the HSN, check whether Banana Chips already has the correct catalog HSN, and ask for approval before changing product data.

Build:

- BUILDING / pending after this pass
- Baseline before pass: `324491837b1000349ecba6cc0ac83a19418cb3a9`

---

## Previous decisions retained by roadmap

Older detailed decisions remain in Git history and in the roadmap/control docs. Continue following:

- approval before GitHub writes,
- one final commit per approved pass,
- no `npm ci` in sandbox,
- no user-facing debug notes,
- no write-back without explicit human approval,
- Sprint 1 and Sprint 2 remain 100% complete.
