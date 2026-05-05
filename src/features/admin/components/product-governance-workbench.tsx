"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CatalogImportExportWizard } from "@/features/products/components/catalog-import-export-wizard";
import { AdminHelpDrawer } from "@/features/admin/components/admin-help-drawer";
import type { ProductCategoryViewModel, ProductViewModel, ProductsSummaryViewModel } from "@/features/products/view-model";

type MarketOption = { id: string; name: string; isActive: boolean };
type Tab = "setup" | "pricing" | "imports" | "approvals" | "audit";

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

export function ProductGovernanceWorkbench({
  products,
  categories,
  markets,
  summary,
  auditEvents,
  canManageCatalog,
}: {
  products: ProductViewModel[];
  categories: ProductCategoryViewModel[];
  markets: MarketOption[];
  summary: ProductsSummaryViewModel;
  auditEvents: any[];
  canManageCatalog: boolean;
}) {
  const [tab, setTab] = useState<Tab>("setup");
  const activeProducts = products.filter((product) => product.isActive);
  const pricedActiveCount = activeProducts.filter((product) => product.baselineStatus !== "missing").length;
  const pricingGaps = Math.max(activeProducts.length - pricedActiveCount, 0);
  const tradeReadyCount = activeProducts.filter((product) => Boolean(product.hsnCode) && Boolean(product.packSize)).length;
  const approvalProtectedCount = activeProducts.filter((product) => product.pricingEntries.length > 0).length;
  const importReady = categories.length > 0 && products.length > 0;

  const rows = useMemo(() => [
    {
      title: `${pricingGaps} products are missing governed pricing`,
      note: pricingGaps ? "Open Products to fix product pricing or import a corrected baseline file." : "All active products have baseline pricing coverage.",
      status: pricingGaps ? "Action needed" : "Covered",
      statusTone: pricingGaps ? "warning" : "success",
      area: "Pricing",
      href: "/products",
      showIn: ["setup", "pricing"] as Tab[],
    },
    {
      title: `${Math.max(activeProducts.length - tradeReadyCount, 0)} products are missing full trade attributes`,
      note: "HS code and packaging fields affect export readiness and quote confidence.",
      status: tradeReadyCount === activeProducts.length ? "Complete" : "Incomplete",
      statusTone: tradeReadyCount === activeProducts.length ? "success" : "warning",
      area: "Compliance",
      href: "/products",
      showIn: ["setup"] as Tab[],
    },
    {
      title: "Client onboarding import tools are ready",
      note: "Categories, products, leads, and pricing can be imported here or during new client setup.",
      status: importReady ? "Ready" : "Needs setup",
      statusTone: importReady ? "success" : "warning",
      area: "Imports",
      onClick: () => setTab("imports"),
      showIn: ["setup", "imports"] as Tab[],
    },
    {
      title: "Product calculator is active in product workflows",
      note: "Use Add Product, Edit Product, and Product Detail for product-specific pricing changes.",
      status: "Promoted",
      statusTone: "success",
      area: "Products",
      href: "/products",
      showIn: ["setup", "pricing"] as Tab[],
    },
    {
      title: "Approval posture is monitored from governed pricing rows",
      note: `${approvalProtectedCount} active products have governed rows available to quote workflows.`,
      status: approvalProtectedCount ? "Active" : "Review",
      statusTone: approvalProtectedCount ? "info" : "warning",
      area: "Approvals",
      showIn: ["approvals"] as Tab[],
    },
  ], [activeProducts.length, approvalProtectedCount, importReady, pricingGaps, tradeReadyCount]);

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
            { title: "Pricing rules", body: "Pricing rules define default calculation logic for products and categories. They can provide default freight layers, duty assumptions, distributor margin, retail margin, and margin mode. Defaults apply unless they are edited at a more specific level.", items: ["Product-specific pricing override", "Category-level pricing rule", "Organization default pricing rule"] },
            { title: "Pricing calculator", body: "The calculator can work from EXW, FOB, CIF, DDP, Distributor Price, or Retail Price. It calculates the missing levels using cost layers, duty %, and margins. Blank values are not guessed." },
            { title: "Editing margins and defaults", body: "Admins can set default margins at the organization or category level. Product users can override margins on a specific product when that product needs different cost assumptions.", items: ["Organization default rule for common costs and margin mode", "Category rule for category-specific freight, duty, or distributor margin", "Product override only when one product needs special pricing"] },
          ]}
        />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className={metricClass("blue")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Catalog readiness</p><p className="mt-2 text-2xl font-semibold text-slate-950">{pricedActiveCount}/{activeProducts.length}</p><p className="mt-1 text-xs text-slate-500">quote-ready</p></div>
        <div className={metricClass(pricingGaps ? "amber" : "green")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Pricing gaps</p><p className="mt-2 text-2xl font-semibold text-slate-950">{pricingGaps}</p><p className="mt-1 text-xs text-slate-500">need pricing rules</p></div>
        <div className={metricClass("green")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Variant coverage</p><p className="mt-2 text-2xl font-semibold text-slate-950">{summary.totalVariants}</p><p className="mt-1 text-xs text-slate-500">variants</p></div>
        <div className={metricClass(tradeReadyCount === activeProducts.length ? "green" : "amber")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Trade attributes</p><p className="mt-2 text-2xl font-semibold text-slate-950">{tradeReadyCount}/{activeProducts.length}</p><p className="mt-1 text-xs text-slate-500">complete</p></div>
        <div className={metricClass("slate")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Approval posture</p><p className="mt-2 text-2xl font-semibold text-slate-950">{approvalProtectedCount}</p><p className="mt-1 text-xs text-slate-500">governed rows</p></div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-xl font-semibold tracking-tight text-slate-950">Governance workbench</h2><p className="mt-1 text-sm text-slate-500">Only action-focused controls that belong in Admin.</p></div>
          <div className="flex flex-wrap gap-2">
            {(["setup", "pricing", "imports", "approvals", "audit"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-3 py-2 text-xs font-semibold capitalize ${tab === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item === "setup" ? "Setup gaps" : item === "pricing" ? "Pricing rules" : item}</button>)}
          </div>
        </div>
        <div className="space-y-3 p-5">
          {tab === "imports" ? <CatalogImportExportWizard products={products} categories={categories} canManageCatalog={canManageCatalog} /> : null}
          {tab === "pricing" ? <PricingRulesSummary /> : null}
          {tab === "audit" ? <AuditSummary auditEvents={auditEvents} /> : null}
          {filteredRows.map((row) => (
            <div key={row.title} className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
              <div><h3 className="font-semibold text-slate-950">{row.title}</h3><p className="mt-1 text-sm text-slate-500">{row.note}</p></div>
              <span className={statusClass(row.statusTone as any)}>{row.status}</span>
              <span className={statusClass("neutral")}>{row.area}</span>
              {row.href ? <Link href={row.href} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 text-center shadow-sm">Review</Link> : row.onClick ? <button type="button" onClick={row.onClick} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">Review</button> : <span />}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PricingRulesSummary() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950">Pricing rule defaults</h3>
          <p className="mt-1 text-sm text-slate-500">SETU Flow applies the most specific rule available: product override, then category rule, then organization default.</p>
        </div>
        <Link href="/products" className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Edit product pricing</Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {[
          ["Organization default", "Common costs and default margin mode."],
          ["Category rule", "Shared freight, duty, or margin assumptions."],
          ["Product override", "Special pricing for one product only."],
        ].map(([title, body]) => <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="font-semibold text-slate-900">{title}</p><p className="mt-1 text-sm text-slate-500">{body}</p></div>)}
      </div>
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
