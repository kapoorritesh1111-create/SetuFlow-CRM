'use client';

import { useFormState, useFormStatus } from 'react-dom';

import { startTradeShowTrial } from './actions';

export type TradeShowTrialActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

const tradeShowTrialInitialState: TradeShowTrialActionState = { ok: false, message: '' };

type TrialSignupField = {
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
  autoComplete?: string;
  type?: string;
};

const fields: TrialSignupField[] = [
  { name: 'fullName', label: 'Full name', placeholder: 'Your full name', required: true, autoComplete: 'name' },
  { name: 'company', label: 'Company', placeholder: 'Your company name', required: true, autoComplete: 'organization' },
  { name: 'email', label: 'Work email', placeholder: 'name@company.com', required: true, autoComplete: 'email', type: 'email' },
  { name: 'phoneWhatsapp', label: 'Phone / WhatsApp', placeholder: 'Phone or WhatsApp', required: true, autoComplete: 'tel' },
  { name: 'tradeShowName', label: 'Trade show name', placeholder: 'Trade show or event name', required: true },
  { name: 'boothNumber', label: 'Booth number', placeholder: 'Booth, hall, or stand', required: false },
  { name: 'mainProductCategory', label: 'Main product / category', placeholder: 'Main products or categories', required: false },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-700 px-5 py-4 text-sm font-extrabold text-white shadow-[0_18px_38px_rgba(6,38,63,0.18)] transition hover:-translate-y-0.5 hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-70 sm:text-base"
    >
      {pending ? 'Preparing your workspace...' : 'Start My Free Trial'}
      <span aria-hidden className="text-xl leading-none">›</span>
    </button>
  );
}

function FieldError({ state, name }: { state: TradeShowTrialActionState; name: string }) {
  const message = state.fieldErrors?.[name];
  if (!message) return null;
  return <p className="mt-1 text-xs font-semibold text-red-600">{message}</p>;
}

export function TradeShowTrialForm() {
  const [state, formAction] = useFormState(startTradeShowTrial, tradeShowTrialInitialState);

  return (
    <form action={formAction} className="rounded-hero border border-white/80 bg-white/95 p-4 shadow-[0_24px_64px_rgba(0,0,0,0.16)] backdrop-blur sm:p-7">
      <div className="mb-5">
        <p className="text-xl font-extrabold tracking-[-0.02em] text-content-primary">Quick setup</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">No credit card required. CSV export included.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {fields.map((field, index) => {
          const wide = index >= 4;
          return (
            <label key={field.name} className={wide ? 'sm:col-span-2' : ''}>
              <span className="mb-1.5 flex items-center gap-1 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-slate-500">
                {field.label}
                {field.required && <span className="text-accent-700">*</span>}
              </span>
              <input
                name={field.name}
                type={field.type ?? 'text'}
                required={field.required}
                autoComplete={field.autoComplete}
                placeholder={field.placeholder}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-accent-700 focus:bg-white focus:ring-4 focus:ring-teal-100"
              />
              <FieldError state={state} name={field.name} />
            </label>
          );
        })}
      </div>

      {state.message && !state.ok && (
        <div className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {state.message}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <SubmitButton />
        <p className="text-center text-xs leading-6 text-slate-500">
          Includes capture tools, contact sharing, and CSV export access.
        </p>
      </div>
    </form>
  );
}
