import { parseQuoteWorkflow } from '@/lib/quoteWorkflow';
import type { OrderTradeWorkflow, QuoteTradeWorkflow, TradeJourney, TradeReadinessSignal, TradeSignalTone } from '@/features/trade-workflow/types';

function toneByCount(count: number, successLabel: string, singular: string, plural: string): TradeReadinessSignal {
  if (count <= 0) return { label: successLabel, value: 'Ready', tone: 'success', detail: successLabel };
  if (count <= 2) return { label: singular, value: String(count), tone: 'warning', detail: `${count} ${singular.toLowerCase()}` };
  return { label: plural, value: String(count), tone: 'danger', detail: `${count} ${plural.toLowerCase()}` };
}

export function journeyLabel(journey: TradeJourney) {
  if (journey === 'buyer') return 'Buyer mode';
  if (journey === 'supplier') return 'Supplier mode';
  return 'Mixed mode';
}

export function inferQuoteTradeWorkflow(input: {
  leadType?: string | null;
  notes?: string | null;
  hasAcceptedContract?: boolean;
}): QuoteTradeWorkflow {
  const parsed = parseQuoteWorkflow(input.notes);
  const pricingBasis = parsed.meta.pricingBasis ?? null;
  const incotermLabel = pricingBasis === 'ex_factory' ? 'EXW' : pricingBasis === 'cif' ? 'CIF' : pricingBasis === 'fob' ? 'FOB' : pricingBasis === 'bulk_chips' ? 'Bulk/Kg' : 'Not set';
  const journey: TradeJourney = input.leadType === 'buyer' ? 'buyer' : input.leadType === 'supplier' ? 'supplier' : 'mixed';

  return {
    journey,
    pricingBasis,
    incotermLabel,
    handoffLabel: input.hasAcceptedContract ? 'Order handoff active' : 'Order handoff pending',
  };
}

export function inferOrderTradeWorkflow(input: {
  leadType?: string | null;
  documentBlockers: number;
  complianceBlockers: number;
  hasContract: boolean;
  quoteStatus: string;
}): OrderTradeWorkflow {
  const journey: TradeJourney = input.leadType === 'buyer' ? 'buyer' : input.leadType === 'supplier' ? 'supplier' : 'mixed';
  const freightReady = input.documentBlockers === 0 && input.hasContract;
  const freightReadiness: TradeReadinessSignal = freightReady
    ? { label: 'Freight ready', value: 'Ready', tone: 'success', detail: 'Commercial acceptance and document posture support freight handoff.' }
    : { label: 'Freight pending', value: input.hasContract ? 'Docs pending' : 'Contract pending', tone: input.hasContract ? 'warning' : 'danger', detail: input.hasContract ? 'Freight handoff is waiting on document clearance.' : 'Freight handoff is waiting on commercial contract readiness.' };

  const complianceReadiness = toneByCount(input.complianceBlockers, 'Compliance clear', 'Compliance blocker', 'Compliance blockers');
  const dispatchBlockers = input.documentBlockers + input.complianceBlockers + (input.hasContract ? 0 : 1);
  const dispatchReadiness = toneByCount(dispatchBlockers, 'Dispatch ready', 'Dispatch blocker', 'Dispatch blockers');
  const handoffVisibility: TradeReadinessSignal = input.quoteStatus === 'accepted'
    ? {
        label: input.hasContract ? 'Execution handoff visible' : 'Execution handoff pending',
        value: input.hasContract ? 'Live' : 'Needs contract',
        tone: input.hasContract ? 'success' : 'warning',
        detail: input.hasContract ? 'Quote → order → execution continuity is visible in this order record.' : 'Accepted commercial work exists, but execution handoff is not fully documented yet.',
      }
    : {
        label: 'Commercial handoff incomplete',
        value: input.quoteStatus,
        tone: 'danger',
        detail: 'Orders should only represent accepted commercial work with clear execution continuity.',
      };

  return {
    journey,
    journeyLabel: journeyLabel(journey),
    freightReadiness,
    complianceReadiness,
    dispatchReadiness,
    handoffVisibility,
  };
}

export function signalToneClasses(tone: TradeSignalTone) {
  switch (tone) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'danger':
      return 'border-rose-200 bg-rose-50 text-rose-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}
