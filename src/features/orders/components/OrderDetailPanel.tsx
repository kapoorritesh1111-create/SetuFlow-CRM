/**
 * OrderDetailPanel — full execution panel rendered inline within the Orders Desk
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

  return (
    <div style={{
      borderTop: '2px solid #e2e8f0',
      background: 'linear-gradient(180deg,#f8fafc 0%,white 100%)',
      padding: '0',
    }}>

      {/* ── PANEL HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: '#0c7fff', marginBottom: '2px' }}>Order Detail</div>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#0b2e4a' }}>{companyName}</div>
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Updated {fmt(updatedAt)} · {pricingBasisLabel} · {currency ?? 'USD'} {dealValue != null ? Number(dealValue).toLocaleString() : '—'}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Link href={`${PRODUCT_ROUTES.app.orders}?mode=buyers`} style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #e2e8f0', background: 'white', fontSize: '11px', fontWeight: 600, color: '#475569', textDecoration: 'none' }}>← Back to queue</Link>
          <Link href={`${PRODUCT_ROUTES.app.quotes}?quoteId=${quoteId}`} style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #e2e8f0', background: 'white', fontSize: '11px', fontWeight: 600, color: '#475569', textDecoration: 'none' }}>View quote</Link>
          <Link href={`${PRODUCT_ROUTES.app.leads}?leadId=${leadId}&view=cc`} style={{ padding: '7px 14px', borderRadius: '7px', border: '1px solid #0b2e4a', background: '#0b2e4a', fontSize: '11px', fontWeight: 700, color: 'white', textDecoration: 'none' }}>Lead record →</Link>
        </div>
      </div>

      {/* ── STAGE TIMELINE ───────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '10px' }}>Execution timeline</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
          {STAGE_ORDER.map((stage, idx) => {
            const stageIdx = STAGE_ORDER.indexOf(stage);
            const isDone = stageIdx < currentIdx;
            const isCurrent = stageIdx === currentIdx;
            const isBlk = isCurrent && executionBlockers.length > 0;
            const isUpcoming = stageIdx > currentIdx;
            const dotBg = isDone ? '#059669' : isCurrent ? (isBlk ? '#dc2626' : '#0c7fff') : '#cbd5e1';
            const labelColor = isDone ? '#059669' : isCurrent ? (isBlk ? '#dc2626' : '#0c7fff') : '#94a3b8';
            const bg = isDone ? '#ecfdf5' : isCurrent ? (isBlk ? '#fff1f2' : 'rgba(12,127,255,.08)') : '#f8fafc';
            const border = isDone ? '1px solid #a7f3d0' : isCurrent ? (isBlk ? '1px solid #fecaca' : '1px solid rgba(12,127,255,.25)') : '1px solid #e2e8f0';
            return (
              <div key={stage} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '8px 12px', borderRadius: '8px', background: bg, border, minWidth: '100px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: dotBg, boxShadow: isCurrent && !isBlk ? '0 0 0 3px rgba(12,127,255,.2)' : undefined }} />
                  <div style={{ fontSize: '9px', fontWeight: 700, textAlign: 'center', letterSpacing: '.04em', color: labelColor, whiteSpace: 'pre-line' }}>
                    {STAGE_META[stage].label}
                  </div>
                  {isCurrent && <div style={{ fontSize: '8px', color: isBlk ? '#dc2626' : '#0c7fff', fontWeight: 600 }}>{isBlk ? 'Blocked' : 'Active'}</div>}
                  {isDone && <div style={{ fontSize: '8px', color: '#059669', fontWeight: 600 }}>✓ Done</div>}
                </div>
                {idx < STAGE_ORDER.length - 1 && (
                  <div style={{ width: '24px', height: '2px', background: isDone ? '#a7f3d0' : '#e2e8f0', flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── CONTRACT SIGNING GATE ─────────────────────────────────────────── */}
      {contractId && !isComplete && (
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Contract signing</div>
            {isSigned ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <span style={{ fontSize: '16px' }}>✅</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>Contract signed</div>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>
                    {contractSignedAt ? `Signed ${fmt(contractSignedAt)} · ` : ''}
                    Commercial lock: {isLocked ? 'locked' : 'pending'}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '10px', padding: '10px 14px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>Signed contract required before dispatch</div>
                  <div style={{ fontSize: '11px', color: '#92400e' }}>
                    Marking the contract as signed locks the commercial snapshot and enables order progression to Ready state.
                  </div>
                </div>
                <form action={signContractAction}>
                  <input type="hidden" name="contract_id" value={contractId} />
                  <button
                    type="submit"
                    style={{
                      padding: '10px 20px',
                      borderRadius: '8px',
                      background: '#0b2e4a',
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>✍️</span> Mark Contract Signed
                  </button>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px' }}>
                    Sets signed_at timestamp, locks commercial snapshot, and writes audit event.
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DISPATCH CONTROLS ────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Dispatch controls</div>

          {isComplete ? (
            <div style={{ padding: '14px 16px', borderRadius: '10px', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '18px' }}>✅</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>Order delivered</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>This order has completed all execution stages.</div>
              </div>
            </div>
          ) : contractId ? (
            <div>
              {isBlocked && (
                <div style={{ marginBottom: '10px', padding: '10px 14px', borderRadius: '8px', background: '#fff1f2', border: '1px solid #fecaca' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#9f1239', marginBottom: '4px' }}>Blockers must be resolved first</div>
                  {executionBlockers.slice(0, 3).map((b) => (
                    <div key={b} style={{ fontSize: '11px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⏳</span> {b}
                    </div>
                  ))}
                </div>
              )}
              {!isBlocked && nextExecutionState && (
                <form action={progressOrderExecution}>
                  <input type="hidden" name="contract_id" value={contractId} />
                  <input type="hidden" name="next_state" value={nextExecutionState} />
                  <button
                    type="submit"
                    style={{
                      padding: '11px 22px',
                      borderRadius: '8px',
                      background: '#059669',
                      color: 'white',
                      fontSize: '13px',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <span>→</span> {currentMeta.action}
                  </button>
                  <div style={{ fontSize: '10px', color: '#64748b', marginTop: '6px' }}>
                    Advances execution to <strong>{nextExecutionState}</strong> state and revalidates the order queue.
                  </div>
                </form>
              )}
              {!isBlocked && !nextExecutionState && !isComplete && (
                <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>No advance action available for this state.</div>
              )}
            </div>
          ) : (
            <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a', fontSize: '12px', color: '#92400e' }}>
              No contract linked to this order yet. The order will activate once a contract is created from the sent quote.
            </div>
          )}
        </div>

        {/* ── DOC UPLOAD ─────────────────────────────────────────────────────── */}
        {contractId && (
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px' }}>Upload document</div>
            <form action={uploadOrderDocumentAction} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <input type="hidden" name="contract_id" value={contractId} />
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select
                  name="doc_type"
                  defaultValue={docBlockers[0]?.doc_type ?? 'compliance_doc'}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: '12px', color: '#1e293b' }}
                >
                  <option value="compliance_doc">Compliance doc</option>
                  <option value="invoice">Invoice</option>
                  <option value="packing_list">Packing list</option>
                  <option value="bill_of_lading">Bill of Lading</option>
                  <option value="certificate_of_origin">Certificate of Origin</option>
                  <option value="phytosanitary">Phytosanitary certificate</option>
                  <option value="lab_report">Lab / quality report</option>
                  <option value="other">Other</option>
                </select>
                <select
                  name="requirement_code"
                  defaultValue={docBlockers[0]?.code ?? ''}
                  style={{ flex: 1, padding: '8px 10px', borderRadius: '7px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '12px', color: '#1e293b' }}
                >
                  <option value="">General order document</option>
                  {docBlockers.map((item) => (
                    <option key={item.code} value={item.code}>{item.title}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '7px',
                  border: '2px dashed #cbd5e1',
                  background: '#f8fafc',
                  fontSize: '12px',
                  color: '#64748b',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontWeight: 600,
                }}>
                  <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xlsx" style={{ width: '100%', fontSize: '11px', color: '#334155' }} />
                </label>
                <button
                  type="submit"
                  style={{ padding: '9px 16px', borderRadius: '7px', background: '#0b2e4a', color: 'white', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
                >
                  Upload
                </button>
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>File attaches to this contract; choose a blocker requirement above to satisfy readiness checks.</div>
            </form>
          </div>
        )}
      </div>

      {/* ── DOCUMENTS ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '10px' }}>
          Document posture — {docOk.length + docBlockers.length === 0 ? 'No requirements' : `${docOk.length} of ${docOk.length + docBlockers.length} satisfied`}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {docOk.map((item) => (
            <div key={item.code} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #a7f3d0', background: '#ecfdf5' }}>
              <span style={{ color: '#059669', fontWeight: 800 }}>✓</span>
              <span style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: '#065f46' }}>{item.title}</span>
              <span style={{ fontSize: '10px', color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>Uploaded</span>
            </div>
          ))}
          {docBlockers.map((item) => (
            <div key={item.code} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fecaca', background: '#fff1f2' }}>
              <span style={{ color: '#dc2626', fontWeight: 800 }}>✗</span>
              <span style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: '#9f1239' }}>{item.title}</span>
              <span style={{ fontSize: '10px', color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>Missing</span>
            </div>
          ))}
          {documents.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '6px' }}>Uploaded files</div>
              {documents.slice(0, 6).map((doc) => (
                <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '6px', background: '#f8fafc', border: '1px solid #f1f5f9', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px' }}>📄</span>
                  <span style={{ flex: 1, fontSize: '11px', fontWeight: 600, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.file_name}</span>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>{doc.doc_type.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: '10px', color: '#94a3b8' }}>{fmt(doc.uploaded_at)}</span>
                </div>
              ))}
            </div>
          )}
          {docOk.length === 0 && docBlockers.length === 0 && documents.length === 0 && (
            <div style={{ padding: '14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
              No document requirements configured for this order yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
