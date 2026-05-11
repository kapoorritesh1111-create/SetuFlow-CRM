/**
 * OrderDetailPanel — compact execution panel rendered inline within the Orders Desk
 * card when ?openOrderId=<quoteId> is present in the URL.
 *
 * Wires progressOrderExecution (state advance) and uploadOrderDocumentAction
 * (doc upload) as native HTML form actions so they work as Server Actions
 * without any client JS hydration.
 */

import Link from 'next/link';
import { progressOrderExecution, signContractAction, uploadOrderDocumentAction } from '@/features/orders/server/actions';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

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

type StageKey = 'draft' | 'confirmed' | 'ready' | 'released' | 'dispatched' | 'completed';

const STAGE_ORDER: StageKey[] = ['draft', 'confirmed', 'ready', 'released', 'dispatched', 'completed'];

const STAGE_META: Record<StageKey, { label: string; action: string; nextLabel: string }> = {
  draft:      { label: 'Quote Accepted',   action: 'Confirm Order',    nextLabel: 'confirmed' },
  confirmed:  { label: 'Order Confirmed',  action: 'Mark Docs Ready',  nextLabel: 'ready' },
  ready:      { label: 'Docs Ready',       action: 'Release Dispatch', nextLabel: 'released' },
  released:   { label: 'Dispatch Ready',   action: 'Mark Shipped',     nextLabel: 'dispatched' },
  dispatched: { label: 'Shipped',          action: 'Mark Delivered',   nextLabel: 'completed' },
  completed:  { label: 'Delivered',        action: '',                 nextLabel: '' },
};

const DOCUMENT_WORKFLOW = [
  {
    key: 'quote',
    label: 'Quote PDF',
    status: 'Ready',
    actionLabel: 'Open quote',
    description: 'Commercial source document.',
  },
  {
    key: 'order',
    label: 'Order confirmation',
    status: 'Coming next',
    actionLabel: 'Generate order PDF',
    description: 'From signed contract and locked order lines.',
  },
  {
    key: 'invoice',
    label: 'Invoice',
    status: 'Coming next',
    actionLabel: 'Generate invoice',
    description: 'After release or dispatch approval.',
  },
];

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function OrderDetailPanel({
  quoteId,
  leadId,
  contractId,
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
  const currentIdx = STAGE_ORDER.indexOf(executionState as StageKey);
  const isComplete = executionState === 'completed';
  const currentMeta = STAGE_META[executionState as StageKey] ?? STAGE_META['draft'];
  const isBlocked = executionBlockers.length > 0 || !canAdvance;
  const isSigned = Boolean(contractSignedAt) || ['signed', 'active', 'completed'].includes(String(executionState).toLowerCase());
  const isLocked = ['accepted_locked', 'contract_locked', 'locked'].includes(String(commercialLockState ?? '').toLowerCase());
  const documentKitAnchor = `order-doc-kit-${contractId ?? quoteId}`;

  const pill = (text: string, tone: 'green' | 'blue' | 'slate' | 'amber' = 'slate') => {
    const styles = {
      green: { bg: '#ecfdf5', border: '#a7f3d0', color: '#047857' },
      blue: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
      amber: { bg: '#fffbeb', border: '#fde68a', color: '#92400e' },
      slate: { bg: '#f8fafc', border: '#dbe7f3', color: '#475569' },
    }[tone];
    return (
      <span style={{ padding: '4px 9px', borderRadius: '999px', border: `1px solid ${styles.border}`, background: styles.bg, color: styles.color, fontSize: '10px', fontWeight: 800, whiteSpace: 'nowrap' }}>{text}</span>
    );
  };

  return (
    <div style={{ borderTop: '1px solid #dbe7f3', background: 'white', padding: '0' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#0c7fff', marginBottom: '3px' }}>Order detail</div>
          <div style={{ fontSize: '16px', fontWeight: 800, color: '#0b2e4a' }}>{companyName}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>Updated {fmt(updatedAt)} · {pricingBasisLabel} · {currency ?? 'USD'} {dealValue != null ? Number(dealValue).toLocaleString() : '—'}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <Link href={`${PRODUCT_ROUTES.app.quotes}?quoteId=${quoteId}`} style={{ padding: '7px 13px', borderRadius: '999px', border: '1px solid #dbe7f3', background: 'white', fontSize: '11px', fontWeight: 700, color: '#334155', textDecoration: 'none' }}>View quote</Link>
          <Link href={`${PRODUCT_ROUTES.app.leads}?leadId=${leadId}&view=cc`} style={{ padding: '7px 13px', borderRadius: '999px', border: '1px solid #0b2e4a', background: '#0b2e4a', fontSize: '11px', fontWeight: 800, color: 'white', textDecoration: 'none' }}>Lead record →</Link>
          <Link href={`${PRODUCT_ROUTES.app.orders}?mode=buyers`} style={{ padding: '7px 13px', borderRadius: '999px', border: '1px solid #dbe7f3', background: '#f8fafc', fontSize: '11px', fontWeight: 700, color: '#475569', textDecoration: 'none' }}>Back to queue</Link>
        </div>
      </div>

      {/* Stage timeline */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
          {STAGE_ORDER.map((stage, idx) => {
            const stageIdx = STAGE_ORDER.indexOf(stage);
            const isDone = stageIdx < currentIdx;
            const isCurrent = stageIdx === currentIdx;
            const isBlk = isCurrent && executionBlockers.length > 0;
            const tone = isDone ? { bg: '#ecfdf5', border: '#a7f3d0', color: '#059669' } : isCurrent ? (isBlk ? { bg: '#fff1f2', border: '#fecaca', color: '#dc2626' } : { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' }) : { bg: '#f8fafc', border: '#e2e8f0', color: '#94a3b8' };
            return (
              <div key={stage} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 12px', borderRadius: '10px', background: tone.bg, border: `1px solid ${tone.border}`, minWidth: '104px' }}>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: tone.color }} />
                  <div style={{ fontSize: '9px', fontWeight: 800, textAlign: 'center', letterSpacing: '.04em', color: tone.color, whiteSpace: 'pre-line' }}>{STAGE_META[stage].label}</div>
                  {isCurrent && <div style={{ fontSize: '8px', color: tone.color, fontWeight: 700 }}>{isBlk ? 'Blocked' : 'Active'}</div>}
                  {isDone && <div style={{ fontSize: '8px', color: '#059669', fontWeight: 700 }}>Done</div>}
                </div>
                {idx < STAGE_ORDER.length - 1 && <div style={{ width: '24px', height: '2px', background: isDone ? '#a7f3d0' : '#e2e8f0', flexShrink: 0 }} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ padding: '10px 20px', borderRight: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: '3px' }}>Commercial lock</div>
          {pill(isLocked ? 'Locked' : 'Pending', isLocked ? 'green' : 'amber')}
        </div>
        <div style={{ padding: '10px 20px', borderRight: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: '3px' }}>Documents</div>
          {pill(`${docOk.length}/${docOk.length + docBlockers.length} complete`, docBlockers.length ? 'amber' : 'green')}
        </div>
        <div style={{ padding: '10px 20px' }}>
          <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', letterSpacing: '.13em', textTransform: 'uppercase', marginBottom: '3px' }}>Payment status</div>
          {pill('Tracking pending', 'slate')}
        </div>
      </div>

      {/* Compact primary actions */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', background: '#f8fafc' }}>
        {isComplete ? (
          <span style={{ padding: '9px 14px', borderRadius: '999px', background: '#ecfdf5', color: '#047857', fontSize: '12px', fontWeight: 800, border: '1px solid #a7f3d0' }}>Order delivered</span>
        ) : contractId && !isBlocked && nextExecutionState ? (
          <form action={progressOrderExecution}>
            <input type="hidden" name="contract_id" value={contractId} />
            <input type="hidden" name="next_state" value={nextExecutionState} />
            <button type="submit" style={{ padding: '9px 15px', borderRadius: '999px', background: '#059669', color: 'white', fontSize: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}>{currentMeta.action}</button>
          </form>
        ) : contractId ? (
          <span style={{ padding: '9px 14px', borderRadius: '999px', background: '#fff1f2', color: '#be123c', fontSize: '12px', fontWeight: 800, border: '1px solid #fecaca' }}>Blocked — resolve docs</span>
        ) : (
          <span style={{ padding: '9px 14px', borderRadius: '999px', background: '#fffbeb', color: '#92400e', fontSize: '12px', fontWeight: 800, border: '1px solid #fde68a' }}>Contract needed</span>
        )}

        <a href={`#${documentKitAnchor}`} style={{ padding: '9px 15px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '12px', fontWeight: 800, textDecoration: 'none' }}>Generate order PDF</a>
        <a href={`#${documentKitAnchor}`} style={{ padding: '9px 15px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '12px', fontWeight: 800, textDecoration: 'none' }}>Generate invoice</a>
        <a href="#order-upload-document" style={{ padding: '9px 15px', borderRadius: '999px', background: 'white', color: '#334155', border: '1px solid #dbe7f3', fontSize: '12px', fontWeight: 800, textDecoration: 'none' }}>Attach evidence</a>
      </div>

      {/* Contract signing */}
      {contractId && !isComplete && !isSigned && (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
          <form action={signContractAction} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <input type="hidden" name="contract_id" value={contractId} />
            <button type="submit" style={{ padding: '9px 15px', borderRadius: '999px', background: '#0b2e4a', color: 'white', fontSize: '12px', fontWeight: 800, border: 'none', cursor: 'pointer' }}>Mark contract signed</button>
            <span style={{ fontSize: '11px', color: '#64748b' }}>Locks commercial snapshot and enables order progression.</span>
          </form>
        </div>
      )}

      {contractId && !isComplete && isSigned && (
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#ecfdf5', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', color: '#059669', fontWeight: 900 }}>✓</span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: '#047857' }}>Contract signed</span>
          <span style={{ fontSize: '11px', color: '#64748b' }}>{contractSignedAt ? `Signed ${fmt(contractSignedAt)}` : 'Commercial lock active'}</span>
        </div>
      )}

      {/* Document readiness */}
      <div id={documentKitAnchor} style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8' }}>Document readiness</div>
          {pill('Quote → Order → Invoice', 'blue')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: '10px' }}>
          {DOCUMENT_WORKFLOW.map((item, index) => (
            <div key={item.key} style={{ border: '1px solid #dbe7f3', background: '#f8fafc', borderRadius: '14px', padding: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '7px' }}>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#0b2e4a' }}>{index + 1}. {item.label}</div>
                {pill(item.status, item.key === 'quote' ? 'green' : 'slate')}
              </div>
              <div style={{ fontSize: '11px', lineHeight: 1.45, color: '#64748b', minHeight: '32px' }}>{item.description}</div>
              {item.key === 'quote' ? (
                <Link href={`${PRODUCT_ROUTES.app.quotes}?quoteId=${quoteId}`} style={{ display: 'inline-flex', marginTop: '9px', padding: '7px 11px', borderRadius: '999px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '10px', fontWeight: 900, textDecoration: 'none' }}>{item.actionLabel}</Link>
              ) : (
                <span style={{ display: 'inline-flex', marginTop: '9px', padding: '7px 11px', borderRadius: '999px', background: 'white', color: '#64748b', border: '1px solid #dbe7f3', fontSize: '10px', fontWeight: 900 }}>{item.actionLabel} · coming next</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Upload */}
      {contractId && (
        <div id="order-upload-document" style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
          <div style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '9px' }}>Attach final evidence</div>
          <form action={uploadOrderDocumentAction} encType="multipart/form-data" style={{ display: 'grid', gridTemplateColumns: 'minmax(180px,1fr) minmax(180px,1fr) minmax(260px,2fr) auto', gap: '8px', alignItems: 'center' }}>
            <input type="hidden" name="contract_id" value={contractId} />
            <select name="doc_type" defaultValue={docBlockers[0]?.doc_type ?? 'order_confirmation'} style={{ width: '100%', padding: '9px 10px', borderRadius: '9px', border: '1px solid #dbe7f3', background: 'white', fontSize: '12px', color: '#1e293b', fontWeight: 700 }}>
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
            <select name="requirement_code" defaultValue={docBlockers[0]?.code ?? ''} style={{ width: '100%', padding: '9px 10px', borderRadius: '9px', border: '1px solid #dbe7f3', background: 'white', fontSize: '12px', color: '#1e293b', fontWeight: 700 }}>
              <option value="">General order document</option>
              {docBlockers.map((item) => <option key={item.code} value={item.code}>{item.title}</option>)}
            </select>
            <input required type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" style={{ width: '100%', padding: '8px 10px', borderRadius: '9px', border: '1px solid #dbe7f3', background: 'white', fontSize: '11px', color: '#334155' }} />
            <button type="submit" style={{ padding: '9px 15px', borderRadius: '999px', background: '#0b2e4a', color: 'white', fontSize: '12px', fontWeight: 800, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>Attach evidence</button>
          </form>
        </div>
      )}

      {/* Documents */}
      <div style={{ padding: '14px 20px', background: 'white' }}>
        <details open={docBlockers.length > 0}>
          <summary style={{ cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', fontSize: '12px', fontWeight: 900, color: '#0b2e4a' }}>
            <span>Documents and evidence — {documents.length} files</span>
            <span style={{ color: '#64748b', fontSize: '11px' }}>{docBlockers.length ? `${docBlockers.length} missing` : 'Complete'}</span>
          </summary>
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {docOk.map((item) => (
              <div key={item.code} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '10px', border: '1px solid #a7f3d0', background: '#ecfdf5' }}>
                <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
                <span style={{ flex: 1, fontSize: '12px', fontWeight: 700, color: '#065f46' }}>{item.title}</span>
                <span style={{ fontSize: '10px', color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>Uploaded</span>
              </div>
            ))}
            {docBlockers.map((item) => (
              <div key={item.code} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '10px', border: '1px solid #fecaca', background: '#fff1f2' }}>
                <span style={{ color: '#dc2626', fontWeight: 800 }}>✕</span>
                <span style={{ flex: 1, fontSize: '12px', fontWeight: 700, color: '#9f1239' }}>{item.title}</span>
                <span style={{ fontSize: '10px', color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '999px', fontWeight: 800 }}>Missing</span>
              </div>
            ))}
            {documents.slice(0, 6).map((doc) => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
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
