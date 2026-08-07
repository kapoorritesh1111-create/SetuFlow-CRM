import Link from 'next/link';
import { AppShell } from '@/components/layout/app-shell';
import { LeadCoverageRecoveryBoundary } from '@/components/shell/LeadCoverageRecoveryBoundary';
import { ModuleAccessGuard } from '@/components/shell/ModuleAccessGuard';
import { DocumentsUiPolish } from '@/components/shell/DocumentsUiPolish';
import { S47FinalUiPolish } from '@/components/shell/s47-final-ui-polish';
import { StateMessage } from '@/components/ui/state-message';
import { SetuGuruFeedbackBridge } from '@/features/setu-guru/setu-guru-feedback-bridge';
import { GlobalGrowthCenterEntry } from '@/features/setu-guru/global-growth-center-entry';
import { ProductPricingDeepLinkDrawer } from '@/features/products/components/product-pricing-deep-link-drawer';
import { TrialWorkspaceBanner } from '@/features/trial/trial-workspace-banner';
import { TrialTourProvider } from '@/features/trial/tour-provider';
import { getTrialCapability } from '@/lib/trial/capability';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
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
  const admin = createAdminSupabaseClient();
  const [{ data: brandSettings }, supportResult] = await Promise.all([
    (supabase as any)
      .from('organization_brand_settings')
      .select('primary_color, secondary_color, accent_color, sidebar_theme')
      .eq('organization_id', workspace.organization.id)
      .maybeSingle(),
    admin
      ? (admin as any)
          .from('platform_support_users')
          .select('user_id, is_active')
          .eq('user_id', workspace.user.id)
          .eq('is_active', true)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const isPlatformSupport = Boolean((supportResult as any)?.data?.user_id);

  const myCardSettingsRow = await getMyCardSettingsForUser(workspace.user.id);
  const myCardSettings = toCardSettingsInput(myCardSettingsRow, EMPTY_CARD_SETTINGS);

  const { capability: trialCapability } = await getTrialCapability(workspace.organization.id);
  const guidedTourEnabled = Boolean(trialCapability?.is_trial && trialCapability.guided_mode_enabled);
  // S27-STARK-A3: nav shows Design Queue / Dispatch Board only for packaging-enabled orgs.
  const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
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
      <DocumentsUiPolish />
      <S47FinalUiPolish />
      <GlobalGrowthCenterEntry />
      <ProductPricingDeepLinkDrawer />
      <TrialWorkspaceBanner organizationId={workspace.organization.id} />
      {isPlatformSupport ? (
        <div className="fixed bottom-4 right-4 z-[90] flex items-center gap-3 rounded-2xl border border-teal-300/40 bg-slate-950 px-4 py-3 text-white shadow-2xl">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-teal-300">SETU Support Mode</p>
            <p className="max-w-48 truncate text-xs font-bold text-white">{workspace.organization.name}</p>
          </div>
          <Link href="/support" className="rounded-xl bg-teal-400 px-3 py-2 text-xs font-black text-slate-950 hover:bg-teal-300">Switch org</Link>
        </div>
      ) : null}
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
      packagingEnabled={verticals.packagingEnabled}
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
