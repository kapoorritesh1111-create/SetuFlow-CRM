import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { WorkspaceState } from '@/components/ui/workspace-state';
import {
  previewStarkInteraktContacts,
  readStagedStarkInteraktContacts,
  stageStarkInteraktContacts,
} from '@/features/integrations/interakt/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

type SearchParams = { preview?: string; createdAfter?: string; limit?: string };

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-GB');
}

export default async function InteraktTestPage({ searchParams }: { searchParams?: SearchParams }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Interakt test" title="Workspace membership needed" description="Sign in to the Stark Packmate workspace to test this connector." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;
  }

  const isStark = workspace.organization.id === 'b97913cb-3b95-4247-8ced-ffdc0d392d2a' || workspace.organization.slug === 'starkpackmate';
  if (!isStark || !workspace.canAccessAdmin) {
    return <WorkspaceState eyebrow="Interakt test" title="Stark Packmate admin only" description="This isolated API spike is intentionally unavailable to other organizations and non-admin users." primaryActionHref="/integrations" primaryActionLabel="Back to integrations" />;
  }

  const createdAfter = String(searchParams?.createdAfter ?? '').trim();
  const requestedLimit = Number(searchParams?.limit ?? 25);
  const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 100) : 25;
  const staged = await readStagedStarkInteraktContacts(50);

  let preview: Awaited<ReturnType<typeof previewStarkInteraktContacts>> | null = null;
  let previewError: string | null = null;
  if (searchParams?.preview === '1') {
    try {
      preview = await previewStarkInteraktContacts({ createdAfter: createdAfter || null, limit });
    } catch (error) {
      previewError = error instanceof Error ? error.message : 'Interakt preview failed.';
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integrations · Stark Packmate"
        title="Interakt inbound lead staging"
        description="Test Interakt contact retrieval without creating or updating any record in the live leads table. Preview calls are read-only; staging writes only to lead_intake_staging."
        actions={[{ label: 'Back to integrations', href: '/integrations' }]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-hero border border-emerald-200 bg-emerald-50 p-5"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Safety boundary</p><p className="mt-2 text-sm font-semibold text-emerald-950">No public.leads writes</p></div>
        <div className="rounded-hero border border-slate-200 bg-white p-5"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">API mode</p><p className="mt-2 text-sm font-semibold text-slate-950">Contacts Retrieval API</p></div>
        <div className="rounded-hero border border-slate-200 bg-white p-5"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">Staging table</p><p className="mt-2"><StatusBadge label={staged.tableReady ? 'Ready' : 'Migration not applied'} tone={staged.tableReady ? 'success' : 'neutral'} dot={false} /></p></div>
      </div>

      <SectionCard eyebrow="Live API test" title="Preview Interakt contacts" description="Calls Interakt with the Stark Packmate server-side API key. This action does not write to Supabase.">
        <form method="get" className="grid gap-4 md:grid-cols-[1fr_140px_auto] md:items-end">
          <input type="hidden" name="preview" value="1" />
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Created after (optional UTC-compatible date/time)<input name="createdAfter" defaultValue={createdAfter} placeholder="2026-08-01T00:00:00Z" className="min-h-11 rounded-xl border border-slate-200 px-3 font-normal" /></label>
          <label className="grid gap-2 text-sm font-semibold text-slate-700">Limit<input name="limit" type="number" min="1" max="100" defaultValue={limit} className="min-h-11 rounded-xl border border-slate-200 px-3 font-normal" /></label>
          <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white">Preview API</button>
        </form>
        {previewError ? <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{previewError}</p> : null}
        {preview ? (
          <div className="mt-5 overflow-x-auto">
            <div className="mb-3 text-sm text-slate-600">Received {preview.contacts.length} contact(s). {preview.hasNextPage ? 'More pages are available.' : 'No next page reported.'}</div>
            <table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Name</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Created</th><th className="px-3 py-2">Source</th></tr></thead><tbody>{preview.contacts.map((contact) => <tr key={contact.externalContactId} className="border-b border-slate-100"><td className="px-3 py-3 font-medium text-slate-950">{contact.contactName ?? '—'}</td><td className="px-3 py-3">{contact.fullPhoneNumber ?? '—'}</td><td className="px-3 py-3">{contact.email ?? '—'}</td><td className="px-3 py-3">{formatDate(contact.sourceCreatedAt)}</td><td className="px-3 py-3">{contact.sourceCreatedVia ?? '—'}</td></tr>)}</tbody></table>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard eyebrow="Controlled staging" title="Stage the same Interakt slice" description="Enabled only after the staging migration exists. Upserts into lead_intake_staging and has no promotion path to public.leads.">
        <form action={stageStarkInteraktContacts} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="createdAfter" value={createdAfter} />
          <input type="hidden" name="limit" value={limit} />
          <button type="submit" disabled={!staged.tableReady} className="min-h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">Stage contacts only</button>
          {!staged.tableReady ? <span className="text-sm text-slate-500">Apply the PR migration to a non-production/test database before using staging.</span> : null}
        </form>
      </SectionCard>

      <SectionCard eyebrow="Staging review" title="Recent staged Interakt contacts" description="This table reads lead_intake_staging only. It does not join or read public.leads.">
        {staged.error ? <p className="text-sm text-rose-700">{staged.error}</p> : null}
        {staged.rows.length === 0 ? <p className="text-sm text-slate-500">No staged contacts yet.</p> : <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><th className="px-3 py-2">Name</th><th className="px-3 py-2">Phone</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Fetched</th></tr></thead><tbody>{staged.rows.map((row: any) => <tr key={row.id} className="border-b border-slate-100"><td className="px-3 py-3 font-medium text-slate-950">{row.contact_name ?? '—'}</td><td className="px-3 py-3">{row.full_phone_number ?? '—'}</td><td className="px-3 py-3">{row.email ?? '—'}</td><td className="px-3 py-3">{row.intake_status}</td><td className="px-3 py-3">{formatDate(row.fetched_at)}</td></tr>)}</tbody></table></div>}
      </SectionCard>
    </div>
  );
}
