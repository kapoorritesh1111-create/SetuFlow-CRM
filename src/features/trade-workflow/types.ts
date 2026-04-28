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
  journey: TradeJourney;
  pricingBasis: QuotePricingBasis | null;
  incotermLabel: 'EXW' | 'FOB' | 'CIF' | 'Bulk/Kg' | 'Not set';
  handoffLabel: string;
};

export type OrderTradeWorkflow = {
  journey: TradeJourney;
  journeyLabel: string;
  freightReadiness: TradeReadinessSignal;
  complianceReadiness: TradeReadinessSignal;
  dispatchReadiness: TradeReadinessSignal;
  handoffVisibility: TradeReadinessSignal;
};
