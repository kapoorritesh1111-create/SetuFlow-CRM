import type { ReactNode } from 'react';
import { QuoteWizardStepShell } from './quote-wizard-step-shell';

export type Step5SendApproveProps = {
  children: ReactNode;
  aside?: ReactNode;
};

export function Step5SendApprove({ children, aside }: Step5SendApproveProps) {
  return (
    <QuoteWizardStepShell
      eyebrow="Step 5"
      title="Send and approval"
      description="Group the final quote send and approval controls in one focused step module."
      aside={aside}
    >
      {children}
    </QuoteWizardStepShell>
  );
}
