You are a senior full-stack engineer on SETU Flow CRM. Repo attached as zip.

TASK: PR-2 — Catalog HTML Parity + Quote-Readiness Workflow.

DEPENDENCY:
Start from the PR-1 Admin + Settings Unified Workspace repo. Do not start this PR before PR-0 and PR-1 are merged.

REFERENCE HTML TO READ FIRST:
- public/reference-html/setuflow-catalog-redesign.html

GOAL:
Make /products?mode=buyers match the Catalog HTML visually and functionally. Catalog must become the quote-readiness control surface: product data, pricing coverage, variants, trade attributes, and quote blockers are visible before Quote handoff.

REQUIRED VISUAL STRUCTURE:
1. Use shared shell/topbar/filter bar from PR-0.
2. View tabs must read exactly: Products, Pricing, Spreadsheet.
3. Category tabs must include: All, Snacks, Powders, Sweeteners, Onion & Garlic, Freeze-dried, Gaps.
4. Add a 6-stat strip; each stat card filters the table.
5. Product table must support category grouping.
6. Pricing columns must be visible: Ex-Factory, FOB, CIF.
7. Rows must show gap badge state: complete, partial, missing.

REQUIRED INTERACTIONS:
1. Inline editable price cells for Ex-Factory, FOB, and CIF.
2. Save pricing edits without breaking current quote data.
3. Row click opens one product detail drawer.
4. Product detail drawer tabs: Overview, Pricing, Variants, Trade attrs, History.
5. Remove separate audit drawer; history belongs inside the product drawer.
6. Keep and align the 3-step Add Product wizard.
7. Quick quote should only be enabled for products with active, quote-ready, priced variants.
8. Pricing gaps CTA filters the table to blockers.

DATA/SAFETY REQUIREMENTS:
- Do not change schema unless absolutely required. If a schema change is unavoidable, put it in a clearly named migration and explain why.
- Preserve current products, variants, pricing rules, and quote handoff behavior.
- Do not hardcode only demo data if live Supabase data already exists.

ACCEPTANCE CHECKS:
- /products?mode=buyers visually matches the attached Catalog HTML.
- Tabs, stat cards, category filters, search, inline price edits, drawer tabs, and add-product wizard all work.
- Complete/partial/missing gap badges match actual quote-readiness state.
- Quick quote is blocked when pricing/governance is incomplete.
- No separate audit drawer remains.
- No console/runtime errors.
- Return updated repo zip and summarize Catalog readiness percentage.
