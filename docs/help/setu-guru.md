# Setu Guru help

Purpose: Setu Guru is the embedded CRM assistant. It should be contextual, safe, and useful inside the current route before falling back to generic workflow help.

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

Answer in this order: page context, active route entity, live organization data, route help registry, live research when required, then generic guidance. Always state when human review is required.
