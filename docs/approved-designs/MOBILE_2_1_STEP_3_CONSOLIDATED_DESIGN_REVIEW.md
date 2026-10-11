# Mobile 2.1 — Step 3 consolidated design acceptance batch

Status: **Design-review candidate; not visual acceptance or deployed UI.**
Baseline: Step 1 guideline and 26-row capability matrix; Step 2 entitlement branch; PR #219.
One review batch, one Git ref update, then one preview build. Preserve Mobile 2.0 premium navy/teal visual direction and every existing desktop operation. No production merge.

## Design contract — common shell

- Maximum five persistent bottom slots, including stable **Home** and **More**. The other slots come from accessible workflows, organization grants, roles and destination availability. For Stark Packmate, prioritize Leads, Quotes and Tasks; never display Orders or Mail in a tenant where their grants are disabled.
- Home has at most three actionable real-data KPIs, the assigned next actions queue, contextual Guru guidance (if entitled) and no redundant primary navigation shortcuts. Empty/unavailable KPI states must be explicit.
- More groups **Work**, **Customers & Sharing**, **Insights** and **Administration**, hiding unauthorized groups entirely. Customer Admin is a role-gated destination. SETU Mission Control and platform support remain separate product privileges.
- System / Light / Dark: semantic surfaces, AA contrast, no dark-on-dark text, 44px targets, 375/390/430px widths and iOS safe-area bottom insets. Do not infer theme from tenant or platform-support role.

## Stark Packmate: review scenarios / expected functionality

| Screen | User | Required acceptance interaction |
|---|---|---|
| Home and More | Sales, inbound agent, owner | Scoped due/overdue follow-ups and lead priorities; entitlement-aware tabs, real KPI origin; assigned-only for regular staff |
| Inbound lead queue | Inbound sales | WhatsApp/IndiaMART source badge, assigned owner, search phone, new/existing, follow-up, conversation transcript and approved templates |
| CRM lead queue and lead detail | Field sales, owner | Search, stage, won/lost handling; contacts with optional email, follow-up and meeting reschedule; lost reason mandatory |
| Requirements and quote studio | Assigned salesperson | Requirements → configuration → commercials → review; preserve edits on backward navigation, edit/delete quantity/line, custom quantity and dimensions, MOQ suggestions; never inject 250m SUP |
| Quote review and share | Sales, approver | PDF download, copy link, WhatsApp share, email when present, preview; no email-only send gate; approval audit and reason |
| Artwork/KLD/proofs | Sales, designer | Real attached files, review history, preview, scoped share and revision, branded packaging assets; avoid fake sample products |
| Customer Admin Command Center | Owner/admin | Users and invitations, approvals, integration connection health, audit; complex Pricing V5 matrix and destructive changes remain desktop-first |
| Offline trade event | Field/event staff | Event selection, capture, local pending queue, idempotent retry, explicit online/offline/error statuses; no claim that all CRM functions offline |
| vCard and catalog | Licensed field staff | Valid QR/VCF, external sharing, contact capture; pass to wallet provider when configured, otherwise honest status |

## Licensed tenant and platform variants

- Orders-enabled tenant: navigation gains Orders, execution and compliance only for permitted users; drill to dispatch and docs. Supplier procurement appears only with separate entitlement.
- Mail-enabled tenant: navigation points to licensed **standalone Setu Mail workspace/PWA**. Do not embed generic mail in CRM Home for Stark or imply offline mail send.
- SETU Flow platform support / admin@setugroups.com: org picker and home-org return; all modules accessible via verified platform registry; distinguish platform-support abilities from customer Admin and SMC.
- Stark Packmate: orders_compliance **off**; setu_mail **off**. Keep quote-to-order business state intact where needed, but do not surface unlicensed Orders cockpit.
- Field sales vs inbound team: distinct default filters and actions even where they share lead detail and contact records; assignment must never automatically change.

## Visual acceptance deliverables and coverage

Review **Home / More / Inbound / Lead Detail / Quote Review / Admin Command Center** for Stark in 375, 390 and 430 logical px, dark and light themes. Review **Home / More / Orders / Mail handoff** for enabled tenant, and **org picker / return to SETU Flow** for registered platform support. Verify keyboard, scroll preservation, no overlapping sticky buttons, no bottom bar duplicates and touch targets. Compare with the previously approved Mobile 2.0 imagery when its source is available.

## Out-of-scope during Step 3

No cosmetic replacement of established pricing forms or quote calculations. No production push, provisioning changes or migration. Screens cannot be marked visually approved from this text alone. Multi-tenant authenticated device QA and security negative write tests remain Step 4 release gates.

## SMC mapping

MOB-003 Home; MOB-004 Theme and responsive; MOB-005 Lead/quote and messaging; MOB-006 Offline/vCard/KLD/catalog; MOB-007 Orders/procurement; MOB-008 Guru/reports/Admin; MOB-009 standalone Mail. Keep these **Open** until implementation and visual signoff, record this batch as **Step 3 design specification submitted**.
