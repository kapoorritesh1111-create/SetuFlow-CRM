import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

const integrationSections = [
  {
    title: 'Email',
    status: 'Active and working',
    tone: 'green',
    summary: 'Mailtrap is the approved production email integration for invitations and order document sends.',
    details: ['Mailtrap API path is live.', 'Webhook receiver exists for delivery/open/bounce events.', 'Delivery status requires MAILTRAP_WEBHOOK_SECRET in Vercel.'],
    actions: ['View email log', 'Send test email', 'Check webhook status'],
  },
  {
    title: 'Finance',
    status: 'Queue-ready, not connected',
    tone: 'amber',
    summary: 'Finance is prepared as an integration-ready event queue. No live Xero, QuickBooks, or Tally sync is active.',
    details: ['Events should use adapter_name="pending".', 'Human approval remains required before queueing.', 'External provider connection waits until provider selection and investor stage.'],
    actions: ['Queue invoice sync', 'View queue', 'Copy payload', 'Retry queued event'],
  },
  {
    title: 'Freight',
    status: 'Queue-ready, not connected',
    tone: 'amber',
    summary: 'Freight is prepared as an integration-ready queue only. No live Flexport, Freightos, DHL, or carrier booking adapter is active.',
    details: ['Freight requests remain internal records.', 'Carrier confirmation stays manual until a provider adapter is approved.', 'Do not claim automatic booking.'],
    actions: ['Queue freight request', 'View queue', 'Copy payload', 'Retry queued event'],
  },
  {
    title: 'Banks / Payments',
    status: 'Planned / manual',
    tone: 'slate',
    summary: 'Banking and payment reconciliation remain manual operating steps for now.',
    details: ['Payment references can be recorded in closeout.', 'No bank feed or payment processor is connected.', 'Future adapter should reconcile against invoice and receipt records.'],
    actions: ['Record payment reference', 'Confirm reconciliation', 'Close manually'],
  },
  {
    title: 'WhatsApp',
    status: 'Manual tracked links',
    tone: 'blue',
    summary: 'SetuFlow may open wa.me or WhatsApp Web with a prefilled tracked document link, but the operator manually reviews and sends.',
    details: ['No WhatsApp Business API delivery is active.', 'Stored tracked links should be reused for resends when available.', 'Manual send avoids overclaiming provider delivery.'],
    actions: ['Open WhatsApp', 'Copy tracked link', 'View send history'],
  },
  {
    title: 'PDF',
    status: 'Free server rendering + fallback',
    tone: 'green',
    summary: 'Sprint 18 uses the approved free/open-source path: puppeteer-core plus @sparticuz/chromium, rendering existing order document previews.',
    details: ['PDFs upload to the private order-documents Supabase Storage bucket.', 'order_documents.pdf_storage_path stores the generated object path.', 'Browser print remains the fallback.'],
    actions: ['Generate PDF', 'Download signed URL', 'Use browser print fallback'],
  },
  {
    title: 'Open API / Webhooks',
    status: 'Planned',
    tone: 'slate',
    summary: 'Public API and partner webhooks are a future integration layer, not part of the current live provider surface.',
    details: ['Keep API/webhook scope behind explicit auth and audit trails.', 'Prioritize stable queue payloads before external API expansion.', 'Do not expose experimental endpoints as partner-ready.'],
    actions: ['Plan webhook contract', 'Review auth model', 'Define audit events'],
  },
];

function toneClasses(tone: string) {
  if (tone === 'green') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (tone === 'amber') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (tone === 'blue') return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export default async function AdminIntegrationsPage() {
  if (!hasSupabaseEnv) {
    return (
      <StateMessage
        title="Supabase environment variables are missing"
        description="Configure the application environment before using integration administration."
        tone="warning"
      />
    );
  }

  const { missingEnv, membership, organization } = await requireAdminWorkspace();

  if (missingEnv) {
    return (
      <StateMessage
        title="Supabase environment variables are missing"
        description="Configure the application environment before using integration administration."
        tone="warning"
      />
    );
  }

  if (!membership || !organization) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Integrations"
        badge="Sprint 18 readiness"
        description="A clear operating view of what is live, what is queue-ready, and what remains planned. Investor-friendly, but intentionally honest."
        actions={[
          { label: 'Organization', href: '/admin/organization' },
          { label: 'Document templates', href: '/admin/document-templates' },
          { label: 'Audit trail', href: '/admin/audit', type: 'primary' },
        ]}
      />

      <SectionCard className="p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Integration posture for {organization.name}</p>
            <p className="mt-1 text-sm text-slate-500">Mailtrap is production-ready. Finance, freight, banks, WhatsApp Business API, and Open API/Webhooks are not live external integrations yet.</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">No overclaiming allowed</span>
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {integrationSections.map((section) => (
          <SectionCard key={section.title} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{section.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{section.summary}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${toneClasses(section.tone)}`}>{section.status}</span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Truthful status</p>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {section.details.map((detail) => <li key={detail}>• {detail}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Allowed operator labels</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {section.actions.map((action) => <span key={action} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{action}</span>)}
                </div>
              </div>
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  );
}
