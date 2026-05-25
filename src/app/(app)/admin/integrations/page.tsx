import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireSetuInternalAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

type IntegrationStatus = 'live' | 'queue-ready' | 'manual' | 'planned' | 'misconfigured';

function statusTone(status: IntegrationStatus): 'success' | 'warning' | 'info' | 'neutral' {
  if (status === 'live') return 'success';
  if (status === 'queue-ready') return 'warning';
  if (status === 'manual') return 'info';
  return 'neutral';
}

function statusLabel(status: IntegrationStatus): string {
  if (status === 'live') return '● Live';
  if (status === 'queue-ready') return '◑ Queue-ready';
  if (status === 'manual') return '○ Manual';
  if (status === 'misconfigured') return '✕ Misconfigured';
  return 'Planned';
}

export default async function AdminIntegrationsPage() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using integration administration." tone="warning" />;
  const { missingEnv, organization } = await requireSetuInternalAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using integration administration." tone="warning" />;
  if (!organization) return null;

  const supabase = await createClient();
  const { data: integrationRows } = await supabase
    .from('integrations')
    .select('provider, is_active')
    .eq('organization_id', organization.id);

  const intMap: Record<string, boolean> = Object.fromEntries(
    (integrationRows ?? []).map((r: { provider: string; is_active: boolean | null }) => [r.provider, r.is_active ?? false])
  );

  const emailActive = Boolean(process.env.MAILTRAP_API_KEY ?? process.env.MAILTRAP_SMTP_HOST);
  const pdfActive = true; // always server-rendered

  type Integration = {
    id: string;
    name: string;
    icon: string;
    status: IntegrationStatus;
    desc: string;
    actions: Array<{ label: string; href?: string; secondary?: boolean }>;
  };

  const integrations: Integration[] = [
    {
      id: 'email',
      name: 'Email (Mailtrap)',
      icon: '📧',
      status: emailActive ? 'live' : 'misconfigured',
      desc: 'Mailtrap handles invitations, onboarding notifications, and order document emails. Set MAILTRAP_API_KEY in Vercel to activate.',
      actions: [
        { label: 'View email log', href: '/admin/audit' },
        { label: 'Notifications config', href: '/admin/notifications' },
      ],
    },
    {
      id: 'pdf',
      name: 'PDF rendering',
      icon: '📄',
      status: 'live',
      desc: 'Server-side quote and order PDF generation using a dependency-light route. PDFs upload to Supabase Storage and link back to documents.',
      actions: [
        { label: 'View quotes', href: '/quotes' },
        { label: 'Document templates', href: '/admin/document-templates' },
      ],
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: '💬',
      status: 'manual',
      desc: 'SetuFlow opens wa.me with a pre-filled tracked document link. The operator reviews and manually sends. No WhatsApp Business API is active.',
      actions: [
        { label: 'View send history', href: '/admin/audit' },
      ],
    },
    {
      id: 'finance',
      name: 'Finance (Xero / QB)',
      icon: '💰',
      status: intMap['finance'] ? 'live' : 'queue-ready',
      desc: 'Finance events are queued and ready for sync to Xero, QuickBooks, or Tally. Human approval is required before queueing any event.',
      actions: [
        { label: 'View queue', href: '/admin/audit' },
        { label: 'Connect provider', href: '#integrations-finance' },
      ],
    },
    {
      id: 'freight',
      name: 'Freight (Flexport / DHL)',
      icon: '🚢',
      status: intMap['freight'] ? 'live' : 'queue-ready',
      desc: 'Freight booking requests are queued internally. No live carrier adapter (Flexport, DHL, Freightos) is connected yet.',
      actions: [
        { label: 'View queue', href: '/admin/audit' },
        { label: 'Connect carrier', href: '#integrations-freight' },
      ],
    },
    {
      id: 'api',
      name: 'Open API / Webhooks',
      icon: '🔌',
      status: 'planned',
      desc: 'Public API and partner webhooks are a future integration layer. Manage API keys and webhook endpoints when this layer is activated.',
      actions: [
        { label: 'API & webhooks', href: '/admin/api-keys' },
      ],
    },
  ];

  const liveCount = integrations.filter((i) => i.status === 'live').length;
  const queueCount = integrations.filter((i) => i.status === 'queue-ready').length;

  return (
    <AdminSettingsShell active="integrations" organizationName={organization.name} missingCount={emailActive ? 0 : 1} sectionTitle="Integrations">
      <AdminPageHero
        title="Integrations"
        description="Live status of all platform integrations. Green = production active. Amber = queue-ready awaiting provider connection. Grey = planned."
        badge="Platform"
        stats={[
          { label: 'Live', value: liveCount, tone: 'success' },
          { label: 'Queue-ready', value: queueCount, tone: 'warning' },
          { label: 'Planned', value: integrations.filter((i) => i.status === 'planned').length, tone: 'neutral' },
        ] as any}
      />

      {!emailActive && (
        <SectionCard>
          <div className="flex items-center gap-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
            <span className="text-base">⚠</span>
            <span><strong>MAILTRAP_API_KEY is not set</strong> — invitation and notification emails will not deliver. Add the env var in Vercel dashboard.</span>
          </div>
        </SectionCard>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((int) => (
          <div key={int.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <span className="text-2xl">{int.icon}</span>
              <StatusBadge label={statusLabel(int.status)} tone={statusTone(int.status)} dot={false} />
            </div>
            <h3 className="font-bold text-slate-900 mb-1 text-sm">{int.name}</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4 flex-1">{int.desc}</p>
            <div className="flex flex-wrap gap-2">
              {int.actions.map((action) => (
                <a
                  key={action.label}
                  href={action.href ?? '#'}
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  {action.label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminSettingsShell>
  );
}
