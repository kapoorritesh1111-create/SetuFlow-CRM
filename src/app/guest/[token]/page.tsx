import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { GuestShell } from './guest-shell';

export const dynamic = 'force-dynamic';

const STYLE = `
*{box-sizing:border-box}
.gwrap{min-height:100vh;height:100vh;display:flex;flex-direction:column;background:#eef2f6;font-family:'DM Sans',system-ui,sans-serif;color:#1e293b;overflow:hidden}
.ginvalid{max-width:520px;margin:14vh auto;background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:28px;text-align:center}
`;

export default async function GuestPage({ params }: { params: { token: string } }) {
  const svc = createServiceRoleClient() as any;
  const { data: link } = await svc.from('guest_links').select('*').eq('token', params.token).maybeSingle();
  const invalid = !link || link.revoked_at || (link.expires_at && new Date(link.expires_at).getTime() < Date.now());

  if (invalid) {
    return (
      <div className="gwrap"><style dangerouslySetInnerHTML={{ __html: STYLE }} />
        <div className="ginvalid">
          <h2 style={{ fontSize: 19 }}>This guest link isn&rsquo;t available</h2>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>It may have expired or been revoked. Please ask your SETU Flow contact for a new link.</p>
        </div>
      </div>
    );
  }

  await svc.from('guest_links').update({ use_count: (link.use_count ?? 0) + 1, last_used_at: new Date().toISOString() }).eq('id', link.id);
  const expiryMs = link.expires_at ? new Date(link.expires_at).getTime() : Date.now() + 3650 * 864e5;
  const docsShareToken = Buffer.from(JSON.stringify({ recipient: link.guest_name || 'Guest', expiry: expiryMs, issued: Date.now() })).toString('base64');
  const { data: msgs } = await svc.from('guest_chat_messages').select('id, sender_kind, sender_name, body, attachment_url, attachment_name, created_at').eq('guest_link_id', link.id).order('created_at', { ascending: true });

  return (
    <div className="gwrap"><style dangerouslySetInnerHTML={{ __html: STYLE }} />
      <GuestShell token={params.token} guestName={link.guest_name || 'Guest'} docsShareToken={docsShareToken} qaToken={link.qa_token || ''} expiresAt={link.expires_at} initialMessages={(msgs ?? []) as any[]} />
    </div>
  );
}
