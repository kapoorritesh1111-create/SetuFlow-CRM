import type { QuotePricingBasis } from '@/lib/pricing-basis-contract';

export type TradeJourney = 'buyer' | 'supplier' | 'mixed';

export type TradeSignalTone = 'success' | 'warning' | 'danger' | 'neutral';

export type TradeReadinessSignal = {
  label: string;
  value: string;
  tone: TradeSignalTone;
  detail: string;
};

export type QuoteTradeWorkflow = {
  incotermLabel: 'EXW' | 'FOB' | 'CIF' | 'Bulk/Kg' | 'Not set';
  handoffLabel: string;
};

export type OrderTradeWorkflow = {
  journeyLabel: string;
  freightReadiness: TradeReadinessSignal;
  complianceReadiness: TradeReadinessSignal;
  dispatchReadiness: TradeReadinessSignal;
  handoffVisibility: TradeReadinessSignal;
};
