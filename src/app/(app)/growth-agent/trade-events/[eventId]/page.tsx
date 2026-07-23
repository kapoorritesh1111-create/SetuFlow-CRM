import { EmptyState } from '@/components/ui/empty-state';
import { TradeEventAssistantView } from '@/features/setu-guru/trade-event-assistant-view';
import { getTradeEventAssistant } from '@/lib/setu-guru/trade-event-assistant';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

export default async function TradeEventAssistantPage({ params }: { params: { eventId: string } }) {
  const workspace = await requireWorkspace();
  const organizationId = workspace.organization?.id;

  if (!organizationId) {
    return <EmptyState title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." />;
  }

  const assistant = await getTradeEventAssistant(organizationId, params.eventId);
  if (!assistant) {
    return <EmptyState title="Trade event not found" description="This event could not be loaded from the active workspace." />;
  }

  return <TradeEventAssistantView assistant={assistant} />;
}
