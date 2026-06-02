import Link from 'next/link';
import { FaIcon } from '@/components/ui/fa-icon';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import type { Database } from '@/types/database';

type DocumentRow = Database['public']['Tables']['documents']['Row'];

type LeadRow = {
  id: string;
  company_name: string | null;
  contact_name: string | null;
};

type QuoteRow = {
  id: string;
  quote_number: string | null;
  lead_id: string | null;
};

type ContractRow = {
  id: string;
  quote_id: string | null;
  lead_id: string | null;
};

type DocumentsPageProps = {
  searchParams?: {
    q?: string;
    status?: string;
    type?: string;
    view?: string;
  };
};

type DocumentContext = {
  clientName: string;
  leadName: string | null;
  linkedLabel: string;
  linkedHref: string;
  documentTitle: string;
  documentSubtitle: string;
  pdfHref: string | null;
};

function normalize(value?: string | null) {
  return String(value ?? '').trim();
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

function shortId(value?: string | null) {
  return normalize(value).slice(0, 8).toUpperCase();
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

function isNeedsReview(status?: string | null) {
  const normalized = normalize(status).toLowerCase();
  return ['pending', 'review', 'in_review', 'needs_review', 'submitted', 'uploaded'].includes(normalized) || normalized.includes('review');
}

function isApproved(status?: string | null) {
  const normalized = normalize(status).toLowerCase();
  return ['approved', 'ready', 'active', 'valid'].includes(normalized);
}

function documentTypeLabel(value?: string | null) {
  const type = normalize(value).toLowerCase();
  if (type.includes('order_confirmation')) return 'Order Confirmation';
  if (type.includes('final_invoice') || type.includes('dispatch_invoice') || type === 'invoice') return 'Final Invoice';
  if (type.includes('packing')) return 'Packing List';
  if (type.includes('quote')) return 'Commercial Quote';
  if (type.includes('evidence')) return 'Uploaded Evidence';
  if (type.includes('delivery')) return 'Delivery Note';
  if (!type) return 'Document';
  return type.split(/[_-]+/).map((word) => word ? `${word[0]?.toUpperCase()}${word.slice(1)}` : '').join(' ');
}

function typeIcon(value?: string | null) {
  const type = normalize(value).toLowerCase();
  if (type.includes('invoice')) return 'file-text-o';
  if (type.includes('quote')) return 'file-pdf-o';
  if (type.includes('packing')) return 'archive';
  if (type.includes('evidence')) return 'cloud-upload';
  if (type.includes('delivery')) return 'truck';
  return 'file-text-o';
}

function statusBadge(document: DocumentRow) {
  if (isExpired(document)) return { label: 'Expired', className: 'bg-rose-50 text-rose-700 ring-rose-100', icon: 'warning' };
  if (isExpiringSoon(document)) return { label: 'Expiring soon', className: 'bg-orange-50 text-orange-700 ring-orange-100', icon: 'clock-o' };
  if (isNeedsReview(document.status)) return { label: 'Needs review', className: 'bg-amber-50 text-amber-700 ring-amber-100', icon: 'exclamation-circle' };
  if (isApproved(document.status)) return { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100', icon: 'check-circle-o' };
  return { label: normalize(document.status) || 'Tracked', className: 'bg-slate-100 text-slate-700 ring-slate-200', icon: 'circle-o' };
}

function rawFileMeta(fileName?: string | null) {
  const name = normalize(fileName);
  if (!name) return 'Generated document';
  return name.toLowerCase().startsWith('seed-') ? 'System generated PDF' : name;
}

function directLeadName(lead?: LeadRow | null) {
  return normalize(lead?.company_name) || normalize(lead?.contact_name) || null;
}

function buildPdfHref(document: DocumentRow) {
  const explicit = normalize(document.file_url);
  if (explicit) return explicit;
  const entity = normalize(document.related_entity).toLowerCase();
  const type = normalize(document.doc_type).toLowerCase();
  if ((entity === 'contract' || entity === 'order') && type.includes('invoice')) return `/api/orders/${document.related_id}/invoice/pdf`;
  if ((entity === 'contract' || entity === 'order') && type.includes('order')) return `/api/orders/${document.related_id}/order-confirmation/pdf`;
  if (entity === 'quote') return `/api/quotes/${document.related_id}/pdf`;
  return null;
}

function recordRoute(document: DocumentRow) {
  const entity = normalize(document.related_entity).toLowerCase();
  if (entity === 'contract' || entity === 'order') return `/orders/${document.related_id}`;
  if (entity === 'quote') return `/quotes/${document.related_id}`;
  if (entity === 'lead') return `/leads/${document.related_id}`;
  return '/documents';
}

function recordLabel(document: DocumentRow, quote?: QuoteRow | null) {
  const entity = normalize(document.related_entity).toLowerCase();
  if (entity === 'contract' || entity === 'order') return `Order ${shortId(document.related_id)}`;
  if (entity === 'quote') return `Quote ${normalize(quote?.quote_number) || shortId(document.related_id)}`;
  if (entity === 'lead') return `Lead ${shortId(document.related_id)}`;
  return `${normalize(document.related_entity) || 'Record'} ${shortId(document.related_id)}`;
}

function matchesSearch(document: DocumentRow, context: DocumentContext, query: string) {
  if (!query) return true;
  const haystack = [
    context.clientName,
    context.leadName,
    context.documentTitle,
    context.documentSubtitle,
    context.linkedLabel,
    document.file_name,
    document.doc_type,
    document.status,
    document.related_entity,
    document.related_id,
    document.requirement_code,
  ].map((value) => normalize(value).toLowerCase()).join(' ');
  return haystack.includes(query.toLowerCase());
}

function metricCard(label: string, value: number, helper: string, icon: string, tone: string) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><FaIcon icon={icon} fixedWidth /></span>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500">{helper}</p>
    </div>
  );
}

async function loadDocumentContext(documents: DocumentRow[], organizationId: string) {
  const directLeadIds = new Set<string>();
  const directQuoteIds = new Set<string>();
  const contractIds = new Set<string>();

  documents.forEach((document) => {
    const entity = normalize(document.related_entity).toLowerCase();
    if (entity === 'lead') directLeadIds.add(document.related_id);
    if (entity === 'quote') directQuoteIds.add(document.related_id);
    if (entity === 'contract' || entity === 'order') contractIds.add(document.related_id);
  });

  const db = await createClient();
  const { data: contractData } = contractIds.size
    ? await db.from('contracts').select('id, quote_id, lead_id').eq('organization_id', organizationId).in('id', Array.from(contractIds))
    : { data: [] };
  const contracts = (contractData ?? []) as unknown as ContractRow[];
  const contractMap = new Map(contracts.map((contract) => [contract.id, contract]));

  contracts.forEach((contract) => {
    if (contract.quote_id) directQuoteIds.add(contract.quote_id);
    if (contract.lead_id) directLeadIds.add(contract.lead_id);
  });

  const { data: quoteData } = directQuoteIds.size
    ? await db.from('quotes').select('id, quote_number, lead_id').eq('organization_id', organizationId).in('id', Array.from(directQuoteIds))
    : { data: [] };
  const quotes = (quoteData ?? []) as unknown as QuoteRow[];
  const quoteMap = new Map(quotes.map((quote) => [quote.id, quote]));

  quotes.forEach((quote) => {
    if (quote.lead_id) directLeadIds.add(quote.lead_id);
  });

  const { data: leadData } = directLeadIds.size
    ? await db.from('leads').select('id, company_name, contact_name').eq('organization_id', organizationId).in('id', Array.from(directLeadIds))
    : { data: [] };
  const leads = (leadData ?? []) as unknown as LeadRow[];
  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));

  function leadForDocument(document: DocumentRow) {
    const entity = normalize(document.related_entity).toLowerCase();
    if (entity === 'lead') return leadMap.get(document.related_id) ?? null;
    if (entity === 'quote') {
      const quote = quoteMap.get(document.related_id);
      return quote?.lead_id ? leadMap.get(quote.lead_id) ?? null : null;
    }
    if (entity === 'contract' || entity === 'order') {
      const contract = contractMap.get(document.related_id);
      if (contract?.lead_id) return leadMap.get(contract.lead_id) ?? null;
      const quote = contract?.quote_id ? quoteMap.get(contract.quote_id) : null;
      return quote?.lead_id ? leadMap.get(quote.lead_id) ?? null : null;
    }
    return null;
  }

  return documents.reduce<Record<string, DocumentContext>>((acc, document) => {
    const entity = normalize(document.related_entity).toLowerCase();
    const contract = entity === 'contract' || entity === 'order' ? contractMap.get(document.related_id) ?? null : null;
    const quote = entity === 'quote' ? quoteMap.get(document.related_id) ?? null : contract?.quote_id ? quoteMap.get(contract.quote_id) ?? null : null;
    const lead = leadForDocument(document);
    const clientName = directLeadName(lead) || 'Unassigned client';
    const docType = documentTypeLabel(document.doc_type);
    acc[document.id] = {
      clientName,
      leadName: lead?.contact_name ? `Lead: ${lead.contact_name}` : directLeadName(lead) ? `Lead: ${directLeadName(lead)}` : null,
      linkedLabel: recordLabel(document, quote),
      linkedHref: recordRoute(document),
      documentTitle: `${clientName} — ${docType}`,
      documentSubtitle: `${docType} · ${rawFileMeta(document.file_name)}`,
      pdfHref: buildPdfHref(document),
    };
    return acc;
  }, {});
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
  const contextById = await loadDocumentContext(documents, workspace.organization.id);
  const query = normalize(searchParams?.q);
  const selectedStatus = normalize(searchParams?.status).toLowerCase();
  const selectedType = normalize(searchParams?.type).toLowerCase();
  const selectedView = normalize(searchParams?.view) || 'client';

  const filteredDocuments = documents.filter((document) => {
    const context = contextById[document.id];
    const statusMatch = !selectedStatus || normalize(document.status).toLowerCase() === selectedStatus;
    const typeMatch = !selectedType || normalize(document.doc_type).toLowerCase() === selectedType;
    return statusMatch && typeMatch && matchesSearch(document, context, query);
  });

  const statusOptions = Array.from(new Set(documents.map((document) => normalize(document.status)).filter(Boolean))).sort();
  const typeOptions = Array.from(new Set(documents.map((document) => normalize(document.doc_type)).filter(Boolean))).sort();
  const needsReview = documents.filter((document) => isNeedsReview(document.status)).length;
  const approved = documents.filter((document) => isApproved(document.status)).length;
  const expired = documents.filter(isExpired).length;
  const expiringSoon = documents.filter(isExpiringSoon).length;
  const generatedPdfs = documents.filter((document) => normalize(document.file_name).toLowerCase().endsWith('.pdf') || normalize(document.doc_type).toLowerCase().includes('pdf')).length;

  const grouped = filteredDocuments.reduce<Record<string, DocumentRow[]>>((acc, document) => {
    const context = contextById[document.id];
    const key = selectedView === 'status'
      ? statusBadge(document).label
      : selectedView === 'type'
        ? documentTypeLabel(document.doc_type)
        : selectedView === 'timeline'
          ? formatDate(document.uploaded_at)
          : context.clientName;
    acc[key] = [...(acc[key] ?? []), document];
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0c7fff]">Documents</p>
          <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">Manage client documents, generated PDFs, expiry posture, and review status across leads, quotes, and orders.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm"><FaIcon icon="download" fixedWidth />Export view</button>
          <button type="button" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#061c2e] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(6,28,46,0.2)]"><FaIcon icon="cloud-upload" fixedWidth />Upload / Register</button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metricCard('Total', documents.length, 'Across active clients', 'file-text-o', 'bg-blue-50 text-[#0c7fff]')}
        {metricCard('Needs review', needsReview, 'Awaiting action', 'exclamation-circle', 'bg-amber-50 text-amber-700')}
        {metricCard('Approved', approved, 'Ready to use', 'check-circle-o', 'bg-emerald-50 text-emerald-700')}
        {metricCard('Expiring soon', expiringSoon, 'Within 30 days', 'clock-o', 'bg-orange-50 text-orange-700')}
        {metricCard('Generated PDFs', generatedPdfs, 'Quotes and orders', 'file-pdf-o', 'bg-rose-50 text-rose-700')}
      </section>

      <section className="rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <form className="grid gap-3 xl:grid-cols-[1fr_190px_210px_260px_auto]" action="/documents">
          <label className="relative">
            <span className="sr-only">Search documents</span>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><FaIcon icon="search" fixedWidth /></span>
            <input name="q" defaultValue={searchParams?.q ?? ''} placeholder="Search documents, clients, orders, quotes..." className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" />
          </label>
          <select name="status" defaultValue={searchParams?.status ?? ''} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none">
            <option value="">All statuses</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <select name="type" defaultValue={searchParams?.type ?? ''} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none">
            <option value="">All document types</option>
            {typeOptions.map((type) => <option key={type} value={type}>{documentTypeLabel(type)}</option>)}
          </select>
          <div className="flex rounded-2xl bg-slate-100 p-1">
            {['client', 'status', 'type', 'timeline'].map((view) => (
              <button key={view} type="submit" name="view" value={view} className={`flex-1 rounded-xl px-3 py-2 text-xs font-black capitalize transition ${selectedView === view ? 'bg-[#0c7fff] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>{view}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white">Apply</button>
            <Link href="/documents" className="inline-flex h-12 items-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700">Reset</Link>
          </div>
        </form>
      </section>

      {Object.entries(grouped).length ? (
        <section className="space-y-4">
          {Object.entries(grouped).map(([groupName, groupDocuments]) => {
            const hasAttention = groupDocuments.some((document) => isNeedsReview(document.status) || isExpired(document) || isExpiringSoon(document));
            return (
              <div key={groupName} className="overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white to-sky-50/70 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#0c7fff]"><FaIcon icon="building-o" fixedWidth /></span>
                    <div>
                      <h2 className="text-base font-black text-slate-950">{groupName}</h2>
                      <p className="text-xs font-semibold text-slate-500">{groupDocuments.length} document{groupDocuments.length === 1 ? '' : 's'} · grouped by {selectedView}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ring-1 ${hasAttention ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-emerald-50 text-emerald-700 ring-emerald-100'}`}><FaIcon icon={hasAttention ? 'exclamation-circle' : 'check-circle-o'} fixedWidth />{hasAttention ? 'Attention' : 'Healthy'}</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {groupDocuments.map((document) => {
                    const context = contextById[document.id];
                    const badge = statusBadge(document);
                    return (
                      <div key={document.id} className={`grid gap-4 px-5 py-4 lg:grid-cols-[44px_1.4fr_1fr_130px_170px_110px] lg:items-center ${badge.label === 'Needs review' || badge.label === 'Expired' || badge.label === 'Expiring soon' ? 'bg-amber-50/45' : 'bg-white'}`}>
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100"><FaIcon icon={typeIcon(document.doc_type)} fixedWidth /></span>
                        <div>
                          <p className="font-black text-slate-950">{context.documentTitle}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">{context.documentSubtitle}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">{context.leadName ?? 'Lead context not linked'}</p>
                        </div>
                        <Link href={context.linkedHref} className="font-black text-[#075985] transition hover:text-[#0c7fff] hover:underline">{context.linkedLabel}</Link>
                        <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-black ring-1 ${badge.className}`}><FaIcon icon={badge.icon} fixedWidth />{badge.label}</span>
                        <div className="text-xs font-semibold text-slate-500">
                          <p>{formatDate(document.uploaded_at)}</p>
                          <p className="mt-1">Expiry: {formatDate(document.expires_at)}</p>
                        </div>
                        {context.pdfHref ? <a href={context.pdfHref} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full bg-[#061c2e] px-4 py-2 text-xs font-black text-white shadow-sm"><FaIcon icon="external-link" fixedWidth /> PDF</a> : <span className="text-xs font-bold text-slate-400">No PDF</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section className="rounded-[1.6rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-lg font-black text-slate-950">No documents match this view</p>
          <p className="mt-2 text-sm font-semibold text-slate-500">Clear filters or generate documents from Quotes and Orders.</p>
        </section>
      )}
    </div>
  );
}
