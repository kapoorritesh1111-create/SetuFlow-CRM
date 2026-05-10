"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CatalogImportExportWizard } from "@/features/products/components/catalog-import-export-wizard";
import { AdminHelpDrawer } from "@/features/admin/components/admin-help-drawer";
import { savePricingCalculatorDefaultRule } from "@/features/admin/server/actions";
import type { ProductCategoryViewModel, ProductViewModel, ProductsSummaryViewModel } from "@/features/products/view-model";

type MarketOption = { id: string; name: string; isActive: boolean };
type Tab = "overview" | "masterData" | "imports" | "pricing" | "issues" | "audit";

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

function cardClass(tone: "blue" | "green" | "amber" | "slate" = "slate") {
  const toneClass = tone === "blue" ? "border-blue-100 bg-blue-50/70" : tone === "green" ? "border-emerald-100 bg-emerald-50/70" : tone === "amber" ? "border-amber-100 bg-amber-50/70" : "border-slate-200 bg-white";
  return `rounded-[1.65rem] border ${toneClass} p-5 shadow-sm`;
}

function pillClass(tone: "success" | "warning" | "info" | "neutral") {
  const map = {
    success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    warning: "bg-amber-50 text-amber-700 ring-amber-200",
    info: "bg-sky-50 text-sky-700 ring-sky-200",
    neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  } as const;
  return `inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${map[tone]}`;
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
  const [tab, setTab] = useState<Tab>("overview");
  const activeProducts = products.filter((product) => product.isActive);
  const productsWithVariants = activeProducts.filter((product) => product.variantCount > 0);
  const pricedVariantProducts = productsWithVariants.filter((product) => product.baselineStatus !== "missing").length;
  const pricingGaps = Math.max(productsWithVariants.length - pricedVariantProducts, 0);
  const variantSetupGaps = activeProducts.filter((product) => product.variantCount === 0).length;
  const tradeReadyCount = activeProducts.filter((product) => Boolean(product.hsnCode) && Boolean(product.packSize)).length;
  const missingCategoryDefaults = categories.filter((category: any) => !category.defaultLeadTimeDays && !category.defaultShelfLifeMonths && !category.defaultCountryOfOrigin).length;
  const importReady = categories.length > 0 && products.length > 0;
  const adminIssues = useMemo(() => [
    { title: `${pricingGaps} products need pricing-rule coverage`, area: "Pricing", impact: "Products may show as not quote-ready.", href: "/products?gap=has_gap", tone: pricingGaps ? "warning" : "success" },
    { title: `${variantSetupGaps} product masters need variants`, area: "Variants", impact: "Products without variants cannot carry pack/MOQ setup cleanly.", href: "/products", tone: variantSetupGaps ? "warning" : "success" },
    { title: `${missingCategoryDefaults} categories have limited defaults`, area: "Master data", impact: "New products may need manual origin, shelf-life, and lead-time entry.", href: "/admin/categories", tone: missingCategoryDefaults ? "warning" : "success" },
  ], [missingCategoryDefaults, pricingGaps, variantSetupGaps]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(12,127,255,0.12),transparent_32%),linear-gradient(180deg,#ffffff,#f8fafc)] p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-700">Catalog Admin</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Setup, governance, imports, defaults, and audit</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">This admin surface is for catalog setup and control. Use Products for day-to-day product edits, variant edits, pricing snapshots, and quote-ready catalog work.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setTab("imports")} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm">Run setup import</button>
            <Link href="/products" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm">Open Products</Link>
            <AdminHelpDrawer
              title="Catalog Admin help"
              intro="Catalog Admin is the back-office control center for setup, imports, defaults, pricing governance, and readiness monitoring."
              sections={[
                { title: "What belongs here", body: "Use this page for setup health, category/product onboarding imports, pricing default rules, import history, and governance checks." },
                { title: "What belongs in Products", body: "Use Products to add or edit sellable product rows, variants, pack/MOQ values, trade fields, and product-specific pricing." },
                { title: "Import order", body: "For a new workspace, import categories first, then products and variants, then pricing. The full setup wizard belongs in Admin; product-only shortcuts can stay in Products." },
                { title: "Boundaries", body: "Quote-only customer pricing stays in Quotes. Catalog defaults should not be overwritten by one-off quote negotiations." },
              ]}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className={cardClass("blue")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-blue-700">Products</p><p className="mt-3 text-3xl font-semibold text-slate-950">{products.length}</p><p className="mt-1 text-xs text-slate-500">catalog masters</p></div>
        <div className={cardClass(pricingGaps ? "amber" : "green")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-500">Pricing rules</p><p className="mt-3 text-3xl font-semibold text-slate-950">{pricingGaps}</p><p className="mt-1 text-xs text-slate-500">products needing coverage</p></div>
        <div className={cardClass(variantSetupGaps ? "amber" : "green")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-500">Variants</p><p className="mt-3 text-3xl font-semibold text-slate-950">{variantSetupGaps}</p><p className="mt-1 text-xs text-slate-500">masters needing setup</p></div>
        <div className={cardClass("slate")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-500">Categories</p><p className="mt-3 text-3xl font-semibold text-slate-950">{categories.length}</p><p className="mt-1 text-xs text-slate-500">master-data rows</p></div>
        <div className={cardClass(importReady ? "green" : "amber")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-slate-500">Imports</p><p className="mt-3 text-3xl font-semibold text-slate-950">{auditEvents.length}</p><p className="mt-1 text-xs text-slate-500">recent activity records</p></div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { key: "masterData", title: "Master data", body: "Categories, product families, brands, pack units, trade defaults, and taxonomy setup.", cta: "Review setup" },
          { key: "imports", title: "Import center", body: "Admin-owned onboarding flow for categories, products, pricing, leads, and future full setup imports.", cta: "Open imports" },
          { key: "pricing", title: "Pricing defaults", body: "Organization and category calculator defaults. Product-specific pricing remains in Products.", cta: "Manage rules" },
          { key: "issues", title: "Admin issues", body: "Setup gaps that affect quote readiness, import confidence, or trade completeness.", cta: "View issues" },
        ].map((item) => (
          <button key={item.key} type="button" onClick={() => setTab(item.key as Tab)} className={`rounded-[1.5rem] border p-4 text-left shadow-sm transition ${tab === item.key ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"}`}>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className={`mt-2 text-sm leading-5 ${tab === item.key ? "text-slate-200" : "text-slate-500"}`}>{item.body}</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em]">{item.cta}</p>
          </button>
        ))}
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-xl font-semibold tracking-tight text-slate-950">Admin workbench</h2><p className="mt-1 text-sm text-slate-500">Back-office setup and governance controls separated from the product selling workspace.</p></div>
          <div className="flex flex-wrap gap-2">
            {(["overview", "masterData", "imports", "pricing", "issues", "audit"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-3 py-2 text-xs font-semibold ${tab === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item === "masterData" ? "Master data" : item}</button>)}
          </div>
        </div>
        <div className="p-5">
          {tab === "overview" ? <OverviewPanel products={products} categories={categories} markets={markets} summary={summary} tradeReadyCount={tradeReadyCount} pricedVariantProducts={pricedVariantProducts} productsWithVariants={productsWithVariants.length} /> : null}
          {tab === "masterData" ? <MasterDataPanel categories={categories} /> : null}
          {tab === "imports" ? <ImportCenterPanel products={products} categories={categories} canManageCatalog={canManageCatalog} /> : null}
          {tab === "pricing" ? <PricingRulesSummary categories={categories} pricingRules={pricingRules} /> : null}
          {tab === "issues" ? <IssuesPanel issues={adminIssues} /> : null}
          {tab === "audit" ? <AuditSummary auditEvents={auditEvents} /> : null}
        </div>
      </section>
    </div>
  );
}

function OverviewPanel({ products, categories, markets, summary, tradeReadyCount, pricedVariantProducts, productsWithVariants }: { products: ProductViewModel[]; categories: ProductCategoryViewModel[]; markets: MarketOption[]; summary: ProductsSummaryViewModel; tradeReadyCount: number; pricedVariantProducts: number; productsWithVariants: number }) {
  return <div className="grid gap-4 lg:grid-cols-3">
    <div className={cardClass("blue")}><h3 className="font-semibold text-slate-950">Setup health</h3><p className="mt-2 text-sm leading-6 text-slate-600">{pricedVariantProducts}/{productsWithVariants} product masters with variants have governed pricing coverage. {tradeReadyCount}/{products.length} active products have core trade attributes.</p></div>
    <div className={cardClass()}><h3 className="font-semibold text-slate-950">Admin master data</h3><p className="mt-2 text-sm leading-6 text-slate-600">{categories.length} categories and {markets.filter((market) => market.isActive).length} active markets are available for setup and import routing.</p></div>
    <div className={cardClass("green")}><h3 className="font-semibold text-slate-950">Catalog boundary</h3><p className="mt-2 text-sm leading-6 text-slate-600">Use this page for governance. Use Products for row edits. Use Quotes for customer-specific negotiation and quote-only pricing.</p></div>
  </div>;
}

function MasterDataPanel({ categories }: { categories: ProductCategoryViewModel[] }) {
  return <div className="space-y-4">
    <div className="flex flex-col gap-3 rounded-3xl border border-blue-100 bg-blue-50 p-4 lg:flex-row lg:items-center lg:justify-between"><div><h3 className="font-semibold text-slate-950">Categories and product taxonomy</h3><p className="mt-1 text-sm text-blue-900">Category import belongs in Catalog Admin. Product edits belong in Products.</p></div><div className="flex gap-2"><Link href="/admin/categories" className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-blue-900 shadow-sm ring-1 ring-blue-100">Open categories</Link></div></div>
    <div className="grid gap-3 md:grid-cols-3">{[
      ["Categories", `${categories.length} rows`],
      ["Defaults", "Origin, shelf life, lead time, shipment notes"],
      ["Next step", "Category page polish in Sprint 10C"],
    ].map(([title, body]) => <div key={title} className={cardClass()}><p className="font-semibold text-slate-950">{title}</p><p className="mt-1 text-sm text-slate-500">{body}</p></div>)}</div>
  </div>;
}

function ImportCenterPanel({ products, categories, canManageCatalog }: { products: ProductViewModel[]; categories: ProductCategoryViewModel[]; canManageCatalog: boolean }) {
  return <div className="space-y-4">
    <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Recommended setup order</p><h3 className="mt-1 font-semibold text-slate-950">Categories → Products + variants → Pricing rules → Leads</h3><p className="mt-1 text-sm leading-6 text-emerald-900">This admin import center is the full setup surface. The Products page can keep product-only shortcuts, but onboarding and additions start here.</p></div>
    <CatalogImportExportWizard products={products} categories={categories} canManageCatalog={canManageCatalog} />
  </div>;
}

function IssuesPanel({ issues }: { issues: { title: string; area: string; impact: string; href: string; tone: string }[] }) {
  return <div className="space-y-3">{issues.map((issue) => <div key={issue.title} className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[1fr_auto_auto] lg:items-center"><div><h3 className="font-semibold text-slate-950">{issue.title}</h3><p className="mt-1 text-sm text-slate-500">{issue.impact}</p></div><span className={pillClass(issue.tone === "warning" ? "warning" : "success")}>{issue.area}</span><Link href={issue.href} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-center text-sm font-semibold text-slate-700 shadow-sm">Open</Link></div>)}</div>;
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

  return (
    <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><h3 className="font-semibold text-slate-950">{forcedCategory ? `${selectedCategory?.name ?? "Selected category"} pricing defaults` : "Default pricing calculator rules"}</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">Set shared calculator defaults. Product UOM, pack size, units per case, MOQ, and pricing basis are edited on the product/variant, not in defaults.</p></div><AdminHelpDrawer title="Pricing rules help" buttonLabel="Rules help" intro="Pricing rules provide default calculation assumptions for products." sections={[{ title: "Default rule behavior", body: "SETU Flow applies the most specific rule available: product, then category, then organization." }, { title: "Quote adjustments", body: "Quote-specific price reductions or increases stay on the quote and do not rewrite product, category, or organization defaults." }]} /></div>
      <form action={savePricingCalculatorDefaultRule} className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
        <input type="hidden" name="return_path" value={returnPath} />
        {forcedCategory ? <input type="hidden" name="rule_scope" value="category" /> : null}
        {forcedCategory && selectedCategoryId ? <input type="hidden" name="category_id" value={selectedCategoryId} /> : null}
        {!forcedCategory ? <><label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Rule level<select name="rule_scope" defaultValue="organization" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400"><option value="organization">Organization default</option><option value="category">Category default</option></select></label><label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Category<select name="category_id" defaultValue="" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400"><option value="">Only needed for category rule</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></> : <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 md:col-span-2"><p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Rule level</p><p className="mt-1 text-sm font-semibold text-slate-900">Category default · {selectedCategory?.name ?? "Selected category"}</p></div>}
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Currency<input name="currency" defaultValue={inputValue(defaultRule?.currency, "USD")} maxLength={3} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400" /></label>
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Margin mode<select name="margin_mode" defaultValue={defaultRule?.margin_mode === "margin" ? "margin" : "markup"} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400"><option value="markup">Markup</option><option value="margin">Margin</option></select></label>
        {PRICING_FIELDS.map(([name, label]) => <label key={name} className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}<input name={name} defaultValue={inputValue(defaultRule?.[name as PricingFieldName])} inputMode="decimal" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400" /></label>)}
        <div className="md:col-span-3"><button type="submit" className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white">Save default pricing rule</button></div>
      </form>
      {!compact ? <div className="grid gap-3 md:grid-cols-3">{[["Organization default", "Used when no category or product rule exists."], ["Category rule", "Used for products in the selected category unless a product override exists."], ["Product override", "Used from Products when a specific product or variant needs unique pricing."]].map(([title, body]) => <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-semibold text-slate-900">{title}</p><p className="mt-1 text-sm text-slate-500">{body}</p></div>)}</div> : null}
    </div>
  );
}

function AuditSummary({ auditEvents }: { auditEvents: any[] }) {
  return <div className="rounded-3xl border border-slate-200 bg-white p-4"><h3 className="font-semibold text-slate-950">Recent governance activity</h3><div className="mt-3 space-y-2">{auditEvents.slice(0, 8).map((event) => <div key={event.id ?? `${event.event_type}-${event.created_at}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"><span className="font-medium text-slate-800">{String(event.event_type ?? "activity").replace(/_/g, " ")}</span><span className="text-xs text-slate-500">{String(event.created_at ?? "").split("T")[0] || "Recent"}</span></div>)}{!auditEvents.length ? <p className="text-sm text-slate-500">No recent audit events found.</p> : null}</div></div>;
}
