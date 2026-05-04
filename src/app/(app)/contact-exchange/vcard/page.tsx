import { MyCardWorkspace } from '@/components/contact-exchange/my-card-workspace';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { getMyCardSettingsForUser } from '@/lib/contact-exchange/my-card-settings';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getPrimaryWorkspaceRole, getWorkspaceRoleDisplayName } from '@/lib/workspace/roles';



type MyCardInsightItem = {
  id: string;
  company_name: string | null;
  contact_name: string | null;
  source_label: string | null;
  created_at: string | null;
};

type MyCardInsights = {
  quoteRequestCount: number;
  appointmentCount: number;
  recentLeads: MyCardInsightItem[];
};

async function getMyCardInsights(organizationId: string, repName: string): Promise<MyCardInsights> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('leads')
    .select('id, company_name, contact_name, source_label, created_at')
    .eq('organization_id', organizationId)
    .eq('source_type', 'public_card')
    .ilike('source_label', `%${repName}%`)
    .order('created_at', { ascending: false })
    .limit(8);

  const recentLeads = (data ?? []) as MyCardInsightItem[];
  return {
    quoteRequestCount: recentLeads.filter((item) => String(item.source_label ?? '').toLowerCase().includes('request quote')).length,
    appointmentCount: recentLeads.filter((item) => String(item.source_label ?? '').toLowerCase().includes('book appointment')).length,
    recentLeads,
  };
}

const setupNotes = [
  {
    title: 'Professional identity',
    body: 'Use your profile, contact details, and social links to present a clean buyer-facing card that is ready to share outside the CRM.',
  },
  {
    title: 'Share with confidence',
    body: 'Generate a public card, QR code, and downloadable contact file so prospects can save your details quickly from any device.',
  },
  {
    title: 'Capture the reply',
    body: 'Shared card responses can feed back into the CRM through the public capture form and uploaded document intake.',
  },
];

export default async function DigitalVCardPage() {
  const workspace = await requireWorkspace();

  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Global contact exchange"
        title="Workspace membership needed"
        description="Your account is signed in, but no active organization membership could be loaded. Restore workspace access before reviewing personal contact exchange surfaces."
        primaryActionHref={PRODUCT_ROUTES.app.dashboard}
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const fullName =
    workspace.profile?.full_name?.trim() ||
    workspace.user?.email?.split('@')[0] ||
    'SETU Flow user';
  const email =
    workspace.profile?.email ||
    workspace.user?.email ||
    'email-not-available@setu.flow';
  const primaryRole = getPrimaryWorkspaceRole(workspace.currentRoles) || 'member';
  const roleLabel = getWorkspaceRoleDisplayName(primaryRole);
  let initialSettings = null;
  let loadWarning: string | null = null;
  let insights: MyCardInsights = { quoteRequestCount: 0, appointmentCount: 0, recentLeads: [] };

  if (workspace.user?.id) {
    try {
      const [settings, cardInsights] = await Promise.all([
        getMyCardSettingsForUser(workspace.user.id),
        getMyCardInsights(workspace.organization.id, fullName),
      ]);
      initialSettings = settings;
      insights = cardInsights;
    } catch (error) {
      loadWarning = error instanceof Error ? error.message : 'My Card settings could not be loaded yet. You can still open the page and save your details again.';
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Global contact exchange"
        title="My Digital vCard"
        description="Create a polished digital business card with QR sharing, downloadable contact details, and trusted follow-through for quotes or appointments."
        badge={initialSettings?.share_slug ? 'Ready to share' : 'Setup needed'}
        actions={[{ label: 'Go to leads', href: PRODUCT_ROUTES.app.leads, type: 'primary' }]}
      />

      {loadWarning ? (
        <SectionCard>
          <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-800">
            <p className="font-semibold text-amber-900">My Card loaded in recovery mode</p>
            <p className="mt-1 leading-6">{loadWarning}</p>
          </div>
        </SectionCard>
      ) : null}

      <SectionCard>
        <div className="grid gap-4 lg:grid-cols-3">
          {setupNotes.map((note) => (
            <article key={note.title} className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-4">
              <p className="text-sm font-semibold text-slate-900">{note.title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">{note.body}</p>
            </article>
          ))}
        </div>
      </SectionCard>

      <MyCardWorkspace
        identity={{
          fullName,
          email,
          roleLabel,
          organizationName: workspace.organization.name,
          avatarUrl: workspace.profile?.avatar_url,
          logoUrl: workspace.organization.logo_url,
          primaryPhone: initialSettings?.primary_phone?.trim() || '',
          organizationId: workspace.organization.id,
        }}
        organizationId={workspace.organization.id}
        initialSettings={initialSettings}
        insights={insights}
      />
    </div>
  );
}
