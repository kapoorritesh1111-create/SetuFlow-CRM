import { StateMessage } from '@/components/ui/state-message';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { TradeEventsAdminWorkspace } from '@/features/admin/components/admin-reference-workspaces';

export default async function Page() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;
  const supabase = await createClient();
  const { data: rowsData } = await supabase.from('trade_events').select('id, name, city, country, starts_on, ends_on, notes, updated_at, capture_defaults').eq('organization_id', organization.id).order('starts_on', { ascending: false }).order('name', { ascending: true });
  const baseRows = (rowsData ?? []) as any[];
  const eventIds = baseRows.map((event) => event.id).filter(Boolean);
  const { data: entryCounts } = eventIds.length
    ? await supabase.from('trade_event_entries').select('trade_event_id, converted_lead_id').in('trade_event_id', eventIds)
    : { data: [] as any[] };
  const entries = (entryCounts ?? []) as any[];
  const rows = baseRows.map((event) => {
    const scoped = entries.filter((entry) => entry.trade_event_id === event.id);
    return { ...event, totalEntries: scoped.length, convertedEntries: scoped.filter((entry) => entry.converted_lead_id !== null).length };
  });
  return <AdminSettingsShell active="trade-events" organizationName={organization.name} missingCount={rows.length === 0 ? 1 : 0}><AdminPageHero title="Trade Events" description="Maintain the event list used by trade-show capture, source attribution, and lead handoff analytics." badge={organization.name} stats={[{ label: 'Events', value: rows.length, tone: rows.length ? 'success' : 'warning' }, { label: 'Scheduled', value: rows.filter((item) => item.starts_on).length, tone: 'info' }] as any} /><TradeEventsAdminWorkspace events={rows} /></AdminSettingsShell>;
}
