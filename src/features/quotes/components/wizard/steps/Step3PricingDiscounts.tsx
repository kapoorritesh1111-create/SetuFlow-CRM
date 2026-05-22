import type { ReactNode } from 'react';
import { QuoteWizardStepShell } from './quote-wizard-step-shell';

export type Step3PricingDiscountsProps = {
  children: ReactNode;
  aside?: ReactNode;
};

export function Step3PricingDiscounts({ children, aside }: Step3PricingDiscountsProps) {
  return (
    <QuoteWizardStepShell
      eyebrow="Step 3"
      title="Pricing review"
      description="Group the quote pricing review controls in one focused step module."
      aside={aside}
    >
      {children}
    </QuoteWizardStepShell>
  );
}
