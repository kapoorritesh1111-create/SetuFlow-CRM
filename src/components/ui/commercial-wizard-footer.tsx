'use client';

import { DrawerActionBar } from '@/components/RightDrawer';

export function CommercialWizardFooter({
  title,
  description,
  statusLabel,
  statusTone = 'neutral',
  error,
  success,
  isPending,
  activeStepIndex,
  totalSteps,
  activeStepTitle,
  canGoNext = true,
  submitDisabled = false,
  canGoBack,
  onBack,
  onCancel,
  onNext,
  nextLabel = 'Continue',
  submitLabel,
  submitFormId,
}: {
  title: string;
  description: string;
  statusLabel?: string;
  statusTone?: 'success' | 'warning' | 'danger' | 'neutral';
  error?: string;
  success?: string;
  isPending: boolean;
  activeStepIndex: number;
  totalSteps: number;
  activeStepTitle: string;
  canGoBack: boolean;
  onBack: () => void;
  onCancel: () => void;
  onNext: () => void;
  nextLabel?: string;
  submitLabel: string;
  submitFormId?: string;
  canGoNext?: boolean;
  submitDisabled?: boolean;
}) {
  const isFinalStep = activeStepIndex === totalSteps - 1;
  const statusClasses =
    statusTone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : statusTone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : statusTone === 'success'
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-white text-slate-700';

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/90 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Guided workflow</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              Step {activeStepIndex + 1} of {totalSteps}: {activeStepTitle}
            </p>
          </div>
          <div className="flex min-w-[132px] items-center gap-2">
            {Array.from({ length: totalSteps }).map((_, index) => (
              <span
                key={index}
                className={[
                  'h-2 flex-1 rounded-full',
                  index <= activeStepIndex ? 'bg-slate-900' : 'bg-slate-200',
                ].join(' ')}
              />
            ))}
          </div>
        </div>
      </div>
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}
      <DrawerActionBar
        title={title}
        description={description}
      >
        {statusLabel ? (
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${statusClasses}`}
          >
            {statusLabel}
          </span>
        ) : null}
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={!canGoBack || isPending}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Previous step
        </button>
        {isFinalStep ? (
          <button
            type="submit"
            form={submitFormId}
            disabled={isPending || submitDisabled || !canGoNext}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending ? 'Saving...' : submitLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={isPending || submitDisabled || !canGoNext}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {nextLabel}
          </button>
        )}
      </DrawerActionBar>
    </div>
  );
}
