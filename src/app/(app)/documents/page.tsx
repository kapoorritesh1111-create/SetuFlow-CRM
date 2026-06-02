import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import type { Database } from '@/types/database';

type DocumentRow = Database['public']['Tables']['documents']['Row'];

type DocumentsPageProps = {
  searchParams?: {
    q?: string;
    status?: string;
    type?: string;
  };
};

function normalize(value?: string | null) {
  return String(value ?? '').trim();
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function statusClass(status?: string | null) {
  const normalized = normalize(status).toLowerCase();
  if (['approved', 'ready', 'active', 'valid'].includes(normalized)) return 'bg-emerald-50 text-emerald-700 ring-emerald-100';
  if (['rejected', 'expired', 'failed'].includes(normalized)) return 'bg-rose-50 text-rose-700 ring-rose-100';
  if (['pending', 'review', 'in_review', 'needs_review'].includes(normalized)) return 'bg-amber-50 text-amber-700 ring-amber-100';
  return 'bg-slate-100 text-slate-700 ring-slate-200';
}

function isExpired(document: DocumentRow) {
  return document.expires_at ? new Date(document.expires_at).getTime() < Date.now() : false;
}

function isExpiringSoon(document: DocumentRow) {
  if (!document.expires_at) return false;
  const expiry = new Date(document.expires_at).getTime();
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return expiry >= now && expiry <= now + thirtyDays;
}

function matchesSearch(document: DocumentRow, query: string) {
  if (!query) return true;
  const haystack = [
    document.file_name,
    document.doc_type,
    document.status,
    document.related_entity,
    document.related_id,
    document.requirement_code,
  ].map((value) => normalize(value).toLowerCase()).join(' ');
  return haystack.includes(query.toLowerCase());
}

function filterDocuments(documents: DocumentRow[], searchParams: DocumentsPageProps['searchParams']) {
  const query = normalize(searchParams?.q);
  const status = normalize(searchParams?.status).toLowerCase();
  const type = normalize(searchParams?.type).toLowerCase();

  return documents.filter((document) => {
    const statusMatch = !status || normalize(document.status).toLowerCase() === status;
    const typeMatch = !type || normalize(document.doc_type).toLowerCase() === type;
    return statusMatch && typeMatch && matchesSearch(document, query);
  });
}

function metricCard(label: string, value: number, helper: string) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{helper}</p>
    </div>
  );
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Documents workspace" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;
  }

  const db = await createClient();
  const { data, error } = await db
    .from('documents')
    .select('id, organization_id, related_entity, related_id, file_name, file_url, doc_type, uploaded_by, uploaded_at, version, status, owner_user_id, reviewer_user_id, reviewed_at, review_notes, expires_at, version_label, requirement_code')
    .eq('organization_id', workspace.organization.id)
    .order('uploaded_at', { ascending: false })
    .limit(150);

  if (error) {
    return <WorkspaceState eyebrow="Documents workspace" title="Documents could not be loaded" description={error.message} primaryActionHref="/dashboard" primaryActionLabel="Back to dashboard" />;
  }

  const documents: DocumentRow[] = (data ?? []) as unknown as DocumentRow[];
  const filteredDocuments = filterDocuments(documents, searchParams);
  const statusOptions = Array.from(new Set(documents.map((document) => normalize(document.status)).filter(Boolean))).sort();
  const typeOptions = Array.from(new Set(documents.map((document) => normalize(document.doc_type)).filter(Boolean))).sort();
  const pendingReview = documents.filter((document) => normalize(document.status).toLowerCase().includes('review') || normalize(document.status).toLowerCase() === 'pending').length;
  const expired = documents.filter(isExpired).length;
  const expiringSoon = documents.filter(isExpiringSoon).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Documents"
        title="Document library"
        description="Search, filter, preview, and track documents across leads, quotes, contracts, orders, and compliance evidence without opening the compliance checklist workspace."
        actions={[
          { label: 'Compliance workspace', href: '/compliance' },
          { label: 'Orders', href: '/orders' },
          { label: 'Admin audit', href: '/admin/audit', type: 'primary' },
        ]}
      />

      <section className="grid gap-4 md:grid-cols-4">
        {metricCard('Total docs', documents.length, 'Workspace documents')}
        {metricCard('Needs review', pendingReview, 'Pending or review status')}
        {metricCard('Expiring soon', expiringSoon, 'Next 30 days')}
        {metricCard('Expired', expired, 'Past expiry date')}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <form className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]" action="/documents">
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Search</span>
            <input
              name="q"
              defaultValue={searchParams?.q ?? ''}
              placeholder="File, type, entity, requirement..."
              className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Status</span>
            <select name="status" defaultValue={searchParams?.status ?? ''} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100">
              <option value="">All statuses</option>
              {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Type</span>
            <select name="type" defaultValue={searchParams?.type ?? ''} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100">
              <option value="">All types</option>
              {typeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <button type="submit" className="h-11 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800">Apply</button>
            <Link href="/documents" className="inline-flex h-11 items-center rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Reset</Link>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <p className="text-sm font-black text-slate-950">{filteredDocuments.length} document{filteredDocuments.length === 1 ? '' : 's'}</p>
          <p className="text-sm text-slate-500">Latest uploaded files and generated documents across the active workspace.</p>
        </div>

        {filteredDocuments.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Document</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Linked to</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Uploaded</th>
                  <th className="px-5 py-3">Expiry</th>
                  <th className="px-5 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocuments.map((document) => (
                  <tr key={document.id} className="align-top">
                    <td className="px-5 py-4">
                      <p className="font-bold text-slate-950">{document.file_name}</p>
                      <p className="mt-1 text-xs text-slate-500">v{document.version}{document.version_label ? ` · ${document.version_label}` : ''}{document.requirement_code ? ` · ${document.requirement_code}` : ''}</p>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{document.doc_type}</td>
                    <td className="px-5 py-4 text-slate-700">
                      <p className="font-semibold capitalize">{document.related_entity}</p>
                      <p className="text-xs text-slate-500">{document.related_id.slice(0, 8)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${statusClass(document.status)}`}>{document.status}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-700">{formatDate(document.uploaded_at)}</td>
                    <td className="px-5 py-4 text-slate-700">
                      {formatDate(document.expires_at)}
                      {isExpired(document) ? <p className="mt-1 text-xs font-bold text-rose-600">Expired</p> : null}
                      {isExpiringSoon(document) ? <p className="mt-1 text-xs font-bold text-amber-600">Expiring soon</p> : null}
                    </td>
                    <td className="px-5 py-4">
                      <a href={document.file_url} target="_blank" rel="noreferrer" className="inline-flex rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50">Open</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-base font-black text-slate-950">No documents match this view</p>
            <p className="mt-2 text-sm text-slate-500">Clear filters or generate/upload documents from Leads, Quotes, Orders, or Compliance workflows.</p>
          </div>
        )}
      </section>
    </div>
  );
}
