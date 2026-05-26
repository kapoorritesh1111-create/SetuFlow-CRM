import { advanceOrderStageAction } from '@/features/orders/server';

const ACTIONS = [
  ['Request payment', 'payment_requested'],
  ['Mark partial payment received', 'payment_partial'],
  ['Mark payment paid', 'payment_paid'],
  ['Approve deferred terms', 'production_ready'],
  ['Mark production ready', 'production_ready'],
  ['Start production', 'production_in_progress'],
  ['Mark dispatch ready', 'dispatch_ready'],
  ['Mark dispatched', 'dispatched'],
  ['Mark delivered', 'delivered'],
  ['Complete order', 'completed'],
] as const;

export function OrderStageAdvanceStrip({ orderId, sourceQuoteId, contractId, currentStage }: { orderId?: string | null; sourceQuoteId: string; contractId?: string | null; currentStage?: string | null }) {
  const button = { padding: '7px 11px', borderRadius: '999px', background: '#0b2e4a', color: 'white', border: '1px solid #0b2e4a', fontSize: '10px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' as const };
  return (
    <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'grid', gap: '8px' }}>
      <div style={{ fontSize: '11px', color: '#64748b' }}>Order lifecycle · current stage: {currentStage?.replace(/_/g, ' ') || 'order created'}. Partial payment or approved deferred terms can satisfy the production gate.</div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {ACTIONS.map(([label, target]) => (
          <form key={label} action={advanceOrderStageAction}>
            <input type="hidden" name="order_id" value={orderId ?? ''} />
            <input type="hidden" name="source_quote_id" value={sourceQuoteId} />
            <input type="hidden" name="contract_id" value={contractId ?? ''} />
            <input type="hidden" name="target_stage" value={target} />
            <input type="hidden" name="idempotency_key" value={`${sourceQuoteId}:${currentStage ?? 'unknown'}:${target}`} />
            {label.includes('deferred') ? <input type="hidden" name="deferred_payment_approved" value="true" /> : null}
            <button type="submit" style={button}>{label}</button>
          </form>
        ))}
      </div>
      <form action={advanceOrderStageAction}>
        <input type="hidden" name="order_id" value={orderId ?? ''} />
        <input type="hidden" name="source_quote_id" value={sourceQuoteId} />
        <input type="hidden" name="contract_id" value={contractId ?? ''} />
        <input type="hidden" name="target_stage" value="cancelled" />
        <input type="hidden" name="idempotency_key" value={`${sourceQuoteId}:${currentStage ?? 'unknown'}:cancelled`} />
        <button type="submit" style={{ ...button, background: '#fff1f2', color: '#be123c', border: '1px solid #fecaca' }}>Cancel order</button>
      </form>
      <div style={{ fontSize: '10px', color: '#64748b' }}>Dispatch still requires dispatch ready first.</div>
    </div>
  );
}
