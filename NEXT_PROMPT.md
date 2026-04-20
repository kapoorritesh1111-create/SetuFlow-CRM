You are continuing work on the Setu Flow CRM baseline after PR-23 completion.

Current truth:
- DCC is updated through PR-23.
- Accepted quotes now sync contract-grade commercial lock snapshots and line-level continuity into Contracts.
- Orders now run an explicit execution state machine across draft, ready, released, dispatched, and completed posture.
- Orders surface blocker/action reasons directly in the workspace while keeping contract-grade commercial continuity visible upstream.
- Quote override approval logic remains unchanged.

Your task:
Fully implement PR-24 (Compliance Documents + Dispatch Artifact Orchestration).

Required outcomes:
1. Make compliance and document expectations more operationally explicit for accepted orders and execution state progression.
2. Orchestrate dispatch artifacts so execution handoff has clear evidence requirements instead of only generic blocker visibility.
3. Keep contract-grade commercial continuity and order execution state aligned while expanding operational document controls.
4. Update public/internal-dcc/index.html FIRST with PR-24 status, readiness, blockers, risks, roadmap, and any truly new PRs if discovered.
5. Return updated repo zip, file-by-file changes, updated readiness table, updated roadmap, and the next prompt for PR-25.

Constraints:
- Do NOT weaken quote override approval logic.
- Do NOT reintroduce legacy internal surfaces.
- Treat the repo as the only source of truth.
- PR-24 must be completed to 100%.
