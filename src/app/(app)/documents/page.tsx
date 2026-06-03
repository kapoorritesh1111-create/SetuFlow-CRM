import Link from 'next/link';
import { FaIcon } from '@/components/ui/fa-icon';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import type { Database } from '@/types/database';

type DocumentRow = Database['public']['Tables']['documents']['Row'];
type LeadRow = { id: string; company_name: string | null; contact_name: string | null };
type QuoteRow = { id: string; quote_number: string | null; lead_id: string | null };
type ContractRow = { id: string; quote_id: string | null; lead_id: string | null };
type OrderRow = { id: string; order_number: string | null; lead_id: string | null; source_quote_id: string | null; legacy_contract_id: string | null };
type OrderDocumentRow = { id: string; order_id: string; legacy_contract_id: string | null; document_id: string | null; document_type: string; stage_key: string | null; status: string | null; version_no: number | null; pdf_storage_path: string | null; created_at: string | null };
type OrderDocumentSendRow = { id: string; order_document_id: string | null; order_id: string; document_type: string | null; share_url: string | null; created_at: string | null };

type DocumentsPageProps = { searchParams?: { q?: string; status?: string; type?: string; view?: string; sort?: string; dir?: string } };

type DocumentItem = {
  id: string;
  source: 'document' | 'order_document';
  sourceId: string;
  documentId: string | null;
  relatedEntity: string;
  relatedId: string;
  fileName: string | null;
  fileUrl: string | null;
  docType: string | null;
  status: string | null;
  uploadedAt: string | null;
  expiresAt: string | null;
  version: number | null;
  versionLabel: string | null;
  requirementCode: string | null;
  orderId: string | null;
  legacyContractId: string | null;
  pdfStoragePath: string | null;
  latestShareUrl: string | null;
};

type DocumentContext = {
  clientName: string;
  leadName: string;
  linkedLabel: string;
  linkedHref: string;
  documentTitle: string;
  documentSubtitle: string;
  pdfHref: string | null;
  pdfLabel: string;
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

function documentTypeLabel(value?: string | null) {
  const type = normalize(value).toLowerCase();
  if (type.includes('order_confirmation')) return 'Order Confirmation';
  if (type.includes('completion_packet')) return 'Completion Packet';
  if (type.includes('final_invoice') || type.includes('dispatch_invoice') || type.includes('proforma_invoice') || type === 'invoice') return 'Invoice';
  if (type.includes('packing')) return 'Packing List';
  if (type.includes('freight')) return 'Freight Request';
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
  if (type.includes('freight')) return 'truck';
  if (type.includes('evidence')) return 'cloud-upload';
  if (type.includes('delivery')) return 'truck';
  return 'file-text-o';
}

function isExpired(item: DocumentItem) {
  return item.expiresAt ? new Date(item.expiresAt).getTime() < Date.now() : false;
}

function isExpiringSoon(item: DocumentItem) {
  if (!item.expiresAt) return false;
  const expiry = new Date(item.expiresAt).getTime();
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  return expiry >= now && expiry <= now + thirtyDays;
}

function isNeedsReview(status?: string | null) {
  const normalized = normalize(status).toLowerCase();
  return ['pending', 'review', 'in_review', 'needs_review', 'submitted', 'uploaded', 'previewed', 'link_created'].includes(normalized) || normalized.includes('review');
}

function isApproved(status?: string | null) {
  const normalized = normalize(status).toLowerCase();
  return ['approved', 'ready', 'active', 'valid'].includes(normalized);
}

function statusBadge(item: DocumentItem) {
  if (isExpired(item)) return { label: 'Expired', className: 'bg-rose-50 text-rose-700 ring-rose-100', icon: 'warning' };
  if (isExpiringSoon(item)) return { label: 'Expiring soon', className: 'bg-orange-50 text-orange-700 ring-orange-100', icon: 'clock-o' };
  if (isNeedsReview(item.status)) return { label: 'Needs review', className: 'bg-amber-50 text-amber-700 ring-amber-100', icon: 'exclamation-circle' };
  if (isApproved(item.status)) return { label: 'Approved', className: 'bg-emerald-50 text-emerald-700 ring-emerald-100', icon: 'check-circle-o' };
  return { label: normalize(item.status) || 'Tracked', className: 'bg-slate-100 text-slate-700 ring-slate-200', icon: 'circle-o' };
}

function rawFileMeta(fileName?: string | null) {
  const name = normalize(fileName);
  if (!name) return 'Workflow document';
  return name.toLowerCase().startsWith('seed-') ? 'System generated record' : name;
}

function directLeadName(lead?: LeadRow | null) {
  return normalize(lead?.company_name) || normalize(lead?.contact_name) || null;
}

function safeExplicitFileUrl(value?: string | null) {
  const explicit = normalize(value);
  if (!explicit) return null;
  if (/example\.test/i.test(explicit)) return null;
  if (/^https?:\/\//i.test(explicit)) return explicit;
  if (explicit.startsWith('/')) return explicit;
  return null;
}

function safePdfStoragePath(value?: string | null) {
  const path = normalize(value);
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return path;
  return null;
}

function normalizedPdfShareUrl(value?: string | null) {
  const url = safeExplicitFileUrl(value);
  if (!url) return null;
  if (!url.includes('/order-documents/preview/')) return url;
  return url.replace(/\/pdf\/?$/, '') + '/pdf';
}

function sendKey(orderId?: string | null, documentType?: string | null) {
  return `${normalize(orderId)}::${normalize(documentType).toLowerCase()}`;
}

function itemFromDocument(row: DocumentRow, linkedOrderDoc?: OrderDocumentRow, send?: OrderDocumentSendRow | null): DocumentItem {
  return {
    id: `document:${row.id}`,
    source: 'document',
    sourceId: row.id,
    documentId: row.id,
    relatedEntity: row.related_entity,
    relatedId: row.related_id,
    fileName: row.file_name,
    fileUrl: row.file_url,
    docType: linkedOrderDoc?.document_type ?? row.doc_type,
    status: linkedOrderDoc?.status ?? row.status,
    uploadedAt: linkedOrderDoc?.created_at ?? row.uploaded_at,
    expiresAt: row.expires_at,
    version: linkedOrderDoc?.version_no ?? row.version,
    versionLabel: row.version_label,
    requirementCode: row.requirement_code,
    orderId: linkedOrderDoc?.order_id ?? (row.related_entity === 'order' ? row.related_id : null),
    legacyContractId: linkedOrderDoc?.legacy_contract_id ?? null,
    pdfStoragePath: linkedOrderDoc?.pdf_storage_path ?? null,
    latestShareUrl: send?.share_url ?? null,
  };
}

function itemFromOrderDocument(row: OrderDocumentRow, send?: OrderDocumentSendRow | null): DocumentItem {
  return {
    id: `order-document:${row.id}`,
    source: 'order_document',
    sourceId: row.id,
    documentId: row.document_id,
    relatedEntity: 'order',
    relatedId: row.order_id,
    fileName: null,
    fileUrl: null,
    docType: row.document_type,
    status: row.status,
    uploadedAt: row.created_at,
    expiresAt: null,
    version: row.version_no,
    versionLabel: row.stage_key,
    requirementCode: row.stage_key,
    orderId: row.order_id,
    legacyContractId: row.legacy_contract_id,
    pdfStoragePath: row.pdf_storage_path,
    latestShareUrl: send?.share_url ?? null,
  };
}

function sortHref(searchParams: DocumentsPageProps['searchParams'], sort: string) {
  const params = new URLSearchParams();
  if (searchParams?.q) params.set('q', searchParams.q);
  if (searchParams?.status) params.set('status', searchParams.status);
  if (searchParams?.type) params.set('type', searchParams.type);
  if (searchParams?.view) params.set('view', searchParams.view);
  const currentSort = normalize(searchParams?.sort) || 'client';
  const currentDir = normalize(searchParams?.dir) || 'asc';
  params.set('sort', sort);
  params.set('dir', currentSort === sort && currentDir === 'asc' ? 'desc' : 'asc');
  return `/documents?${params.toString()}`;
}

function sortLabel(searchParams: DocumentsPageProps['searchParams'], sort: string, label: string) {
  const active = (normalize(searchParams?.sort) || 'client') === sort;
  const dir = normalize(searchParams?.dir) || 'asc';
  return `${label}${active ? (dir === 'desc' ? ' ↓' : ' ↑') : ''}`;
}

function metricCard(label: string, value: number, helper: string, icon: string, tone: string) {
  return (
    <div className="rounded-[1.35rem] border border-slate-200/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tone}`}><FaIcon icon={icon} fixedWidth /></span>
        <div><p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p><p className="mt-1 text-2xl font-black text-slate-950">{value}</p></div>
      </div>
      <p className="mt-3 text-xs font-semibold text-slate-500">{helper}</p>
    </div>
  );
}

function buildWorkspaceRoute(item: DocumentItem, quote?: QuoteRow | null, order?: OrderRow | null, lead?: LeadRow | null) {
  if (item.relatedEntity === 'order' || item.orderId) return `/orders?openOrderId=${encodeURIComponent(order?.id ?? item.orderId ?? item.relatedId)}&mode=buyers`;
  if (item.relatedEntity === 'quote') return `/quotes?quoteId=${encodeURIComponent(quote?.id ?? item.relatedId)}`;
  if (item.relatedEntity === 'lead') return `/leads?q=${encodeURIComponent(directLeadName(lead) ?? item.relatedId)}`;
  return '/documents';
}

function buildPdfHref(item: DocumentItem, quote?: QuoteRow | null, order?: OrderRow | null, contract?: ContractRow | null) {
  const shareUrl = normalizedPdfShareUrl(item.latestShareUrl);
  if (shareUrl) return shareUrl;

  const storagePath = safePdfStoragePath(item.pdfStoragePath);
  if (storagePath) return storagePath;

  const type = normalize(item.docType).toLowerCase();
  if (item.relatedEntity === 'quote' && quote?.id && type.includes('quote')) return `/api/quotes/${quote.id}/pdf`;
  if (item.relatedEntity === 'quote' && type.includes('quote')) return `/api/quotes/${item.relatedId}/pdf`;

  const legacyContractId = item.legacyContractId ?? order?.legacy_contract_id ?? contract?.id ?? null;
  if (legacyContractId) {
    if (type.includes('invoice') || type.includes('completion')) return `/api/orders/${legacyContractId}/invoice/pdf`;
    if (type.includes('order') || type.includes('dispatch')) return `/api/orders/${legacyContractId}/order-confirmation/pdf`;
  }

  return safeExplicitFileUrl(item.fileUrl);
}

function pdfUnavailableLabel(item: DocumentItem) {
  const type = normalize(item.docType).toLowerCase();
  if (type.includes('quote')) return 'No PDF';
  if (item.source === 'order_document' || type.includes('packing') || type.includes('freight') || type.includes('delivery') || type.includes('invoice') || type.includes('order') || type.includes('dispatch')) return 'PDF pending';
  return 'No file yet';
}

function matchesSearch(item: DocumentItem, context: DocumentContext, query: string) {
  if (!query) return true;
  const haystack = [context.clientName, context.leadName, context.documentTitle, context.documentSubtitle, context.linkedLabel, item.fileName, item.docType, item.status, item.relatedEntity, item.relatedId, item.requirementCode].map((value) => normalize(value).toLowerCase()).join(' ');
  return haystack.includes(query.toLowerCase());
}

async function buildItemsAndContext(organizationId: string) {
  const db = await createClient();
  const [{ data: documentData, error: documentError }, { data: orderDocumentData, error: orderDocumentError }] = await Promise.all([
    db.from('documents').select('id, organization_id, related_entity, related_id, file_name, file_url, doc_type, uploaded_by, uploaded_at, version, status, owner_user_id, reviewer_user_id, reviewed_at, review_notes, expires_at, version_label, requirement_code').eq('organization_id', organizationId).order('uploaded_at', { ascending: false }).limit(250),
    db.from('order_documents').select('id, order_id, legacy_contract_id, document_id, document_type, stage_key, status, version_no, pdf_storage_path, created_at').eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(250),
  ]);

  if (documentError) return { error: documentError.message, items: [] as DocumentItem[], contextById: {} as Record<string, DocumentContext> };
  if (orderDocumentError) return { error: orderDocumentError.message, items: [] as DocumentItem[], contextById: {} as Record<string, DocumentContext> };

  const documents = (documentData ?? []) as unknown as DocumentRow[];
  const orderDocuments = (orderDocumentData ?? []) as unknown as OrderDocumentRow[];
  const orderDocIds = orderDocuments.map((row) => row.id);
  const orderDocOrderIds = Array.from(new Set(orderDocuments.map((row) => row.order_id).filter(Boolean)));
  const { data: sendData } = orderDocOrderIds.length
    ? await db.from('order_document_sends').select('id, order_document_id, order_id, document_type, share_url, created_at').eq('organization_id', organizationId).in('order_id', orderDocOrderIds).order('created_at', { ascending: false }).limit(500)
    : { data: [] };
  const sends = (sendData ?? []) as unknown as OrderDocumentSendRow[];
  const sendByOrderDocumentId = new Map<string, OrderDocumentSendRow>();
  const sendByOrderAndType = new Map<string, OrderDocumentSendRow>();
  sends.forEach((send) => {
    if (send.order_document_id && orderDocIds.includes(send.order_document_id) && !sendByOrderDocumentId.has(send.order_document_id)) sendByOrderDocumentId.set(send.order_document_id, send);
    const key = sendKey(send.order_id, send.document_type);
    if (!sendByOrderAndType.has(key)) sendByOrderAndType.set(key, send);
  });

  const sendForOrderDoc = (row?: OrderDocumentRow | null) => row ? sendByOrderDocumentId.get(row.id) ?? sendByOrderAndType.get(sendKey(row.order_id, row.document_type)) ?? null : null;
  const orderDocByDocumentId = new Map(orderDocuments.filter((row) => row.document_id).map((row) => [row.document_id as string, row]));
  const documentIds = new Set(documents.map((row) => row.id));
  const items = [
    ...documents.map((row) => {
      const linkedOrderDoc = orderDocByDocumentId.get(row.id);
      return itemFromDocument(row, linkedOrderDoc, sendForOrderDoc(linkedOrderDoc));
    }),
    ...orderDocuments.filter((row) => !row.document_id || !documentIds.has(row.document_id)).map((row) => itemFromOrderDocument(row, sendForOrderDoc(row))),
  ];

  const orderIds = new Set<string>();
  const quoteIds = new Set<string>();
  const contractIds = new Set<string>();
  const leadIds = new Set<string>();

  items.forEach((item) => {
    if (item.orderId) orderIds.add(item.orderId);
    if (item.relatedEntity === 'order') orderIds.add(item.relatedId);
    if (item.relatedEntity === 'quote') quoteIds.add(item.relatedId);
    if (item.relatedEntity === 'contract') contractIds.add(item.relatedId);
    if (item.legacyContractId) contractIds.add(item.legacyContractId);
    if (item.relatedEntity === 'lead') leadIds.add(item.relatedId);
  });

  const { data: orderData } = orderIds.size ? await db.from('orders').select('id, order_number, lead_id, source_quote_id, legacy_contract_id').eq('organization_id', organizationId).in('id', Array.from(orderIds)) : { data: [] };
  const orders = (orderData ?? []) as unknown as OrderRow[];
  const orderMap = new Map(orders.map((order) => [order.id, order]));
  orders.forEach((order) => {
    if (order.source_quote_id) quoteIds.add(order.source_quote_id);
    if (order.lead_id) leadIds.add(order.lead_id);
    if (order.legacy_contract_id) contractIds.add(order.legacy_contract_id);
  });

  const { data: contractData } = contractIds.size ? await db.from('contracts').select('id, quote_id, lead_id').eq('organization_id', organizationId).in('id', Array.from(contractIds)) : { data: [] };
  const contracts = (contractData ?? []) as unknown as ContractRow[];
  const contractMap = new Map(contracts.map((contract) => [contract.id, contract]));
  contracts.forEach((contract) => {
    if (contract.quote_id) quoteIds.add(contract.quote_id);
    if (contract.lead_id) leadIds.add(contract.lead_id);
  });

  const { data: quoteData } = quoteIds.size ? await db.from('quotes').select('id, quote_number, lead_id').eq('organization_id', organizationId).in('id', Array.from(quoteIds)) : { data: [] };
  const quotes = (quoteData ?? []) as unknown as QuoteRow[];
  const quoteMap = new Map(quotes.map((quote) => [quote.id, quote]));
  quotes.forEach((quote) => { if (quote.lead_id) leadIds.add(quote.lead_id); });

  const { data: leadData } = leadIds.size ? await db.from('leads').select('id, company_name, contact_name').eq('organization_id', organizationId).in('id', Array.from(leadIds)) : { data: [] };
  const leads = (leadData ?? []) as unknown as LeadRow[];
  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));

  const contextById = items.reduce<Record<string, DocumentContext>>((acc, item) => {
    const order = item.orderId ? orderMap.get(item.orderId) ?? null : item.relatedEntity === 'order' ? orderMap.get(item.relatedId) ?? null : null;
    const contract = item.legacyContractId ? contractMap.get(item.legacyContractId) ?? null : item.relatedEntity === 'contract' ? contractMap.get(item.relatedId) ?? null : order?.legacy_contract_id ? contractMap.get(order.legacy_contract_id) ?? null : null;
    const quote = item.relatedEntity === 'quote' ? quoteMap.get(item.relatedId) ?? null : order?.source_quote_id ? quoteMap.get(order.source_quote_id) ?? null : contract?.quote_id ? quoteMap.get(contract.quote_id) ?? null : null;
    const lead = item.relatedEntity === 'lead' ? leadMap.get(item.relatedId) ?? null : order?.lead_id ? leadMap.get(order.lead_id) ?? null : quote?.lead_id ? leadMap.get(quote.lead_id) ?? null : contract?.lead_id ? leadMap.get(contract.lead_id) ?? null : null;
    const clientName = directLeadName(lead) || 'Client pending link';
    const docType = documentTypeLabel(item.docType);
    const linkedLabel = item.relatedEntity === 'order' || item.orderId ? `Order ${normalize(order?.order_number) || shortId(item.orderId ?? item.relatedId)}` : item.relatedEntity === 'quote' ? `Quote ${normalize(quote?.quote_number) || shortId(item.relatedId)}` : item.relatedEntity === 'lead' ? `Lead ${directLeadName(lead) ?? shortId(item.relatedId)}` : `${normalize(item.relatedEntity) || 'Record'} ${shortId(item.relatedId)}`;
    const linkedHref = buildWorkspaceRoute(item, quote, order, lead);
    acc[item.id] = {
      clientName,
      leadName: lead?.contact_name ? `Lead: ${lead.contact_name}` : directLeadName(lead) ? `Lead: ${directLeadName(lead)}` : 'Lead context pending',
      linkedLabel,
      linkedHref,
      documentTitle: `${clientName} — ${docType}`,
      documentSubtitle: `${docType} · ${rawFileMeta(item.fileName)}${item.source === 'order_document' ? ' · Order workflow' : ''}`,
      pdfHref: buildPdfHref(item, quote, order, contract),
      pdfLabel: pdfUnavailableLabel(item),
    };
    return acc;
  }, {});

  return { error: null, items, contextById };
}

function sortItems(items: DocumentItem[], contextById: Record<string, DocumentContext>, sort: string, dir: string) {
  const direction = dir === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const aContext = contextById[a.id];
    const bContext = contextById[b.id];
    const aValue = sort === 'document' ? aContext.documentTitle : sort === 'record' ? aContext.linkedLabel : sort === 'status' ? statusBadge(a).label : sort === 'date' ? normalize(a.uploadedAt) : aContext.clientName;
    const bValue = sort === 'document' ? bContext.documentTitle : sort === 'record' ? bContext.linkedLabel : sort === 'status' ? statusBadge(b).label : sort === 'date' ? normalize(b.uploadedAt) : bContext.clientName;
    return aValue.localeCompare(bValue) * direction;
  });
}

export default async function DocumentsPage({ searchParams }: DocumentsPageProps) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) return <WorkspaceState eyebrow="Documents workspace" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;

  const { error, items, contextById } = await buildItemsAndContext(workspace.organization.id);
  if (error) return <WorkspaceState eyebrow="Documents workspace" title="Documents could not be loaded" description={error} primaryActionHref="/dashboard" primaryActionLabel="Back to dashboard" />;

  const query = normalize(searchParams?.q);
  const selectedStatus = normalize(searchParams?.status).toLowerCase();
  const selectedType = normalize(searchParams?.type).toLowerCase();
  const selectedView = normalize(searchParams?.view) || 'client';
  const selectedSort = normalize(searchParams?.sort) || 'client';
  const selectedDir = normalize(searchParams?.dir) || 'asc';

  const filteredItems = sortItems(items.filter((item) => {
    const context = contextById[item.id];
    const statusMatch = !selectedStatus || normalize(item.status).toLowerCase() === selectedStatus;
    const typeMatch = !selectedType || normalize(item.docType).toLowerCase() === selectedType;
    return statusMatch && typeMatch && matchesSearch(item, context, query);
  }), contextById, selectedSort, selectedDir);

  const statusOptions = Array.from(new Set(items.map((item) => normalize(item.status)).filter(Boolean))).sort();
  const typeOptions = Array.from(new Set(items.map((item) => normalize(item.docType)).filter(Boolean))).sort();
  const needsReview = items.filter((item) => isNeedsReview(item.status)).length;
  const approved = items.filter((item) => isApproved(item.status)).length;
  const expiringSoon = items.filter(isExpiringSoon).length;
  const pdfReady = items.filter((item) => contextById[item.id]?.pdfHref).length;

  const grouped = filteredItems.reduce<Record<string, DocumentItem[]>>((acc, item) => {
    const context = contextById[item.id];
    const key = selectedView === 'status' ? statusBadge(item).label : selectedView === 'type' ? documentTypeLabel(item.docType) : selectedView === 'timeline' ? formatDate(item.uploadedAt) : context.clientName;
    acc[key] = [...(acc[key] ?? []), item];
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#0c7fff]">Documents</p><p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">Manage client documents, generated PDFs, expiry posture, and review status across leads, quotes, and orders.</p></div><div className="flex flex-wrap gap-2"><button type="button" className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm"><FaIcon icon="download" fixedWidth />Export view</button><Link href="/leads" className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#061c2e] px-4 text-sm font-black text-white shadow-[0_14px_30px_rgba(6,28,46,0.2)]"><FaIcon icon="users" fixedWidth />Attach from lead</Link></div></section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{metricCard('Total', items.length, 'Global and order workflow docs', 'file-text-o', 'bg-blue-50 text-[#0c7fff]')}{metricCard('Needs review', needsReview, 'Awaiting action', 'exclamation-circle', 'bg-amber-50 text-amber-700')}{metricCard('Approved', approved, 'Ready to use', 'check-circle-o', 'bg-emerald-50 text-emerald-700')}{metricCard('PDF ready', pdfReady, `${expiringSoon} expiring soon`, 'file-pdf-o', 'bg-rose-50 text-rose-700')}</section>

      <section className="rounded-[1.6rem] border border-slate-200/80 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
        <form className="grid gap-3 xl:grid-cols-[1fr_190px_210px_260px_auto]" action="/documents"><label className="relative"><span className="sr-only">Search documents</span><span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><FaIcon icon="search" fixedWidth /></span><input name="q" defaultValue={searchParams?.q ?? ''} placeholder="Search documents, clients, orders, quotes..." className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" /></label><select name="status" defaultValue={searchParams?.status ?? ''} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none"><option value="">All statuses</option>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select><select name="type" defaultValue={searchParams?.type ?? ''} className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 outline-none"><option value="">All document types</option>{typeOptions.map((type) => <option key={type} value={type}>{documentTypeLabel(type)}</option>)}</select><div className="flex rounded-2xl bg-slate-100 p-1">{['client', 'status', 'type', 'timeline'].map((view) => (<button key={view} type="submit" name="view" value={view} className={`flex-1 rounded-xl px-3 py-2 text-xs font-black capitalize transition ${selectedView === view ? 'bg-[#0c7fff] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>{view}</button>))}</div><div className="flex gap-2"><button type="submit" className="h-12 rounded-2xl bg-slate-950 px-5 text-sm font-black text-white">Apply</button><Link href="/documents" className="inline-flex h-12 items-center rounded-2xl border border-slate-200 px-5 text-sm font-black text-slate-700">Reset</Link></div></form>
        <div className="mt-3 grid gap-2 rounded-2xl bg-slate-50 p-2 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 lg:grid-cols-[1.45fr_1fr_1fr_130px_165px_120px]"><Link href={sortHref(searchParams, 'document')} className="rounded-xl px-3 py-2 hover:bg-white">{sortLabel(searchParams, 'document', 'Document')}</Link><Link href={sortHref(searchParams, 'client')} className="rounded-xl px-3 py-2 hover:bg-white">{sortLabel(searchParams, 'client', 'Client')}</Link><Link href={sortHref(searchParams, 'record')} className="rounded-xl px-3 py-2 hover:bg-white">{sortLabel(searchParams, 'record', 'Linked record')}</Link><Link href={sortHref(searchParams, 'status')} className="rounded-xl px-3 py-2 hover:bg-white">{sortLabel(searchParams, 'status', 'Status')}</Link><Link href={sortHref(searchParams, 'date')} className="rounded-xl px-3 py-2 hover:bg-white">{sortLabel(searchParams, 'date', 'Date')}</Link><span className="px-3 py-2">PDF</span></div>
      </section>

      {Object.entries(grouped).length ? <section className="space-y-4">{Object.entries(grouped).map(([groupName, groupItems]) => { const hasAttention = groupItems.some((item) => isNeedsReview(item.status) || isExpired(item) || isExpiringSoon(item)); const defaultOpen = selectedView === 'status' ? groupName !== 'Approved' : hasAttention; return <details key={groupName} open={defaultOpen} className="overflow-hidden rounded-[1.6rem] border border-slate-200/80 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.05)]"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white to-sky-50/70 px-5 py-4 marker:hidden"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50 text-[#0c7fff]"><FaIcon icon="building-o" fixedWidth /></span><div><h2 className="text-base font-black text-slate-950">{groupName}</h2><p className="text-xs font-semibold text-slate-500">{groupItems.length} document{groupItems.length === 1 ? '' : 's'} · click to expand/collapse</p></div></div><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ring-1 ${hasAttention ? 'bg-amber-50 text-amber-700 ring-amber-100' : 'bg-emerald-50 text-emerald-700 ring-emerald-100'}`}><FaIcon icon={hasAttention ? 'exclamation-circle' : 'check-circle-o'} fixedWidth />{hasAttention ? 'Attention' : 'Healthy'}</span></summary><div className="divide-y divide-slate-100">{groupItems.map((item) => { const context = contextById[item.id]; const badge = statusBadge(item); return <div key={item.id} className={`grid gap-4 px-5 py-4 lg:grid-cols-[1.45fr_1fr_1fr_130px_165px_120px] lg:items-center ${badge.label === 'Needs review' || badge.label === 'Expired' || badge.label === 'Expiring soon' ? 'bg-amber-50/45' : 'bg-white'}`}><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100"><FaIcon icon={typeIcon(item.docType)} fixedWidth /></span><div><p className="font-black text-slate-950">{context.documentTitle}</p><p className="mt-1 text-xs font-semibold text-slate-500">{context.documentSubtitle}</p></div></div><div><p className="font-black text-slate-950">{context.clientName}</p><p className="mt-1 text-xs font-semibold text-slate-400">{context.leadName}</p></div><Link href={context.linkedHref} className="font-black text-[#075985] transition hover:text-[#0c7fff] hover:underline">{context.linkedLabel}</Link><span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs font-black ring-1 ${badge.className}`}><FaIcon icon={badge.icon} fixedWidth />{badge.label}</span><div className="text-xs font-semibold text-slate-500"><p>{formatDate(item.uploadedAt)}</p><p className="mt-1">Expiry: {formatDate(item.expiresAt)}</p></div>{context.pdfHref ? <a href={context.pdfHref} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-1 rounded-full bg-[#061c2e] px-4 py-2 text-xs font-black text-white shadow-sm"><FaIcon icon="external-link" fixedWidth />PDF</a> : <span className="rounded-full bg-slate-100 px-3 py-2 text-center text-xs font-black text-slate-500">{context.pdfLabel}</span>}</div>; })}</div></details>; })}</section> : <section className="rounded-[1.6rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm"><p className="text-lg font-black text-slate-950">No documents match this view</p><p className="mt-2 text-sm font-semibold text-slate-500">Clear filters or generate documents from Quotes and Orders.</p></section>}
    </div>
  );
}
