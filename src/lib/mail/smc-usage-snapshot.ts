export type UsageRow = {
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

export type CostProfile = {
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

export type ProviderSetting = { provider: 'resend' | 'cloudmersive'; active_plan_key: string };
export type UsageSnapshot = { rows: UsageRow[]; profiles: CostProfile[]; settings: ProviderSetting[]; schemaReady: boolean; compatibilityReason: string | null };

const FALLBACK_PROFILES: CostProfile[] = [
  {
    provider: 'resend', plan_key: 'pro', display_name: 'Resend Pro', monthly_base_cost_usd: 20,
    included_quantity: 50000, overage_unit_size: 1000, overage_unit_cost_usd: 0.9, hard_limit_quantity: null,
    max_file_bytes: null, source_url: 'https://resend.com/pricing', verified_at: '2026-09-11',
    notes: '$20/month includes 50,000 email units; paid overage is estimated at $0.90 per additional 1,000 units.',
  },
  {
    provider: 'cloudmersive', plan_key: 'basic', display_name: 'Cloudmersive Basic', monthly_base_cost_usd: 19.99,
    included_quantity: 10000, overage_unit_size: null, overage_unit_cost_usd: null, hard_limit_quantity: 10000,
    max_file_bytes: 1000000000, source_url: 'https://portal.cloudmersive.com/selectplan', verified_at: '2026-09-11',
    notes: '10,000 scan calls/month; 1 GB maximum file size.',
  },
];
const FALLBACK_SETTINGS: ProviderSetting[] = [
  { provider: 'resend', active_plan_key: 'pro' },
  { provider: 'cloudmersive', active_plan_key: 'basic' },
];

function asNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}
function monthBounds(periodStart: string) {
  const start = new Date(`${periodStart}T00:00:00Z`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}
function isMissingSchema(error: any) {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  return text.includes('pgrst202') || text.includes('pgrst205') || text.includes('42p01') || text.includes('42883') || text.includes('schema cache') || text.includes('does not exist') || text.includes('could not find');
}

export async function loadMailUsageSnapshot(admin: any, periodStart: string): Promise<UsageSnapshot> {
  const [usageResult, catalogResult, settingResult] = await Promise.all([
    admin.rpc('mail_smc_commercial_usage', { p_period_start: periodStart }),
    admin.from('mail_provider_cost_catalog').select('provider,plan_key,display_name,monthly_base_cost_usd,included_quantity,overage_unit_size,overage_unit_cost_usd,hard_limit_quantity,max_file_bytes,source_url,verified_at,notes').order('provider').order('monthly_base_cost_usd', { ascending: true, nullsFirst: true }),
    admin.from('mail_provider_cost_settings').select('provider,active_plan_key').order('provider'),
  ]);

  if (!usageResult.error && !catalogResult.error && !settingResult.error) {
    return {
      rows: (usageResult.data ?? []) as UsageRow[],
      profiles: (catalogResult.data ?? []) as CostProfile[],
      settings: (settingResult.data ?? []) as ProviderSetting[],
      schemaReady: true,
      compatibilityReason: null,
    };
  }

  const errors = [usageResult.error, catalogResult.error, settingResult.error].filter(Boolean);
  if (errors.some(error => !isMissingSchema(error))) {
    throw new Error(`Unable to load Setu Mail usage: ${errors.map(error => error.message).join('; ')}`);
  }

  const { start, end } = monthBounds(periodStart);
  const entitlementsResult = await admin.from('mail_entitlements').select('organization_id,plan_key,status,mailbox_limit,domain_limit,storage_limit_bytes,monthly_message_limit,ai_actions_monthly_limit,current_period_start,current_period_messages,current_period_ai_actions');
  if (entitlementsResult.error) throw new Error(`Unable to load Mail entitlements: ${entitlementsResult.error.message}`);
  const entitlements = entitlementsResult.data ?? [];
  const orgIds = entitlements.map((row: any) => row.organization_id).filter(Boolean);
  if (!orgIds.length) return { rows: [], profiles: FALLBACK_PROFILES, settings: FALLBACK_SETTINGS, schemaReady: false, compatibilityReason: 'Commercial usage migration is not applied yet.' };

  const [orgsResult, grantsResult, mailboxesResult, domainsResult, attachmentsResult, messagesResult] = await Promise.all([
    admin.from('organizations').select('id,name,slug').in('id', orgIds),
    admin.from('org_module_grants').select('organization_id,enabled').in('organization_id', orgIds).eq('module_key', 'setu_mail'),
    admin.from('mail_mailboxes').select('organization_id,status').in('organization_id', orgIds),
    admin.from('mail_domains').select('organization_id').in('organization_id', orgIds),
    admin.from('mail_attachments').select('organization_id,size_bytes,security_status,scan_attempts,scanned_at').in('organization_id', orgIds),
    admin.from('mail_messages').select('organization_id,direction,status,provider_message_id,to_addresses,cc_addresses,bcc_addresses,sent_at,received_at').in('organization_id', orgIds).or(`and(sent_at.gte.${start},sent_at.lt.${end}),and(received_at.gte.${start},received_at.lt.${end})`),
  ]);
  const sourceErrors = [orgsResult.error, grantsResult.error, mailboxesResult.error, domainsResult.error, attachmentsResult.error, messagesResult.error].filter(Boolean);
  if (sourceErrors.length) throw new Error(`Unable to build preview Mail usage: ${sourceErrors.map((error: any) => error.message).join('; ')}`);

  const orgs = new Map((orgsResult.data ?? []).map((row: any) => [row.id, row]));
  const grants = new Map((grantsResult.data ?? []).map((row: any) => [row.organization_id, Boolean(row.enabled)]));
  const mailboxes = mailboxesResult.data ?? [];
  const domains = domainsResult.data ?? [];
  const attachments = attachmentsResult.data ?? [];
  const messages = messagesResult.data ?? [];
  const currentMonth = new Date().toISOString().slice(0, 7) === periodStart.slice(0, 7);

  const rows: UsageRow[] = entitlements.map((entitlement: any) => {
    const organizationId = entitlement.organization_id;
    const org: any = orgs.get(organizationId) ?? {};
    const orgAttachments = attachments.filter((row: any) => row.organization_id === organizationId);
    const orgMessages = messages.filter((row: any) => row.organization_id === organizationId);
    let inbound = 0;
    let outbound = 0;
    for (const message of orgMessages) {
      if (message.direction === 'inbound' && message.status === 'received') inbound += 1;
      if (message.direction === 'outbound' && message.provider_message_id && !['draft', 'failed'].includes(String(message.status))) {
        outbound += (message.to_addresses?.length ?? 0) + (message.cc_addresses?.length ?? 0) + (message.bcc_addresses?.length ?? 0);
      }
    }
    const scans = orgAttachments.reduce((sum: number, row: any) => {
      if (!row.scanned_at || row.scanned_at < start || row.scanned_at >= end) return sum;
      return sum + Math.max(1, asNumber(row.scan_attempts));
    }, 0);
    const storage = orgAttachments.reduce((sum: number, row: any) => sum + asNumber(row.size_bytes), 0);
    const cleanStorage = orgAttachments.filter((row: any) => row.security_status === 'clean').reduce((sum: number, row: any) => sum + asNumber(row.size_bytes), 0);
    const quarantineStorage = orgAttachments.filter((row: any) => row.security_status === 'quarantined').reduce((sum: number, row: any) => sum + asNumber(row.size_bytes), 0);
    return {
      organization_id: organizationId,
      organization_name: org.name ?? 'Unknown organization',
      organization_slug: org.slug ?? null,
      module_enabled: grants.get(organizationId) ?? false,
      entitlement_status: entitlement.status ?? null,
      plan_key: entitlement.plan_key ?? null,
      mailbox_limit: entitlement.mailbox_limit ?? null,
      domain_limit: entitlement.domain_limit ?? null,
      storage_limit_bytes: entitlement.storage_limit_bytes ?? null,
      monthly_message_limit: entitlement.monthly_message_limit ?? null,
      ai_actions_monthly_limit: entitlement.ai_actions_monthly_limit ?? null,
      entitlement_period_start: entitlement.current_period_start ?? null,
      entitlement_message_counter: entitlement.current_period_messages ?? null,
      entitlement_ai_counter: entitlement.current_period_ai_actions ?? null,
      mailbox_count: mailboxes.filter((row: any) => row.organization_id === organizationId && row.status === 'active').length,
      domain_count: domains.filter((row: any) => row.organization_id === organizationId).length,
      attachment_count: orgAttachments.length,
      storage_bytes: storage,
      clean_storage_bytes: cleanStorage,
      quarantine_storage_bytes: quarantineStorage,
      metered_inbound_messages: inbound,
      metered_outbound_messages: outbound,
      metered_cloudmersive_scans: scans,
      metered_guru_actions: currentMonth ? asNumber(entitlement.current_period_ai_actions) : 0,
    };
  });

  return {
    rows,
    profiles: FALLBACK_PROFILES,
    settings: FALLBACK_SETTINGS,
    schemaReady: false,
    compatibilityReason: 'Preview is using live Mail tables because the commercial usage migration has not been promoted yet. Final production will switch automatically to the durable usage ledger after sign-off.',
  };
}
