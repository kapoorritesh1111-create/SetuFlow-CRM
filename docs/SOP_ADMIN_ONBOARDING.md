# SOP — Admin Onboarding for SETU Flow CRM

Updated: 2026-04-30  
Audience: non-technical workspace owner or admin setting up SETU Flow for the first time.

This SOP is intentionally practical and honest. It covers the setup flow that is expected in the app today and calls out what remains manual or deferred.

## 1. First login

1. Open the SETU Flow app URL provided by your workspace owner or implementation team.
2. The login page asks you to sign in with the account connected to your organization.
3. After login, you should land in the workspace dashboard.
4. If you see **“No workspace membership found”**, your account has authenticated successfully, but it has not yet been added to an organization workspace.
5. Ask your workspace owner to invite your email address or assign you to the organization.

What is proven today: the app has a first-login guidance pattern and workspace-membership checks.  
What is still manual today: the first owner/admin may still need implementation support to confirm the correct organization and membership records exist.

## 2. Organization setup

Go to **Admin → Organization**.

Fill in the organization fields that identify your company and control quote governance. The most important field for commercial governance is:

- **`approval_threshold_pct`** — the percentage threshold above which quote changes or overrides require approval before sending.

Recommended starting value:

- Start with **10%** as a safe default.
- Lower it if you want tighter approval control.
- Raise it only after your team has consistent pricing discipline and audit review habits.

## 3. Invite users

Go to **Admin → Invitations**.

1. Enter the user’s email address.
2. Choose the correct role.
3. Send or copy the invite link according to the screen instructions.
4. Tell the user to open the invite link and complete login.

### Role guide

| Role | Best for | Can do | Cannot do / caution |
|---|---|---|---|
| `owner` | Business owner / system accountable person | Full workspace ownership and all six capabilities | Use sparingly. Highest-trust role. |
| `admin` | Admin operator | Settings, catalog, leads, quotes, compliance, reporting | Not the legal/business owner unless assigned that responsibility. |
| `manager` | Sales/commercial manager | Manage catalog/settings, leads, quote sending, compliance review, reporting | Should be limited to trusted team leads. |
| `sales` | Sales team | Manage leads and send quotes | Cannot manage catalog or review compliance. |
| `operations` | Operations/logistics | Manage leads and review compliance/document blockers | Cannot send quotes or manage catalog. |
| `sourcing` | Supplier/product sourcing | Manage leads and upload order-document related material through lead/order gates | Cannot send quotes, manage catalog, or review compliance by default. |
| `procurement` | Buying/procurement support | Manage leads and procurement-related commercial support | Cannot send quotes, manage catalog, or review compliance by default. |
| `contributor` | Limited internal contributor | Manage leads | Cannot send quotes, manage catalog, review compliance, or manage settings. |
| `viewer` | Read-only stakeholder | View reporting/audit areas where exposed | Cannot perform write actions such as lead management, quote sending, catalog management, or compliance review. |

Use the lowest role that lets the person do their job.

## 4. Configure reference lists

Go to **Admin → Markets**, **Countries**, **Categories**, and **Stages**.

These lists keep the CRM clean before leads and quotes are created.

- **Markets** — the regions or sales markets you operate in.
- **Countries** — buyer or destination countries used during lead qualification and quoting.
- **Categories** — product groupings used in catalog and product-interest setup.
- **Stages** — pipeline stages used to track leads from intake through qualification and quoting.

Minimal initial setup:

1. Add the 2–3 countries you actually sell into first.
2. Add your main product categories only.
3. Use a short stage flow such as **New → Qualified → Quoted → Accepted → Closed**.
4. Do not create large reference lists until the team is actively using them.

## 5. First pricing rule set

For full detail, use [`docs/OPERATOR_PRICING_GUIDE.md`](./OPERATOR_PRICING_GUIDE.md).

Minimal first setup:

1. Go to **Catalog**.
2. Add one product that you are ready to sell.
3. Add the product variant and pricing basis.
4. Enter the price and any required freight/FX assumptions.
5. Toggle the item to quote-ready only when the price is ready for buyers.

The safe operating rule is: do not quote a product until the catalog price and quote-ready status are intentional.

## 6. Create first lead

Go to **Leads → New Lead**.

Fill in:

1. Company name.
2. Buyer/contact name if available.
3. Country.
4. Product interests.
5. Any notes the sales team needs.

Then set the lead to a **Qualified** stage when the buyer, country, and product interest are credible enough for quote work.

## 7. Build and send first quote

1. Open the lead.
2. Go to the **Quotes** tab.
3. Select **Build quote**.
4. Choose the pricing basis.
5. Review line items, pricing, FX/freight assumptions, and any overrides.
6. If the quote exceeds the approval threshold, route it for approval before sending.
7. Send the quote only after the line items and governance checks are correct.

What is proven today: governed quote construction, approval threshold behavior, and the accepted quote → draft order handoff are represented in the product and tests.  
What is not claimed today: every live buyer’s order is proven through signed contract, dispatch, and completion.

## 8. What to do if something is broken

1. Check **Admin → Audit** for recent activity and errors around the lead, quote, contract, user, or setting.
2. Confirm the affected user has the right workspace role.
3. Check Supabase project health if the app cannot load or data does not save.
4. Retry only after confirming the user and organization are correct.
5. Contact your workspace owner if a permission, invitation, or organization setup issue remains.

## Live Supabase note

Pass 5 verified through the GPT Supabase connector that the SETU Flow CRM Supabase project is active/healthy and that all public base tables currently have RLS enabled. Some Supabase security advisor findings remain open, so admins should treat this SOP as onboarding guidance, not as proof of a completed external security audit.

## What is not configured yet (deferred)

- Live integration connectors for ERP and freight are mock/proof-mode only today.
- WhatsApp delivery currently uses a `wa.me` prefilled message link; provider-key based delivery requires provider configuration.
- External security audit is planned for Pass 6 and is not complete today.
- Mobile-native full workflow is not claimed; trade-event capture is the mobile wedge today.
