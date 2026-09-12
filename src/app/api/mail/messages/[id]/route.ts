import { NextRequest, NextResponse } from 'next/server';
import { mailOrganizerContext, MailAccessError, MAIL_MESSAGE_FIELDS } from '@/lib/mail/organizer-context';
import { isMailId } from '@/lib/mail/organization';
import { sanitizeMailHtml, plainTextToMailHtml } from '@/lib/mail/safe-html';
import { incomingInviteCardHtml, parseIncomingMailInvite } from '@/lib/calendar/incoming-mail-invite';
export const dynamic = 'force-dynamic';
const RESEND_API = 'https://api.resend.com';
const ATTACHMENT_BUCKET = 'setu-mail-attachments';
const MAX_REMOTE_ICS_BYTES = 256 * 1024;

function failure(error: unknown) { return NextResponse.json({ error: error instanceof MailAccessError ? error.message : 'Unable to update message.' }, { status: error instanceof MailAccessError ? error.status : 500 }); }
async function resendGet(path: string) {
  const apiKey = process.env.RESEND_API_KEY; if (!apiKey) return null;
  try { const response=await fetch(`${RESEND_API}${path}`,{headers:{Authorization:`Bearer ${apiKey}`},cache:'no-store',signal:AbortSignal.timeout(10000)}); return response.ok?await response.json().catch(()=>null):null; } catch { return null; }
}
function isCalendarAttachment(item: { content_type?: unknown; filename?: unknown }) { return String(item.content_type||'').toLowerCase().startsWith('text/calendar')||String(item.filename||'').toLowerCase().endsWith('.ics'); }
async function remoteCalendarRows(providerMessageId: string | null, messageId: string) {
  if (!providerMessageId) return [];
  const payload=await resendGet(`/emails/receiving/${encodeURIComponent(providerMessageId)}/attachments`); const rows=Array.isArray(payload?.data)?payload.data:[];
  return rows.filter(isCalendarAttachment).map((item:any)=>({id:String(item.id||''),message_id:messageId,filename:String(item.filename||'calendar-invite.ics'),content_type:String(item.content_type||'text/calendar'),size_bytes:Number(item.size||0)||null,created_at:new Date().toISOString(),security_status:'remote_calendar',scan_provider:'resend',scan_signature:null,scanned_at:null,remote_calendar:true,download_url:String(item.download_url||'')})).filter((item:any)=>isMailId(item.id));
}
async function localCalendarText(db:any, attachment:any) {
  if (!attachment?.storage_path || attachment.security_status!=='clean') return null;
  const download=await db.storage.from(ATTACHMENT_BUCKET).download(attachment.storage_path); if(download.error||!download.data)return null;
  const text=await download.data.text(); return text.length<=MAX_REMOTE_ICS_BYTES?text:null;
}
async function remoteCalendarText(attachment:any) {
  const url=String(attachment?.download_url||''); if(!url.startsWith('https://')||Number(attachment?.size_bytes||0)>MAX_REMOTE_ICS_BYTES)return null;
  try { const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(10000)}); if(!response.ok)return null; const buffer=await response.arrayBuffer(); return buffer.byteLength<=MAX_REMOTE_ICS_BYTES?new TextDecoder().decode(buffer):null; } catch { return null; }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx=await mailOrganizerContext(request); if(!isMailId(params.id))return NextResponse.json({error:'Invalid message id.'},{status:400});
    const [message,attachments]=await Promise.all([
      ctx.db.from('mail_messages').select(`${MAIL_MESSAGE_FIELDS},provider_message_id`).eq('id',params.id).eq('organization_id',ctx.organizationId).eq('mailbox_id',ctx.mailbox.id).maybeSingle(),
      ctx.db.from('mail_attachments').select('id,message_id,filename,content_type,size_bytes,created_at,security_status,scan_provider,scan_signature,scanned_at,storage_path').eq('message_id',params.id).eq('organization_id',ctx.organizationId).eq('mailbox_id',ctx.mailbox.id),
    ]);
    if(message.error||attachments.error)return NextResponse.json({error:'Unable to load the complete message. Please try again.'},{status:503});
    if(!message.data)return NextResponse.json({error:'Message not found.'},{status:404});
    const {provider_message_id:providerMessageId,...messageFields}=message.data as any;
    const localAttachments=attachments.data??[]; const remoteCalendar=localAttachments.some(isCalendarAttachment)?[]:await remoteCalendarRows(String(providerMessageId||'')||null,params.id);
    const allAttachments=[...localAttachments,...remoteCalendar];
    const calendarAttachment=allAttachments.find(isCalendarAttachment) as any;
    let calendarInvite:any=null; let calendarCard='';
    if(calendarAttachment){
      const icsText=calendarAttachment.remote_calendar?await remoteCalendarText(calendarAttachment):await localCalendarText(ctx.db,calendarAttachment);
      const invite=icsText?parseIncomingMailInvite(icsText):null;
      if(invite){
        const {data:existing}=await ctx.db.from('calendar_events').select('id,status,meeting_metadata').eq('organization_id',ctx.organizationId).eq('owner_user_id',ctx.userId).contains('meeting_metadata',{source_ics_uid:invite.uid}).limit(1).maybeSingle();
        const response=existing?.meeting_metadata?.source_ics_response||null;
        calendarInvite={...invite,response,eventId:existing?.id||null};
        calendarCard=incomingInviteCardHtml({invite,messageId:params.id,attachmentId:calendarAttachment.id,mailboxId:ctx.mailbox.id,mailboxAddress:ctx.mailbox.address,response});
      }
    }
    const htmlBody=calendarCard ? calendarCard : (sanitizeMailHtml(messageFields.html_body)||null);
    const safeMessage={...messageFields,html_body:htmlBody};
    const visibleAttachments=calendarInvite?allAttachments.filter(item=>item.id!==calendarAttachment.id):allAttachments;
    return NextResponse.json({message:safeMessage,attachments:visibleAttachments,calendarInvite},{headers:{'Cache-Control':'private, no-store'}});
  } catch(error){return failure(error);}
}

export async function PATCH(request: NextRequest,{params}:{params:{id:string}}){
  try{
    const ctx=await mailOrganizerContext(request); if(!ctx.canMove)return NextResponse.json({error:'This mailbox is read-only for your account.'},{status:403}); if(!isMailId(params.id))return NextResponse.json({error:'Invalid message id.'},{status:400});
    const {db,organizationId,mailbox}=ctx; const {data:message,error:readError}=await db.from('mail_messages').select('id,direction,status,folder').eq('id',params.id).eq('organization_id',organizationId).eq('mailbox_id',mailbox.id).maybeSingle();
    if(readError)return NextResponse.json({error:'Unable to load message.'},{status:500}); if(!message)return NextResponse.json({error:'Message not found.'},{status:404});
    const body=await request.json().catch(()=>null) as Record<string,unknown>|null; let action=String(body?.action??'').trim(); let value=body?.value;
    if(!action)for(const key of ['read','star','archive','trash']){if(typeof body?.[key]==='boolean'){action=key;value=body[key];break;}}
    if(!['read','star','archive','trash'].includes(action)||(value!==undefined&&typeof value!=='boolean'))return NextResponse.json({error:'Choose a valid message action and boolean value.'},{status:400});
    const enabled=value!==false; if(action==='archive'&&message.status==='draft')return NextResponse.json({error:'Drafts can be edited or moved to Trash, not archived.'},{status:409});
    const now=new Date().toISOString(); const restoreFolder=message.status==='draft'?'drafts':message.direction==='outbound'?'sent':'inbox'; let patch:Record<string,unknown>={updated_at:now};
    if(action==='read')patch.is_read=enabled; else if(action==='star')patch.is_starred=enabled; else if(action==='archive')patch={...patch,custom_folder_id:null,archived_at:enabled?now:null,trashed_at:null,folder:enabled?'archive':restoreFolder}; else if(action==='trash')patch={...patch,custom_folder_id:null,trashed_at:enabled?now:null,archived_at:null,folder:enabled?'trash':restoreFolder};
    const {data,error}=await db.from('mail_messages').update(patch).eq('id',params.id).eq('organization_id',organizationId).eq('mailbox_id',mailbox.id).eq('status',message.status).select(MAIL_MESSAGE_FIELDS).maybeSingle();
    if(error)return NextResponse.json({error:'Unable to update message.'},{status:500}); if(!data)return NextResponse.json({error:'The message changed. Refresh mail and try again.'},{status:409}); return NextResponse.json({ok:true,message:data},{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){return failure(error);}
}
