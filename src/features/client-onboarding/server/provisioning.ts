import { createInvitationToken, hashInvitationToken } from '@/lib/invitationTokens';
import { DEFAULT_SETU_FLOW_LOGO, ROOT_DOMAIN, defaultMarkets, defaultNextSteps, defaultPipelineStages, defaultPipelines, slugifyCompanyName } from '@/features/client-onboarding/shared';
import { MODULE_DEFINITIONS, normalizeModuleKey, type ModuleKey } from '@/lib/modules/module-grants';
import { getTrialTemplateConfig, resolveTrialTemplateKeyForRequest } from '@/lib/trial/templates';

type SupabaseAdmin = any;

type OnboardingRequest = {
  id: string;
  company_name: string;
  company_slug: string | null;
  workspace_domain: string | null;
  logo_url: string | null;
  website: string | null;
  primary_admin_name: string | null;
  primary_admin_email: string | null;
  headquarters_country: string | null;
  requested_markets: string[] | null;
  requested_countries: string[] | null;
  requested_pipelines: string[] | null;
  requested_pipeline_stages: string[] | null;
  requested_next_steps: string[] | null;
  requested_modules: string[] | null;
  requested_plan: string | null;
  requested_seat_count: number | null;
  is_trial_request: boolean | null;
  pricing_rules_notes: string | null;
  product_category_notes: string | null;
  wants_trade_events: boolean | null;
};

type ProvisioningInput = { admin: SupabaseAdmin; request: OnboardingRequest; platformOrganizationId: string; actorMembershipId: string; actorUserId: string | null };
type ProvisioningResult = { organizationId: string; workspaceDomain: string; countriesSeeded: number; marketsSeeded: number; pipelinesSeeded: number; stagesSeeded: number; nextStepsSeeded: number; rolesSeeded: number; invitationId: string | null; invitationAcceptUrl: string | null };

const defaultRoles = [
  { name: 'owner', description: 'Full workspace control, billing readiness, users, settings, and all operational records.' },
  { name: 'admin', description: 'Workspace administration, users, settings, reference data, and operational oversight.' },
  { name: 'sales', description: 'Lead, quote, pipeline, customer, and follow-up execution.' },
  { name: 'operations', description: 'Orders, documents, trade execution, tasks, and shipment coordination.' },
  { name: 'viewer', description: 'Read-only reporting and workspace visibility.' },
] as const;

function cleanList(value: string[] | null | undefined, fallback: string[]) { const items = Array.isArray(value) && value.length > 0 ? value : fallback; return Array.from(new Set(items.map((item) => String(item ?? '').trim()).filter(Boolean))); }
function normalizeEmail(value: string | null | undefined) { return String(value ?? '').trim().toLowerCase(); }
function normalizeLookup(value: string | null | undefined) { return String(value ?? '').trim().toLowerCase(); }
function normalizePlan(value: string | null | undefined, trial?: boolean | null) { const text = String(value ?? '').trim().toLowerCase(); if (trial || text === 'trial') return 'starter'; if (['starter', 'growth', 'professional', 'enterprise', 'custom'].includes(text)) return text; return 'enterprise'; }
function cleanModuleKeys(value: string[] | null | undefined): ModuleKey[] { return Array.from(new Set((value ?? []).map((item) => normalizeModuleKey(item)).filter((item): item is ModuleKey => item !== null))); }

async function countRows(admin: SupabaseAdmin, table: string, organizationId: string) { const { count } = await admin.from(table).select('id', { count: 'exact', head: true }).eq('organization_id', organizationId); return Number(count ?? 0); }
async function seedMarkets(admin: SupabaseAdmin, organizationId: string, requestedMarkets: string[] | null | undefined) {
  const existingCount = await countRows(admin, 'markets', organizationId);
  if (existingCount > 0) { const { data } = await admin.from('markets').select('id, name').eq('organization_id', organizationId).order('sort_order'); return { rows: data ?? [], inserted: 0 }; }
  const rows = cleanList(requestedMarkets, defaultMarkets).map((name, index) => ({ organization_id: organizationId, name, market_code: `${slugifyCompanyName(name).toUpperCase().slice(0, 8)}${index + 1}`, sort_order: index + 1, is_active: true }));
  const { data, error } = await admin.from('markets').insert(rows).select('id, name').throwOnError();
  if (error) throw error;
  return { rows: data ?? [], inserted: rows.length };
}
async function seedCountries(admin: SupabaseAdmin, organizationId: string, platformOrganizationId: string, fallbackMarketId: string | null) {
  const existingCount = await countRows(admin, 'countries', organizationId);
  if (existingCount > 0 || !fallbackMarketId) return 0;
  const { data: targetMarkets, error: targetMarketError } = await admin.from('markets').select('id, name').eq('organization_id', organizationId);
  if (targetMarketError) throw targetMarketError;
  const targetMarketByName = new Map<string, string>();
  for (const market of targetMarkets ?? []) targetMarketByName.set(normalizeLookup(market.name), market.id);
  const { data: templateCountries, error } = await admin.from('countries').select('name, iso2_code, iso3_code, phone_code, sort_order, is_active, search_aliases, market:markets(name)').eq('organization_id', platformOrganizationId).order('sort_order', { ascending: true });
  if (error) throw error;
  const marketSortTracker = new Map<string, number>();
  const countries = (templateCountries ?? []).map((country: any) => { const templateMarketName = Array.isArray(country.market) ? country.market[0]?.name : country.market?.name; const resolvedMarketId = targetMarketByName.get(normalizeLookup(templateMarketName)) ?? fallbackMarketId; const nextSortOrder = (marketSortTracker.get(resolvedMarketId) ?? 0) + 1; marketSortTracker.set(resolvedMarketId, nextSortOrder); return { organization_id: organizationId, market_id: resolvedMarketId, name: country.name, iso2_code: country.iso2_code ?? null, iso3_code: country.iso3_code ?? null, phone_code: country.phone_code ?? null, sort_order: nextSortOrder, is_active: country.is_active ?? true, search_aliases: country.search_aliases ?? null }; });
  if (countries.length === 0) return 0;
  const { error: insertError } = await admin.from('countries').insert(countries).throwOnError();
  if (insertError) throw insertError;
  return countries.length;
}
async function seedPipelinesAndStages(admin: SupabaseAdmin, organizationId: string, requestedPipelines: string[] | null | undefined, requestedStages: string[] | null | undefined) {
  const existingCount = await countRows(admin, 'pipelines', organizationId);
  if (existingCount > 0) return { pipelinesSeeded: 0, stagesSeeded: 0 };
  const pipelines = cleanList(requestedPipelines, defaultPipelines);
  const stages = cleanList(requestedStages, defaultPipelineStages);
  const pipelineRows = pipelines.map((name, index) => ({ organization_id: organizationId, name, lead_type: name.toLowerCase().includes('supplier') ? 'supplier' : name.toLowerCase().includes('both') ? 'both' : 'buyer', is_default: index === 0 }));
  const { data: insertedPipelines, error } = await admin.from('pipelines').insert(pipelineRows).select('id, name').throwOnError();
  if (error) throw error;
  let stagesSeeded = 0;
  for (const pipeline of insertedPipelines ?? []) { const stageRows = stages.map((name, index) => ({ pipeline_id: pipeline.id, name, sort_order: index + 1, is_closed: ['won', 'lost'].includes(name.toLowerCase()), is_won: name.toLowerCase() === 'won', is_lost: name.toLowerCase() === 'lost' })); const { error: stageError } = await admin.from('pipeline_stages').insert(stageRows).throwOnError(); if (stageError) throw stageError; stagesSeeded += stageRows.length; }
  return { pipelinesSeeded: pipelineRows.length, stagesSeeded };
}
async function seedNextSteps(admin: SupabaseAdmin, organizationId: string, requestedNextSteps: string[] | null | undefined) {
  const existingCount = await countRows(admin, 'next_steps', organizationId);
  if (existingCount > 0) return 0;
  const rows = cleanList(requestedNextSteps, defaultNextSteps).map((name, index) => ({ organization_id: organizationId, name, sort_order: index + 1, is_active: true }));
  if (rows.length === 0) return 0;
  const { error } = await admin.from('next_steps').insert(rows).throwOnError();
  if (error) throw error;
  return rows.length;
}
async function seedRoles(admin: SupabaseAdmin, organizationId: string) {
  const existingCount = await countRows(admin, 'roles', organizationId);
  if (existingCount > 0) { const { data } = await admin.from('roles').select('id, name').eq('organization_id', organizationId); return { ownerRoleId: (data ?? []).find((role: any) => role.name === 'owner')?.id ?? null, inserted: 0 }; }
  const { data, error } = await admin.from('roles').insert(defaultRoles.map((role) => ({ organization_id: organizationId, name: role.name, description: role.description }))).select('id, name').throwOnError();
  if (error) throw error;
  return { ownerRoleId: (data ?? []).find((role: any) => role.name === 'owner')?.id ?? null, inserted: defaultRoles.length };
}
async function seedPricingSettings(admin: SupabaseAdmin, organizationId: string, request: OnboardingRequest) {
  const { count } = await admin.from('pricing_engine_settings').select('organization_id', { count: 'exact', head: true }).eq('organization_id', organizationId);
  if (Number(count ?? 0) === 0) await admin.from('pricing_engine_settings').insert({ organization_id: organizationId, default_display_currency: 'USD', default_validity_days: 30, default_fx_base_currency: 'USD', allow_manual_fx: true, require_approval_for_override: true, approval_threshold_percent: 15 });
  if (request.pricing_rules_notes) await admin.from('audit_logs').insert({ organization_id: organizationId, actor_user_id: null, entity_type: 'pricing_engine_settings', entity_id: organizationId, action: 'client_pricing_notes_captured', payload: { notes: request.pricing_rules_notes } });
}

async function seedTrialTemplateData(admin: SupabaseAdmin, organizationId: string, request: OnboardingRequest) {
  if (!request.is_trial_request && request.requested_plan !== 'trial') return { templateKey: null, productsSeeded: 0 };

  const templateKey = resolveTrialTemplateKeyForRequest({
    requestedPlan: request.requested_plan,
    isTrialRequest: request.is_trial_request,
    pricingNotes: request.pricing_rules_notes,
    productNotes: request.product_category_notes,
    companyName: request.company_name,
  });
  const template = getTrialTemplateConfig(templateKey);

  const { error: guidedTrialError } = await admin.rpc('create_guided_trial_entitlement', {
    p_organization_id: organizationId,
    p_trial_template_key: templateKey,
    p_trial_ends_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
  });
  if (guidedTrialError) throw guidedTrialError;

  const { data: categoryRows } = await admin
    .from('product_categories')
    .select('id, name')
    .eq('organization_id', organizationId)
    .ilike('name', template.label)
    .limit(1);

  let categoryId = categoryRows?.[0]?.id ?? null;
  if (!categoryId) {
    const { data: insertedCategory } = await admin
      .from('product_categories')
      .insert({ organization_id: organizationId, name: template.label, sort_order: 10, is_active: true })
      .select('id')
      .maybeSingle();
    categoryId = insertedCategory?.id ?? null;
  }

  const { count } = await admin
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .in('sku', template.sampleProducts.map((product) => product.sku));

  if (Number(count ?? 0) === 0) {
    await admin.from('products').insert(template.sampleProducts.map((product, index) => ({
      organization_id: organizationId,
      category_id: categoryId,
      name: product.name,
      sku: product.sku,
      sku_code: product.sku,
      description: product.description,
      pack_size: product.packSize,
      product_family_code: product.family,
      pricing_type: product.pricingType,
      is_active: true,
      sort_order: index + 1,
      exw_price: product.exwPrice,
      fob_price: product.fobPrice,
      pricing_currency: product.currency,
      lifecycle_status: 'active',
      hsn_review_status: 'pending_review',
    }))).throwOnError();
  }

  await admin.from('audit_logs').insert({
    organization_id: organizationId,
    actor_user_id: null,
    entity_type: 'guided_trial',
    entity_id: organizationId,
    action: 'guided_trial_template_seeded',
    payload: {
      template_key: templateKey,
      template_label: template.label,
      pricing_scenario: template.pricingScenario,
      stark_packmate_ready: templateKey === 'packaging_converter',
    },
  });

  return { templateKey, productsSeeded: template.sampleProducts.length };
}

async function seedEntitlements(admin: SupabaseAdmin, organizationId: string, request: OnboardingRequest, platformOrganizationId: string, actorUserId: string | null) {
  const requestedModules = cleanModuleKeys(request.requested_modules);
  await admin.from('client_entitlement_profiles').upsert({
    organization_id: organizationId,
    managed_by_organization_id: platformOrganizationId,
    plan_key: normalizePlan(request.requested_plan, request.is_trial_request),
    billing_status: request.is_trial_request || request.requested_plan === 'trial' ? 'trial' : 'active',
    seat_limit: request.is_trial_request || request.requested_plan === 'trial' ? 1 : Number(request.requested_seat_count ?? 25),
    onboarding_stage: request.is_trial_request || request.requested_plan === 'trial' ? 'provision' : 'entitlements',
    guru_monthly_request_limit: 25000,
    guru_monthly_spend_limit: 2500,
    overage_policy: request.is_trial_request || request.requested_plan === 'trial' ? 'block_at_limit' : 'warn_then_block',
  }, { onConflict: 'organization_id' }).throwOnError();
  if (requestedModules.length > 0) {
    await admin.from('org_module_grants').upsert(MODULE_DEFINITIONS.map((moduleDef) => ({ organization_id: organizationId, module_key: moduleDef.key, enabled: requestedModules.includes(moduleDef.key), granted_by: actorUserId })), { onConflict: 'organization_id,module_key' }).throwOnError();
  }
}
async function createFirstAdminInvitation(admin: SupabaseAdmin, input: { organizationId: string; email: string | null; roleId: string | null; actorMembershipId: string; requestId: string; workspaceDomain: string }) {
  const email = normalizeEmail(input.email);
  if (!email) return { invitationId: null, invitationAcceptUrl: null };
  const { data: existing } = await admin.from('organization_invitations').select('id, metadata, status').eq('organization_id', input.organizationId).ilike('email', email).in('status', ['draft', 'pending', 'sent']).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const rawToken = createInvitationToken();
  const tokenHash = hashInvitationToken(rawToken);
  const acceptUrl = `https://${input.workspaceDomain}/invite/${encodeURIComponent(rawToken)}`;
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
  const metadata = { onboarding_request_id: input.requestId, delivery: { accept_url: acceptUrl, generated_at: new Date().toISOString(), provider: 'email_pending', source: 'client_onboarding_wizard' } };
  if (existing?.id) { const { data, error } = await admin.from('organization_invitations').update({ role_id: input.roleId, token_hash: tokenHash, expires_at: expiresAt, status: 'pending', last_sent_at: null, metadata: { ...(existing.metadata ?? {}), ...metadata }, updated_at: new Date().toISOString() }).eq('id', existing.id).select('id').maybeSingle(); if (error) throw error; return { invitationId: data?.id ?? existing.id, invitationAcceptUrl: acceptUrl }; }
  const { data, error } = await admin.from('organization_invitations').insert({ organization_id: input.organizationId, email, role_id: input.roleId, invited_by_membership_id: input.actorMembershipId, status: 'pending', token_hash: tokenHash, expires_at: expiresAt, last_sent_at: null, metadata }).select('id').maybeSingle();
  if (error) throw error;
  return { invitationId: data?.id ?? null, invitationAcceptUrl: acceptUrl };
}
export async function provisionWorkspaceFromOnboardingRequest(input: ProvisioningInput): Promise<ProvisioningResult> {
  const { admin, request, platformOrganizationId, actorMembershipId, actorUserId } = input;
  const companyName = String(request.company_name);
  const slug = request.company_slug || slugifyCompanyName(companyName);
  const workspaceDomain = `${slug}.${ROOT_DOMAIN}`;
  const logoUrl = request.logo_url || DEFAULT_SETU_FLOW_LOGO;
  const { data: org, error: orgError } = await admin.from('organizations').upsert({ name: companyName, slug, default_currency: 'USD', logo_url: logoUrl, website: request.website, headquarters_country: request.headquarters_country, contact_email: request.primary_admin_email, created_by: actorUserId, updated_at: new Date().toISOString() }, { onConflict: 'slug' }).select('id').maybeSingle();
  if (orgError || !org?.id) throw orgError ?? new Error('Workspace organization was not created.');
  const organizationId = org.id;
  const { rows: markets, inserted: marketsSeeded } = await seedMarkets(admin, organizationId, request.requested_markets);
  const fallbackMarketId = markets?.[0]?.id ?? null;
  const countriesSeeded = await seedCountries(admin, organizationId, platformOrganizationId, fallbackMarketId);
  const { pipelinesSeeded, stagesSeeded } = await seedPipelinesAndStages(admin, organizationId, request.requested_pipelines, request.requested_pipeline_stages);
  const nextStepsSeeded = await seedNextSteps(admin, organizationId, request.requested_next_steps);
  const { ownerRoleId, inserted: rolesSeeded } = await seedRoles(admin, organizationId);
  await seedPricingSettings(admin, organizationId, request);
  await seedEntitlements(admin, organizationId, request, platformOrganizationId, actorUserId);
  const { invitationId, invitationAcceptUrl } = await createFirstAdminInvitation(admin, { organizationId, email: request.primary_admin_email, roleId: ownerRoleId, actorMembershipId, requestId: request.id, workspaceDomain });
  const trialSeed = await seedTrialTemplateData(admin, organizationId, request);
  await admin.from('audit_logs').insert({ organization_id: organizationId, actor_user_id: actorUserId, entity_type: 'client_onboarding_request', entity_id: request.id, action: 'workspace_provisioned_from_client_onboarding', payload: { workspace_domain: workspaceDomain, countries_seeded: countriesSeeded, markets_seeded: marketsSeeded, pipelines_seeded: pipelinesSeeded, stages_seeded: stagesSeeded, next_steps_seeded: nextStepsSeeded, roles_seeded: rolesSeeded, invitation_id: invitationId, product_categories_created: trialSeed.productsSeeded > 0 ? 1 : 0, trial_template_key: trialSeed.templateKey, trial_products_seeded: trialSeed.productsSeeded, product_category_notes: request.product_category_notes, requested_focus_countries: request.requested_countries ?? [] } });
  return { organizationId, workspaceDomain, countriesSeeded, marketsSeeded, pipelinesSeeded, stagesSeeded, nextStepsSeeded, rolesSeeded, invitationId, invitationAcceptUrl };
}
