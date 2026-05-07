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
      'Set workflow status, approval posture, and internal notes; approvals stay explicit before any customer-send action.',
  },
  {
    id: 'review',
    title: 'Review totals',
    shortLabel: 'Review',
    description:
      'Confirm selected currency, totals, quote-only overrides, approval state, and PDF readiness before generating or sending.',
  },
  {
    id: 'send',
    title: 'Send & approval checkpoint',
    shortLabel: 'Send',
    description:
      'Use the existing checkpoint to confirm blockers are clear, approval is approved or not required, and the customer-send decision is intentional.',
  },
];
