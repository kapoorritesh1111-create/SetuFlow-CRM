import { getValidZoomAccessToken, zoomApi } from '@/lib/calendar/zoom';

export type ZoomLifecycleResult = {
  ok: boolean;
  action: 'created' | 'updated' | 'cancelled' | 'unchanged';
  joinUrl?: string | null;
  meetingId?: string | null;
  error?: string;
};

export async function getZoomConnection(db: any, organizationId: string, userId: string) {
  const { data } = await db
    .from('meeting_connections')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('user_id', userId)
    .eq('provider', 'zoom')
    .eq('status', 'active')
    .maybeSingle();
  return data ?? null;
}

export function isZoomConfigured() {
  return Boolean(String(process.env.ZOOM_CLIENT_ID || '').trim() && String(process.env.ZOOM_CLIENT_SECRET || '').trim());
}

function zoomMeetingBody(event: any) {
  const duration = Math.max(1, Math.round((new Date(event.ends_at).getTime() - new Date(event.starts_at).getTime()) / 60000));
  return {
    topic: event.title,
    type: 2,
    start_time: event.starts_at,
    duration,
    timezone: event.timezone || 'UTC',
    agenda: event.description || '',
    settings: { join_before_host: false, waiting_room: true },
  };
}

export async function createZoomMeetingForEvent(db: any, organizationId: string, userId: string, event: any): Promise<ZoomLifecycleResult> {
  if (event.meeting_external_id && event.meeting_provider === 'zoom') {
    return { ok: true, action: 'unchanged', joinUrl: event.meeting_url, meetingId: event.meeting_external_id };
  }
  const connection = await getZoomConnection(db, organizationId, userId);
  if (!connection) return { ok: false, action: 'unchanged', error: 'Connect Zoom in Calendar settings before inviting people to a Zoom meeting.' };
  try {
    const token = await getValidZoomAccessToken(db, connection);
    const meeting = await zoomApi(token, '/users/me/meetings', { method: 'POST', body: JSON.stringify(zoomMeetingBody(event)) });
    const meetingId = String(meeting.id);
    const joinUrl = String(meeting.join_url || '');
    const { error } = await db.from('calendar_events').update({
      meeting_provider: 'zoom',
      meeting_url: joinUrl || null,
      meeting_host_url: meeting.start_url || null,
      meeting_external_id: meetingId,
      meeting_password: meeting.password || null,
      meeting_metadata: { provider: 'zoom', synced_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq('id', event.id).eq('organization_id', organizationId);
    if (error) throw new Error('Zoom meeting was created but Setu could not save its details.');
    return { ok: true, action: 'created', joinUrl, meetingId };
  } catch (error) {
    return { ok: false, action: 'unchanged', error: error instanceof Error ? error.message : 'Zoom could not create this meeting.' };
  }
}

export async function updateZoomMeetingForEvent(db: any, organizationId: string, userId: string, event: any): Promise<ZoomLifecycleResult> {
  if (!event.meeting_external_id || event.meeting_provider !== 'zoom') return createZoomMeetingForEvent(db, organizationId, userId, event);
  const connection = await getZoomConnection(db, organizationId, userId);
  if (!connection) return { ok: false, action: 'unchanged', error: 'Zoom is disconnected. Reconnect Zoom before updating this meeting.' };
  try {
    const token = await getValidZoomAccessToken(db, connection);
    await zoomApi(token, `/meetings/${encodeURIComponent(event.meeting_external_id)}`, { method: 'PATCH', body: JSON.stringify(zoomMeetingBody(event)) });
    await db.from('calendar_events').update({ meeting_metadata: { ...(event.meeting_metadata || {}), provider: 'zoom', synced_at: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', event.id).eq('organization_id', organizationId);
    return { ok: true, action: 'updated', joinUrl: event.meeting_url, meetingId: event.meeting_external_id };
  } catch (error) {
    return { ok: false, action: 'unchanged', error: error instanceof Error ? error.message : 'Unable to update Zoom meeting.' };
  }
}

export async function cancelZoomMeetingForEvent(db: any, organizationId: string, userId: string, event: any): Promise<ZoomLifecycleResult> {
  if (!event.meeting_external_id) return { ok: true, action: 'unchanged' };
  const connection = await getZoomConnection(db, organizationId, userId);
  if (!connection) return { ok: false, action: 'unchanged', error: 'Zoom is disconnected, so the remote Zoom meeting could not be cancelled.' };
  try {
    const token = await getValidZoomAccessToken(db, connection);
    await zoomApi(token, `/meetings/${encodeURIComponent(event.meeting_external_id)}`, { method: 'DELETE' });
    await db.from('calendar_events').update({
      meeting_metadata: { ...(event.meeting_metadata || {}), provider: 'zoom', cancelled_at: new Date().toISOString() },
      updated_at: new Date().toISOString(),
    }).eq('id', event.id).eq('organization_id', organizationId);
    return { ok: true, action: 'cancelled', meetingId: event.meeting_external_id };
  } catch (error) {
    return { ok: false, action: 'unchanged', error: error instanceof Error ? error.message : 'Unable to cancel Zoom meeting.' };
  }
}
