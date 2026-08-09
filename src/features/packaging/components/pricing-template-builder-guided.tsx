'use client';

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

export default function PricingTemplateBuilderGuided(props: Props) {
  const displayCurrency = (props.templates[0]?.currency || 'INR').toUpperCase();
  const currencySvg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="42" height="24"><text x="3" y="16" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#475569">${displayCurrency}</text></svg>`,
  );

  return (
    <div className="pricing-template-clarity space-y-4">
      <section className="rounded-card border border-info-border bg-info-bg p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-bold text-info-fg">Entering packaging rates</p>
            <p className="mt-1 text-sm text-info-fg">
              Pick the material or finish name your team uses, then enter the monetary rate in the template currency. For dimensional packaging, the material rate is <strong>{displayCurrency} per square metre (m²)</strong>. SETU Flow converts that into the material cost for one pouch and then multiplies it by the quote quantity.
            </p>
          </div>
          <div className="rounded-ctl border border-info-border bg-surface-1 px-3 py-2 text-xs font-semibold text-content-primary">
            Area per pouch × {displayCurrency}/m² × Quantity = Material total
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-ctl bg-surface-1 px-3 py-2 text-content-secondary">
            <strong className="block text-content-primary">Currency entry</strong>
            Rate and charge boxes show <strong>{displayCurrency}</strong> inside the field so they read as money, not generic quantities.
          </div>
          <div className="rounded-ctl bg-surface-1 px-3 py-2 text-content-secondary">
            <strong className="block text-content-primary">What “unit price” means</strong>
            The live preview is the price for <strong>one quoted unit</strong>. For pouch families using PCS, that means <strong>price per pouch / piece</strong>.
          </div>
        </div>
      </section>

      <PricingTemplateBuilder {...props} />

      <style jsx global>{`
        /* Presentation-only UX layer. No observers and no runtime DOM mutation. */
        .pricing-template-clarity input[type='number'] {
          appearance: textfield;
          -moz-appearance: textfield;
        }
        .pricing-template-clarity input[type='number']::-webkit-outer-spin-button,
        .pricing-template-clarity input[type='number']::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        /* Internal keys are system implementation details, never client data. */
        .pricing-template-clarity input[placeholder='key'] {
          display: none !important;
        }

        /* Materials: keep the header and controls on the exact same five-column grid. */
        .pricing-template-clarity section:has(input[placeholder='Thickness']) .space-y-2 {
          display: grid;
          gap: .5rem;
        }
        .pricing-template-clarity section:has(input[placeholder='Thickness']) .space-y-2::before {
          content: 'Material / Structure     Thickness / Basis     Rate (${displayCurrency} / m²)     Library';
          display: block;
          padding: 0 .5rem .15rem;
          white-space: pre;
          color: rgb(71 85 105);
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: .68rem;
          line-height: 1.2;
          font-weight: 700;
        }
        .pricing-template-clarity section:has(input[placeholder='Thickness']) div.grid:has(input[placeholder='Thickness']) {
          grid-template-columns: minmax(260px, 1.7fr) minmax(190px, 1.15fr) minmax(170px, .8fr) 76px 86px !important;
          align-items: center;
        }

        /* Currency-style monetary inputs: still numeric in the model/engine, visually money to the admin. */
        .pricing-template-clarity input[placeholder='Thickness'] + input[type='number'],
        .pricing-template-clarity section:has(> div p:first-child) select + input[type='number'] {
          background-image: url("data:image/svg+xml,${currencySvg}");
          background-repeat: no-repeat;
          background-position: .45rem center;
          padding-left: 2.8rem !important;
          text-align: right;
          font-variant-numeric: tabular-nums;
          font-weight: 650;
        }

        /* Finish/add-on monetary rate specifically. */
        .pricing-template-clarity section:has(datalist#reflib-finish) select + input[type='number'] {
          background-image: url("data:image/svg+xml,${currencySvg}");
          background-repeat: no-repeat;
          background-position: .45rem center;
          padding-left: 2.8rem !important;
          text-align: right;
          font-variant-numeric: tabular-nums;
          font-weight: 650;
        }

        /* Setup / pre-press monetary amount. */
        .pricing-template-clarity section:has(p:first-child) input[placeholder='Label'] + input[type='number'] {
          background-image: url("data:image/svg+xml,${currencySvg}");
          background-repeat: no-repeat;
          background-position: .45rem center;
          padding-left: 2.8rem !important;
          text-align: right;
          font-variant-numeric: tabular-nums;
          font-weight: 650;
        }

        /* Make the preview's unit basis explicit without changing calculation math. */
        .pricing-template-clarity aside section:last-child .rounded-ctl.bg-surface-2::before {
          content: 'Price per quoted unit · PCS families = per pouch / piece';
          display: block;
          margin-bottom: .35rem;
          color: rgb(71 85 105);
          font-size: .72rem;
          font-weight: 700;
        }

        @media (max-width: 1050px) {
          .pricing-template-clarity section:has(input[placeholder='Thickness']) .space-y-2::before {
            white-space: normal;
          }
          .pricing-template-clarity section:has(input[placeholder='Thickness']) div.grid:has(input[placeholder='Thickness']) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
