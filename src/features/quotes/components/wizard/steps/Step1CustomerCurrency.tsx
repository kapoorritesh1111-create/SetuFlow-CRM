import type { ReactNode } from 'react';
import { QuoteWizardStepShell } from './quote-wizard-step-shell';

export type Step1CustomerCurrencyProps = {
  children: ReactNode;
  aside?: ReactNode;
};

export function Step1CustomerCurrency({ children, aside }: Step1CustomerCurrencyProps) {
  return (
    <QuoteWizardStepShell
      eyebrow="Step 1"
      title="Customer context"
      description="Group the opening quote setup controls before pricing is edited."
      aside={aside}
    >
      {children}
    </QuoteWizardStepShell>
  );
}
