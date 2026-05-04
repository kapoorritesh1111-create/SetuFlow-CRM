'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import {
  DEFAULT_SETU_FLOW_LOGO,
  ROOT_DOMAIN,
  buildWorkspaceDomain,
  checked,
  defaultMarkets,
  defaultNextSteps,
  defaultPipelineStages,
  defaultPipelines,
  normalizeEmail,
  normalizeList,
  normalizeText,
  slugifyCompanyName,
} from '@/features/client-onboarding/shared';

function onboardingRedirect(path: string, params: Record<string, string | null | undefined>): never { const query = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (value) query.set(key, value); redirect(`${path}${query.size ? `?${query.toString()}` : ''}`); }
function cleanList(value: string[] | null | undefined, fallback: string[]) { const items = Array.isArray(value) && value.length > 0 ? value : fallback; return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean))); }

export async function submitClientOnboardingRequest(formData: FormData): Promise<void> {
  const companyName = normalizeText(formData.get('company_name'));
  const primaryAdminEmail = normalizeEmail(formData.get('primary_admin_email'));
  if (!companyName || !primaryAdminEmail) onboardingRedirect('/onboarding', { notice: 'missing-required' });
  const workspaceDomain = buildWorkspaceDomain(companyName);
  const payload = {
    company_name: companyName,
    company_slug: slugifyCompanyName(companyName),
    workspace_domain: workspaceDomain,
    logo_url: normalizeText(formData.get('logo_url')) ?? DEFAULT_SETU_FLOW_LOGO,
    website: normalizeText(formData.get('website')),
    primary_admin_name: normalizeText(formData.get('primary_admin_name')),
    primary_admin_email: primaryAdminEmail,
    primary_phone: normalizeText(formData.get('primary_phone')),
    headquarters_country: normalizeText(formData.get('headquarters_country')),
    requested_markets: normalizeList(formData.get('requested_markets')),
    requested_countries: normalizeList(formData.get('requested_countries')),
    requested_pipelines: normalizeList(formData.get('requested_pipelines')),
    requested_pipeline_stages: normalizeList(formData.get('requested_pipeline_stages')),
    requested_next_steps: normalizeList(formData.get('requested_next_steps')),
    pricing_rules_notes: normalizeText(formData.get('pricing_rules_notes')),
    product_category_notes: normalizeText(formData.get('product_category_notes')),
    additional_notes: normalizeText(formData.get('additional_notes')),
    wants_trade_events: checked(formData, 'wants_trade_events'),
    status: 'submitted',
  };
  const admin = createAdminSupabaseClient() as any;
  if (!admin) onboardingRedirect('/onboarding/received', { company: companyName, domain: workspaceDomain, notice: 'service-role-missing' });
  const { error } = await admin.from('client_onboarding_requests').insert(payload);
  if (error) onboardingRedirect('/onboarding/received', { company: companyName, domain: workspaceDomain, notice: 'storage-pending' });
  revalidatePath('/admin/client-onboarding');
  onboardingRedirect('/onboarding/received', { company: companyName, domain: workspaceDomain, notice: 'submitted' });
}

export async function updateClientOnboardingStatus(formData: FormData): Promise<void> {
  const requestId = normalizeText(formData.get('request_id'));
  const status = normalizeText(formData.get('status'));
  if (!requestId || !status) return;
  const allowed = new Set(['submitted', 'reviewing', 'setup_in_progress', 'admin_invite_ready', 'admin_invited', 'live', 'paused']);
  if (!allowed.has(status)) return;
  const { missingEnv, membership } = await requireWorkspace();
  if (missingEnv || !membership) return;
  const supabase = (await createClient()) as any;
  await supabase.from('client_onboarding_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', requestId);
  revalidatePath('/admin/client-onboarding');
  redirect('/admin/client-onboarding?notice=status-updated');
}

export async function createWorkspaceFromOnboardingDraft(formData: FormData): Promise<void> {
  const requestId = normalizeText(formData.get('request_id'));
  if (!requestId) return;
  const { missingEnv, membership } = await requireWorkspace();
  if (missingEnv || !membership) return;
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return;

  const { data: request, error: requestError } = await admin.from('client_onboarding_requests').select('*').eq('id', requestId).maybeSingle();
  if (requestError || !request?.company_name) redirect('/admin/client-onboarding?notice=request-not-found');

  const companyName = String(request.company_name);
  const logoUrl = request.logo_url || DEFAULT_SETU_FLOW_LOGO;
  const slug = request.company_slug || slugifyCompanyName(companyName);
  const workspaceDomain = `${slug}.${ROOT_DOMAIN}`;
  const { data: org, error: orgError } = await admin.from('organizations').upsert({ name: companyName, slug, default_currency: 'USD', logo_url: logoUrl, created_by: membership.user_id ?? null, updated_at: new Date().toISOString() }, { onConflict: 'slug' }).select('id').maybeSingle();
  if (orgError || !org?.id) redirect('/admin/client-onboarding?notice=workspace-create-failed');

  const organizationId = org.id;
  const markets = cleanList(request.requested_markets, defaultMarkets);
  const countries = cleanList(request.requested_countries, request.headquarters_country ? [request.headquarters_country] : []);
  const pipelines = cleanList(request.requested_pipelines, defaultPipelines);
  const stages = cleanList(request.requested_pipeline_stages, defaultPipelineStages);
  const nextSteps = cleanList(request.requested_next_steps, defaultNextSteps);

  const marketRows = markets.map((name, index) => ({ organization_id: organizationId, name, market_code: slugifyCompanyName(name).toUpperCase().slice(0, 12), sort_order: index + 1, is_active: true }));
  const { data: insertedMarkets } = marketRows.length
    ? await admin.from('markets').insert(marketRows).select('id, name').throwOnError()
    : { data: [] };
  const firstMarketId = insertedMarkets?.[0]?.id;
  if (firstMarketId && countries.length) {
    await admin.from('countries').insert(countries.map((name, index) => ({ organization_id: organizationId, market_id: firstMarketId, name, sort_order: index + 1, is_active: true }))).throwOnError();
  }

  const pipelineRows = pipelines.map((name, index) => ({ organization_id: organizationId, name, lead_type: name.toLowerCase().includes('supplier') ? 'supplier' : 'buyer', is_default: index === 0 }));
  const { data: insertedPipelines } = pipelineRows.length
    ? await admin.from('pipelines').insert(pipelineRows).select('id, name').throwOnError()
    : { data: [] };
  for (const pipeline of insertedPipelines ?? []) {
    await admin.from('pipeline_stages').insert(stages.map((name, index) => ({ pipeline_id: pipeline.id, name, sort_order: index + 1, is_closed: ['won', 'lost'].includes(name.toLowerCase()), is_won: name.toLowerCase() === 'won', is_lost: name.toLowerCase() === 'lost' }))).throwOnError();
  }

  if (nextSteps.length) {
    await admin.from('next_steps').insert(nextSteps.map((name, index) => ({ organization_id: organizationId, name, sort_order: index + 1, is_active: true }))).throwOnError();
  }

  await admin.from('client_onboarding_requests').update({ status: 'admin_invite_ready', workspace_domain: workspaceDomain, linked_organization_id: organizationId, updated_at: new Date().toISOString() }).eq('id', requestId);
  revalidatePath('/admin/client-onboarding');
  redirect(`/admin/client-onboarding?request=${requestId}&notice=workspace-drafted`);
}
