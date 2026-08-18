'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import type { PackagingReferenceCategory, PackagingReferenceItem } from '@/lib/packaging/types';
import { REFERENCE_CATEGORY_LABELS } from '@/lib/packaging/types';
import { SetuIcon } from '@/components/ui/setu-icon';
import { EmptyState } from '@/components/ui/empty-state';
import {
  workspacePanelClass,
  workspaceInsetClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
  workspaceFieldSurfaceClass,
} from '@/components/ui/workspace-surfaces';
import { savePackagingReferenceItem, seedPackagingReferenceDefaults, setPackagingReferenceItemActive } from '@/features/packaging/server/actions';

/**
 * S27-STARK-REFLIB-01 — Packaging Reference Library.
 *
 * The customer's own list of materials, finishes, and service items —
 * separate from (but pre-populated from) SETU Flow's starter catalog.
 * "Set up starter library" is the initial-setup action; "+ Add" covers
 * anything the customer needs beyond it. This library feeds the picker in
 * Packaging Pricing Templates so materials/finishes/service items stop
 * being free-typed per template and become a controlled, reusable list.
 */

const CATEGORIES: PackagingReferenceCategory[] = ['material', 'finish', 'service_item'];

const CATEGORY_ICON: Record<PackagingReferenceCategory, 'layers' | 'sparkles' | 'workflow'> = {
  material: 'layers',
  finish: 'sparkles',
  service_item: 'workflow',
};

const CATEGORY_HINT: Record<PackagingReferenceCategory, string> = {
  material: 'Substrates and structures priced per m² on dimensional templates — e.g. BOPP White, PET / PE laminate.',
  finish: 'Add-on treatments and functional features — e.g. Matte Lamination, Zipper, Valve.',
  service_item: 'Line items priced per job, per design, or per piece on service-mode templates — e.g. Artwork Check, Digital Proof.',
};

type Draft = { id: string | null; category: PackagingReferenceCategory; name: string; description: string; default_thickness: string; default_unit_hint: string; swatch_color: string };

const EMPTY_DRAFT = (category: PackagingReferenceCategory): Draft => ({ id: null, category, name: '', description: '', default_thickness: '', default_unit_hint: '', swatch_color: '' });

export default function PackagingReferenceLibraryManager({ items }: { items: PackagingReferenceItem[] }) {
  const [activeCategory, setActiveCategory] = useState<PackagingReferenceCategory>('material');
  const [showInactive, setShowInactive] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, startSaving] = useTransition();
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<PackagingReferenceCategory, PackagingReferenceItem[]>(CATEGORIES.map((category) => [category, []]));
    for (const item of items) map.get(item.category)?.push(item);
    return map;
  }, [items]);

  const visibleItems = (grouped.get(activeCategory) ?? []).filter((item) => showInactive || item.is_active);
  const isEmptyLibrary = items.length === 0;

  const handleSeed = () => {
    setFeedback(null);
    startSaving(async () => {
      const response = await seedPackagingReferenceDefaults();
      if (!response.ok) { setFeedback({ tone: 'error', text: response.error ?? 'Could not set up the starter library.' }); return; }
      setFeedback({ tone: 'success', text: response.addedCount ? `Added ${response.addedCount} starter items.` : 'Starter library is already up to date.' });
    });
  };

  const handleSave = () => {
    if (!draft) return;
    setFeedback(null);
    startSaving(async () => {
      const response = await savePackagingReferenceItem({
        id: draft.id,
        category: draft.category,
        name: draft.name,
        description: draft.description || null,
        default_thickness: draft.default_thickness || null,
        default_unit_hint: draft.default_unit_hint || null,
        swatch_color: draft.swatch_color || null,
      });
      if (!response.ok) { setFeedback({ tone: 'error', text: response.error ?? 'Could not save this item.' }); return; }
      setFeedback({ tone: 'success', text: draft.id ? 'Item updated.' : 'Item added to the library.' });
      setDraft(null);
    });
  };

  const toggleActive = (item: PackagingReferenceItem) => {
    setFeedback(null);
    startSaving(async () => {
      const response = await setPackagingReferenceItemActive(item.id, !item.is_active);
      if (!response.ok) setFeedback({ tone: 'error', text: response.error ?? 'Could not update this item.' });
    });
  };

  return (
    <div className="space-y-4 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-card border border-line bg-surface-1 p-4">
        <div>
          <p className="text-sm text-content-secondary">Your own list of materials, finishes, and service items — feeds the picker in Pricing Templates so nothing has to be re-typed per template.</p>
          <p className="mt-1 text-xs font-semibold text-content-muted">{items.filter((item) => item.is_active).length} active items · {isEmptyLibrary ? 'Not set up yet' : 'Set up'}</p>
        </div>
        <Link href="/admin/packaging-templates" className="shrink-0 rounded-ctl border border-line bg-surface-app px-3 py-2 text-xs font-semibold text-content-secondary hover:bg-surface-2">← Pricing Templates</Link>
      </div>

      {feedback ? (
        <p className={`rounded-ctl px-3 py-2 text-sm font-medium ${feedback.tone === 'success' ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg'}`}>{feedback.text}</p>
      ) : null}

      {isEmptyLibrary ? (
        <EmptyState
          icon="products"
          title="Set up your reference library"
          description="Start from SETU Flow's starter catalog — common materials, finishes, and service items for packaging work — then add anything specific to your shop. This is a one-time setup; you can keep adding items any time after."
        />
      ) : null}
      {isEmptyLibrary ? (
        <div className="flex justify-center">
          <button onClick={handleSeed} disabled={saving} className={`rounded-ctl px-5 py-2.5 text-sm font-semibold text-white shadow-card disabled:opacity-50 ${workspacePrimaryButtonClass}`}>
            {saving ? 'Setting up…' : 'Set up starter library'}
          </button>
        </div>
      ) : null}

      {!isEmptyLibrary ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => {
                const count = (grouped.get(category) ?? []).filter((item) => item.is_active).length;
                return (
                  <button
                    key={category}
                    onClick={() => { setActiveCategory(category); setDraft(null); }}
                    className={`flex items-center gap-2 rounded-ctl border px-3 py-2 text-sm font-semibold transition ${activeCategory === category ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-line bg-surface-1 text-content-secondary hover:bg-surface-2'}`}
                  >
                    <SetuIcon name={CATEGORY_ICON[category]} className="h-4 w-4" />
                    {REFERENCE_CATEGORY_LABELS[category]}
                    <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-xs font-bold text-content-muted">{count}</span>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-content-secondary">
                <input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} className="h-3.5 w-3.5" /> Show inactive
              </label>
              <button
                onClick={() => setDraft(EMPTY_DRAFT(activeCategory))}
                className={`rounded-ctl px-3 py-2 text-sm font-semibold ${workspaceSecondaryButtonClass}`}
              >
                + Add {REFERENCE_CATEGORY_LABELS[activeCategory].toLowerCase().replace(/s$/, '')}
              </button>
            </div>
          </div>

          <p className="text-xs text-content-muted">{CATEGORY_HINT[activeCategory]}</p>

          <div className={`${workspacePanelClass} overflow-hidden`}>
            {draft && draft.category === activeCategory ? (
              <div className={`${workspaceInsetClass} m-4 space-y-3 p-4`}>
                <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">{draft.id ? 'Edit item' : `New ${REFERENCE_CATEGORY_LABELS[activeCategory].toLowerCase().replace(/s$/, '')}`}</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-semibold text-content-primary">
                    Name
                    <input
                      value={draft.name}
                      onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                      placeholder="e.g. BOPP White"
                      className={`mt-1 w-full rounded-ctl border px-3 py-2 text-sm ${workspaceFieldSurfaceClass}`}
                      autoFocus
                    />
                  </label>
                  {activeCategory === 'material' ? (
                    <label className="text-xs font-semibold text-content-primary">
                      Thickness / weight (optional)
                      <input
                        value={draft.default_thickness}
                        onChange={(event) => setDraft({ ...draft, default_thickness: event.target.value })}
                        placeholder="e.g. 60 micron"
                        className={`mt-1 w-full rounded-ctl border px-3 py-2 text-sm ${workspaceFieldSurfaceClass}`}
                      />
                    </label>
                  ) : (
                    <label className="text-xs font-semibold text-content-primary">
                      Typical pricing basis (optional)
                      <select
                        value={draft.default_unit_hint}
                        onChange={(event) => setDraft({ ...draft, default_unit_hint: event.target.value })}
                        className={`mt-1 w-full rounded-ctl border px-3 py-2 text-sm ${workspaceFieldSurfaceClass}`}
                      >
                        <option value="">— No suggestion —</option>
                        <option value="per_sqm">per m²</option>
                        <option value="per_unit">per piece</option>
                        <option value="per_job">per job</option>
                        <option value="per_design">per design</option>
                      </select>
                    </label>
                  )}
                </div>
                <label className="block text-xs font-semibold text-content-primary">
                  Description (optional, for other admins)
                  <input
                    value={draft.description}
                    onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                    className={`mt-1 w-full rounded-ctl border px-3 py-2 text-sm ${workspaceFieldSurfaceClass}`}
                  />
                </label>
                {activeCategory !== 'service_item' ? (
                  <label className="flex items-center gap-3 text-xs font-semibold text-content-primary">
                    Swatch color (optional)
                    <input
                      type="color"
                      value={draft.swatch_color || '#E2E8F0'}
                      onChange={(event) => setDraft({ ...draft, swatch_color: event.target.value })}
                      className="h-8 w-12 cursor-pointer rounded-ctl border border-line bg-transparent p-0.5"
                    />
                    {draft.swatch_color ? (
                      <button type="button" onClick={() => setDraft({ ...draft, swatch_color: '' })} className="text-xs font-semibold text-content-muted underline">Clear</button>
                    ) : (
                      <span className="text-content-muted">Shown as a small dot next to this item — helpful for quickly telling similar materials/finishes apart.</span>
                    )}
                  </label>
                ) : null}
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={saving || !draft.name.trim()} className={`rounded-ctl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${workspacePrimaryButtonClass}`}>
                    {saving ? 'Saving…' : 'Save item'}
                  </button>
                  <button onClick={() => setDraft(null)} className={`rounded-ctl px-4 py-2 text-sm font-semibold ${workspaceSecondaryButtonClass}`}>Cancel</button>
                </div>
              </div>
            ) : null}

            {visibleItems.length ? (
              <ul className="divide-y divide-line">
                {visibleItems.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {item.swatch_color ? (
                          <span
                            title={item.swatch_color}
                            className="h-4 w-4 shrink-0 rounded-full border border-black/10"
                            style={{ backgroundColor: item.swatch_color }}
                          />
                        ) : null}
                        <p className="font-semibold text-content-primary">{item.name}</p>
                        {!item.is_active ? <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-caption uppercase text-content-muted">Inactive</span> : null}
                        {item.source === 'default_seed' ? <span className="rounded-full border border-info-border bg-info-bg px-2 py-0.5 text-caption uppercase text-info-fg">Starter</span> : null}
                        {item.source === 'migrated' ? <span className="rounded-full border border-line bg-surface-2 px-2 py-0.5 text-caption uppercase text-content-muted">From existing templates</span> : null}
                      </div>
                      <p className="mt-0.5 text-xs text-content-muted">
                        {[item.default_thickness, item.default_unit_hint?.replace('_', ' '), item.description].filter(Boolean).join(' · ') || 'No additional detail'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button onClick={() => setDraft({ id: item.id, category: item.category, name: item.name, description: item.description ?? '', default_thickness: item.default_thickness ?? '', default_unit_hint: item.default_unit_hint ?? '', swatch_color: item.swatch_color ?? '' })} className={`rounded-ctl px-2.5 py-1.5 text-xs font-semibold ${workspaceSecondaryButtonClass}`}>
                        Edit
                      </button>
                      <button onClick={() => toggleActive(item)} disabled={saving} className={`rounded-ctl px-2.5 py-1.5 text-xs font-semibold disabled:opacity-50 ${workspaceSecondaryButtonClass}`}>
                        {item.is_active ? 'Deactivate' : 'Reactivate'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-content-muted">No {showInactive ? '' : 'active '}{REFERENCE_CATEGORY_LABELS[activeCategory].toLowerCase()} yet.</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
