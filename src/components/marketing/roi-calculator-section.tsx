'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type PlanKey = 'starter' | 'growth';

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

const PLANS: Record<PlanKey, { name: string; price: number; users: string }> = {
  starter: { name: 'Starter', price: 199, users: 'Up to 5 users' },
  growth: { name: 'Growth', price: 499, users: 'Up to 10 users' },
};

const defaultInputs: RoiInputs = {
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

const benefitCards = [
  ['Recover lost leads & revenue', '↗'],
  ['Save hours of manual work every week', '◷'],
  ['Improve quote-to-order conversion', '▣'],
  ['Get a payback in less than a month', '✓'],
];

function money(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Math.max(0, value));
}

function number(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

function InputRow({
  label,
  helper,
  value,
  suffix,
  onChange,
}: {
  label: string;
  helper: string;
  value: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-3 border-b border-slate-100 py-4 last:border-0 sm:grid-cols-[1fr_12rem] sm:items-center">
      <span>
        <span className="block text-sm font-bold text-slate-950">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{helper}</span>
      </span>
      <span className="flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-100">
        <input
          type="number"
          min="0"
          value={value}
          onChange={(event) => onChange(Number(event.target.value) || 0)}
          className="w-full bg-transparent px-4 py-3 text-base font-bold text-slate-950 outline-none"
        />
        <span className="pr-4 text-xs font-semibold text-slate-400">{suffix}</span>
      </span>
    </label>
  );
}

function PlanButton({
  selected,
  name,
  price,
  users,
  onClick,
}: {
  selected: boolean;
  name: string;
  price: number;
  users: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
        selected ? 'border-teal-500 bg-teal-50 shadow-[0_12px_32px_rgba(13,148,136,.12)]' : 'border-slate-200 bg-white hover:border-teal-200'
      }`}
    >
      <span>
        <span className="block text-sm font-bold text-slate-950">{name}</span>
        <span className="mt-1 block text-xs font-semibold text-slate-500">${price}/month · {users}</span>
      </span>
      <span className={`flex h-5 w-5 items-center justify-center rounded-full border text-xs ${selected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 text-transparent'}`}>✓</span>
    </button>
  );
}

function ResultLine({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl px-4 py-3 ${highlight ? 'bg-teal-50 text-teal-800' : 'bg-white text-slate-950'}`}>
      <span className="text-xs font-semibold leading-5 text-slate-600">{label}</span>
      <span className={`text-sm font-extrabold ${highlight ? 'text-teal-700' : 'text-slate-950'}`}>{value}</span>
    </div>
  );
}

function AssumptionChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-extrabold text-slate-950">{value}</p>
    </div>
  );
}

function RoiCalculatorSection() {
  const [inputs, setInputs] = useState<RoiInputs>(defaultInputs);
  const [calculated, setCalculated] = useState(false);
  const [showAssumptions, setShowAssumptions] = useState(false);

  const results = useMemo(() => {
    const monthlyTimeSavings = inputs.weeklyChaseHours * 4.33 * inputs.hourlyCost * (inputs.timeReductionRate / 100);
    const leadsRecovered = inputs.leadsLost * (inputs.leadRecoveryRate / 100);
    const recoveredLeadValue = leadsRecovered * inputs.recoveredLeadValue;
    const monthlyImpact = monthlyTimeSavings + recoveredLeadValue;
    const planCost = PLANS[inputs.plan].price;
    const netImpact = monthlyImpact - planCost;
    const paybackMonths = monthlyImpact > 0 ? planCost / monthlyImpact : 0;
    const lossRate = inputs.leadsCaptured > 0 ? (inputs.leadsLost / inputs.leadsCaptured) * 100 : 0;

    return { monthlyTimeSavings, leadsRecovered, recoveredLeadValue, monthlyImpact, planCost, netImpact, paybackMonths, lossRate };
  }, [inputs]);

  const setField = (key: keyof RoiInputs, value: number | PlanKey) => {
    setInputs((current) => ({ ...current, [key]: value }));
    setCalculated(false);
  };

  const subject = encodeURIComponent('SETU Flow ROI report request');
  const body = encodeURIComponent(
    `Hi SETU Flow team,\n\nPlease send me a personalized ROI report.\n\nInputs:\n- People following up: ${inputs.people}\n- Leads captured/month: ${inputs.leadsCaptured}\n- Leads lost or missed/month: ${inputs.leadsLost}\n- Team hours chasing leads/week: ${inputs.weeklyChaseHours}\n- Average value per recovered lead: $${inputs.recoveredLeadValue}\n- Plan: ${PLANS[inputs.plan].name}\n\nEstimated monthly impact: ${money(results.monthlyImpact)}\nNet monthly impact: ${money(results.netImpact)}\n\nThanks.`,
  );

  return (
    <section id="roi-calculator" className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.5fr_0.78fr] lg:items-start">
          <div className="lg:pt-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-teal-700">ROI Calculator</p>
            <h2 className="mt-3 text-4xl font-semibold leading-[1.02] tracking-[-0.055em] text-slate-950 sm:text-5xl">
              How much are missed follow-ups costing your trade team?
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              Scattered leads, manual work, and missed follow-ups quietly impact your revenue. Enter a few numbers to estimate your potential monthly impact with SETU Flow CRM.
            </p>
            <div className="mt-7 grid gap-3">
              {benefitCards.map(([label, icon]) => (
                <div key={label} className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700">{icon}</span>
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl bg-blue-50 px-5 py-4 text-sm leading-6 text-slate-600">
              <span className="font-bold text-blue-700">ⓘ</span> This calculator provides an estimate based on your inputs and adjustable assumptions. Actual results may vary.
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_22px_70px_rgba(15,23,42,.08)] sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-base font-extrabold text-slate-950">1. Tell us a few details about your lead process</h3>
              <button type="button" onClick={() => { setInputs(defaultInputs); setCalculated(false); }} className="text-xs font-bold text-teal-700 hover:text-teal-800">Reset</button>
            </div>
            <div className="mt-4">
              <InputRow label="People following up on leads" helper="Sales reps, owners, coordinators, or anyone responsible for follow-up." value={inputs.people} suffix="people" onChange={(value) => setField('people', value)} />
              <InputRow label="Leads captured per month" helper="Include trade shows, website, WhatsApp, referrals, inbound calls, etc." value={inputs.leadsCaptured} suffix="leads" onChange={(value) => setField('leadsCaptured', value)} />
              <InputRow label="Leads lost or missed per month" helper="Leads not followed up properly, forgotten, delayed, or never assigned." value={inputs.leadsLost} suffix="leads" onChange={(value) => setField('leadsLost', value)} />
              <InputRow label="Team hours spent chasing leads per week" helper="Checking spreadsheets, WhatsApp, emails, reminders, updates, status checks, etc." value={inputs.weeklyChaseHours} suffix="hours" onChange={(value) => setField('weeklyChaseHours', value)} />
              <InputRow label="Average value per recovered lead" helper="Estimated profit, contribution, or business value of one recovered opportunity." value={inputs.recoveredLeadValue} suffix="USD" onChange={(value) => setField('recoveredLeadValue', value)} />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[250, 500, 1000].map((value) => (
                <button key={value} type="button" onClick={() => setField('recoveredLeadValue', value)} className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${inputs.recoveredLeadValue === value ? 'border-teal-500 bg-teal-50 text-teal-800' : 'border-slate-200 text-slate-700 hover:border-teal-200'}`}>
                  ${value}
                  <span className="mt-1 block text-[11px] font-semibold text-slate-400">{value === 250 ? 'Conservative' : value === 500 ? 'Typical' : 'High-value'}</span>
                </button>
              ))}
              <button type="button" className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700">Custom ✎</button>
            </div>

            <div className="mt-6">
              <h3 className="text-base font-extrabold text-slate-950">2. Choose the SETU Flow plan to compare</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <PlanButton selected={inputs.plan === 'starter'} name="Starter" price={199} users="Up to 5 users" onClick={() => setField('plan', 'starter')} />
                <PlanButton selected={inputs.plan === 'growth'} name="Growth" price={499} users="Up to 10 users" onClick={() => setField('plan', 'growth')} />
              </div>
            </div>

            <button type="button" onClick={() => setCalculated(true)} className="mt-5 flex w-full items-center justify-center rounded-xl bg-teal-600 px-5 py-4 text-sm font-extrabold text-white shadow-[0_16px_44px_rgba(13,148,136,.25)] transition hover:-translate-y-0.5 hover:bg-teal-700">
              Calculate My Savings →
            </button>

            <button type="button" onClick={() => setShowAssumptions((value) => !value)} className="mx-auto mt-4 flex text-xs font-bold text-teal-700">
              {showAssumptions ? 'Hide assumptions' : 'Adjust assumptions (optional)'}
            </button>
            {showAssumptions && (
              <div className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-3">
                <InputRow label="Average team cost" helper="Blended hourly cost." value={inputs.hourlyCost} suffix="USD/hr" onChange={(value) => setField('hourlyCost', value)} />
                <InputRow label="Time saved with SETU Flow" helper="Suggested: 35%." value={inputs.timeReductionRate} suffix="%" onChange={(value) => setField('timeReductionRate', value)} />
                <InputRow label="Lost leads recovered" helper="Suggested: 25%." value={inputs.leadRecoveryRate} suffix="%" onChange={(value) => setField('leadRecoveryRate', value)} />
              </div>
            )}
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 shadow-[0_22px_70px_rgba(15,23,42,.08)] sm:p-6 lg:sticky lg:top-6">
            <h3 className="text-base font-extrabold text-slate-950">3. Your estimated impact with SETU Flow CRM</h3>
            <div className="mt-5 grid gap-2">
              <ResultLine label="Monthly time savings" value={money(results.monthlyTimeSavings)} />
              <ResultLine label="Leads recovered per month" value={number(results.leadsRecovered)} />
              <ResultLine label="Estimated recovered lead value" value={money(results.recoveredLeadValue)} />
              <div className="rounded-2xl bg-white px-4 py-5 text-center shadow-sm">
                <p className="text-xs font-bold text-slate-500">Estimated monthly impact</p>
                <p className="mt-1 text-3xl font-extrabold tracking-[-0.04em] text-slate-950">{money(results.monthlyImpact)}</p>
              </div>
              <ResultLine label="SETU Flow plan cost" value={`${money(results.planCost)}/mo`} />
              <ResultLine label="Net monthly impact" value={money(results.netImpact)} highlight />
              <ResultLine label="Estimated payback" value={results.paybackMonths > 0 && results.paybackMonths < 1 ? 'Less than 1 month' : `${number(results.paybackMonths)} months`} />
            </div>
            {!calculated && <p className="mt-4 rounded-xl bg-white px-4 py-3 text-xs leading-5 text-slate-500">Results update from the default example. Tap Calculate My Savings after entering your real numbers.</p>}
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Using {money(inputs.hourlyCost)}/hour team cost, {inputs.timeReductionRate}% time reduction, and {inputs.leadRecoveryRate}% lost-lead recovery. Current estimated lead-loss rate: {number(results.lossRate)}%.
            </p>
            <a href={`mailto:admin@setugroups.com?subject=${subject}&body=${body}`} className="mt-5 flex w-full items-center justify-center rounded-xl border border-teal-600 bg-white px-5 py-4 text-sm font-extrabold text-teal-700 transition hover:bg-teal-50">
              Send My ROI Report →
            </a>
          </div>
        </div>

        <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_16px_48px_rgba(15,23,42,.05)]">
          <div className="grid gap-4 sm:grid-cols-4">
            <AssumptionChip label="Avg. team cost" value={`${money(inputs.hourlyCost)} / hour`} />
            <AssumptionChip label="Time saved" value={`${inputs.timeReductionRate}%`} />
            <AssumptionChip label="Lost leads recovered" value={`${inputs.leadRecoveryRate}%`} />
            <AssumptionChip label="SETU Flow plan" value={`${PLANS[inputs.plan].name} · ${money(PLANS[inputs.plan].price)}/mo`} />
          </div>
        </div>
      </div>
    </section>
  );
}

export function MarketingRoiCalculatorPlacement() {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (window.location.pathname !== '/') return;

    const existing = document.getElementById('setu-roi-calculator-portal');
    if (existing) {
      setTarget(existing);
      return;
    }

    const main = document.querySelector('main');
    if (!main) return;

    const sections = Array.from(main.querySelectorAll(':scope > section'));
    const comparisonSection = sections.find((section) => section.textContent?.includes('Where generic CRMs stop'));
    const mount = document.createElement('div');
    mount.id = 'setu-roi-calculator-portal';

    if (comparisonSection?.parentNode) {
      comparisonSection.parentNode.insertBefore(mount, comparisonSection);
    } else {
      main.appendChild(mount);
    }

    setTarget(mount);

    return () => {
      mount.remove();
    };
  }, []);

  if (!target) return null;
  return createPortal(<RoiCalculatorSection />, target);
}
