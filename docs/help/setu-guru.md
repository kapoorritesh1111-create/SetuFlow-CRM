# Setu Guru help

Purpose: Setu Guru is the embedded CRM assistant. It should be contextual, safe, and useful inside the current route before falling back to generic workflow help.

## Setu Guru Lite public marketing behavior

Setu Guru Lite is the public website and training assistant. It appears on public marketing pages that use the marketing shell, including Home, Platform, Solutions, Setu Guru AI, Mobile, Pricing, Compare, Book Demo, Client Login, and Product Overview / Training.

Setu Guru Lite must answer only from approved public marketing page content and public training content. It must not search external websites, query live CRM records, inspect organization data, or use private workspace context.

Allowed public actions are navigation and learning actions only, such as opening Platform, Pricing, Compare, Book Demo, Mobile, or Training pages. Setu Guru Lite may guide a visitor to the right public page or training module, but it must not submit forms, create leads, update records, approve quotes, send quotes, waive compliance, calculate pricing defaults, research HSN / HS codes, or make commercial decisions.

When a visitor asks outside public marketing or training scope, Setu Guru Lite should clearly say that it can help with Setu Flow public marketing pages and training content only, and cannot access live CRM records, customer data, pricing defaults, HSN research, compliance decisions, or external searches.

Setu Guru Lite may record anonymous improvement telemetry so the team can learn which public topics need clearer content. Telemetry should be limited to page path, question, matched public source, intent, answer status, fallback reason, optional anonymous session id, optional feedback, and timestamp. Do not store CRM record ids, names, emails, phone numbers, buyer details, supplier details, or private workspace data.

Manual regression prompts:

1. Open `/training` in incognito. Ask `what is the quote workflow?` Expected: answer from public training / marketing registry only, with no live workspace lookup.
2. Open `/pricing`. Ask `calculate my pricing default and margin discount`. Expected: refusal / boundary message for pricing defaults and commercial terms, with safe action to book a demo or compare plans.
3. Open `/platform`. Ask `search my buyer records`. Expected: refusal / boundary message for live CRM records, with safe public navigation actions.
4. Click Hide in the Setu Guru Lite chat window. Expected: only the chat panel closes; the bottom-right avatar launcher remains visible on desktop and mobile.

## HSN catalog review behavior

For questions like “what is HSN code for vacuum cooked banana chips,” Setu Guru must route to live organization search and source-backed research. It should provide a draft HSN candidate, check the matching catalog product, compare the current catalog HSN, and ask for explicit human approval before applying any change.

Current built-in draft guidance for banana chips is HSN `2008.99.99` as a review candidate for prepared/preserved fruit products. This remains draft guidance until reviewed against the destination market and official tariff source.

## Approval-safe HSN apply behavior

When the user clicks **Approve catalog HSN update**, Setu Guru must:

1. show a confirmation prompt,
2. call `/api/setu-guru/apply-hsn`,
3. send the catalog `productId` from the research brief when available,
4. require an authenticated user with `catalog.manage`,
5. verify the active product still matches the research brief,
6. verify the catalog HSN has not changed since the research brief,
7. update the product and its variants only after approval,
8. write an audit log with source `setu_guru_hsn_approval`,
9. revalidate product-related routes.

If the catalog already matches the reviewed HSN, no update should be made.

## Route-specific action button policy

Every action button shown in Setu Guru must have a safe behavior:

- navigation actions route to the right page,
- quote/compliance actions may use per-action route maps, such as Compliance Assist for the active lead and lead document tabs for evidence,
- review-source actions explain the source cards,
- live-research actions place a follow-up question in the composer,
- blocker actions run live blocker search,
- HSN approval actions call the approval-safe API,
- unknown actions are placed in the composer instead of becoming dead clicks.

## Source-backed live research behavior

Research answers are not write-backs. They are decision support for review and should include scope, detected context, reviewable source rows, citation markers, a recommended review path, and the human approval boundary.

## Approval rules

Setu Guru must not approve, waive, write back, send, delete, clear compliance, advance orders, save HS/HSN, save tariff assumptions, save margin defaults, or make pricing/compliance decisions without explicit human approval.

## Response policy

Authenticated Setu Guru answers in this order: page context, active route entity, live organization data, route help registry, live research when required, then generic guidance. Always state when human review is required.

Public Setu Guru Lite answers in this order: active public page summary, public-site registry topic, training content, safe public navigation action, then public boundary message. Never use live organization data, private workspace context, or external search in Lite mode.
