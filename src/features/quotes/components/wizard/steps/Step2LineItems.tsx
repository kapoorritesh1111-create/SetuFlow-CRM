import type { ReactNode } from 'react';
import { QuoteWizardStepShell } from './quote-wizard-step-shell';

export type Step2LineItemsProps = {
  children: ReactNode;
  aside?: ReactNode;
};

export function Step2LineItems({ children, aside }: Step2LineItemsProps) {
  return (
    <QuoteWizardStepShell
      eyebrow="Step 2"
      title="Line items"
      description="Group the quote line item controls in one focused step module."
      aside={aside}
    >
      {children}
    </QuoteWizardStepShell>
  );
}
