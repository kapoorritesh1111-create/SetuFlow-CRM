import Link from 'next/link';
import {
  ensureActualOrderLinesAction,
  progressOrderExecution,
  sendOrderDocumentLinkAction,
  signContractAction,
  uploadOrderDocumentAction,
} from '@/features/orders/server';
import { OrderStageAdvanceStrip } from '@/features/orders/components/OrderStageAdvanceStrip';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

type DocRow = {
  id: string;
  file_name: string;
  doc_type: string;
  status: string;
  uploaded_at: string;
  requirement_code: string | null;
};

type BlockerItem = {
  code: string;
  title: string;
  doc_type?: string;
};

type CanonicalOrderSnapshot = {
  id: string;
  source_quote_id: string | null;
  legacy_contract_id: string | null;
  order_lifecycle_status: string | null;
  payment_status: string | null;
  fulfillment_status: string | null;
  dispatch_status: string | null;
};

type StageKey = 'draft' | 'confirmed' | 'ready' | 'released' | 'dispatched' | 'completed';

const STAGE_META: Record<StageKey, { action: string }> = {
  draft: { action: 'Confirm Order' },
  confirmed: { action: 'Mark Docs Ready' },
  ready: { action: 'Release Dispatch' },
  released: { action: 'Mark Shipped' },
  dispatched: { action: 'Mark Delivered' },
  completed: { action: '' },
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function humanize(v: string | null | undefined) {
  return String(v ?? 'pending').split(/[_\s-]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

export async function OrderDetailPanel({
  quoteId,
  leadId,
  contractId,
  orderId,
  orderLifecycleStatus,
  paymentStatus,
  fulfillmentStatus,
  dispatchStatus,
  companyName,
  executionState,
  executionBlockers,
  canAdvance,
  nextExecutionState,
  documents,
  docBlockers,
  docOk,
  pricingBasisLabel,
  currency,
  dealValue,
  updatedAt,
  contractSignedAt,
  commercialLockState,
}: {
  quoteId: string;
  leadId: string;
  contractId: string | null;
  orderId?: string | null;
  orderLifecycleStatus?: string | null;
  paymentStatus?: string | null;
  fulfillmentStatus?: string | null;
  dispatchStatus?: string | null;
  companyName: string;
  executionState: string;
  executionBlockers: string[];
  canAdvance: boolean;
  nextExecutionState: string | null;
  documents: DocRow[];
  docBlockers: BlockerItem[];
  docOk: BlockerItem[];
  pricingBasisLabel: string;
  currency: string | null;
  dealValue: number | null;
  updatedAt: string;
  contractSignedAt?: string | null;
  commercialLockState?: string | null;
}) {
  let canonicalOrder: CanonicalOrderSnapshot | null = orderId ? {
    id: orderId,
    source_quote_id: quoteId,
    legacy_contract_id: contractId,
    order_lifecycle_status: orderLifecycleStatus ?? null,
    payment_status: paymentStatus ?? null,
    fulfillment_status: fulfillmentStatus ?? null,
    dispatch_status: dispatchStatus ?? null,
  } : null;

  if (!canonicalOrder) {
    try {
      const workspace = await getWorkspaceAccess();
      if (workspace.organization) {
        const db = (await createClient()) as any;
        const { data: byQuote } = await db
          .from('orders')
          .select('id, source_quote_id, legacy_contract_id, order_lifecycle_status, payment_status, fulfillment_status, dispatch_status')
          .eq('organization_id', workspace.organization.id)
          .eq('source_quote_id', quoteId)
          .maybeSingle();
        canonicalOrder = byQuote as CanonicalOrderSnapshot | null;

        if (!canonicalOrder && contractId) {
          const { data: byContract } = await db
            .from('orders')
            .select('id, source_quote_id, legacy_contract_id, order_lifecycle_status, payment_status, fulfillment_status, dispatch_status')
            .eq('organization_id', workspace.organization.id)
            .eq('legacy_contract_id', contractId)
            .maybeSingle();
          canonicalOrder = byContract as CanonicalOrderSnapshot | null;
        }
      }
    } catch {
      canonicalOrder = null;
    }
  }

  const canonicalStage = canonicalOrder?.order_lifecycle_status ?? orderLifecycleStatus ?? executionState;
  const isComplete = executionState === 'completed' || canonicalStage === 'completed';
  const currentMeta = STAGE_META[executionState as StageKey] ?? STAGE_META.draft;
  const isBlocked = executionBlockers.length > 0 || !canAdvance;
  const isSigned = Boolean(contractSignedAt) || ['signed', 'active', 'completed'].includes(String(executionState).toLowerCase());
  const isLocked = ['accepted_locked', 'contract_locked', 'locked'].includes(String(commercialLockState ?? '').toLowerCase());
  const documentKitAnchor = `order-doc-kit-${contractId ?? quoteId}`;
  const orderPdfHref = contractId ? `/api/orders/${contractId}/order-confirmation/pdf` : `#${documentKitAnchor}`;
  const invoicePdfHref = contractId ? `/api/orders/${contractId}/invoice/pdf` : `#${documentKitAnchor}`;

  const pill = (text: string, tone: 'green' | 'blue' | 'slate' | 'amber' | 'red' = 'slate') => {
    const styles = {
      green: { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' },
      blue: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
      amber: { bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
      red: { bg: '#fff1f2', border: '#fecaca', color: '#be123c' },
      slate: { bg: '#f8fafc', border: '#dbe7f3', color: '#475569' },
    }[tone];
    return <span style={{ padding: '4px 9px', borderRadius: '999px', border: `1px solid ${styles.border}`, background: styles.bg, color: styles.color, fontSize: '10px', fontWeight: 800, whiteSpace: 'nowrap' }}>{text}</span>;
  };

  const buttonStyle = (tone: 'primary' | 'blue' | 'white' | 'green' = 'white') => {
    const styles = {
      primary: { bg: '#0b2e4a', color: 'white', border: '#0b2e4a' },
      green: { bg: '#059669', color: 'white', border: '#059669' },
      blue: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
      white: { bg: 'white', color: '#334155', border: '#dbe7f3' },
    }[tone];
    return {
      padding: '8px 13px',
      borderRadius: '999px',
      background: styles.bg,
      color: styles.color,
      border: `1px solid ${styles.border}`,
      fontSize: '11px',
      fontWeight: 800,
      textDecoration: 'none',
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
    };
  };

  const sendButtonStyle = { ...buttonStyle('white'), padding: '7px 11px', fontSize: '10px' };

  return (
    <div style={{ borderTop: '1px solid #dbe7f3', background: 'white', padding: '0' }}>
      <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#0c7fff', marginBottom: '3px' }}>Order detail</div>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0b2e4a' }}>{companyName}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Updated {fmt(updatedAt)} · {pricingBasisLabel} · {currency ?? 'USD'} {dealValue != null ? Number(dealValue).toLocaleString() : '—'}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href={`${PRODUCT_ROUTES.app.quotes}?quoteId=${quoteId}`} style={buttonStyle('white')}>View quote</Link>
          <Link href={`${PRODUCT_ROUTES.app.leads}?leadId=${leadId}&view=cc`} style={buttonStyle('primary')}>Lead record →</Link>
          <Link href={`${PRODUCT_ROUTES.app.orders}?mode=buyers`} style={buttonStyle('white')}>Back to queue</Link>
        </div>
      </div>

      <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', background: '#f8fafc' }}>
        {isComplete ? (
          pill('Order delivered', 'green')
        ) : contractId && !isBlocked && nextExecutionState ? (
          <form action={progressOrderExecution}>
            <input type="hidden" name="contract_id" value={contractId} />
            <input type="hidden" name="next_state" value={nextExecutionState} />
            <button type="submit" style={buttonStyle('green')}>{currentMeta.action}</button>
          </form>
        ) : contractId ? (
          pill('Blocked — resolve docs', 'red')
        ) : (
          pill('Contract needed', 'amber')
        )}
        <form action={ensureActualOrderLinesAction}>
          <input type="hidden" name="quote_id" value={quoteId} />
          <input type="hidden" name="lead_id" value={leadId} />
          <input type="hidden" name="contract_id" value={contractId ?? ''} />
          <button type="submit" style={buttonStyle('primary')}>Prepare actual lines</button>
        </form>
        <a href={orderPdfHref} target={contractId ? '_blank' : undefined} rel={contractId ? 'noreferrer' : undefined} style={buttonStyle('blue')}>Generate order PDF</a>
        <a href={invoicePdfHref} target={contractId ? '_blank' : undefined} rel={contractId ? 'noreferrer' : undefined} style={buttonStyle('blue')}>Generate invoice</a>
        <a href="#order-upload-document" style={buttonStyle('white')}>Attach evidence</a>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {canonicalOrder ? pill(`Order ${humanize(canonicalStage)}`, 'blue') : pill('Canonical order pending', 'amber')}
          {pill(`Payment ${humanize(canonicalOrder?.payment_status ?? paymentStatus)}`, canonicalOrder?.payment_status === 'paid' ? 'green' : canonicalOrder?.payment_status === 'partial' ? 'blue' : 'slate')}
          {pill(`Fulfillment ${humanize(canonicalOrder?.fulfillment_status ?? fulfillmentStatus)}`, canonicalOrder?.fulfillment_status === 'fulfilled' ? 'green' : 'slate')}
          {pill(`Dispatch ${humanize(canonicalOrder?.dispatch_status ?? dispatchStatus)}`, canonicalOrder?.dispatch_status === 'delivered' ? 'green' : canonicalOrder?.dispatch_status === 'dispatched' ? 'blue' : 'slate')}
          {pill(isLocked ? 'Commercial locked' : 'Commercial pending', isLocked ? 'green' : 'amber')}
          {pill(`${docOk.length}/${docOk.length + docBlockers.length} docs`, docBlockers.length ? 'amber' : 'green')}
        </div>
      </div>

      <OrderStageAdvanceStrip orderId={canonicalOrder?.id ?? orderId ?? null} sourceQuoteId={quoteId} contractId={contractId} currentStage={canonicalStage} />

      {contractId && !isComplete && !isSigned && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
          <form action={signContractAction} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input type="hidden" name="contract_id" value={contractId} />
            <button type="submit" style={buttonStyle('primary')}>Mark contract signed</button>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Locks commercial snapshot and enables order progression.</span>
          </form>
        </div>
      )}

      {contractId && !isComplete && isSigned && (
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #e2e8f0', background: '#ecfdf5', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', color: '#059669', fontWeight: 900 }}>✓</span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#047857' }}>Contract signed</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{contractSignedAt ? `Signed ${fmt(contractSignedAt)}` : 'Commercial lock active'}</span>
        </div>
      )}

      <div id={documentKitAnchor} style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '9px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8' }}>Document readiness</div>
          {pill('Quote → Actual lines → Lifecycle → Evidence', 'blue')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '8px' }}>
          <div style={{ border: '1px solid #dbe7f3', background: '#f8fafc', borderRadius: '12px', padding: '10px' }}>
            <strong style={{ fontSize: '11px', color: '#0b2e4a' }}>Quote PDF</strong>
            <div style={{ fontSize: '10px', lineHeight: 1.35, color: '#64748b', minHeight: '28px' }}>Commercial source document.</div>
            <Link href={`${PRODUCT_ROUTES.app.quotes}?quoteId=${quoteId}`} style={{ ...buttonStyle('blue'), display: 'inline-flex', marginTop: '8px', padding: '6px 10px', fontSize: '10px' }}>Open quote</Link>
          </div>
          <div style={{ border: '1px solid #dbe7f3', background: '#f8fafc', borderRadius: '12px', padding: '10px' }}>
            <strong style={{ fontSize: '11px', color: '#0b2e4a' }}>Order confirmation</strong>
            <div style={{ fontSize: '10px', lineHeight: 1.35, color: '#64748b', minHeight: '28px' }}>{contractId ? 'Ready to generate.' : 'Contract needed.'}</div>
            <a href={orderPdfHref} target={contractId ? '_blank' : undefined} rel={contractId ? 'noreferrer' : undefined} style={{ ...buttonStyle('blue'), display: 'inline-flex', marginTop: '8px', padding: '6px 10px', fontSize: '10px' }}>Generate order PDF</a>
          </div>
          <div style={{ border: '1px solid #dbe7f3', background: '#f8fafc', borderRadius: '12px', padding: '10px' }}>
            <strong style={{ fontSize: '11px', color: '#0b2e4a' }}>Invoice</strong>
            <div style={{ fontSize: '10px', lineHeight: 1.35, color: '#64748b', minHeight: '28px' }}>{contractId ? 'Ready to generate.' : 'Contract needed.'}</div>
            <a href={invoicePdfHref} target={contractId ? '_blank' : undefined} rel={contractId ? 'noreferrer' : undefined} style={{ ...buttonStyle('blue'), display: 'inline-flex', marginTop: '8px', padding: '6px 10px', fontSize: '10px' }}>Generate invoice</a>
          </div>
        </div>
      </div>

      {contractId && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Send secure links</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: '10px' }}>
            {(['order-confirmation', 'invoice'] as const).map((kind) => (
              <form key={kind} action={sendOrderDocumentLinkAction} style={{ border: '1px solid #dbe7f3', borderRadius: '12px', padding: '10px', background: '#f8fafc', display: 'grid', gap: '8px' }}>
                <input type="hidden" name="contract_id" value={contractId} />
                <input type="hidden" name="document_kind" value={kind} />
                <strong style={{ fontSize: '11px', color: '#0b2e4a' }}>{kind === 'invoice' ? 'Send invoice' : 'Send order PDF'}</strong>
                <input name="recipient" placeholder="Additional email or WhatsApp" style={{ width: '100%', padding: '8px 10px', borderRadius: '9px', border: '1px solid #dbe7f3', fontSize: '11px' }} />
                <input name="note" placeholder="Optional note" style={{ width: '100%', padding: '8px 10px', borderRadius: '9px', border: '1px solid #dbe7f3', fontSize: '11px' }} />
                <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                  <button name="channel" value="email" type="submit" style={sendButtonStyle}>Email link</button>
                  <button name="channel" value="whatsapp" type="submit" style={sendButtonStyle}>WhatsApp link</button>
                </div>
              </form>
            ))}
          </div>
        </div>
      )}

      {contractId && (
        <div id="order-upload-document" style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Attach final evidence</div>
          <form action={uploadOrderDocumentAction} encType="multipart/form-data" style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) minmax(180px,1fr) minmax(260px,2fr) auto', gap: '8px', alignItems: 'center' }}>
            <input type="hidden" name="contract_id" value={contractId} />
            <select name="doc_type" defaultValue={docBlockers[0]?.doc_type ?? 'order_confirmation'} style={{ width: '100%', padding: '8px 10px', borderRadius: '9px', border: '1px solid #dbe7f3', background: 'white', fontSize: '12px', color: '#1e293b', fontWeight: 700 }}>
              <option value="order_confirmation">Order confirmation</option>
              <option value="invoice">Invoice</option>
              <option value="packing_list">Packing list</option>
              <option value="bill_of_lading">Bill of Lading</option>
              <option value="certificate_of_origin">Certificate of Origin</option>
              <option value="phytosanitary">Phytosanitary certificate</option>
              <option value="lab_report">Lab / quality report</option>
              <option value="compliance_doc">Compliance doc</option>
              <option value="other">Other</option>
            </select>
            <select name="requirement_code" defaultValue={docBlockers[0]?.code ?? ''} style={{ width: '100%', padding: '8px 10px', borderRadius: '9px', border: '1px solid #dbe7f3', background: 'white', fontSize: '12px', color: '#1e293b', fontWeight: 700 }}>
              <option value="">General order document</option>
              {docBlockers.map((item) => <option key={item.code} value={item.code}>{item.title}</option>)}
            </select>
            <input required type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" style={{ width: '100%', padding: '7px 10px', borderRadius: '9px', border: '1px solid #dbe7f3', background: 'white', fontSize: '11px', color: '#334155' }} />
            <button type="submit" style={buttonStyle('primary')}>Attach evidence</button>
          </form>
        </div>
      )}

      <div style={{ padding: '12px 20px', background: 'white' }}>
        <details open={docBlockers.length > 0}>
          <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '12px', fontWeight: 900, color: '#0b2e4a' }}>
            <span>Documents and evidence — {documents.length} files</span>
            <span style={{ color: '#64748b', fontSize: '11px' }}>{docBlockers.length ? `${docBlockers.length} missing` : 'Complete'}</span>
          </summary>
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {docOk.map((item) => (
              <div key={item.code} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: '10px', border: '1px solid #a7f3d0', background: '#ecfdf5' }}>
                <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                <span style={{ flex: 1, fontSize: '12px', fontWeight: 700, color: '#065f46' }}>{item.title}</span>
                <span style={{ fontSize: '10px', color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>Uploaded</span>
              </div>
            ))}
            {docBlockers.map((item) => (
              <div key={item.code} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: '10px', border: '1px solid #fecaca', background: '#fff1f2' }}>
                <span style={{ color: '#dc2626', fontWeight: 800 }}>✕</span>
                <span style={{ flex: 1, fontSize: '12px', fontWeight: 700, color: '#9f1239' }}>{item.title}</span>
                <span style={{ fontSize: '10px', color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>Missing</span>
              </div>
            ))}
            {documents.slice(0, 6).map((doc) => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                <span style={{ fontSize: '14px' }}>📄</span>
                <span style={{ flex: 1, fontSize: '11px', fontWeight: 700, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</span>
                <span style={{ fontSize: '10px', color: '#64748b' }}>{doc.doc_type.replace(/_/g, ' ')}</span>
                <span style={{ fontSize: '10px', color: '#94a3b8' }}>{fmt(doc.uploaded_at)}</span>
              </div>
            ))}
            {docOk.length === 0 && docBlockers.length === 0 && documents.length === 0 && (
              <div style={{ padding: '12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>No document requirements configured for this order yet.</div>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
