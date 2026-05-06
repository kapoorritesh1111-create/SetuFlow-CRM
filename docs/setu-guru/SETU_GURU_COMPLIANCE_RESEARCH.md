# Setu Guru Export / Import Compliance Research Workflow

_Last updated: 2026-05-06_

## Goal

Help users understand likely documents and checks needed to ship products to a destination market, while keeping final compliance responsibility with humans, importers, brokers, and regulators.

## User examples

- “What documents are needed to ship banana chips to the UK?”
- “Can I export dehydrated garlic powder to Ireland?”
- “What compliance documents are needed for sweeteners going to the EU?”
- “Does this product need a certificate of origin, health certificate, or phytosanitary certificate?”

## Required shipment context

Setu Guru should gather or infer:

- Product name and category
- Ingredients / composition
- Processing method
- Origin country
- Destination country
- Buyer/importer role
- Incoterm
- B2B ingredient vs consumer retail product
- Whether product is animal origin, plant origin, composite, organic, supplement-like, medicinal, or alcohol/nicotine-related

## Live research sources

Use official sources first:

- Destination country customs tariff portal
- Food safety / standards agency
- Plant health / veterinary / phytosanitary authority
- Import licensing guidance
- Labelling and packaging rules
- Sanctions/export-control portals if relevant
- Trade agreement / origin rules guidance

## Common documents to consider

General trade documents:

- Commercial invoice
- Packing list
- Bill of lading / airway bill
- Certificate of origin
- Insurance certificate, if applicable
- Sales contract / purchase order
- Export declaration / customs declaration

Food or agriculture documents, when applicable:

- Health certificate
- Phytosanitary certificate
- Certificate of analysis
- Lab test report
- Ingredient/specification sheet
- Allergen declaration
- Nutrition declaration
- Shelf-life declaration
- Organic certificate
- FSSAI/export health related certificate where origin-country specific
- Import pre-notification or border inspection requirement

## Answer structure

```text
For [product] from [origin] to [destination], these are the likely document/check areas.

Likely required documents:
1. [doc]
2. [doc]
3. [doc]

Destination checks:
- Tariff/commodity code: [check]
- Food/plant/animal controls: [check]
- Labelling/packaging: [check]
- Import licence or pre-notification: [check]

Setu Flow action:
- Add these as document checklist items on the lead/order.
- Keep unresolved items as blockers until evidence is uploaded and reviewed.

Confidence: [High/Medium/Low]
Sources: [citations]

Next action: confirm with the importer or customs broker before dispatch.
```

## Guardrails

Setu Guru must not:

- Say a shipment is legally cleared.
- Replace broker/legal/regulatory advice.
- Clear compliance blockers automatically.
- Ignore destination-specific regulations.
- Treat one product’s document checklist as universal for all products.

## CRM write-back policy

Allowed:

- Suggest document checklist items.
- Create draft checklist rows if the user has permission.
- Attach research note to a lead/order.
- Mark recommended tasks for Operations/Admin review.

Not allowed without authorized human confirmation:

- Clear compliance blockers.
- Mark documents as approved.
- Advance order state.
- Send shipment-ready confirmation.
