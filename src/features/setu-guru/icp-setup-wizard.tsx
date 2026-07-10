'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';

import { GuruAvatar } from '@/components/ui/guru-avatar';
import {
  workspaceFieldSurfaceClass,
  workspaceHeroClass,
  workspacePanelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from '@/components/ui/workspace-surfaces';
import { cn } from '@/lib/utils';
import type { IcpProfile, IcpProfileInput } from '@/lib/setu-guru/icp';

type IcpFormState = {
  name: string;
  products: string;
  target_countries: string;
  buyer_types: string;
  supplier_types: string;
  moq_note: string;
  preferred_currency: string;
  available_documents: string;
  required_documents: string;
  outreach_channel: '' | 'whatsapp' | 'email' | 'linkedin';
  outreach_tone: '' | 'short' | 'warm' | 'professional' | 'trade_show_follow_up';
};

const EMPTY_FORM: IcpFormState = {
  name: 'Default ICP',
  products: '',
  target_countries: '',
  buyer_types: '',
  supplier_types: '',
  moq_note: '',
  preferred_currency: '',
  available_documents: '',
  required_documents: '',
  outreach_channel: '',
  outreach_tone: '',
};

const STEPS = [
  { key: 'products', title: 'Products', description: 'What you sell or source.' },
  { key: 'markets', title: 'Markets', description: 'Target countries and pricing currency.' },
  { key: 'buyers', title: 'Buyer types', description: 'Who Setu Guru should prioritize.' },
  { key: 'suppliers', title: 'Supplier needs', description: 'Sourcing profile for RFQs.' },
  { key: 'moq', title: 'MOQ & pricing', description: 'Quote assistant constraints.' },
  { key: 'documents', title: 'Documents', description: 'Compliance gap detection.' },
  { key: 'outreach', title: 'Outreach preferences', description: 'Consistent AI-generated messages.' },
] as const;

function listToText(value?: string[] | null) {
  return (value ?? []).join(', ');
}

function textToList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function toFormState(profile: IcpProfile | null): IcpFormState {
  if (!profile) return EMPTY_FORM;
  return {
    name: profile.name || 'Default ICP',
    products: listToText(profile.products),
    target_countries: listToText(profile.target_countries),
    buyer_types: listToText(profile.buyer_types),
    supplier_types: listToText(profile.supplier_types),
    moq_note: typeof profile.moq_rules?.note === 'string' ? (profile.moq_rules.note as string) : '',
    preferred_currency: profile.preferred_currency || '',
    available_documents: listToText(profile.available_documents),
    required_documents: listToText(profile.required_documents),
    outreach_channel: (profile.outreach_channel as IcpFormState['outreach_channel']) || '',
    outreach_tone: (profile.outreach_tone as IcpFormState['outreach_tone']) || '',
  };
}

function toPayload(form: IcpFormState): IcpProfileInput {
  return {
    name: form.name,
    products: textToList(form.products),
    target_countries: textToList(form.target_countries),
    buyer_types: textToList(form.buyer_types),
    supplier_types: textToList(form.supplier_types),
    moq_rules: form.moq_note ? { note: form.moq_note } : {},
    preferred_currency: form.preferred_currency || null,
    available_documents: textToList(form.available_documents),
    required_documents: textToList(form.required_documents),
    outreach_channel: form.outreach_channel || null,
    outreach_tone: form.outreach_tone || null,
  };
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-content-primary">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-content-muted">{hint}</span> : null}
      <div className="mt-2">{children}</div>
    </label>
  );
}

export function IcpSetupWizard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<IcpFormState>(EMPTY_FORM);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/setu-guru/icp', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (cancelled) return;
        setForm(toFormState(body.profile ?? null));
      })
      .catch(() => {
        if (!cancelled) setError('Could not load your existing ICP profile. You can still fill it in below.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const activeStep = STEPS[step];
  const isLastStep = step === STEPS.length - 1;
  const isFirstStep = step === 0;

  const progressLabel = useMemo(() => `Step ${step + 1} of ${STEPS.length}`, [step]);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/setu-guru/icp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toPayload(form)),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error || 'Setu Guru could not save the ICP profile.');
      }
      setForm(toFormState(body.profile ?? null));
      setSavedAt(new Date().toISOString());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Setu Guru could not save the ICP profile.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="space-y-5 pb-10">
      <section className={workspaceHeroClass}>
        <div className="flex flex-col gap-4 p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
          <div className="flex items-start gap-4">
            <GuruAvatar size="lg" />
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-accent-700">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Setu Guru
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary sm:text-3xl">ICP Setup Wizard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-content-secondary sm:text-base">
                Tell Setu Guru what you sell, where you sell it, and who you work with. This context grounds every
                fit score, research summary, and outreach draft — nothing is invented beyond what you enter here.
              </p>
            </div>
          </div>
          <Link
            href="/growth-agent"
            className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold')}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Growth Center
          </Link>
        </div>
      </section>

      <section className={cn(workspacePanelClass, 'p-5 lg:p-6')}>
        <div className="flex flex-wrap items-center gap-2">
          {STEPS.map((item, index) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setStep(index)}
              className={cn(
                'flex min-h-9 items-center gap-2 rounded-ctl border px-3 text-xs font-semibold transition',
                index === step
                  ? 'border-brand-700 bg-brand-700 text-white'
                  : index < step
                    ? 'border-line bg-surface-2 text-content-secondary'
                    : 'border-line bg-surface-1 text-content-muted hover:bg-surface-2',
              )}
            >
              {index < step ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
              {item.title}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mt-6 flex items-center gap-2 text-sm text-content-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading your ICP profile…
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div>
              <p className="text-caption uppercase text-content-muted">{progressLabel}</p>
              <h2 className="mt-1 text-xl font-semibold text-content-primary">{activeStep.title}</h2>
              <p className="mt-1 text-sm text-content-secondary">{activeStep.description}</p>
            </div>

            {activeStep.key === 'products' ? (
              <Field label="Products or product categories" hint="Comma-separated, e.g. Vacuum-cooked snacks, Banana chips, Beetroot chips">
                <textarea
                  className={cn(workspaceFieldSurfaceClass, 'min-h-24 w-full rounded-ctl border px-3 py-2 text-sm')}
                  value={form.products}
                  onChange={(event) => setForm((prev) => ({ ...prev, products: event.target.value }))}
                  placeholder="Vacuum-cooked snacks, Banana chips, Beetroot chips"
                />
              </Field>
            ) : null}

            {activeStep.key === 'markets' ? (
              <div className="space-y-4">
                <Field label="Target countries" hint="Comma-separated, e.g. UAE, UK, Germany, Qatar">
                  <input
                    className={cn(workspaceFieldSurfaceClass, 'h-10 w-full rounded-ctl border px-3 text-sm')}
                    value={form.target_countries}
                    onChange={(event) => setForm((prev) => ({ ...prev, target_countries: event.target.value }))}
                    placeholder="UAE, UK, Germany, Qatar"
                  />
                </Field>
                <Field label="Preferred quote currency">
                  <input
                    className={cn(workspaceFieldSurfaceClass, 'h-10 w-full max-w-xs rounded-ctl border px-3 text-sm')}
                    value={form.preferred_currency}
                    onChange={(event) => setForm((prev) => ({ ...prev, preferred_currency: event.target.value.toUpperCase() }))}
                    placeholder="USD"
                    maxLength={10}
                  />
                </Field>
              </div>
            ) : null}

            {activeStep.key === 'buyers' ? (
              <Field label="Buyer types" hint="Comma-separated, e.g. Importer, Distributor, Retailer, Private label, HoReCa, Wholesaler">
                <input
                  className={cn(workspaceFieldSurfaceClass, 'h-10 w-full rounded-ctl border px-3 text-sm')}
                  value={form.buyer_types}
                  onChange={(event) => setForm((prev) => ({ ...prev, buyer_types: event.target.value }))}
                  placeholder="Importer, Distributor, Retailer"
                />
              </Field>
            ) : null}

            {activeStep.key === 'suppliers' ? (
              <Field label="Supplier categories or capabilities" hint="Comma-separated, e.g. Vacuum-fry co-packer, Cold chain logistics">
                <input
                  className={cn(workspaceFieldSurfaceClass, 'h-10 w-full rounded-ctl border px-3 text-sm')}
                  value={form.supplier_types}
                  onChange={(event) => setForm((prev) => ({ ...prev, supplier_types: event.target.value }))}
                  placeholder="Vacuum-fry co-packer, Cold chain logistics"
                />
              </Field>
            ) : null}

            {activeStep.key === 'moq' ? (
              <Field label="MOQ and pricing rules" hint="Plain-language note Setu Guru can reference, e.g. 10 cases per SKU minimum">
                <textarea
                  className={cn(workspaceFieldSurfaceClass, 'min-h-24 w-full rounded-ctl border px-3 py-2 text-sm')}
                  value={form.moq_note}
                  onChange={(event) => setForm((prev) => ({ ...prev, moq_note: event.target.value }))}
                  placeholder="10 cases per SKU minimum. Standard freight basis is CIF."
                />
              </Field>
            ) : null}

            {activeStep.key === 'documents' ? (
              <div className="space-y-4">
                <Field label="Documents you usually have available" hint="Comma-separated, e.g. Ingredients, Shelf-life, Nutrition panel, Product photos">
                  <input
                    className={cn(workspaceFieldSurfaceClass, 'h-10 w-full rounded-ctl border px-3 text-sm')}
                    value={form.available_documents}
                    onChange={(event) => setForm((prev) => ({ ...prev, available_documents: event.target.value }))}
                    placeholder="Ingredients, Shelf-life, Nutrition panel"
                  />
                </Field>
                <Field label="Documents you typically require from suppliers" hint="Comma-separated, e.g. FSSAI license, ISO certificate">
                  <input
                    className={cn(workspaceFieldSurfaceClass, 'h-10 w-full rounded-ctl border px-3 text-sm')}
                    value={form.required_documents}
                    onChange={(event) => setForm((prev) => ({ ...prev, required_documents: event.target.value }))}
                    placeholder="FSSAI license, ISO certificate"
                  />
                </Field>
              </div>
            ) : null}

            {activeStep.key === 'outreach' ? (
              <div className="space-y-4">
                <Field label="Default outreach channel">
                  <select
                    className={cn(workspaceFieldSurfaceClass, 'h-10 w-full max-w-xs rounded-ctl border px-3 text-sm')}
                    value={form.outreach_channel}
                    onChange={(event) => setForm((prev) => ({ ...prev, outreach_channel: event.target.value as IcpFormState['outreach_channel'] }))}
                  >
                    <option value="">No preference</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                </Field>
                <Field label="Default tone">
                  <select
                    className={cn(workspaceFieldSurfaceClass, 'h-10 w-full max-w-xs rounded-ctl border px-3 text-sm')}
                    value={form.outreach_tone}
                    onChange={(event) => setForm((prev) => ({ ...prev, outreach_tone: event.target.value as IcpFormState['outreach_tone'] }))}
                  >
                    <option value="">No preference</option>
                    <option value="short">Short</option>
                    <option value="warm">Warm</option>
                    <option value="professional">Professional</option>
                    <option value="trade_show_follow_up">Trade show follow-up</option>
                  </select>
                </Field>
              </div>
            ) : null}

            {error ? (
              <div className="rounded-card border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg">{error}</div>
            ) : null}
            {savedAt ? (
              <div className="rounded-card border border-success-border bg-success-bg px-4 py-3 text-sm text-success-fg">
                ICP profile saved. Setu Guru will use this the next time recommendations or research summaries are generated.
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => setStep((current) => Math.max(0, current - 1))}
                disabled={isFirstStep}
                className={cn(
                  workspaceSecondaryButtonClass,
                  'inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Back
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={cn(
                    workspaceSecondaryButtonClass,
                    'inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50',
                  )}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                  Save progress
                </button>
                {!isLastStep ? (
                  <button
                    type="button"
                    onClick={() => setStep((current) => Math.min(STEPS.length - 1, current + 1))}
                    className={cn(
                      workspacePrimaryButtonClass,
                      'inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold',
                    )}
                  >
                    Next
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={cn(
                      workspacePrimaryButtonClass,
                      'inline-flex min-h-10 items-center justify-center gap-2 rounded-ctl px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50',
                    )}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Check className="h-4 w-4" aria-hidden="true" />}
                    Finish and save
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
