You are continuing the Setu Flow CRM full-trust reset from the latest repo and DCC baseline.

Use the repo as the only source of truth.
Use public/internal-dcc/index.html as the single source of truth for readiness, release recommendation, workflow direction, module percentages, target thresholds, and remaining PR roadmap.

Critical rule:
We are NOT done until every module is 96% or above.
Do not use old almost-done logic.
Do not change the workflow diagram image in DCC unless the workflow actually changes in repo code.

Immediate objective:
Execute PR-RESET-07: capture and setup convergence.

Goals:
1. Finish the remaining below-target modules together:
   - Capture
   - Settings / Lists
   - Admin / Organization

2. Compress the real operator path further:
   - make capture feel immediate above the fold
   - reduce setup/admin reading even more
   - keep one obvious next action visible first

3. Preserve the PR-RESET-06 AI pattern:
   - keep compact first answer
   - keep deeper explanation collapsed
   - keep AI advisory only

4. Do not degrade the already-cleared modules:
   - Quote
   - Approval / Send
   - Orders / Execution
   - Pipeline / Risks
   - Dashboard
   - Trade workflow
   - AI

5. Update DCC honestly:
   - preserve workflow diagram image unless workflow truth changes
   - keep module-by-module percentages
   - keep target 96% minimum and gap-to-target table
   - keep the true remaining PR roadmap visible

Files to inspect and update:
- public/internal-dcc/index.html
- src/features/leads/*
- src/features/settings/*
- src/features/admin/*
- src/features/ai* only if required to support the remaining modules
- NEXT_PROMPT.md

Return:
1. Updated repo zip
2. Updated DCC
3. PR-RESET-07 summary
4. Updated module percentages
5. Gap-to-96 table
6. True remaining PR count
7. Next PR step
