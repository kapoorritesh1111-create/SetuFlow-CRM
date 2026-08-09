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
      `}</style>
    </div>
  );
}
