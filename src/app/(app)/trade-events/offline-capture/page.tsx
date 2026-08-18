import { redirect } from 'next/navigation';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { TradeEventOfflineCapture } from '@/features/trade-events/components/trade-event-offline-capture';
import { createClient } from '@/lib/supabase/server';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function TradeEventOfflineCapturePage({
  searchParams,
}: {
  searchParams?: { eventId?: string | string[]; leadType?: string | string[] };
}) {
  const eventId = readParam(searchParams?.eventId).trim();
  const requestedLeadType = readParam(searchParams?.leadType).trim().toLowerCase();
  if (!eventId) redirect('/trade-events');

  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return (
      <WorkspaceState
        eyebrow="Trade event capture"
        title="Workspace membership needed"
        description="Sign in to an active organization before capturing trade-event leads."
        primaryActionHref="/dashboard"
        primaryActionLabel="Go to dashboard"
      />
    );
  }

  const db = await createClient();
  const { data: event } = await db
    .from('trade_events')
    .select('id, name, city, country, venue')
    .eq('organization_id', workspace.organization.id)
    .eq('id', eventId)
    .maybeSingle();

  if (!event?.id) {
    return (
      <WorkspaceState
        eyebrow="Trade event capture"
        title="Event not available"
        description="This event is not available in the current organization."
        primaryActionHref="/trade-events"
        primaryActionLabel="Back to Events"
      />
    );
  }

  const locationLabel = [event.venue, event.city, event.country].map((value) => String(value ?? '').trim()).filter(Boolean).join(' · ');
  return (
    <TradeEventOfflineCapture
      event={{ id: String(event.id), name: String(event.name), locationLabel }}
      initialLeadType={requestedLeadType === 'supplier' ? 'supplier' : 'buyer'}
    />
  );
}
