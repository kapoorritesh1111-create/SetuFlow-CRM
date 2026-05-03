import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName, normalizeWorkspaceRoles } from '@/lib/workspace/roles';
import type { MobileLead, MobileUserContext } from './role-aware-leads';
import { workspaceRolesToMobileRole } from './role-aware-leads';

type LookupRow = Record<string, unknown>;

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatDate(value: unknown) {
  const raw = asString(value);
  if (!raw) return 'Not updated';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

function buildMap(rows: LookupRow[] = [], labelField = 'name') {
  return new Map(rows.map((row) => [asString(row.id), asString(row[labelField], asString(row.username, '—'))]));
}

export function buildMobileLeadCardsFromAppData(data: {
  leads: LookupRow[];
  stages?: LookupRow[];
  nextSteps?: LookupRow[];
  profiles?: LookupRow[];
  countries?: LookupRow[];
  markets?: LookupRow[];
  products?: LookupRow[];
  leadMarkets?: LookupRow[];
  leadProductInterests?: LookupRow[];
}): MobileLead[] {
  const stageById = buildMap(data.stages ?? []);
  const nextStepById = buildMap(data.nextSteps ?? []);
  const profileById = new Map((data.profiles ?? []).map((profile) => [asString(profile.id), asString(profile.full_name, asString(profile.username, 'Unassigned'))]));
  const countryById = buildMap(data.countries ?? []);
  const marketById = buildMap(data.markets ?? []);
  const productById = buildMap(data.products ?? []);

  const marketIdsByLead = new Map<string, string[]>();
  for (const row of data.leadMarkets ?? []) {
    const leadId = asString(row.lead_id);
    const marketId = asString(row.market_id);
    if (!leadId || !marketId) continue;
    marketIdsByLead.set(leadId, [...(marketIdsByLead.get(leadId) ?? []), marketId]);
  }

  const productIdsByLead = new Map<string, string[]>();
  for (const row of data.leadProductInterests ?? []) {
    const leadId = asString(row.lead_id);
    const productId = asString(row.product_id);
    if (!leadId || !productId) continue;
    productIdsByLead.set(leadId, [...(productIdsByLead.get(leadId) ?? []), productId]);
  }

  return (data.leads ?? []).map((lead) => {
    const id = asString(lead.id);
    const ownerId = asString(lead.owner_user_id);
    const marketNames = (marketIdsByLead.get(id) ?? []).map((marketId) => marketById.get(marketId)).filter(Boolean) as string[];
    const productNames = (productIdsByLead.get(id) ?? []).map((productId) => productById.get(productId)).filter(Boolean) as string[];
    const countryName = countryById.get(asString(lead.country_id)) ?? asString(lead.country);
    return {
      id,
      company: asString(lead.company_name, 'Unnamed company'),
      contact: asString(lead.contact_name, 'No contact yet'),
      ownerName: profileById.get(ownerId) ?? 'Unassigned',
      assignedUserId: ownerId,
      managerUserId: asString(lead.manager_user_id) || null,
      teamId: asString(lead.team_id, asString(lead.pipeline_id, 'workspace')),
      teamName: asString(lead.team_name, asString(lead.lead_type, 'Workspace')),
      status: stageById.get(asString(lead.stage_id)) ?? 'Unstaged',
      nextAction: nextStepById.get(asString(lead.next_step_id)) ?? 'Choose next action',
      valueUsd: asNumber(lead.deal_value, 0),
      market: marketNames[0] ?? countryName ?? 'Market pending',
      productInterest: productNames[0] ?? 'Product interest pending',
      lastActivity: formatDate(lead.updated_at ?? lead.created_at),
    } satisfies MobileLead;
  });
}

export function buildMobileUserContextFromWorkspace(workspace: {
  user?: { id?: string | null } | null;
  profile?: { full_name?: string | null; username?: string | null } | null;
  currentRoles?: string[];
}): MobileUserContext {
  const roles = normalizeWorkspaceRoles(workspace.currentRoles ?? []);
  return {
    id: workspace.user?.id ?? '',
    name: workspace.profile?.full_name ?? workspace.profile?.username ?? 'Signed-in user',
    role: workspaceRolesToMobileRole(roles),
    managedTeamIds: [],
    directReportIds: [],
  };
}

export function buildMobileSignedInSummary(workspace: {
  profile?: { full_name?: string | null; username?: string | null; email?: string | null } | null;
  organization?: { name?: string | null } | null;
  currentRoles?: string[];
}) {
  const roles = normalizeWorkspaceRoles(workspace.currentRoles ?? []);
  const primaryRole = getPrimaryWorkspaceRole(roles) ?? 'member';
  const params = new URLSearchParams();
  params.set('name', workspace.profile?.full_name ?? workspace.profile?.username ?? 'SETU Flow user');
  if (workspace.profile?.email) params.set('email', workspace.profile.email);
  params.set('org', workspace.organization?.name ?? 'SETU Flow');
  params.set('role', getWorkspaceRoleDisplayName(primaryRole));
  return {
    name: workspace.profile?.full_name ?? workspace.profile?.username ?? 'SETU Flow user',
    email: workspace.profile?.email ?? null,
    roleLabel: getWorkspaceRoleDisplayName(primaryRole),
    organizationName: workspace.organization?.name ?? 'SETU Flow',
    shareHref: `/card?${params.toString()}`,
  };
}
