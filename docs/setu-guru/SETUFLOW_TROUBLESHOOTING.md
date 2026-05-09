# SetuFlow CRM — New Organization Onboarding Guide
_For chatbot knowledge base upload — May 2026_

---

## WHO THIS IS FOR

This guide is for:
1. **Brand new SetuFlow clients** — organizations that have just signed up and received workspace access
2. **First admins** — the person who accepted the owner invitation and is setting up the workspace for their team

---

## OVERVIEW: HOW YOU GOT HERE

Before you have a SetuFlow workspace, the following happened:

1. Your company filled in the public onboarding form at `[domain]/onboarding`
2. Setu Flow's team reviewed the request
3. Setu Flow created your organization workspace
4. You received an invitation email
5. You clicked the link and created your password
6. You landed here — in your organization's SetuFlow workspace

---

## PHASE 1: FIRST 30 MINUTES — Core Setup

### Step 1: Verify Organization Settings
**Go to: Admin → Organization (`/admin/organization`)**

Check and update:
- [ ] Company name is correct
- [ ] Logo URL is set (or upload logo)
- [ ] Website URL is correct
- [ ] Headquarters country is correct
- [ ] Set default **Quote Terms & Conditions** (standard payment terms, delivery conditions)
- [ ] Set default **Order Terms & Conditions** (standard order conditions)
- [ ] Review approval threshold (default is 15% — adjust if needed)

Save when done.

### Step 2: Review Your Pipelines
**Go to: Admin → Pipelines (`/admin/pipelines`)**

SetuFlow pre-created pipelines based on your onboarding form. Review:
- [ ] Are the pipeline names right for your business?
- [ ] Do you need a separate pipeline for Buyers and Suppliers?
- [ ] Are all your sales stages represented?

Edit or add as needed.

### Step 3: Review Your Pipeline Stages
**Go to: Admin → Stages (`/admin/stages`)**

For each pipeline, review the stages:
- [ ] Do the stage names match your actual sales process?
- [ ] Are they in the right order?
- [ ] Do you need any stages added or renamed?

Common stage progression for B2B:
```
Prospecting → Qualified → Needs Analysis → Proposal Sent → Negotiation → Won / Lost
```

### Step 4: Review Your Markets
**Go to: Admin → Markets (`/admin/markets`)**

Markets represent geographic focus areas (e.g., "Europe", "Middle East", "Southeast Asia"):
- [ ] Are your active market regions listed?
- [ ] Remove any that aren't relevant
- [ ] Add any that are missing

---

## PHASE 2: FIRST HOUR — Product Setup

### Step 5: Create Product Categories
**Go to: Admin → Categories (`/admin/categories`)**

Categories organize your products. Create your taxonomy first.

Bulk import path:
1. Go to **Admin → Product management** (`/admin/product-management`).
2. Click **Import catalog**.
3. Click **Import wizard**.
4. Select **Categories**.
5. Download the Categories template or upload a prepared CSV.
6. Confirm preview says **0 blocking issues**.
7. Click **Apply validated import**.
8. Categories are inserted/updated in `product_categories` for the active organization.

The Categories import is safe to rerun: existing categories are matched by organization + category name and updated instead of duplicated. Missing parent categories are created first, then child categories are linked to them. Sort order is assigned after the current organization maximum to avoid `product_categories_org_sort_order_key` conflicts.

**Example for a food ingredients company:**
```
Dehydrated Products
  ├── Garlic
  ├── Onion
  └── Vegetables

Snacks
  ├── Vacuum-Cooked Chips
  └── Ready-to-Eat

Natural Sweeteners
  ├── Jaggery
  └── Coconut Products
```

### Step 6: Add Your Products
**Go to: Products (`/products`) or Admin → Product management (`/admin/product-management`)**

Recommended order for bulk onboarding:
1. Import Categories first.
2. Verify categories appear in Admin → Categories.
3. Download the Products template.
4. Use category names that already exist from the category import.
5. Import products and variants.
6. Add or import pricing rules/prices.

Option A — Add products one by one:
1. Click "+ Add Product"
2. Fill in: Name, Category, Description, HS Code (for trade)
3. Save, then add Variants (pack sizes, SKUs)
4. Set pricing for each variant

Option B — Import in bulk:
1. Admin → Product management → Import catalog → Import wizard
2. Select **Catalog / Products**
3. Download the product CSV template
4. Fill in products using the imported category names
5. Upload → review validation → apply import

### Step 7: Set Up Pricing Defaults
**Go to: Admin → Organization (or Admin → Categories)**

Before adding product prices, set your organization defaults:
- Default currency
- Margin mode (markup is most common)
- Standard internal margin %
- Standard distributor margin %

These become the starting point for all product pricing. Products can override them.

### Step 8: Set Product Pricing
For each product (or import in bulk):
1. Open product → Pricing tab
2. Open pricing calculator
3. Enter your factory/EXW price
4. Fill in cost layers (what it costs to ship to different destinations)
5. Review calculated FOB, CIF, DDP prices
6. Save pricing rules

---

## IMPORT WIZARD TROUBLESHOOTING

### Problem: Categories import preview passes, but no categories are inserted
**Cause:** The old category import save path could submit rows with duplicate `sort_order = 0`, causing Supabase to reject the batch with `product_categories_org_sort_order_key`.
**Fix:** Use the Categories tab in the Import wizard after the fix. It now posts to the category import API, assigns unique sort orders after the organization's current maximum, creates missing parent categories first, and updates existing categories by name.

### Problem: Categories import says duplicate sort order
**Cause:** Category rows need organization-unique `sort_order` values.
**Fix:** Rerun the Categories import through Admin → Product management → Import catalog → Import wizard → Categories. Do not manually add `sort_order` to the CSV; the importer manages it.

### Problem: Product import cannot find a category
**Cause:** Products should reference categories that already exist in the active organization.
**Fix:** Import Categories first, refresh, then import Products using exact category names from the Categories list.

### Problem: Re-importing the same Categories file creates confusion
**Cause:** Users expect imports to be upserts.
**Fix:** Categories import is now upsert-like by organization and category name. Existing categories are updated for active status/parent linkage; new categories are inserted.

---

## PHASE 3: FIRST DAY — Team Setup

### Step 9: Invite Your Team
**Go to: Admin → Invitations (`/admin/invitations`)**

For each team member:
1. Click "+ Invite User"
2. Enter their email address
3. Select their role
4. Send invitation

---

## PHASE 4: FIRST WEEK — First Leads & Quotes

### Step 10: Enter Your First Leads
**Go to: Leads (`/leads`)**

Start entering your existing buyer and supplier contacts:
1. Click "+ New Lead"
2. Fill in company name, contact name, email
3. Set **Lead Type**: Buyer or Supplier
4. Set **Market**
5. Set **Pipeline** and **Stage**
6. Set **Owner**
7. Add product interests
8. Save

### Step 11: Create Your First Quote
Once a lead is qualified and you know what they want:
1. Open the lead
2. Click "Create Quote" or "Continue quote"
3. Complete terms, pricing, review, and send gate
4. Save and send when ready

### Step 12: Set Up Mobile for Field Team
For team members who attend trade shows or client meetings:

1. Each user: Go to Profile → My Card settings
2. Fill in contact details
3. Upload profile photo
4. Save → Smart QR is ready

---

## CHECKLIST: READY TO OPERATE

**Organization:**
- [ ] Company name, logo, and details set
- [ ] Quote and order terms defaults written
- [ ] Approval threshold configured

**Pipeline:**
- [ ] Pipelines reflect your actual sales workflow
- [ ] Stages match your process
- [ ] Markets match your geographic focus

**Products:**
- [ ] Product categories created or imported with correct hierarchy
- [ ] Core products added with variants/SKUs
- [ ] Pricing calculator set up for main products
- [ ] Organization-level pricing defaults configured

**Team:**
- [ ] All team members invited
- [ ] Roles correctly assigned
- [ ] Each person has logged in and verified access
- [ ] Mobile setup done for field team members

**First Leads:**
- [ ] Existing key contacts entered as leads
- [ ] Leads assigned to correct owners
- [ ] Pipeline stages set for existing relationships

---

## GETTING HELP

**In-app help:** Every page has a **Help button**. Click it for page-specific guidance.

**This chatbot:** Ask any question about SetuFlow features, workflows, imports, or troubleshooting.

**Setu Support:** Contact your Setu account manager for workspace configuration, billing, or technical issues.

---

_This onboarding guide is part of the SetuFlow CRM knowledge base. Updated: May 2026._
