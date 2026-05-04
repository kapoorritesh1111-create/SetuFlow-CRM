'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
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
import {
  buildOnboardingSetupUrl,
  getOnboardingAdminEmail,
  sendClientOnboardingAdminNotification,
} from '@/features/client-onboarding/server/notifications';
import { provisionWorkspaceFromOnboardingRequest } from '@/features/client-onboarding/server/provisioning';

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
  const { missingEnv, membership } = await requireSetuInternalAdminWorkspace();
  if (missingEnv || !membership) return;
  const supabase = (await createClient()) as any;
  await supabase.from('client_onboarding_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', requestId);
  revalidatePath('/admin/client-onboarding');
  redirect('/admin/client-onboarding?notice=status-updated');
}


export async function resendClientOnboardingNotification(formData: FormData): Promise<void> {
  const requestId = normalizeText(formData.get('request_id'));
  if (!requestId) return;

  const { missingEnv, membership } = await requireSetuInternalAdminWorkspace();
  if (missingEnv || !membership) return;

  const admin = createAdminSupabaseClient() as any;
  if (!admin) return;

  const { data: request, error } = await admin
    .from('client_onboarding_requests')
    .select('id, company_name, primary_admin_email, workspace_domain, company_slug, notification_email, admin_setup_url')
    .eq('id', requestId)
    .maybeSingle();

  if (error || !request?.id || !request.company_name) {
    redirect('/admin/client-onboarding?notice=request-not-found');
  }

  const adminEmail = getOnboardingAdminEmail() || request.notification_email;
  const workspaceDomain = request.workspace_domain || `${request.company_slug || slugifyCompanyName(request.company_name)}.${ROOT_DOMAIN}`;
  const setupUrl = buildOnboardingSetupUrl(request.id, request.admin_setup_url);

  await admin
    .from('client_onboarding_requests')
    .update({
      notification_email: adminEmail,
      admin_setup_url: setupUrl,
      notification_status: 'sending',
      notification_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id);

  const notification = await sendClientOnboardingAdminNotification({
    adminEmail,
    companyName: request.company_name,
    primaryAdminEmail: request.primary_admin_email || 'Primary admin email pending',
    workspaceDomain,
    setupUrl,
  });

  await admin
    .from('client_onboarding_requests')
    .update({
      notification_email: adminEmail,
      admin_setup_url: setupUrl,
      notification_status: notification.status,
      notification_error: notification.error,
      notification_sent_at: notification.status === 'email_sent' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', request.id);

  revalidatePath('/admin/client-onboarding');
  redirect(`/admin/client-onboarding?request=${request.id}&notice=${notification.status === 'email_sent' ? 'notification-sent' : 'notification-failed'}`);
}

export async function createWorkspaceFromOnboardingDraft(formData: FormData): Promise<void> {
  const requestId = normalizeText(formData.get('request_id'));
  if (!requestId) return;

  const { missingEnv, membership, organization } = await requireSetuInternalAdminWorkspace();
  if (missingEnv || !membership || !organization) return;

  const admin = createAdminSupabaseClient() as any;
  if (!admin) return;

  const { data: request, error: requestError } = await admin
    .from('client_onboarding_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle();

  if (requestError || !request?.company_name) redirect('/admin/client-onboarding?notice=request-not-found');

  try {
    const result = await provisionWorkspaceFromOnboardingRequest({
      admin,
      request,
      platformOrganizationId: organization.id,
      actorMembershipId: membership.id,
      actorUserId: membership.user_id ?? null,
    });

    await admin
      .from('client_onboarding_requests')
      .update({
        status: result.invitationId ? 'admin_invited' : 'admin_invite_ready',
        workspace_domain: result.workspaceDomain,
        linked_organization_id: result.organizationId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);
  } catch (error) {
    await admin
      .from('client_onboarding_requests')
      .update({
        status: 'setup_in_progress',
        additional_notes: `Workspace provisioning needs attention: ${error instanceof Error ? error.message : 'unknown error'}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId);
    redirect('/admin/client-onboarding?notice=workspace-create-failed');
  }

  revalidatePath('/admin/client-onboarding');
  revalidatePath('/admin/invitations');
  redirect(`/admin/client-onboarding?request=${requestId}&notice=workspace-provisioned`);
}
