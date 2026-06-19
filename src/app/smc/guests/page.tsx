import { createClient } from '@/lib/supabase/server';
import { GuestsConsole } from './guests-console';

export const dynamic = 'force-dynamic';

export default async function SmcGuestsPage() {
  const sb = (await createClient()) as any;
  const [linksRes, msgsRes] = await Promise.all([
    sb.from('guest_links').select('id, token, label, guest_name, guest_email, qa_token, expires_at, revoked_at, use_count, last_used_at, created_at').order('created_at', { ascending: false }),
    sb.from('guest_chat_messages').select('id, guest_link_id, sender_kind, sender_name, body, attachment_url, attachment_name, created_at').order('created_at', { ascending: true }),
  ]);
  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Access</div><h1>Guest Sessions</h1></div>
      </div>
      <GuestsConsole links={(linksRes.data ?? []) as any[]} messages={(msgsRes.data ?? []) as any[]} />
    </>
  );
}
