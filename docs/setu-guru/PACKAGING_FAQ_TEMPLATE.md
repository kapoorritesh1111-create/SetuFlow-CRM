# Packaging Organization FAQ Template

## Purpose

Use this file as the starter FAQ for a Packaging organization using SETU Flow and Setu Guru.

The current Q&A below reflects the Packaging workflow and pricing behavior implemented in SETU Flow. Owners/Admins can copy the blank FAQ block at the end to propose additional organization-specific questions and answers.

Important governance rule: organization-specific answers should be treated as approved knowledge only after Owner/Admin review. A company answer must not become a global SETU Flow rule automatically.

---

# Current Packaging FAQ

## Packaging Pricing Templates

### How is the pouch price calculated?
For pouch pricing, SETU Flow calculates area per pouch as Width × (Height + Gusset) × 2 ÷ 1,000,000. Waste increases that to billable area. Material cost per pouch is billable area × configured material rate per m². Printing adds only the configured multiplier above the 1.00× material basis. Selected finishes/add-ons, quantity-tier rules, setup/pre-press charges, Flexo cylinder charges and rush rules are then applied according to the template. Final price per pouch/piece is the complete job total ÷ quantity.

### How do I enter a material rate?
Choose the material/structure your team recognizes and enter the organization rate in the template currency per square metre (m²). Do not enter the expected per-pouch selling price in the material-rate field. SETU Flow converts the selected pouch dimensions into material area and then into material cost per quoted unit.

### What does Thickness / Basis mean?
It is descriptive context for the material, such as 12/12/60. The monetary field beside it is the material rate.

### Should Zipper or another finish be per pouch or per m²?
Use per pouch/piece when the organization charges a fixed amount for every pouch. Use per m² only when the finish is genuinely priced by coated or processed material area.

### Why is an add-on not changing the preview price?
Adding an option to the template makes it available. It changes the tested price only when that finish/add-on is selected in Live Preview. Quote Builder follows the same behavior.

### How does MOQ work?
MOQ blocks quantities below the configured minimum. Quantity tiers then apply the multiplier for the matching quantity range to the variable priced subtotal.

### How do setup or pre-press charges affect price per pouch?
Setup/pre-press charges are job-level charges. They are added to the job total and are therefore spread across the quantity when SETU Flow shows the final price per pouch/piece.

### How does waste affect the price?
Waste increases the calculated material area before the material and area-based finish costs are calculated.

### How does Flexo cylinder pricing work?
Cylinder cost is a job-level charge based on the configured repeat-length tier rate per color × number of print colors. If an existing cylinder is explicitly confirmed for reuse, the cylinder charge can be waived according to the organization rule.

### How does rush pricing work?
Rush uplift applies to the variable priced subtotal after the applicable quantity tier. It does not multiply fixed setup or cylinder charges.

### Why should I test the template before activation?
Live Preview uses the same pricing engine as Quote Builder. Use one known manual quote and confirm the result before activating the template for sales use.

---

## Packaging Service Families

### What is a Packaging Service Family?
A Service Family is the buyer/sales-facing packaging format, such as Stand-Up Pouches, Flat Bottom Pouches, Center Seal Pouches, labels, sleeves, rollstock or a Packaging service. It organizes what is being quoted; the linked Pricing Template supplies the price rules.

### Should a packaging format be a family or a classic SKU?
Packaging Service Families are the main structure for configurable Packaging workflows. Classic Product Catalog remains for non-packaging SKU workflows and should not be forced into the Packaging pricing path.

### What default unit should I use for pouches?
Use PCS when the quoted unit is an individual pouch/piece.

### What should sales capture at quote time?
Capture the specifications needed to price and execute the work: dimensions, material/structure, colors, quantity, applicable build/finish options, artwork status and other family-specific inputs.

### When is a family quote-ready?
When it is active and linked to an appropriate active Pricing Template, with the required quote-time inputs configured.

---

## Packaging Reference Library

### What is the Reference Library for?
Reference Library standardizes the names used across Packaging Pricing Templates. It does not set the price itself.

### What belongs in Materials?
Reusable material/structure names such as PET / MET PET / PE, along with optional thickness or basis context.

### What belongs in Finishes?
Reusable finish/add-on names such as Matte, Gloss, Zipper, Tear Notch, Valve or Hang Hole.

### What belongs in Service Items?
Reusable service names used by service-based Packaging templates.

### Where is the price stored?
The price is entered in the Packaging Pricing Template. Reference Library keeps the naming consistent so teams do not create duplicate spellings or labels.

---

## Quote Builder

### Where does a Packaging quote get its price?
Quote Builder uses the selected Packaging Service Family and active Pricing Template. The calculation engine is the same engine used by Admin Live Preview.

### Why should Quote Builder match Live Preview?
They intentionally use the same calculation logic. If the same specifications and options are entered, the result should match.

### Why did Zipper or another add-on change the quote?
Because the add-on was selected and its configured charge basis and rate were applied.

### What happens when the quantity is below MOQ?
The configured MOQ rule prevents the quantity from being treated as a valid standard quote until the operator changes the quantity or follows an approved organization exception process.

### Can a quote-only price change rewrite the Pricing Template?
No. Quote-only adjustments must not silently rewrite organization pricing defaults or the Packaging Pricing Template.

### What happens after the buyer accepts the quote?
The accepted Packaging line becomes execution work for Orders, Design/Artwork and Production/Dispatch while the accepted quote history remains immutable.

---

## Catalog

### Why are Packaging catalog items not all normal SKUs?
Packaging is usually configured from a family plus buyer specifications and pricing rules. SETU Flow uses Packaging Service Families and Pricing Templates so the organization does not need a separate static SKU and fixed price for every possible size/material/finish combination.

### What does the buyer or sales team see?
They see the buyer-facing Packaging Service Family and the relevant specifications/options configured for that family.

### Where does Packaging catalog pricing come from?
From the linked active Packaging Pricing Template.

---

## Trade Events / Capture

### What Packaging information should I capture at a trade event?
Capture company/contact, buyer/supplier role, product being packed, likely packaging format, approximate dimensions/fill, quantity or annual volume, artwork status, destination and timing when known.

### Do I need every technical specification at the booth?
No. Capture enough information to create a useful Follow-up record and identify the likely family. The sales/operator should complete missing technical specifications before quoting.

### What should happen after conversion?
The record should move into Follow-up with a clear next action to complete missing Packaging specifications and prepare a quote.

---

## Growth Center / Packaging Operations

### What Packaging issues should Growth Center surface?
Quote-readiness gaps, unhealthy Pricing Templates, artwork/proof blockers, production/dispatch delays, repeat-order opportunities and supported cross-sell opportunities.

### What should happen when Growth Center finds a pricing gap?
It should point the user to the actual Service Family or Pricing Template configuration. It should not invent a market rate.

### How should repeat-order opportunities be identified?
Use prior quote/order/dispatch timing and configured organization capabilities as evidence. Recommendations remain advisory until a human acts.

---

## Design / Artwork

### Is customer-supplied final artwork production-ready?
It can satisfy design readiness unless it is rejected, incomplete or fails the organization’s required review.

### When does a Design Team proof need approval?
When SETU/Design Team creates or revises artwork, the latest proof must be explicitly approved before production release.

### What happens after a proof is rejected?
The rejected version remains in history and a new proof version is required after revision.

### Can Printing start before final artwork or proof approval?
Printing and later production stages should not proceed without the required final design evidence.

---

## Production / Dispatch

### What is the normal Packaging production path in SETU Flow?
Pre-Press → Printing → Converting → Finishing → QC → Packed → Dispatched.

### What should be checked before Printing?
Confirm the accepted quote line and the required final artwork/proof are ready.

### Can Setu Guru advance a production stage?
No. Setu Guru can explain blockers and status, but a human must approve production-stage movement, QC, packing and dispatch.

---

## Admin / Organization Setup

### What should a new Packaging organization configure first?
Confirm organization profile, default currency, users/roles and Packaging entitlement. Then review Reference Library, create buyer-facing Packaging Service Families, create Pricing Templates and test a known quote before activation.

### Who should approve pricing and template changes?
Owner/Admin roles should control governed organization configuration. Setu Guru may explain and recommend but should not silently change pricing rules.

---

# Blank FAQ Entry Template

Copy this block for every new organization-specific FAQ.

## FAQ: [Short title]

**Question:**  
[Write the question exactly as a team member is likely to ask Setu Guru.]

**Approved answer:**  
[Write the organization’s approved answer in plain operational language.]

**Category:**  
Choose one: Packaging Pricing / Materials / Printing-Flexo / Finishes & Add-ons / MOQ & Quantity / Setup-Prepress / Service Families / Reference Library / Quote Builder / Catalog / Events / Design-Artwork / Production-Dispatch / Repeat Orders / Admin / Other

**Applies on page/workspace:**  
[Example: Packaging Pricing Templates, Quote Builder, Design Queue]

**When this answer applies:**  
[Conditions, customer type, material/process, product family, quantity range, etc.]

**Exceptions:**  
[Write any exceptions. If none, write None.]

**Source / evidence:**  
[Rate card, SOP, customer agreement, management decision, production rule, document name, etc.]

**Owner/Admin who confirmed it:**  
[Name / role]

**Effective from:**  
[YYYY-MM-DD]

**Review / expiry date:**  
[YYYY-MM-DD or No scheduled expiry]

**Can Setu Guru answer this automatically after approval?**  
Yes / No

**Does this answer authorize Setu Guru to change data or approve an action?**  
Default: No. Any write, pricing change, quote send, proof approval, production movement, compliance decision or dispatch action still requires the appropriate human approval.

---

# Example Organization-Specific FAQ to Fill In

## FAQ: Cylinder reuse on repeat jobs

**Question:**  
When do we charge cylinder cost again for a repeat order?

**Approved answer:**  
[OWNER/ADMIN TO COMPLETE — describe the organization’s actual cylinder reuse and re-charge policy.]

**Category:**  
Printing-Flexo / Repeat Orders

**Applies on page/workspace:**  
Packaging Pricing Templates / Quote Builder / Packaging History

**When this answer applies:**  
Repeat Flexo jobs where a prior cylinder may already exist.

**Exceptions:**  
[OWNER/ADMIN TO COMPLETE]

**Source / evidence:**  
[OWNER/ADMIN TO COMPLETE]

**Owner/Admin who confirmed it:**  
[OWNER/ADMIN TO COMPLETE]

**Effective from:**  
[YYYY-MM-DD]

**Review / expiry date:**  
[YYYY-MM-DD or No scheduled expiry]

**Can Setu Guru answer this automatically after approval?**  
Yes

**Does this answer authorize Setu Guru to change data or approve an action?**  
No.
