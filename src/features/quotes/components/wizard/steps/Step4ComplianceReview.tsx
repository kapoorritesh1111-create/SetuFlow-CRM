import type { ReactNode } from 'react';
import { QuoteWizardStepShell } from './quote-wizard-step-shell';

export type Step4ComplianceReviewProps = {
  children: ReactNode;
  aside?: ReactNode;
};

export function Step4ComplianceReview({ children, aside }: Step4ComplianceReviewProps) {
  return (
    <QuoteWizardStepShell
      eyebrow="Step 4"
      title="Compliance review"
      description="Group the quote review and readiness controls in one focused step module."
      aside={aside}
    >
      {children}
    </QuoteWizardStepShell>
  );
}
