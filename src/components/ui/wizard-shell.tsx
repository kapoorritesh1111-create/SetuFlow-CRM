import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type WizardStepDefinition = {
  id: string;
  title: string;
  description: string;
  shortLabel?: string;
};

export function WizardShell({
  steps,
  activeStepId,
  onStepChange,
  children,
  summary,
  className,
}: {
  steps: WizardStepDefinition[];
  activeStepId: string;
  onStepChange: (stepId: string) => void;
  children: ReactNode;
  summary?: ReactNode;
  className?: string;
}) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === activeStepId),
  );
  const activeStep = steps[activeIndex] ?? steps[0];

  return (
    <div className={cn('space-y-5', className)}>
      <section className="rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,252,0.92))] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-700">Guided workflow</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900 sm:text-xl">{activeStep?.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{activeStep?.description}</p>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Progress</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              Step {activeIndex + 1} of {steps.length}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {steps.map((step, index) => {
            const isActive = step.id === activeStepId;
            const isComplete = index < activeIndex;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepChange(step.id)}
                className={cn(
                  'rounded-2xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
                  isActive
                    ? 'border-slate-900 bg-slate-900 text-white shadow-[0_16px_32px_rgba(15,23,42,0.18)]'
                    : isComplete
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold',
                      isActive
                        ? 'bg-white/15 text-white'
                        : isComplete
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600',
                    )}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{step.shortLabel ?? step.title}</p>
                    <p className={cn('mt-1 text-xs', isActive ? 'text-slate-200' : isComplete ? 'text-emerald-700' : 'text-slate-500')}>
                      {step.description}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {summary ? <div className="mt-4">{summary}</div> : null}
      </section>

      {children}
    </div>
  );
}

export function WizardStepBody({
  title,
  description,
  children,
  aside,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">{children}</div>
      <aside className="space-y-4"> 
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-soft">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Current step</p>
          <h4 className="mt-2 text-base font-semibold text-slate-900">{title}</h4>
          {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
        </div>
        {aside}
      </aside>
    </section>
  );
}

export function WizardValidationSummary({
  title = 'Review required fields',
  issues,
  tone = 'error',
}: {
  title?: string;
  issues: string[];
  tone?: 'error' | 'success' | 'info';
}) {
  if (!issues.length) return null;

  const toneClass =
    tone === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : tone === 'info'
        ? 'border-blue-200 bg-blue-50 text-blue-800'
        : 'border-rose-200 bg-rose-50 text-rose-800';

  return (
    <div className={cn('rounded-2xl border px-4 py-3', toneClass)}>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {issues.map((issue) => (
          <li key={issue}>• {issue}</li>
        ))}
      </ul>
    </div>
  );
}
