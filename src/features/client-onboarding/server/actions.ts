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
  normalizeEmail,
  normalizeList,
  normalizeText,
  slugifyCompanyName,
} from '@/features/client-onboarding/shared';
import {
  buildOnboardingSetupUrl,
  getOnboardingAdminEmail,
  sendClientOnboardingAdminNotification,
  sendFirstAdminInviteEmail,
} from '@/features/client-onboarding/server/notifications';
import { provisionWorkspaceFromOnboardingRequest } from '@/features/client-onboarding/server/provisioning';

function onboardingRedirect(path: string, params: Record<string, string | null | undefined>): never { const query = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (value) query.set(key, value); redirect(`${path}${query.size ? `?${query.toString()}` : ''}`); }
function selectedClient(formData: FormData, requestId: string) { return normalizeText(formData.get('return_client')) ?? requestId; }
function clientManagementRedirect(notice: string, requestId: string, client?: string | null): never { const params = new URLSearchParams({ notice, client: client || requestId }); redirect(`/admin/client-management?${params.toString()}`); }
function provisioningErrorMessage(error: unknown) { if (error instanceof Error && error.message) return error.message; if (error && typeof error === 'object') { const record = error as Record<string, unknown>; return String(record.message ?? record.details ?? record.hint ?? record.code ?? 'unknown database error'); } return 'unknown error'; }

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
    requested_modules: normalizeList(formData.get('requested_modules')),
    requested_plan: normalizeText(formData.get('requested_plan')),
    requested_seat_count: Number.parseInt(String(formData.get('requested_seat_count') ?? ''), 10) || null,
    is_trial_request: checked(formData, 'is_trial_request'),
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
  revalidatePath('/admin/client-management');
  onboardingRedirect('/onboarding/received', { company: companyName, domain: workspaceDomain, notice: 'submitted' });
}

export async function updateClientOnboardingStatus(formData: FormData): Promise<void> {
  const requestId = normalizeText(formData.get('request_id'));
  const status = normalizeText(formData.get('status'));
  const client = selectedClient(formData, requestId ?? '');
  if (!requestId || !status) return;
  const allowed = new Set(['submitted', 'reviewing', 'setup_in_progress', 'admin_invite_ready', 'admin_invited', 'live', 'paused']);
  if (!allowed.has(status)) return;
  const { missingEnv, membership } = await requireSetuInternalAdminWorkspace();
  if (missingEnv || !membership) return;
  const supabase = (await createClient()) as any;
  await supabase.from('client_onboarding_requests').update({ status, updated_at: new Date().toISOString() }).eq('id', requestId);
  revalidatePath('/admin/client-management');
  clientManagementRedirect('status-updated', requestId, client);
}

export async function resendClientOnboardingNotification(formData: FormData): Promise<void> {
  const requestId = normalizeText(formData.get('request_id'));
  const client = selectedClient(formData, requestId ?? '');
  if (!requestId) return;
  const { missingEnv, membership } = await requireSetuInternalAdminWorkspace();
  if (missingEnv || !membership) return;
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return;
  const { data: request, error } = await admin.from('client_onboarding_requests').select('id, company_name, primary_admin_email, workspace_domain, company_slug, notification_email, admin_setup_url').eq('id', requestId).maybeSingle();
  if (error || !request?.id || !request.company_name) clientManagementRedirect('request-not-found', requestId, client);
  const adminEmail = getOnboardingAdminEmail() || request.notification_email;
  const workspaceDomain = request.workspace_domain || `${request.company_slug || slugifyCompanyName(request.company_name)}.${ROOT_DOMAIN}`;
  const setupUrl = buildOnboardingSetupUrl(request.id, request.admin_setup_url);
  await admin.from('client_onboarding_requests').update({ notification_email: adminEmail, admin_setup_url: setupUrl, notification_status: 'sending', notification_error: null, updated_at: new Date().toISOString() }).eq('id', request.id);
  const notification = await sendClientOnboardingAdminNotification({ adminEmail, companyName: request.company_name, primaryAdminEmail: request.primary_admin_email || 'Primary admin email pending', workspaceDomain, setupUrl });
  await admin.from('client_onboarding_requests').update({ notification_email: adminEmail, admin_setup_url: setupUrl, notification_status: notification.status, notification_error: notification.error, notification_sent_at: notification.status === 'email_sent' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', request.id);
  revalidatePath('/admin/client-management');
  clientManagementRedirect(notification.status === 'email_sent' ? 'notification-sent' : 'notification-failed', requestId, client);
}

function pickDelivery(metadata: unknown): Record<string, any> { const value = metadata as Record<string, any> | null | undefined; const delivery = value?.delivery; return delivery && typeof delivery === 'object' ? delivery as Record<string, any> : {}; }

export async function sendFirstAdminInviteFromOnboardingRequest(formData: FormData): Promise<void> {
  const requestId = normalizeText(formData.get('request_id'));
  const client = selectedClient(formData, requestId ?? '');
  if (!requestId) return;
  const { missingEnv, membership, organization } = await requireSetuInternalAdminWorkspace();
  if (missingEnv || !membership || !organization) return;
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return;
  const { data: request, error: requestError } = await admin.from('client_onboarding_requests').select('*').eq('id', requestId).maybeSingle();
  if (requestError || !request?.company_name || !request.primary_admin_email) clientManagementRedirect('request-not-found', requestId, client);
  let organizationId = request.linked_organization_id as string | null;
  let workspaceDomain = request.workspace_domain || `${request.company_slug || slugifyCompanyName(request.company_name)}.${ROOT_DOMAIN}`;
  if (!organizationId) {
    try {
      const result = await provisionWorkspaceFromOnboardingRequest({ admin, request, platformOrganizationId: organization.id, actorMembershipId: membership.id, actorUserId: membership.user_id ?? null });
      organizationId = result.organizationId;
      workspaceDomain = result.workspaceDomain;
      await admin.from('client_onboarding_requests').update({ status: 'admin_invite_ready', workspace_domain: workspaceDomain, linked_organization_id: organizationId, updated_at: new Date().toISOString() }).eq('id', requestId);
    } catch (error) {
      await admin.from('client_onboarding_requests').update({ status: 'setup_in_progress', additional_notes: `Workspace provisioning needs attention: ${provisioningErrorMessage(error)}`, updated_at: new Date().toISOString() }).eq('id', requestId);
      clientManagementRedirect('workspace-create-failed', requestId, client);
    }
  }
  const { data: invitation } = await admin.from('organization_invitations').select('id, email, status, expires_at, metadata, roles(name)').eq('organization_id', organizationId).ilike('email', request.primary_admin_email).in('status', ['draft', 'pending', 'sent']).order('created_at', { ascending: false }).limit(1).maybeSingle();
  const delivery = pickDelivery(invitation?.metadata);
  const acceptUrl = typeof delivery.accept_url === 'string' ? delivery.accept_url : null;
  if (!invitation?.id || !acceptUrl) {
    await admin.from('client_onboarding_requests').update({ status: 'admin_invite_ready', additional_notes: 'First admin invite needs to be regenerated. Re-run provisioning, then send the first admin invite.', updated_at: new Date().toISOString() }).eq('id', requestId);
    clientManagementRedirect('invite-link-missing', requestId, client);
  }
  const roleName = Array.isArray(invitation.roles) ? invitation.roles[0]?.name : invitation.roles?.name;
  const notification = await sendFirstAdminInviteEmail({ toEmail: request.primary_admin_email, companyName: request.company_name, workspaceDomain, acceptUrl, roleName: roleName || 'owner', expiresAt: invitation.expires_at ?? null });
  const nextMetadata = { ...(invitation.metadata ?? {}), delivery: { ...delivery, email_status: notification.status, email_error: notification.error, emailed_at: notification.status === 'email_sent' ? new Date().toISOString() : null, provider: (process.env.SETU_EMAIL_PROVIDER ?? (process.env.MAILTRAP_API_KEY ? 'mailtrap' : 'resend')).toLowerCase(), source: 'client_onboarding_first_admin_invite' } };
  await admin.from('organization_invitations').update({ status: notification.status === 'email_sent' ? 'sent' : 'pending', last_sent_at: notification.status === 'email_sent' ? new Date().toISOString() : null, metadata: nextMetadata, updated_at: new Date().toISOString() }).eq('id', invitation.id);
  await admin.from('client_onboarding_requests').update({ status: notification.status === 'email_sent' ? 'admin_invited' : 'admin_invite_ready', additional_notes: notification.status === 'email_sent' ? 'First admin invite email sent. The client can create their own auth user, set password, and accept owner access.' : `First admin invite email failed: ${notification.error ?? notification.status}`, updated_at: new Date().toISOString() }).eq('id', requestId);
  revalidatePath('/admin/client-management');
  revalidatePath('/admin/invitations');
  clientManagementRedirect(notification.status === 'email_sent' ? 'first-admin-invite-sent' : 'first-admin-invite-failed', requestId, client);
}

export async function createWorkspaceFromOnboardingDraft(formData: FormData): Promise<void> {
  const requestId = normalizeText(formData.get('request_id'));
  const client = selectedClient(formData, requestId ?? '');
  if (!requestId) return;
  const { missingEnv, membership, organization } = await requireSetuInternalAdminWorkspace();
  if (missingEnv || !membership || !organization) return;
  const admin = createAdminSupabaseClient() as any;
  if (!admin) return;
  const { data: request, error: requestError } = await admin.from('client_onboarding_requests').select('*').eq('id', requestId).maybeSingle();
  if (requestError || !request?.company_name) clientManagementRedirect('request-not-found', requestId, client);
  try {
    const result = await provisionWorkspaceFromOnboardingRequest({ admin, request, platformOrganizationId: organization.id, actorMembershipId: membership.id, actorUserId: membership.user_id ?? null });
    await admin.from('client_onboarding_requests').update({ status: 'admin_invite_ready', workspace_domain: result.workspaceDomain, linked_organization_id: result.organizationId, updated_at: new Date().toISOString() }).eq('id', requestId);
  } catch (error) {
    await admin.from('client_onboarding_requests').update({ status: 'setup_in_progress', additional_notes: `Workspace provisioning needs attention: ${provisioningErrorMessage(error)}`, updated_at: new Date().toISOString() }).eq('id', requestId);
    clientManagementRedirect('workspace-create-failed', requestId, client);
  }
  revalidatePath('/admin/client-management');
  revalidatePath('/admin/invitations');
  clientManagementRedirect('workspace-provisioned', requestId, client);
}
