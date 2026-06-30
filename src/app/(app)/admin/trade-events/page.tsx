import { StateMessage } from '@/components/ui/state-message';
import { AdminPageHero, AdminSettingsShell } from '@/features/admin/components/admin-settings-shell';
import { hasSupabaseEnv } from '@/lib/env';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { TradeEventsAdminWorkspace } from '@/features/admin/components/trade-events-admin-workspace';
import { TradeEventsAdminQueryOpener } from '@/features/admin/components/trade-events-admin-query-opener';

export default async function Page() {
  if (!hasSupabaseEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv) return <StateMessage title="Supabase environment variables are missing" description="Configure the application environment before using this admin workspace." tone="warning" />;
  if (!membership || !organization) return null;
  const supabase = await createClient();
  const { data: rowsData } = await supabase
    .from('trade_events')
    .select('id, name, city, country, starts_on, ends_on, notes, booth_number, updated_at, capture_defaults')
    .eq('organization_id', organization.id)
    .order('starts_on', { ascending: false })
    .order('name', { ascending: true });
  const rows = (rowsData ?? []) as any[];
  return <AdminSettingsShell active="trade-events" organizationName={organization.name} missingCount={rows.length === 0 ? 1 : 0}><TradeEventsAdminQueryOpener /><AdminPageHero title="Trade Events" description="Maintain the event list used by trade-show capture, source attribution, booth prep, card images, and lead handoff analytics." badge={organization.name} stats={[{ label: 'Events', value: rows.length, tone: rows.length ? 'success' : 'warning' }, { label: 'Scheduled', value: rows.filter((item) => item.starts_on).length, tone: 'info' }, { label: 'With booth', value: rows.filter((item) => item.booth_number).length, tone: 'info' }] as any} /><TradeEventsAdminWorkspace events={rows} /></AdminSettingsShell>;
}
