import { StateMessage } from '@/components/ui/state-message';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { TradeEventDuplicateNotice, type TradeEventDraft } from '@/features/admin/components/trade-event-duplicate-notice';
import { TradeEventsAdminQueryOpener } from '@/features/admin/components/trade-events-admin-query-opener';
import { TradeEventsAdminWorkspace } from '@/features/admin/components/trade-events-admin-workspace';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

type Params = Record<string, string | string[] | undefined>;
const first = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? '' : value ?? '';

export default async function Page({ searchParams }: { searchParams?: Params }) {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;
  const supabase = await createClient();
  const { data: rowsData } = await supabase.from('trade_events').select('id, name, city, country, starts_on, ends_on, notes, booth_number, updated_at, capture_defaults').eq('organization_id', organization.id).order('starts_on', { ascending: false }).order('name', { ascending: true });
  const rows = (rowsData ?? []) as any[];
  const notice = first(searchParams?.notice);
  const candidateId = first(searchParams?.eventId);
  const eventName = first(searchParams?.eventName);
  const linkedCount = Number(first(searchParams?.linked) || 0);
  const draft: TradeEventDraft = {
    name: first(searchParams?.draft_name), city: first(searchParams?.draft_city), country: first(searchParams?.draft_country), starts_on: first(searchParams?.draft_starts_on), ends_on: first(searchParams?.draft_ends_on), booth_number: first(searchParams?.draft_booth_number), notes: first(searchParams?.draft_notes), image_url: first(searchParams?.draft_image_url), website_url: first(searchParams?.draft_website_url),
  };
  const duplicateNotice = candidateId && (notice === 'event-duplicate' || notice === 'event-possible-duplicate')
    ? <TradeEventDuplicateNotice kind={notice === 'event-duplicate' ? 'exact' : 'possible'} candidateId={candidateId} eventName={eventName} draft={draft} />
    : null;
  const deleteNotice = notice === 'event-deleted'
    ? <StateMessage title="Event deleted" description={`${eventName || 'The event'} was removed from this workspace.`} tone="success" />
    : notice === 'event-delete-blocked'
      ? <StateMessage title="Event cannot be deleted yet" description={`${eventName || 'This event'} has ${linkedCount || 'existing'} linked CRM record${linkedCount === 1 ? '' : 's'}. Move or merge that activity before deleting the event so lead and interaction history is not lost.`} tone="warning" />
      : notice === 'event-delete-failed'
        ? <StateMessage title="Event could not be deleted" description="Nothing was removed. Refresh and try again, or check the event for linked CRM activity." tone="danger" />
        : null;

  return <AdminSettingsShell active="trade-events" organizationName={organization.name} missingCount={rows.length === 0 ? 1 : 0}><TradeEventsAdminQueryOpener />{deleteNotice}{duplicateNotice}<AdminPageHero title="Trade Events" description="Maintain the event list used by trade-show capture, source attribution, booth prep, card images, and lead handoff analytics." badge={organization.name} stats={[{ label: 'Events', value: rows.length, tone: rows.length ? 'success' : 'warning' }, { label: 'Scheduled', value: rows.filter((item) => item.starts_on).length, tone: 'info' }, { label: 'With booth', value: rows.filter((item) => item.booth_number).length, tone: 'info' }] as any} /><TradeEventsAdminWorkspace events={rows} /></AdminSettingsShell>;
}
