import { NextRequest, NextResponse } from 'next/server';
import { mailOrganizerContext, MailAccessError } from '@/lib/mail/organizer-context';
import { isMailId } from '@/lib/mail/organization';
import { buildIncomingInviteReply, conciseInviteNotes, parseIncomingMailInvite, type InviteResponse } from '@/lib/calendar/incoming-mail-invite';

export const dynamic = 'force-dynamic';
const ATTACHMENT_BUCKET = 'setu-mail-attachments';
const RESEND_API = 'https://api.resend.com';
const MAX_REMOTE_ICS_BYTES = 256 * 1024;
const RESPONSES = new Set<InviteResponse>(['accepted','tentative','declined']);

function fail(error: unknown) {
  if (error instanceof MailAccessError) return NextResponse.json({ error: error.message }, { status: error.status });
  return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to respond to this calendar invitation.' }, { status: 500 });
}
function isCalendarAttachment(item: { content_type?: unknown; filename?: unknown }) { return String(item.content_type || '').toLowerCase().startsWith('text/calendar') || String(item.filename || '').toLowerCase().endsWith('.ics'); }
async function resendGet(path: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  try { const response = await fetch(`${RESEND_API}${path}`, { headers: { Authorization: `Bearer ${apiKey}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) }); return response.ok ? await response.json().catch(()=>null) : null; } catch { return null; }
}
async function remoteCalendarText(providerMessageId: string, attachmentId: string) {
  const payload = await resendGet(`/emails/receiving/${encodeURIComponent(providerMessageId)}/attachments`);
  const items = Array.isArray(payload?.data) ? payload.data : [];
  const item = items.find((candidate: any) => String(candidate.id || '') === attachmentId && isCalendarAttachment(candidate));
  if (!item) return null;
  if (Number(item.size || 0) > MAX_REMOTE_ICS_BYTES) throw new Error('This calendar invitation is too large to import safely.');
  const downloadUrl = String(item.download_url || ''); if (!downloadUrl.startsWith('https://')) return null;
  const response = await fetch(downloadUrl, { cache: 'no-store', signal: AbortSignal.timeout(10000) }); if (!response.ok) return null;
  const buffer = await response.arrayBuffer(); if (buffer.byteLength > MAX_REMOTE_ICS_BYTES) throw new Error('This calendar invitation is too large to import safely.');
  return new TextDecoder().decode(buffer);
}
async function readBody(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
    const form = await request.formData(); return { form: true, body: Object.fromEntries(form.entries()) as Record<string, unknown> };
  }
  return { form: false, body: await request.json().catch(()=>null) as Record<string, unknown> | null };
}
async function sendReply(options: { from: string; invite: NonNullable<ReturnType<typeof parseIncomingMailInvite>>; response: InviteResponse }) {
  if (!options.invite.organizer) throw new Error('This invitation does not identify an organizer who can receive your response.');
  const apiKey = String(process.env.RESEND_API_KEY || '').trim(); if (!apiKey) throw new Error('Calendar response delivery is not configured.');
  const replyIcs = buildIncomingInviteReply(options.invite, { email: options.from }, options.response);
  const label = options.response === 'accepted' ? 'Accepted' : options.response === 'tentative' ? 'Tentative' : 'Declined';
  const response = await fetch(`${RESEND_API}/emails`, { method:'POST', headers:{ Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json' }, body:JSON.stringify({
    from: options.from, to: [options.invite.organizer.email], subject: `${label}: ${options.invite.title}`,
    text: `${label}: ${options.invite.title}`,
    html: `<div style="font-family:Arial,sans-serif"><p><strong>${label}</strong>: ${options.invite.title.replace(/[<>&]/g,'')}</p><p>Response sent from Setu Calendar.</p></div>`,
    attachments:[{ filename:'reply.ics', content:Buffer.from(replyIcs).toString('base64'), content_type:'text/calendar; method=REPLY; charset=UTF-8' }],
  }), signal:AbortSignal.timeout(15000) });
  const payload = await response.json().catch(()=>({})) as any; if (!response.ok) throw new Error(payload?.message || payload?.error || 'Unable to send the calendar response.');
}

async function ensureDefaultReminder(db: any, organizationId: string, userId: string, eventId: string, startsAt: string) {
  if (!eventId || new Date(startsAt).getTime() <= Date.now()) return;
  const { data: existing } = await db.from('calendar_reminders').select('id').eq('organization_id', organizationId).eq('event_id', eventId).limit(1);
  if (existing?.length) return;
  const { data: preference } = await db.from('calendar_preferences').select('default_reminder_minutes,default_reminder_channels').eq('organization_id', organizationId).eq('user_id', userId).maybeSingle();
  const minutes = Number.isFinite(Number(preference?.default_reminder_minutes)) ? Math.max(0, Math.min(10080, Number(preference.default_reminder_minutes))) : 15;
  const channels = Array.isArray(preference?.default_reminder_channels) && preference.default_reminder_channels.length ? preference.default_reminder_channels : ['in_app'];
  const rows = [...new Set(channels)].filter(channel => channel === 'in_app' || channel === 'email').map(channel => ({ organization_id: organizationId, event_id: eventId, channel, minutes_before: minutes }));
  if (!rows.length) rows.push({ organization_id: organizationId, event_id: eventId, channel: 'in_app', minutes_before: minutes });
  const { error } = await db.from('calendar_reminders').insert(rows);
  if (error) console.warn('calendar-invite default reminder insert failed', { eventId, error: error.message });
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await mailOrganizerContext(request);
    const parsed = await readBody(request); const body = parsed.body;
    const attachmentId = String(body?.attachmentId || ''), messageId = String(body?.messageId || '');
    const requestedResponse = String(body?.response || 'accepted').toLowerCase() as InviteResponse;
    if (!isMailId(attachmentId) || !isMailId(messageId)) return NextResponse.json({ error:'Choose a valid calendar invitation.' }, { status:400 });
    if (!RESPONSES.has(requestedResponse)) return NextResponse.json({ error:'Choose Accept, Tentative, or Decline.' }, { status:400 });
    const [{ data: attachment, error: attachmentError }, { data: message, error: messageError }] = await Promise.all([
      ctx.db.from('mail_attachments').select('id,message_id,filename,content_type,storage_path,security_status').eq('id',attachmentId).eq('message_id',messageId).eq('organization_id',ctx.organizationId).eq('mailbox_id',ctx.mailbox.id).maybeSingle(),
      ctx.db.from('mail_messages').select('id,from_address,provider_message_id').eq('id',messageId).eq('organization_id',ctx.organizationId).eq('mailbox_id',ctx.mailbox.id).maybeSingle(),
    ]);
    if (attachmentError || messageError) return NextResponse.json({ error:'Unable to verify this invitation.' }, { status:503 });
    if (!message) return NextResponse.json({ error:'Calendar invitation not found.' }, { status:404 });
    let icsText:string|null=null, recoveredFromProvider=false;
    if (attachment) {
      if (!isCalendarAttachment(attachment)) return NextResponse.json({ error:'This attachment is not a calendar invitation.' }, { status:415 });
      if (attachment.security_status !== 'clean') return NextResponse.json({ error:'This calendar attachment has not passed attachment security checks.' }, { status:409 });
      const download=await ctx.db.storage.from(ATTACHMENT_BUCKET).download(attachment.storage_path); if (download.error||!download.data) return NextResponse.json({ error:'The calendar invitation file is unavailable.' }, { status:404 }); icsText=await download.data.text();
    } else if (message.provider_message_id) { icsText=await remoteCalendarText(String(message.provider_message_id),attachmentId); recoveredFromProvider=Boolean(icsText); }
    if (!icsText) return NextResponse.json({ error:'Calendar invitation not found.' }, { status:404 });
    const invite=parseIncomingMailInvite(icsText); if (!invite) return NextResponse.json({ error:'This invitation could not be resolved into a valid Calendar event.' }, { status:422 });

    const existingSelect='id,title,starts_at,ends_at,meeting_metadata,status';
    const byUid=await ctx.db.from('calendar_events').select(existingSelect).eq('organization_id',ctx.organizationId).eq('owner_user_id',ctx.userId).eq('meeting_metadata->>source_ics_uid',invite.uid).limit(1).maybeSingle();
    if (byUid.error) return NextResponse.json({ error:'Unable to check for an existing Calendar event.' }, { status:503 });
    let existing:any=byUid.data;
    if (!existing) {
      const byMessage=await ctx.db.from('calendar_events').select(existingSelect).eq('organization_id',ctx.organizationId).eq('owner_user_id',ctx.userId).eq('meeting_metadata->>source_message_id',messageId).limit(1).maybeSingle();
      if (byMessage.error) return NextResponse.json({ error:'Unable to check the previously imported Calendar event.' }, { status:503 });
      existing=byMessage.data;
    }
    const now=new Date().toISOString();
    const metadata={ ...(existing?.meeting_metadata && typeof existing.meeting_metadata==='object' ? existing.meeting_metadata : {}), source:'mail_ics', source_ics_uid:invite.uid, source_ics_sequence:invite.sequence, source_message_id:messageId, source_attachment_id:attachmentId, source_attachment_remote:recoveredFromProvider, organizer_email:invite.organizer?.email || message.from_address || null, organizer_name:invite.organizer?.name || null, source_ics_response: requestedResponse, source_ics_responded_at:now };
    const organizerEmail = invite.organizer?.email || message.from_address || null;
    const organizerLabel = invite.organizer?.name ? `${invite.organizer.name}${organizerEmail ? ` <${organizerEmail}>` : ''}` : organizerEmail;
    const cleanNotes = conciseInviteNotes(invite.description, invite.meetingUrl);
    const calendarDescription = [organizerLabel ? `Organizer: ${organizerLabel}` : '', cleanNotes].filter(Boolean).join('\n\n') || null;
    let event:any=existing;
    if (invite.method === 'CANCEL' || requestedResponse === 'declined') {
      if (existing) { const result=await ctx.db.from('calendar_events').update({ status:'cancelled',cancelled_at:now,meeting_metadata:metadata,updated_at:now }).eq('id',existing.id).eq('organization_id',ctx.organizationId).select('id,title,starts_at,ends_at').single(); if(result.error) { console.error('calendar-invite update cancelled failed',result.error); return NextResponse.json({error:'Unable to update this Calendar event.'},{status:500}); } event=result.data; }
    } else {
      const patch={ title:invite.title,description:calendarDescription,location:invite.location,starts_at:invite.startsAt,ends_at:invite.endsAt,timezone:invite.timezone,is_all_day:invite.isAllDay,status:requestedResponse==='tentative'?'tentative':'confirmed',cancelled_at:null,visibility:'organization',show_as:requestedResponse==='tentative'?'tentative':'busy',meeting_provider:invite.meetingUrl?'custom':'none',meeting_url:invite.meetingUrl,meeting_metadata:metadata,updated_at:now };
      if (existing) { const result=await ctx.db.from('calendar_events').update(patch).eq('id',existing.id).eq('organization_id',ctx.organizationId).select('id,title,starts_at,ends_at').single(); if(result.error) { console.error('calendar-invite update failed',result.error); return NextResponse.json({error:'Unable to update this invitation in Calendar.'},{status:500}); } event=result.data; }
      else { const result=await ctx.db.from('calendar_events').insert({ ...patch,organization_id:ctx.organizationId,owner_user_id:ctx.userId,created_by:ctx.userId }).select('id,title,starts_at,ends_at').single(); if(result.error||!result.data) { console.error('calendar-invite insert failed',result.error); return NextResponse.json({error:'Unable to add this invitation to Calendar.'},{status:500}); } event=result.data; }
      if (event?.id) await ensureDefaultReminder(ctx.db, ctx.organizationId, ctx.userId, event.id, event.starts_at || invite.startsAt);
    }
    let rsvpDelivered = true; let rsvpError: string | null = null;
    if (invite.method === 'REQUEST') {
      try { await sendReply({ from:ctx.mailbox.address, invite, response:requestedResponse }); }
      catch (error) { rsvpDelivered=false; rsvpError=error instanceof Error?error.message:'Unable to deliver organizer response.'; console.error('calendar-invite RSVP delivery failed',{messageId,inviteUid:invite.uid,error:rsvpError}); }
    }
    const result={ ok:true,existing:Boolean(existing),response:requestedResponse,event,eventRemoved:requestedResponse==='declined'||invite.method==='CANCEL',rsvpDelivered,rsvpError };
    if (parsed.form) {
      const target = event?.id && requestedResponse !== 'declined' ? `/calendar?eventId=${encodeURIComponent(event.id)}&inviteResponse=${encodeURIComponent(requestedResponse)}${rsvpDelivered?'':'&rsvpDelivery=pending'}` : `/mail?inviteResponse=${encodeURIComponent(requestedResponse)}${rsvpDelivered?'':'&rsvpDelivery=pending'}`;
      return NextResponse.redirect(new URL(target,request.url),303);
    }
    return NextResponse.json(result);
  } catch(error) { return fail(error); }
}
