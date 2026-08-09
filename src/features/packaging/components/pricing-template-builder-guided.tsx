'use client';

import { useEffect, useMemo } from 'react';
import type {
  PackagingPricingTemplate,
  PackagingReferenceItem,
  PackagingServiceFamily,
} from '@/lib/packaging/types';
import PricingTemplateBuilder from '@/features/packaging/components/pricing-template-builder';

type Props = {
  families: PackagingServiceFamily[];
  templates: PackagingPricingTemplate[];
  referenceItems: PackagingReferenceItem[];
};

const STARTER_SETUP_CHARGES = [
  { key: 'prepress_proof', label: 'Pre-press / proof preparation', amount: 0, basis: 'per_job' as const, required: false },
  { key: 'artwork_adjustment', label: 'Artwork adjustment / correction', amount: 0, basis: 'per_job' as const, required: false },
  { key: 'extra_design', label: 'Extra design / SKU', amount: 0, basis: 'per_extra_design' as const, required: false },
];

function starterTemplate(families: PackagingServiceFamily[]): PackagingPricingTemplate {
  return {
    id: '',
    organization_id: '',
    family_id: families[0]?.id ?? null,
    slug: '',
    name: '',
    description: '',
    currency: 'INR',
    is_active: false,
    calculation_version: 1,
    allowed_dimension_ranges_json: {
      area_formula: 'label_single',
      width_mm: { min: 10, max: 500 },
      height_mm: { min: 10, max: 700 },
    },
    material_rates_json: [{ key: 'mat_1', label: '', thickness: '', rate_per_sqm: 0 }],
    print_rules_json: { basis: 'color_multiplier', tiers: [{ max_colors: 1, multiplier: 1 }] },
    finish_addon_rates_json: [],
    moq_tiers_json: { moq: 0, tiers: [] },
    setup_charges_json: STARTER_SETUP_CHARGES,
    rush_options_json: [],
    lead_time_rules_json: { standard: '' },
    waste_factor_pct: 0,
    adhesive_options_json: [],
    print_process: 'digital',
    flexo_rules_json: null,
  };
}

function normalizedCurrency(value: string | null | undefined) {
  const code = (value || 'INR').trim().toUpperCase();
  return code || 'INR';
}

function formatMoney(value: string, currency: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return `${currency} 0.00`;
  return `${currency} ${parsed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PricingTemplateBuilderGuided(props: Props) {
  const effectiveTemplates = useMemo(
    () => (props.templates.length ? props.templates : [starterTemplate(props.families)]),
    [props.templates, props.families],
  );

  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.pricing-template-clarity');
    if (!root) return;

    const findSection = (startsWith: string) => Array.from(root.querySelectorAll<HTMLElement>('section')).find((section) => {
      const heading = section.querySelector('p');
      return heading?.textContent?.trim().toLowerCase().startsWith(startsWith.toLowerCase());
    });

    const currencyInput = Array.from(root.querySelectorAll<HTMLLabelElement>('label')).find((label) => label.textContent?.trim().startsWith('Currency'))?.querySelector<HTMLInputElement>('input');
    const getCurrency = () => normalizedCurrency(currencyInput?.value || effectiveTemplates[0]?.currency || 'INR');

    const makeHeader = (section: HTMLElement | undefined, className: string, labels: string[], columns: string) => {
      if (!section) return;
      section.classList.add(className);
      const list = Array.from(section.querySelectorAll<HTMLElement>('div')).find((element) => element.classList.contains('space-y-2'));
      if (!list) return;

      Array.from(list.children).forEach((child) => {
        if (child instanceof HTMLElement && child.querySelector("input[placeholder='key']")) child.classList.add('setu-data-row');
      });

      if (!list.querySelector(':scope > .setu-column-head')) {
        const header = document.createElement('div');
        header.className = 'setu-column-head';
        header.style.gridTemplateColumns = columns;
        labels.forEach((label) => {
          const cell = document.createElement('span');
          cell.textContent = label;
          header.appendChild(cell);
        });
        list.prepend(header);
      }
    };

    const decorateCurrency = (section: HTMLElement | undefined, suffix = '') => {
      if (!section) return;
      const rows = Array.from(section.querySelectorAll<HTMLElement>('.setu-data-row'));
      rows.forEach((row) => {
        const numericInputs = Array.from(row.querySelectorAll<HTMLInputElement>("input[type='number']"));
        const input = numericInputs[numericInputs.length - 1];
        if (!input) return;
        input.setAttribute('inputmode', 'decimal');
        input.setAttribute('aria-label', suffix ? `Rate (${getCurrency()} ${suffix})` : `Amount (${getCurrency()})`);
        let readout = row.querySelector<HTMLElement>('.setu-money-readout');
        if (!readout) {
          readout = document.createElement('span');
          readout.className = 'setu-money-readout';
          input.insertAdjacentElement('afterend', readout);
        }
        const refresh = () => {
          if (!readout) return;
          readout.textContent = `${formatMoney(input.value, getCurrency())}${suffix ? ` ${suffix}` : ''}`;
        };
        refresh();
        if (!input.dataset.setuCurrencyBound) {
          input.dataset.setuCurrencyBound = 'true';
          input.addEventListener('input', refresh);
          input.addEventListener('blur', refresh);
        }
      });
    };

    const decorate = () => {
      root.querySelectorAll<HTMLInputElement>("input[placeholder='key']").forEach((input) => {
        input.style.display = 'none';
        input.setAttribute('aria-hidden', 'true');
        input.tabIndex = -1;
      });

      const materials = findSection('materials');
      const finishes = findSection('finish & add-on rates');
      const adhesives = findSection('adhesive / build options');
      const setup = findSection('setup / pre-press charges');
      const rush = findSection('rush options & lead times');

      makeHeader(materials, 'setu-material-section', ['Material / Structure', 'Thickness', `Rate (${getCurrency()} / m²)`, 'Library', ''], 'minmax(240px,1.5fr) minmax(180px,1fr) minmax(150px,.65fr) 70px 80px');
      makeHeader(finishes, 'setu-finish-section', ['Finish / Add-on', 'Charge basis', `Rate (${getCurrency()})`, 'Library', ''], 'minmax(240px,1.5fr) 130px 150px 70px 80px');
      makeHeader(adhesives, 'setu-adhesive-section', ['Build option shown at quote time', ''], 'minmax(260px,1fr) 80px');
      makeHeader(setup, 'setu-setup-section', ['Setup / Pre-press charge', `Amount (${getCurrency()})`, 'Charge basis', 'Required', ''], 'minmax(260px,1.5fr) 160px 170px 110px 80px');
      makeHeader(rush, 'setu-rush-section', ['Rush option', 'Uplift %', 'Lead time', ''], 'minmax(220px,1.2fr) 130px minmax(220px,1fr) 80px');

      decorateCurrency(materials, '/ m²');
      decorateCurrency(finishes);
      decorateCurrency(setup);

      const countLine = Array.from(root.querySelectorAll<HTMLElement>('p')).find((p) => /^1 template · 0 active$/i.test(p.textContent?.trim() || ''));
      if (!props.templates.length && countLine) countLine.textContent = '0 templates · 0 active';
    };

    decorate();
    const observer = new MutationObserver(() => decorate());
    observer.observe(root, { childList: true, subtree: true });
    currencyInput?.addEventListener('input', decorate);

    return () => {
      observer.disconnect();
      currencyInput?.removeEventListener('input', decorate);
    };
  }, [effectiveTemplates, props.templates.length]);

  return (
    <div className="pricing-template-clarity space-y-4">
      <section className="rounded-card border border-info-border bg-info-bg p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-bold text-info-fg">Before entering material rates</p>
            <p className="mt-1 text-sm text-info-fg">
              Enter a <strong>number</strong> for the material rate. The screen shows the same value formatted in the template currency so you can immediately see what SETU Flow is using. For dimensional packaging, the rate is <strong>per square metre (m²)</strong>, not per pouch.
            </p>
          </div>
          <div className="rounded-ctl border border-info-border bg-surface-1 px-3 py-2 text-xs font-semibold text-content-primary">
            Area per pouch × Rate / m² × Quantity = Material total
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-ctl bg-surface-1 px-3 py-2 text-content-secondary">
            <strong className="block text-content-primary">1. Pick from your library</strong>
            Material and finish names come from the Reference Library. Internal system keys are hidden from admins.
          </div>
          <div className="rounded-ctl bg-surface-1 px-3 py-2 text-content-secondary">
            <strong className="block text-content-primary">2. Enter the number</strong>
            Example: type 10 and the row shows INR 10.00 / m² when INR is the template currency.
          </div>
          <div className="rounded-ctl bg-surface-1 px-3 py-2 text-content-secondary">
            <strong className="block text-content-primary">3. Check the live result</strong>
            The preview uses the same calculation engine as Quote Builder.
          </div>
        </div>
      </section>

      {!props.templates.length ? (
        <section className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-sm font-bold text-content-primary">Starter setup charges are already added to your first template</p>
          <p className="mt-1 text-sm text-content-secondary">Pre-press / proof preparation, artwork adjustment / correction, and extra design / SKU start at zero. Enter only the charges Star Packmate actually uses and mark a charge Required only when it always applies.</p>
        </section>
      ) : null}

      <PricingTemplateBuilder {...props} templates={effectiveTemplates} />

      <style jsx global>{`
        .pricing-template-clarity input[placeholder='key'] { display:none !important; }
        .pricing-template-clarity .setu-column-head {
          display:grid;
          gap:.5rem;
          align-items:end;
          padding:0 .5rem .2rem;
          color:var(--content-muted, #64748b);
          font-size:.72rem;
          line-height:1.15;
          font-weight:700;
        }
        .pricing-template-clarity .setu-data-row { align-items:start !important; }
        .pricing-template-clarity .setu-material-section .setu-data-row { grid-template-columns:minmax(240px,1.5fr) minmax(180px,1fr) minmax(150px,.65fr) 70px 80px !important; }
        .pricing-template-clarity .setu-finish-section .setu-data-row { grid-template-columns:minmax(240px,1.5fr) 130px 150px 70px 80px !important; }
        .pricing-template-clarity .setu-adhesive-section .setu-data-row { grid-template-columns:minmax(260px,1fr) 80px !important; }
        .pricing-template-clarity .setu-setup-section .setu-data-row { grid-template-columns:minmax(260px,1.5fr) 160px 170px 110px 80px !important; }
        .pricing-template-clarity .setu-rush-section .setu-data-row { grid-template-columns:minmax(220px,1.2fr) 130px minmax(220px,1fr) 80px !important; }
        .pricing-template-clarity .setu-money-readout {
          display:block;
          margin-top:.3rem;
          color:var(--brand-700, #174d7a);
          font-size:.72rem;
          font-weight:700;
          white-space:nowrap;
        }
        @media (max-width: 900px) {
          .pricing-template-clarity .setu-column-head { display:none; }
          .pricing-template-clarity .setu-data-row { grid-template-columns:1fr !important; }
        }
      `}</style>
    </div>
  );
}
