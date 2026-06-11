"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createProductCategory, updateProductCategory } from "@/features/admin/server/actions";
import { updateCategorySortOrder } from "@/features/admin/server/category-sort-actions";
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

const inputClass = "min-h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const buttonClass = "inline-flex min-h-8 items-center justify-center rounded-[9px] bg-[#1F487C] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#13305a]";
const secondaryButtonClass = "inline-flex min-h-8 items-center justify-center rounded-[9px] border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50";

function metricClass(tone: "blue" | "green" | "amber" | "slate") {
  const border = tone === "blue" ? "border-t-brand-500" : tone === "green" ? "border-t-emerald-500" : tone === "amber" ? "border-t-amber-500" : "border-t-slate-300";
  return `rounded-[11px] border border-slate-200 ${border} border-t-4 bg-white p-4 shadow-sm`;
}

function statusClass(active: boolean | null | undefined, empty = false) {
  if (!active) return "bg-slate-100 text-slate-600 ring-slate-200";
  if (empty) return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function CategoryFields({ category, categories }: { category?: CategoryRow; categories: CategoryRow[] }) {
  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
      {category ? <input type="hidden" name="id" value={category.id} /> : null}
      <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        Category name
        <input className={`${inputClass} mt-2 w-full`} name="name" defaultValue={category?.name ?? ""} placeholder="Category name, e.g. Fruit powders" required />
      </label>
      <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        Parent category
        <select className={`${inputClass} mt-2 w-full`} name="parent_id" defaultValue={category?.parent_id ?? ""}>
          <option value="">No parent</option>
          {categories.filter((item) => item.id !== category?.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
        Sort order
        <input className={`${inputClass} mt-2 w-full`} name="sort_order" type="number" defaultValue={category?.sort_order ?? 0} />
      </label>
      {category ? (
        <label className="block text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          Products using this category
          <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold normal-case tracking-normal text-slate-800">{category.product_count ?? 0}</div>
        </label>
      ) : null}
      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
        <input type="checkbox" name="is_active" defaultChecked={category?.is_active ?? true} /> Active
      </label>
    </div>
  );
}

function Drawer({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/30 backdrop-blur-sm" onClick={onClose}>
      <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[460px] flex-col border-l border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Category setup</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50" aria-label="Close category drawer">X</button>
        </div>
        {children}
      </aside>
    </div>
  );
}

export function CategoriesGovernanceWorkbench({ categories, uncategorizedProducts = 0, pricingRules = [] }: { categories: CategoryRow[]; uncategorizedProducts?: number; pricingRules?: PricingCalculatorDefaultRule[] }) {
  const [items, setItems] = useState(categories);
  const [selectedId, setSelectedId] = useState(categories[0]?.id ?? "");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("tree");

  useEffect(() => setItems(categories), [categories]);

  const selected = items.find((category) => category.id === selectedId) ?? items[0] ?? null;
  const editing = editingId ? items.find((category) => category.id === editingId) ?? null : null;
  const activeCount = items.filter((category) => category.is_active).length;
  const emptyCount = items.filter((category) => (category.product_count ?? 0) === 0).length;
  const importReady = items.length > 0 ? "Ready" : "Needs setup";
  const categoryNameById = useMemo(() => new Map(items.map((category) => [category.id, category.name])), [items]);

  function moveCategory(from: number, to: number) {
    if (from === to || from < 0 || to < 0) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    setItems(next.map((item, index) => ({ ...item, sort_order: index + 1 })));
    void updateCategorySortOrder(next.map((item) => item.id));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button type="button" onClick={() => setShowAdd(true)} className="rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800">+ Add category</button>
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
        <div className={metricClass("blue")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Categories</p><p className="mt-2 text-2xl font-semibold text-slate-950">{items.length}</p><p className="mt-1 text-xs text-slate-500">total</p></div>
        <div className={metricClass("green")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Active</p><p className="mt-2 text-2xl font-semibold text-slate-950">{activeCount}</p><p className="mt-1 text-xs text-slate-500">active</p></div>
        <div className={metricClass(emptyCount ? "amber" : "green")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Empty categories</p><p className="mt-2 text-2xl font-semibold text-slate-950">{emptyCount}</p><p className="mt-1 text-xs text-slate-500">without products</p></div>
        <div className={metricClass(uncategorizedProducts ? "amber" : "green")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Uncategorized products</p><p className="mt-2 text-2xl font-semibold text-slate-950">{uncategorizedProducts}</p><p className="mt-1 text-xs text-slate-500">needs assignment</p></div>
        <div className={metricClass(items.length ? "green" : "amber")}><p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-slate-500">Import readiness</p><p className="mt-2 text-2xl font-semibold text-slate-950">{importReady}</p><p className="mt-1 text-xs text-slate-500">taxonomy status</p></div>
      </section>

      <section className="rounded-[11px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div><h2 className="text-xl font-semibold tracking-tight text-slate-950">Taxonomy workbench</h2><p className="mt-1 text-sm text-slate-500">Drag rows to reorder. Click a row or Edit to open the category drawer.</p></div>
          <div className="flex flex-wrap gap-2">{(["tree", "mappings", "imports", "audit"] as Tab[]).map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-3 py-2 text-xs font-semibold capitalize ${tab === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{item}</button>)}</div>
        </div>

        {tab === "tree" ? (
          <div className="p-5">
            <div className="mb-3 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Drag to reorder · changes save automatically</div>
            <div className="overflow-x-auto rounded-[11px] border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Move</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Parent</th><th className="px-4 py-3">Products</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Sort</th><th className="px-4 py-3">Edit</th></tr></thead>
                <tbody>{items.map((category, index) => {
                  const empty = (category.product_count ?? 0) === 0;
                  return <tr key={category.id} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => { if (dragIndex !== null) moveCategory(dragIndex, index); setDragIndex(null); }} onClick={() => { setSelectedId(category.id); setEditingId(category.id); }} className="cursor-pointer border-t border-slate-100 transition hover:bg-slate-50"><td className="cursor-grab select-none px-4 py-3 text-xl text-slate-300">⠿</td><td className="px-4 py-3 font-semibold text-slate-950">{category.name}</td><td className="px-4 py-3 text-slate-500">{category.parent_id ? categoryNameById.get(category.parent_id) ?? "Unknown" : "None"}</td><td className="px-4 py-3"><span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">{category.product_count ?? 0}</span></td><td className="px-4 py-3"><span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${statusClass(category.is_active, empty)}`}>{category.is_active ? empty ? "Empty" : "Active" : "Inactive"}</span></td><td className="px-4 py-3 text-slate-600">#{category.sort_order ?? index + 1}</td><td className="px-4 py-3"><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedId(category.id); setEditingId(category.id); }} className={secondaryButtonClass}>Edit</button></td></tr>;
                })}</tbody>
              </table>
            </div>
            {!items.length ? <p className="mt-4 rounded-3xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">No categories configured yet.</p> : null}
          </div>
        ) : null}

        {tab === "mappings" ? <InfoPanel title="Category mappings" body="Use category names consistently in product imports. Missing or misspelled categories should be resolved before saving imported rows." /> : null}
        {tab === "imports" ? <InfoPanel title="Import categories" body="Download or use the category template from the catalog import tools. Product imports use category names to map products into the right taxonomy." cta="Open import tools" href="/admin/product-management" /> : null}
        {tab === "audit" ? <InfoPanel title="Category audit" body="Recent category changes should remain traceable through admin audit history. Use this tab to review taxonomy changes before quote or product cleanup." /> : null}
      </section>

      {selected ? <PricingRulesSummary categories={items.map((category) => ({ id: category.id, name: category.name, isActive: Boolean(category.is_active), sortOrder: Number(category.sort_order ?? 0), parentId: category.parent_id ?? null, pathLabel: category.name, rootCategoryName: category.name }))} pricingRules={pricingRules} selectedCategoryId={selected.id} returnPath="/admin/categories" compact /> : null}

      {editing ? (
        <Drawer title={editing.name} subtitle={`${editing.product_count ?? 0} products use this category`} onClose={() => setEditingId(null)}>
          <form action={updateProductCategory} className="flex flex-1 flex-col overflow-hidden"><CategoryFields category={editing} categories={items} /><div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4"><button type="button" onClick={() => setEditingId(null)} className={secondaryButtonClass}>Cancel</button><button type="submit" className={buttonClass}>Save category</button></div></form>
        </Drawer>
      ) : null}

      {showAdd ? (
        <Drawer title="Add category" subtitle="Create a taxonomy category for products, imports, and quote workflows." onClose={() => setShowAdd(false)}>
          <form action={createProductCategory} className="flex flex-1 flex-col overflow-hidden"><CategoryFields categories={items} /><div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4"><button type="button" onClick={() => setShowAdd(false)} className={secondaryButtonClass}>Cancel</button><button type="submit" className={buttonClass}>Add category</button></div></form>
        </Drawer>
      ) : null}
    </div>
  );
}

function InfoPanel({ title, body, cta, href }: { title: string; body: string; cta?: string; href?: string }) {
  return <div className="p-5"><div className="rounded-[11px] border border-slate-200 bg-slate-50 p-5"><h3 className="font-semibold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>{cta && href ? <Link href={href} className="mt-4 inline-flex rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">{cta}</Link> : null}</div></div>;
}
