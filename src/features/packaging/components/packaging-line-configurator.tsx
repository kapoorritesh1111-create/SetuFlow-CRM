'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import type {
  ArtworkStatus,
  PackagingCalculationInput,
  PackagingCalculationResult,
  PackagingPricingTemplate,
  PackagingServiceFamily,
} from '@/lib/packaging/types';
import { ARTWORK_STATUS_OPTIONS } from '@/lib/packaging/types';
import {
  calculatePackagingQuoteLine,
  savePackagingQuoteLine,
  type PackagingCalculationResponse,
} from '@/features/packaging/server/actions';

/**
 * S24-SPEN-203 — Custom Packaging Line configurator.
 * Live price preview runs through the same server-side engine that saves the
 * line, so the number shown is the number stored. Saved lines keep an input
 * snapshot and full breakdown; edits recalculate with current template rules.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (followUpDraft?: string) => void;
  families: PackagingServiceFamily[];
  templates: PackagingPricingTemplate[];
  quoteId: string;
  leadId: string;
  initialFamilyId?: string | null;
  initialTemplateId?: string | null;
  initialInput?: PackagingCalculationInput | null;
  lineId?: string | null;
};

function money(value: number, currency: string) {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const EMPTY_INPUT: PackagingCalculationInput = {
  width_mm: null,
  height_mm: null,
  gusset_mm: null,
  material_key: null,
  print_colors: 1,
  finish_keys: [],
  addon_keys: [],
  service_item_keys: [],
  quantity: null,
  designs: 1,
  artwork_status: null,
  rush_key: null,
  include_optional_setups: [],
};

export default function PackagingLineConfigurator({
  open,
  onClose,
  onSaved,
  families,
  templates,
  quoteId,
  leadId,
  initialFamilyId,
  initialTemplateId,
  initialInput,
  lineId,
}: Props) {
  const [familyId, setFamilyId] = useState<string>(initialFamilyId ?? families[0]?.id ?? '');
  const [templateId, setTemplateId] = useState<string>(initialTemplateId ?? '');
  const [input, setInput] = useState<PackagingCalculationInput>(initialInput ?? EMPTY_INPUT);
  const [calc, setCalc] = useState<PackagingCalculationResponse | null>(null);
  const [calcPending, setCalcPending] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const family = useMemo(() => families.find((item) => item.id === familyId) ?? null, [families, familyId]);
  const familyTemplates = useMemo(
    () => templates.filter((template) => template.family_id === familyId && template.is_active),
    [templates, familyId],
  );
  const template = useMemo(
    () => familyTemplates.find((item) => item.id === templateId) ?? familyTemplates[0] ?? null,
    [familyTemplates, templateId],
  );

  useEffect(() => {
    if (template && template.id !== templateId) setTemplateId(template.id);
  }, [template, templateId]);

  useEffect(() => {
    if (!open) return;
    setFamilyId(initialFamilyId ?? families[0]?.id ?? '');
    setTemplateId(initialTemplateId ?? '');
    setInput(initialInput ?? EMPTY_INPUT);
    setCalc(null);
    setSaveError(null);
    setFollowUp(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const ranges = template?.allowed_dimension_ranges_json;
  const isDimensional = Boolean(ranges && ranges.area_formula !== 'service');
  const result: PackagingCalculationResult | null = calc?.result ?? null;

  const runCalculation = useCallback(
    (nextInput: PackagingCalculationInput, nextTemplateId: string) => {
      if (!nextTemplateId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setCalcPending(true);
        const response = await calculatePackagingQuoteLine({ templateId: nextTemplateId, input: nextInput, quoteId });
        setCalc(response);
        setCalcPending(false);
      }, 350);
    },
    [quoteId],
  );

  const update = useCallback(
    (patch: Partial<PackagingCalculationInput>) => {
      setInput((previous) => {
        const next = { ...previous, ...patch };
        if (template?.id) runCalculation(next, template.id);
        return next;
      });
    },
    [runCalculation, template?.id],
  );

  useEffect(() => {
    if (open && template?.id) runCalculation(input, template.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template?.id]);

  const toggleKey = (list: string[] | undefined, key: string) => {
    const current = new Set(list ?? []);
    if (current.has(key)) current.delete(key);
    else current.add(key);
    return Array.from(current);
  };

  const handleSave = () => {
    if (!family || !template) return;
    setSaveError(null);
    startSaving(async () => {
      const response = await savePackagingQuoteLine({
        quoteId,
        leadId,
        familyId: family.id,
        templateId: template.id,
        input,
        lineId: lineId ?? null,
      });
      if (!response.ok) {
        setSaveError(response.error ?? 'Could not save the packaging line.');
        return;
      }
      setFollowUp(response.followUpDraft ?? null);
      onSaved(response.followUpDraft);
    });
  };

  if (!open) return null;

  const readiness = calc?.readiness;
  const readinessTone = readiness?.tone === 'ready'
    ? 'border-success-border bg-success-bg text-success-fg'
    : readiness?.tone === 'warning'
      ? 'border-warning-border bg-warning-bg text-warning-fg'
      : 'border-info-border bg-info-bg text-info-fg';

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="dialog" aria-modal="true">
      <div className="flex h-full w-full max-w-2xl flex-col overflow-y-auto bg-surface-app shadow-panel">
        <div className="flex items-start justify-between gap-3 border-b border-line bg-surface-1 p-4">
          <div>
            <h2 className="text-lg font-bold text-content-primary">{lineId ? 'Edit packaging line' : 'Add packaging line'}</h2>
            <p className="text-sm text-content-secondary">Live price uses your pricing template rules. Nothing is sent automatically.</p>
          </div>
          <button onClick={onClose} className="rounded-ctl border border-line bg-surface-1 px-3 py-1.5 text-sm font-semibold text-content-primary">Close</button>
        </div>

        {followUp !== null ? (
          <div className="space-y-4 p-4">
            <div className="rounded-card border border-success-border bg-success-bg p-4">
              <p className="font-semibold text-success-fg">Packaging line saved to the quote.</p>
            </div>
            <div className="rounded-card border border-line bg-surface-1 p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-ctl bg-accent-600 px-2 py-1 text-xs font-bold text-white">G</span>
                <p className="font-semibold text-content-primary">Suggested follow-up (review before sending)</p>
              </div>
              <pre className="mt-3 whitespace-pre-wrap rounded-ctl bg-surface-2 p-3 text-sm text-content-primary">{followUp}</pre>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => { void navigator.clipboard?.writeText(followUp); }}
                  className="rounded-ctl border border-line bg-surface-1 px-3 py-2 text-sm font-semibold text-content-primary"
                >
                  Copy draft
                </button>
                <button onClick={onClose} className="rounded-ctl bg-brand-600 px-3 py-2 text-sm font-semibold text-white">Done</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-4 p-4">
            <section className="rounded-card border border-line bg-surface-1 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Family & template</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold text-content-primary">
                  Service family
                  <select
                    value={familyId}
                    onChange={(event) => { setFamilyId(event.target.value); setTemplateId(''); setCalc(null); }}
                    className="mt-1 w-full rounded-ctl border border-line bg-surface-app px-3 py-2 text-sm font-medium text-content-primary"
                  >
                    {families.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-semibold text-content-primary">
                  Pricing template
                  <select
                    value={template?.id ?? ''}
                    onChange={(event) => { setTemplateId(event.target.value); runCalculation(input, event.target.value); }}
                    className="mt-1 w-full rounded-ctl border border-line bg-surface-app px-3 py-2 text-sm font-medium text-content-primary"
                  >
                    {familyTemplates.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
              </div>
              {!familyTemplates.length ? (
                <p className="mt-3 rounded-ctl bg-warning-bg px-3 py-2 text-sm font-medium text-warning-fg">No active pricing template for this family. Configure one in Admin → Packaging Pricing Templates.</p>
              ) : null}
            </section>

            {template && isDimensional ? (
              <section className="rounded-card border border-line bg-surface-1 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Dimensions (mm)</p>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  <label className="text-sm font-semibold text-content-primary">
                    Width
                    <input type="number" inputMode="decimal" value={input.width_mm ?? ''} onChange={(event) => update({ width_mm: event.target.value === '' ? null : Number(event.target.value) })} className="mt-1 w-full rounded-ctl border border-line bg-surface-app px-3 py-2 text-sm" />
                    {ranges?.width_mm ? <span className="text-xs font-normal text-content-muted">{ranges.width_mm.min}–{ranges.width_mm.max}</span> : null}
                  </label>
                  <label className="text-sm font-semibold text-content-primary">
                    Height
                    <input type="number" inputMode="decimal" value={input.height_mm ?? ''} onChange={(event) => update({ height_mm: event.target.value === '' ? null : Number(event.target.value) })} className="mt-1 w-full rounded-ctl border border-line bg-surface-app px-3 py-2 text-sm" />
                    {ranges?.height_mm ? <span className="text-xs font-normal text-content-muted">{ranges.height_mm.min}–{ranges.height_mm.max}</span> : null}
                  </label>
                  {ranges?.gusset_mm ? (
                    <label className="text-sm font-semibold text-content-primary">
                      Gusset
                      <input type="number" inputMode="decimal" value={input.gusset_mm ?? ''} onChange={(event) => update({ gusset_mm: event.target.value === '' ? null : Number(event.target.value) })} className="mt-1 w-full rounded-ctl border border-line bg-surface-app px-3 py-2 text-sm" />
                      <span className="text-xs font-normal text-content-muted">{ranges.gusset_mm.min}–{ranges.gusset_mm.max}</span>
                    </label>
                  ) : null}
                </div>
              </section>
            ) : null}

            {template && isDimensional ? (
              <section className="rounded-card border border-line bg-surface-1 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Material & print</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-semibold text-content-primary">
                    Material
                    <select value={input.material_key ?? ''} onChange={(event) => update({ material_key: event.target.value || null })} className="mt-1 w-full rounded-ctl border border-line bg-surface-app px-3 py-2 text-sm font-medium">
                      <option value="">Select material</option>
                      {(template.material_rates_json ?? []).map((material) => (
                        <option key={material.key} value={material.key}>{material.label}{material.thickness ? ` — ${material.thickness}` : ''}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm font-semibold text-content-primary">
                    Print colors
                    <input type="number" min={1} max={12} value={input.print_colors ?? 1} onChange={(event) => update({ print_colors: Number(event.target.value) || 1 })} className="mt-1 w-full rounded-ctl border border-line bg-surface-app px-3 py-2 text-sm" />
                  </label>
                </div>
                {(template.finish_addon_rates_json ?? []).length ? (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-content-primary">Finish & add-ons</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(template.finish_addon_rates_json ?? []).map((finish) => {
                        const active = (input.finish_keys ?? []).includes(finish.key);
                        return (
                          <button
                            key={finish.key}
                            onClick={() => update({ finish_keys: toggleKey(input.finish_keys, finish.key) })}
                            className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${active ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line bg-surface-app text-content-secondary'}`}
                          >
                            {finish.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            {template && !isDimensional ? (
              <section className="rounded-card border border-line bg-surface-1 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Service scope</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(template.material_rates_json ?? []).map((item) => {
                    const active = (input.service_item_keys ?? []).includes(item.key);
                    return (
                      <button
                        key={item.key}
                        onClick={() => update({ service_item_keys: toggleKey(input.service_item_keys, item.key) })}
                        className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${active ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line bg-surface-app text-content-secondary'}`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {template ? (
              <section className="rounded-card border border-line bg-surface-1 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Quantity, artwork & timing</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  <label className="text-sm font-semibold text-content-primary">
                    Quantity
                    <input type="number" inputMode="numeric" value={input.quantity ?? ''} onChange={(event) => update({ quantity: event.target.value === '' ? null : Number(event.target.value) })} className="mt-1 w-full rounded-ctl border border-line bg-surface-app px-3 py-2 text-sm" />
                    {template.moq_tiers_json?.moq ? <span className="text-xs font-normal text-content-muted">MOQ {template.moq_tiers_json.moq.toLocaleString()}</span> : null}
                  </label>
                  <label className="text-sm font-semibold text-content-primary">
                    Designs
                    <input type="number" min={1} value={input.designs ?? 1} onChange={(event) => update({ designs: Number(event.target.value) || 1 })} className="mt-1 w-full rounded-ctl border border-line bg-surface-app px-3 py-2 text-sm" />
                  </label>
                  <label className="text-sm font-semibold text-content-primary">
                    Artwork status
                    <select value={input.artwork_status ?? ''} onChange={(event) => update({ artwork_status: (event.target.value || null) as ArtworkStatus | null })} className="mt-1 w-full rounded-ctl border border-line bg-surface-app px-3 py-2 text-sm font-medium">
                      <option value="">Select status</option>
                      {ARTWORK_STATUS_OPTIONS.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                    </select>
                  </label>
                </div>
                {(template.rush_options_json ?? []).length ? (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-content-primary">Timeline</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <button onClick={() => update({ rush_key: null })} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${!input.rush_key ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line bg-surface-app text-content-secondary'}`}>Standard</button>
                      {(template.rush_options_json ?? []).map((option) => (
                        <button key={option.key} onClick={() => update({ rush_key: option.key })} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${input.rush_key === option.key ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line bg-surface-app text-content-secondary'}`}>
                          {option.label} (+{option.uplift_pct}%)
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {(template.setup_charges_json ?? []).some((setup) => !setup.required) ? (
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-content-primary">Optional setup items</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {(template.setup_charges_json ?? []).filter((setup) => !setup.required).map((setup) => {
                        const active = (input.include_optional_setups ?? []).includes(setup.key);
                        return (
                          <button key={setup.key} onClick={() => update({ include_optional_setups: toggleKey(input.include_optional_setups, setup.key) })} className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${active ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line bg-surface-app text-content-secondary'}`}>
                            {setup.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </section>
            ) : null}

            <section className="rounded-card border border-line bg-surface-1 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Price summary</p>
                {calcPending ? <span className="text-xs font-medium text-content-muted">Calculating…</span> : null}
              </div>
              {calc && !calc.ok ? <p className="mt-2 rounded-ctl bg-danger-bg px-3 py-2 text-sm font-medium text-danger-fg">{calc.error}</p> : null}
              {result && !result.ok ? (
                <ul className="mt-2 space-y-1">
                  {result.validation_errors.map((error) => <li key={error} className="rounded-ctl bg-warning-bg px-3 py-2 text-sm font-medium text-warning-fg">{error}</li>)}
                </ul>
              ) : null}
              {result?.ok ? (
                <div className="mt-2">
                  <ul className="divide-y divide-line text-sm">
                    {result.breakdown.map((line) => (
                      <li key={line.key} className="flex items-center justify-between py-1.5">
                        <span className="text-content-secondary">{line.label}</span>
                        <span className={`font-semibold ${line.amount < 0 ? 'text-success-fg' : 'text-content-primary'}`}>{line.amount < 0 ? '−' : ''}{money(Math.abs(line.amount), result.currency)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex items-center justify-between rounded-ctl bg-surface-2 px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold text-content-primary">Estimated unit price: {money(result.unit_price, result.currency)}</p>
                      {result.lead_time ? <p className="text-xs text-content-muted">Lead time: {result.lead_time}</p> : null}
                    </div>
                    <p className="text-lg font-bold text-content-primary">{money(result.total_price, result.currency)}</p>
                  </div>
                  {calc?.priceExplanation ? <p className="mt-2 text-sm text-content-secondary">{calc.priceExplanation}</p> : null}
                </div>
              ) : null}
            </section>

            {readiness ? (
              <section className={`rounded-card border p-4 ${readinessTone}`}>
                <div className="flex items-center gap-2">
                  <span className="rounded-ctl bg-accent-600 px-2 py-1 text-xs font-bold text-white">G</span>
                  <p className="font-semibold">{readiness.headline}</p>
                </div>
                {readiness.items.length ? (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {readiness.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : null}
                {calc?.chargeSuggestions?.length ? (
                  <p className="mt-2 text-sm">Optional charges to consider: {calc.chargeSuggestions.join(', ')}. Add them from the quote — nothing is added automatically.</p>
                ) : null}
              </section>
            ) : null}

            {saveError ? <p className="rounded-ctl bg-danger-bg px-3 py-2 text-sm font-medium text-danger-fg">{saveError}</p> : null}

            <div className="flex items-center justify-end gap-2 pb-6">
              <button onClick={onClose} className="rounded-ctl border border-line bg-surface-1 px-4 py-2.5 text-sm font-semibold text-content-primary">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !result?.ok}
                className="rounded-ctl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : lineId ? 'Save changes' : 'Save line to quote'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
