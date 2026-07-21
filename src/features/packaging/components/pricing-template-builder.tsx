'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AreaFormula,
  FinishAddonRate,
  MaterialRate,
  PackagingCalculationInput,
  PackagingPricingTemplate,
  PackagingServiceFamily,
  RushOption,
  SetupCharge,
} from '@/lib/packaging/types';
import { calculatePackagingPrice } from '@/lib/packaging/pricing-engine';
import { checkPackagingTemplateHealth } from '@/lib/setu-guru/packaging-guidance';
import { savePackagingTemplate, duplicatePackagingTemplate } from '@/features/packaging/server/actions';

/**
 * S24-SPEN-204 — Pricing Template Builder.
 * Structured rule editors with a live preview that runs the exact pricing
 * engine used by the Quote Builder, so previewed prices always match quoted
 * prices. The Growth Agent health check reviews rule completeness — it never
 * changes rules on its own.
 */

type Props = {
  families: PackagingServiceFamily[];
  templates: PackagingPricingTemplate[];
};

type Draft = PackagingPricingTemplate;

const NEW_TEMPLATE = (families: PackagingServiceFamily[]): Draft => ({
  id: '',
  organization_id: '',
  family_id: families[0]?.id ?? null,
  slug: '',
  name: '',
  description: '',
  currency: 'INR',
  is_active: false,
  calculation_version: 1,
  allowed_dimension_ranges_json: { area_formula: 'label_single', width_mm: { min: 10, max: 500 }, height_mm: { min: 10, max: 700 } },
  material_rates_json: [],
  print_rules_json: { basis: 'color_multiplier', tiers: [{ max_colors: 1, multiplier: 1 }] },
  finish_addon_rates_json: [],
  moq_tiers_json: { moq: 0, tiers: [] },
  setup_charges_json: [],
  rush_options_json: [],
  lead_time_rules_json: { standard: '' },
  waste_factor_pct: 0,
});

function money(value: number, currency: string) {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function num(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const inputCls = 'mt-1 w-full rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm text-content-primary';
const labelCls = 'text-xs font-semibold text-content-primary';
const chipBtn = 'rounded-ctl border border-line bg-surface-app px-2.5 py-1.5 text-xs font-semibold text-content-secondary';

export default function PricingTemplateBuilder({ families, templates }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id ?? 'new');
  const [draft, setDraft] = useState<Draft>(templates[0] ?? NEW_TEMPLATE(families));
  const [previewInput, setPreviewInput] = useState<PackagingCalculationInput>({ width_mm: 180, height_mm: 260, gusset_mm: 80, material_key: null, print_colors: 2, finish_keys: [], service_item_keys: [], quantity: 1000, designs: 1, artwork_status: 'print_ready', rush_key: null });
  const [saving, startSaving] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const isDimensional = draft.allowed_dimension_ranges_json?.area_formula !== 'service';
  const health = useMemo(() => checkPackagingTemplateHealth(draft), [draft]);
  const preview = useMemo(() => {
    const input: PackagingCalculationInput = {
      ...previewInput,
      material_key: previewInput.material_key ?? draft.material_rates_json[0]?.key ?? null,
      service_item_keys: isDimensional
        ? []
        : (previewInput.service_item_keys?.length ? previewInput.service_item_keys : draft.material_rates_json.slice(0, 1).map((item) => item.key)),
    };
    return calculatePackagingPrice(draft, input);
  }, [draft, previewInput, isDimensional]);

  const selectTemplate = (id: string) => {
    setSelectedId(id);
    setFeedback(null);
    if (id === 'new') { setDraft(NEW_TEMPLATE(families)); return; }
    const found = templates.find((template) => template.id === id);
    if (found) setDraft(JSON.parse(JSON.stringify(found)));
  };

  const patch = (partial: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...partial }));

  const handleSave = () => {
    setFeedback(null);
    startSaving(async () => {
      const response = await savePackagingTemplate({ ...draft, id: draft.id || null });
      if (!response.ok) { setFeedback({ tone: 'error', text: response.error ?? 'Could not save the template.' }); return; }
      setFeedback({ tone: 'success', text: 'Template saved.' });
      if (response.templateId && !draft.id) setDraft((previous) => ({ ...previous, id: response.templateId! }));
      router.refresh();
    });
  };

  const handleDuplicate = () => {
    if (!draft.id) return;
    startSaving(async () => {
      const response = await duplicatePackagingTemplate(draft.id);
      if (!response.ok) { setFeedback({ tone: 'error', text: response.error ?? 'Could not duplicate.' }); return; }
      setFeedback({ tone: 'success', text: 'Template duplicated as an inactive copy.' });
      router.refresh();
    });
  };

  return (
    <div className="space-y-4 pb-16">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Packaging Pricing Templates</h1>
          <p className="mt-1 text-sm text-content-secondary">Rules that drive live quote pricing. Preview uses the same calculation engine as the Quote Builder.</p>
        </div>
        <div className="flex gap-2">
          {draft.id ? <button onClick={handleDuplicate} disabled={saving} className="rounded-ctl border border-line bg-surface-1 px-4 py-2 text-sm font-semibold text-content-primary disabled:opacity-50">Duplicate</button> : null}
          <button onClick={handleSave} disabled={saving} className="rounded-ctl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save template'}</button>
        </div>
      </section>

      {feedback ? (
        <p className={`rounded-ctl px-3 py-2 text-sm font-medium ${feedback.tone === 'success' ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>{feedback.text}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {templates.map((template) => (
          <button key={template.id} onClick={() => selectTemplate(template.id)} className={`rounded-ctl border px-3 py-2 text-sm font-semibold ${selectedId === template.id ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line bg-surface-1 text-content-secondary'}`}>
            {template.name}{template.is_active ? '' : ' (inactive)'}
          </button>
        ))}
        <button onClick={() => selectTemplate('new')} className={`rounded-ctl border px-3 py-2 text-sm font-semibold ${selectedId === 'new' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line bg-surface-1 text-content-secondary'}`}>+ New template</button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {/* Basics */}
          <section className="rounded-card border border-line bg-surface-1 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Basics</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>Name<input value={draft.name} onChange={(event) => patch({ name: event.target.value })} className={inputCls} /></label>
              <label className={labelCls}>Slug<input value={draft.slug} onChange={(event) => patch({ slug: event.target.value })} className={inputCls} /></label>
              <label className={labelCls}>Service family
                <select value={draft.family_id ?? ''} onChange={(event) => patch({ family_id: event.target.value || null })} className={inputCls}>
                  {families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
                </select>
              </label>
              <label className={labelCls}>Currency<input value={draft.currency} onChange={(event) => patch({ currency: event.target.value.toUpperCase() })} className={inputCls} /></label>
              <label className={labelCls}>Waste factor %<input type="number" value={draft.waste_factor_pct} onChange={(event) => patch({ waste_factor_pct: num(event.target.value) })} className={inputCls} /></label>
              <label className="flex items-end gap-2 text-sm font-semibold text-content-primary">
                <input type="checkbox" checked={draft.is_active} onChange={(event) => patch({ is_active: event.target.checked })} className="h-4 w-4" /> Active (available in Quote Builder)
              </label>
            </div>
            <label className={`${labelCls} mt-3 block`}>Description<input value={draft.description ?? ''} onChange={(event) => patch({ description: event.target.value })} className={inputCls} /></label>
          </section>

          {/* Dimension ranges */}
          <section className="rounded-card border border-line bg-surface-1 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Pricing basis & allowed dimensions</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-4">
              <label className={labelCls}>Formula
                <select
                  value={draft.allowed_dimension_ranges_json.area_formula}
                  onChange={(event) => {
                    const formula = event.target.value as AreaFormula;
                    const current = draft.allowed_dimension_ranges_json;
                    patch({ allowed_dimension_ranges_json: formula === 'service' ? { area_formula: 'service' } : { area_formula: formula, width_mm: current.width_mm ?? { min: 10, max: 500 }, height_mm: current.height_mm ?? { min: 10, max: 700 }, ...(formula === 'pouch_gusset' ? { gusset_mm: current.gusset_mm ?? { min: 40, max: 120 } } : {}) } });
                  }}
                  className={inputCls}
                >
                  <option value="label_single">Flat area (labels / sleeves)</option>
                  <option value="pouch_gusset">Pouch (width × (height + gusset) × 2)</option>
                  <option value="service">Service (no dimensions)</option>
                </select>
              </label>
              {isDimensional ? (['width_mm', 'height_mm', ...(draft.allowed_dimension_ranges_json.area_formula === 'pouch_gusset' ? ['gusset_mm'] : [])] as const).map((dimension) => {
                const range = (draft.allowed_dimension_ranges_json as any)[dimension] ?? { min: 0, max: 0 };
                return (
                  <div key={dimension}>
                    <p className={labelCls}>{dimension.replace('_mm', '')} (mm)</p>
                    <div className="mt-1 flex gap-1">
                      <input type="number" value={range.min} onChange={(event) => patch({ allowed_dimension_ranges_json: { ...draft.allowed_dimension_ranges_json, [dimension]: { ...range, min: num(event.target.value) } } })} className="w-full rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                      <input type="number" value={range.max} onChange={(event) => patch({ allowed_dimension_ranges_json: { ...draft.allowed_dimension_ranges_json, [dimension]: { ...range, max: num(event.target.value) } } })} className="w-full rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                    </div>
                  </div>
                );
              }) : null}
            </div>
          </section>

          {/* Materials / service items */}
          <section className="rounded-card border border-line bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">{isDimensional ? 'Materials (rate per m²)' : 'Service items'}</p>
              <button onClick={() => patch({ material_rates_json: [...draft.material_rates_json, isDimensional ? { key: `mat_${draft.material_rates_json.length + 1}`, label: '', thickness: '', rate_per_sqm: 0 } : { key: `svc_${draft.material_rates_json.length + 1}`, label: '', basis: 'per_job', rate: 0 }] })} className={chipBtn}>+ Add</button>
            </div>
            <div className="mt-2 space-y-2">
              {draft.material_rates_json.map((material, index) => (
                <div key={index} className="grid gap-2 rounded-ctl border border-line bg-surface-app p-2 sm:grid-cols-[1fr_1fr_1fr_120px_auto]">
                  <input placeholder="key" value={material.key} onChange={(event) => patch({ material_rates_json: draft.material_rates_json.map((row, i) => i === index ? { ...row, key: event.target.value } : row) })} className="rounded-ctl border border-line bg-surface-1 px-2 py-1.5 text-sm" />
                  <input placeholder="Label" value={material.label} onChange={(event) => patch({ material_rates_json: draft.material_rates_json.map((row, i) => i === index ? { ...row, label: event.target.value } : row) })} className="rounded-ctl border border-line bg-surface-1 px-2 py-1.5 text-sm" />
                  {isDimensional ? (
                    <input placeholder="Thickness" value={material.thickness ?? ''} onChange={(event) => patch({ material_rates_json: draft.material_rates_json.map((row, i) => i === index ? { ...row, thickness: event.target.value } : row) })} className="rounded-ctl border border-line bg-surface-1 px-2 py-1.5 text-sm" />
                  ) : (
                    <select value={material.basis ?? 'per_job'} onChange={(event) => patch({ material_rates_json: draft.material_rates_json.map((row, i) => i === index ? { ...row, basis: event.target.value as MaterialRate['basis'] } : row) })} className="rounded-ctl border border-line bg-surface-1 px-2 py-1.5 text-sm">
                      <option value="per_job">per job</option><option value="per_design">per design</option><option value="per_unit">per piece</option>
                    </select>
                  )}
                  <input type="number" placeholder="Rate" value={isDimensional ? material.rate_per_sqm ?? 0 : material.rate ?? 0} onChange={(event) => patch({ material_rates_json: draft.material_rates_json.map((row, i) => i === index ? (isDimensional ? { ...row, rate_per_sqm: num(event.target.value) } : { ...row, rate: num(event.target.value) }) : row) })} className="rounded-ctl border border-line bg-surface-1 px-2 py-1.5 text-sm" />
                  <button onClick={() => patch({ material_rates_json: draft.material_rates_json.filter((_, i) => i !== index) })} className={chipBtn}>Remove</button>
                </div>
              ))}
            </div>
          </section>

          {isDimensional ? (
            <>
              {/* Print rules */}
              <section className="rounded-card border border-line bg-surface-1 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Print color multipliers</p>
                  <button onClick={() => patch({ print_rules_json: { basis: 'color_multiplier', tiers: [...(draft.print_rules_json.tiers ?? []), { max_colors: 99, multiplier: 1 }] } })} className={chipBtn}>+ Add tier</button>
                </div>
                <div className="mt-2 space-y-2">
                  {(draft.print_rules_json.tiers ?? []).map((tier, index) => (
                    <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                      <label className={labelCls}>Up to colors<input type="number" value={tier.max_colors} onChange={(event) => patch({ print_rules_json: { basis: 'color_multiplier', tiers: (draft.print_rules_json.tiers ?? []).map((row, i) => i === index ? { ...row, max_colors: num(event.target.value) } : row) } })} className={inputCls} /></label>
                      <label className={labelCls}>Multiplier<input type="number" step="0.05" value={tier.multiplier} onChange={(event) => patch({ print_rules_json: { basis: 'color_multiplier', tiers: (draft.print_rules_json.tiers ?? []).map((row, i) => i === index ? { ...row, multiplier: num(event.target.value) } : row) } })} className={inputCls} /></label>
                      <button onClick={() => patch({ print_rules_json: { basis: 'color_multiplier', tiers: (draft.print_rules_json.tiers ?? []).filter((_, i) => i !== index) } })} className={`${chipBtn} self-end`}>Remove</button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Finishes */}
              <section className="rounded-card border border-line bg-surface-1 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Finish & add-on rates</p>
                  <button onClick={() => patch({ finish_addon_rates_json: [...draft.finish_addon_rates_json, { key: `finish_${draft.finish_addon_rates_json.length + 1}`, label: '', basis: 'per_sqm', rate: 0 }] })} className={chipBtn}>+ Add</button>
                </div>
                <div className="mt-2 space-y-2">
                  {draft.finish_addon_rates_json.map((finish, index) => (
                    <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_130px_120px_auto]">
                      <input placeholder="key" value={finish.key} onChange={(event) => patch({ finish_addon_rates_json: draft.finish_addon_rates_json.map((row, i) => i === index ? { ...row, key: event.target.value } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                      <input placeholder="Label" value={finish.label} onChange={(event) => patch({ finish_addon_rates_json: draft.finish_addon_rates_json.map((row, i) => i === index ? { ...row, label: event.target.value } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                      <select value={finish.basis} onChange={(event) => patch({ finish_addon_rates_json: draft.finish_addon_rates_json.map((row, i) => i === index ? { ...row, basis: event.target.value as FinishAddonRate['basis'] } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm">
                        <option value="per_sqm">per m²</option><option value="per_unit">per piece</option>
                      </select>
                      <input type="number" step="0.01" value={finish.rate} onChange={(event) => patch({ finish_addon_rates_json: draft.finish_addon_rates_json.map((row, i) => i === index ? { ...row, rate: num(event.target.value) } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                      <button onClick={() => patch({ finish_addon_rates_json: draft.finish_addon_rates_json.filter((_, i) => i !== index) })} className={chipBtn}>Remove</button>
                    </div>
                  ))}
                </div>
              </section>
            </>
          ) : null}

          {/* MOQ & tiers */}
          <section className="rounded-card border border-line bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">MOQ & quantity tiers</p>
              <button onClick={() => patch({ moq_tiers_json: { ...draft.moq_tiers_json, tiers: [...(draft.moq_tiers_json.tiers ?? []), { min_qty: 0, max_qty: null, multiplier: 1 }] } })} className={chipBtn}>+ Add tier</button>
            </div>
            <label className={`${labelCls} mt-2 block w-40`}>MOQ<input type="number" value={draft.moq_tiers_json.moq} onChange={(event) => patch({ moq_tiers_json: { ...draft.moq_tiers_json, moq: num(event.target.value) } })} className={inputCls} /></label>
            <div className="mt-2 space-y-2">
              {(draft.moq_tiers_json.tiers ?? []).map((tier, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                  <label className={labelCls}>Min qty<input type="number" value={tier.min_qty} onChange={(event) => patch({ moq_tiers_json: { ...draft.moq_tiers_json, tiers: (draft.moq_tiers_json.tiers ?? []).map((row, i) => i === index ? { ...row, min_qty: num(event.target.value) } : row) } })} className={inputCls} /></label>
                  <label className={labelCls}>Max qty (blank = ∞)<input type="number" value={tier.max_qty ?? ''} onChange={(event) => patch({ moq_tiers_json: { ...draft.moq_tiers_json, tiers: (draft.moq_tiers_json.tiers ?? []).map((row, i) => i === index ? { ...row, max_qty: event.target.value === '' ? null : num(event.target.value) } : row) } })} className={inputCls} /></label>
                  <label className={labelCls}>Multiplier<input type="number" step="0.01" value={tier.multiplier} onChange={(event) => patch({ moq_tiers_json: { ...draft.moq_tiers_json, tiers: (draft.moq_tiers_json.tiers ?? []).map((row, i) => i === index ? { ...row, multiplier: num(event.target.value) } : row) } })} className={inputCls} /></label>
                  <button onClick={() => patch({ moq_tiers_json: { ...draft.moq_tiers_json, tiers: (draft.moq_tiers_json.tiers ?? []).filter((_, i) => i !== index) } })} className={`${chipBtn} self-end`}>Remove</button>
                </div>
              ))}
            </div>
          </section>

          {/* Setup charges */}
          <section className="rounded-card border border-line bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Setup / pre-press charges</p>
              <button onClick={() => patch({ setup_charges_json: [...draft.setup_charges_json, { key: `setup_${draft.setup_charges_json.length + 1}`, label: '', amount: 0, basis: 'per_job', required: true }] })} className={chipBtn}>+ Add</button>
            </div>
            <div className="mt-2 space-y-2">
              {draft.setup_charges_json.map((setup, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_120px_150px_110px_auto]">
                  <input placeholder="key" value={setup.key} onChange={(event) => patch({ setup_charges_json: draft.setup_charges_json.map((row, i) => i === index ? { ...row, key: event.target.value } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                  <input placeholder="Label" value={setup.label} onChange={(event) => patch({ setup_charges_json: draft.setup_charges_json.map((row, i) => i === index ? { ...row, label: event.target.value } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                  <input type="number" value={setup.amount} onChange={(event) => patch({ setup_charges_json: draft.setup_charges_json.map((row, i) => i === index ? { ...row, amount: num(event.target.value) } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                  <select value={setup.basis} onChange={(event) => patch({ setup_charges_json: draft.setup_charges_json.map((row, i) => i === index ? { ...row, basis: event.target.value as SetupCharge['basis'] } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm">
                    <option value="per_job">per job</option><option value="per_design">per design</option><option value="per_extra_design">per extra design</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-content-primary"><input type="checkbox" checked={setup.required} onChange={(event) => patch({ setup_charges_json: draft.setup_charges_json.map((row, i) => i === index ? { ...row, required: event.target.checked } : row) })} className="h-4 w-4" /> Required</label>
                  <button onClick={() => patch({ setup_charges_json: draft.setup_charges_json.filter((_, i) => i !== index) })} className={chipBtn}>Remove</button>
                </div>
              ))}
            </div>
          </section>

          {/* Rush & lead time */}
          <section className="rounded-card border border-line bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Rush options & lead times</p>
              <button onClick={() => { const key = `rush_${draft.rush_options_json.length + 1}`; patch({ rush_options_json: [...draft.rush_options_json, { key, label: '', uplift_pct: 0 }], lead_time_rules_json: { ...draft.lead_time_rules_json, [key]: '' } }); }} className={chipBtn}>+ Add rush</button>
            </div>
            <label className={`${labelCls} mt-2 block sm:w-64`}>Standard lead time<input value={draft.lead_time_rules_json.standard ?? ''} onChange={(event) => patch({ lead_time_rules_json: { ...draft.lead_time_rules_json, standard: event.target.value } })} className={inputCls} placeholder="e.g. 10-12 business days" /></label>
            <div className="mt-2 space-y-2">
              {draft.rush_options_json.map((rush, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[130px_1fr_120px_1fr_auto]">
                  <input placeholder="key" value={rush.key} onChange={(event) => patch({ rush_options_json: draft.rush_options_json.map((row, i) => i === index ? { ...row, key: event.target.value } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                  <input placeholder="Label" value={rush.label} onChange={(event) => patch({ rush_options_json: draft.rush_options_json.map((row, i) => i === index ? { ...row, label: event.target.value } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                  <input type="number" placeholder="Uplift %" value={rush.uplift_pct} onChange={(event) => patch({ rush_options_json: draft.rush_options_json.map((row, i) => i === index ? { ...row, uplift_pct: num(event.target.value) } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                  <input placeholder="Lead time for this option" value={draft.lead_time_rules_json[rush.key] ?? ''} onChange={(event) => patch({ lead_time_rules_json: { ...draft.lead_time_rules_json, [rush.key]: event.target.value } })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                  <button onClick={() => patch({ rush_options_json: draft.rush_options_json.filter((_, i) => i !== index) })} className={chipBtn}>Remove</button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Preview + health */}
        <aside className="space-y-4">
          <section className={`rounded-panel border p-4 ${health.tone === 'ready' ? 'border-success-border bg-success-bg' : 'border-warning-border bg-warning-bg'}`}>
            <div className="flex items-center gap-2">
              <span className="rounded-ctl bg-accent-600 px-2 py-1 text-xs font-bold text-white">G</span>
              <p className={`font-semibold ${health.tone === 'ready' ? 'text-success-fg' : 'text-warning-fg'}`}>Template health check</p>
            </div>
            <p className={`mt-2 text-sm font-medium ${health.tone === 'ready' ? 'text-success-fg' : 'text-warning-fg'}`}>{health.headline}</p>
            {health.items.length ? (
              <ul className={`mt-2 list-disc space-y-1 pl-5 text-sm ${health.tone === 'ready' ? 'text-success-fg' : 'text-warning-fg'}`}>
                {health.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : null}
            <p className={`mt-2 text-xs ${health.tone === 'ready' ? 'text-success-fg' : 'text-warning-fg'}`}>Review only — no rule is changed automatically.</p>
          </section>

          <section className="rounded-panel border border-line bg-surface-1 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Live preview</p>
            <p className="mt-1 text-sm text-content-secondary">Same engine as the Quote Builder.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {isDimensional ? (
                <>
                  <label className={labelCls}>Width<input type="number" value={previewInput.width_mm ?? ''} onChange={(event) => setPreviewInput((previous) => ({ ...previous, width_mm: event.target.value === '' ? null : Number(event.target.value) }))} className={inputCls} /></label>
                  <label className={labelCls}>Height<input type="number" value={previewInput.height_mm ?? ''} onChange={(event) => setPreviewInput((previous) => ({ ...previous, height_mm: event.target.value === '' ? null : Number(event.target.value) }))} className={inputCls} /></label>
                  {draft.allowed_dimension_ranges_json.area_formula === 'pouch_gusset' ? (
                    <label className={labelCls}>Gusset<input type="number" value={previewInput.gusset_mm ?? ''} onChange={(event) => setPreviewInput((previous) => ({ ...previous, gusset_mm: event.target.value === '' ? null : Number(event.target.value) }))} className={inputCls} /></label>
                  ) : null}
                  <label className={labelCls}>Material
                    <select value={previewInput.material_key ?? draft.material_rates_json[0]?.key ?? ''} onChange={(event) => setPreviewInput((previous) => ({ ...previous, material_key: event.target.value || null }))} className={inputCls}>
                      {draft.material_rates_json.map((material) => <option key={material.key} value={material.key}>{material.label || material.key}</option>)}
                    </select>
                  </label>
                  <label className={labelCls}>Colors<input type="number" value={previewInput.print_colors ?? 1} onChange={(event) => setPreviewInput((previous) => ({ ...previous, print_colors: Number(event.target.value) || 1 }))} className={inputCls} /></label>
                </>
              ) : null}
              <label className={labelCls}>Quantity<input type="number" value={previewInput.quantity ?? ''} onChange={(event) => setPreviewInput((previous) => ({ ...previous, quantity: event.target.value === '' ? null : Number(event.target.value) }))} className={inputCls} /></label>
            </div>

            {preview.ok ? (
              <div className="mt-3">
                <ul className="divide-y divide-line text-sm">
                  {preview.breakdown.map((line) => (
                    <li key={line.key} className="flex items-center justify-between py-1.5">
                      <span className="text-content-secondary">{line.label}</span>
                      <span className={`font-semibold ${line.amount < 0 ? 'text-success-fg' : 'text-content-primary'}`}>{line.amount < 0 ? '−' : ''}{money(Math.abs(line.amount), preview.currency)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 rounded-ctl bg-surface-2 px-3 py-2">
                  <p className="text-sm font-semibold text-content-primary">Unit price: {money(preview.unit_price, preview.currency)}</p>
                  <p className="text-lg font-bold text-content-primary">Total: {money(preview.total_price, preview.currency)}</p>
                  {preview.lead_time ? <p className="text-xs text-content-muted">Lead time: {preview.lead_time}</p> : null}
                </div>
              </div>
            ) : (
              <ul className="mt-3 space-y-1">
                {preview.validation_errors.map((error) => <li key={error} className="rounded-ctl bg-warning-bg px-3 py-2 text-sm font-medium text-warning-fg">{error}</li>)}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
