'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  Globe2,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';

import type { IcpProfile } from '@/lib/setu-guru/icp';
import type { OpportunityCard } from '@/lib/setu-guru/opportunity-finder';
import {
  workspaceFieldSurfaceClass,
  workspaceInsetClass,
  workspacePanelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from '@/components/ui/workspace-surfaces';
import { cn } from '@/lib/utils';

export type CampaignMode = 'saved_icp' | 'new_market' | 'lookalike' | 'fresh_research' | 'supplier_partner';
export type ResearchDirection = 'buyers' | 'suppliers' | 'partners' | 'manufacturers';
export type SourceStrategy = 'crm_and_external' | 'crm_only' | 'external_only';

type Props = {
  profiles: IcpProfile[];
  crmOpportunities: OpportunityCard[];
  onCreated: (campaignId?: string) => void;
  onCancel: () => void;
};

type Step = 1 | 2 | 3 | 4 | 5;

const MODE_OPTIONS: Array<{ key: CampaignMode; label: string; description: string; icon: typeof Compass }> = [
  { key: 'saved_icp', label: 'Use a saved ICP', description: 'Use an existing target profile as the campaign scope.', icon: Search },
  { key: 'new_market', label: 'Same ICP, new market', description: 'Keep the customer profile and override the market for this campaign.', icon: Globe2 },
  { key: 'lookalike', label: 'Similar to a customer', description: 'Use a successful CRM company as the lookalike starting point.', icon: Building2 },
  { key: 'fresh_research', label: 'Start new research', description: 'Build a completely new business-development brief.', icon: Sparkles },
  { key: 'supplier_partner', label: 'Find suppliers or partners', description: 'Run a sourcing or channel-partner campaign, separate from buyers.', icon: Users },
];

const STEP_LABELS = ['Goal', 'Scope', 'Preferences', 'Review', 'Confirm'];

function csv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function joined(values?: string[] | null) {
  return (values ?? []).join(', ');
}

function defaultTargetTypes(profile: IcpProfile | undefined, direction: ResearchDirection) {
  if (!profile) return '';
  if (direction === 'suppliers') return joined(profile.supplier_types);
  if (direction === 'buyers') return joined(profile.buyer_types);
  return '';
}

function directionLabel(value: ResearchDirection) {
  if (value === 'buyers') return 'Buyers / customers';
  if (value === 'suppliers') return 'Suppliers';
  if (value === 'partners') return 'Channel partners';
  return 'Manufacturers';
}

export function ExternalDiscoveryCampaignBuilder({ profiles, crmOpportunities, onCreated, onCancel }: Props) {
  const activeProfile = profiles.find((profile) => profile.is_active) ?? profiles[0];
  const [step, setStep] = useState<Step>(1);
  const [mode, setMode] = useState<CampaignMode>(activeProfile ? 'saved_icp' : 'fresh_research');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [direction, setDirection] = useState<ResearchDirection>('buyers');
  const [sourceStrategy, setSourceStrategy] = useState<SourceStrategy>('crm_and_external');
  const [profileId, setProfileId] = useState(activeProfile?.id ?? '');
  const [lookalikeLeadId, setLookalikeLeadId] = useState('');
  const [market, setMarket] = useState(joined(activeProfile?.target_countries));
  const [product, setProduct] = useState(joined(activeProfile?.products));
  const [industry, setIndustry] = useState(String(activeProfile?.vertical_profile?.vertical ?? ''));
  const [targetTypes, setTargetTypes] = useState(defaultTargetTypes(activeProfile, 'buyers'));
  const [excludedTypes, setExcludedTypes] = useState('');
  const [resultLimit, setResultLimit] = useState(25);
  const [minimumFit, setMinimumFit] = useState(60);
  const [evidenceRequirements, setEvidenceRequirements] = useState('Official company website, relevant product or distribution evidence');
  const [searchLanguages, setSearchLanguages] = useState('English, local market language');
  const [detectDuplicates, setDetectDuplicates] = useState(true);
  const [suggestContactRoles, setSuggestContactRoles] = useState(true);
  const [status, setStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const selectedProfile = useMemo(() => profiles.find((profile) => profile.id === profileId), [profileId, profiles]);
  const selectedLookalike = useMemo(() => crmOpportunities.find((item) => item.leadId === lookalikeLeadId), [crmOpportunities, lookalikeLeadId]);
  const inheritedMarket = joined(selectedProfile?.target_countries);
  const campaignOverridesMarket = Boolean(inheritedMarket && market.trim() && inheritedMarket.toLowerCase() !== market.trim().toLowerCase());

  function applyProfile(nextProfileId: string, nextDirection = direction, clearMarketForOverride = mode === 'new_market') {
    const profile = profiles.find((item) => item.id === nextProfileId);
    setProfileId(nextProfileId);
    if (!profile) return;
    setProduct(joined(profile.products));
    setTargetTypes(defaultTargetTypes(profile, nextDirection));
    setIndustry(String(profile.vertical_profile?.vertical ?? ''));
    setMarket(clearMarketForOverride ? '' : joined(profile.target_countries));
  }

  function chooseMode(nextMode: CampaignMode) {
    setMode(nextMode);
    setFieldErrors({});
    if (nextMode === 'fresh_research') {
      setProfileId('');
      setLookalikeLeadId('');
      setMarket('');
      setProduct('');
      setTargetTypes('');
      setIndustry('');
      return;
    }
    if (nextMode === 'lookalike') {
      setProfileId('');
      setMarket('');
      setProduct('');
      setTargetTypes('');
      return;
    }
    if (nextMode === 'supplier_partner') {
      const nextDirection: ResearchDirection = 'suppliers';
      setDirection(nextDirection);
      if (activeProfile) applyProfile(activeProfile.id, nextDirection, false);
      return;
    }
    if (activeProfile) applyProfile(activeProfile.id, direction, nextMode === 'new_market');
  }

  function updateDirection(nextDirection: ResearchDirection) {
    setDirection(nextDirection);
    if (selectedProfile) setTargetTypes(defaultTargetTypes(selectedProfile, nextDirection));
  }

  function validate(currentStep: Step) {
    const errors: Record<string, string> = {};
    if (currentStep === 1 || currentStep === 5) {
      if (name.trim().length < 3) errors.name = 'Enter a clear campaign name.';
      if (goal.trim().length < 10) errors.goal = 'Describe what you want Setu Guru to find.';
      if (!direction) errors.direction = 'Choose one research direction.';
      if (!sourceStrategy) errors.sourceStrategy = 'Choose where this campaign should search.';
    }
    if (currentStep === 2 || currentStep === 5) {
      if ((mode === 'saved_icp' || mode === 'new_market') && !profileId) errors.profileId = 'Choose an ICP for this campaign mode.';
      if (mode === 'lookalike' && !lookalikeLeadId) errors.lookalikeLeadId = 'Choose an existing CRM company.';
      if (!market.trim()) errors.market = 'Enter at least one target market or country.';
      if (!product.trim()) errors.product = 'Enter the product or service being offered.';
      if (!targetTypes.trim()) errors.targetTypes = 'Enter at least one target company type.';
    }
    if (currentStep === 3 || currentStep === 5) {
      if (resultLimit < 5 || resultLimit > 100) errors.resultLimit = 'Use a result limit between 5 and 100.';
      if (minimumFit < 0 || minimumFit > 100) errors.minimumFit = 'Fit score must be between 0 and 100.';
      if (!evidenceRequirements.trim()) errors.evidenceRequirements = 'Describe the minimum source evidence required.';
      if (!searchLanguages.trim()) errors.searchLanguages = 'Enter at least one search language.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function next() {
    if (!validate(step)) return;
    setStep((value) => Math.min(5, value + 1) as Step);
  }

  function back() {
    setFieldErrors({});
    setStep((value) => Math.max(1, value - 1) as Step);
  }

  async function submit() {
    if (!validate(5)) {
      setStep(1);
      return;
    }
    setStatus('saving');
    setErrorMessage(null);
    try {
      const response = await fetch('/api/setu-guru/external-discovery/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          campaignMode: mode,
          researchDirection: direction,
          sourceStrategy,
          goal: goal.trim(),
          icpProfileId: profileId || null,
          lookalikeLeadId: lookalikeLeadId || null,
          searchConfig: {
            objective: goal.trim(),
            products: csv(product),
            target_countries: csv(market),
            target_company_types: csv(targetTypes),
            target_industries: csv(industry),
            excluded_company_types: csv(excludedTypes),
            result_limit: resultLimit,
            minimum_fit_score: minimumFit,
            search_languages: csv(searchLanguages),
            source_requirements: csv(evidenceRequirements),
            duplicate_detection: detectDuplicates,
            suggest_contact_roles: suggestContactRoles,
            source_strategy: sourceStrategy,
            lookalike_lead_id: lookalikeLeadId || null,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The campaign could not be saved.');
      onCreated(payload.campaign?.id);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'The campaign could not be saved.');
    }
  }

  const fieldClass = cn('mt-1 min-h-10 w-full rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass);

  return (
    <section className={cn(workspacePanelClass, 'mt-4 overflow-hidden border-brand-200 shadow-lg')} aria-label="Guided External Discovery campaign builder">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-gradient-to-r from-brand-950 to-brand-800 px-5 py-4 text-white">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/65">Guided Growth campaign</p>
          <h2 className="mt-1 text-xl font-medium">Find the right companies with a confirmed research scope</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/70">Campaign selections override the saved ICP for this campaign only. Research remains a separate, explicit action after the campaign is saved.</p>
        </div>
        <button type="button" onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-ctl bg-white/10 text-white hover:bg-white/20" aria-label="Cancel campaign setup"><X className="h-4 w-4" /></button>
      </header>

      <div className="grid lg:grid-cols-[230px_minmax(0,1fr)_300px]">
        <aside className="border-b border-line bg-surface-2 p-3 lg:border-b-0 lg:border-r">
          <p className="px-2 pb-2 text-caption uppercase text-content-muted">How should we start?</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
            {MODE_OPTIONS.map(({ key, label, description, icon: Icon }) => (
              <button key={key} type="button" onClick={() => chooseMode(key)} aria-pressed={mode === key} className={cn('rounded-card border p-3 text-left transition', mode === key ? 'border-brand-500 bg-info-bg shadow-sm' : 'border-line bg-surface-1 hover:bg-surface-2')}>
                <span className="flex items-center gap-2 text-sm font-medium text-content-primary"><Icon className="h-4 w-4 text-brand-700" />{label}</span>
                <span className="mt-1 block text-[11px] leading-4 text-content-muted">{description}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 p-4 lg:p-5">
          <div className="mb-5 flex min-w-max items-center gap-2 overflow-x-auto pb-1" aria-label="Campaign setup progress">
            {STEP_LABELS.map((label, index) => {
              const number = index + 1;
              const complete = step > number;
              const active = step === number;
              return (
                <div key={label} className="flex items-center gap-2">
                  <span className={cn('grid h-7 w-7 place-items-center rounded-full text-xs font-medium', complete || active ? 'bg-brand-800 text-white' : 'bg-surface-2 text-content-muted')}>{complete ? <CheckCircle2 className="h-4 w-4" /> : number}</span>
                  <span className={cn('text-xs font-medium', active ? 'text-content-primary' : 'text-content-muted')}>{label}</span>
                  {number < 5 ? <span className="h-px w-5 bg-line" /> : null}
                </div>
              );
            })}
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <div><h3 className="text-lg font-medium text-content-primary">What business outcome are you looking for?</h3><p className="mt-1 text-sm text-content-muted">Describe the goal naturally. Setu Guru will preserve it as the campaign objective.</p></div>
              <label className="block text-xs font-medium text-content-secondary">Campaign name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Bulgaria — Vacuum-Cooked Snack Buyers" className={fieldClass} />{fieldErrors.name ? <span className="mt-1 block text-xs text-danger-fg">{fieldErrors.name}</span> : null}</label>
              <label className="block text-xs font-medium text-content-secondary">Describe your goal<textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={4} placeholder="Find opportunities in Bulgaria to sell vacuum-cooked fruit and vegetable chips to retailers and distributors." className={cn(fieldClass, 'py-3')} />{fieldErrors.goal ? <span className="mt-1 block text-xs text-danger-fg">{fieldErrors.goal}</span> : null}</label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-medium text-content-secondary">Research direction<select value={direction} onChange={(event) => updateDirection(event.target.value as ResearchDirection)} className={fieldClass}><option value="buyers">Buyers / customers</option><option value="suppliers">Suppliers</option><option value="partners">Channel partners</option><option value="manufacturers">Manufacturers</option></select></label>
                <label className="block text-xs font-medium text-content-secondary">Where should Setu Guru look?<select value={sourceStrategy} onChange={(event) => setSourceStrategy(event.target.value as SourceStrategy)} className={fieldClass}><option value="crm_and_external">CRM and external research</option><option value="crm_only">CRM only</option><option value="external_only">External research only</option></select></label>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div><h3 className="text-lg font-medium text-content-primary">Confirm the market and company scope</h3><p className="mt-1 text-sm text-content-muted">The values entered here are the values the campaign will actually use.</p></div>
              {(mode === 'saved_icp' || mode === 'new_market' || mode === 'supplier_partner') ? <label className="block text-xs font-medium text-content-secondary">Saved ICP<select value={profileId} onChange={(event) => applyProfile(event.target.value)} className={fieldClass}><option value="">Choose an ICP</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name} · v{profile.version}</option>)}</select>{fieldErrors.profileId ? <span className="mt-1 block text-xs text-danger-fg">{fieldErrors.profileId}</span> : null}</label> : null}
              {mode === 'lookalike' ? <label className="block text-xs font-medium text-content-secondary">Existing CRM company<select value={lookalikeLeadId} onChange={(event) => setLookalikeLeadId(event.target.value)} className={fieldClass}><option value="">Choose a company</option>{crmOpportunities.map((item) => <option key={item.leadId} value={item.leadId}>{item.label} · {item.country || 'Country missing'} · {item.fitScore.score}% fit</option>)}</select>{fieldErrors.lookalikeLeadId ? <span className="mt-1 block text-xs text-danger-fg">{fieldErrors.lookalikeLeadId}</span> : null}</label> : null}
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-medium text-content-secondary">Target market or country<input value={market} onChange={(event) => setMarket(event.target.value)} placeholder="Bulgaria" className={fieldClass} />{fieldErrors.market ? <span className="mt-1 block text-xs text-danger-fg">{fieldErrors.market}</span> : null}</label>
                <label className="block text-xs font-medium text-content-secondary">Product or service<input value={product} onChange={(event) => setProduct(event.target.value)} placeholder="Vacuum-cooked fruit and vegetable chips" className={fieldClass} />{fieldErrors.product ? <span className="mt-1 block text-xs text-danger-fg">{fieldErrors.product}</span> : null}</label>
                <label className="block text-xs font-medium text-content-secondary">Industry or vertical<input value={industry} onChange={(event) => setIndustry(event.target.value)} placeholder="Food and beverage" className={fieldClass} /></label>
                <label className="block text-xs font-medium text-content-secondary">Target company types<input value={targetTypes} onChange={(event) => setTargetTypes(event.target.value)} placeholder="Importers, distributors, grocery retailers" className={fieldClass} />{fieldErrors.targetTypes ? <span className="mt-1 block text-xs text-danger-fg">{fieldErrors.targetTypes}</span> : null}</label>
              </div>
              <label className="block text-xs font-medium text-content-secondary">Exclude these company types<input value={excludedTypes} onChange={(event) => setExcludedTypes(event.target.value)} placeholder="Co-packers, equipment suppliers, ingredient suppliers" className={fieldClass} /></label>
              {campaignOverridesMarket ? <div className="rounded-card border border-info-fg/30 bg-info-bg p-3 text-xs leading-5 text-content-secondary"><strong className="text-content-primary">Campaign market override:</strong> {market} replaces {inheritedMarket} for this campaign only. Your saved ICP will not be changed.</div> : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div><h3 className="text-lg font-medium text-content-primary">Set research quality preferences</h3><p className="mt-1 text-sm text-content-muted">These controls define the volume and evidence threshold for the campaign.</p></div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-medium text-content-secondary">Desired result count<input type="number" min={5} max={100} value={resultLimit} onChange={(event) => setResultLimit(Number(event.target.value))} className={fieldClass} />{fieldErrors.resultLimit ? <span className="mt-1 block text-xs text-danger-fg">{fieldErrors.resultLimit}</span> : null}</label>
                <label className="block text-xs font-medium text-content-secondary">Minimum fit score<input type="number" min={0} max={100} value={minimumFit} onChange={(event) => setMinimumFit(Number(event.target.value))} className={fieldClass} />{fieldErrors.minimumFit ? <span className="mt-1 block text-xs text-danger-fg">{fieldErrors.minimumFit}</span> : null}</label>
                <label className="block text-xs font-medium text-content-secondary">Source evidence required<textarea value={evidenceRequirements} onChange={(event) => setEvidenceRequirements(event.target.value)} rows={3} className={cn(fieldClass, 'py-3')} />{fieldErrors.evidenceRequirements ? <span className="mt-1 block text-xs text-danger-fg">{fieldErrors.evidenceRequirements}</span> : null}</label>
                <label className="block text-xs font-medium text-content-secondary">Search languages<textarea value={searchLanguages} onChange={(event) => setSearchLanguages(event.target.value)} rows={3} className={cn(fieldClass, 'py-3')} />{fieldErrors.searchLanguages ? <span className="mt-1 block text-xs text-danger-fg">{fieldErrors.searchLanguages}</span> : null}</label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={cn(workspaceInsetClass, 'flex items-start gap-3 p-3 text-sm')}><input type="checkbox" checked={detectDuplicates} onChange={(event) => setDetectDuplicates(event.target.checked)} className="mt-0.5" /><span><strong className="block text-content-primary">Detect CRM duplicates</strong><span className="mt-1 block text-xs text-content-muted">Flag existing companies before conversion.</span></span></label>
                <label className={cn(workspaceInsetClass, 'flex items-start gap-3 p-3 text-sm')}><input type="checkbox" checked={suggestContactRoles} onChange={(event) => setSuggestContactRoles(event.target.checked)} className="mt-0.5" /><span><strong className="block text-content-primary">Suggest decision-maker roles</strong><span className="mt-1 block text-xs text-content-muted">Recommend roles without inventing contacts.</span></span></label>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <div><h3 className="text-lg font-medium text-content-primary">Review the resolved campaign scope</h3><p className="mt-1 text-sm text-content-muted">Confirm what Setu Guru will use before anything is saved or researched.</p></div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className={cn(workspaceInsetClass, 'p-4')}><p className="text-caption uppercase text-content-muted">Inherited starting point</p><dl className="mt-3 space-y-3 text-sm"><div><dt className="text-xs text-content-muted">ICP</dt><dd className="font-medium text-content-primary">{selectedProfile?.name ?? 'No ICP selected'}</dd></div><div><dt className="text-xs text-content-muted">Saved market</dt><dd className="font-medium text-content-primary">{inheritedMarket || 'Not configured'}</dd></div><div><dt className="text-xs text-content-muted">Lookalike company</dt><dd className="font-medium text-content-primary">{selectedLookalike?.label ?? 'Not used'}</dd></div></dl></div>
                <div className={cn(workspaceInsetClass, 'border-brand-300 bg-info-bg p-4')}><p className="text-caption uppercase text-brand-700">Campaign overrides</p><dl className="mt-3 space-y-3 text-sm"><div><dt className="text-xs text-content-muted">Market actually searched</dt><dd className="font-medium text-content-primary">{market}</dd></div><div><dt className="text-xs text-content-muted">Product actually searched</dt><dd className="font-medium text-content-primary">{product}</dd></div><div><dt className="text-xs text-content-muted">Target companies</dt><dd className="font-medium text-content-primary">{targetTypes}</dd></div></dl></div>
              </div>
              <div className="rounded-card border border-line bg-surface-1 p-4"><p className="text-sm font-medium text-content-primary">Resolved instruction</p><p className="mt-2 text-sm leading-6 text-content-secondary">Find {directionLabel(direction).toLowerCase()} in <strong>{market}</strong> that match <strong>{targetTypes}</strong> and may buy, supply, partner on, or manufacture <strong>{product}</strong>. Exclude {excludedTypes || 'no additional company types'}.</p></div>
              {campaignOverridesMarket ? <div className="rounded-card border border-success-fg/25 bg-success-bg p-3 text-xs leading-5 text-content-secondary"><strong className="text-content-primary">{market} overrides {inheritedMarket}</strong> for this campaign only. The saved ICP remains unchanged.</div> : null}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-4">
              <div><h3 className="text-lg font-medium text-content-primary">Confirm the campaign</h3><p className="mt-1 text-sm text-content-muted">Saving the campaign does not start research, create a lead, or send outreach.</p></div>
              <div className="rounded-card border border-brand-300 bg-gradient-to-br from-info-bg to-surface-1 p-5"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-brand-800 text-white"><CheckCircle2 className="h-5 w-5" /></span><div><p className="text-base font-medium text-content-primary">{name || 'Campaign name required'}</p><p className="mt-2 text-sm leading-6 text-content-secondary">{goal || 'Campaign goal required'}</p><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-surface-1 px-3 py-1 text-xs text-content-secondary">{directionLabel(direction)}</span><span className="rounded-full bg-surface-1 px-3 py-1 text-xs text-content-secondary">{market || 'Market required'}</span><span className="rounded-full bg-surface-1 px-3 py-1 text-xs text-content-secondary">{resultLimit} results</span><span className="rounded-full bg-surface-1 px-3 py-1 text-xs text-content-secondary">Minimum {minimumFit}% fit</span></div></div></div></div>
              <div className="rounded-card border border-warning-fg/20 bg-warning-bg p-3 text-xs leading-5 text-content-secondary"><strong className="text-content-primary">Human approval guardrail:</strong> this action saves a ready campaign only. Use the separate Run research control in the campaign list to start the provider job.</div>
              <button type="button" disabled={status === 'saving'} onClick={submit} className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl px-5 text-sm font-medium disabled:opacity-60', workspacePrimaryButtonClass)}>{status === 'saving' ? 'Saving campaign…' : 'Confirm campaign'}<CheckCircle2 className="h-4 w-4" /></button>
              {status === 'error' ? <p className="text-sm text-danger-fg" aria-live="polite">{errorMessage}</p> : null}
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <button type="button" onClick={step === 1 ? onCancel : back} className={cn('inline-flex min-h-9 items-center gap-2 rounded-ctl px-3 text-sm font-medium', workspaceSecondaryButtonClass)}>{step === 1 ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}{step === 1 ? 'Cancel' : 'Back'}</button>
            {step < 5 ? <button type="button" onClick={next} className={cn('inline-flex min-h-9 items-center gap-2 rounded-ctl px-4 text-sm font-medium', workspacePrimaryButtonClass)}>Next: {STEP_LABELS[step]}<ArrowRight className="h-4 w-4" /></button> : null}
          </div>
        </div>

        <aside className="border-t border-line bg-surface-2 p-4 lg:border-l lg:border-t-0">
          <div className="sticky top-4">
            <div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-card bg-brand-800 text-white"><Sparkles className="h-4 w-4" /></span><div><p className="text-sm font-medium text-content-primary">Setu Guru understood</p><p className="text-[11px] text-content-muted">Live campaign summary</p></div></div>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-caption uppercase text-content-muted">Mode</dt><dd className="mt-1 font-medium text-content-primary">{MODE_OPTIONS.find((item) => item.key === mode)?.label}</dd></div>
              <div><dt className="text-caption uppercase text-content-muted">Direction</dt><dd className="mt-1 font-medium text-content-primary">{directionLabel(direction)}</dd></div>
              <div><dt className="text-caption uppercase text-content-muted">Market</dt><dd className="mt-1 font-medium text-content-primary">{market || 'Not entered yet'}</dd></div>
              <div><dt className="text-caption uppercase text-content-muted">Product</dt><dd className="mt-1 font-medium text-content-primary">{product || 'Not entered yet'}</dd></div>
              <div><dt className="text-caption uppercase text-content-muted">Target companies</dt><dd className="mt-1 font-medium text-content-primary">{targetTypes || 'Not entered yet'}</dd></div>
              <div><dt className="text-caption uppercase text-content-muted">Sources</dt><dd className="mt-1 font-medium text-content-primary">{sourceStrategy === 'crm_and_external' ? 'CRM and external research' : sourceStrategy === 'crm_only' ? 'CRM only' : 'External research only'}</dd></div>
            </dl>
            <div className="mt-4 rounded-card border border-line bg-surface-1 p-3 text-xs leading-5 text-content-muted">Campaign-specific choices have priority over the selected ICP. Buyer and supplier targets remain separate.</div>
          </div>
        </aside>
      </div>
    </section>
  );
}
