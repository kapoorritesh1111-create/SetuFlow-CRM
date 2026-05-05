"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { createProductCategory, updateProductCategory } from "@/features/admin/server/actions";
import { AdminHelpDrawer } from "@/features/admin/components/admin-help-drawer";
import { PricingRulesSummary, type PricingCalculatorDefaultRule } from "@/features/admin/components/product-governance-workbench";

type CategoryRow = {
  id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean | null;
  parent_id?: string | null;
  product_count?: number | null;
};

type Tab = "tree" | "mappings" | "imports" | "audit";

const inputClass = "min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800";
const secondaryButtonClass = "inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50";

function metricClass(tone: "blue" | "green" | "amber" | "slate") {
  const border = tone === "blue" ? "border-t-brand-500" : tone === "green" ? "border-t-emerald-500" : tone === "amber" ? "border-t-amber-500" : "border-t-slate-300";
  return `rounded-3xl border border-slate-200 ${border} border-t-4 bg-white p-4 shadow-sm`;
}

function statusClass(active: boolean | null | undefined, empty = false) {
  if (!active) return "bg-slate-100 text-slate-600 ring-slate-200";
  if (empty) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

export function CategoriesGovernanceWorkbench({ categories, uncategorizedProducts = 0, pricingRules = [] }: { categories: CategoryRow[]; uncategorizedProducts?: number; pricingRules?: PricingCalculatorDefaultRule[] }) {
  const [selectedId, setSelectedId] = useState(categories[0]?.id ?? "");
  const [tab, setTab] = useState<Tab>("tree");
  const selected = categories.find((category) => category.id === selectedId) ?? categories[0] ?? null;
  const activeCount = categories.filter((category) => category.is_active).length;
  const emptyCount = categories.filter((category) => (category.product_count ?? 0) === 0).length;
  const importReady = categories.length > 0 ? "Ready" : "Needs setup";
  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={() => setTab("tree")} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">Add category</button>
        <button type="button" onClick={() => setTab("imports")} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300">Import categories</button>
        <Link href="/products" className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300">Open Products</Link>
        <AdminHelpDrawer
          title="Categories help"
          intro="Categories organize the product catalog and help imports, product selection, and quote workflows stay consistent."
          sections={[
            { title: "Why categories matter", body: "Categories group products into a clean taxonomy. This helps users find products, import catalog data correctly, and keep quote/product selection organized." },
            { title: "How categories connect to products", body: "Each product can belong to a category. Product users can filter by category, assign products to categories, and review products grouped by category in the Products workspace." },
            { title: "How imports use categories", body: "Product imports often include category names. If a category exists, imported products can map cleanly. If a category is missing or misspelled, the import wizard should warn the user before saving." },
            { title: "How categories connect to pricing rules", body: "Categories can carry default pricing rules. These defaults are useful when all products in a category share common margin, freight, duty, or cost assumptions.", items: ["Product-specific pricing override", "Category-level pricing rule", "Organization default pricing rule"] },
            { title: "How quote flows use categories", body: "Quotes and buyer workflows can use category context to organize product choices and keep line-item selection clearer for operators." },
            { title: "When to deactivate a category", body: "Deactivate a category when it should no longer be used for new product setup or imports. Existing product history should remain traceable." },
          ]}
        />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <div className={metricClass("blue")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Categories</p><p className="mt-2 text-2xl font-semibold text-slate-950">{categories.length}</p><p className="mt-1 text-xs text-slate-500">total</p></div>
        <div className={metricClass("green")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Active</p><p className="mt-2 text-2xl font-semibold text-slate-950">{activeCount}</p><p className="mt-1 text-xs text-slate-500">active</p></div>
        <div className={metricClass(emptyCount ? "amber" : "green")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Empty categories</p><p className="mt-2 text-2xl font-semibold text-slate-950">{emptyCount}</p><p className="mt-1 text-xs text-slate-500">without products</p></div>
        <div className={metricClass(uncategorizedProducts ? "amber" : "green")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Uncategorized products</p><p className="mt-2 text-2xl font-semibold text-slate-950">{uncategorizedProducts}</p><p className="mt-1 text-xs text-slate-500">needs assignment</p></div>
        <div className={metricClass(categories.length ? "green" : "amber")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Import readiness</p><p className="mt-2 text-2xl font-semibold text-slate-950">{importReady}</p><p className="mt-1 text-xs text-slate-500">taxonomy status</p></div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-xl font-semibold tracking-tight text-slate-950">Taxonomy workbench</h2><p className="mt-1 text-sm text-slate-500">Manage category rows, hierarchy, active state, and product coverage.</p></div>
            <div className="flex flex-wrap gap-2">{(["tree", "mappings", "imports", "audit"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-3 py-2 text-xs font-semibold capitalize ${tab === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item}</button>)}</div>
          </div>

          {tab === "tree" ? (
            <div className="space-y-3 p-5">
              <form action={createProductCategory} className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_120px_auto] md:items-end">
                <div><label className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Category name</label><input className={`${inputClass} mt-2 w-full`} name="name" placeholder="Category name, e.g. Fruit powders" required /></div>
                <div><label className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Parent category</label><select className={`${inputClass} mt-2 w-full`} name="parent_id" defaultValue=""><option value="">No parent</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
                <div><label className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Sort</label><input className={`${inputClass} mt-2 w-full`} name="sort_order" type="number" defaultValue="0" /></div>
                <button className={buttonClass} type="submit">Add category</button>
              </form>

              <div className="space-y-2">
                {categories.map((category) => {
                  const isSelected = selected?.id === category.id;
                  const empty = (category.product_count ?? 0) === 0;
                  return (
                    <button key={category.id} type="button" onClick={() => setSelectedId(category.id)} className={`grid w-full gap-3 rounded-3xl border p-4 text-left transition lg:grid-cols-[1fr_auto_auto_auto] lg:items-center ${isSelected ? "border-brand-300 bg-sky-50/70" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                      <div><h3 className="font-semibold text-slate-950">{category.name}</h3><p className="mt-1 text-sm text-slate-500">Parent: {category.parent_id ? categoryNameById.get(category.parent_id) ?? "Unknown" : "None"}</p></div>
                      <div><p className="font-semibold text-slate-900">{category.product_count ?? 0}</p><p className="text-xs text-slate-500">products</p></div>
                      <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(category.is_active, empty)}`}>{category.is_active ? empty ? "Empty" : "Active" : "Inactive"}</span>
                      <span className="text-sm font-semibold text-slate-600">Sort {category.sort_order ?? 0}</span>
                    </button>
                  );
                })}
                {!categories.length ? <p className="rounded-3xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">No categories configured yet.</p> : null}
              </div>
            </div>
          ) : null}

          {tab === "mappings" ? <InfoPanel title="Category mappings" body="Use category names consistently in product imports. Missing or misspelled categories should be resolved before saving imported rows." /> : null}
          {tab === "imports" ? <InfoPanel title="Import categories" body="Download or use the category template from the catalog import tools. Product imports use category names to map products into the right taxonomy." cta="Open import tools" href="/admin/product-management" /> : null}
          {tab === "audit" ? <InfoPanel title="Category audit" body="Recent category changes should remain traceable through admin audit history. Use this tab to review taxonomy changes before quote or product cleanup." /> : null}
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5"><h2 className="text-xl font-semibold tracking-tight text-slate-950">Selected category</h2><p className="mt-1 text-sm text-slate-500">Edit only taxonomy data that belongs in Admin.</p></div>
          {selected ? (
            <>
            <form action={updateProductCategory} className="space-y-4 p-5">
              <input type="hidden" name="id" value={selected.id} />
              <div><label className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Category name</label><input className={`${inputClass} mt-2 w-full`} name="name" defaultValue={selected.name} required /></div>
              <div><label className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Parent category</label><select className={`${inputClass} mt-2 w-full`} name="parent_id" defaultValue={selected.parent_id ?? ""}><option value="">No parent</option>{categories.filter((category) => category.id !== selected.id).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div>
              <div className="grid gap-3 sm:grid-cols-2"><div><label className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Sort order</label><input className={`${inputClass} mt-2 w-full`} name="sort_order" type="number" defaultValue={selected.sort_order ?? 0} /></div><div><label className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Products using this category</label><div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-800">{selected.product_count ?? 0}</div></div></div>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700"><input type="checkbox" name="is_active" defaultChecked={selected.is_active ?? true} /> Active</label>
              <div className="flex flex-wrap gap-2"><button type="submit" className={buttonClass}>Save category</button><Link href={`/products?category=${encodeURIComponent(selected.name)}`} className={secondaryButtonClass}>Open products in this category</Link></div>
            </form>
            
              <div className="border-t border-slate-200 pt-5">
                <PricingRulesSummary
                  categories={categories.map((category) => ({
                    id: category.id,
                    name: category.name,
                    isActive: Boolean(category.is_active),
                    sortOrder: Number(category.sort_order ?? 0),
                    parentId: category.parent_id ?? null,
                    pathLabel: category.name,
                    rootCategoryName: category.name,
                  }))}
                  pricingRules={pricingRules}
                  selectedCategoryId={selected.id}
                  returnPath="/admin/categories"
                  compact
                />
              </div>
            </>
          ) : <p className="p-5 text-sm text-slate-500">Select or create a category to edit taxonomy details.</p>}
        </div>
      </section>
    </div>
  );
}

function InfoPanel({ title, body, cta, href }: { title: string; body: string; cta?: string; href?: string }) {
  return <div className="p-5"><div className="rounded-3xl border border-slate-200 bg-slate-50 p-5"><h3 className="font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>{cta && href ? <Link href={href} className="mt-4 inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">{cta}</Link> : null}</div></div>;
}
