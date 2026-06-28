import { AppShell } from '@/components/layout/app-shell';
import { LeadCoverageRecoveryBoundary } from '@/components/shell/LeadCoverageRecoveryBoundary';
import { ModuleAccessGuard } from '@/components/shell/ModuleAccessGuard';
import { StateMessage } from '@/components/ui/state-message';
import { SetuGuruFeedbackBridge } from '@/features/setu-guru/setu-guru-feedback-bridge';
import { TrialWorkspaceBanner } from '@/features/trial/trial-workspace-banner';
import { TrialTourProvider } from '@/features/trial/tour-provider';
import { getTrialCapability } from '@/lib/trial/capability';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getMyCardSettingsForUser } from '@/lib/contact-exchange/my-card-settings';
import { EMPTY_CARD_SETTINGS, toCardSettingsInput } from '@/lib/contact-exchange/my-card-settings-shared';

import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic';

import type { ReactNode } from 'react';

function safeHex(value: unknown, fallback: string) {
  const text = String(value ?? '').trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(text) ? text : fallback;
}

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  noStore();

  const workspace = await getWorkspaceAccess();

  if (workspace.missingEnv && !hasSupabaseEnv) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-xl rounded-3xl border border-amber-200 bg-white p-8 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-amber-700">Configuration required</p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900">SETU Flow needs Supabase environment values</h1>
          <p className="mt-3 text-sm text-slate-600">
            Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> or Vercel project settings.
          </p>
        </div>
      </div>
    );
  }

  if (!workspace.membership || !workspace.organization || !workspace.user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="w-full max-w-2xl">
          <StateMessage
            title="No active organization access"
            description="This account is signed in, but there is no active organization membership to load. Ask an owner or admin to restore access, or sign out and use an account with workspace membership."
            tone="warning"
          />
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: brandSettings } = await (supabase as any)
    .from('organization_brand_settings')
    .select('primary_color, secondary_color, accent_color, sidebar_theme')
    .eq('organization_id', workspace.organization.id)
    .maybeSingle();

  const myCardSettingsRow = await getMyCardSettingsForUser(workspace.user.id);
  const myCardSettings = toCardSettingsInput(myCardSettingsRow, EMPTY_CARD_SETTINGS);

  const { capability: trialCapability } = await getTrialCapability(workspace.organization.id);
  const guidedTourEnabled = Boolean(trialCapability?.is_trial && trialCapability.guided_mode_enabled);
  const safeOrganization = {
    ...workspace.organization,
    logo_url: workspace.organization.logo_url ? '/api/workspace/logo' : null,
    logo_storage_path: null,
    brand_primary_color: safeHex((brandSettings as any)?.primary_color, '#0B2E4A'),
    brand_secondary_color: safeHex((brandSettings as any)?.secondary_color, '#061C2E'),
    brand_accent_color: safeHex((brandSettings as any)?.accent_color, '#0C7FFF'),
    brand_sidebar_theme: String((brandSettings as any)?.sidebar_theme ?? 'setu-premium-navy'),
  } as typeof workspace.organization;

  const inner = (
    <>
      <TrialWorkspaceBanner organizationId={workspace.organization.id} />
      <SetuGuruFeedbackBridge />
      <LeadCoverageRecoveryBoundary />
      <ModuleAccessGuard>{children}</ModuleAccessGuard>
    </>
  );

  const shell = (
    <AppShell
      profile={workspace.profile}
      organization={safeOrganization}
      membership={workspace.membership}
      currentRoles={workspace.currentRoles}
      cardSettings={myCardSettings}
      cardShareSlug={myCardSettingsRow?.share_slug ?? null}
      organizationId={workspace.organization.id}
      userId={workspace.user.id}
    >
      {inner}
    </AppShell>
  );

  return guidedTourEnabled ? (
    <TrialTourProvider
      organizationId={workspace.organization.id}
      userId={workspace.user.id}
      templateKey={trialCapability?.trial_template_key ?? null}
    >
      {shell}
    </TrialTourProvider>
  ) : (
    shell
  );
}
