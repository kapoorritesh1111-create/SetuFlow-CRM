'use client';

import { useEffect } from 'react';
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

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

export default function PricingTemplateBuilderGuided(props: Props) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.pricing-template-clarity');
    if (!root) return;

    const materialItems = props.referenceItems.filter((item) => item.category === 'material' && item.is_active);

    const onPointerDown = (event: PointerEvent) => {
      const input = event.target instanceof HTMLInputElement ? event.target : null;
      if (!input || input.getAttribute('list') !== 'reflib-material') return;

      const rect = input.getBoundingClientRect();
      const clickedPickerArea = event.clientX >= rect.right - 40;
      if (!clickedPickerArea || !input.value) return;

      input.dataset.previousMaterialValue = input.value;
      setNativeInputValue(input, '');
    };

    const onInput = (event: Event) => {
      const input = event.target instanceof HTMLInputElement ? event.target : null;
      if (!input || input.getAttribute('list') !== 'reflib-material') return;

      const selected = materialItems.find((item) => item.name.toLowerCase() === input.value.trim().toLowerCase());
      if (!selected) return;

      delete input.dataset.previousMaterialValue;
      const row = input.closest('.grid');
      const thickness = row?.querySelector<HTMLInputElement>("input[placeholder='e.g. 12/12/60']");
      if (thickness && selected.default_thickness && thickness.value !== selected.default_thickness) {
        setNativeInputValue(thickness, selected.default_thickness);
      }
    };

    const onBlur = (event: FocusEvent) => {
      const input = event.target instanceof HTMLInputElement ? event.target : null;
      if (!input || input.getAttribute('list') !== 'reflib-material') return;
      if (input.value.trim() || !input.dataset.previousMaterialValue) return;

      const previous = input.dataset.previousMaterialValue;
      delete input.dataset.previousMaterialValue;
      setNativeInputValue(input, previous);
    };

    root.addEventListener('pointerdown', onPointerDown);
    root.addEventListener('input', onInput);
    root.addEventListener('blur', onBlur, true);
    return () => {
      root.removeEventListener('pointerdown', onPointerDown);
      root.removeEventListener('input', onInput);
      root.removeEventListener('blur', onBlur, true);
    };
  }, [props.referenceItems]);

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

        /* Keep the complete pricing preview rail visible while the form scrolls. */
        @media (min-width: 1280px) {
          .pricing-template-clarity aside {
            position: sticky;
            top: 76px;
            z-index: 20;
            align-self: start;
            height: max-content;
            max-height: calc(100vh - 92px);
            overflow-y: auto;
            overscroll-behavior: contain;
          }
          .pricing-template-clarity aside > section:last-child {
            position: static;
            max-height: none;
            overflow: visible;
          }
        }
      `}</style>
    </div>
  );
}
