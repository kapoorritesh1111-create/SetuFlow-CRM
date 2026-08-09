'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type {
  AreaFormula,
  FinishAddonRate,
  MaterialRate,
  PackagingCalculationInput,
  PackagingPricingTemplate,
  PackagingReferenceItem,
  PackagingServiceFamily,
  RushOption,
  SetupCharge,
} from '@/lib/packaging/types';
import { calculatePackagingPrice } from '@/lib/packaging/pricing-engine';
import { checkPackagingTemplateHealth } from '@/lib/setu-guru/packaging-guidance';
import { savePackagingTemplate, duplicatePackagingTemplate, savePackagingReferenceItem } from '@/features/packaging/server/actions';
import { workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';

type Props = {
  families: PackagingServiceFamily[];
  templates: PackagingPricingTemplate[];
  referenceItems: PackagingReferenceItem[];
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
  adhesive_options_json: [],
  print_process: 'digital',
  flexo_rules_json: null,
});

function money(value: number, currency: string) {
  return `${currency} ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function num(value: string): number {
  const parsed = Number(value.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

const inputCls = 'mt-1 w-full rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm text-content-primary';
const labelCls = 'text-xs font-semibold text-content-primary';
const chipBtn = 'rounded-ctl border border-line bg-surface-app px-2.5 py-1.5 text-xs font-semibold text-content-secondary';

function CurrencyInput({ currency, value, onChange, suffix }: { currency: string; value: number; onChange: (value: number) => void; suffix?: string }) {
  return (
    <div className="flex overflow-hidden rounded-ctl border border-line bg-surface-1 focus-within:border-brand-400 focus-within:ring-1 focus-within:ring-brand-200">
      <span className="flex items-center border-r border-line bg-surface-2 px-2 text-xs font-bold text-content-secondary">{currency}</span>
      <input
        type="text"
        inputMode="decimal"
        value={Number.isFinite(value) ? String(value) : ''}
        onChange={(event) => onChange(num(event.target.value))}
        className="min-w-0 flex-1 bg-surface-1 px-2 py-1.5 text-right text-sm font-semibold tabular-nums text-content-primary outline-none"
        aria-label={`Amount in ${currency}${suffix ? ` ${suffix}` : ''}`}
      />
      {suffix ? <span className="flex items-center border-l border-line bg-surface-2 px-2 text-xs font-semibold text-content-muted">{suffix}</span> : null}
    </div>
  );
}

export default function PricingTemplateBuilder({ families, templates, referenceItems }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(templates[0]?.id ?? 'new');
  const [draft, setDraft] = useState<Draft>(templates[0] ?? NEW_TEMPLATE(families));
  const [previewInput, setPreviewInput] = useState<PackagingCalculationInput>({ width_mm: 180, height_mm: 260, gusset_mm: 80, material_key: null, print_colors: 2, finish_keys: [], service_item_keys: [], quantity: 1000, designs: 1, artwork_status: 'print_ready', rush_key: null });
  const [saving, startSaving] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [libraryItems, setLibraryItems] = useState<PackagingReferenceItem[]>(referenceItems);
  const [savingToLibrary, setSavingToLibrary] = useState<string | null>(null);

  const saveLabelToLibrary = async (category: 'material' | 'finish' | 'service_item', label: string, extra?: { thickness?: string; basis?: string }) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    if (libraryItems.some((item) => item.category === category && item.name.toLowerCase() === trimmed.toLowerCase())) return;
    setSavingToLibrary(`${category}:${trimmed}`);
    const response = await savePackagingReferenceItem({
      category,
      name: trimmed,
      default_thickness: extra?.thickness || null,
      default_unit_hint: extra?.basis || null,
    });
    setSavingToLibrary(null);
    if (response.ok && response.item) setLibraryItems((previous) => [...previous, response.item!]);
  };

  const isDimensional = draft.allowed_dimension_ranges_json?.area_formula !== 'service';
  const selectedFamily = families.find((family) => family.id === draft.family_id) ?? null;
  const quotedUnit = selectedFamily?.default_unit?.trim() || 'unit';
  const unitDisplay = quotedUnit.toLowerCase() === 'pcs' ? 'pouch / piece' : quotedUnit;
  const health = useMemo(() => checkPackagingTemplateHealth(draft), [draft]);
  const preview = useMemo(() => {
    const input: PackagingCalculationInput = {
      ...previewInput,
      material_key: previewInput.material_key ?? draft.material_rates_json[0]?.key ?? null,
      adhesive_key: previewInput.adhesive_key ?? draft.adhesive_options_json?.[0]?.key ?? null,
      repeat_length_mm: previewInput.repeat_length_mm ?? (draft.print_process === 'flexo' ? draft.flexo_rules_json?.repeat_length_mm.min ?? null : null),
      service_item_keys: isDimensional
        ? []
        : (previewInput.service_item_keys?.length ? previewInput.service_item_keys : draft.material_rates_json.slice(0, 1).map((item) => item.key)),
    };
    return calculatePackagingPrice(draft, input);
  }, [draft, previewInput, isDimensional]);

  const selectTemplate = (id: string) => {
    setSelectedId(id);
    setFeedback(null);
    setPreviewInput((previous) => ({ ...previous, material_key: null, finish_keys: [], service_item_keys: [], rush_key: null }));
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

  const togglePreviewFinish = (key: string) => {
    setPreviewInput((previous) => {
      const current = previous.finish_keys ?? [];
      return { ...previous, finish_keys: current.includes(key) ? current.filter((item) => item !== key) : [...current, key] };
    });
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="rounded-card border border-line bg-surface-1 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-content-primary">Set the rules your team already uses to price this packaging family.</p>
            <p className="mt-1 text-sm text-content-secondary">Add the materials, print rules, add-ons, quantity breaks and charges. Use the preview to test one familiar quote before you activate the template.</p>
            <p className="mt-1 text-xs font-semibold text-content-muted">{templates.length} template{templates.length === 1 ? '' : 's'} · {templates.filter((template) => template.is_active).length} active</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/setu-guru" className="rounded-ctl border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100">Ask Setu Guru</Link>
            <Link href="/admin/packaging-families" className="rounded-ctl border border-line bg-surface-app px-3 py-2 text-xs font-semibold text-content-secondary hover:bg-surface-2">Service Families</Link>
            <Link href="/admin/packaging-reference-library" className="rounded-ctl border border-line bg-surface-app px-3 py-2 text-xs font-semibold text-content-secondary hover:bg-surface-2">Reference Library</Link>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {draft.id ? <button onClick={handleDuplicate} disabled={saving} className={`rounded-ctl px-4 py-2 text-sm font-semibold disabled:opacity-50 ${workspaceSecondaryButtonClass}`}>Duplicate</button> : null}
        <button onClick={handleSave} disabled={saving} className={`rounded-ctl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${workspacePrimaryButtonClass}`}>{saving ? 'Saving…' : 'Save template'}</button>
      </div>

      {feedback ? <p className={`rounded-ctl px-3 py-2 text-sm font-medium ${feedback.tone === 'success' ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>{feedback.text}</p> : null}

      <div className="flex flex-wrap gap-2">
        {templates.map((template) => (
          <button key={template.id} onClick={() => selectTemplate(template.id)} className={`rounded-ctl border px-3 py-2 text-sm font-semibold transition ${selectedId === template.id ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line bg-surface-1 text-content-secondary hover:bg-surface-2'}`}>
            {template.name}{template.is_active ? '' : ' (inactive)'}
          </button>
        ))}
        <button onClick={() => selectTemplate('new')} className={`rounded-ctl border px-3 py-2 text-sm font-semibold transition ${selectedId === 'new' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line bg-surface-1 text-content-secondary hover:bg-surface-2'}`}>+ New template</button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          <section className="rounded-card border border-line bg-surface-1 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Basics</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>Name<input value={draft.name} onChange={(event) => patch({ name: event.target.value })} className={inputCls} /></label>
              <label className={labelCls}>Slug<input value={draft.slug} onChange={(event) => patch({ slug: event.target.value })} className={inputCls} /></label>
              <label className={labelCls}>Service family
                <select value={draft.family_id ?? ''} onChange={(event) => patch({ family_id: event.target.value || null })} className={inputCls}>
                  <option value="">— No family selected —</option>
                  {families.map((family) => <option key={family.id} value={family.id}>{family.name}</option>)}
                </select>
                {!draft.family_id ? <p className="mt-1 text-xs font-medium text-warning-fg">Choose the family this pricing belongs to before activating the template.</p> : null}
              </label>
              <label className={labelCls}>Currency<input value={draft.currency} onChange={(event) => patch({ currency: event.target.value.toUpperCase() })} className={inputCls} /></label>
              <label className={labelCls}>Waste factor %<input type="number" value={draft.waste_factor_pct} onChange={(event) => patch({ waste_factor_pct: num(event.target.value) })} className={inputCls} /></label>
              <label className={labelCls}>Print process
                <select value={draft.print_process ?? 'digital'} onChange={(event) => {
                  const process = event.target.value as 'digital' | 'flexo';
                  patch({ print_process: process, flexo_rules_json: process === 'flexo' ? (draft.flexo_rules_json ?? { repeat_length_mm: { min: 150, max: 600 }, web_width_mm: { min: 300, max: 1400 }, cylinder_rate_tiers: [{ max_repeat_mm: 300, rate_per_color: 4500 }] }) : null });
                }} className={inputCls}>
                  <option value="digital">Digital</option>
                  <option value="flexo">Flexographic (cylinder pricing)</option>
                </select>
              </label>
              <label className="flex items-end gap-2 text-sm font-semibold text-content-primary"><input type="checkbox" checked={draft.is_active} onChange={(event) => patch({ is_active: event.target.checked })} className="h-4 w-4" /> Active (available in Quote Builder)</label>
            </div>
            <label className={`${labelCls} mt-3 block`}>Description<input value={draft.description ?? ''} onChange={(event) => patch({ description: event.target.value })} className={inputCls} /></label>
          </section>

          {draft.print_process === 'flexo' ? (
            <section className="rounded-card border border-line bg-surface-1 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Flexo cylinder rules</p>
              <p className="mt-1 text-xs text-content-muted">Set the repeat and web-width ranges you can produce, then add the cylinder charge used for each repeat-length tier.</p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div><p className={labelCls}>Repeat length range (mm)</p><div className="mt-1 flex gap-1"><input type="number" value={draft.flexo_rules_json?.repeat_length_mm.min ?? 0} onChange={(event) => patch({ flexo_rules_json: { ...draft.flexo_rules_json!, repeat_length_mm: { ...draft.flexo_rules_json!.repeat_length_mm, min: num(event.target.value) } } })} className="w-full rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" /><input type="number" value={draft.flexo_rules_json?.repeat_length_mm.max ?? 0} onChange={(event) => patch({ flexo_rules_json: { ...draft.flexo_rules_json!, repeat_length_mm: { ...draft.flexo_rules_json!.repeat_length_mm, max: num(event.target.value) } } })} className="w-full rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" /></div></div>
                <div><p className={labelCls}>Web width range (mm)</p><div className="mt-1 flex gap-1"><input type="number" value={draft.flexo_rules_json?.web_width_mm.min ?? 0} onChange={(event) => patch({ flexo_rules_json: { ...draft.flexo_rules_json!, web_width_mm: { ...draft.flexo_rules_json!.web_width_mm, min: num(event.target.value) } } })} className="w-full rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" /><input type="number" value={draft.flexo_rules_json?.web_width_mm.max ?? 0} onChange={(event) => patch({ flexo_rules_json: { ...draft.flexo_rules_json!, web_width_mm: { ...draft.flexo_rules_json!.web_width_mm, max: num(event.target.value) } } })} className="w-full rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" /></div></div>
              </div>
              <div className="mt-3 flex items-center justify-between"><p className={labelCls}>Cylinder rate per color, by repeat length tier</p><button onClick={() => patch({ flexo_rules_json: { ...draft.flexo_rules_json!, cylinder_rate_tiers: [...draft.flexo_rules_json!.cylinder_rate_tiers, { max_repeat_mm: 0, rate_per_color: 0 }] } })} className={chipBtn}>+ Add tier</button></div>
              <div className="mt-2 space-y-2">{(draft.flexo_rules_json?.cylinder_rate_tiers ?? []).map((tier, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2"><label className={labelCls}>Up to repeat (mm)<input type="number" value={tier.max_repeat_mm} onChange={(event) => patch({ flexo_rules_json: { ...draft.flexo_rules_json!, cylinder_rate_tiers: draft.flexo_rules_json!.cylinder_rate_tiers.map((row, i) => i === index ? { ...row, max_repeat_mm: num(event.target.value) } : row) } })} className={inputCls} /></label><label className={labelCls}>Rate per color<CurrencyInput currency={draft.currency} value={tier.rate_per_color} onChange={(value) => patch({ flexo_rules_json: { ...draft.flexo_rules_json!, cylinder_rate_tiers: draft.flexo_rules_json!.cylinder_rate_tiers.map((row, i) => i === index ? { ...row, rate_per_color: value } : row) } })} /></label><button onClick={() => patch({ flexo_rules_json: { ...draft.flexo_rules_json!, cylinder_rate_tiers: draft.flexo_rules_json!.cylinder_rate_tiers.filter((_, i) => i !== index) } })} className={`${chipBtn} self-end`}>Remove</button></div>)}</div>
            </section>
          ) : null}

          <section className="rounded-card border border-line bg-surface-1 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Pricing basis & allowed dimensions</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-4">
              <label className={labelCls}>How material area is calculated
                <select value={draft.allowed_dimension_ranges_json.area_formula} onChange={(event) => {
                  const formula = event.target.value as AreaFormula;
                  const current = draft.allowed_dimension_ranges_json;
                  patch({ allowed_dimension_ranges_json: formula === 'service' ? { area_formula: 'service' } : { area_formula: formula, width_mm: current.width_mm ?? { min: 10, max: 500 }, height_mm: current.height_mm ?? { min: 10, max: 700 }, ...(formula === 'pouch_gusset' ? { gusset_mm: current.gusset_mm ?? { min: 40, max: 120 } } : {}) } });
                }} className={inputCls}>
                  <option value="label_single">Flat sheet / label / sleeve</option>
                  <option value="pouch_gusset">Pouch with front + back + gusset</option>
                  <option value="service">Service — no dimensions</option>
                </select>
              </label>
              {isDimensional ? (['width_mm', 'height_mm', ...(draft.allowed_dimension_ranges_json.area_formula === 'pouch_gusset' ? ['gusset_mm'] : [])] as const).map((dimension) => {
                const range = (draft.allowed_dimension_ranges_json as any)[dimension] ?? { min: 0, max: 0 };
                return <div key={dimension}><p className={labelCls}>{dimension.replace('_mm', '')} (mm)</p><div className="mt-1 flex gap-1"><input type="number" value={range.min} onChange={(event) => patch({ allowed_dimension_ranges_json: { ...draft.allowed_dimension_ranges_json, [dimension]: { ...range, min: num(event.target.value) } } })} className="w-full rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" /><input type="number" value={range.max} onChange={(event) => patch({ allowed_dimension_ranges_json: { ...draft.allowed_dimension_ranges_json, [dimension]: { ...range, max: num(event.target.value) } } })} className="w-full rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" /></div></div>;
              }) : null}
            </div>
          </section>

          <section className="rounded-card border border-line bg-surface-1 p-4">
            <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-content-muted">{isDimensional ? 'Materials' : 'Service items'}</p><p className="mt-1 text-xs text-content-muted">Choose the name your team recognizes. Reference Library suggestions keep naming consistent.</p></div><button onClick={() => patch({ material_rates_json: [...draft.material_rates_json, isDimensional ? { key: `mat_${draft.material_rates_json.length + 1}`, label: '', thickness: '', rate_per_sqm: 0 } : { key: `svc_${draft.material_rates_json.length + 1}`, label: '', basis: 'per_job', rate: 0 }] })} className={chipBtn}>+ Add</button></div>
            <datalist id="reflib-material">{libraryItems.filter((item) => item.category === (isDimensional ? 'material' : 'service_item')).map((item) => <option key={item.id} value={item.name} />)}</datalist>
            {draft.material_rates_json.length ? <div className={`mt-3 hidden gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-content-muted sm:grid ${isDimensional ? 'grid-cols-[minmax(240px,1.5fr)_minmax(180px,1fr)_minmax(190px,.8fr)_78px_86px]' : 'grid-cols-[minmax(240px,1.5fr)_150px_minmax(190px,.8fr)_78px_86px]'}`}><span>{isDimensional ? 'Material / Structure' : 'Service item'}</span><span>{isDimensional ? 'Thickness / Basis' : 'Charge basis'}</span><span>{isDimensional ? `Rate (${draft.currency} / m²)` : `Rate (${draft.currency})`}</span><span>Library</span><span /></div> : null}
            <div className="mt-1 space-y-2">{draft.material_rates_json.map((material, index) => {
              const category = isDimensional ? 'material' : 'service_item';
              const alreadyInLibrary = libraryItems.some((item) => item.category === category && item.name.toLowerCase() === material.label.trim().toLowerCase());
              const matched = libraryItems.find((item) => item.category === category && item.name.toLowerCase() === material.label.trim().toLowerCase());
              return <div key={index} className={`grid gap-2 rounded-ctl border border-line bg-surface-app p-2 ${isDimensional ? 'sm:grid-cols-[minmax(240px,1.5fr)_minmax(180px,1fr)_minmax(190px,.8fr)_78px_86px]' : 'sm:grid-cols-[minmax(240px,1.5fr)_150px_minmax(190px,.8fr)_78px_86px]'}`}>
                <div className="relative">{matched?.swatch_color ? <span className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-black/10" style={{ backgroundColor: matched.swatch_color }} /> : null}<input list="reflib-material" placeholder={isDimensional ? 'Material / Structure' : 'Service item'} value={material.label} onChange={(event) => patch({ material_rates_json: draft.material_rates_json.map((row, i) => i === index ? { ...row, label: event.target.value } : row) })} className={`w-full rounded-ctl border border-line bg-surface-1 py-1.5 text-sm ${matched?.swatch_color ? 'pl-7 pr-2' : 'px-2'}`} /></div>
                {isDimensional ? <input placeholder="e.g. 12/12/60" value={material.thickness ?? ''} onChange={(event) => patch({ material_rates_json: draft.material_rates_json.map((row, i) => i === index ? { ...row, thickness: event.target.value } : row) })} className="rounded-ctl border border-line bg-surface-1 px-2 py-1.5 text-sm" /> : <select value={material.basis ?? 'per_job'} onChange={(event) => patch({ material_rates_json: draft.material_rates_json.map((row, i) => i === index ? { ...row, basis: event.target.value as MaterialRate['basis'] } : row) })} className="rounded-ctl border border-line bg-surface-1 px-2 py-1.5 text-sm"><option value="per_job">per job</option><option value="per_design">per design</option><option value="per_unit">per piece</option></select>}
                <CurrencyInput currency={draft.currency} value={isDimensional ? material.rate_per_sqm ?? 0 : material.rate ?? 0} suffix={isDimensional ? '/ m²' : undefined} onChange={(value) => patch({ material_rates_json: draft.material_rates_json.map((row, i) => i === index ? (isDimensional ? { ...row, rate_per_sqm: value } : { ...row, rate: value }) : row) })} />
                <button title={alreadyInLibrary ? 'Already in your reference library' : 'Save this name to your reference library'} disabled={alreadyInLibrary || !material.label.trim() || savingToLibrary === `${category}:${material.label.trim()}`} onClick={() => saveLabelToLibrary(category, material.label, isDimensional ? { thickness: material.thickness } : { basis: material.basis })} className={`rounded-ctl border px-2 py-1.5 text-xs font-semibold disabled:opacity-40 ${alreadyInLibrary ? 'border-line bg-surface-2 text-content-muted' : 'border-line bg-surface-1 text-content-secondary hover:bg-surface-2'}`}>{alreadyInLibrary ? '✓' : '+ Lib'}</button>
                <button onClick={() => patch({ material_rates_json: draft.material_rates_json.filter((_, i) => i !== index) })} className={chipBtn}>Remove</button>
              </div>;
            })}</div>
          </section>

          {isDimensional ? <section className="rounded-card border border-line bg-surface-1 p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Adhesive / build options</p><button onClick={() => patch({ adhesive_options_json: [...(draft.adhesive_options_json ?? []), { key: `adh_${(draft.adhesive_options_json ?? []).length + 1}`, label: '' }] })} className={chipBtn}>+ Add</button></div><p className="mt-1 text-xs text-content-muted">Optional quote-time choices. They do not change price unless you add a separate priced rule.</p><div className="mt-2 space-y-2">{(draft.adhesive_options_json ?? []).map((option, index) => <div key={index} className="grid grid-cols-[1fr_auto] gap-2"><input placeholder="Option name" value={option.label} onChange={(event) => patch({ adhesive_options_json: (draft.adhesive_options_json ?? []).map((row, i) => i === index ? { ...row, label: event.target.value } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" /><button onClick={() => patch({ adhesive_options_json: (draft.adhesive_options_json ?? []).filter((_, i) => i !== index) })} className={chipBtn}>Remove</button></div>)}{!(draft.adhesive_options_json ?? []).length ? <p className="text-sm text-content-muted">No build options added.</p> : null}</div></section> : null}

          {isDimensional ? <>
            <section className="rounded-card border border-line bg-surface-1 p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Print color multipliers</p><button onClick={() => patch({ print_rules_json: { basis: 'color_multiplier', tiers: [...(draft.print_rules_json.tiers ?? []), { max_colors: 99, multiplier: 1 }] } })} className={chipBtn}>+ Add tier</button></div><div className="mt-2 space-y-2">{(draft.print_rules_json.tiers ?? []).map((tier, index) => <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2"><label className={labelCls}>Up to colors<input type="number" value={tier.max_colors} onChange={(event) => patch({ print_rules_json: { basis: 'color_multiplier', tiers: (draft.print_rules_json.tiers ?? []).map((row, i) => i === index ? { ...row, max_colors: num(event.target.value) } : row) } })} className={inputCls} /></label><label className={labelCls}>Multiplier<input type="number" step="0.05" value={tier.multiplier} onChange={(event) => patch({ print_rules_json: { basis: 'color_multiplier', tiers: (draft.print_rules_json.tiers ?? []).map((row, i) => i === index ? { ...row, multiplier: num(event.target.value) } : row) } })} className={inputCls} /></label><button onClick={() => patch({ print_rules_json: { basis: 'color_multiplier', tiers: (draft.print_rules_json.tiers ?? []).filter((_, i) => i !== index) } })} className={`${chipBtn} self-end`}>Remove</button></div>)}</div></section>

            <section className="rounded-card border border-line bg-surface-1 p-4">
              <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Finish & add-on rates</p><p className="mt-1 text-xs text-content-muted">Add only options that change price. Test them in Live Preview using the checkboxes on the right.</p></div><button onClick={() => patch({ finish_addon_rates_json: [...draft.finish_addon_rates_json, { key: `finish_${draft.finish_addon_rates_json.length + 1}`, label: '', basis: 'per_unit', rate: 0 }] })} className={chipBtn}>+ Add</button></div>
              <datalist id="reflib-finish">{libraryItems.filter((item) => item.category === 'finish').map((item) => <option key={item.id} value={item.name} />)}</datalist>
              {draft.finish_addon_rates_json.length ? <div className="mt-3 hidden gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-content-muted sm:grid sm:grid-cols-[minmax(240px,1.5fr)_140px_minmax(180px,.8fr)_78px_86px]"><span>Finish / Add-on</span><span>Charge basis</span><span>Rate ({draft.currency})</span><span>Library</span><span /></div> : null}
              <div className="mt-1 space-y-2">{draft.finish_addon_rates_json.map((finish, index) => {
                const alreadyInLibrary = libraryItems.some((item) => item.category === 'finish' && item.name.toLowerCase() === finish.label.trim().toLowerCase());
                const matched = libraryItems.find((item) => item.category === 'finish' && item.name.toLowerCase() === finish.label.trim().toLowerCase());
                return <div key={index} className="grid gap-2 sm:grid-cols-[minmax(240px,1.5fr)_140px_minmax(180px,.8fr)_78px_86px]">
                  <div className="relative">{matched?.swatch_color ? <span className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-black/10" style={{ backgroundColor: matched.swatch_color }} /> : null}<input list="reflib-finish" placeholder="Finish / Add-on" value={finish.label} onChange={(event) => patch({ finish_addon_rates_json: draft.finish_addon_rates_json.map((row, i) => i === index ? { ...row, label: event.target.value } : row) })} className={`w-full rounded-ctl border border-line bg-surface-app py-1.5 text-sm ${matched?.swatch_color ? 'pl-7 pr-2' : 'px-2'}`} /></div>
                  <select value={finish.basis} onChange={(event) => patch({ finish_addon_rates_json: draft.finish_addon_rates_json.map((row, i) => i === index ? { ...row, basis: event.target.value as FinishAddonRate['basis'] } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm"><option value="per_unit">per pouch / piece</option><option value="per_sqm">per m²</option></select>
                  <CurrencyInput currency={draft.currency} value={finish.rate} suffix={finish.basis === 'per_sqm' ? '/ m²' : `/ ${unitDisplay}`} onChange={(value) => patch({ finish_addon_rates_json: draft.finish_addon_rates_json.map((row, i) => i === index ? { ...row, rate: value } : row) })} />
                  <button title={alreadyInLibrary ? 'Already in your reference library' : 'Save this name to your reference library'} disabled={alreadyInLibrary || !finish.label.trim() || savingToLibrary === `finish:${finish.label.trim()}`} onClick={() => saveLabelToLibrary('finish', finish.label, { basis: finish.basis })} className={`rounded-ctl border px-2 py-1.5 text-xs font-semibold disabled:opacity-40 ${alreadyInLibrary ? 'border-line bg-surface-2 text-content-muted' : 'border-line bg-surface-app text-content-secondary hover:bg-surface-2'}`}>{alreadyInLibrary ? '✓' : '+ Lib'}</button>
                  <button onClick={() => { patch({ finish_addon_rates_json: draft.finish_addon_rates_json.filter((_, i) => i !== index) }); setPreviewInput((previous) => ({ ...previous, finish_keys: (previous.finish_keys ?? []).filter((key) => key !== finish.key) })); }} className={chipBtn}>Remove</button>
                </div>;
              })}</div>
            </section>
          </> : null}

          <section className="rounded-card border border-line bg-surface-1 p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-content-muted">MOQ & quantity tiers</p><button onClick={() => patch({ moq_tiers_json: { ...draft.moq_tiers_json, tiers: [...(draft.moq_tiers_json.tiers ?? []), { min_qty: 0, max_qty: null, multiplier: 1 }] } })} className={chipBtn}>+ Add tier</button></div><label className={`${labelCls} mt-2 block w-40`}>MOQ<input type="number" value={draft.moq_tiers_json.moq} onChange={(event) => patch({ moq_tiers_json: { ...draft.moq_tiers_json, moq: num(event.target.value) } })} className={inputCls} /></label><div className="mt-2 space-y-2">{(draft.moq_tiers_json.tiers ?? []).map((tier, index) => <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2"><label className={labelCls}>Min qty<input type="number" value={tier.min_qty} onChange={(event) => patch({ moq_tiers_json: { ...draft.moq_tiers_json, tiers: (draft.moq_tiers_json.tiers ?? []).map((row, i) => i === index ? { ...row, min_qty: num(event.target.value) } : row) } })} className={inputCls} /></label><label className={labelCls}>Max qty (blank = ∞)<input type="number" value={tier.max_qty ?? ''} onChange={(event) => patch({ moq_tiers_json: { ...draft.moq_tiers_json, tiers: (draft.moq_tiers_json.tiers ?? []).map((row, i) => i === index ? { ...row, max_qty: event.target.value === '' ? null : num(event.target.value) } : row) } })} className={inputCls} /></label><label className={labelCls}>Multiplier<input type="number" step="0.01" value={tier.multiplier} onChange={(event) => patch({ moq_tiers_json: { ...draft.moq_tiers_json, tiers: (draft.moq_tiers_json.tiers ?? []).map((row, i) => i === index ? { ...row, multiplier: num(event.target.value) } : row) } })} className={inputCls} /></label><button onClick={() => patch({ moq_tiers_json: { ...draft.moq_tiers_json, tiers: (draft.moq_tiers_json.tiers ?? []).filter((_, i) => i !== index) } })} className={`${chipBtn} self-end`}>Remove</button></div>)}</div></section>

          <section className="rounded-card border border-line bg-surface-1 p-4">
            <div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Setup / pre-press charges</p><button onClick={() => patch({ setup_charges_json: [...draft.setup_charges_json, { key: `setup_${draft.setup_charges_json.length + 1}`, label: '', amount: 0, basis: 'per_job', required: true }] })} className={chipBtn}>+ Add</button></div>
            {draft.setup_charges_json.length ? <div className="mt-3 hidden gap-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-content-muted sm:grid sm:grid-cols-[minmax(260px,1.5fr)_minmax(180px,.8fr)_160px_110px_86px]"><span>Charge</span><span>Amount ({draft.currency})</span><span>Basis</span><span>Required</span><span /></div> : null}
            <div className="mt-1 space-y-2">{draft.setup_charges_json.map((setup, index) => <div key={index} className="grid gap-2 sm:grid-cols-[minmax(260px,1.5fr)_minmax(180px,.8fr)_160px_110px_86px]"><input placeholder="Charge name" value={setup.label} onChange={(event) => patch({ setup_charges_json: draft.setup_charges_json.map((row, i) => i === index ? { ...row, label: event.target.value } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" /><CurrencyInput currency={draft.currency} value={setup.amount} onChange={(value) => patch({ setup_charges_json: draft.setup_charges_json.map((row, i) => i === index ? { ...row, amount: value } : row) })} /><select value={setup.basis} onChange={(event) => patch({ setup_charges_json: draft.setup_charges_json.map((row, i) => i === index ? { ...row, basis: event.target.value as SetupCharge['basis'] } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm"><option value="per_job">per job</option><option value="per_design">per design</option><option value="per_extra_design">per extra design</option></select><label className="flex items-center gap-1.5 text-xs font-semibold text-content-primary"><input type="checkbox" checked={setup.required} onChange={(event) => patch({ setup_charges_json: draft.setup_charges_json.map((row, i) => i === index ? { ...row, required: event.target.checked } : row) })} className="h-4 w-4" /> Required</label><button onClick={() => patch({ setup_charges_json: draft.setup_charges_json.filter((_, i) => i !== index) })} className={chipBtn}>Remove</button></div>)}</div>
          </section>

          <section className="rounded-card border border-line bg-surface-1 p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Rush options & lead times</p><button onClick={() => { const key = `rush_${draft.rush_options_json.length + 1}`; patch({ rush_options_json: [...draft.rush_options_json, { key, label: '', uplift_pct: 0 }], lead_time_rules_json: { ...draft.lead_time_rules_json, [key]: '' } }); }} className={chipBtn}>+ Add rush</button></div><label className={`${labelCls} mt-2 block sm:w-64`}>Standard lead time<input value={draft.lead_time_rules_json.standard ?? ''} onChange={(event) => patch({ lead_time_rules_json: { ...draft.lead_time_rules_json, standard: event.target.value } })} className={inputCls} placeholder="e.g. 10–12 business days" /></label><div className="mt-2 space-y-2">{draft.rush_options_json.map((rush, index) => <div key={index} className="grid gap-2 sm:grid-cols-[1fr_120px_1fr_auto]"><input placeholder="Rush option name" value={rush.label} onChange={(event) => patch({ rush_options_json: draft.rush_options_json.map((row, i) => i === index ? { ...row, label: event.target.value } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" /><input type="number" placeholder="Uplift %" value={rush.uplift_pct} onChange={(event) => patch({ rush_options_json: draft.rush_options_json.map((row, i) => i === index ? { ...row, uplift_pct: num(event.target.value) } : row) })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" /><input placeholder="Lead time for this option" value={draft.lead_time_rules_json[rush.key] ?? ''} onChange={(event) => patch({ lead_time_rules_json: { ...draft.lead_time_rules_json, [rush.key]: event.target.value } })} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" /><button onClick={() => patch({ rush_options_json: draft.rush_options_json.filter((_, i) => i !== index) })} className={chipBtn}>Remove</button></div>)}</div></section>
        </div>

        <aside className="space-y-4">
          <section className={`rounded-panel border p-4 ${health.tone === 'ready' ? 'border-success-border bg-success-bg' : 'border-warning-border bg-warning-bg'}`}><div className="flex items-center gap-2"><span className="rounded-ctl bg-accent-600 px-2 py-1 text-xs font-bold text-white">G</span><p className={`font-semibold ${health.tone === 'ready' ? 'text-success-fg' : 'text-warning-fg'}`}>Template check</p></div><p className={`mt-2 text-sm font-medium ${health.tone === 'ready' ? 'text-success-fg' : 'text-warning-fg'}`}>{health.headline}</p>{health.items.length ? <ul className={`mt-2 list-disc space-y-1 pl-5 text-sm ${health.tone === 'ready' ? 'text-success-fg' : 'text-warning-fg'}`}>{health.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}<Link href="/setu-guru" className="mt-3 inline-flex rounded-ctl border border-current/20 bg-white/50 px-2.5 py-1.5 text-xs font-semibold">Ask Setu Guru how to complete this template →</Link></section>

          <section className="rounded-panel border border-line bg-surface-1 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Test your price</p><p className="mt-1 text-sm text-content-secondary">Enter one familiar quote. Change an option to confirm the price moves as expected.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {isDimensional ? <><label className={labelCls}>Width<input type="number" value={previewInput.width_mm ?? ''} onChange={(event) => setPreviewInput((previous) => ({ ...previous, width_mm: event.target.value === '' ? null : Number(event.target.value) }))} className={inputCls} /></label><label className={labelCls}>Height<input type="number" value={previewInput.height_mm ?? ''} onChange={(event) => setPreviewInput((previous) => ({ ...previous, height_mm: event.target.value === '' ? null : Number(event.target.value) }))} className={inputCls} /></label>{draft.allowed_dimension_ranges_json.area_formula === 'pouch_gusset' ? <label className={labelCls}>Gusset<input type="number" value={previewInput.gusset_mm ?? ''} onChange={(event) => setPreviewInput((previous) => ({ ...previous, gusset_mm: event.target.value === '' ? null : Number(event.target.value) }))} className={inputCls} /></label> : null}<label className={labelCls}>Material<select value={previewInput.material_key ?? draft.material_rates_json[0]?.key ?? ''} onChange={(event) => setPreviewInput((previous) => ({ ...previous, material_key: event.target.value || null }))} className={inputCls}><option value="">Choose material</option>{draft.material_rates_json.map((material) => <option key={material.key} value={material.key}>{material.label || 'Unnamed material'}</option>)}</select></label>{(draft.adhesive_options_json ?? []).length ? <label className={labelCls}>Build option<select value={previewInput.adhesive_key ?? ''} onChange={(event) => setPreviewInput((previous) => ({ ...previous, adhesive_key: event.target.value || null }))} className={inputCls}><option value="">None</option>{(draft.adhesive_options_json ?? []).map((option) => <option key={option.key} value={option.key}>{option.label || 'Unnamed option'}</option>)}</select></label> : null}<label className={labelCls}>Colors<input type="number" value={previewInput.print_colors ?? 1} onChange={(event) => setPreviewInput((previous) => ({ ...previous, print_colors: Number(event.target.value) || 1 }))} className={inputCls} /></label>{draft.print_process === 'flexo' ? <><label className={labelCls}>Repeat length<input type="number" value={previewInput.repeat_length_mm ?? ''} onChange={(event) => setPreviewInput((previous) => ({ ...previous, repeat_length_mm: event.target.value === '' ? null : Number(event.target.value) }))} className={inputCls} /></label><label className={labelCls}>Web width<input type="number" value={previewInput.web_width_mm ?? ''} onChange={(event) => setPreviewInput((previous) => ({ ...previous, web_width_mm: event.target.value === '' ? null : Number(event.target.value) }))} className={inputCls} /></label></> : null}</> : null}
              <label className={labelCls}>Quantity<input type="number" value={previewInput.quantity ?? ''} onChange={(event) => setPreviewInput((previous) => ({ ...previous, quantity: event.target.value === '' ? null : Number(event.target.value) }))} className={inputCls} /></label>
            </div>
            {isDimensional && draft.finish_addon_rates_json.length ? <div className="mt-3 rounded-ctl border border-line bg-surface-app p-3"><p className="text-xs font-semibold text-content-primary">Finishes / add-ons to test</p><p className="mt-0.5 text-xs text-content-muted">Tick an option to include its configured charge in this preview.</p><div className="mt-2 space-y-2">{draft.finish_addon_rates_json.map((finish) => <label key={finish.key} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><input type="checkbox" checked={(previewInput.finish_keys ?? []).includes(finish.key)} onChange={() => togglePreviewFinish(finish.key)} className="h-4 w-4" /><span>{finish.label || 'Unnamed add-on'}</span></span><span className="text-xs font-semibold text-content-muted">{money(finish.rate, draft.currency)} {finish.basis === 'per_sqm' ? '/ m²' : `/ ${unitDisplay}`}</span></label>)}</div></div> : null}

            {preview.ok ? <div className="mt-3"><ul className="divide-y divide-line text-sm">{preview.breakdown.map((line) => <li key={line.key} className="flex items-center justify-between py-1.5"><span className="text-content-secondary">{line.label}</span><span className={`font-semibold ${line.amount < 0 ? 'text-success-fg' : 'text-content-primary'}`}>{line.amount < 0 ? '−' : ''}{money(Math.abs(line.amount), preview.currency)}</span></li>)}</ul><div className="mt-2 rounded-ctl bg-surface-2 px-3 py-2"><p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Price per {unitDisplay}</p><p className="text-base font-bold text-content-primary">{money(preview.unit_price, preview.currency)}</p><p className="mt-1 text-lg font-bold text-content-primary">Total: {money(preview.total_price, preview.currency)}</p>{preview.lead_time ? <p className="text-xs text-content-muted">Lead time: {preview.lead_time}</p> : null}</div></div> : <ul className="mt-3 space-y-1">{preview.validation_errors.map((error) => <li key={error} className="rounded-ctl bg-warning-bg px-3 py-2 text-sm font-medium text-warning-fg">{error}</li>)}</ul>}
          </section>
        </aside>
      </div>
    </div>
  );
}
