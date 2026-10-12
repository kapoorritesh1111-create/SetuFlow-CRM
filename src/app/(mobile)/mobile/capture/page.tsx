import { MobileBusinessCardScanner } from '@/features/mobile/components/mobile-business-card-scanner';
import { requireWorkspace } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';

export default async function MobileCapturePage({
  searchParams,
}: {
  searchParams?: { sourceType?: string | string[]; eventId?: string | string[] };
}) {
  const readParam = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? '' : value ?? '';
  const sourceType = readParam(searchParams?.sourceType).trim();
  const eventId = readParam(searchParams?.eventId).trim();
  const workspace = await requireWorkspace();
  let serviceFamilies: Array<{ id: string; name: string }> = [];
  if (workspace.organization?.id === 'b97913cb-3b95-4247-8ced-ffdc0d392d2a') {
    const db = await createClient();
    const { data } = await db.from('packaging_service_families').select('id,name').eq('organization_id', workspace.organization.id).order('name');
    serviceFamilies = (data ?? []).filter((family: { id?: string; name?: string }) => Boolean(family.id && family.name));
  }
  return <MobileBusinessCardScanner initialLeadType={sourceType === 'supplier' ? 'supplier' : 'buyer'} eventId={eventId || null} serviceFamilies={serviceFamilies} />;
}
