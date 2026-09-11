/** A processing lease makes provider retries safe without rerunning rules over existing mail. */
export async function claimMailWebhook(db: any, event: Record<string, unknown>, now: string) {
  const inserted = await db.from('mail_webhook_events').insert({ ...event, status: 'processing', processed_at: now });
  if (!inserted.error) return { claimed: true, duplicate: false, claimedAt: now };
  if (inserted.error.code !== '23505') throw inserted.error;
  const existing = await db.from('mail_webhook_events').select('id,status,processed_at,created_at').eq('svix_id', event.svix_id).maybeSingle();
  if (existing.error) throw existing.error;
  if (!existing.data) throw new Error('Webhook claim unavailable.');
  if (existing.data.status === 'processed') return { claimed: false, duplicate: true, claimedAt: null };
  const leaseTime = Date.parse(existing.data.processed_at ?? existing.data.created_at);
  const stale = Number.isFinite(leaseTime) && Date.parse(now) - leaseTime > 5 * 60 * 1000;
  if (existing.data.status !== 'failed' && !stale) return { claimed: false, duplicate: false, claimedAt: null };
  let query = db.from('mail_webhook_events').update({ status: 'processing', processed_at: now, error_message: null }).eq('id', existing.data.id).eq('status', existing.data.status);
  query = existing.data.processed_at ? query.eq('processed_at', existing.data.processed_at) : query.is('processed_at', null);
  const reclaimed = await query.select('id').maybeSingle();
  if (reclaimed.error) throw reclaimed.error;
  return { claimed: Boolean(reclaimed.data), duplicate: false, claimedAt: reclaimed.data ? now : null };
}
