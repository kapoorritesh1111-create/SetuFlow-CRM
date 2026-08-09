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
            <p className="text-sm font-bold text-info-fg">Before entering material rates</p>
            <p className="mt-1 text-sm text-info-fg">
              The material rate is <strong>currency per square metre (m²)</strong>, not currency per pouch. SETU Flow first calculates the material area of one pouch, then multiplies that area by the material rate and the quote quantity.
            </p>
          </div>
          <div className="rounded-ctl border border-info-border bg-surface-1 px-3 py-2 text-xs font-semibold text-content-primary">
            Area per pouch × Rate / m² × Quantity = Material total
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
          <div className="rounded-ctl bg-surface-1 px-3 py-2 text-content-secondary">
            <strong className="block text-content-primary">Example area</strong>
            180 × 260 mm flat area = 0.0468 m²
          </div>
          <div className="rounded-ctl bg-surface-1 px-3 py-2 text-content-secondary">
            <strong className="block text-content-primary">Example rate</strong>
            INR 10 / m² = INR 0.468 material per pouch
          </div>
          <div className="rounded-ctl bg-surface-1 px-3 py-2 text-content-secondary">
            <strong className="block text-content-primary">Example quantity</strong>
            1,000 pouches = INR 468 material total
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-info-fg">
          For Stand-Up, Center Seal, and other gusseted pouches, use the pouch area formula when appropriate. “Flat area” is intended for labels and sleeves.
        </p>
      </section>

      <PricingTemplateBuilder {...props} />

      <style jsx global>{`
        .pricing-template-clarity div.grid:has(> input[placeholder='Rate'])::before {
          content: 'Internal key   |   Material / structure   |   Thickness / basis   |   Rate (currency per m² for dimensional templates)';
          grid-column: 1 / -1;
          display: block;
          padding: 0.25rem 0.25rem 0.1rem;
          font-size: 0.68rem;
          line-height: 1.2;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: rgb(71 85 105);
        }

        .pricing-template-clarity input[placeholder='Rate'] {
          font-weight: 700;
        }
      `}</style>
    </div>
  );
}
