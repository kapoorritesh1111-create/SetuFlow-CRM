'use client';

import { useMemo, useState } from 'react';
import { CheckCircle2, PencilLine, X } from 'lucide-react';

import {
  workspaceFieldSurfaceClass,
  workspacePanelClass,
  workspacePrimaryButtonClass,
  workspaceSecondaryButtonClass,
} from '@/components/ui/workspace-surfaces';
import type { CampaignMode, ResearchDirection, SourceStrategy } from '@/features/setu-guru/external-discovery-campaign-builder';
import type { IcpProfile } from '@/lib/setu-guru/icp';
import { discoveryList, discoveryObject, discoveryText } from '@/lib/setu-guru/external-discovery-status';
import { cn } from '@/lib/utils';

type EditableCampaign = {
  id: string;
  name: string;
  campaign_mode?: CampaignMode;
  research_direction?: ResearchDirection;
  scope_status?: string;
  icp_profile_id?: string | null;
  search_config?: Record<string, unknown>;
  icp_snapshot?: Record<string, unknown>;
};

type Props = {
  campaign: EditableCampaign;
  profiles: IcpProfile[];
  onSaved: () => Promise<void> | void;
  onCancel: () => void;
};

function csv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function joined(values: unknown) {
  return discoveryList(values).join(', ');
}

export function ExternalDiscoveryCampaignEditor({ campaign, profiles, onSaved, onCancel }: Props) {
  const config = useMemo(() => discoveryObject(campaign.search_config), [campaign.search_config]);
  const snapshot = useMemo(() => discoveryObject(campaign.icp_snapshot), [campaign.icp_snapshot]);
  const verticalProfile = discoveryObject(snapshot.vertical_profile);
  const initialDirection = campaign.research_direction
    || (discoveryList(snapshot.supplier_types).length ? 'suppliers' : 'buyers');
  const initialProfile = profiles.find((profile) => profile.id === campaign.icp_profile_id);

  const [name, setName] = useState(campaign.name);
  const [mode, setMode] = useState<CampaignMode>(campaign.campaign_mode || (initialProfile ? 'new_market' : 'fresh_research'));
  const [direction, setDirection] = useState<ResearchDirection>(initialDirection);
  const [sourceStrategy, setSourceStrategy] = useState<SourceStrategy>((discoveryText(config.source_strategy) as SourceStrategy) || 'external_only');
  const [profileId, setProfileId] = useState(campaign.icp_profile_id || '');
  const [goal, setGoal] = useState(discoveryText(config.objective || config.goal) || `Find qualified ${initialDirection} for this campaign.`);
  const [market, setMarket] = useState(joined(config.resolved_target_countries) || joined(config.target_countries) || joined(snapshot.target_countries));
  const [product, setProduct] = useState(joined(config.products) || joined(snapshot.products));
  const [targetTypes, setTargetTypes] = useState(joined(config.target_company_types) || (initialDirection === 'suppliers' || initialDirection === 'manufacturers' ? joined(snapshot.supplier_types) : joined(snapshot.buyer_types)));
  const [excludedTypes, setExcludedTypes] = useState(joined(config.excluded_company_types) || joined(verticalProfile.excluded_company_types));
  const [industries, setIndustries] = useState(joined(config.target_industries) || joined(verticalProfile.campaign_industries) || discoveryText(verticalProfile.vertical));
  const [languages, setLanguages] = useState(joined(config.search_languages) || 'English, local market language');
  const [evidence, setEvidence] = useState(joined(config.source_requirements) || 'Official company website, relevant product or distribution evidence');
  const [resultLimit, setResultLimit] = useState(Number(config.result_limit ?? 25));
  const [minimumFit, setMinimumFit] = useState(Number(config.minimum_fit_score ?? 60));
  const [detectDuplicates, setDetectDuplicates] = useState(config.duplicate_detection !== false);
  const [suggestContactRoles, setSuggestContactRoles] = useState(config.suggest_contact_roles !== false);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const selectedProfile = profiles.find((profile) => profile.id === profileId);
  const savedMarket = selectedProfile?.target_countries?.join(', ') || joined(config.saved_icp_target_countries) || 'No saved ICP market';
  const marketOverride = Boolean(savedMarket && market && savedMarket.toLowerCase() !== market.toLowerCase());
  const fieldClass = cn('mt-1 min-h-10 w-full rounded-ctl border px-3 text-sm', workspaceFieldSurfaceClass);

  function applyProfile(nextId: string) {
    setProfileId(nextId);
    const profile = profiles.find((item) => item.id === nextId);
    if (!profile) return;
    setProduct(profile.products.join(', '));
    setTargetTypes((direction === 'suppliers' || direction === 'manufacturers' ? profile.supplier_types : profile.buyer_types).join(', '));
    if (mode !== 'new_market') setMarket(profile.target_countries.join(', '));
  }

  async function save() {
    const required = [name, goal, market, product, targetTypes, languages, evidence];
    if (required.some((value) => !value.trim())) {
      setStatus('error');
      setMessage('Complete the campaign name, objective, market, product, target company types, language, and evidence requirements.');
      return;
    }
    if ((mode === 'saved_icp' || mode === 'new_market') && !profileId) {
      setStatus('error');
      setMessage('Choose a saved ICP for this campaign mode.');
      return;
    }

    setStatus('saving');
    setMessage(null);
    try {
      const response = await fetch('/api/setu-guru/external-discovery/campaigns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          name: name.trim(),
          campaignMode: mode,
          researchDirection: direction,
          sourceStrategy,
          goal: goal.trim(),
          icpProfileId: profileId || null,
          lookalikeLeadId: null,
          searchConfig: {
            objective: goal.trim(),
            products: csv(product),
            target_countries: csv(market),
            target_company_types: csv(targetTypes),
            target_industries: csv(industries),
            excluded_company_types: csv(excludedTypes),
            result_limit: Math.max(5, Math.min(100, resultLimit)),
            minimum_fit_score: Math.max(0, Math.min(100, minimumFit)),
            search_languages: csv(languages),
            source_requirements: csv(evidence),
            duplicate_detection: detectDuplicates,
            suggest_contact_roles: suggestContactRoles,
            source_strategy: sourceStrategy,
            lookalike_lead_id: null,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The campaign scope could not be updated.');
      setStatus('saved');
      setMessage('Campaign scope confirmed. Research was not started.');
      await onSaved();
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'The campaign scope could not be updated.');
    }
  }

  return (
    <section className={cn(workspacePanelClass, 'overflow-hidden border-brand-300 shadow-lg')} aria-label={`Edit ${campaign.name}`}>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line bg-gradient-to-r from-brand-950 to-brand-800 px-5 py-4 text-white">
        <div>
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-white/65"><PencilLine className="h-4 w-4" />Edit campaign scope</p>
          <h2 className="mt-1 text-xl font-medium">Review and confirm what Setu Guru should research</h2>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-white/70">Saving updates this campaign only. It does not change the saved ICP, run research, create a lead, or send outreach.</p>
        </div>
        <button type="button" onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-ctl bg-white/10 hover:bg-white/20" aria-label="Close campaign editor"><X className="h-4 w-4" /></button>
      </header>

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2 text-xs font-medium text-content-secondary">Campaign name<input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} /></label>
          <label className="text-xs font-medium text-content-secondary">Campaign mode<select value={mode} onChange={(event) => setMode(event.target.value as CampaignMode)} className={fieldClass}><option value="saved_icp">Use saved ICP</option><option value="new_market">Same ICP, new market</option><option value="fresh_research">Fresh research</option><option value="supplier_partner">Suppliers or partners</option></select></label>
          <label className="text-xs font-medium text-content-secondary">Selected ICP<select value={profileId} onChange={(event) => applyProfile(event.target.value)} className={fieldClass}><option value="">Campaign-specific scope</option>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
          <label className="text-xs font-medium text-content-secondary">Research direction<select value={direction} onChange={(event) => setDirection(event.target.value as ResearchDirection)} className={fieldClass}><option value="buyers">Buyers</option><option value="suppliers">Suppliers</option><option value="partners">Partners</option><option value="manufacturers">Manufacturers</option></select></label>
          <label className="text-xs font-medium text-content-secondary">Source strategy<select value={sourceStrategy} onChange={(event) => setSourceStrategy(event.target.value as SourceStrategy)} className={fieldClass}><option value="external_only">External research only</option><option value="crm_and_external">CRM and external research</option><option value="crm_only">CRM matches only</option></select></label>
          <label className="md:col-span-2 text-xs font-medium text-content-secondary">Objective<textarea value={goal} onChange={(event) => setGoal(event.target.value)} rows={3} className={cn(fieldClass, 'py-3')} /></label>
          <label className="text-xs font-medium text-content-secondary">Target market or country<input value={market} onChange={(event) => setMarket(event.target.value)} className={fieldClass} /></label>
          <label className="text-xs font-medium text-content-secondary">Product or service<input value={product} onChange={(event) => setProduct(event.target.value)} className={fieldClass} /></label>
          <label className="md:col-span-2 text-xs font-medium text-content-secondary">Target company types<input value={targetTypes} onChange={(event) => setTargetTypes(event.target.value)} className={fieldClass} /></label>
          <label className="text-xs font-medium text-content-secondary">Excluded company types<input value={excludedTypes} onChange={(event) => setExcludedTypes(event.target.value)} className={fieldClass} /></label>
          <label className="text-xs font-medium text-content-secondary">Industries<input value={industries} onChange={(event) => setIndustries(event.target.value)} className={fieldClass} /></label>
          <label className="text-xs font-medium text-content-secondary">Search languages<input value={languages} onChange={(event) => setLanguages(event.target.value)} className={fieldClass} /></label>
          <label className="text-xs font-medium text-content-secondary">Evidence requirements<input value={evidence} onChange={(event) => setEvidence(event.target.value)} className={fieldClass} /></label>
          <label className="text-xs font-medium text-content-secondary">Result limit<input type="number" min={5} max={100} value={resultLimit} onChange={(event) => setResultLimit(Number(event.target.value))} className={fieldClass} /></label>
          <label className="text-xs font-medium text-content-secondary">Minimum fit score<input type="number" min={0} max={100} value={minimumFit} onChange={(event) => setMinimumFit(Number(event.target.value))} className={fieldClass} /></label>
          <label className="flex items-center gap-2 text-xs text-content-secondary"><input type="checkbox" checked={detectDuplicates} onChange={(event) => setDetectDuplicates(event.target.checked)} />Detect duplicates before insertion</label>
          <label className="flex items-center gap-2 text-xs text-content-secondary"><input type="checkbox" checked={suggestContactRoles} onChange={(event) => setSuggestContactRoles(event.target.checked)} />Suggest contact roles</label>
        </div>

        <aside className="space-y-3 rounded-card border border-line bg-surface-2 p-4">
          <div><p className="text-caption uppercase text-content-muted">Saved ICP market</p><p className="mt-1 text-sm font-medium text-content-primary">{savedMarket}</p></div>
          <div><p className="text-caption uppercase text-content-muted">Campaign market</p><p className="mt-1 text-sm font-medium text-content-primary">{market || 'Not entered'}</p></div>
          <div><p className="text-caption uppercase text-content-muted">Resolved market</p><p className="mt-1 text-sm font-medium text-brand-800">{market || 'Not entered'}</p></div>
          <div className={cn('rounded-ctl p-3 text-xs leading-5', marketOverride ? 'bg-info-bg text-brand-800' : 'bg-surface-1 text-content-muted')}>{marketOverride ? 'The campaign market overrides the saved ICP market for this campaign only.' : 'No market override is currently applied.'}</div>
          <div className="rounded-ctl border border-success-border bg-success-bg p-3 text-xs text-success-fg"><CheckCircle2 className="mb-2 h-4 w-4" />Buyer, supplier, partner, and manufacturer directions remain separate.</div>
        </aside>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
        <p className={cn('text-xs', status === 'error' ? 'text-danger-fg' : status === 'saved' ? 'text-success-fg' : 'text-content-muted')} role="status" aria-live="polite">{message || 'Confirming scope never starts research automatically.'}</p>
        <div className="flex gap-2"><button type="button" onClick={onCancel} className={cn('inline-flex min-h-9 items-center rounded-ctl px-3 text-xs font-medium', workspaceSecondaryButtonClass)}>Cancel</button><button type="button" onClick={save} disabled={status === 'saving'} className={cn('inline-flex min-h-9 items-center rounded-ctl px-4 text-xs font-medium disabled:opacity-60', workspacePrimaryButtonClass)}>{status === 'saving' ? 'Saving…' : 'Save and confirm scope'}</button></div>
      </footer>
    </section>
  );
}
