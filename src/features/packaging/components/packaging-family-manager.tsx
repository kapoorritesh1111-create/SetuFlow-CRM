'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import type { PackagingPricingTemplate, PackagingQuoteTimeInput, PackagingServiceFamily } from '@/lib/packaging/types';
import { FAMILY_ICON_OPTIONS, getFamilyVisual } from '@/lib/packaging/family-visuals';
import { SetuIcon } from '@/components/ui/setu-icon';
import { savePackagingFamily } from '@/features/packaging/server/actions';
import { PageHeader } from '@/components/ui/page-header';
import { workspacePrimaryButtonClass } from '@/components/ui/workspace-surfaces';

/**
 * S27-STARK — Service Family manager. This is the admin surface that was
 * entirely missing: templates were editable, but the families they belong to
 * were only ever set up via SQL/seed data, with no way for the client to see
 * or manage them, and no visible link between a template and its family.
 * This page also answers "how do we know a template and family are
 * connected" directly: each family shows every template linked to it.
 */

type Draft = PackagingServiceFamily;

const NEW_FAMILY: Draft = {
  id: '',
  organization_id: '',
  slug: '',
  name: '',
  description: '',
  pricing_mode: 'dimensional',
  quote_time_inputs: [],
  default_unit: 'pcs',
  default_lead_time: '',
  sort_order: 100,
  is_active: true,
  icon_key: 'box',
};

const inputCls = 'mt-1 w-full rounded-ctl border border-line bg-surface-app px-3 py-2 text-sm text-content-primary';
const labelCls = 'text-xs font-semibold text-content-primary';
const chipBtn = 'rounded-ctl border border-line bg-surface-app px-2.5 py-1.5 text-xs font-semibold text-content-secondary';

export default function PackagingFamilyManager({ families, templates }: { families: PackagingServiceFamily[]; templates: PackagingPricingTemplate[] }) {
  const [selectedId, setSelectedId] = useState<string>(families[0]?.id ?? 'new');
  const [draft, setDraft] = useState<Draft>(families[0] ?? NEW_FAMILY);
  const [saving, startSaving] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const linkedTemplates = useMemo(() => templates.filter((template) => template.family_id === draft.id), [templates, draft.id]);
  const visual = getFamilyVisual(draft.slug || 'x', draft.icon_key);

  const select = (id: string) => {
    setSelectedId(id);
    setFeedback(null);
    if (id === 'new') { setDraft(NEW_FAMILY); return; }
    const found = families.find((family) => family.id === id);
    if (found) setDraft(JSON.parse(JSON.stringify(found)));
  };

  const patch = (partial: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...partial }));

  const addInput = () => patch({ quote_time_inputs: [...draft.quote_time_inputs, { key: `field_${draft.quote_time_inputs.length + 1}`, label: '' }] });
  const updateInput = (index: number, field: keyof PackagingQuoteTimeInput, value: string) =>
    patch({ quote_time_inputs: draft.quote_time_inputs.map((item, i) => (i === index ? { ...item, [field]: value } : item)) });
  const removeInput = (index: number) => patch({ quote_time_inputs: draft.quote_time_inputs.filter((_, i) => i !== index) });

  const handleSave = () => {
    setFeedback(null);
    startSaving(async () => {
      const response = await savePackagingFamily({ ...draft, id: draft.id || null });
      if (!response.ok) { setFeedback({ tone: 'error', text: response.error ?? 'Could not save this family.' }); return; }
      setFeedback({ tone: 'success', text: 'Family saved.' });
      if (response.familyId && !draft.id) setDraft((previous) => ({ ...previous, id: response.familyId! }));
    });
  };

  return (
    <div className="space-y-4 pb-16">
      <PageHeader
        eyebrow="Packaging Setup"
        title="Service Families"
        description="What buyers browse in the catalog. Each family holds one or more pricing templates — set those up in Pricing Templates once the family exists."
        meta={[`${families.length} famil${families.length === 1 ? 'y' : 'ies'}`, `${families.filter((family) => family.is_active).length} active`]}
      />

      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving} className={`rounded-ctl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${workspacePrimaryButtonClass}`}>{saving ? 'Saving…' : 'Save family'}</button>
      </div>

      {feedback ? (
        <p className={`rounded-ctl px-3 py-2 text-sm font-medium ${feedback.tone === 'success' ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>{feedback.text}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {families.map((family) => {
          const familyVisual = getFamilyVisual(family.slug, family.icon_key);
          return (
            <button key={family.id} onClick={() => select(family.id)} className={`flex items-center gap-2 rounded-ctl border px-3 py-2 text-sm font-semibold transition ${selectedId === family.id ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line bg-surface-1 text-content-secondary hover:bg-surface-2'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full ${familyVisual.bg} ${familyVisual.fg}`}><SetuIcon name={familyVisual.icon} className="h-3 w-3" /></span>
              {family.name}{family.is_active ? '' : ' (inactive)'}
            </button>
          );
        })}
        <button onClick={() => select('new')} className={`rounded-ctl border px-3 py-2 text-sm font-semibold transition ${selectedId === 'new' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line bg-surface-1 text-content-secondary hover:bg-surface-2'}`}>+ New family</button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <section className="rounded-card border border-line bg-surface-1 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Basics</p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <label className={labelCls}>Name<input value={draft.name} onChange={(event) => patch({ name: event.target.value })} className={inputCls} /></label>
              <label className={labelCls}>Slug (used in the catalog URL)<input value={draft.slug} onChange={(event) => patch({ slug: event.target.value })} className={inputCls} /></label>
              <label className={labelCls}>Pricing mode
                <select value={draft.pricing_mode} onChange={(event) => patch({ pricing_mode: event.target.value as 'dimensional' | 'service' })} className={inputCls}>
                  <option value="dimensional">Dimensional (width/height driven)</option>
                  <option value="service">Service (no dimensions)</option>
                </select>
              </label>
              <label className={labelCls}>Default unit<input value={draft.default_unit} onChange={(event) => patch({ default_unit: event.target.value })} className={inputCls} /></label>
              <label className={labelCls}>Default lead time<input value={draft.default_lead_time ?? ''} onChange={(event) => patch({ default_lead_time: event.target.value })} placeholder="e.g. 7-9 business days" className={inputCls} /></label>
              <label className={labelCls}>Sort order (lower shows first)<input type="number" value={draft.sort_order} onChange={(event) => patch({ sort_order: Number(event.target.value) || 0 })} className={inputCls} /></label>
              <label className="mt-1 flex items-center gap-2 text-sm font-semibold text-content-primary">
                <input type="checkbox" checked={draft.is_active} onChange={(event) => patch({ is_active: event.target.checked })} className="h-4 w-4" /> Active (visible in catalog)
              </label>
            </div>
            <label className={`${labelCls} mt-3 block`}>Description<input value={draft.description ?? ''} onChange={(event) => patch({ description: event.target.value })} className={inputCls} /></label>
          </section>

          <section className="rounded-card border border-line bg-surface-1 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Icon</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {FAMILY_ICON_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => patch({ icon_key: option.key })}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${option.bg} ${option.fg} ${draft.icon_key === option.key ? 'border-brand-500' : 'border-transparent'}`}
                  title={option.label}
                >
                  <SetuIcon name={option.key} className="h-4.5 w-4.5" />
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-card border border-line bg-surface-1 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Quote-time inputs</p>
              <button onClick={addInput} className={chipBtn}>+ Add field</button>
            </div>
            <p className="mt-1 text-xs text-content-muted">Shown to buyers as "What we'll capture at quote time" on the catalog page for this family. Informational only — doesn't change pricing logic.</p>
            <div className="mt-2 space-y-2">
              {draft.quote_time_inputs.map((input, index) => (
                <div key={index} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input placeholder="key" value={input.key} onChange={(event) => updateInput(index, 'key', event.target.value)} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                  <input placeholder="Label shown to buyers" value={input.label} onChange={(event) => updateInput(index, 'label', event.target.value)} className="rounded-ctl border border-line bg-surface-app px-2 py-1.5 text-sm" />
                  <button onClick={() => removeInput(index)} className={chipBtn}>Remove</button>
                </div>
              ))}
              {!draft.quote_time_inputs.length ? <p className="text-sm text-content-muted">No fields listed yet.</p> : null}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-panel border border-line bg-surface-1 p-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-full ${visual.bg} ${visual.fg}`}><SetuIcon name={visual.icon} className="h-5 w-5" /></span>
              <div>
                <p className="font-bold text-content-primary">{draft.name || 'New family'}</p>
                <p className="text-xs text-content-muted">Catalog preview</p>
              </div>
            </div>
          </section>

          <section className="rounded-panel border border-line bg-surface-1 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Templates linked to this family</p>
            {draft.id ? (
              linkedTemplates.length ? (
                <ul className="mt-2 space-y-2">
                  {linkedTemplates.map((template) => (
                    <li key={template.id} className="flex items-center justify-between rounded-ctl border border-line bg-surface-app p-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-content-primary">{template.name}</p>
                        <p className="text-xs text-content-muted">{template.is_active ? 'Active' : 'Inactive'} · {template.print_process === 'flexo' ? 'Flexo' : 'Digital'}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 rounded-ctl bg-warning-bg px-3 py-2 text-sm font-medium text-warning-fg">No pricing template yet — this family won't be quotable until one is added.</p>
              )
            ) : (
              <p className="mt-2 text-sm text-content-muted">Save this family first, then add a template for it.</p>
            )}
            <Link href="/admin/packaging-templates" className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline">
              Manage pricing templates →
            </Link>
          </section>
        </aside>
      </div>
    </div>
  );
}
