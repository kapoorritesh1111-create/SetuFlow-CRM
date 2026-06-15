'use client';

import { useFormState, useFormStatus } from 'react-dom';

import {
  startTradeShowTrial,
  tradeShowTrialInitialState,
  type TradeShowTrialActionState,
} from './actions';

const fields = [
  { name: 'fullName', label: 'Full name', placeholder: 'Ritesh Kapoor', required: true, autoComplete: 'name' },
  { name: 'company', label: 'Company', placeholder: 'Blue Orbit International', required: true, autoComplete: 'organization' },
  { name: 'email', label: 'Work email', placeholder: 'you@company.com', required: true, autoComplete: 'email', type: 'email' },
  { name: 'phoneWhatsapp', label: 'Phone / WhatsApp', placeholder: '+1 555 123 4567', required: true, autoComplete: 'tel' },
  { name: 'tradeShowName', label: 'Trade show name', placeholder: 'Gulfood 2026', required: true },
  { name: 'boothNumber', label: 'Booth number', placeholder: 'Hall 3 / B-18' },
  { name: 'mainProductCategory', label: 'Main product / category', placeholder: 'Fruit chips, jaggery, spices...' },
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex w-full items-center justify-center rounded-2xl bg-[#06263f] px-5 py-4 text-sm font-bold text-white shadow-[0_20px_45px_rgba(6,38,63,0.22)] transition hover:-translate-y-0.5 hover:bg-[#0b2e4a] disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Building your trial workspace...' : 'Start My Free Trial'}
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
    <form action={formAction} className="rounded-[2rem] border border-white/60 bg-white p-5 shadow-[0_28px_80px_rgba(15,23,42,0.16)] sm:p-7">
      <div className="mb-5 rounded-2xl border border-teal-100 bg-teal-50/80 px-4 py-3 text-sm font-semibold text-[#108477]">
        No credit card. No approval wait. Phone / WhatsApp and trade show name are required so your booth workspace is ready immediately.
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field, index) => {
          const wide = index >= 4;
          const required = 'required' in field ? field.required : false;
          return (
            <label key={field.name} className={wide ? 'sm:col-span-2' : ''}>
              <span className="mb-1.5 flex items-center gap-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                {field.label}
                {required && <span className="text-[#108477]">*</span>}
              </span>
              <input
                name={field.name}
                type={'type' in field ? field.type : 'text'}
                required={required}
                autoComplete={'autoComplete' in field ? field.autoComplete : undefined}
                placeholder={field.placeholder}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#108477] focus:bg-white focus:ring-4 focus:ring-teal-100"
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
          By starting a trial, your company gets a guided trade-show workspace with trade event context, vCard setup, and export-ready trial permissions.
        </p>
      </div>
    </form>
  );
}
