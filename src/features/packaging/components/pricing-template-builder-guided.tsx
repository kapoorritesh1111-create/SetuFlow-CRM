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
    <div className="pricing-template-clarity">
      <PricingTemplateBuilder {...props} />
      <style jsx global>{`
        .pricing-template-clarity input[type='number'] {
          appearance: textfield;
          -moz-appearance: textfield;
        }
        .pricing-template-clarity input[type='number']::-webkit-outer-spin-button,
        .pricing-template-clarity input[type='number']::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        /* Keep Test your price visible while the admin works down a long template. */
        @media (min-width: 1280px) {
          .pricing-template-clarity aside {
            align-self: stretch;
          }
          .pricing-template-clarity aside > section:last-child {
            position: sticky;
            top: 1rem;
            z-index: 10;
            max-height: calc(100vh - 2rem);
            overflow-y: auto;
            overscroll-behavior: contain;
          }
        }
      `}</style>
    </div>
  );
}
