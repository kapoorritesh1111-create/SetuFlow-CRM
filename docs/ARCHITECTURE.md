# Setu Flow Architecture Contract

## Target Structure
src/
  domains/
    leads/
    quotes/
    orders/
    catalog/
    admin/
  services/
    intake/
    pricing/
    rfq/
    compliance/
    documents/
    contracts/
    ai/
    approvals/
    audit/
    progression/
  platform/
    auth/
    permissions/
    db/
    logging/

## Domain Ownership
- Leads owns qualification, contact context, activity, and quote creation entry.
- Quotes owns quote drafting, pricing decisions, approvals, send flow, and locking.
- Orders owns accepted quote snapshots, execution readiness, documents, and compliance tabs.
- Catalog owns product and pricing input data.
- Admin owns users, organization setup, integrations, reporting, and governance.

## Non-Negotiable Rules
- No business logic inside presentational components.
- No giant catch-all actions files.
- No giant catch-all queries files.
- No cross-domain reach-through when a service boundary should exist.
- One action per file.
- One query per file or tightly related query set.
- Shared services must stay domain-agnostic.

## Migration Priorities
1. Simplify nav and surface area.
2. Promote quotes into a first-class module.
3. Fold capture into leads.
4. Create orders as a first-class module.
5. Centralize approvals, audit, and progression rules.
6. Break up legacy god files.

## Readiness Standard
Architecture changes are only considered successful when they reduce confusion, reduce coupling, and make the core flow easier to reason about.
