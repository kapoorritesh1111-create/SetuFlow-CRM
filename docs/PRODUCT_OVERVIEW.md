# SETU Flow Product Overview

SETU Flow CRM is a trade-focused SaaS platform for managing buyers, suppliers, quotes, orders, products, trade events, user administration, and field capture workflows.

## Core workspaces

| Workspace | Purpose |
|---|---|
| Dashboard | Operating command center for KPIs, activity, market coverage, and priority actions. |
| Leads | Buyer and supplier relationship capture, qualification, ownership, and follow-up. |
| Pipeline | Board-style movement through buyer/supplier stages. |
| Quotes | Pricing, freight, FX, approval, trust evidence, and quote delivery. |
| Orders | Execution tracking after commercial acceptance. |
| Products | Product records, product management, catalog review, and pricing context. |
| Trade events | Trade-show/event setup, lead capture, and event follow-up. |
| Admin | Organization, users, invitations, markets, categories, pipelines, stages, security, audit, and onboarding. |
| Mobile | Phone-first capture, leads, orders, quote, contact exchange, and field action surfaces. |

## Current onboarding model

New clients enter through `/onboarding`, submit company and setup requirements without login, and then Setu Flow admins create the initial workspace. The first client admin receives an invitation only after setup is reviewed.

## Current mobile model

The mobile experience is additive and isolated from desktop behavior. Phone surfaces support fast lead capture, business-card scanning, contact actions, Share vCard, and trade-event capture without compressing desktop pages into a small viewport.

## Current scan model

Recommended production scan mode:

```env
CONTACT_SCAN_PROVIDER=openai-vision
CONTACT_SCAN_FALLBACK_PROVIDER=openai
OPENAI_CONTACT_SCAN_MODEL=gpt-4.1-mini
```

Readiness endpoint:

```text
/api/mobile/scan-readiness
```

## Current release principle

Keep customer-facing pages polished, operational, and free of debug/prototype language. Keep historical proof in the archive and keep current implementation guidance consolidated in the active docs.
