'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { PackagingPricingTemplate, PackagingServiceFamily } from '@/lib/packaging/types';
import { analyzePackagingInquiry } from '@/lib/setu-guru/packaging-guidance';
import { getFamilyVisual } from '@/lib/packaging/family-visuals';
import { estimateStartingPrice } from '@/lib/packaging/pricing-engine';
import { SetuIcon } from '@/components/ui/setu-icon';

/**
 * S24-SPEN-202 — Packaging Catalog.
 * Organizes service families, not size SKUs. Dimensions, materials, and
 * quantities are entered during quote creation; the Catalog only helps pick
 * the right family and previews what will be captured at quote time.
 */

type Props = {
  families: PackagingServiceFamily[];
  templates: PackagingPricingTemplate[];
  showTrialBadge?: boolean;
};

const PRICING_MODE_LABEL: Record<string, string> = {
  dimensional: 'Dimensional pricing',
  service: 'Service pricing',
};

export default function PackagingCatalog({ families, templates, showTrialBadge }: Props) {
  const [selectedSlug, setSelectedSlug] = useState<string>(families[0]?.slug ?? '');
  const [compareOpen, setCompareOpen] = useState(false);
  const [inquiry, setInquiry] = useState('');

  const selected = useMemo(
    () => families.find((family) => family.slug === selectedSlug) ?? families[0] ?? null,
    [families, selectedSlug],
  );
  const selectedTemplates = useMemo(
    () => (selected ? templates.filter((template) => template.family_id === selected.id && template.is_active) : []),
    [templates, selected],
  );
  const recommendation = useMemo(() => analyzePackagingInquiry(inquiry, families), [inquiry, families]);

  const startingPrices = useMemo(() => {
    const map = new Map<string, { unitPrice: number; currency: string } | null>();
    for (const family of families) {
      const template = templates.find((item) => item.family_id === family.id && item.is_active);
      map.set(family.slug, template ? estimateStartingPrice(template) : null);
    }
    return map;
  }, [families, templates]);

  if (!families.length) {
    return (
      <section className="rounded-panel border border-line bg-surface-1 p-8 text-center">
        <h1 className="text-xl font-bold text-content-primary">Packaging Catalog</h1>
        <p className="mt-2 text-sm text-content-secondary">No packaging service families are configured yet. Ask an admin to set up families and pricing templates.</p>
        <Link href="/admin/packaging-templates" className="mt-4 inline-flex rounded-ctl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Open Pricing Templates</Link>
      </section>
    );
  }

  return (
    <div className="space-y-4 pb-16">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-content-primary">Packaging Catalog</h1>
            {showTrialBadge ? <span className="rounded-full bg-info-bg px-3 py-1 text-xs font-semibold text-info-fg">Guided trial</span> : null}
          </div>
          <p className="mt-1 text-sm text-content-secondary">Explore packaging service families. Configure custom size and options during quoting — no fixed size SKUs.</p>
        </div>
      </section>

      <section className="rounded-panel border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-bold text-content-primary">How Packaging Pricing Works</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ['1', 'Choose family', 'Pick the packaging service family.'],
            ['2', 'Enter custom size / options', 'Enter dimensions and select materials, finishes, etc. during quoting.'],
            ['3', 'System calculates price', 'Price is calculated from the pricing template rules based on your inputs.'],
          ].map(([step, title, body]) => (
            <div key={step} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{step}</span>
              <div>
                <p className="text-sm font-semibold text-content-primary">{title}</p>
                <p className="text-sm text-content-secondary">{body}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-ctl bg-info-bg px-3 py-2 text-sm font-medium text-info-fg">No size-SKU explosion — dimensions are entered during quoting.</p>
      </section>

      <section className="rounded-panel border border-line bg-surface-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-content-primary">Not sure which family fits? Paste the buyer inquiry.</p>
        </div>
        <textarea
          value={inquiry}
          onChange={(event) => setInquiry(event.target.value)}
          placeholder="e.g. Need 10,000 zipper pouches for coffee, 180 x 260 mm, matte finish"
          className="mt-2 min-h-16 w-full rounded-ctl border border-line bg-surface-app px-3 py-2 text-sm text-content-primary"
        />
        {recommendation.family && recommendation.guidance ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-card border border-success-border bg-success-bg p-3">
            <div>
              <p className="text-sm font-semibold text-success-fg">{recommendation.guidance.headline} Suggested family: {recommendation.family.name}.</p>
              {recommendation.guidance.items.map((item) => (
                <p key={item} className="text-sm text-success-fg">{item}</p>
              ))}
            </div>
            <button
              onClick={() => setSelectedSlug(recommendation.family!.slug)}
              className="rounded-ctl bg-brand-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Select {recommendation.family.name}
            </button>
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-content-primary">Browse by Service Family</h2>
              <p className="text-sm text-content-secondary">All pricing is rule-based and calculated at quote time.</p>
            </div>
            <button onClick={() => setCompareOpen((open) => !open)} className="rounded-ctl border border-line bg-surface-1 px-3 py-2 text-sm font-semibold text-content-primary">
              {compareOpen ? 'Hide comparison' : 'Compare families'}
            </button>
          </div>

          {compareOpen ? (
            <div className="mb-3 overflow-x-auto rounded-card border border-line bg-surface-1">
              <table className="w-full min-w-[560px] text-sm">
                <thead className="text-left text-xs font-semibold uppercase tracking-wide text-content-muted">
                  <tr><th className="p-3">Family</th><th className="p-3">Pricing mode</th><th className="p-3">Unit</th><th className="p-3">Lead time</th><th className="p-3">Templates</th></tr>
                </thead>
                <tbody>
                  {families.map((family) => (
                    <tr key={family.id} className="border-t border-line">
                      <td className="p-3 font-semibold text-content-primary">{family.name}</td>
                      <td className="p-3 text-content-secondary">{PRICING_MODE_LABEL[family.pricing_mode]}</td>
                      <td className="p-3 text-content-secondary">{family.default_unit}</td>
                      <td className="p-3 text-content-secondary">{family.default_lead_time ?? '—'}</td>
                      <td className="p-3 text-content-secondary">{templates.filter((template) => template.family_id === family.id && template.is_active).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {families.map((family) => {
              const active = family.slug === selected?.slug;
              const visual = getFamilyVisual(family.slug);
              const price = startingPrices.get(family.slug);
              return (
                <div
                  key={family.id}
                  className={`rounded-card border p-4 transition ${active ? 'border-brand-400 bg-brand-50 shadow-sm' : 'border-line bg-surface-1 hover:border-brand-200'}`}
                >
                  <button onClick={() => setSelectedSlug(family.slug)} className="block w-full text-left">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${visual.bg} ${visual.fg}`}>
                        <SetuIcon name={visual.icon} className="h-4.5 w-4.5" />
                      </span>
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-content-secondary">{PRICING_MODE_LABEL[family.pricing_mode]}</span>
                    </div>
                    <p className="mt-2 font-semibold text-content-primary">{family.name}</p>
                    <p className="mt-1 text-sm text-content-secondary">{family.description}</p>
                  </button>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-content-muted">
                      {price ? `From ${price.currency} ${price.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${family.default_unit}` : 'Pricing set at quote time'}
                    </p>
                    <Link href={`/products/${family.slug}`} className="text-xs font-semibold text-brand-700 hover:underline">
                      View details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {selected ? (
          <aside className="h-fit rounded-panel border border-line bg-surface-1 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Selected family</p>
            <div className="mt-2 flex items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getFamilyVisual(selected.slug).bg} ${getFamilyVisual(selected.slug).fg}`}>
                <SetuIcon name={getFamilyVisual(selected.slug).icon} className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-content-primary">{selected.name}</h3>
                  <span className="rounded-full bg-info-bg px-2 py-0.5 text-[11px] font-semibold text-info-fg">{PRICING_MODE_LABEL[selected.pricing_mode]}</span>
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-content-secondary">{selected.description}</p>
            <Link href={`/products/${selected.slug}`} className="mt-1 inline-block text-sm font-semibold text-brand-700 hover:underline">
              View full category page →
            </Link>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-content-muted">What we&apos;ll capture at quote time</p>
            <ul className="mt-2 space-y-1.5">
              {selected.quote_time_inputs.map((input) => (
                <li key={input.key} className="flex items-center gap-2 text-sm text-content-primary">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success-solid text-[10px] font-bold text-white">✓</span>
                  {input.label}
                </li>
              ))}
            </ul>

            {selectedTemplates.length ? (
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Active pricing templates</p>
                <ul className="mt-1 space-y-1 text-sm text-content-secondary">
                  {selectedTemplates.map((template) => <li key={template.id}>{template.name}</li>)}
                </ul>
              </div>
            ) : (
              <p className="mt-4 rounded-ctl bg-warning-bg px-3 py-2 text-sm font-medium text-warning-fg">No active pricing template yet — an admin should configure one before quoting this family.</p>
            )}

            <p className="mt-4 rounded-ctl bg-info-bg px-3 py-2 text-sm font-medium text-info-fg">Dimensions and options are configured during quoting. We do not create fixed size SKUs.</p>

            <Link
              href={`/leads?packagingFamily=${selected.slug}`}
              className="mt-4 flex w-full items-center justify-center rounded-ctl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
            >
              Create quote line →
            </Link>
            <p className="mt-2 text-center text-xs text-content-muted">Pick a buyer lead, then add a packaging line in the Quote Builder.</p>
          </aside>
        ) : null}
      </section>

      <p className="text-sm text-content-muted">Prices are calculated from your inputs and live pricing rules. Saved quote lines keep their calculation snapshot.</p>
    </div>
  );
}
