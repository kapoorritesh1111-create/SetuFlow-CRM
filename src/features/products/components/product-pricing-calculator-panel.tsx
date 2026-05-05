"use client";

import { useMemo, useState, useTransition } from "react";

import {
  calculatePricingHierarchy,
  PRICING_LEVEL_LABELS,
  type MarginMode,
  type PricingLevel,
} from "@/lib/pricing-hierarchy";
import type { ProductPricingSnapshot } from "@/types/products";
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
  distributorMarginPercent?: number | null;
  retailMarginPercent?: number | null;
  marginMode?: MarginMode | null;
};

type Props = {
  productId?: string | null;
  productVariantId?: string | null;
  productName?: string | null;
  canManageCatalog?: boolean;
  compact?: boolean;
  showSave?: boolean;
  initialValues?: PricingCalculatorInitialValues;
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
  inlandTransportCost: string;
  exportCustomsCost: string;
  portHandlingCost: string;
  freightCost: string;
  insuranceCost: string;
  importDutyPercent: string;
  destinationCharges: string;
  localDeliveryCost: string;
  distributorMarginPercent: string;
  retailMarginPercent: string;
};

function toInput(value: number | string | null | undefined, fallback = "") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function numberValue(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function ProductPricingCalculatorPanel({
  productId,
  productVariantId,
  productName,
  canManageCatalog = true,
  compact = false,
  showSave = true,
  initialValues,
  onSaved,
  onApplyToLegacyPricing,
}: Props) {
  const [showHelp, setShowHelp] = useState(false);
  const [startLevel, setStartLevel] = useState<PricingLevel>(
    initialValues?.startLevel ?? "exw",
  );
  const [marginMode, setMarginMode] = useState<MarginMode>(
    initialValues?.marginMode ?? "markup",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [draft, setDraft] = useState<DraftState>({
    startPrice: toInput(initialValues?.startPrice, "20"),
    currency: toInput(initialValues?.currency, "USD").toUpperCase(),
    inlandTransportCost: toInput(initialValues?.inlandTransportCost, "1"),
    exportCustomsCost: toInput(initialValues?.exportCustomsCost, "0.5"),
    portHandlingCost: toInput(initialValues?.portHandlingCost, "0.5"),
    freightCost: toInput(initialValues?.freightCost, "4"),
    insuranceCost: toInput(initialValues?.insuranceCost, "1"),
    importDutyPercent: toInput(initialValues?.importDutyPercent, "8"),
    destinationCharges: toInput(initialValues?.destinationCharges, "1.5"),
    localDeliveryCost: toInput(initialValues?.localDeliveryCost, "1"),
    distributorMarginPercent: toInput(
      initialValues?.distributorMarginPercent,
      "18",
    ),
    retailMarginPercent: toInput(initialValues?.retailMarginPercent, "25"),
  });

  const result = useMemo(
    () =>
      calculatePricingHierarchy({
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
        distributorMarginPercent: numberValue(draft.distributorMarginPercent),
        retailMarginPercent: numberValue(draft.retailMarginPercent),
        marginMode,
      }),
    [draft, marginMode, startLevel],
  );

  const updateDraft = (key: keyof DraftState, value: string) =>
    setDraft((current) => ({
      ...current,
      [key]: key === "currency" ? value.toUpperCase() : value,
    }));

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
    distributor_margin_percent: numberValue(draft.distributorMarginPercent),
    retail_margin_percent: numberValue(draft.retailMarginPercent),
    pricing_start_level: startLevel,
    pricing_margin_mode: marginMode,
    pricing_last_calculated_at: new Date().toISOString(),
  };

  const handleSave = () => {
    if (!productId || !result.ok) return;
    const formData = new FormData();
    formData.set("product_id", productId);
    formData.set("product_variant_id", productVariantId ?? "");
    formData.set("pricing_snapshot", JSON.stringify(result));
    startTransition(async () => {
      const saved = await savePricingCalculatorSnapshot(undefined, formData);
      setMessage(
        saved.error ?? saved.success ?? "Pricing calculator results saved.",
      );
      if (!saved.error) await onSaved?.();
    });
  };

  const fieldClass =
    "mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400";
  const wrapperClass = compact
    ? "rounded-2xl border border-slate-200 bg-white p-4"
    : "rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-soft";

  return (
    <section className={wrapperClass}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-600">
              Pricing calculator
            </p>
            <button
              type="button"
              onClick={() => setShowHelp((value) => !value)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-xs font-black text-blue-700"
              aria-label="Pricing calculator help"
            >
              ?
            </button>
          </div>
          <h3 className="mt-1 text-lg font-semibold text-slate-950">
            {productName ? `Price ${productName}` : "Calculate EXW to Retail"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Start from any level, preview the full hierarchy, then save the
            product snapshot.
          </p>
        </div>
        {onApplyToLegacyPricing ? (
          <button
            type="button"
            onClick={() =>
              onApplyToLegacyPricing({
                exw: result.prices.exw ?? null,
                fob: result.prices.fob ?? null,
                currency: result.currency,
                snapshot,
              })
            }
            disabled={!result.ok}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 disabled:opacity-40"
          >
            Use in product price fields
          </button>
        ) : null}
      </div>

      {showHelp ? (
        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          <p className="font-bold">How it works</p>
          <p className="mt-1">
            The calculator stacks import/export cost layers: EXW adds
            inland/export/port costs to reach FOB, FOB adds freight and
            insurance to reach CIF, CIF adds duty and destination costs to reach
            DDP, then distributor and retail margins create selling prices.
          </p>
          <p className="mt-2">
            You can start from EXW, FOB, CIF, DDP, Distributor, or Retail.
            Reverse calculation only runs when required costs and margins are
            entered; blank values are not guessed.
          </p>
          <p className="mt-2">
            Markup means base × (1 + %). Margin means base ÷ (1 - %).
          </p>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Starting level
          <select
            value={startLevel}
            onChange={(event) =>
              setStartLevel(event.target.value as PricingLevel)
            }
            disabled={!canManageCatalog}
            className={fieldClass}
          >
            {Object.entries(PRICING_LEVEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Starting price
          <input
            value={draft.startPrice}
            onChange={(event) => updateDraft("startPrice", event.target.value)}
            inputMode="decimal"
            disabled={!canManageCatalog}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Currency
          <input
            value={draft.currency}
            onChange={(event) => updateDraft("currency", event.target.value)}
            maxLength={3}
            disabled={!canManageCatalog}
            className={fieldClass}
          />
        </label>
        <label className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          Margin mode
          <select
            value={marginMode}
            onChange={(event) =>
              setMarginMode(event.target.value as MarginMode)
            }
            disabled={!canManageCatalog}
            className={fieldClass}
          >
            <option value="markup">Markup: base x (1 + %)</option>
            <option value="margin">Margin: base / (1 - %)</option>
          </select>
        </label>
        {(
          [
            "inlandTransportCost",
            "exportCustomsCost",
            "portHandlingCost",
            "freightCost",
            "insuranceCost",
            "importDutyPercent",
            "destinationCharges",
            "localDeliveryCost",
            "distributorMarginPercent",
            "retailMarginPercent",
          ] as Array<keyof DraftState>
        ).map((key) => (
          <label
            key={key}
            className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500"
          >
            {key.replace(/([A-Z])/g, " $1")}
            <input
              value={draft[key]}
              onChange={(event) => updateDraft(key, event.target.value)}
              inputMode="decimal"
              disabled={!canManageCatalog}
              className={fieldClass}
            />
          </label>
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="grid gap-2 md:grid-cols-3">
          {Object.entries(result.prices).map(([level, value]) => (
            <div
              key={level}
              className="rounded-xl bg-white px-3 py-3 shadow-sm"
            >
              <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                {PRICING_LEVEL_LABELS[level as PricingLevel]}
              </div>
              <div className="mt-1 text-lg font-black text-slate-950">
                {value == null ? "-" : `${result.currency} ${value.toFixed(2)}`}
              </div>
            </div>
          ))}
        </div>
        {result.errors.length ? (
          <ul className="mt-3 space-y-1 text-xs font-semibold text-rose-700">
            {result.errors.map((error) => (
              <li key={error}>• {error}</li>
            ))}
          </ul>
        ) : null}
        {result.warnings.length ? (
          <ul className="mt-3 space-y-1 text-xs font-semibold text-amber-700">
            {result.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {message ? (
        <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
          {message}
        </p>
      ) : null}
      {showSave ? (
        <button
          type="button"
          onClick={handleSave}
          disabled={!productId || !result.ok || isPending || !canManageCatalog}
          className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isPending ? "Saving..." : "Save calculated prices to product record"}
        </button>
      ) : null}
    </section>
  );
}
