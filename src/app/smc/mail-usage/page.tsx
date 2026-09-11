import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';
import { loadMailUsageSnapshot, type CostProfile, type ProviderSetting, type UsageRow } from '@/lib/mail/smc-usage-snapshot';
import { ProviderCostControls } from './provider-cost-controls';

export const dynamic = 'force-dynamic';
const PROVIDERS = ['resend', 'cloudmersive'] as const;

type Provider = (typeof PROVIDERS)[number];
type NormalizedProfile = Omit<CostProfile, 'monthly_base_cost_usd' | 'included_quantity' | 'overage_unit_size' | 'overage_unit_cost_usd' | 'hard_limit_quantity' | 'max_file_bytes'> & {
  monthly_base_cost_usd: number | null;
  included_quantity: number | null;
  overage_unit_size: number | null;
  overage_unit_cost_usd: number | null;
  hard_limit_quantity: number | null;
  max_file_bytes: number | null;
};

const card = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 8px 28px rgba(15,23,42,.04)' } as const;
function n(value: unknown) { const parsed = Number(value ?? 0); return Number.isFinite(parsed) ? parsed : 0; }
function nullable(value: unknown) { if (value === null || value === undefined || value === '') return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : null; }
function money(value: number | null) { return value === null ? 'Not configured' : `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
function bytes(value: number) { if (!value) return '0 B'; const units = ['B','KB','MB','GB','TB']; let i = 0; let current = value; while (current >= 1024 && i < units.length - 1) { current /= 1024; i += 1; } return `${current.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${units[i]}`; }
function monthStart(value: unknown) { const text = typeof value === 'string' ? value.trim() : ''; if (/^\d{4}-\d{2}$/.test(text)) return `${text}-01`; const now = new Date(); return `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-01`; }
function monthLabel(value: string) { return new Date(`${value}T00:00:00Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }); }
function titleCase(value: string | null) { return value ? value.replace(/[_-]+/g,' ').replace(/\b\w/g, x => x.toUpperCase()) : '—'; }
function normalizeProfile(profile: CostProfile): NormalizedProfile { return { ...profile, monthly_base_cost_usd: nullable(profile.monthly_base_cost_usd), included_quantity: nullable(profile.included_quantity), overage_unit_size: nullable(profile.overage_unit_size), overage_unit_cost_usd: nullable(profile.overage_unit_cost_usd), hard_limit_quantity: nullable(profile.hard_limit_quantity), max_file_bytes: nullable(profile.max_file_bytes) }; }
function usage(row: UsageRow, provider: Provider) { return provider === 'resend' ? n(row.metered_inbound_messages) + n(row.metered_outbound_messages) : n(row.metered_cloudmersive_scans); }
function providerCost(profile: NormalizedProfile | null, used: number) {
  if (!profile || profile.monthly_base_cost_usd === null) return null;
  const included = profile.included_quantity ?? 0;
  const extra = Math.max(0, used - included);
  if (!extra) return profile.monthly_base_cost_usd;
  if (profile.overage_unit_size && profile.overage_unit_cost_usd !== null) return profile.monthly_base_cost_usd + Math.ceil(extra / profile.overage_unit_size) * profile.overage_unit_cost_usd;
  return profile.monthly_base_cost_usd;
}
function Progress({ used, limit }: { used: number; limit: number | null }) {
  const pct = !limit || limit <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
  const tone = pct >= 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#279491';
  return <div style={{ marginTop: 5, height: 5, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}><div style={{ width: `${pct}%`, height: '100%', background: tone }} /></div>;
}

export default async function SmcMailUsagePage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: membership } = await supabase.from('organization_members').select('id').eq('organization_id', INTERNAL_ORG_ID).eq('user_id', user.id).maybeSingle();
  if (!membership) redirect('/dashboard');

  const admin = createServiceRoleClient() as any;
  if (!admin) throw new Error('SMC service role client is not configured.');
  const period = monthStart(searchParams?.month);
  const snapshot = await loadMailUsageSnapshot(admin, period);
  const rows = snapshot.rows;
  const profiles = snapshot.profiles.map(normalizeProfile);
  const settings = snapshot.settings as ProviderSetting[];
  const activeProfiles = Object.fromEntries(PROVIDERS.map(provider => {
    const key = settings.find(item => item.provider === provider)?.active_plan_key;
    return [provider, profiles.find(item => item.provider === provider && item.plan_key === key) ?? null];
  })) as Record<Provider, NormalizedProfile | null>;

  const providerUsage = { resend: rows.reduce((s,row)=>s+usage(row,'resend'),0), cloudmersive: rows.reduce((s,row)=>s+usage(row,'cloudmersive'),0) };
  const providerCosts = { resend: providerCost(activeProfiles.resend, providerUsage.resend), cloudmersive: providerCost(activeProfiles.cloudmersive, providerUsage.cloudmersive) };
  const enabledRows = rows.filter(row => row.module_enabled);
  const totalCost = PROVIDERS.reduce((sum,p)=>sum+(providerCosts[p] ?? 0),0);
  const totalStorage = rows.reduce((sum,row)=>sum+n(row.storage_bytes),0);
  const totalGuru = rows.reduce((sum,row)=>sum+n(row.metered_guru_actions),0);

  function allocation(row: UsageRow) {
    let amount = 0;
    for (const provider of PROVIDERS) {
      const cost = providerCosts[provider] ?? 0;
      const total = providerUsage[provider];
      const share = total > 0 ? usage(row,provider)/total : row.module_enabled && enabledRows.length ? 1/enabledRows.length : 0;
      amount += cost * share;
    }
    return amount;
  }

  return <>
    <div className="smc-ph">
      <div><div className="bc">Commercial Operations / Setu Mail</div><h1>Mail Usage &amp; Provider Cost</h1><p>Organization utilization, quota posture and provider economics for {monthLabel(period)}.</p></div>
      <div className="ha" style={{display:'flex',gap:8,alignItems:'center'}}><form method="get" style={{display:'flex',gap:6}}><input aria-label="Usage month" type="month" name="month" defaultValue={period.slice(0,7)} style={{border:'1px solid #cbd5e1',borderRadius:9,padding:'7px 9px'}}/><button className="smc-btn" type="submit">Load</button></form><Link className="smc-btn" href="/smc/revenue">Revenue</Link></div>
    </div>

    {!snapshot.schemaReady && <div style={{margin:'0 16px 14px',padding:'11px 13px',border:'1px solid #bfdbfe',background:'#eff6ff',borderRadius:12,color:'#1e3a8a',fontSize:11,lineHeight:1.5}}><strong>Preview compatibility mode.</strong> {snapshot.compatibilityReason} This lets you review the SMC experience before any S41-MAIL-010 database migration is promoted to production.</div>}

    <div style={{padding:'0 16px 14px',display:'grid',gridTemplateColumns:'repeat(6,minmax(0,1fr))',gap:10}}>
      {[
        ['Mail-enabled orgs', enabledRows.length, `${rows.length} configured organization${rows.length===1?'':'s'}`],
        ['Resend email units', providerUsage.resend.toLocaleString(), `${rows.reduce((s,r)=>s+n(r.metered_outbound_messages),0)} outbound · ${rows.reduce((s,r)=>s+n(r.metered_inbound_messages),0)} inbound`],
        ['Malware scans', providerUsage.cloudmersive.toLocaleString(), activeProfiles.cloudmersive?.display_name ?? 'Cloudmersive'],
        ['Guru actions', totalGuru.toLocaleString(), 'Mail Guru usage'],
        ['Stored attachments', bytes(totalStorage), `${rows.reduce((s,r)=>s+n(r.attachment_count),0)} attachment records`],
        ['Provider base + overage', money(totalCost), 'Resend + Cloudmersive estimate'],
      ].map(([label,value,helper])=><div key={String(label)} style={{...card,padding:'13px 14px'}}><div style={{fontSize:9.5,fontWeight:800,textTransform:'uppercase',letterSpacing:'.08em',color:'#94a3b8'}}>{label}</div><div style={{marginTop:4,fontSize:21,fontWeight:900,color:'#1f487c'}}>{value}</div><div style={{marginTop:4,fontSize:10,color:'#64748b'}}>{helper}</div></div>)}
    </div>

    <div style={{padding:'0 16px 18px',display:'grid',gap:14}}>
      <section style={{...card,padding:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12,marginBottom:12}}><div><h2 style={{margin:0,fontSize:14}}>Provider economics</h2><p style={{margin:'4px 0 0',fontSize:10.5,color:'#64748b'}}>Platform transactional email is excluded by design. Provider invoices remain the accounting source of truth.</p></div><span style={{fontSize:10,fontWeight:800,color:'#047857',background:'#ecfdf5',borderRadius:999,padding:'5px 8px'}}>{snapshot.schemaReady ? 'Durable ledger active' : 'Preview data fallback'}</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:12}}>{PROVIDERS.map(provider=>{const profile=activeProfiles[provider];const used=providerUsage[provider];const limit=profile?.hard_limit_quantity ?? profile?.included_quantity ?? null;return <div key={provider} style={{border:'1px solid #eef2f7',borderRadius:14,padding:14,background:'#fbfdff'}}><div style={{display:'flex',justifyContent:'space-between',gap:10}}><strong style={{color:'#1f487c'}}>{profile?.display_name ?? titleCase(provider)}</strong><strong style={{color:'#047857'}}>{money(providerCosts[provider])}</strong></div><div style={{marginTop:10,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,fontSize:10.5}}><div><span style={{color:'#94a3b8'}}>Usage</span><strong style={{display:'block'}}>{used.toLocaleString()}</strong></div><div><span style={{color:'#94a3b8'}}>Included</span><strong style={{display:'block'}}>{profile?.included_quantity?.toLocaleString() ?? '—'}</strong></div><div><span style={{color:'#94a3b8'}}>Base</span><strong style={{display:'block'}}>{money(profile?.monthly_base_cost_usd ?? null)}</strong></div></div><Progress used={used} limit={limit}/><div style={{marginTop:6,fontSize:9.5,color:'#64748b'}}>{profile?.notes}</div></div>})}</div>
        <div style={{marginTop:12}}>{snapshot.schemaReady ? <ProviderCostControls profiles={profiles} settings={settings}/> : <div style={{fontSize:10.5,color:'#64748b'}}>Provider selections are locked in Preview to <strong>Resend Pro</strong> and <strong>Cloudmersive Basic</strong>. Editable provider controls activate automatically after the commercial usage migration is approved.</div>}</div>
      </section>

      <section style={{...card,overflow:'hidden'}}>
        <div style={{padding:'14px 16px',borderBottom:'1px solid #e2e8f0',background:'#fbfdff'}}><h2 style={{margin:0,fontSize:14}}>Organization Mail economics</h2><p style={{margin:'4px 0 0',fontSize:10.5,color:'#64748b'}}>Usage, entitlement position and estimated provider-cost allocation by organization.</p></div>
        <div style={{overflowX:'auto'}}><table style={{width:'100%',minWidth:1180,borderCollapse:'collapse',fontSize:10.5}}><thead><tr>{['Organization','Plan / access','Email units','Mailboxes / domains','Storage','Guru','Scans','Est. provider cost','Metering'].map(label=><th key={label} style={{textAlign:'left',padding:'9px 10px',borderBottom:'1px solid #e2e8f0',background:'#f8fafc',fontSize:9,color:'#64748b',textTransform:'uppercase'}}>{label}</th>)}</tr></thead><tbody>
          {rows.map(row=>{const inbound=n(row.metered_inbound_messages);const outbound=n(row.metered_outbound_messages);const units=inbound+outbound;const messageLimit=nullable(row.monthly_message_limit);const storage=n(row.storage_bytes);const storageLimit=nullable(row.storage_limit_bytes);const guru=n(row.metered_guru_actions);const guruLimit=nullable(row.ai_actions_monthly_limit);return <tr key={row.organization_id} style={{borderBottom:'1px solid #f1f5f9',verticalAlign:'top'}}><td style={{padding:10}}><strong style={{display:'block',fontSize:11.5}}>{row.organization_name}</strong><span style={{color:'#94a3b8'}}>{row.organization_slug ?? row.organization_id.slice(0,8)}</span></td><td style={{padding:10}}><strong style={{display:'block'}}>{titleCase(row.plan_key)}</strong><span style={{color:row.module_enabled&&row.entitlement_status==='active'?'#047857':'#b45309'}}>{row.module_enabled?'Module on':'Module off'} · {titleCase(row.entitlement_status)}</span></td><td style={{padding:10,minWidth:160}}><strong>{units.toLocaleString()} / {messageLimit?.toLocaleString() ?? '—'}</strong><div style={{color:'#64748b'}}>{outbound} out · {inbound} in</div><Progress used={units} limit={messageLimit}/></td><td style={{padding:10}}><strong>{n(row.mailbox_count)} / {nullable(row.mailbox_limit)?.toLocaleString() ?? '—'}</strong><div style={{color:'#64748b'}}>{n(row.domain_count)} / {nullable(row.domain_limit)?.toLocaleString() ?? '—'} domains</div></td><td style={{padding:10,minWidth:145}}><strong>{bytes(storage)} / {storageLimit?bytes(storageLimit):'—'}</strong><div style={{color:'#64748b'}}>{bytes(n(row.quarantine_storage_bytes))} quarantined</div><Progress used={storage} limit={storageLimit}/></td><td style={{padding:10}}><strong>{guru.toLocaleString()} / {guruLimit?.toLocaleString() ?? '—'}</strong><Progress used={guru} limit={guruLimit}/></td><td style={{padding:10}}><strong>{n(row.metered_cloudmersive_scans).toLocaleString()}</strong></td><td style={{padding:10}}><strong style={{color:'#047857'}}>{money(allocation(row))}</strong><div style={{color:'#94a3b8'}}>usage-weighted</div></td><td style={{padding:10}}><span style={{color:snapshot.schemaReady?'#047857':'#1d4ed8',fontWeight:800}}>{snapshot.schemaReady?'✓ Ledger':'Preview fallback'}</span></td></tr>})}
          {!rows.length && <tr><td colSpan={9} style={{padding:24,textAlign:'center',color:'#64748b'}}>No Setu Mail organizations found.</td></tr>}
        </tbody></table></div>
      </section>
    </div>
  </>;
}
