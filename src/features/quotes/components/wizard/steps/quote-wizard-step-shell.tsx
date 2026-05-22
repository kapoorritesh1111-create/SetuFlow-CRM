import type { ReactNode } from 'react';
import { SectionCard } from '@/components/ui/section-card';

export type QuoteWizardStepShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  aside?: ReactNode;
};

export function QuoteWizardStepShell({
  eyebrow,
  title,
  description,
  children,
  aside,
}: QuoteWizardStepShellProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <SectionCard className="p-4 sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        {children}
      </SectionCard>
      {aside ? <div className="space-y-4">{aside}</div> : null}
    </div>
  );
}
