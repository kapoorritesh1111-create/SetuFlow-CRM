"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CatalogImportExportWizard } from "@/features/products/components/catalog-import-export-wizard";
import { AdminHelpDrawer } from "@/features/admin/components/admin-help-drawer";
import { savePricingCalculatorDefaultRule } from "@/features/admin/server/actions";
import type { ProductCategoryViewModel, ProductViewModel, ProductsSummaryViewModel } from "@/features/products/view-model";

type MarketOption = { id: string; name: string; isActive: boolean };
type Tab = "setup" | "pricing" | "imports" | "approvals" | "audit";

export type PricingCalculatorDefaultRule = {
  id: string;
  organization_id?: string;
  rule_scope: "organization" | "category" | string;
  category_id: string | null;
  currency: string | null;
  margin_mode: "markup" | "margin" | string | null;
  inland_transport_cost: number | null;
  export_customs_cost: number | null;
  port_handling_cost: number | null;
  freight_cost: number | null;
  insurance_cost: number | null;
  import_duty_percent: number | null;
  destination_charges: number | null;
  local_delivery_cost: number | null;
  internal_margin_percent: number | null;
  distributor_margin_percent: number | null;
  retail_margin_percent: number | null;
  is_active?: boolean | null;
};

function metricClass(tone: "blue" | "green" | "amber" | "slate") {
  const border = tone === "blue" ? "border-t-brand-500" : tone === "green" ? "border-t-emerald-500" : tone === "amber" ? "border-t-amber-500" : "border-t-slate-300";
  return `rounded-3xl border border-slate-200 ${border} border-t-4 bg-white p-4 shadow-sm`;
}

function statusClass(tone: "success" | "warning" | "info" | "neutral") {
  const map = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    info: "bg-sky-50 text-sky-700 ring-sky-200",
    neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  } as const;
  return `inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${map[tone]}`;
}

const PRICING_FIELDS = [
  ["inland_transport_cost", "Inland transport"],
  ["export_customs_cost", "Export customs"],
  ["port_handling_cost", "Port handling"],
  ["freight_cost", "Freight"],
  ["insurance_cost", "Insurance"],
  ["import_duty_percent", "Import duty %"],
  ["destination_charges", "Destination charges"],
  ["local_delivery_cost", "Local delivery"],
  ["internal_margin_percent", "Internal markup / margin %"],
  ["distributor_margin_percent", "Distributor margin %"],
  ["retail_margin_percent", "Retail margin %"],
] as const;

type PricingFieldName = typeof PRICING_FIELDS[number][0];

function inputValue(value: number | string | null | undefined, fallback = "") {
  return value === null || value === undefined ? fallback : String(value);
}

function findPricingRule(rules: PricingCalculatorDefaultRule[] | undefined, scope: "organization" | "category", categoryId: string | null) {
  return (rules ?? []).find((rule) => {
    if (scope === "organization") return rule.rule_scope === "organization" && !rule.category_id;
    return rule.rule_scope === "category" && rule.category_id === categoryId;
  }) ?? null;
}

export function ProductGovernanceWorkbench({
  products,
  categories,
  markets,
  summary,
  auditEvents,
  canManageCatalog,
  pricingRules = [],
}: {
  products: ProductViewModel[];
  categories: ProductCategoryViewModel[];
  markets: MarketOption[];
  summary: ProductsSummaryViewModel;
  auditEvents: any[];
  canManageCatalog: boolean;
  pricingRules?: PricingCalculatorDefaultRule[];
}) {
  const [tab, setTab] = useState<Tab>("setup");
  const activeProducts = products.filter((product) => product.isActive);
  const productsWithVariants = activeProducts.filter((product) => product.variantCount > 0);
  const pricedVariantProducts = productsWithVariants.filter((product) => product.baselineStatus !== "missing").length;
  const pricingGaps = Math.max(productsWithVariants.length - pricedVariantProducts, 0);
  const variantSetupGaps = activeProducts.filter((product) => product.variantCount === 0).length;
  const tradeReadyCount = activeProducts.filter((product) => Boolean(product.hsnCode) && Boolean(product.packSize)).length;
  const approvalProtectedCount = activeProducts.filter((product) => product.pricingEntries.length > 0).length;
  const importReady = categories.length > 0 && products.length > 0;

  const rows = useMemo(() => [
    {
      title: `${pricingGaps} products are missing governed pricing`,
      note: pricingGaps ? "Open Products with the pricing-gap filter to review product-default pricing. Quote-only discounts stay inside Quotes." : "Products with variants match the Products page pricing-gap filter.",
      status: pricingGaps ? "Action needed" : "Covered",
      statusTone: pricingGaps ? "warning" : "success",
      area: "Pricing",
      href: "/products?gap=has_gap",
      actionLabel: pricingGaps ? "Open pricing gaps" : "Open Products",
      showIn: ["setup", "pricing"] as Tab[],
    },
    {
      title: `${variantSetupGaps} product masters need variant setup`,
      note: variantSetupGaps ? "Create or edit variants in Products. Product Management only monitors this setup gap." : "Every active product master has at least one variant.",
      status: variantSetupGaps ? "Setup needed" : "Covered",
      statusTone: variantSetupGaps ? "warning" : "success",
      area: "Variants",
      href: "/products",
      actionLabel: "Open variant setup",
      showIn: ["setup"] as Tab[],
    },
    {
      title: `${Math.max(activeProducts.length - tradeReadyCount, 0)} products are missing full trade attributes`,
      note: "HS code, packaging, origin, and pack fields affect quote confidence. Use Products for edits and Setu Guru live research for HS/HSN review.",
      status: tradeReadyCount === activeProducts.length ? "Complete" : "Incomplete",
      statusTone: tradeReadyCount === activeProducts.length ? "success" : "warning",
      area: "Compliance",
      href: "/products",
      actionLabel: "Review trade fields",
      showIn: ["setup"] as Tab[],
    },
    {
      title: "Client onboarding import tools are ready",
      note: "Use imports for bulk setup. Review high-impact defaults before applying them to the catalog.",
      status: importReady ? "Ready" : "Needs setup",
      statusTone: importReady ? "success" : "warning",
      area: "Imports",
      actionLabel: "Open imports",
      onClick: () => setTab("imports"),
      showIn: ["setup", "imports"] as Tab[],
    },
    {
      title: "Product calculator is active in product workflows",
      note: "Use Products for product-specific pricing. Category and organization defaults belong in Product Management. Quote-only changes stay in Quotes.",
      status: "Promoted",
      statusTone: "success",
      area: "Products",
      href: "/products",
      actionLabel: "Open Products",
      showIn: ["setup", "pricing"] as Tab[],
    },
    {
      title: "Approval posture is monitored from governed pricing rows",
      note: `${approvalProtectedCount} active products have governed rows available to quote workflows. Review exceptions before saving defaults or sharing pricing.` ,
      status: approvalProtectedCount ? "Active" : "Review",
      statusTone: approvalProtectedCount ? "info" : "warning",
      area: "Approvals",
      actionLabel: "Review posture",
      showIn: ["approvals"] as Tab[],
    },
  ], [activeProducts.length, approvalProtectedCount, importReady, pricingGaps, tradeReadyCount, variantSetupGaps]);

  const filteredRows = rows.filter((row) => row.showIn.includes(tab));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href="/products" className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">Open Products</Link>
        <button type="button" onClick={() => setTab("imports")} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300">Import catalog</button>
        <button type="button" onClick={() => setTab("pricing")} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300">Pricing rules</button>
        <AdminHelpDrawer
          title="Product Management help"
          intro="Product Management in Admin monitors catalog readiness and governance. Use the Products workspace for daily product editing, product detail updates, and product-specific pricing work."
          sections={[
            { title: "Why this page exists", body: "This page helps admins confirm the catalog is ready for sales, quotes, and order workflows. It highlights setup gaps, pricing rule gaps, import issues, approval posture, and audit history." },
            { title: "What belongs here", body: "Use this page for catalog governance, onboarding imports, pricing rule coverage, approval controls, and setup health." },
            { title: "What belongs in Products", body: "Use the Products workspace to add products, edit product details, assign categories, update variants, and calculate product-specific pricing." },
            { title: "Pricing rules", body: "Pricing rules define default calculation logic for products and categories. They provide default freight layers, duty assumptions, internal markup or margin, distributor margin, retail margin, and margin mode.", items: ["Product-specific pricing override", "Category-level pricing rule", "Organization default pricing rule"] },
            { title: "Import pricing", body: "Product imports should provide product/variant setup and starting prices such as EXW, FOB, CIF, DDP, Distributor, or Retail. Shared cost layers and margins belong in default pricing rules." },
          ]}
        />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className={metricClass("blue")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Catalog readiness</p><p className="mt-2 text-2xl font-semibold text-slate-950">{pricedVariantProducts}/{productsWithVariants.length}</p><p className="mt-1 text-xs text-slate-500">variant products quote-ready</p></div>
        <div className={metricClass(pricingGaps ? "amber" : "green")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Pricing gaps</p><p className="mt-2 text-2xl font-semibold text-slate-950">{pricingGaps}</p><p className="mt-1 text-xs text-slate-500">match Products filter</p></div>
        <div className={metricClass(variantSetupGaps ? "amber" : "green")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Variant setup</p><p className="mt-2 text-2xl font-semibold text-slate-950">{variantSetupGaps}</p><p className="mt-1 text-xs text-slate-500">masters without variants</p></div>
        <div className={metricClass(tradeReadyCount === activeProducts.length ? "green" : "amber")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Trade attributes</p><p className="mt-2 text-2xl font-semibold text-slate-950">{tradeReadyCount}/{activeProducts.length}</p><p className="mt-1 text-xs text-slate-500">complete</p></div>
        <div className={metricClass("slate")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Approval posture</p><p className="mt-2 text-2xl font-semibold text-slate-950">{approvalProtectedCount}</p><p className="mt-1 text-xs text-slate-500">governed rows</p></div>
      </section>

      <section className="rounded-[1.5rem] border border-blue-100 bg-blue-50/70 p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Action map</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">Use the right workspace for the right catalog action</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Product Management governs readiness and defaults. Products is where teams edit product rows, variants, trade fields, and product-default pricing. Quote-only customer terms stay in Quotes.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/products" className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm ring-1 ring-blue-100">Daily product edits</Link>
            <button type="button" onClick={() => setTab("pricing")} className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm ring-1 ring-blue-100">Default rules</button>
            <button type="button" onClick={() => setTab("imports")} className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm ring-1 ring-blue-100">Bulk imports</button>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            ["Products", "Edit product rows, variants, trade fields, and product-specific pricing snapshots."],
            ["Product Management", "Review governance, imports, category/organization defaults, readiness gaps, and audit posture."],
            ["Quotes", "Keep customer-specific discounts, one-off prices, and quote-only commercial terms out of catalog defaults."],
          ].map(([title, body]) => <div key={title} className="rounded-2xl bg-white p-3 ring-1 ring-blue-100"><p className="font-semibold text-slate-950">{title}</p><p className="mt-1 text-sm leading-5 text-slate-500">{body}</p></div>)}
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-xl font-semibold tracking-tight text-slate-950">Governance workbench</h2><p className="mt-1 text-sm text-slate-500">Action-focused controls for readiness, imports, defaults, approvals, and audit review.</p></div>
          <div className="flex flex-wrap gap-2">
            {(["setup", "pricing", "imports", "approvals", "audit"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-3 py-2 text-xs font-semibold capitalize ${tab === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item === "setup" ? "Setup gaps" : item === "pricing" ? "Pricing rules" : item}</button>)}
          </div>
        </div>
        <div className="space-y-3 p-5">
          {tab === "imports" ? <CatalogImportExportWizard products={products} categories={categories} canManageCatalog={canManageCatalog} /> : null}
          {tab === "pricing" ? <PricingRulesSummary categories={categories} pricingRules={pricingRules} /> : null}
          {tab === "audit" ? <AuditSummary auditEvents={auditEvents} /> : null}
          {filteredRows.map((row) => (
            <div key={row.title} className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
              <div><h3 className="font-semibold text-slate-950">{row.title}</h3><p className="mt-1 text-sm text-slate-500">{row.note}</p></div>
              <span className={statusClass(row.statusTone as any)}>{row.status}</span>
              <span className={statusClass("neutral")}>{row.area}</span>
              {row.href ? <Link href={row.href} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 shadow-sm">{row.actionLabel ?? "Review"}</Link> : row.onClick ? <button type="button" onClick={row.onClick} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">{row.actionLabel ?? "Review"}</button> : <span className="text-sm text-slate-400">{row.actionLabel ?? "Monitor"}</span>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function PricingRulesSummary({
  categories,
  pricingRules = [],
  selectedCategoryId = null,
  returnPath = "/admin/product-management",
  compact = false,
}: {
  categories: ProductCategoryViewModel[];
  pricingRules?: PricingCalculatorDefaultRule[];
  selectedCategoryId?: string | null;
  returnPath?: "/admin/product-management" | "/admin/categories";
  compact?: boolean;
}) {
  const forcedCategory = Boolean(selectedCategoryId);
  const selectedCategory = selectedCategoryId ? categories.find((category) => category.id === selectedCategoryId) ?? null : null;
  const organizationRule = findPricingRule(pricingRules, "organization", null);
  const categoryRule = selectedCategoryId ? findPricingRule(pricingRules, "category", selectedCategoryId) : null;
  const defaultRule = categoryRule ?? organizationRule;
  const formScope = forcedCategory ? "category" : "organization";

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">{forcedCategory ? `${selectedCategory?.name ?? "Selected category"} pricing defaults` : "Default pricing calculator rules"}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Set shared calculator defaults. Product UOM, pack size, pack unit, and pricing basis are edited on the product/variant, not in defaults.
          </p>
          {forcedCategory ? <p className="mt-2 rounded-2xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-900">This category uses its own rule when saved. If no category rule exists, products inherit the organization default.</p> : null}
        </div>
        <AdminHelpDrawer
          title="Pricing rules help"
          buttonLabel="Rules help"
          intro="Pricing rules provide default calculation assumptions for products. Defaults keep pricing consistent, while product overrides allow special cases."
          sections={[
            { title: "Default rule behavior", body: "SETU Flow applies the most specific rule available. Product rules override category rules. Category rules override organization defaults." },
            { title: "When to edit category defaults", body: "Edit category defaults when products in a category share freight, duty, internal markup, distributor margin, or retail margin assumptions." },
            { title: "When to edit product pricing", body: "Edit product pricing when only one product or one variant needs different assumptions from the category default." },
            { title: "Product UOM and pack size", body: "Unit of measure, pack size, pack unit, and pricing basis belong to the product or variant. Defaults should only hold shared calculator assumptions like costs, duties, and margins." },
            { title: "Quote adjustments", body: "Quote-specific price reductions or increases stay on the quote and do not rewrite product, category, or organization defaults." },
          ]}
        />
      </div>

      <form action={savePricingCalculatorDefaultRule} className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
        <input type="hidden" name="return_path" value={returnPath} />
        {forcedCategory ? <input type="hidden" name="rule_scope" value="category" /> : null}
        {forcedCategory && selectedCategoryId ? <input type="hidden" name="category_id" value={selectedCategoryId} /> : null}
        {!forcedCategory ? (
          <>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Rule level
              <select name="rule_scope" defaultValue={formScope} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400">
                <option value="organization">Organization default</option>
                <option value="category">Category default</option>
              </select>
            </label>
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Category
              <select name="category_id" defaultValue="" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400">
                <option value="">Only needed for category rule</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 md:col-span-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Rule level</p><p className="mt-1 text-sm font-semibold text-slate-900">Category default · {selectedCategory?.name ?? "Selected category"}</p></div>
        )}
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Currency
          <input name="currency" defaultValue={inputValue(defaultRule?.currency, "USD")} maxLength={3} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400" />
        </label>
        <div className="md:col-span-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">Default rules cover shared calculator assumptions. Product UOM, pack size, pack unit, and pricing basis are managed inside Add/Edit Product.</div>
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Margin mode
          <select name="margin_mode" defaultValue={defaultRule?.margin_mode === "margin" ? "margin" : "markup"} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400">
            <option value="markup">Markup</option>
            <option value="margin">Margin</option>
          </select>
        </label>
        {PRICING_FIELDS.map(([name, label]) => (
          <label key={name} className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            {label}
            <input name={name} defaultValue={inputValue(defaultRule?.[name as PricingFieldName])} inputMode="decimal" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400" />
          </label>
        ))}
        <div className="md:col-span-3">
          <button type="submit" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Save default pricing rule</button>
        </div>
      </form>

      {!compact ? <div className="grid gap-3 md:grid-cols-3">
        {[
          ["Organization default", "Used when no category or product rule exists."],
          ["Category rule", "Used for products in the selected category unless a product override exists."],
          ["Product override", "Used when a specific product or variant needs unique pricing."],
        ].map(([title, body]) => <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-semibold text-slate-900">{title}</p><p className="mt-1 text-sm text-slate-500">{body}</p></div>)}
      </div> : null}
    </div>
  );
}

function AuditSummary({ auditEvents }: { auditEvents: any[] }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-950">Recent governance activity</h3>
      <div className="mt-3 space-y-2">
        {auditEvents.slice(0, 5).map((event) => <div key={event.id ?? `${event.event_type}-${event.created_at}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"><span className="font-medium text-slate-800">{String(event.event_type ?? "activity").replace(/_/g, " ")}</span><span className="text-xs text-slate-500">{String(event.created_at ?? "").split("T")[0] || "Recent"}</span></div>)}
        {!auditEvents.length ? <p className="text-sm text-slate-500">No recent audit events found.</p> : null}
      </div>
    </div>
  );
}
