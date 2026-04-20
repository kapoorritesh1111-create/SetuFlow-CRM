import type { WizardStepDefinition } from '@/components/ui/wizard-shell';

export const QUOTE_CREATE_STEPS: WizardStepDefinition[] = [
  {
    id: 'product',
    title: 'Product context',
    shortLabel: 'Product',
    description:
      'Choose RFQ linkage, template, basis, and currency before drafting commercial detail.',
  },
  {
    id: 'pricing',
    title: 'Pricing lines',
    shortLabel: 'Pricing',
    description:
      'Keep product and price linkage inside the same commercial flow.',
  },
  {
    id: 'terms',
    title: 'Terms and posture',
    shortLabel: 'Terms',
    description:
      'Set workflow status, approval posture, and internal terms without leaving the builder.',
  },
  {
    id: 'review',
    title: 'Review and totals',
    shortLabel: 'Review',
    description:
      'Confirm totals, draft structure, and workflow posture before the final send decision is made.',
  },
  {
    id: 'send',
    title: 'Send checkpoint',
    shortLabel: 'Send',
    description:
      'Keep blockers explicit before send or revision actions move the quote forward.',
  },
];
