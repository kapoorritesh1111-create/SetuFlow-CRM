"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PRODUCT_ROUTES } from "@/lib/product-contract";
import { deleteProduct } from "@/features/products/api/delete-product";
import { updateProductDetail } from "@/features/products/api/update-product-detail";
import { ProductPricingCalculatorPanel } from "@/features/products/components/product-pricing-calculator-panel";
import type {
  ProductDetailResponse,
  UpdateProductVariantPayload,
} from "@/types/products";

type Props = {
  open: boolean;
  productId: string | null;
  detail: ProductDetailResponse | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSaved: (detail: ProductDetailResponse) => Promise<void> | void;
  onDeleted?: () => Promise<void> | void;
  canManageCatalog?: boolean;
  readOnlyMessage?: string | null;
  actionBlockedMessage?: string | null;
  onActionBlocked?: (message: string) => void;
  initialTab?: DrawerTab;
  focusedVariantId?: string | null;
};

export type DrawerTab = "overview" | "pricing" | "variants" | "trade" | "history";
type VariantDraft = {
  is_quoteable: boolean;
  ex_factory_value: string;
  ex_factory_unit: "unit" | "case" | "kg" | "";
  fob_value: string;
  fob_unit: "unit" | "case" | "kg" | "";
  bulk_value: string;
  cif_value: string;
  cif_unit: "unit" | "case" | "";
};

type DrawerTabMeta = {
  key: DrawerTab;
  label: string;
  action: string;
  description: string;
  boundary: string;
};

const tabs: DrawerTabMeta[] = [
  {
    key: "overview",
    label: "Overview",
    action: "Edit product identity",
    description: "Use this tab for product name, brand, description, status, and master data confidence.",
    boundary: "Does not change quote-specific discounts or one-off customer terms.",
  },
  {
    key: "pricing",
    label: "Pricing",
    action: "Update product defaults",
    description: "Use this tab for saved pricing assumptions and product-default calculator snapshots that future quotes can inherit.",
    boundary: "Quote-only overrides still belong in Quotes, not in the product master.",
  },
  {
    key: "variants",
    label: "Variants",
    action: "Review pack readiness",
    description: "Use this tab to see SKU, pack, MOQ, and quote-ready status for each product variant.",
    boundary: "Variant rows guide readiness; customer-specific price changes stay in the quote workspace.",
  },
  {
    key: "trade",
    label: "Trade",
    action: "Prepare downstream handoff",
    description: "Use this tab to decide whether the product is ready for quick quote, leads, pipeline, or quotes.",
    boundary: "Trade routing should not bypass catalog readiness, compliance, or approval checks.",
  },
  {
    key: "history",
    label: "History",
    action: "Check saved posture",
    description: "Use this tab to review the current saved catalog posture before relying on the product downstream.",
    boundary: "History is a review surface; it does not perform write-back actions.",
  },
];

function toDraft(detail: ProductDetailResponse | null): Record<string, VariantDraft> {
  return Object.fromEntries((detail?.variants ?? []).map((variant) => [
    variant.product_variant_id,
    {
      is_quoteable: Boolean(variant.is_quoteable),
      ex_factory_value: variant.ex_factory_value == null ? "" : String(variant.ex_factory_value),
      ex_factory_unit: variant.ex_factory_unit ?? "",
      fob_value: variant.fob_value == null ? "" : String(variant.fob_value),
      fob_unit: variant.fob_unit ?? "",
      bulk_value: variant.bulk_value == null ? "" : String(variant.bulk_value),
      cif_value: (variant as any).cif_reference_usd_per_unit == null ? "" : String((variant as any).cif_reference_usd_per_unit),
      cif_unit: (variant as any).cif_reference_unit ?? "",
    },
  ]));
}

function statusPill(label: string, tone: "ready" | "warning" | "neutral" = "neutral") {
  const classes = tone === "ready" ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : tone === "warning" ? "bg-amber-50 text-amber-700 ring-amber-200" : "bg-slate-100 text-slate-600 ring-slate-200";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ring-1 ${classes}`}>{label}</span>;
}

function priceSnapshotCards(detail: ProductDetailResponse) {
  const snapshot = detail.product.pricing_snapshot;
  if (!snapshot) return null;
  const currency = snapshot.pricing_currency ?? "USD";
  const values = [
    ["EXW", snapshot.exw_price],
    ["FOB", snapshot.fob_price],
    ["CIF", snapshot.cif_price],
    ["DDP", snapshot.ddp_price],
    ["Distributor", snapshot.distributor_price],
    ["Retail", snapshot.retail_price],
  ] as const;
  return (
    <section className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Saved pricing snapshot</p>
          <p className="mt-1 text-sm text-slate-500">Current saved product default before recalculating or editing assumptions.</p>
        </div>
        {statusPill(currency)}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {values.map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-slate-50 px-3 py-3">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</div>
            <div className="mt-1 text-sm font-black text-slate-950">{typeof value === "number" ? `${currency} ${value.toFixed(2)}` : "—"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function drawerGuidanceCard(tab: DrawerTabMeta) {
  return (
    <section className="mb-4 rounded-[1.35rem] border border-blue-100 bg-blue-50/80 p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-blue-700">{tab.action}</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">{tab.description}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">{tab.label}</span>
      </div>
      <p className="mt-3 rounded-2xl bg-white/80 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 ring-1 ring-blue-100">{tab.boundary}</p>
    </section>
  );
}

export function ProductDetailDrawer({
  open,
  detail,
  loading,
  error,
  onClose,
  onSaved,
  onDeleted,
  canManageCatalog = true,
  readOnlyMessage = null,
  actionBlockedMessage = null,
  onActionBlocked,
  initialTab = "overview",
  focusedVariantId = null,
}: Props) {
  const [name, setName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");
  const [variantDrafts, setVariantDrafts] = useState<Record<string, VariantDraft>>({});

  useEffect(() => {
    setName(detail?.product.name ?? "");
    setBrandName(detail?.product.brand_name ?? "");
    setDescription(detail?.product.description ?? "");
    setIsActive(Boolean(detail?.product.is_active ?? true));
    setVariantDrafts(toDraft(detail));
    setActionError(null);
    setActiveTab(initialTab);
  }, [detail, initialTab]);

  const changedVariants = useMemo<UpdateProductVariantPayload[]>(() => {
    if (!detail) return [];
    return detail.variants.flatMap((variant) => {
      const draft = variantDrafts[variant.product_variant_id];
      if (!draft) return [];
      const toNumber = (value: string) => value.trim() === "" ? null : Number(value);
      const exFactoryValue = toNumber(draft.ex_factory_value);
      const fobValue = toNumber(draft.fob_value);
      const bulkValue = toNumber(draft.bulk_value);
      const cifValue = toNumber(draft.cif_value);
      const exFactoryUnit = draft.ex_factory_unit || null;
      const fobUnit = draft.fob_unit || null;
      const cifUnit = (draft.cif_unit || null) as "unit" | "case" | null;
      const changed = draft.is_quoteable !== Boolean(variant.is_quoteable) || exFactoryValue !== variant.ex_factory_value || exFactoryUnit !== (variant.ex_factory_unit ?? null) || fobValue !== variant.fob_value || fobUnit !== (variant.fob_unit ?? null) || bulkValue !== variant.bulk_value || cifValue !== ((variant as any).cif_reference_usd_per_unit ?? null);
      if (!changed) return [];
      return [{
        product_variant_id: variant.product_variant_id,
        is_quoteable: draft.is_quoteable,
        ex_factory_value: Number.isFinite(exFactoryValue as number) ? exFactoryValue : null,
        ex_factory_unit: exFactoryUnit,
        fob_value: Number.isFinite(fobValue as number) ? fobValue : null,
        fob_unit: fobUnit,
        bulk_value: Number.isFinite(bulkValue as number) ? bulkValue : null,
        cif_value: Number.isFinite(cifValue as number) ? cifValue : null,
        cif_unit: cifUnit,
      }];
    });
  }, [detail, variantDrafts]);

  const hasProductChanges = useMemo(() => {
    if (!detail) return false;
    return name !== (detail.product.name ?? "") || brandName !== (detail.product.brand_name ?? "") || description !== (detail.product.description ?? "") || isActive !== Boolean(detail.product.is_active);
  }, [brandName, description, detail, isActive, name]);

  const hasChanges = hasProductChanges || changedVariants.length > 0;
  const quoteReadyVariants = useMemo(() => detail?.variants.filter((variant) => variant.is_quoteable).length ?? 0, [detail]);
  const pricedVariants = useMemo(() => detail?.variants.filter((variant) => variant.ex_factory_value != null || variant.fob_value != null || variant.bulk_value != null).length ?? 0, [detail]);
  const activeTabMeta = useMemo(() => tabs.find((tab) => tab.key === activeTab) ?? tabs[0], [activeTab]);

  const selectedPricingVariant = useMemo(() => {
    if (!detail?.variants.length) return null;
    return detail.variants.find((variant) => variant.product_variant_id === focusedVariantId) ?? detail.variants.find((variant) => variant.product_variant_id === detail.product.pricing_snapshot?.product_variant_id) ?? detail.variants[0];
  }, [detail, focusedVariantId]);

  const selectedPricingVariantOptions = useMemo(() => selectedPricingVariant ? [{
    id: selectedPricingVariant.product_variant_id,
    name: selectedPricingVariant.variant_name,
    skuCode: selectedPricingVariant.sku_code,
    packLabel: selectedPricingVariant.pack_label,
    unitsPerCase: selectedPricingVariant.units_per_case,
    moqDisplay: selectedPricingVariant.moq_display,
    pricingModeDefault: selectedPricingVariant.pricing_mode_default,
    exFactoryValue: selectedPricingVariant.ex_factory_value,
    fobValue: selectedPricingVariant.fob_value,
  }] : [], [selectedPricingVariant]);

  if (!open) return null;

  const block = (message: string) => {
    setActionError(message);
    onActionBlocked?.(message);
  };

  const save = async () => {
    if (!detail || !hasChanges) return;
    if (!canManageCatalog) {
      block(readOnlyMessage ?? "Read-only mode is active. Ask a catalog manager to update this product.");
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const updated = await updateProductDetail(detail.product.id, {
        name: name.trim() || detail.product.name,
        brand_name: brandName.trim() || null,
        description: description.trim() || null,
        is_active: isActive,
        variants: changedVariants,
      });
      await onSaved(updated);
    } catch (saveError) {
      setActionError(saveError instanceof Error ? saveError.message : "Failed to update product.");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async () => {
    if (!detail) return;
    if (!canManageCatalog) {
      block(readOnlyMessage ?? "Read-only mode is active. Ask a catalog manager to delete this product.");
      return;
    }
    const confirmed = window.confirm(`Delete ${detail.product.name}? This will mark the product, its variants, and catalog pricing inactive.`);
    if (!confirmed) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteProduct(detail.product.id);
      await onDeleted?.();
      onClose();
    } catch (deleteError) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Failed to delete product.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[1px]">
      <aside className="flex h-full w-full max-w-[780px] flex-col bg-[#F8FBFF] shadow-2xl">
        <header className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">Product detail</div>
                {detail ? statusPill(detail.product.is_active ? "Active" : "Inactive", detail.product.is_active ? "ready" : "warning") : null}
                {detail ? statusPill(`${quoteReadyVariants}/${detail.variants.length} quote-ready`, quoteReadyVariants ? "ready" : "warning") : null}
                {detail ? statusPill(`${pricedVariants} priced`, pricedVariants ? "ready" : "neutral") : null}
              </div>
              <h2 className="mt-2 truncate text-2xl font-semibold text-slate-950">{detail?.product.name ?? "Loading product..."}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Edit core catalog data, variants, and product pricing defaults without changing quote-only decisions.</p>
            </div>
            <button type="button" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50" onClick={onClose}>Close</button>
          </div>
          {detail ? (
            <div className="mt-4 flex gap-2 overflow-x-auto border-t border-slate-100 pt-3">
              {tabs.map((tab) => (
                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} title={`${tab.action}: ${tab.boundary}`} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${activeTab === tab.key ? "bg-slate-950 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"}`}>{tab.label}</button>
              ))}
            </div>
          ) : null}
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!canManageCatalog && readOnlyMessage ? <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">{readOnlyMessage}</div> : null}
          {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading product detail...</div> : null}
          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{error}</div> : null}
          {actionBlockedMessage ? <div className="mb-4 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">{actionBlockedMessage}</div> : null}
          {actionError ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{actionError}</div> : null}
          {detail ? drawerGuidanceCard(activeTabMeta) : null}

          {detail && activeTab === "overview" ? (
            <div className="space-y-5">
              <section className="rounded-[1.4rem] border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-sm font-semibold text-slate-950">Core product details</p><p className="mt-1 text-xs text-slate-500">Keep master data simple. Pricing and quote decisions sit in their own tabs.</p></div>
                  {statusPill(canManageCatalog ? "Editable" : "Read only")}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Product name<input value={name} readOnly={!canManageCatalog} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" /></label>
                  <label className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Brand<input value={brandName} readOnly={!canManageCatalog} onChange={(e) => setBrandName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400" /></label>
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
                  <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Category</div><div className="mt-2 text-sm font-semibold text-slate-950">{detail.product.category_name ?? "—"}</div></div>
                    <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Pricing type</div><div className="mt-2 text-sm font-semibold capitalize text-slate-950">{detail.product.pricing_type ?? "—"}</div></div>
                  </div>
                  <label className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-900"><div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</div><span className="mt-3 inline-flex items-center gap-3"><input type="checkbox" checked={isActive} disabled={!canManageCatalog} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 rounded border-slate-300" /> Active product</span></label>
                </div>
                <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Description<textarea value={description} readOnly={!canManageCatalog} onChange={(e) => setDescription(e.target.value)} rows={4} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-400" placeholder="Add commercial description, notes, claims, or product summary." /></label>
              </section>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center"><div className="text-2xl font-bold text-emerald-700">{quoteReadyVariants}</div><div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Quote-ready</div></div>
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-center"><div className="text-2xl font-bold text-blue-700">{pricedVariants}</div><div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Priced variants</div></div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center"><div className="text-2xl font-bold text-slate-900">{detail.variants.length}</div><div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Variants</div></div>
              </div>
            </div>
          ) : null}

          {detail && activeTab === "pricing" ? (
            <div className="space-y-4">
              {priceSnapshotCards(detail)}
              <ProductPricingCalculatorPanel
                productId={detail.product.id}
                productVariantId={selectedPricingVariant?.product_variant_id ?? null}
                variantOptions={selectedPricingVariantOptions}
                productName={detail.product.name}
                canManageCatalog={canManageCatalog}
                compact
                initialValues={{
                  startLevel: detail.product.pricing_snapshot?.pricing_start_level ?? "exw",
                  startPrice: detail.product.pricing_snapshot?.exw_price ?? selectedPricingVariant?.ex_factory_value ?? detail.product.pricing_snapshot?.fob_price ?? selectedPricingVariant?.fob_value ?? null,
                  currency: detail.product.pricing_snapshot?.pricing_currency ?? "USD",
                  inlandTransportCost: detail.product.pricing_snapshot?.inland_transport_cost,
                  exportCustomsCost: detail.product.pricing_snapshot?.export_customs_cost,
                  portHandlingCost: detail.product.pricing_snapshot?.port_handling_cost,
                  freightCost: detail.product.pricing_snapshot?.freight_cost,
                  insuranceCost: detail.product.pricing_snapshot?.insurance_cost,
                  importDutyPercent: detail.product.pricing_snapshot?.import_duty_percent,
                  destinationCharges: detail.product.pricing_snapshot?.destination_charges,
                  localDeliveryCost: detail.product.pricing_snapshot?.local_delivery_cost,
                  distributorMarginPercent: detail.product.pricing_snapshot?.distributor_margin_percent,
                  retailMarginPercent: detail.product.pricing_snapshot?.retail_margin_percent,
                  marginMode: detail.product.pricing_snapshot?.pricing_margin_mode ?? "markup",
                  defaultUnitOfMeasure: detail.product.pricing_snapshot?.default_unit_of_measure ?? selectedPricingVariant?.pricing_mode_default ?? "unit",
                  packSize: detail.product.pricing_snapshot?.pack_size ?? selectedPricingVariant?.units_per_case ?? null,
                  packSizeUnit: detail.product.pricing_snapshot?.pack_size_unit ?? selectedPricingVariant?.pack_label ?? null,
                  pricingMode: detail.product.pricing_snapshot?.pricing_mode_default ?? selectedPricingVariant?.pricing_mode_default ?? "unit",
                }}
                onSaved={async () => {
                  const refreshed = await import("@/features/products/api/get-product-detail").then((module) => module.getProductDetail(detail.product.id));
                  await onSaved(refreshed);
                }}
              />
              {selectedPricingVariant ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Pricing is being edited for <strong>{selectedPricingVariant.variant_name}</strong>. Use this only for product defaults that future quotes can inherit.</div> : null}
            </div>
          ) : null}

          {detail && activeTab === "variants" ? (
            <div className="space-y-3">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600">
                <p className="font-semibold text-slate-950">Variant readiness view</p>
                <p className="mt-1">Review SKU, pack, MOQ, and quote-ready status here. Open Pricing when the issue is product-default pricing coverage; use Quotes for customer-specific discounts or one-off terms.</p>
              </section>
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-[0.16em] text-slate-500"><tr><th className="px-4 py-3">Variant</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Pack</th><th className="px-4 py-3">MOQ</th><th className="px-4 py-3">Ready</th></tr></thead><tbody className="divide-y divide-slate-100">{detail.variants.map((variant) => <tr key={variant.product_variant_id}><td className="px-4 py-3 font-semibold text-slate-950">{variant.variant_name}</td><td className="px-4 py-3 text-slate-500">{variant.sku_code ?? "—"}</td><td className="px-4 py-3 text-slate-500">{variant.pack_label ?? "—"}</td><td className="px-4 py-3 text-slate-500">{variant.moq_display ?? "—"}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${variant.is_quoteable ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{variant.is_quoteable ? "Quote-ready" : "Needs pricing"}</span></td></tr>)}</tbody></table>
              </div>
            </div>
          ) : null}

          {detail && activeTab === "trade" ? (
            <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Downstream commercial handoff</div>
              <p className="text-sm leading-6 text-slate-600">Use quick quote only when the product is active, quote-ready, and priced. Otherwise finish pricing coverage first.</p>
              <div className="flex flex-wrap gap-2 text-sm font-semibold">
                {detail.product.is_active && detail.variants.some((variant) => variant.is_quoteable) ? <Link href={`/leads?quickLead=1&sourceType=trade_show&sourceLabel=Trade%20show%20fast%20lane&autoQuote=1&productId=${encodeURIComponent(detail.product.id)}`} className="rounded-xl bg-slate-950 px-3 py-2 text-white">Quick quote</Link> : null}
                <Link href="/pipeline" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">Pipeline</Link>
                <Link href={PRODUCT_ROUTES.app.leads} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">Leads</Link>
                <Link href={PRODUCT_ROUTES.app.quotes} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700">Quotes</Link>
              </div>
            </div>
          ) : null}

          {detail && activeTab === "history" ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600"><div className="font-semibold text-slate-950">Catalog audit snapshot</div><p>Active: {detail.product.is_active ? "Yes" : "No"}</p><p>Pricing rule set: {detail.pricing_meta.pricing_rule_set_name ?? "None configured"}</p><p>Use the save bar below after changing overview or pricing fields.</p></div>
          ) : null}
        </div>

        {detail ? (
          <footer className="border-t border-slate-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between gap-3"><button type="button" disabled={deleting} onClick={() => void removeProduct()} className="rounded-2xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50">{deleting ? "Deleting..." : "Delete"}</button><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">Cancel</button><button type="button" disabled={!hasChanges || saving} onClick={() => void save()} className="rounded-2xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? "Saving..." : hasChanges ? "Save changes" : "Saved"}</button></div></div>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
