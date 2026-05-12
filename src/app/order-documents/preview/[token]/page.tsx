import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';

function titleCase(value: string | null | undefined) {
  return String(value ?? '').split(/[\s_-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'Order Document';
}

function fmtDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function documentTitle(type: string | null | undefined) {
  const value = String(type ?? '').toLowerCase();
  if (value === 'order_confirmation') return 'Order Confirmation';
  if (value === 'proforma_invoice') return 'Proforma Invoice';
  if (value === 'dispatch_invoice') return 'Dispatch Invoice';
  if (value === 'packing_sheet') return 'Packing Sheet';
  if (value === 'freight_request') return 'Freight Request';
  return titleCase(type);
}

export default async function OrderDocumentPreviewPage({ params }: { params: { token: string } }) {
  if (!hasSupabaseEnv) notFound();
  const token = String(params.token ?? '').trim();
  if (!token) notFound();

  const db = (await createClient()) as any;
  const { data: send } = await db
    .from('order_document_sends')
    .select('id, organization_id, order_id, order_document_id, document_type, channel, recipient, recipient_role, note, status, share_url, sent_at, opened_at, open_count, metadata, order_documents(id, version_no, status, approved_at, source_snapshot), orders(id, order_number, current_stage, source_quote_id, source_quote_version_id, currency, total_order_value, leads(company_name, contact_name, country))')
    .eq('share_token', token)
    .maybeSingle();

  if (!send?.id) notFound();

  const now = new Date().toISOString();
  await db.from('order_document_sends').update({
    opened_at: send.opened_at ?? now,
    open_count: Number(send.open_count ?? 0) + 1,
    updated_at: now,
  }).eq('id', send.id).then(() => null);

  await db.from('order_documents').update({
    opened_at: send.order_documents?.opened_at ?? now,
    updated_at: now,
  }).eq('id', send.order_document_id).then(() => null);

  const lead = send.orders?.leads;
  const title = documentTitle(send.document_type);

  return <main className="odx-page">
    <section className="odx-card">
      <header className="odx-head">
        <div>
          <small>SETU Flow tracked document preview</small>
          <h1>{title}</h1>
          <p>This is a secure tracked preview link. It records open activity for this specific send.</p>
        </div>
        <span>{titleCase(send.status)}</span>
      </header>

      <section className="odx-grid">
        <div><small>Buyer / Company</small><strong>{lead?.company_name ?? 'Buyer pending'}</strong><em>{lead?.contact_name ?? lead?.country ?? 'Contact pending'}</em></div>
        <div><small>Order</small><strong>{send.orders?.order_number ?? send.order_id}</strong><em>{titleCase(send.orders?.current_stage)}</em></div>
        <div><small>Sent</small><strong>{fmtDate(send.sent_at)}</strong><em>{send.channel}{send.recipient ? ` · ${send.recipient}` : ''}</em></div>
        <div><small>Opened</small><strong>{fmtDate(send.opened_at ?? now)}</strong><em>{Number(send.open_count ?? 0) + 1} opens</em></div>
      </section>

      <section className="odx-preview">
        <small>Preview foundation</small>
        <h2>{title} v{send.order_documents?.version_no ?? 1}</h2>
        <p>The final buyer-facing PDF/body renderer will plug into this preview route. For now, this page verifies the tracked link, document lineage, order context, and open tracking workflow.</p>
        <dl>
          <div><dt>Order document ID</dt><dd>{send.order_document_id}</dd></div>
          <div><dt>Source quote</dt><dd>{send.orders?.source_quote_id ?? send.metadata?.source_quote_id ?? '—'}</dd></div>
          <div><dt>Source quote version</dt><dd>{send.orders?.source_quote_version_id ?? send.metadata?.source_quote_version_id ?? '—'}</dd></div>
          <div><dt>Recipient role</dt><dd>{send.recipient_role || 'Not specified'}</dd></div>
          <div><dt>Note</dt><dd>{send.note || '—'}</dd></div>
        </dl>
      </section>
    </section>
    <style>{styles}</style>
  </main>;
}

const styles = `.odx-page{min-height:100vh;background:#eef4f8;padding:32px;color:#0f172a;font-family:Inter,ui-sans-serif,system-ui}.odx-card{max-width:960px;margin:0 auto;background:white;border:1px solid #dbe7f3;border-radius:28px;box-shadow:0 18px 44px #0f172a14;overflow:hidden}.odx-head{display:flex;justify-content:space-between;gap:18px;align-items:start;padding:24px 28px;border-bottom:1px solid #e2e8f0}.odx-head small,.odx-preview small,.odx-grid small{color:#0c7fff;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.odx-head h1,.odx-preview h2{margin:4px 0 0;color:#082f49;letter-spacing:-.04em}.odx-head p,.odx-preview p{color:#64748b;font-size:13px;line-height:1.55;margin:6px 0 0}.odx-head span{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;border-radius:999px;padding:8px 12px;font-size:12px;font-weight:900}.odx-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:18px 28px;background:#f8fafc;border-bottom:1px solid #e2e8f0}.odx-grid div{background:white;border:1px solid #e2e8f0;border-radius:16px;padding:12px}.odx-grid strong{display:block;color:#082f49;margin-top:6px}.odx-grid em{display:block;color:#64748b;font-size:11px;font-style:normal;margin-top:4px}.odx-preview{padding:28px}.odx-preview dl{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:18px}.odx-preview div{border:1px solid #e2e8f0;background:#f8fafc;border-radius:14px;padding:12px}.odx-preview dt{font-size:10px;color:#94a3b8;font-weight:900;text-transform:uppercase}.odx-preview dd{margin:4px 0 0;color:#334155;font-size:12px;word-break:break-all}@media(max-width:760px){.odx-page{padding:14px}.odx-head,.odx-grid,.odx-preview dl{display:grid;grid-template-columns:1fr}.odx-grid{padding:14px}.odx-preview{padding:18px}}`;
