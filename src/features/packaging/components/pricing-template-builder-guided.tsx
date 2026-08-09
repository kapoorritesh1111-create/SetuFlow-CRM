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
  return (
    <div className="pricing-template-clarity space-y-4">
      <section className="rounded-card border border-info-border bg-info-bg p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-sm font-bold text-info-fg">Entering packaging rates</p>
            <p className="mt-1 text-sm text-info-fg">
              Choose the material or finish name used by your team, then enter the rate in the template currency. For dimensional packaging, material rates are entered <strong>per square metre (m²)</strong>. The live preview uses the same pricing engine as Quote Builder.
            </p>
          </div>
          <div className="rounded-ctl border border-info-border bg-surface-1 px-3 py-2 text-xs font-semibold text-content-primary">
            Area per pouch × material rate × quantity = material total
          </div>
        </div>
      </section>

      <PricingTemplateBuilder {...props} />

      <style jsx global>{`
        /* Stability hotfix: presentation only. No DOM observers or imperative mutations. */
        .pricing-template-clarity input[type='number'] {
          appearance: textfield;
          -moz-appearance: textfield;
        }
        .pricing-template-clarity input[type='number']::-webkit-outer-spin-button,
        .pricing-template-clarity input[type='number']::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        /* Internal keys are implementation details and are not client-facing. */
        .pricing-template-clarity input[placeholder='key'] {
          display: none !important;
        }

        /* Keep repeated rows aligned after the hidden internal key. */
        .pricing-template-clarity section:has(> div input[placeholder='Thickness']) div.grid:has(input[placeholder='Thickness']) {
          grid-template-columns: minmax(220px, 1.4fr) minmax(160px, 1fr) 150px auto auto !important;
        }

        /* Lightweight column guidance without modifying the rendered DOM. */
        .pricing-template-clarity section:has(input[placeholder='Thickness']) .space-y-2::before {
          content: 'Material / Structure        Thickness / Basis        Rate (template currency / m²)        Library';
          display: block;
          margin: 0 0 .35rem .25rem;
          white-space: pre-wrap;
          color: rgb(71 85 105);
          font-size: .68rem;
          line-height: 1.2;
          font-weight: 700;
        }

        @media (max-width: 900px) {
          .pricing-template-clarity section:has(input[placeholder='Thickness']) .space-y-2::before {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
