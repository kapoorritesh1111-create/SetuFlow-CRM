'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

const DEFAULT_SETU_FLOW_LOGO = '/logos/setu-flow-logo.png';
const ROOT_DOMAIN = 'setuflowcrm.com';

function normalizeText(value: FormDataEntryValue | null | undefined) {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}
function normalizeEmail(value: FormDataEntryValue | null | undefined) { return String(value ?? '').trim().toLowerCase(); }
function normalizeList(value: FormDataEntryValue | null | undefined) { return String(value ?? '').split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean); }
function slugifyCompanyName(value: string) { return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 54) || 'new-client'; }
function buildWorkspaceDomain(companyName: string) { return `${slugifyCompanyName(companyName)}.${ROOT_DOMAIN}`; }
function checked(formData: FormData, key: string) { return formData.get(key) === 'on'; }
function onboardingRedirect(path: string, params: Record<string, string | null | undefined>): never { const query = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (value) query.set(key, value); redirect(`${path}${query.size ? `?${query.toString()}` : ''}`); }

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
  const companyName = normalizeText(formData.get('company_name'));
  const logoUrl = normalizeText(formData.get('logo_url')) ?? DEFAULT_SETU_FLOW_LOGO;
  if (!requestId || !companyName) return;
  const { missingEnv, membership } = await requireWorkspace();
  if (missingEnv || !membership) return;
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return;
  const slug = slugifyCompanyName(companyName);
  const workspaceDomain = `${slug}.${ROOT_DOMAIN}`;
  const { data: org, error: orgError } = await admin.from('organizations').upsert({ name: companyName, slug, default_currency: 'USD', logo_url: logoUrl, created_by: membership.user_id ?? null, updated_at: new Date().toISOString() }, { onConflict: 'slug' }).select('id').maybeSingle();
  if (orgError || !org?.id) redirect('/admin/client-onboarding?notice=workspace-create-failed');
  await admin.from('client_onboarding_requests').update({ status: 'setup_in_progress', workspace_domain: workspaceDomain, linked_organization_id: org.id, updated_at: new Date().toISOString() }).eq('id', requestId);
  revalidatePath('/admin/client-onboarding');
  redirect('/admin/client-onboarding?notice=workspace-drafted');
}
