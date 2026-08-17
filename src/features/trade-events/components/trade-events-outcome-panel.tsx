import { EventRoiPanel } from './event-roi-panel';
import { buildTradeEventsViewModel } from '@/lib/trade-events/view-model';

type Model = ReturnType<typeof buildTradeEventsViewModel>;

export function TradeEventsOutcomePanel({ model }: { model: Model }) {
  if (!model.current || !model.outcome) return null;
  const outcome = model.outcome;
  return <EventRoiPanel eventId={String(model.current.id)} spend={outcome.spend} spendTotal={outcome.spendTotal} pipelineValue={outcome.pipelineValue} pipelineCurrency={outcome.pipelineCurrency} wonRevenue={outcome.wonRevenue} revenueCurrency={outcome.revenueCurrency} quoteCount={outcome.quoteCount} orderCount={outcome.orderCount} roiMultiple={outcome.roiMultiple} />;
}
