You are continuing the Setu Flow CRM full-trust reset from the latest repo and DCC baseline.

Use the repo as the only source of truth.
Use public/internal-dcc/index.html as the single source of truth for readiness, release recommendation, workflow direction, module percentages, target thresholds, and remaining PR roadmap.

Critical rule:
We are NOT done until every module is 96% or above.
Do not use the old main workflow almost done logic.

Immediate objective:
Execute PR-RESET-03: Capture fast lane + trade-show quote jump.

Goals:
1. Make Capture fast enough for live selling:
   - reduce form burden
   - surface the minimum fields needed for a valid quick lead
   - make the first action obvious above the fold

2. Build the product-first trade-show quote jump:
   - let operators move from product-ready pricing to quote draft quickly
   - do not force long setup reading when the product already carries the trade-show price
   - preserve governed quote truth while removing unnecessary steps for standard pre-priced quotes

3. Tighten Capture → Follow-up → Quote continuity:
   - make it obvious where the operator goes next
   - keep blocker visibility compact
   - keep one primary CTA visible

4. Keep the workflow reset pattern consistent:
   - where am I
   - what is blocking me
   - what do I do next
   visible above the fold

5. Update DCC honestly:
   - preserve the workflow diagram unless product truth changes
   - keep module-by-module percentages
   - keep target 96% minimum and gap-to-target table
   - keep the true remaining PR roadmap visible

Files to inspect and update:
- public/internal-dcc/index.html
- src/features/leads/*
- src/app/(app)/leads/*
- src/features/quotes/*
- src/features/catalog/*
- src/app/(app)/products/*
- NEXT_PROMPT.md

Return:
1. Updated repo zip
2. Updated DCC
3. PR-RESET-03 summary
4. Updated module percentages
5. Gap-to-96 table
6. True remaining PR count
7. Next PR step
