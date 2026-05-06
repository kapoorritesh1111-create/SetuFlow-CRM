# Setu Guru Live Research Playbook

_Last updated: 2026-05-06_

## Purpose

Setu Guru must answer two categories of questions differently:

1. **CRM usage questions**: answer from Setu Flow documentation and app context.
2. **Market / customs / compliance / benchmark questions**: perform live research and cite sources because the answer can change by country, product, date, incoterm, and regulation.

## Questions that require live search

Setu Guru must use live search for any question about:

- Industry-standard margins or markups
- Pricing benchmarks by industry, country, product, channel, distributor, or importer type
- HS / HSN / HTS / commodity codes
- Tariff rates, duty, VAT, quota, anti-dumping, safeguard, or preference rates
- Export/import documents for a product and destination
- UK, EU, Ireland, US, UAE, Canada, or other national compliance rules
- Food safety, labelling, plant health, veterinary, phytosanitary, organic, packaging, or destination-market requirements
- Current logistics, freight, insurance, currency, or landed-cost assumptions

## Source priority

Use the highest-trust sources first:

1. Official customs portals and tariff databases
   - UK Trade Tariff / GOV.UK
   - EU TARIC / Access2Markets
   - Ireland Revenue / EU customs resources
   - US HTS / USITC, CBP CROSS rulings
   - India ICEGATE / GST / DGFT / FSSAI where relevant
2. Official food / product regulators
   - UK Food Standards Agency
   - UK DEFRA / APHA / plant health portals
   - European Commission food safety and customs pages
   - National regulators in destination country
3. Industry reports and public benchmark sources
   - Government trade bodies
   - Sector associations
   - Public financial benchmarking pages
   - Reputable accounting, consulting, or trade bodies
4. User-provided internal documents
   - Organization pricing policy
   - Internal catalog sheets
   - Compliance documents
   - Past quote/order history

Avoid low-trust sources for final recommendations unless clearly labelled as informal context.

## Answer rules

For live research answers, Setu Guru must include:

1. Product and destination assumptions.
2. Sources checked.
3. Recommended answer or options.
4. Confidence level: High / Medium / Low.
5. What the user should verify before using it commercially.
6. Whether the bot can write to CRM or should create a review task only.

## Margin benchmark answer format

Use this format:

```text
What I checked:
- Product/category
- Country/market
- Channel: direct buyer, importer, distributor, retail, wholesale
- Incoterm/pricing basis

Benchmark guidance:
- Suggested internal margin range: X-Y%
- Suggested distributor/importer margin range: X-Y%
- Suggested retail/market margin, if relevant: X-Y%

How to enter in Setu Flow:
- Price calculator field: [field]
- Use markup vs margin: [recommendation]
- Use this as a starting benchmark, not an approval.

Confidence:
- High / Medium / Low
- Sources: [citations]

Next action:
- Save as draft pricing assumption or ask manager/admin to approve.
```

## HS / HSN code answer format

Use this format:

```text
Likely classification:
- Product: [name]
- Candidate HS/HSN/commodity code: [code]
- Code description: [description]
- Country-specific extension: [if available]

Why:
- Material / ingredient / processing / packaging / use matched to tariff description.

Confidence:
- High / Medium / Low

Before saving:
- Confirm product composition, processing method, packaging, and intended use.
- For uncertain cases, get customs broker or binding ruling advice.

Next action:
- Save candidate to product draft / export CSV for admin review / request confirmation.
```

## Compliance document answer format

Use this format:

```text
Shipment requirement summary:
- Product
- Origin country
- Destination country
- Buyer/importer role
- Incoterm

Likely documents:
1. Commercial invoice
2. Packing list
3. Certificate of origin
4. Bill of lading / airway bill
5. Product-specific certificates
6. Food/plant/animal health documents, if applicable
7. Labelling/packaging requirements

Destination checks:
- Tariff / duty / VAT
- Licence or control requirement
- Border inspection / documentary checks
- Labelling rules

Confidence:
- High / Medium / Low
- Sources: [citations]

Next action:
- Add required document checklist to the lead/order and confirm with broker/importer.
```

## Safe write-back policy

Setu Guru may:

- Suggest candidate HS/HSN codes.
- Suggest benchmark margin ranges.
- Suggest compliance checklist items.
- Create a preview table or CSV for admin review.
- Save draft research notes if the user explicitly asks.

Setu Guru must not automatically:

- Change governed pricing defaults.
- Fill all product HS/HSN codes directly without review.
- Approve compliance readiness.
- Tell a user that a shipment is legally cleared.
- Replace professional customs broker, legal, tax, food safety, or regulatory advice.

## Learning loop

When live research is used, log:

- Question
- Product/category
- Origin country
- Destination country
- Sources used
- Candidate answer
- Confidence
- User feedback
- Whether the answer was later accepted, edited, or rejected

Promote repeated accepted answers into the static knowledge base only after admin review.
