"use client";

import React from 'react';
import { DrawerActionBar } from '@/components/RightDrawer';

type WizardFooterMeta = {
  activeStepIndex: number;
  totalSteps: number;
  activeStepTitle: string;
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
};

interface LeadDrawerFooterProps {
  error?: string;
  success?: string;
  isQuickMode: boolean;
  isEditingExistingLead: boolean;
  isPending: boolean;
  onCancel?: () => void;
  onCreateQuote?: () => void;
  formId?: string;
  wizard?: WizardFooterMeta;
  disableSubmit?: boolean;
  submitLabel?: string;
  quickScanStatus?: { tone: 'idle' | 'loading' | 'success' | 'error'; message: string };
}

export default function LeadDrawerFooter({
  error,
  success,
  isQuickMode,
  isEditingExistingLead,
  isPending,
  onCancel,
  onCreateQuote,
  formId,
  wizard,
  disableSubmit = false,
  submitLabel,
  quickScanStatus,
}: LeadDrawerFooterProps) {
  const isFinalStep = wizard ? wizard.activeStepIndex === wizard.totalSteps - 1 : true;

  return (
    <div className="space-y-3">
      {wizard && !isQuickMode ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lead wizard</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                Step {wizard.activeStepIndex + 1} of {wizard.totalSteps}: {wizard.activeStepTitle}
              </p>
            </div>
            <div className="flex min-w-[132px] items-center gap-2">
              {Array.from({ length: wizard.totalSteps }).map((_, index) => (
                <span
                  key={index}
                  className={[
                    'h-2 flex-1 rounded-full',
                    index <= wizard.activeStepIndex ? 'bg-slate-900' : 'bg-slate-200',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
      {quickScanStatus?.tone === 'loading' ? (
        <div
          className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800"
          aria-live="assertive"
          role="status"
        >
          Reading card…
          <span className="mt-1 block text-xs font-medium text-sky-700">Filling contact fields…</span>
        </div>
      ) : null}
      {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
      {success && !quickScanStatus?.message ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}
      <DrawerActionBar
        title={isQuickMode ? 'Lead capture' : 'Lead workflow'}
        description={
          isFinalStep
            ? isQuickMode
              ? 'Review the details, then save this lead.'
              : 'Save changes and return to the list.'
            : 'Continue to the next section.'
        }
      >
        <button
          type="button"
          onClick={onCancel}
          className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        {wizard && wizard.canGoBack ? (
          <button
            type="button"
            onClick={wizard.onBack}
            disabled={isPending}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous step
          </button>
        ) : null}
        {wizard && !isFinalStep ? (
          <button
            type="button"
            onClick={wizard.onNext}
            disabled={!wizard.canGoNext || isPending}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            Continue
          </button>
        ) : (
          <button
            type="submit"
            form={formId}
            disabled={isPending || disableSubmit}
            className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {isPending ? 'Saving...' : disableSubmit ? 'No changes to save' : submitLabel ?? (isQuickMode ? '✓ Save lead' : isEditingExistingLead ? 'Save lead' : 'Create lead')}
          </button>
        )}
        {isEditingExistingLead && !isQuickMode && isFinalStep && onCreateQuote ? (
          <button
            type="button"
            onClick={onCreateQuote}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Create Quote
          </button>
        ) : null}
      </DrawerActionBar>
    </div>
  );
}
