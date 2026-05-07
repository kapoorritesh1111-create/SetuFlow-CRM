"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";

import {
  calculatePricingHierarchy,
  PRICING_LEVEL_LABELS,
  type MarginMode,
  type PricingLevel,
} from "@/lib/pricing-hierarchy";
import type { ProductPricingSnapshot, PricingBasis } from "@/types/products";
import { savePricingCalculatorSnapshot } from "@/features/products/server/actions";

export type PricingCalculatorInitialValues = {
  productId?: string | null;
  productVariantId?: string | null;
  startLevel?: PricingLevel;
  startPrice?: number | null;
  currency?: string | null;
  inlandTransportCost?: number | null;
  exportCustomsCost?: number | null;
  portHandlingCost?: number | null;
  freightCost?: number | null;
  insuranceCost?: number | null;
  importDutyPercent?: number | null;
  destinationCharges?: number | null;
  localDeliveryCost?: number | null;
  internalMarginPercent?: number | null;
  distributorMarginPercent?: number | null;
  retailMarginPercent?: number | null;
  marginMode?: MarginMode | null;
  defaultUnitOfMeasure?: string | null;
  packSize?: string | number | null;
  packSizeUnit?: string | null;
  pricingMode?: PricingBasis;
};

export type PricingCalculatorVariantOption = {
  id: string;
  name: string;
  skuCode?: string | null;
  packLabel?: string | null;
  unitsPerCase?: number | null;
  moqDisplay?: string | null;
  pricingModeDefault?: PricingBasis;
  exFactoryValue?: number | null;
  fobValue?: number | null;
};

type Props = {
  productId?: string | null;
  productVariantId?: string | null;
  productName?: string | null;
  canManageCatalog?: boolean;
  compact?: boolean;
  showSave?: boolean;
  initialValues?: PricingCalculatorInitialValues;
  variantOptions?: PricingCalculatorVariantOption[];
  onSaved?: () => Promise<void> | void;
  onApplyToLegacyPricing?: (values: {
    exw: number | null;
    fob: number | null;
    currency: string;
    snapshot: ProductPricingSnapshot;
  }) => void;
};

type DraftState = {
  startPrice: string;
  currency: string;
  defaultUnitOfMeasure: string;
  packSize: string;
  packSizeUnit: string;
  inlandTransportCost: string;
  exportCustomsCost: string;
  portHandlingCost: string;
  freightCost: string;
  insuranceCost: string;
  importDutyPercent: string;
  destinationCharges: string;
  localDeliveryCost: string;
  internalMarginPercent: string;
  distributorMarginPercent: string;
  retailMarginPercent: string;
};

type DraftKey = keyof DraftState;

type FieldConfig = {
  key: DraftKey;
  label: string;
  suffix?: string;
  placeholder?: string;
};

const EXPORT_COST_FIELDS: FieldConfig[] = [
  { key: "inlandTransportCost", label: "Inland transport" },
  { key: "exportCustomsCost", label: "Export customs" },
  { key: "portHandlingCost", label: "Port handling" },
];

const DESTINATION_COST_FIELDS: FieldConfig[] = [
  { key: "freightCost", label: "Freight" },
  { key: "insuranceCost", label: "Insurance" },
  { key: "importDutyPercent", label: "Import duty", suffix: "%" },
  { key: "destinationCharges", label: "Destination charges" },
  { key: "localDeliveryCost", label: "Local delivery" },
];

const MARGIN_FIELDS: FieldConfig[] = [
  { key: "internalMarginPercent", label: "Internal margin", suffix: "%" },
  { key: "distributorMarginPercent", label: "Distributor margin", suffix: "%" },
  { key: "retailMarginPercent", label: "Retail margin", suffix: "%" },
];

function toInput(value: number | string | null | undefined, fallback: number | string | null | undefined = ""): string {
  if (value === null || value === undefined || value === "") return String(fallback ?? "");
  return String(value);
}

function numberValue(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildVariantLabel(variant: PricingCalculatorVariantOption) {
  const parts = [variant.name, variant.skuCode, variant.packLabel].filter(Boolean);
  return parts.join(" · ") || "Variant";
}

function formatMoney(currency: string, value: number | null | undefined) {
  return value == null ? "—" : `${currency} ${value.toFixed(2)}`;
}

function basisLabel(value: PricingBasis | null | undefined) {
  if (value === "kg") return "Per kg / bulk";
  if (value === "case") return "Per case";
  return "Per unit";
}

function SectionToggle({
  title,
  subtitle,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left">
        <span>
          <span className="block text-sm font-semibold text-slate-950">{title}</span>
          <span className="mt-0.5 block text-xs leading-5 text-slate-500">{subtitle}</span>
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? <div className="border-t border-slate-100 p-4">{children}</div> : null}
    </div>
  );
}

function NumberField({
  field,
  value,
  disabled,
  onChange,
}: {
  field: FieldConfig;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
      {field.label}
      <div className="mt-1 flex rounded-xl border border-slate-200 bg-white focus-within:border-blue-400">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          inputMode="decimal"
          disabled={disabled}
          placeholder={field.placeholder}
          className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-2 text-sm font-semibold text-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-400"
        />
        {field.suffix ? <span className="grid place-items-center px-3 text-xs font-bold text-slate-400">{field.suffix}</span> : null}
      </div>
    </label>
  );
}

export function ProductPricingCalculatorPanel({
  productId,
  productVariantId,
  productName,
  canManageCatalog = true,
  compact = false,
  showSave = true,
  initialValues,
  variantOptions = [],
  onSaved,
  onApplyToLegacyPricing,
}: Props) {
  const [showHelp, setShowHelp] = useState(false);
  const [isOverrideEditing, setIsOverrideEditing] = useState(!productId);
  const [exportOpen, setExportOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [marginsOpen, setMarginsOpen] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(productVariantId ?? initialValues?.productVariantId ?? variantOptions[0]?.id ?? null);
  const [startLevel, setStartLevel] = useState<PricingLevel>(initialValues?.startLevel ?? "exw");
  const [marginMode, setMarginMode] = useState<MarginMode>(initialValues?.marginMode ?? "markup");
  const [pricingMode, setPricingMode] = useState<PricingBasis>(initialValues?.pricingMode ?? variantOptions[0]?.pricingModeDefault ?? "unit");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<DraftState>({
    startPrice: toInput(initialValues?.startPrice, "20"),
    currency: toInput(initialValues?.currency, "USD").toUpperCase(),
    defaultUnitOfMeasure: toInput(initialValues?.defaultUnitOfMeasure, variantOptions[0]?.pricingModeDefault ?? "unit"),
    packSize: toInput(initialValues?.packSize, variantOptions[0]?.unitsPerCase ?? "1"),
    packSizeUnit: toInput(initialValues?.packSizeUnit, variantOptions[0]?.packLabel ?? "case"),
    inlandTransportCost: toInput(initialValues?.inlandTransportCost, "1"),
    exportCustomsCost: toInput(initialValues?.exportCustomsCost, "0.5"),
    portHandlingCost: toInput(initialValues?.portHandlingCost, "0.5"),
    freightCost: toInput(initialValues?.freightCost, "4"),
    insuranceCost: toInput(initialValues?.insuranceCost, "1"),
    importDutyPercent: toInput(initialValues?.importDutyPercent, "8"),
    destinationCharges: toInput(initialValues?.destinationCharges, "1.5"),
    localDeliveryCost: toInput(initialValues?.localDeliveryCost, "1"),
    internalMarginPercent: toInput(initialValues?.internalMarginPercent, "0"),
    distributorMarginPercent: toInput(initialValues?.distributorMarginPercent, "18"),
    retailMarginPercent: toInput(initialValues?.retailMarginPercent, "25"),
  });

  const selectedVariant = useMemo(() => variantOptions.find((variant) => variant.id === selectedVariantId) ?? variantOptions[0] ?? null, [selectedVariantId, variantOptions]);

  useEffect(() => {
    if (!productVariantId && !selectedVariantId && variantOptions[0]?.id) setSelectedVariantId(variantOptions[0].id);
  }, [productVariantId, selectedVariantId, variantOptions]);

  const result = useMemo(() => calculatePricingHierarchy({
    startLevel,
    startPrice: numberValue(draft.startPrice),
    currency: draft.currency || "USD",
    inlandTransportCost: numberValue(draft.inlandTransportCost),
    exportCustomsCost: numberValue(draft.exportCustomsCost),
    portHandlingCost: numberValue(draft.portHandlingCost),
    freightCost: numberValue(draft.freightCost),
    insuranceCost: numberValue(draft.insuranceCost),
    importDutyPercent: numberValue(draft.importDutyPercent),
    destinationCharges: numberValue(draft.destinationCharges),
    localDeliveryCost: numberValue(draft.localDeliveryCost),
    internalMarginPercent: numberValue(draft.internalMarginPercent),
    distributorMarginPercent: numberValue(draft.distributorMarginPercent),
    retailMarginPercent: numberValue(draft.retailMarginPercent),
    marginMode,
  }), [draft, marginMode, startLevel]);

  const updateDraft = (key: keyof DraftState, value: string) => setDraft((current) => ({ ...current, [key]: key === "currency" ? value.toUpperCase() : value }));

  const snapshot: ProductPricingSnapshot = {
    base_cost: result.prices.exw ?? null,
    exw_price: result.prices.exw ?? null,
    fob_price: result.prices.fob ?? null,
    cif_price: result.prices.cif ?? null,
    ddp_price: result.prices.ddp ?? null,
    distributor_price: result.prices.distributor ?? null,
    retail_price: result.prices.retail ?? null,
    pricing_currency: result.currency,
    inland_transport_cost: numberValue(draft.inlandTransportCost),
    export_customs_cost: numberValue(draft.exportCustomsCost),
    port_handling_cost: numberValue(draft.portHandlingCost),
    freight_cost: numberValue(draft.freightCost),
    insurance_cost: numberValue(draft.insuranceCost),
    import_duty_percent: numberValue(draft.importDutyPercent),
    destination_charges: numberValue(draft.destinationCharges),
    local_delivery_cost: numberValue(draft.localDeliveryCost),
    internal_margin_percent: numberValue(draft.internalMarginPercent),
    internal_price: result.internalPrice ?? null,
    distributor_margin_percent: numberValue(draft.distributorMarginPercent),
    retail_margin_percent: numberValue(draft.retailMarginPercent),
    pricing_start_level: startLevel,
    pricing_margin_mode: marginMode,
    pricing_last_calculated_at: new Date().toISOString(),
    product_variant_id: selectedVariant?.id ?? selectedVariantId ?? null,
    pricing_mode_default: pricingMode ?? null,
    default_unit_of_measure: draft.defaultUnitOfMeasure || null,
    pack_size: draft.packSize || null,
    pack_size_unit: draft.packSizeUnit || null,
  };

  const handleSave = () => {
    if (!productId || !result.ok) return;
    const formData = new FormData();
    formData.set("product_id", productId);
    formData.set("product_variant_id", selectedVariant?.id ?? selectedVariantId ?? "");
    formData.set("default_unit_of_measure", draft.defaultUnitOfMeasure);
    formData.set("pack_size", draft.packSize);
    formData.set("pack_size_unit", draft.packSizeUnit);
    formData.set("pricing_mode_default", pricingMode ?? "");
    formData.set("pricing_snapshot", JSON.stringify(result));
    startTransition(async () => {
      const saved = await savePricingCalculatorSnapshot(undefined, formData);
      setMessage(saved.error ?? saved.success ?? "Pricing calculator results saved.");
      if (!saved.error) await onSaved?.();
    });
  };

  const fieldsDisabled = !canManageCatalog || !isOverrideEditing;
  const fieldClass = "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400";
  const wrapperClass = compact ? "space-y-4" : "rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft";
  const sourceLabel = isOverrideEditing ? "Product override" : "Category default";
  const healthTone = result.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <section className={wrapperClass}>
      <div className="rounded-[1.4rem] border border-slate-200 bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">Pricing workspace</p>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${healthTone}`}>{result.ok ? "Ready" : "Needs input"}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">{sourceLabel}</span>
            </div>
            <h3 className="mt-2 text-xl font-semibold text-slate-950">{productName ? `Price ${productName}` : "Calculate EXW to Retail"}</h3>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Edit only the assumptions that matter now. Keep quote-specific changes in the quote workspace so product defaults stay clean.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowHelp(true)} className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-800">Help</button>
            {productId && canManageCatalog ? (
              <button type="button" onClick={() => setIsOverrideEditing((current) => !current)} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                {isOverrideEditing ? "Revert to category defaults" : "Customize product pricing"}
              </button>
            ) : null}
            {onApplyToLegacyPricing ? (
              <button type="button" onClick={() => onApplyToLegacyPricing({ exw: result.prices.exw ?? null, fob: result.prices.fob ?? null, currency: result.currency, snapshot })} disabled={!result.ok} className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-40">Use in product price fields</button>
            ) : null}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Variant</div><div className="mt-1 truncate text-sm font-bold text-slate-950">{selectedVariant ? buildVariantLabel(selectedVariant) : "Product default"}</div></div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Basis</div><div className="mt-1 text-sm font-bold text-slate-950">{basisLabel(pricingMode)}</div></div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Pack</div><div className="mt-1 text-sm font-bold text-slate-950">{draft.packSize || "—"} {draft.packSizeUnit || ""}</div></div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"><div className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Internal</div><div className="mt-1 text-sm font-bold text-slate-950">{formatMoney(result.currency, result.internalPrice)}</div></div>
        </div>
      </div>

      {showHelp ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-slate-950/35 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0" aria-label="Close pricing help" onClick={() => setShowHelp(false)} />
          <section className="relative max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-[2rem] border border-blue-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700">How pricing is calculated</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">EXW to Retail pricing help</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">Use this calculator to build the export pricing chain: EXW → FOB → CIF → DDP → Distributor → Retail.</p>
              </div>
              <button type="button" onClick={() => setShowHelp(false)} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200 text-slate-500">×</button>
            </div>
            <div className="max-h-[64vh] overflow-y-auto p-5 text-sm leading-6 text-slate-600">
              <p>Default rules apply automatically unless you customize this product. Product-specific values override category defaults; category defaults override organization defaults.</p>
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                {[["EXW", "Factory or ex-works price."], ["FOB", "EXW plus inland transport, export customs, and port handling."], ["CIF", "FOB plus freight and insurance."], ["DDP", "CIF plus import duty, destination charges, and local delivery."], ["Distributor", "Internal selling price plus distributor margin."], ["Retail", "Distributor price plus retail margin."]].map(([label, body]) => <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><p className="font-semibold text-slate-950">{label}</p><p className="mt-1 text-xs leading-5">{body}</p></div>)}
              </div>
              <p className="mt-4"><strong>Markup mode</strong> adds percentage on top of cost. <strong>Margin mode</strong> protects the percentage as gross margin.</p>
            </div>
          </section>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">Essential inputs</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Start with price, basis, pack, and margin mode. Open advanced sections only when needed.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700">Quote changes stay quote-only</span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {variantOptions.length > 1 ? (
                <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500 md:col-span-2">Product row / variant
                  <select value={selectedVariant?.id ?? selectedVariantId ?? ""} onChange={(event) => { const next = variantOptions.find((variant) => variant.id === event.target.value) ?? null; setSelectedVariantId(next?.id ?? null); if (next?.pricingModeDefault) setPricingMode(next.pricingModeDefault); setDraft((current) => ({ ...current, startPrice: toInput(next?.exFactoryValue ?? next?.fobValue, current.startPrice), defaultUnitOfMeasure: next?.pricingModeDefault || current.defaultUnitOfMeasure || "unit", packSize: toInput(next?.unitsPerCase, current.packSize || "1"), packSizeUnit: next?.packLabel || current.packSizeUnit || "case" })); }} disabled={fieldsDisabled} className={fieldClass}>{variantOptions.map((variant) => <option key={variant.id} value={variant.id}>{buildVariantLabel(variant)}</option>)}</select>
                </label>
              ) : null}
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Starting level
                <select value={startLevel} onChange={(event) => setStartLevel(event.target.value as PricingLevel)} disabled={fieldsDisabled} className={fieldClass}>{Object.entries(PRICING_LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              </label>
              <NumberField field={{ key: "startPrice", label: "Starting price" }} value={draft.startPrice} disabled={fieldsDisabled} onChange={(value) => updateDraft("startPrice", value)} />
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Currency<input value={draft.currency} onChange={(event) => updateDraft("currency", event.target.value)} maxLength={3} disabled={fieldsDisabled} className={fieldClass} /></label>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Pricing basis
                <select value={pricingMode ?? ""} onChange={(event) => setPricingMode((event.target.value || null) as PricingBasis)} disabled={fieldsDisabled} className={fieldClass}><option value="unit">Per unit</option><option value="case">Per case</option><option value="kg">Per kg / bulk</option></select>
              </label>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Product UOM
                <select value={draft.defaultUnitOfMeasure} onChange={(event) => updateDraft("defaultUnitOfMeasure", event.target.value)} disabled={fieldsDisabled} className={fieldClass}><option value="unit">Unit</option><option value="case">Case</option><option value="kg">Kg / bulk</option></select>
              </label>
              <NumberField field={{ key: "packSize", label: "Pack size", placeholder: "e.g. 100" }} value={draft.packSize} disabled={fieldsDisabled} onChange={(value) => updateDraft("packSize", value)} />
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Pack unit<input value={draft.packSizeUnit} onChange={(event) => updateDraft("packSizeUnit", event.target.value)} disabled={fieldsDisabled} className={fieldClass} placeholder="g, kg, case" /></label>
              <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Margin mode
                <select value={marginMode} onChange={(event) => setMarginMode(event.target.value as MarginMode)} disabled={fieldsDisabled} className={fieldClass}><option value="markup">Markup: base x (1 + %)</option><option value="margin">Margin: base / (1 - %)</option></select>
              </label>
            </div>
          </div>

          <SectionToggle title="Origin and export costs" subtitle="Inland transport, export customs, and port handling build FOB from EXW." open={exportOpen} onToggle={() => setExportOpen((current) => !current)}>
            <div className="grid gap-3 md:grid-cols-3">{EXPORT_COST_FIELDS.map((field) => <NumberField key={field.key} field={field} value={draft[field.key]} disabled={fieldsDisabled} onChange={(value) => updateDraft(field.key, value)} />)}</div>
          </SectionToggle>

          <SectionToggle title="Freight and destination costs" subtitle="Freight, insurance, import duty, destination charges, and local delivery build DDP." open={destinationOpen} onToggle={() => setDestinationOpen((current) => !current)}>
            <div className="grid gap-3 md:grid-cols-2">{DESTINATION_COST_FIELDS.map((field) => <NumberField key={field.key} field={field} value={draft[field.key]} disabled={fieldsDisabled} onChange={(value) => updateDraft(field.key, value)} />)}</div>
          </SectionToggle>

          <SectionToggle title="Margins" subtitle="Internal, distributor, and retail layers after landed/base price." open={marginsOpen} onToggle={() => setMarginsOpen((current) => !current)}>
            <div className="grid gap-3 md:grid-cols-3">{MARGIN_FIELDS.map((field) => <NumberField key={field.key} field={field} value={draft[field.key]} disabled={fieldsDisabled} onChange={(value) => updateDraft(field.key, value)} />)}</div>
          </SectionToggle>
        </div>

        <aside className="space-y-3 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-[1.25rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-300">Live result</p>
            <div className="mt-3 grid gap-2">
              {Object.entries(result.prices).map(([level, value]) => (
                <div key={level} className="flex items-center justify-between rounded-xl bg-white/8 px-3 py-2">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-slate-300">{PRICING_LEVEL_LABELS[level as PricingLevel]}</span>
                  <span className="text-sm font-black">{formatMoney(result.currency, value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-xl bg-emerald-400/15 px-3 py-2">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-100">Internal</span>
                <span className="text-sm font-black">{formatMoney(result.currency, result.internalPrice)}</span>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <strong className="text-slate-900">Default rule source:</strong> {sourceLabel}. Product overrides affect future defaults; quote adjustments should stay inside the quote.
          </div>
          {result.errors.length ? <ul className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700">{result.errors.map((error) => <li key={error}>• {error}</li>)}</ul> : null}
          {result.warnings.length ? <ul className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-700">{result.warnings.map((warning) => <li key={warning}>• {warning}</li>)}</ul> : null}
          {message ? <p className={`rounded-2xl border px-4 py-2 text-sm font-semibold ${message.toLowerCase().includes("error") || message.toLowerCase().includes("available") ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{message}</p> : null}
          {showSave ? (
            <button type="button" onClick={handleSave} disabled={!productId || !result.ok || isPending || fieldsDisabled} className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
              {isPending ? "Saving..." : "Save product pricing default"}
            </button>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
