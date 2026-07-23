import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

const CONNECTORS = [
  {
    name: 'Email sending',
    status: 'Ready',
    description: 'Governed quote and approval-send workflow for buyer-facing communication.',
    href: '/approval-send',
    tone: 'success' as const,
  },
  {
    name: 'Document evidence',
    status: 'Ready',
    description: 'Documents and compliance review cockpit for files linked to leads, quotes, and contracts.',
    href: '/documents',
    tone: 'success' as const,
  },
  {
    name: 'AI suggestions',
    status: 'Review queue',
    description: 'AI-generated drafts remain controlled through the approval and review workflow.',
    href: '/ai-suggestions',
    tone: 'info' as const,
  },
  {
    name: 'Digital vCard',
    status: 'Live',
    description: 'Public contact exchange and vCard intake for trade-show lead capture.',
    href: '/contact-exchange/vcard',
    tone: 'success' as const,
  },
  {
    name: 'Trade event capture',
    status: 'Configured',
    description: 'Trade-show event defaults, source labels, and capture flows for lead intake.',
    href: '/trade-events',
    tone: 'info' as const,
  },
  {
    name: 'Operational tasks',
    status: 'Internal',
    description: 'Scheduled task creation and completion for follow-ups and order execution.',
    href: '/tasks',
    tone: 'neutral' as const,
  },
];

export default async function IntegrationsPage() {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Integrations" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrations"
        title="Integration connectors"
        description="Review the operational connectors and governed handoffs that support buyer capture, document evidence, quote sending, AI review, and order execution."
        actions={[
          { label: 'Approval send', href: '/approval-send' },
          { label: 'Documents', href: '/documents' },
          { label: 'AI suggestions', href: '/ai-suggestions', type: 'primary' },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CONNECTORS.map((connector) => (
          <a key={connector.name} href={connector.href} className="rounded-hero border border-slate-200 bg-white p-5 shadow-[0_20px_55px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_28px_70px_rgba(37,99,235,0.11)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600">Connector</p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">{connector.name}</h2>
              </div>
              <StatusBadge label={connector.status} tone={connector.tone} dot={false} />
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">{connector.description}</p>
            <span className="mt-5 inline-flex min-h-10 items-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Open connector</span>
          </a>
        ))}
      </section>

      <SectionCard eyebrow="Demo readiness" title="No redirect from /integrations" description="The integrations route now renders connector cards directly, so the shared modules test can verify the dedicated integrations page without being sent to /approval-send.">
        <p className="text-sm text-slate-600">Use this page as the connector index for investor/demo testing and shared-module QA.</p>
      </SectionCard>
    </div>
  );
}
