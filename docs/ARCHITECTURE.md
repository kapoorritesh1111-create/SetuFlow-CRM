# Setu Flow Architecture Contract

## Current code shape
The repo is currently organized around:

- `src/app/` - route entry points and page shells
- `src/features/` - domain and feature implementations
- `src/components/` - shared UI and preview/presentation building blocks
- `src/lib/` - contracts, queries, workflow logic, services, and shared utilities
- `public/` - public artifacts including the architecture/status HTML

This is the **actual current structure**. Any future target architecture must start from this reality rather than from an idealized folder sketch.

## Product ownership lanes
- **Leads** owns qualification, contact context, activity, and quote entry.
- **Quotes** owns drafting, pricing, approvals, send flow, and lock posture.
- **Orders** owns accepted commercial truth carried into execution.
- **Dashboard** owns action-first visibility and trade-map context.
- **Admin / governance** owns users, org setup, audit, analytics, and settings.
- **Supporting lanes** such as products, documents, contracts, compliance, contact exchange, and trade events stay subordinate to the core commercial flow.

## Current architecture risks
- oversized files still exist in quote and query layers
- some preview/demo surfaces still overlap with app-owned routes
- historical repo artifacts and stale scripts previously made proof status look cleaner than it really was
- contact-exchange and dashboard work exist in code, but planning language was lagging behind implementation

## Non-negotiable rules
- No business logic in presentational components.
- No dead duplicate files kept beside the active implementation.
- No package scripts pointing to files that are not checked in.
- Shared status truth must live in one repo-backed contract.
- Product/docs/architecture pages must describe the code that actually exists.
- Architecture cleanup must reduce confusion, not just move files around.

## Cleanup priorities
1. **Repo truth first**
   - keep docs, development pages, and package scripts aligned
2. **Dashboard canonicalization**
   - choose the active dashboard story and remove drift between preview/fallback language and live implementation
3. **Quote/query decomposition**
   - split large quote and data files by responsibility
4. **Route and feature tightening**
   - keep preview/demo surfaces clearly secondary to app-owned routes
5. **Proof refresh**
   - keep smoke tests lightweight and checked in so the repo can prove its own state

## Success standard
Architecture work is only successful if:
- the repo is easier to reason about,
- status pages stay honest,
- product ownership becomes clearer,
- and future changes create less drift instead of more.
