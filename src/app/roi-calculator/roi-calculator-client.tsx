'use client';

import { type FormEvent, useMemo, useState } from 'react';

type PlanKey = 'starter' | 'growth';
type NextStep = 'report_only' | 'book_demo' | 'request_trial';

type RoiInputs = {
  people: number;
  leadsCaptured: number;
  leadsLost: number;
  weeklyChaseHours: number;
  recoveredLeadValue: number;
  plan: PlanKey;
  hourlyCost: number;
  timeReductionRate: number;
  leadRecoveryRate: number;
};

type ContactForm = {
  fullName: string;
  email: string;
  companyName: string;
  phone: string;
  role: string;
  mainPainPoint: string;
  nextStep: NextStep;
};

const plans: Record<PlanKey, { name: string; price: number; users: string }> = {
  starter: { name: 'Starter', price: 199, users: 'Up to 5 users' },
  growth: { name: 'Growth', price: 499, users: 'Up to 10 users' },
};

const defaults: RoiInputs = {
  people: 10,
  leadsCaptured: 250,
  leadsLost: 50,
  weeklyChaseHours: 30,
  recoveredLeadValue: 500,
  plan: 'growth',
  hourlyCost: 25,
  timeReductionRate: 35,
  leadRecoveryRate: 25,
};

const defaultContact: ContactForm = {
  fullName: '',
  email: '',
  companyName: '',
  phone: '',
  role: '',
  mainPainPoint: 'Missed follow-ups',
  nextStep: 'report_only',
};

const painPoints = [
  'Missed follow-ups',
  'Trade show lead leakage',
  'Quote delays',
  'Document readiness',
  'Manual spreadsheet tracking',
  'Team accountability',
  'Full CRM workflow',
];

function money(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.max(0, value));
}

function rounded(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function payback(value: number) {
  return value > 0 && value < 1 ? 'Less than 1 month' : `${rounded(value)} months`;
}

function clientSuccessMessage(nextStep: NextStep) {
  if (nextStep === 'request_trial') return 'Your trial request is received. We have emailed your onboarding next step.';
  if (nextStep === 'book_demo') return 'Your ROI report is on the way. We have included your demo request with these numbers.';
  return 'Your ROI report is on the way. Please check your inbox.';
}

function calculateScenario(input: RoiInputs, timeRate: number, recoveryRate: number) {
  const monthlyTimeSavings = input.weeklyChaseHours * 4.33 * input.hourlyCost * (timeRate / 100);
  const leadsRecovered = input.leadsLost * (recoveryRate / 100);
  const recoveredLeadValue = leadsRecovered * input.recoveredLeadValue;
  const monthlyImpact = monthlyTimeSavings + recoveredLeadValue;
  const planCost = plans[input.plan].price;
  const netImpact = monthlyImpact - planCost;
  const paybackMonths = monthlyImpact > 0 ? planCost / monthlyImpact : 0;
  return { timeRate, recoveryRate, monthlyTimeSavings, leadsRecovered, recoveredLeadValue, monthlyImpact, planCost, netImpact, paybackMonths };
}

function Field({ label, helper, value, suffix, onChange }: { label: string; helper: string; value: number; suffix: string; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-3 border-b border-slate-100 py-4 last:border-b-0 sm:grid-cols-[1fr_12rem] sm:items-center">
      <span>
        <span className="block text-sm font-bold text-slate-950">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{helper}</span>
      </span>
      <span className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-100">
        <input type="number" min="0" value={value} onChange={(event) => onChange(Number(event.target.value) || 0)} className="w-full bg-transparent px-4 py-3 text-base font-extrabold text-slate-950 outline-none" />
        <span className="pr-4 text-xs font-semibold text-slate-400">{suffix}</span>
      </span>
    </label>
  );
}

function ResultRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 ${highlight ? 'bg-teal-50' : 'bg-white'}`}>
      <span className="text-xs font-semibold leading-5 text-slate-600">{label}</span>
      <span className={`text-sm font-extrabold ${highlight ? 'text-teal-700' : 'text-slate-950'}`}>{value}</span>
    </div>
  );
}

function RadioCard({ name, checked, label, onChange }: { name: string; checked: boolean; label: string; onChange: () => void }) {
  return (
    <label className={`flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition sm:px-4 ${checked ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
      <input type="radio" name={name} checked={checked} onChange={onChange} className="h-4 w-4 shrink-0 accent-teal-600" />
      <span className="min-w-0 flex-1 whitespace-normal break-words leading-5">{label}</span>
    </label>
  );
}

export function RoiCalculatorClient() {
  const [inputs, setInputs] = useState<RoiInputs>(defaults);
  const [calculated, setCalculated] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);
  const [contact, setContact] = useState<ContactForm>(defaultContact);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const results = useMemo(() => {
    const conservative = calculateScenario(inputs, 20, 10);
    const balanced = calculateScenario(inputs, 25, 15);
    const upside = calculateScenario(inputs, inputs.timeReductionRate, inputs.leadRecoveryRate);
    const lossRate = inputs.leadsCaptured > 0 ? (inputs.leadsLost / inputs.leadsCaptured) * 100 : 0;
    return { conservative, balanced, upside, lossRate };
  }, [inputs]);

  const setValue = (key: keyof RoiInputs, value: number | PlanKey) => {
    setInputs((current) => ({ ...current, [key]: value }));
    setCalculated(false);
  };

  const openReportModal = (nextStep: NextStep) => {
    setContact((current) => ({ ...current, nextStep }));
    setSubmitError('');
    setSubmitSuccess('');
    setModalOpen(true);
  };

  const submitReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitSuccess('');
    try {
      const response = await fetch('/api/roi-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, inputs }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to send ROI report. Please try again.');
      setSubmitSuccess(clientSuccessMessage(contact.nextStep));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to send ROI report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-[linear-gradient(180deg,#f0f6fb_0%,#ffffff_38%,#f8fbff_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-700">ROI Calculator</p>
          <div className="mx-auto mt-3 inline-flex rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">Powered by SETU Guru</div>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-6xl">How much are missed follow-ups costing your trade team?</h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">Enter a few numbers your team already knows. SETU Guru estimates a conservative-to-upside improvement range from recovered follow-ups and reduced manual chasing.</p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1.35fr_0.8fr] lg:items-start">
          <div className="rounded-hero border border-slate-200 bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,.08)] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-base font-extrabold text-slate-950">1. Tell us a few details about your lead process</h2>
              <button type="button" onClick={() => { setInputs(defaults); setCalculated(false); }} className="text-xs font-bold text-teal-700 hover:text-teal-800">Reset</button>
            </div>
            <div className="mt-4">
              <Field label="People following up on leads" helper="Sales reps, owners, coordinators, or anyone responsible for follow-up." value={inputs.people} suffix="people" onChange={(value) => setValue('people', value)} />
              <Field label="Leads captured per month" helper="Include trade shows, website, WhatsApp, referrals, inbound calls, etc." value={inputs.leadsCaptured} suffix="leads" onChange={(value) => setValue('leadsCaptured', value)} />
              <Field label="Leads lost or missed per month" helper="Leads not followed up properly, forgotten, delayed, or never assigned." value={inputs.leadsLost} suffix="leads" onChange={(value) => setValue('leadsLost', value)} />
              <Field label="Team hours spent chasing leads per week" helper="Checking spreadsheets, WhatsApp, emails, reminders, updates, status checks, etc." value={inputs.weeklyChaseHours} suffix="hours" onChange={(value) => setValue('weeklyChaseHours', value)} />
              <Field label="Average value per recovered lead" helper="Estimated profit, contribution, or business value of one recovered opportunity." value={inputs.recoveredLeadValue} suffix="USD" onChange={(value) => setValue('recoveredLeadValue', value)} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[250, 500, 1000].map((value) => (
                <button key={value} type="button" onClick={() => setValue('recoveredLeadValue', value)} className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${inputs.recoveredLeadValue === value ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-700 hover:border-teal-200'}`}>
                  ${value}<span className="mt-1 block text-[11px] font-semibold text-slate-400">{value === 250 ? 'Conservative' : value === 500 ? 'Typical' : 'High-value'}</span>
                </button>
              ))}
              <button type="button" className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700">Custom</button>
            </div>
            <div className="mt-6">
              <h2 className="text-base font-extrabold text-slate-950">2. Choose the SETU Flow plan to compare</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {(['starter', 'growth'] as PlanKey[]).map((planKey) => {
                  const plan = plans[planKey];
                  const selected = inputs.plan === planKey;
                  return (
                    <button key={planKey} type="button" onClick={() => setValue('plan', planKey)} className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${selected ? 'border-teal-500 bg-teal-50 shadow-[0_12px_32px_rgba(13,148,136,.12)]' : 'border-slate-200 bg-white hover:border-teal-200'}`}>
                      <span><span className="block text-sm font-bold text-slate-950">{plan.name}</span><span className="mt-1 block text-xs font-semibold text-slate-500">${plan.price}/month · {plan.users}</span></span>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${selected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 text-transparent'}`}>✓</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <button type="button" onClick={() => setCalculated(true)} className="mt-5 flex w-full items-center justify-center rounded-xl bg-teal-600 px-5 py-4 text-sm font-extrabold text-white shadow-[0_16px_44px_rgba(13,148,136,.25)] transition hover:-translate-y-0.5 hover:bg-teal-700">Calculate My Improvement Range →</button>
            <button type="button" onClick={() => setShowAssumptions((open) => !open)} className="mx-auto mt-4 flex text-xs font-bold text-teal-700">{showAssumptions ? 'Hide assumptions' : 'Adjust upside assumptions (optional)'}</button>
            {showAssumptions && (
              <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
                <Field label="Average team cost" helper="Blended hourly cost." value={inputs.hourlyCost} suffix="USD/hr" onChange={(value) => setValue('hourlyCost', value)} />
                <Field label="Upside time saved" helper="Used for the upside scenario." value={inputs.timeReductionRate} suffix="%" onChange={(value) => setValue('timeReductionRate', value)} />
                <Field label="Upside lost leads recovered" helper="Used for the upside scenario." value={inputs.leadRecoveryRate} suffix="%" onChange={(value) => setValue('leadRecoveryRate', value)} />
              </div>
            )}
          </div>

          <aside className="rounded-hero border border-slate-200 bg-slate-50 p-5 shadow-[0_22px_70px_rgba(15,23,42,.08)] sm:p-6 lg:sticky lg:top-24">
            <h2 className="text-base font-extrabold text-slate-950">3. Your potential improvement range</h2>
            <div className="mt-5 rounded-2xl bg-brand-900 p-5 text-white shadow-sm">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-teal-200">Balanced estimate</p>
              <p className="mt-2 text-4xl font-black tracking-[-0.05em]">{money(results.balanced.monthlyImpact)}</p>
              <p className="text-sm font-bold text-slate-300">per month, not guaranteed revenue</p>
              <div className="mt-5 grid gap-2 text-sm">
                <div className="flex justify-between rounded-xl border border-white/15 px-3 py-2"><span>Conservative</span><strong>{money(results.conservative.monthlyImpact)}/mo</strong></div>
                <div className="flex justify-between rounded-xl border border-teal-300 bg-teal-400/10 px-3 py-2 text-teal-100"><span>Balanced</span><strong>{money(results.balanced.monthlyImpact)}/mo</strong></div>
                <div className="flex justify-between rounded-xl border border-white/15 px-3 py-2"><span>Upside</span><strong>{money(results.upside.monthlyImpact)}/mo</strong></div>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <ResultRow label="Balanced recovered leads/month" value={rounded(results.balanced.leadsRecovered)} />
              <ResultRow label="Balanced monthly time savings" value={money(results.balanced.monthlyTimeSavings)} />
              <ResultRow label="SETU Flow plan cost" value={`${money(results.balanced.planCost)}/mo`} />
              <ResultRow label="Balanced net improvement" value={money(results.balanced.netImpact)} highlight />
              <ResultRow label="Balanced payback estimate" value={payback(results.balanced.paybackMonths)} />
            </div>
            {!calculated && <p className="mt-4 rounded-xl bg-white px-4 py-3 text-xs leading-5 text-slate-500">Results are showing the default example. Tap Calculate after entering your numbers.</p>}
            <p className="mt-4 text-xs leading-5 text-slate-500">Conservative uses 20% time reduction and 10% lead recovery. Balanced uses 25% time reduction and 15% lead recovery. Upside uses your optional assumptions. Current lead-loss estimate: {rounded(results.lossRate)}%.</p>
            <div className="mt-5 grid gap-3">
              <button type="button" onClick={() => openReportModal('book_demo')} className="flex w-full items-center justify-center rounded-xl bg-teal-600 px-5 py-4 text-sm font-extrabold text-white transition hover:bg-teal-700">Book Demo With My ROI →</button>
              <button type="button" onClick={() => openReportModal('request_trial')} className="flex w-full items-center justify-center rounded-xl border border-teal-600 bg-white px-5 py-4 text-sm font-extrabold text-teal-700 transition hover:bg-teal-50">Request Trial Access</button>
              <button type="button" onClick={() => openReportModal('report_only')} className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50">Send My ROI Report</button>
            </div>
          </aside>
        </div>

        <div className="mt-8 rounded-panel border border-slate-200 bg-white p-5 shadow-[0_16px_48px_rgba(15,23,42,.05)]">
          <div className="grid gap-4 sm:grid-cols-4">
            <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Conservative</p><p className="mt-1 text-sm font-extrabold text-slate-950">20% time · 10% recovery</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Balanced</p><p className="mt-1 text-sm font-extrabold text-slate-950">25% time · 15% recovery</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">Upside</p><p className="mt-1 text-sm font-extrabold text-slate-950">{inputs.timeReductionRate}% time · {inputs.leadRecoveryRate}% recovery</p></div>
            <div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">SETU Flow plan</p><p className="mt-1 text-sm font-extrabold text-slate-950">{plans[inputs.plan].name} · {money(plans[inputs.plan].price)}/mo</p></div>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6">
          <div className="max-h-[92dvh] w-full overflow-y-auto overflow-x-hidden rounded-t-hero bg-white shadow-[0_32px_90px_rgba(15,23,42,.28)] sm:max-w-4xl sm:rounded-hero">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-4 backdrop-blur sm:p-6">
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.22em] text-teal-700 sm:text-[11px]">SETU Flow ROI Report</p><h2 className="mt-2 text-xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-2xl">Send your branded ROI report</h2><p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">We will email a SETU Guru-powered ROI summary with conservative, balanced, and upside scenarios.</p></div>
              <button type="button" onClick={() => setModalOpen(false)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-xl font-bold text-slate-500 hover:bg-slate-50">×</button>
            </div>
            <form onSubmit={submitReport} className="grid min-w-0 gap-5 p-4 sm:p-6 lg:grid-cols-[1fr_0.85fr]">
              <div className="grid min-w-0 gap-4">
                <label className="grid gap-2 text-sm font-bold text-slate-800">Full name *<input required value={contact.fullName} onChange={(event) => setContact((current) => ({ ...current, fullName: event.target.value }))} className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" /></label>
                <label className="grid gap-2 text-sm font-bold text-slate-800">Work email *<input required type="email" value={contact.email} onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))} className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" /></label>
                <label className="grid gap-2 text-sm font-bold text-slate-800">Company name *<input required value={contact.companyName} onChange={(event) => setContact((current) => ({ ...current, companyName: event.target.value }))} className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" /></label>
                <div className="grid min-w-0 gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-bold text-slate-800">Phone / WhatsApp<input value={contact.phone} onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))} className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" /></label><label className="grid gap-2 text-sm font-bold text-slate-800">Your role<input value={contact.role} onChange={(event) => setContact((current) => ({ ...current, role: event.target.value }))} className="min-w-0 rounded-xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" /></label></div>
              </div>
              <div className="grid min-w-0 gap-5">
                <div><p className="text-sm font-extrabold text-slate-950">Main workflow pain</p><div className="mt-3 grid min-w-0 gap-2">{painPoints.map((pain) => <RadioCard key={pain} name="pain" label={pain} checked={contact.mainPainPoint === pain} onChange={() => setContact((current) => ({ ...current, mainPainPoint: pain }))} />)}</div></div>
                <div><p className="text-sm font-extrabold text-slate-950">What would you like next?</p><div className="mt-3 grid min-w-0 gap-2">{([['report_only', 'Send my report only'], ['book_demo', 'Book a demo with these numbers'], ['request_trial', 'Request trial access']] as [NextStep, string][]).map(([value, label]) => <RadioCard key={value} name="nextStep" label={label} checked={contact.nextStep === value} onChange={() => setContact((current) => ({ ...current, nextStep: value }))} />)}</div></div>
                <div className="rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500"><strong className="text-slate-700">Summary:</strong> {money(results.balanced.monthlyImpact)} balanced monthly improvement, range {money(results.conservative.monthlyImpact)} to {money(results.upside.monthlyImpact)}, {plans[inputs.plan].name} plan.</div>
              </div>
              <div className="lg:col-span-2">
                {submitError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{submitError}</div>}
                {submitSuccess && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{submitSuccess}</div>}
                <button disabled={submitting || Boolean(submitSuccess)} type="submit" className="flex w-full items-center justify-center rounded-xl bg-teal-600 px-5 py-4 text-sm font-extrabold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Sending...' : contact.nextStep === 'request_trial' ? 'Send Trial Onboarding Email →' : contact.nextStep === 'book_demo' ? 'Send ROI Report & Demo Request →' : 'Send My ROI Report →'}</button>
                <p className="mt-3 text-center text-xs leading-5 text-slate-500">We respect your privacy. We’ll only use your details to send the report and follow up on your selected request.</p>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
