# Setu Guru Documentation Gap Audit

_Last updated: 2026-05-06_

## Current coverage

The current Setu Guru documentation set already covers the CRM foundation well:

- New organization onboarding
- Core lead-to-order workflow
- Catalog, categories, products, variants, and pricing setup
- Quote approval and PDF behavior
- Order blockers and execution states
- Trade events, mobile capture, business-card scan, and Smart vCard
- Roles and permissions
- AI guardrails and feedback-based learning
- Troubleshooting for quotes, orders, leads, users, imports, mobile, admin, pricing, and display issues

## Missing or incomplete documentation before this pass

These were the main gaps for a production-grade chatbot that supports real organizations:

| Gap | Why it matters | Added doc / action |
| --- | --- | --- |
| Live industry research policy | Setu Guru needs to answer questions that change by country, product, and date. Static docs are not enough for margins, HS codes, duties, and compliance. | `SETU_GURU_LIVE_RESEARCH_PLAYBOOK.md` |
| HS / HSN / commodity-code workflow | Users will ask Setu Guru to classify products or fill missing HS/HSN fields. This must be handled with confidence scores and human review. | `SETU_GURU_HS_CODE_ENRICHMENT.md` |
| Margin benchmarking workflow | Users will ask what margin or markup to use in the calculator. The bot must distinguish benchmark guidance from governed pricing decisions. | `SETU_GURU_MARGIN_BENCHMARKING.md` |
| Export/import compliance workflow | Users will ask what documents are needed to ship a product to a destination. The bot needs a research checklist and source priority. | `SETU_GURU_COMPLIANCE_RESEARCH.md` |
| GPT creation and deployment instructions | The earlier build prompt was useful but not detailed enough to create a Custom GPT plus CRM-connected backend. | `SETU_GURU_GPT_CREATION_EXACT_INSTRUCTIONS.md` |
| Product enrichment batch workflow | “Find and fill all missing HSN codes” needs a safe bulk process: suggest, cite, review, approve, then write. | `SETU_GURU_PRODUCT_ENRICHMENT_WORKFLOW.md` |
| Citation/source quality rules | Live answers need official or high-quality sources and must avoid unsupported legal/compliance claims. | Added across the live research docs |

## Still recommended for future documentation

These are useful next additions but not blockers for the Setu Guru build:

1. **Page-by-page help cards**: one short markdown file per route, for example `help/leads.md`, `help/quotes.md`, `help/products.md`.
2. **Admin-only runbook**: support workflows for workspace provisioning, org fixes, role repair, and import recovery.
3. **Data dictionary for chatbot context**: safe fields the app can send to Setu Guru, such as route, role, org country, selected product name, SKU, HS code, quote incoterm, destination country, and missing-field flags.
4. **Prompt-eval set**: 50-100 expected Q&A examples used before each release to check Setu Guru answer quality.
5. **Country playbooks**: short region-specific docs for the first priority destinations, such as UK, EU/Ireland, US, UAE, and Canada.

## Decision

Setu Guru should be built as a hybrid assistant:

1. **Static CRM knowledge** from `docs/setu-guru`.
2. **Live web research** for industry benchmarks, HS/HSN/commodity classification, duties, tariffs, regulatory documents, and destination-market requirements.
3. **CRM data context** from the signed-in organization, but with human approval before any write-back.
4. **Learning loop** that stores feedback and repeated missing topics for admin review before the official knowledge base changes.
