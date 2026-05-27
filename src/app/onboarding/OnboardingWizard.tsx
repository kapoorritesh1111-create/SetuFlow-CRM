'use client';

import { useRef, useState, useCallback } from 'react';
import { slugifyCompanyName } from '@/features/client-onboarding/shared';
import { MODULE_DEFINITIONS } from '@/lib/modules/module-grants';

// ─── Constants ────────────────────────────────────────────────────────────────

const MARKETS = ['North America', 'Middle East', 'Europe', 'Asia Pacific', 'South Asia', 'Africa', 'Latin America', 'Southeast Asia'];
const HQ_COUNTRIES = ['India', 'United Arab Emirates', 'United States', 'United Kingdom', 'Saudi Arabia', 'Germany', 'Singapore', 'Australia', 'Canada', 'Other'];
const INCOTERMS = ['FOB', 'CIF', 'EXW', 'DDP', 'CFR', 'Mix / Flexible'];
const CURRENCIES = ['USD', 'EUR', 'AED', 'INR', 'GBP', 'SGD'];

const DEFAULT_PIPELINE_STAGES = ['New lead', 'Qualified', 'Samples / documents', 'Quote sent', 'Negotiation', 'Won', 'Lost'];
const DEFAULT_PIPELINES = ['Buyer pipeline', 'Supplier pipeline'];
const DEFAULT_NEXT_STEPS = ['Call back', 'Send catalog', 'Send quote', 'Share sample details', 'Follow up after trade show', 'Schedule meeting'];

const MODULE_ICONS: Record<string, string> = {
  full_crm: '🏢',
  trade_show: '🎪',
  orders_compliance: '📦',
  setu_guru: '🤖',
  analytics: '📊',
  vcard: '💳',
};

const PLAN_OPTIONS = [
  { key: 'trial', label: '14-Day Free Trial', seats: 5, description: 'All modules included. No billing required. Perfect for evaluating Setu Flow with your team.', tag: 'No credit card', highlight: true },
  { key: 'starter', label: 'Starter', seats: 10, description: 'Up to 10 users. Core CRM modules. Ideal for small export teams getting started.', tag: null, highlight: false },
  { key: 'growth', label: 'Growth', seats: 25, description: 'Up to 25 users. Full module access. Built for growing trade operations.', tag: 'Most popular', highlight: false },
  { key: 'professional', label: 'Professional', seats: 50, description: 'Up to 50 users. Priority support, advanced analytics and Guru AI limits.', tag: null, highlight: false },
  { key: 'enterprise', label: 'Enterprise', seats: 200, description: 'Unlimited users, custom integrations, dedicated onboarding, and SLA.', tag: null, highlight: false },
];

const STEPS = [
  { id: 'workspace', label: 'Workspace', short: 'Company & workspace' },
  { id: 'logo', label: 'Brand', short: 'Logo & identity' },
  { id: 'admin', label: 'Admin', short: 'Team & admin access' },
  { id: 'markets', label: 'Markets', short: 'Markets & workflow' },
  { id: 'modules', label: 'Modules', short: 'Feature selection' },
  { id: 'plan', label: 'Plan', short: 'Plan & trial' },
  { id: 'review', label: 'Review', short: 'Final review' },
];

// ─── Small helpers ─────────────────────────────────────────────────────────────

function cn(...classes: (string | false | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="block text-sm font-semibold text-slate-800">
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </span>
  );
}

function Input({ name, value, onChange, placeholder, type = 'text', required }: {
  name: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <input
      name={name} type={type} required={required} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
    />
  );
}

function TagInput({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  const add = (v: string) => {
    const clean = v.trim();
    if (clean && !tags.includes(clean)) onChange([...tags, clean]);
    setDraft('');
  };
  return (
    <div className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))} className="ml-0.5 text-blue-400 hover:text-blue-700">×</button>
          </span>
        ))}
        <input
          value={draft} placeholder={tags.length === 0 ? placeholder : 'Add more…'}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); } }}
          onBlur={() => { if (draft.trim()) add(draft); }}
          className="min-w-[140px] flex-1 bg-transparent py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}

function CheckCard({ checked, onChange, label, description, icon, badge }: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; description?: string; icon?: string; badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'group relative w-full rounded-2xl border p-4 text-left transition',
        checked ? 'border-blue-300 bg-blue-50 shadow-[inset_0_0_0_2px_#2563eb22]' : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
      )}
    >
      {badge && <span className="absolute right-3 top-3 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">{badge}</span>}
      <div className="flex items-start gap-3">
        {icon && <span className="mt-0.5 text-xl leading-none">{icon}</span>}
        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-semibold', checked ? 'text-blue-900' : 'text-slate-900')}>{label}</p>
          {description && <p className={cn('mt-1 text-xs leading-5', checked ? 'text-blue-700' : 'text-slate-500')}>{description}</p>}
        </div>
        <span className={cn(
          'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2',
          checked ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300',
        )}>
          {checked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </span>
      </div>
    </button>
  );
}

function StepIndicator({ steps, activeIndex }: { steps: typeof STEPS; activeIndex: number }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {steps.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <div key={step.id} className="flex flex-shrink-0 items-center">
            <div className={cn(
              'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
              active ? 'bg-slate-950 text-white' : done ? 'bg-emerald-50 text-emerald-700' : 'bg-transparent text-slate-400',
            )}>
              <span className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                active ? 'bg-white/20 text-white' : done ? 'bg-emerald-200 text-emerald-800' : 'bg-slate-100 text-slate-500',
              )}>
                {done ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-px w-4 flex-shrink-0 transition-colors', done ? 'bg-emerald-300' : 'bg-slate-200')} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── State ────────────────────────────────────────────────────────────────────

type WizardState = {
  // Step 1 — Workspace
  company_name: string;
  website: string;
  headquarters_country: string;
  // Step 2 — Logo
  logo_url: string;
  logo_file: File | null;
  logo_preview: string;
  logo_tab: 'file' | 'url';
  // Step 3 — Admin & Team
  primary_admin_name: string;
  primary_admin_email: string;
  primary_phone: string;
  requested_seat_count: number;
  additional_notes: string;
  // Step 4 — Markets & Workflow
  requested_markets: string[];
  requested_countries: string[];
  requested_pipelines: string[];
  requested_pipeline_stages: string[];
  requested_next_steps: string[];
  wants_trade_events: boolean;
  pricing_rules_notes: string;
  // Step 5 — Modules
  requested_modules: string[];
  // Step 6 — Plan
  requested_plan: string;
  is_trial_request: boolean;
};

function initState(): WizardState {
  return {
    company_name: '', website: '', headquarters_country: 'India',
    logo_url: '', logo_file: null, logo_preview: '', logo_tab: 'file',
    primary_admin_name: '', primary_admin_email: '', primary_phone: '',
    requested_seat_count: 5, additional_notes: '',
    requested_markets: ['North America', 'Middle East', 'Europe', 'Asia Pacific'],
    requested_countries: ['United States', 'United Arab Emirates'],
    requested_pipelines: [...DEFAULT_PIPELINES],
    requested_pipeline_stages: [...DEFAULT_PIPELINE_STAGES],
    requested_next_steps: [...DEFAULT_NEXT_STEPS],
    wants_trade_events: false,
    pricing_rules_notes: '',
    requested_modules: MODULE_DEFINITIONS.map((m) => m.key),
    requested_plan: 'trial',
    is_trial_request: true,
  };
}

// ─── Main wizard ───────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(initState);
  const [errors, setErrors] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = useCallback(<K extends keyof WizardState>(key: K, value: WizardState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
  }, []);

  const workspaceDomain = state.company_name
    ? `${slugifyCompanyName(state.company_name)}.setuflowcrm.com`
    : 'yourcompany.setuflowcrm.com';

  // Validate current step before advancing
  function validate() {
    const errs: string[] = [];
    if (step === 0 && !state.company_name.trim()) errs.push('Company name is required.');
    if (step === 2) {
      if (!state.primary_admin_name.trim()) errs.push('Admin name is required.');
      if (!state.primary_admin_email.trim() || !state.primary_admin_email.includes('@')) errs.push('A valid admin email is required.');
    }
    if (step === 4 && state.requested_modules.length === 0) errs.push('Please select at least one module.');
    setErrors(errs);
    return errs.length === 0;
  }

  function next() { if (validate()) { setErrors([]); setStep((s) => Math.min(s + 1, STEPS.length - 1)); } }
  function back() { setErrors([]); setStep((s) => Math.max(s - 1, 0)); }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setErrors(['Logo file must be under 2 MB.']); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      set('logo_preview', ev.target?.result as string);
      set('logo_file', file);
    };
    reader.readAsDataURL(file);
  }

  function toggleModule(key: string) {
    set('requested_modules',
      state.requested_modules.includes(key)
        ? state.requested_modules.filter((k) => k !== key)
        : [...state.requested_modules, key],
    );
  }

  function handlePlanSelect(planKey: string) {
    const isTrial = planKey === 'trial';
    const plan = PLAN_OPTIONS.find((p) => p.key === planKey);
    setState((s) => ({
      ...s,
      requested_plan: planKey,
      is_trial_request: isTrial,
      requested_seat_count: isTrial ? 5 : (plan?.seats ?? s.requested_seat_count),
      requested_modules: isTrial ? MODULE_DEFINITIONS.map((m) => m.key) : s.requested_modules,
    }));
  }

  // ── Render steps ─────────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {

      // ── 1. Workspace ─────────────────────────────────────────────────────────
      case 0: return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <Label required>Company name</Label>
              <Input name="company_name" value={state.company_name} onChange={(v) => set('company_name', v)} placeholder="Your company name" required />
            </label>
            <label className="block">
              <Label>Website</Label>
              <Input name="website" type="url" value={state.website} onChange={(v) => set('website', v)} placeholder="https://example.com" />
            </label>
          </div>
          <label className="block">
            <Label>Headquarters country</Label>
            <select
              name="headquarters_country"
              value={state.headquarters_country}
              onChange={(e) => set('headquarters_country', e.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              {HQ_COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          {state.company_name.trim() && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Your reserved workspace URL</p>
              <p className="mt-1 text-sm font-semibold text-brand-primary">{workspaceDomain}</p>
              <p className="mt-1 text-xs text-slate-400">This is auto-generated from your company name. The Setu Flow team can adjust it before go-live.</p>
            </div>
          )}
        </div>
      );

      // ── 2. Logo ───────────────────────────────────────────────────────────────
      case 1: return (
        <div className="space-y-5">
          <p className="text-sm text-slate-500">Your logo appears in your workspace, emails, and client-facing documents. You can update it anytime from Admin settings after setup.</p>
          <div className="flex gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
            {(['file', 'url'] as const).map((tab) => (
              <button key={tab} type="button" onClick={() => set('logo_tab', tab)}
                className={cn('flex-1 rounded-xl py-2 text-sm font-semibold transition',
                  state.logo_tab === tab ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                )}>
                {tab === 'file' ? 'Upload file' : 'Enter URL'}
              </button>
            ))}
          </div>

          {state.logo_tab === 'file' ? (
            <div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'group flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition',
                  state.logo_preview ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/40',
                )}
              >
                {state.logo_preview ? (
                  <img src={state.logo_preview} alt="Logo preview" className="h-16 w-auto max-w-[200px] rounded-xl object-contain" />
                ) : (
                  <svg className="h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                )}
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-700">{state.logo_preview ? 'Click to change' : 'Click to upload'}</p>
                  <p className="mt-1 text-xs text-slate-400">PNG, JPG, SVG or WebP — max 2 MB</p>
                </div>
              </button>
              <input ref={fileRef} type="file" name="logo_file" accept="image/*" className="sr-only" onChange={handleFileSelect} />
            </div>
          ) : (
            <label className="block">
              <Label>Logo URL</Label>
              <Input name="logo_url" value={state.logo_url} onChange={(v) => set('logo_url', v)} placeholder="https://yourcompany.com/logo.png" />
              {state.logo_url && (
                <img src={state.logo_url} alt="Preview" className="mt-3 h-12 w-auto rounded-xl object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
              )}
            </label>
          )}
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
            If no logo is provided, the Setu Flow logo is used in your workspace until you upload one in Admin settings.
          </div>
        </div>
      );

      // ── 3. Admin & Team ──────────────────────────────────────────────────────
      case 2: return (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <Label required>Primary admin name</Label>
              <Input name="primary_admin_name" value={state.primary_admin_name} onChange={(v) => set('primary_admin_name', v)} placeholder="Full name" required />
            </label>
            <label className="block">
              <Label required>Primary admin email</Label>
              <Input name="primary_admin_email" type="email" value={state.primary_admin_email} onChange={(v) => set('primary_admin_email', v)} placeholder="admin@yourcompany.com" required />
            </label>
          </div>
          <label className="block">
            <Label>Phone / WhatsApp</Label>
            <Input name="primary_phone" value={state.primary_phone} onChange={(v) => set('primary_phone', v)} placeholder="+91 98765 43210" />
          </label>
          <div>
            <Label>Number of users to set up</Label>
            <p className="mt-1 text-xs text-slate-500">How many team members need access from day one? You can add more after setup.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[5, 10, 15, 25, 50, 100].map((n) => (
                <button
                  key={n} type="button"
                  onClick={() => set('requested_seat_count', n)}
                  className={cn(
                    'rounded-xl border px-4 py-2 text-sm font-semibold transition',
                    state.requested_seat_count === n
                      ? 'border-slate-900 bg-slate-950 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                  )}
                >
                  {n} users
                </button>
              ))}
              <div className="flex items-center gap-2">
                <input
                  type="number" min="1" max="500"
                  value={state.requested_seat_count}
                  onChange={(e) => set('requested_seat_count', parseInt(e.target.value, 10) || 5)}
                  className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
                />
                <span className="text-xs text-slate-400">custom</span>
              </div>
            </div>
          </div>
          <label className="block">
            <Label>Additional setup notes</Label>
            <textarea
              name="additional_notes"
              rows={3}
              value={state.additional_notes}
              onChange={(e) => set('additional_notes', e.target.value)}
              placeholder="Any specific team structure, role requirements, or setup preferences…"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>
      );

      // ── 4. Markets & Workflow ────────────────────────────────────────────────
      case 3: return (
        <div className="space-y-6">
          <div>
            <Label>Target markets</Label>
            <p className="mt-1 text-xs text-slate-500">Select the regions your team actively sells into.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MARKETS.map((m) => (
                <CheckCard
                  key={m} label={m}
                  checked={state.requested_markets.includes(m)}
                  onChange={(v) => set('requested_markets', v ? [...state.requested_markets, m] : state.requested_markets.filter((x) => x !== m))}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>Key countries</Label>
            <p className="mt-1 text-xs text-slate-500">Type a country and press Enter to add.</p>
            <TagInput tags={state.requested_countries} onChange={(t) => set('requested_countries', t)} placeholder="e.g. United States" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Pipelines to activate</Label>
              <div className="mt-2 space-y-2">
                {DEFAULT_PIPELINES.map((p) => (
                  <CheckCard key={p} label={p}
                    checked={state.requested_pipelines.includes(p)}
                    onChange={(v) => set('requested_pipelines', v ? [...state.requested_pipelines, p] : state.requested_pipelines.filter((x) => x !== p))}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Pipeline stages</Label>
              <p className="mt-1 text-xs text-slate-500">Edit or add stages.</p>
              <TagInput tags={state.requested_pipeline_stages} onChange={(t) => set('requested_pipeline_stages', t)} placeholder="Add stage…" />
            </div>
          </div>
          <div>
            <Label>Follow-up next steps</Label>
            <TagInput tags={state.requested_next_steps} onChange={(t) => set('requested_next_steps', t)} placeholder="Add activity…" />
          </div>
          <CheckCard
            label="Enable trade events from day one"
            description="Show / event capture, QR contact exchange, and post-event follow-up workflows pre-configured at setup."
            icon="🎪"
            checked={state.wants_trade_events}
            onChange={(v) => set('wants_trade_events', v)}
          />
          <label className="block">
            <Label>Pricing & quoting notes</Label>
            <textarea
              name="pricing_rules_notes"
              rows={2}
              value={state.pricing_rules_notes}
              onChange={(e) => set('pricing_rules_notes', e.target.value)}
              placeholder="FOB/CIF/EXW preferences, customer tiers, multi-currency requirements, approval thresholds…"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </label>
        </div>
      );

      // ── 5. Modules ───────────────────────────────────────────────────────────
      case 4: return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <strong>All modules are on by default.</strong> Deselect anything you don't need at launch — your Setu Flow admin can enable or disable them at any time from Client Management.
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {MODULE_DEFINITIONS.map((mod) => (
              <CheckCard
                key={mod.key}
                label={mod.title}
                description={mod.subtitle}
                icon={MODULE_ICONS[mod.key]}
                badge={mod.key === 'full_crm' ? 'Core' : undefined}
                checked={state.requested_modules.includes(mod.key)}
                onChange={() => {
                  if (mod.key === 'full_crm') return; // Core module always on
                  toggleModule(mod.key);
                }}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400">* Full CRM is always included — it is the core workspace and cannot be deselected.</p>
        </div>
      );

      // ── 6. Plan ───────────────────────────────────────────────────────────────
      case 5: return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Billing is not set up in this form.</strong> Select your intended plan so the Setu Flow team can provision the right workspace. Payment will be arranged separately after setup.
          </div>
          <div className="space-y-3">
            {PLAN_OPTIONS.map((plan) => {
              const active = state.requested_plan === plan.key;
              return (
                <button
                  key={plan.key}
                  type="button"
                  onClick={() => handlePlanSelect(plan.key)}
                  className={cn(
                    'group relative w-full rounded-2xl border p-4 text-left transition',
                    active
                      ? 'border-slate-900 bg-slate-950 text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)]'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                  )}
                >
                  {plan.tag && (
                    <span className={cn(
                      'absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                      active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700',
                    )}>{plan.tag}</span>
                  )}
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      'mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2',
                      active ? 'border-white bg-white text-slate-950' : 'border-slate-300',
                    )}>
                      {active && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </span>
                    <div>
                      <p className={cn('font-semibold', active ? 'text-white' : 'text-slate-900')}>{plan.label}</p>
                      <p className={cn('mt-1 text-xs leading-5', active ? 'text-slate-300' : 'text-slate-500')}>{plan.description}</p>
                      <p className={cn('mt-1 text-xs font-semibold', active ? 'text-slate-300' : 'text-slate-400')}>
                        Up to {plan.seats} {plan.key === 'enterprise' ? '' : ''}users
                        {plan.key === 'trial' ? ' · 14-day free trial' : ' · billing arranged post-setup'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );

      // ── 7. Review ────────────────────────────────────────────────────────────
      case 6: {
        const planLabel = PLAN_OPTIONS.find((p) => p.key === state.requested_plan)?.label ?? state.requested_plan;
        return (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Review your details below then submit. The Setu Flow team will be notified immediately and will provision your workspace.
            </div>
            <ReviewSection title="Workspace">
              <ReviewRow label="Company" value={state.company_name} />
              <ReviewRow label="Domain" value={workspaceDomain} accent />
              {state.website && <ReviewRow label="Website" value={state.website} />}
              <ReviewRow label="HQ country" value={state.headquarters_country} />
            </ReviewSection>
            <ReviewSection title="Brand">
              {(state.logo_preview || state.logo_url) ? (
                <div className="flex items-center gap-3">
                  <img src={state.logo_preview || state.logo_url} alt="" className="h-10 w-auto rounded-xl object-contain" />
                  <span className="text-sm text-slate-600">Logo provided</span>
                </div>
              ) : <p className="text-sm text-slate-400">Using Setu Flow default logo until uploaded in settings</p>}
            </ReviewSection>
            <ReviewSection title="Admin & Team">
              <ReviewRow label="Admin" value={`${state.primary_admin_name} · ${state.primary_admin_email}`} />
              {state.primary_phone && <ReviewRow label="Phone" value={state.primary_phone} />}
              <ReviewRow label="Requested seats" value={`${state.requested_seat_count} users`} />
            </ReviewSection>
            <ReviewSection title="Markets">
              <ReviewRow label="Markets" value={state.requested_markets.join(', ') || '—'} />
              <ReviewRow label="Countries" value={state.requested_countries.join(', ') || '—'} />
              <ReviewRow label="Trade events" value={state.wants_trade_events ? 'Enabled from day one' : 'Not enabled at setup'} />
            </ReviewSection>
            <ReviewSection title="Modules selected">
              <div className="flex flex-wrap gap-1.5">
                {MODULE_DEFINITIONS.filter((m) => state.requested_modules.includes(m.key)).map((m) => (
                  <span key={m.key} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
                    {MODULE_ICONS[m.key]} {m.title}
                  </span>
                ))}
              </div>
            </ReviewSection>
            <ReviewSection title="Plan">
              <ReviewRow label="Plan" value={planLabel} />
              <ReviewRow label="Seats" value={`${state.requested_seat_count} users`} />
              {state.is_trial_request && <p className="mt-1 text-xs text-slate-400">14-day free trial · no billing required at this stage</p>}
              {!state.is_trial_request && <p className="mt-1 text-xs text-slate-400">Billing will be arranged by the Setu Flow team after workspace setup</p>}
            </ReviewSection>
          </div>
        );
      }

      default: return null;
    }
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="overflow-x-auto">
        <StepIndicator steps={STEPS} activeIndex={step} />
      </div>

      {/* Step header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          Step {step + 1} of {STEPS.length} — {STEPS[step]?.short}
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className="text-sm font-semibold text-rose-800">Please fix the following:</p>
          <ul className="mt-1 space-y-0.5 text-sm text-rose-700">
            {errors.map((e) => <li key={e}>• {e}</li>)}
          </ul>
        </div>
      )}

      {/* Hidden form for submission */}
      <form
        ref={formRef}
        action="/api/public/client-onboarding"
        method="post"
        encType="multipart/form-data"
        className="hidden"
        id="wizard-form"
      >
        <input name="company_name" value={state.company_name} readOnly />
        <input name="website" value={state.website} readOnly />
        <input name="headquarters_country" value={state.headquarters_country} readOnly />
        <input name="primary_admin_name" value={state.primary_admin_name} readOnly />
        <input name="primary_admin_email" value={state.primary_admin_email} readOnly />
        <input name="primary_phone" value={state.primary_phone} readOnly />
        <input name="logo_url" value={state.logo_tab === 'url' ? state.logo_url : ''} readOnly />
        <input name="requested_seat_count" value={state.requested_seat_count} readOnly />
        <input name="requested_markets" value={state.requested_markets.join('\n')} readOnly />
        <input name="requested_countries" value={state.requested_countries.join('\n')} readOnly />
        <input name="requested_pipelines" value={state.requested_pipelines.join('\n')} readOnly />
        <input name="requested_pipeline_stages" value={state.requested_pipeline_stages.join('\n')} readOnly />
        <input name="requested_next_steps" value={state.requested_next_steps.join('\n')} readOnly />
        <input name="pricing_rules_notes" value={state.pricing_rules_notes} readOnly />
        <input name="additional_notes" value={state.additional_notes} readOnly />
        {state.wants_trade_events && <input name="wants_trade_events" value="on" readOnly />}
        {state.requested_modules.map((m) => <input key={m} name="requested_modules" value={m} readOnly />)}
        <input name="requested_plan" value={state.requested_plan} readOnly />
        {state.is_trial_request && <input name="is_trial_request" value="on" readOnly />}
      </form>

      {/* File input for logo (outside hidden form so it can be shown) */}
      {step === 1 && state.logo_tab === 'file' && state.logo_file && (
        <div id="file-transfer-note" className="hidden" />
      )}

      {/* Step content */}
      <div className="min-h-[320px]">
        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-5">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="inline-flex min-h-11 items-center rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40"
        >
          ← Back
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-400 sm:block">
            {step + 1} / {STEPS.length}
          </span>
          {isLastStep ? (
            <button
              type="button"
              onClick={() => {
                // Attach logo file if present, then submit
                if (state.logo_file && state.logo_tab === 'file') {
                  const dt = new DataTransfer();
                  dt.items.add(state.logo_file);
                  const fileInput = formRef.current?.querySelector('input[name="logo_file"]') as HTMLInputElement | null;
                  if (fileInput) fileInput.files = dt.files;
                }
                formRef.current?.submit();
              }}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-[0_4px_20px_rgba(5,150,105,0.3)] transition hover:bg-emerald-700"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Submit workspace request
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-950 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Review helpers ────────────────────────────────────────────────────────────

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className={cn('text-right text-xs font-semibold', accent ? 'text-brand-primary' : 'text-slate-800')}>{value}</span>
    </div>
  );
}
