import type { WizardStepDefinition } from '@/components/ui/wizard-shell';

export const QUOTE_CREATE_STEPS: WizardStepDefinition[] = [
  {
    id: 'product',
    title: 'Product & currency',
    shortLabel: 'Product',
    description:
      'Choose buyer context, product scope, pricing basis, and quote currency before editing commercial prices.',
  },
  {
    id: 'pricing',
    title: 'Price lines',
    shortLabel: 'Pricing',
    description:
      'Review pack, MOQ, units/case, basis price, quote price, and line total in the same pricing table.',
  },
  {
    id: 'terms',
    title: 'Terms & approval',
    shortLabel: 'Terms',
    description:
      'Set workflow status, approval posture, and internal notes before the quote reaches final review.',
  },
  {
    id: 'review',
    title: 'Review totals',
    shortLabel: 'Review',
    description:
      'Confirm selected currency, totals, quote-only overrides, and approval state before generating or sending.',
  },
  {
    id: 'send',
    title: 'Send checkpoint',
    shortLabel: 'Send',
    description:
      'Use the existing send checkpoint for blockers, approvals, revisions, and customer-send decisions.',
  },
];
