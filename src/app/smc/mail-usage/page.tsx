import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { ProviderCostControls } from './provider-cost-controls';

export const dynamic = 'force-dynamic';

type UsageRow = {
  organization_id: string;
  organization_name: string;
  organization_slug: string | null;
  module_enabled: boolean;
  entitlement_status: string | null;
  plan_key: string | null;
  mailbox_limit: number | null;
  domain_limit: number | null;
  storage_limit_bytes: number | string | null;
  monthly_message_limit: number | null;
  ai_actions_monthly_limit: number | null;
  entitlement_period_start: string | null;
  entitlement_message_counter: number | null;
  entitlement_ai_counter: number | null;
  mailbox_count: number | string;
  domain_count: number | string;
  attachment_count: number | string;
  storage_bytes: number | string;
  clean_storage_bytes: number | string;
  quarantine_storage_bytes: number | string;
  metered_inbound_messages: number | string;
  metered_outbound_messages: number | string;
  metered_cloudmersive_scans: number | string;
  metered_guru_actions: number | string;
};

type CostProfile = {
  provider: 'resend' | 'cloudmersive';
  plan_key: string;
  display_name: string;
  monthly_base_cost_usd: number | string | null;
  included_quantity: number | string | null;
  overage_unit_size: number | string | null;
  overage_unit_cost_usd: number | string | null;
  hard_limit_quantity: number | string | null;
  max_file_bytes: number | string | null;
  source_url: string | null;
  verified_at: string | null;
  notes: string | null;
};

type ProviderSetting = { provider: 'resend' | 'cloudmersive'; active_plan_key: string };

type NormalizedCostProfile = Omit<CostProfile, 'monthly_base_cost_usd' | 'included_quantity' | 'overage_unit_size' | 'overage_unit_cost_usd' | 'hard_limit_quantity' | 'max_file_bytes'> & {
  monthly_base_cost_usd: number | null;
  included_quantity: number | null;
  overage_unit_size: number | null;
  overage_unit_cost_usd: number | null;
  hard_limit_quantity: number | null;
  max_file_bytes: number | null;
};

type CostResult = { amount: number | null; status: 'ready' | 'unconfigured' | 'limit_exceeded'; overageQuantity: number; overageBuckets: number };

const PROVIDERS = ['resend', 'cloudmersive'] as const;

function number(value: number | string | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function nullableNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function monthStart(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (/^\d{4}-\d{2}$/.test(text)) return `${text}-01`;
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

function monthInput(value: string) {
  return value.slice(0, 7);
}

function monthLabel(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function bytes(value: number) {
  if (value <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let index = 0;
  let current = value;
  while (current >= 1024 && index < units.length - 1) { current /= 1024; index += 1; }
  return `${current.toLocaleString(undefined, { maximumFractionDigits: current >= 100 ? 0 : current >= 10 ? 1 : 2 })} ${units[index]}`;
}

function money(value: number | null) {
  if (value === null) return 'Not configured';
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function percent(used: number, limit: number | null) {
  if (!limit || limit <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}

function normalizeProfile(profile: CostProfile): NormalizedCostProfile {
  return {
    ...profile,
    monthly_base_cost_usd: nullableNumber(profile.monthly_base_cost_usd),
    included_quantity: nullableNumber(profile.included_quantity),
    overage_unit_size: nullableNumber(profile.overage_unit_size),
    overage_unit_cost_usd: nullableNumber(profile.overage_unit_cost_usd),
    hard_limit_quantity: nullableNumber(profile.hard_limit_quantity),
    max_file_bytes: nullableNumber(profile.max_file_bytes),
  };
}

function calculateProviderCost(profile: NormalizedCostProfile | null, usage: number): CostResult {
  if (!profile || profile.monthly_base_cost_usd === null) return { amount: null, status: 'unconfigured', overageQuantity: 0, overageBuckets: 0 };
  const included = profile.included_quantity ?? 0;
  const overageQuantity = Math.max(0, usage - included);
  const exceedsHardLimit = profile.hard_limit_quantity !== null && usage > profile.hard_limit_quantity;
  if (overageQuantity <= 0) return { amount: profile.monthly_base_cost_usd, status: exceedsHardLimit ? 'limit_exceeded' : 'ready', overageQuantity: 0, overageBuckets: 0 };
  if (profile.overage_unit_size && profile.overage_unit_cost_usd !== null) {
    const buckets = Math.ceil(overageQuantity / profile.overage_unit_size);
    return { amount: profile.monthly_base_cost_usd + buckets * profile.overage_unit_cost_usd, status: exceedsHardLimit ? 'limit_exceeded' : 'ready', overageQuantity, overageBuckets: buckets };
  }
  return { amount: profile.monthly_base_cost_usd, status: 'limit_exceeded', overageQuantity, overageBuckets: 0 };
}

function usageForProvider(row: UsageRow, provider: 'resend' | 'cloudmersive') {
  return provider === 'resend'
    ? number(row.metered_inbound_messages) + number(row.metered_outbound_messages)
    : number(row.metered_cloudmersive_scans);
}

function titleCase(value: string | null) {
  if (!value) return '—';
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
}

function progressTone(value: number) {
  if (value >= 90) return '#ef4444';
  if (value >= 75) return '#f59e0b';
  return '#279491';
}

function Progress({ used, limit }: { used: number; limit: number | null }) {
  const value = percent(used, limit);
  return <div style={{ marginTop: 5, height: 5, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}><div style={{ height: '100%', width: `${value}%`, background: progressTone(value), borderRadius: 999 }} /></div>;
}

export default async function SmcMailUsagePage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: membership } = await supabase.from('organization_members').select('id').eq('organization_id', INTERNAL_ORG_ID).eq('user_id', user.id).maybeSingle();
  if (!membership) redirect('/dashboard');

  const admin = createServiceRoleClient() as any;
  if (!admin) throw new Error('SMC service role client is not configured.');

  const periodStart = monthStart(searchParams?.month);
  const [usageResult, catalogResult, settingResult] = await Promise.all([
    admin.rpc('mail_smc_commercial_usage', { p_period_start: periodStart }),
    admin.from('mail_provider_cost_catalog').select('provider,plan_key,display_name,monthly_base_cost_usd,included_quantity,overage_unit_size,overage_unit_cost_usd,hard_limit_quantity,max_file_bytes,source_url,verified_at,notes').order('provider').order('monthly_base_cost_usd', { ascending: true, nullsFirst: true }),
    admin.from('mail_provider_cost_settings').select('provider,active_plan_key').order('provider'),
  ]);

  if (usageResult.error) throw new Error(`Unable to load Setu Mail usage: ${usageResult.error.message}`);
  if (catalogResult.error) throw new Error(`Unable to load Mail provider costs: ${catalogResult.error.message}`);
  if (settingResult.error) throw new Error(`Unable to load Mail provider settings: ${settingResult.error.message}`);

  const rows = (usageResult.data ?? []) as UsageRow[];
  const profiles = ((catalogResult.data ?? []) as CostProfile[]).map(normalizeProfile);
  const settings = (settingResult.data ?? []) as ProviderSetting[];
  const activeProfiles = Object.fromEntries(PROVIDERS.map(provider => {
    const selected = settings.find(setting => setting.provider === provider)?.active_plan_key;
    return [provider, profiles.find(profile => profile.provider === provider && profile.plan_key === selected) ?? null];
  })) as Record<'resend' | 'cloudmersive', NormalizedCostProfile | null>;

  const providerUsage = {
    resend: rows.reduce((sum, row) => sum + usageForProvider(row, 'resend'), 0),
    cloudmersive: rows.reduce((sum, row) => sum + usageForProvider(row, 'cloudmersive'), 0),
  };
  const providerCosts = {
    resend: calculateProviderCost(activeProfiles.resend, providerUsage.resend),
    cloudmersive: calculateProviderCost(activeProfiles.cloudmersive, providerUsage.cloudmersive),
  };
  const knownCost = PROVIDERS.reduce((sum, provider) => sum + (providerCosts[provider].amount ?? 0), 0);
  const incompleteProviders = PROVIDERS.filter(provider => providerCosts[provider].amount === null);
  const enabledRows = rows.filter(row => row.module_enabled);
  const totalStorage = rows.reduce((sum, row) => sum + number(row.storage_bytes), 0);
  const totalGuruActions = rows.reduce((sum, row) => sum + number(row.metered_guru_actions), 0);
  const counterDriftRows = rows.filter(row => row.entitlement_period_start === periodStart && number(row.entitlement_message_counter) !== usageForProvider(row, 'resend'));

  function allocatedCost(row: UsageRow) {
    let amount = 0;
    let complete = true;
    for (const provider of PROVIDERS) {
      const total = providerCosts[provider].amount;
      if (total === null) { complete = false; continue; }
      const usage = usageForProvider(row, provider);
      const totalUsage = providerUsage[provider];
      const share = totalUsage > 0 ? usage / totalUsage : (row.module_enabled && enabledRows.length ? 1 / enabledRows.length : 0);
      amount += total * share;
    }
    return { amount, complete };
  }

  const normalizedProfiles = profiles.map(profile => ({ ...profile })) as Array<{
    provider: 'resend' | 'cloudmersive'; plan_key: string; display_name: string; monthly_base_cost_usd: number | null;
    included_quantity: number | null; overage_unit_size: number | null; overage_unit_cost_usd: number | null;
    hard_limit_quantity: number | null; max_file_bytes: number | null; source_url: string | null; verified_at: string | null; notes: string | null;
  }>;

  const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 8px 28px rgba(15,23,42,.04)' } as const;

  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="bc">Commercial Operations / Setu Mail</div>
          <h1>Mail Usage &amp; Provider Cost</h1>
          <p>Organization utilization, quota posture and provider-cost estimates from the durable Setu Mail usage ledger.</p>
        </div>
        <div className="ha" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <form method="get" style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input aria-label="Usage month" type="month" name="month" defaultValue={monthInput(periodStart)} style={{ border: '1px solid #cbd5e1', borderRadius: 9, padding: '7px 9px', fontSize: 11, background: '#fff', color: '#0f172a' }} />
            <button className="smc-btn" type="submit">Load</button>
          </form>
          <Link className="smc-btn" href="/smc/revenue">Revenue</Link>
        </div>
      </div>

      <div style={{ padding: '0 16px 16px', display: 'grid', gridTemplateColumns: 'repeat(6,minmax(0,1fr))', gap: 10 }}>
        {[
          ['Mail-enabled orgs', enabledRows.length, `${rows.length} orgs with Mail configuration`],
          ['Provider emails', providerUsage.resend.toLocaleString(), `${rows.reduce((sum,row)=>sum+number(row.metered_outbound_messages),0)} outbound · ${rows.reduce((sum,row)=>sum+number(row.metered_inbound_messages),0)} inbound`],
          ['Malware scans', providerUsage.cloudmersive.toLocaleString(), activeProfiles.cloudmersive?.display_name ?? 'Cost profile missing'],
          ['Guru actions', totalGuruActions.toLocaleString(), `${monthLabel(periodStart)} Mail Guru usage`],
          ['Stored attachments', bytes(totalStorage), `${rows.reduce((sum,row)=>sum+number(row.attachment_count),0)} attachment records`],
          ['Known provider cost', money(knownCost), incompleteProviders.length ? `Partial — configure ${incompleteProviders.join(', ')}` : 'Current configured provider plans'],
        ].map(([label, value, helper]) => (
          <div key={String(label)} style={{ ...card, padding: '13px 14px' }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: '#94a3b8' }}>{label}</div>
            <div style={{ marginTop: 4, fontSize: 21, fontWeight: 900, color: '#1f487c' }}>{value}</div>
            <div style={{ marginTop: 4, fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>{helper}</div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 16px 18px', display: 'grid', gap: 14 }}>
        <section style={{ ...card, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
            <div><h2 style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>Provider cost assumptions</h2><p style={{ margin: '4px 0 0', fontSize: 10.5, color: '#64748b' }}>Choose the actual provider account plan. Pricing catalog is an estimate; provider invoices remain the accounting source of truth.</p></div>
            <span style={{ fontSize: 10, fontWeight: 800, color: incompleteProviders.length ? '#c2410c' : '#047857', background: incompleteProviders.length ? '#fff7ed' : '#ecfdf5', borderRadius: 999, padding: '5px 8px' }}>{incompleteProviders.length ? 'Cost setup incomplete' : 'Cost profiles ready'}</span>
          </div>
          <ProviderCostControls profiles={normalizedProfiles} settings={settings} />
        </section>

        <section style={{ ...card, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div><h2 style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>Provider economics — {monthLabel(periodStart)}</h2><p style={{ margin: '4px 0 0', fontSize: 10.5, color: '#64748b' }}>Resend usage counts only Setu Mail persisted inbound/outbound messages. Platform transactional email is excluded by design.</p></div>
            {counterDriftRows.length ? <span style={{ color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 800 }}>{counterDriftRows.length} counter drift warning{counterDriftRows.length === 1 ? '' : 's'}</span> : <span style={{ color: '#047857', background: '#ecfdf5', border: '1px solid #bbf7d0', borderRadius: 999, padding: '5px 8px', fontSize: 10, fontWeight: 800 }}>Metering reconciled</span>}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}>
            {PROVIDERS.map(provider => {
              const profile = activeProfiles[provider];
              const result = providerCosts[provider];
              const used = providerUsage[provider];
              const cap = profile?.hard_limit_quantity ?? profile?.included_quantity ?? null;
              return <div key={provider} style={{ border: '1px solid #eef2f7', borderRadius: 14, padding: 14, background: 'linear-gradient(180deg,#fff,#fbfdff)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><strong style={{ color: '#1f487c', fontSize: 13 }}>{profile?.display_name ?? titleCase(provider)}</strong><strong style={{ color: result.amount === null ? '#c2410c' : result.status === 'limit_exceeded' ? '#dc2626' : '#047857', fontSize: 13 }}>{money(result.amount)}</strong></div>
                <div style={{ marginTop: 9, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, fontSize: 10.5 }}>
                  <div><span style={{ color: '#94a3b8' }}>Usage</span><strong style={{ display: 'block', marginTop: 2 }}>{used.toLocaleString()}</strong></div>
                  <div><span style={{ color: '#94a3b8' }}>Included</span><strong style={{ display: 'block', marginTop: 2 }}>{profile?.included_quantity?.toLocaleString() ?? '—'}</strong></div>
                  <div><span style={{ color: '#94a3b8' }}>Overage</span><strong style={{ display: 'block', marginTop: 2 }}>{result.overageQuantity.toLocaleString()}</strong></div>
                </div>
                <Progress used={used} limit={cap} />
                <div style={{ marginTop: 6, fontSize: 9.5, color: '#64748b' }}>{result.status === 'unconfigured' ? 'Select the actual account plan to calculate cost.' : result.status === 'limit_exceeded' ? 'Current usage is beyond the configured hard/included capacity.' : result.overageBuckets ? `${result.overageBuckets} overage bucket${result.overageBuckets === 1 ? '' : 's'} estimated.` : 'Within configured monthly capacity.'}</div>
              </div>;
            })}
          </div>
        </section>

        <section style={{ ...card, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0', background: '#fbfdff' }}><h2 style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>Organization Mail economics</h2><p style={{ margin: '4px 0 0', fontSize: 10.5, color: '#64748b' }}>Provider cost allocation is usage-weighted. If a provider has no usage, fixed cost is split evenly across enabled Mail organizations.</p></div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 1180, borderCollapse: 'collapse', fontSize: 10.5 }}>
              <thead><tr style={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: '.04em', fontSize: 9 }}>
                {['Organization','Plan / access','Messages','Mailboxes / domains','Storage','Guru','Scans','Est. provider cost','Metering'].map(label => <th key={label} style={{ textAlign: 'left', padding: '9px 10px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>{label}</th>)}
              </tr></thead>
              <tbody>
                {rows.map(row => {
                  const inbound = number(row.metered_inbound_messages);
                  const outbound = number(row.metered_outbound_messages);
                  const messages = inbound + outbound;
                  const messageLimit = nullableNumber(row.monthly_message_limit);
                  const storage = number(row.storage_bytes);
                  const storageLimit = nullableNumber(row.storage_limit_bytes);
                  const guru = number(row.metered_guru_actions);
                  const guruLimit = nullableNumber(row.ai_actions_monthly_limit);
                  const allocation = allocatedCost(row);
                  const currentPeriod = row.entitlement_period_start === periodStart;
                  const drift = currentPeriod ? number(row.entitlement_message_counter) - messages : null;
                  return <tr key={row.organization_id} style={{ borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' }}>
                    <td style={{ padding: 10 }}><strong style={{ display: 'block', color: '#0f172a', fontSize: 11.5 }}>{row.organization_name}</strong><span style={{ color: '#94a3b8' }}>{row.organization_slug ?? row.organization_id.slice(0,8)}</span></td>
                    <td style={{ padding: 10 }}><strong style={{ display: 'block' }}>{titleCase(row.plan_key)}</strong><span style={{ color: row.module_enabled && row.entitlement_status === 'active' ? '#047857' : '#b45309' }}>{row.module_enabled ? 'Module on' : 'Module off'} · {titleCase(row.entitlement_status)}</span></td>
                    <td style={{ padding: 10, minWidth: 170 }}><strong>{messages.toLocaleString()} / {messageLimit?.toLocaleString() ?? '—'}</strong><div style={{ color: '#64748b', marginTop: 2 }}>{outbound} out · {inbound} in</div><Progress used={messages} limit={messageLimit} /></td>
                    <td style={{ padding: 10 }}><strong>{number(row.mailbox_count)} / {nullableNumber(row.mailbox_limit)?.toLocaleString() ?? '—'}</strong><div style={{ color: '#64748b', marginTop: 2 }}>{number(row.domain_count)} / {nullableNumber(row.domain_limit)?.toLocaleString() ?? '—'} domains</div></td>
                    <td style={{ padding: 10, minWidth: 145 }}><strong>{bytes(storage)} / {storageLimit ? bytes(storageLimit) : '—'}</strong><div style={{ color: '#64748b', marginTop: 2 }}>{bytes(number(row.quarantine_storage_bytes))} quarantined</div><Progress used={storage} limit={storageLimit} /></td>
                    <td style={{ padding: 10 }}><strong>{guru.toLocaleString()} / {guruLimit?.toLocaleString() ?? '—'}</strong><Progress used={guru} limit={guruLimit} /></td>
                    <td style={{ padding: 10 }}><strong>{number(row.metered_cloudmersive_scans).toLocaleString()}</strong></td>
                    <td style={{ padding: 10 }}><strong style={{ color: allocation.complete ? '#047857' : '#b45309' }}>{money(allocation.amount)}{allocation.complete ? '' : '*'}</strong><div style={{ color: '#94a3b8', marginTop: 2 }}>{allocation.complete ? 'usage-weighted' : 'partial estimate'}</div></td>
                    <td style={{ padding: 10 }}>{drift === null ? <span style={{ color: '#64748b' }}>Historical period</span> : drift === 0 ? <span style={{ color: '#047857', fontWeight: 800 }}>✓ Reconciled</span> : <span style={{ color: '#b45309', fontWeight: 800 }}>△ Counter {drift > 0 ? '+' : ''}{drift}</span>}</td>
                  </tr>;
                })}
                {!rows.length ? <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No Setu Mail organizations found for this workspace.</td></tr> : null}
              </tbody>
            </table>
          </div>
          {incompleteProviders.length ? <div style={{ padding: '9px 12px', borderTop: '1px solid #fed7aa', background: '#fff7ed', color: '#9a3412', fontSize: 10.5 }}>* Provider-cost allocation is partial until the {incompleteProviders.join(' and ')} account plan is selected above.</div> : null}
        </section>
      </div>
    </>
  );
}
