import { AppShell } from '@/components/layout/app-shell';
import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getMyCardSettingsForUser } from '@/lib/contact-exchange/my-card-settings';
import { EMPTY_CARD_SETTINGS, toCardSettingsInput } from '@/lib/contact-exchange/my-card-settings-shared';
import { QuoteComplianceFixEnhancer } from '@/features/leads/components/quote-compliance-fix-enhancer';

import { unstable_noStore as noStore } from 'next/cache'; // ✅ ADD THIS

export const dynamic = 'force-dynamic';

import type { ReactNode } from 'react';

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  noStore(); // ✅ CRITICAL: forces runtime, prevents build execution

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

  if (!workspace.membership || !workspace.organization) {
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

  const myCardSettingsRow = workspace.user ? await getMyCardSettingsForUser(workspace.user.id) : null;
  const myCardSettings = toCardSettingsInput(myCardSettingsRow, EMPTY_CARD_SETTINGS);

  return (
    <AppShell
      profile={workspace.profile}
      organization={workspace.organization}
      membership={workspace.membership}
      currentRoles={workspace.currentRoles}
      cardSettings={myCardSettings}
      cardShareSlug={myCardSettingsRow?.share_slug ?? null}
    >
      <QuoteComplianceFixEnhancer />
      {children}
    </AppShell>
  );
}
