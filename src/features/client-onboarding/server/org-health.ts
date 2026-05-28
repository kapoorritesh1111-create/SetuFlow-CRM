import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { MODULE_DEFINITIONS, normalizeModuleKey } from '@/lib/modules/module-grants';

type OrgRow = {
  id: string;
  name: string;
  slug: string;
  legal_name: string | null;
  logo_url: string | null;
  website: string | null;
  contact_email: string | null;
  headquarters_country: string | null;
  default_market_id: string | null;
  approval_threshold_pct: number | null;
  created_at: string;
};

type RequestRow = {
  linked_organization_id: string | null;
  status: string;
};

type CountRow = { organization_id: string };
type ActivityRow = { organization_id: string; created_at: string };
type ModuleGrantRow = { organization_id: string; module_key: string; enabled: boolean };

type HealthDb = {
  from: (
    table:
      | 'organizations'
      | 'client_onboarding_requests'
      | 'organization_members'
      | 'products'
      | 'markets'
      | 'leads'
      | 'quotes'
      | 'lead_activities'
      | 'audit_logs'
      | 'org_module_grants',
  ) => {
    select: (columns: string) => {
      order: (column: string, options?: { ascending?: boolean }) => {
        limit: (count: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
      limit: (count: number) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
    };
  };
};

export type OrgHealthRow = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  onboardingStatus: string;
  healthScore: number;
  healthTone: 'success' | 'warning' | 'danger';
  completedSignals: string[];
  missingSignals: string[];
  lastActiveAt: string | null;
  moduleSummary: string;
  enabledModules: string[];
  counts: {
    activeOwners: number;
    products: number;
    markets: number;
    recentLeads: number;
    quotes: number;
  };
};

const HEALTH_SIGNAL_COUNT = 7;

function groupCount(rows: CountRow[]) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.organization_id] = (acc[row.organization_id] ?? 0) + 1;
    return acc;
  }, {});
}

function latestActivity(rows: ActivityRow[]) {
  return rows.reduce<Record<string, string>>((acc, row) => {
    const current = acc[row.organization_id];
    if (!current || new Date(row.created_at).getTime() > new Date(current).getTime()) {
      acc[row.organization_id] = row.created_at;
    }
    return acc;
  }, {});
}

function statusByOrg(rows: RequestRow[]) {
  return rows.reduce<Record<string, string>>((acc, row) => {
    if (row.linked_organization_id && !acc[row.linked_organization_id]) {
      acc[row.linked_organization_id] = row.status;
    }
    return acc;
  }, {});
}

function moduleSummary(rows: ModuleGrantRow[], organizationId: string) {
  const enabled = rows
    .filter((row) => row.organization_id === organizationId && row.enabled)
    .map((row) => normalizeModuleKey(row.module_key))
    .filter((value): value is NonNullable<ReturnType<typeof normalizeModuleKey>> => value !== null);
  const labels = enabled.map((key) => MODULE_DEFINITIONS.find((moduleDef) => moduleDef.key === key)?.title ?? key.replace(/_/g, ' '));
  return {
    enabledModules: labels,
    moduleSummary: labels.length ? labels.slice(0, 3).join(', ') + (labels.length > 3 ? ` +${labels.length - 3}` : '') : 'No modules enabled',
  };
}

function profileComplete(org: OrgRow) {
  return Boolean(org.legal_name && org.website && org.contact_email && org.headquarters_country);
}

function healthTone(score: number): OrgHealthRow['healthTone'] {
  if (score >= 75) return 'success';
  if (score >= 45) return 'warning';
  return 'danger';
}

export async function getLiveOrgHealthRows(currentOrganizationId: string): Promise<{ rows: OrgHealthRow[]; error: string | null }> {
  const supabase = (createAdminSupabaseClient() ?? (await createClient())) as unknown as HealthDb;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [orgResult, requestResult, memberResult, productResult, marketResult, leadResult, quoteResult, leadActivityResult, auditResult, grantResult] = await Promise.all([
    supabase.from('organizations').select('id, name, slug, legal_name, logo_url, website, contact_email, headquarters_country, default_market_id, approval_threshold_pct, created_at').order('created_at', { ascending: false }).limit(200),
    supabase.from('client_onboarding_requests').select('linked_organization_id, status').order('updated_at', { ascending: false }).limit(500),
    supabase.from('organization_members').select('organization_id').limit(5000),
    supabase.from('products').select('organization_id').limit(5000),
    supabase.from('markets').select('organization_id').limit(5000),
    supabase.from('leads').select('organization_id, created_at').order('created_at', { ascending: false }).limit(5000),
    supabase.from('quotes').select('organization_id').limit(5000),
    supabase.from('lead_activities').select('organization_id, created_at').order('created_at', { ascending: false }).limit(5000),
    supabase.from('audit_logs').select('organization_id, created_at').order('created_at', { ascending: false }).limit(5000),
    supabase.from('org_module_grants').select('organization_id, module_key, enabled').order('updated_at', { ascending: false }).limit(5000),
  ]);

  const firstError = [orgResult, requestResult, memberResult, productResult, marketResult, leadResult, quoteResult, leadActivityResult, auditResult, grantResult].find((result) => result.error)?.error?.message ?? null;
  if (firstError) return { rows: [], error: firstError };

  const orgs = ((orgResult.data ?? []) as OrgRow[]).filter((org) => org.id !== currentOrganizationId);
  const statuses = statusByOrg((requestResult.data ?? []) as RequestRow[]);
  const owners = groupCount((memberResult.data ?? []) as CountRow[]);
  const products = groupCount((productResult.data ?? []) as CountRow[]);
  const markets = groupCount((marketResult.data ?? []) as CountRow[]);
  const quotes = groupCount((quoteResult.data ?? []) as CountRow[]);
  const recentLeadRows = ((leadResult.data ?? []) as (CountRow & { created_at: string })[]).filter((row) => row.created_at >= thirtyDaysAgo);
  const recentLeads = groupCount(recentLeadRows);
  const lastLeadActivity = latestActivity((leadActivityResult.data ?? []) as ActivityRow[]);
  const lastAuditActivity = latestActivity((auditResult.data ?? []) as ActivityRow[]);
  const grantRows = (grantResult.data ?? []) as ModuleGrantRow[];

  const rows = orgs.map((org) => {
    const checks = [
      { label: 'Profile complete', done: profileComplete(org) },
      { label: 'Owner assigned', done: (owners[org.id] ?? 0) > 0 },
      { label: 'Products loaded', done: (products[org.id] ?? 0) > 0 },
      { label: 'Markets configured', done: (markets[org.id] ?? 0) > 0 || Boolean(org.default_market_id) },
      { label: 'Recent leads', done: (recentLeads[org.id] ?? 0) > 0 },
      { label: 'Quotes created', done: (quotes[org.id] ?? 0) > 0 },
      { label: 'Approval threshold set', done: org.approval_threshold_pct !== null },
    ];
    const completedSignals = checks.filter((check) => check.done).map((check) => check.label);
    const score = Math.round((completedSignals.length / HEALTH_SIGNAL_COUNT) * 100);
    const leadActivity = lastLeadActivity[org.id] ?? null;
    const auditActivity = lastAuditActivity[org.id] ?? null;
    const lastActiveAt = [leadActivity, auditActivity].filter(Boolean).sort().at(-1) ?? null;
    const modules = moduleSummary(grantRows, org.id);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logo_url,
      onboardingStatus: statuses[org.id] ?? 'live',
      healthScore: score,
      healthTone: healthTone(score),
      completedSignals,
      missingSignals: checks.filter((check) => !check.done).map((check) => check.label),
      lastActiveAt,
      ...modules,
      counts: {
        activeOwners: owners[org.id] ?? 0,
        products: products[org.id] ?? 0,
        markets: markets[org.id] ?? 0,
        recentLeads: recentLeads[org.id] ?? 0,
        quotes: quotes[org.id] ?? 0,
      },
    };
  });

  return { rows: rows.sort((a, b) => a.healthScore - b.healthScore || a.name.localeCompare(b.name)), error: null };
}
