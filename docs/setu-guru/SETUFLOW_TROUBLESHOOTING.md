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

Categories organize your products. Create your taxonomy first:

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

**To create categories:**
1. Click "+ Add Category"
2. Enter category name
3. Set parent category (for sub-categories)
4. Optionally set category-level pricing defaults:
   - Default currency
   - Margin mode (markup vs margin)
   - Standard margin percentages
5. Save

### Step 6: Add Your Products
**Go to: Products (`/products`)**

Option A — Add products one by one:
1. Click "+ Add Product"
2. Fill in: Name, Category, Description, HS Code (for trade)
3. Save, then add Variants (pack sizes, SKUs)
4. Set pricing for each variant

Option B — Import in bulk (recommended for 10+ products):
1. Products → Catalog Command Center
2. Click "Download CSV Template" → Product Template
3. Fill in your products in the spreadsheet
4. Upload → review validation → confirm import

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

## PHASE 3: FIRST DAY — Team Setup

### Step 9: Invite Your Team
**Go to: Admin → Invitations (`/admin/invitations`)**

For each team member:
1. Click "+ Invite User"
2. Enter their email address
3. Select their role:
   - **Sales team members** → Sales role
   - **Operations/logistics team** → Operations role
   - **Procurement/sourcing team** → Sourcing or Procurement role
   - **Read-only stakeholders** → Viewer role
   - **Other managers** → Manager role
4. Send invitation

They'll receive an email with a login link. They create their own password.

### Role Assignment Guide
| Team Member Type | Recommended Role |
|---|---|
| CEO/Director who needs full control | Owner or Admin |
| Sales Manager | Manager |
| Sales Executive/Rep | Sales |
| Logistics/Operations Manager | Operations |
| Procurement/Sourcing Manager | Sourcing or Procurement |
| Marketing/reporting only | Viewer |
| Anyone creating/editing leads | Contributor minimum |

---

## PHASE 4: FIRST WEEK — First Leads & Quotes

### Step 10: Enter Your First Leads
**Go to: Leads (`/leads`)**

Start entering your existing buyer and supplier contacts:
1. Click "+ New Lead"
2. Fill in company name, contact name, email
3. Set **Lead Type**: Buyer or Supplier
4. Set **Market** (which geographic market they're in)
5. Set **Pipeline** and **Stage** (what stage is this relationship at?)
6. Set **Owner** (which team member manages this lead?)
7. Add product interests (what products are they interested in?)
8. Save

### Pro Tip: Import Leads
If you have existing contacts in a spreadsheet:
- Products → Catalog Command Center → Lead CSV Template
- Fill in your contacts
- Import → validate → confirm

### Step 11: Create Your First Quote
Once a lead is qualified and you know what they want:
1. Open the lead
2. Click "Create Quote"
3. **Terms step**: Set incoterm (FOB is most common for export), currency, payment terms
4. **Pricing step**: Add products the lead is interested in, set quantities and prices
5. **Review**: Check totals, add any adjustments
6. Save → quote is in Draft

Before sending:
- Review the quote PDF (Quotes workspace → select quote → PDF Preview)
- Get approval if needed (adjustments > 15% require manager/admin sign-off)
- Send when ready

### Step 12: Set Up Mobile for Field Team
For team members who attend trade shows or client meetings:

1. Each user: Go to Profile → My Card settings
2. Fill in contact details (name, title, phone, email)
3. Upload profile photo
4. Save → Smart QR is ready

At trade shows:
- Use `/mobile/capture` or scan business cards to capture leads instantly
- Share your QR code so contacts can scan and save your details

---

## CHECKLIST: READY TO OPERATE

Use this checklist before going live with your team:

**Organization:**
- [ ] Company name, logo, and details set
- [ ] Quote and order terms defaults written
- [ ] Approval threshold configured

**Pipeline:**
- [ ] Pipelines reflect your actual sales workflow
- [ ] Stages match your process (usually 5-8 stages)
- [ ] Markets match your geographic focus

**Products:**
- [ ] Product categories created with correct hierarchy
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

**Ready to quote!**

---

## COMMON FIRST-TIME QUESTIONS

**Q: I don't see Admin pages — why?**
Admin pages require Owner, Admin, or Manager role. If you're the first admin, you should have Owner role. If not, contact Setu support.

**Q: How do I know which incoterm to use on quotes?**
Most exporters use FOB (goods ready at port of origin). Use CIF if you arrange and include freight. Use DDP if you deliver fully to the buyer's location. Check with your logistics team if unsure.

**Q: My team member says their invite expired — what do I do?**
Go to Admin → Invitations → find their invitation → click Resend. Or cancel and create a new invitation.

**Q: Can I change my workspace URL after setup?**
Workspace URLs (companyname.setuflowcrm.com) are set during provisioning. Contact Setu support to discuss URL changes.

**Q: Do I need to enter all products before I can create quotes?**
No — you can create quotes with custom line items even before products are fully set up. But product-based quotes are more powerful and reusable.

**Q: How do I import product pricing from an old spreadsheet?**
Download the Products CSV template, copy your pricing into the format shown, then import. The import guide in Products → Catalog Command Center walks through this step by step.

---

## GETTING HELP

**In-app help:** Every page has a **Help button** (top right area). Click it for page-specific guidance.

**This chatbot:** Ask any question about SetuFlow features, workflows, or troubleshooting.

**Setu Support:** Contact your Setu account manager for workspace configuration, billing, or technical issues.

---

_This onboarding guide is part of the SetuFlow CRM knowledge base. Updated: May 2026._
