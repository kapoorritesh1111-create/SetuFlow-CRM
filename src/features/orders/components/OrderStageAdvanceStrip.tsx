// SF-19-022: OrderStageAdvanceStrip — stepped workflow design (replaces flat 10-button grid)
import { advanceOrderStageAction } from '@/features/orders/server';

const WORKFLOW_STEPS = [
  { stage: 'payment_requested',    label: 'Request payment',          group: 'Finance',     icon: '◎' },
  { stage: 'payment_partial',      label: 'Partial payment received', group: 'Finance',     icon: '◑' },
  { stage: 'payment_paid',         label: 'Payment paid',             group: 'Finance',     icon: '●' },
  { stage: 'production_ready',     label: 'Production ready',         group: 'Production',  icon: '◎' },
  { stage: 'production_in_progress', label: 'Start production',       group: 'Production',  icon: '◑' },
  { stage: 'dispatch_ready',       label: 'Dispatch ready',           group: 'Dispatch',    icon: '◎' },
  { stage: 'dispatched',           label: 'Mark dispatched',          group: 'Dispatch',    icon: '◑' },
  { stage: 'delivered',            label: 'Mark delivered',           group: 'Dispatch',    icon: '●' },
  { stage: 'completed',            label: 'Complete order',           group: 'Close',       icon: '✓' },
] as const;

const STAGE_ORDER = WORKFLOW_STEPS.map((s) => s.stage);

function getStageIndex(stage: string | null | undefined) {
  const idx = STAGE_ORDER.indexOf(stage as typeof STAGE_ORDER[number]);
  return idx === -1 ? -1 : idx;
}

export function OrderStageAdvanceStrip({
  orderId,
  sourceQuoteId,
  contractId,
  currentStage,
}: {
  orderId?: string | null;
  sourceQuoteId: string;
  contractId?: string | null;
  currentStage?: string | null;
}) {
  const currentIdx = getStageIndex(currentStage);

  // Show only the next 3 applicable actions from current position, plus cancel
  const nextSteps = WORKFLOW_STEPS.filter((_, i) => i > currentIdx && i <= currentIdx + 3);
  const prevDone = WORKFLOW_STEPS.filter((_, i) => i <= currentIdx);

  return (
    <div style={{ padding: '0 20px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
      {/* Stage progress track */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingTop: 14, paddingBottom: 10, scrollbarWidth: 'none' }}>
        {WORKFLOW_STEPS.map((step, i) => {
          const done = i <= currentIdx;
          const active = i === currentIdx + 1;
          return (
            <div key={step.stage} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                minWidth: 52,
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: done ? '#0b2e4a' : active ? '#1e88e5' : '#e2e8f0',
                  color: done || active ? '#fff' : '#94a3b8',
                  fontSize: 11, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: active ? '2px solid #1e88e5' : 'none',
                  boxShadow: active ? '0 0 0 3px rgba(30,136,229,0.2)' : 'none',
                }}>
                  {done ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 8, fontWeight: 600, color: done ? '#0b2e4a' : active ? '#1e88e5' : '#94a3b8', textAlign: 'center', lineHeight: 1.2, maxWidth: 52 }}>
                  {step.label.split(' ').slice(0, 2).join(' ')}
                </span>
              </div>
              {i < WORKFLOW_STEPS.length - 1 && (
                <div style={{ width: 20, height: 2, background: i < currentIdx ? '#0b2e4a' : '#e2e8f0', flexShrink: 0, marginBottom: 14 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Current status badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Stage:
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#0b2e4a', background: '#e8f0f7', borderRadius: 20, padding: '2px 10px' }}>
          {currentStage?.replace(/_/g, ' ') ?? 'order created'}
        </span>
        {currentIdx === WORKFLOW_STEPS.length - 1 && (
          <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#dcfce7', borderRadius: 20, padding: '2px 10px' }}>
            ✓ All stages complete
          </span>
        )}
      </div>

      {/* Next action buttons — only show the immediate next steps */}
      {nextSteps.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Next:
          </span>
          {nextSteps.map(({ stage, label }, i) => (
            <form key={stage} action={advanceOrderStageAction} style={{ display: 'inline' }}>
              <input type="hidden" name="order_id" value={orderId ?? ''} />
              <input type="hidden" name="source_quote_id" value={sourceQuoteId} />
              <input type="hidden" name="contract_id" value={contractId ?? ''} />
              <input type="hidden" name="target_stage" value={stage} />
              <input type="hidden" name="idempotency_key" value={`${sourceQuoteId}:${currentStage ?? 'unknown'}:${stage}`} />
              {stage === 'production_ready' && <input type="hidden" name="deferred_payment_approved" value="true" />}
              <button
                type="submit"
                style={{
                  padding: '7px 14px', borderRadius: 999,
                  background: i === 0 ? '#0b2e4a' : '#f1f5f9',
                  color: i === 0 ? '#fff' : '#475569',
                  border: i === 0 ? '1px solid #0b2e4a' : '1px solid #e2e8f0',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' as const,
                  transition: 'opacity 0.15s',
                }}
              >
                {i === 0 ? '→ ' : ''}{label}
              </button>
            </form>
          ))}

          {/* Cancel — always shown, muted */}
          <form action={advanceOrderStageAction} style={{ marginLeft: 'auto' }}>
            <input type="hidden" name="order_id" value={orderId ?? ''} />
            <input type="hidden" name="source_quote_id" value={sourceQuoteId} />
            <input type="hidden" name="contract_id" value={contractId ?? ''} />
            <input type="hidden" name="target_stage" value="cancelled" />
            <input type="hidden" name="idempotency_key" value={`${sourceQuoteId}:${currentStage ?? 'unknown'}:cancelled`} />
            <button
              type="submit"
              style={{ padding: '5px 10px', borderRadius: 999, background: 'transparent', color: '#94a3b8', border: '1px solid #e2e8f0', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel order
            </button>
          </form>
        </div>
      )}

      {nextSteps.length === 0 && currentIdx < WORKFLOW_STEPS.length - 1 && (
        <p style={{ fontSize: 11, color: '#64748b' }}>No further lifecycle actions — order is in final stage.</p>
      )}
    </div>
  );
}
