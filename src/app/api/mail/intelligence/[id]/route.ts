import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace } from '@/lib/workspace/auth';
import { resolveUserMailbox } from '@/lib/mail/resolve-user-mailbox';
import { matchCommunicationIdentity, primaryIdentityMatch } from '@/lib/contacts/identity';

export const dynamic = 'force-dynamic';

type Intent = { key:string; label:string; confidence:'high'|'medium'; suggestedAction:string; evidence:string; actionLabel:string|null; actionHref:string|null };
type IntentRule = { key:string; label:string; confidence:'high'|'medium'; suggestedAction:string; pattern:RegExp };
const RULES: IntentRule[] = [
  {key:'meeting',label:'Meeting request',confidence:'high',suggestedAction:'Review the conversation and schedule a meeting.',pattern:/\b(meet|meeting|schedule a call|book a call|available (?:on|for)|calendar invite|zoom)\b/i},
  {key:'rfq',label:'RFQ / pricing request',confidence:'high',suggestedAction:'Review the request and start the commercial workflow.',pattern:/\b(rfq|request for quote|quotation|please quote|price for|pricing for)\b/i},
  {key:'purchase_order',label:'Purchase order',confidence:'high',suggestedAction:'Review the PO against the related commercial record before changing execution state.',pattern:/\b(purchase order|po\b|attached po|po number|order confirmation)\b/i},
  {key:'follow_up',label:'Follow-up signal',confidence:'medium',suggestedAction:'Review the conversation and confirm the next follow-up.',pattern:/\b(follow up|following up|checking in|any update|status update|haven't heard|have not heard)\b/i},
  {key:'execution_risk',label:'Execution risk',confidence:'high',suggestedAction:'Review the lead/order context and execution timeline before committing.',pattern:/\b(delay|delayed|late|postpone|cannot meet|can't meet|shortage|issue with production)\b/i},
  {key:'sample_request',label:'Sample request',confidence:'medium',suggestedAction:'Review the lead and capture the sample requirement as the next action.',pattern:/\b(sample|samples|send sample|sample order)\b/i},
];
function evidence(subject:string,text:string,p:RegExp){const s=`${subject?`Subject: ${subject}. `:''}${text}`.replace(/\s+/g,' ').trim(),m=p.exec(s);if(!m)return s.slice(0,140);const a=Math.max(0,m.index-55),b=Math.min(s.length,m.index+m[0].length+75);return`${a?'…':''}${s.slice(a,b).trim()}${b<s.length?'…':''}`.slice(0,180)}
function action(key:string,leadId:string|null,peer:string,threadId:string|null){if(key==='meeting')return{actionLabel:'Schedule meeting',actionHref:`/calendar?compose=1${peer?`&guest=${encodeURIComponent(peer)}`:''}${leadId?`&lead=${leadId}`:''}${threadId?`&mailThread=${threadId}`:''}`};if(!leadId)return{actionLabel:null,actionHref:null};if(key==='rfq')return{actionLabel:'Start RFQ',actionHref:`/leads/${leadId}/rfq/new`};if(key==='quote_acceptance')return{actionLabel:'Review quote',actionHref:`/leads/${leadId}/quote`};if(key==='follow_up')return{actionLabel:'Open follow-up',actionHref:`/leads/${leadId}`};return{actionLabel:'Open lead',actionHref:`/leads/${leadId}`}}
function detect(subject:string,text:string,leadId:string|null,peer:string,threadId:string|null):Intent[]{const v=`${subject}\n${text}`,out:Intent[]=[];if(/\b(approved|accept(?:ed)?|proceed|go ahead|confirmed)\b/i.test(v)&&/\b(quote|quotation|proposal|price)\b/i.test(v)){const p=/\b(approved|accept(?:ed)?|proceed|go ahead|confirmed|quote|quotation|proposal|price)\b/i;out.push({key:'quote_acceptance',label:'Quote acceptance',confidence:'high',suggestedAction:'Review the approved commercial terms before converting anything to an order.',evidence:evidence(subject,text,p),...action('quote_acceptance',leadId,peer,threadId)})}for(const r of RULES)if(r.pattern.test(v)&&!out.some(x=>x.key===r.key))out.push({key:r.key,label:r.label,confidence:r.confidence,suggestedAction:r.suggestedAction,evidence:evidence(subject,text,r.pattern),...action(r.key,leadId,peer,threadId)});if(peer&&!out.some(x=>x.key==='meeting'||x.key==='schedule_meeting'))out.push({key:'schedule_meeting',label:'Schedule meeting',confidence:'medium',suggestedAction:'Schedule time from this conversation when a live discussion would help.',evidence:'Setu will carry the recipient, Mail conversation and available CRM context into Calendar.',...action('meeting',leadId,peer,threadId)});return out.slice(0,5)}
function senderName(metadata:any){const raw=String(metadata?.headers?.from??'');const match=raw.match(/^\s*"?([^"<]+?)"?\s*<[^>]+>/);return match?.[1]?.trim()||'';}

export async function GET(_:Request,{params}:{params:{id:string}}){
  const w=await getCurrentWorkspace();
  if(!w.user)return NextResponse.json({error:'Authentication required.'},{status:401});
  if(!w.organization||!w.membership)return NextResponse.json({error:'Active workspace required.'},{status:403});
  const db=(await createClient())as any,org=w.organization.id;
  const[{data:grant},mailbox]=await Promise.all([db.from('org_module_grants').select('enabled').eq('organization_id',org).eq('module_key','setu_mail').maybeSingle(),resolveUserMailbox(db,org,w.user.id,'id,address,status')]);
  if(!grant?.enabled)return NextResponse.json({error:'Setu Communications is not enabled for this organization.'},{status:403});
  if(!mailbox)return NextResponse.json({error:'Mailbox not found.'},{status:404});
  const{data:m}=await db.from('mail_messages').select('id,direction,from_address,to_addresses,subject,text_body,thread_id,metadata').eq('id',params.id).eq('mailbox_id',mailbox.id).maybeSingle();
  if(!m)return NextResponse.json({error:'Message not found.'},{status:404});
  const peer=String(m.direction==='inbound'?m.from_address:m.to_addresses?.[0]??'').trim().toLowerCase();
  const identity=await matchCommunicationIdentity(db,org,peer);const primary=primaryIdentityMatch(identity);const lead=identity.records[0]??null;
  const{data:explicitLinks}=m.thread_id?await db.from('mail_crm_links').select('id,entity_type,entity_id,created_at').eq('organization_id',org).eq('mailbox_id',mailbox.id).eq('thread_id',m.thread_id):{data:[]};
  const relationship=identity.contact?.relationship_type?` · ${identity.contact.relationship_type}`:'';
  const crmMatch=primary?{...primary,company_name:identity.contact?`${identity.contact.company||primary.company_name||identity.contact.email}${relationship}`:primary.company_name,href:`/mail/crm-context/${m.id}`} : null;
  const createLeadHref=peer?`/leads?quickLead=1&leadType=buyer&sourceType=setu_mail&sourceLabel=${encodeURIComponent(`Setu Mail · ${peer}`)}`:'/leads?quickLead=1&sourceType=setu_mail&sourceLabel=Setu%20Mail';
  const name=senderName(m.metadata),parts=name.split(/\s+/).filter(Boolean);const firstName=parts.shift()??'',lastName=parts.join(' ');
  const createContactHref=identity.contact?null:`/contacts?create=1&email=${encodeURIComponent(peer)}${firstName?`&firstName=${encodeURIComponent(firstName)}`:''}${lastName?`&lastName=${encodeURIComponent(lastName)}`:''}`;
  const intents=detect(String(m.subject??''),String(m.text_body??''),lead?.id??null,peer,m.thread_id);
  if(m.direction==='inbound'&&peer&&!identity.contact&&createContactHref)intents.unshift({key:'save_contact',label:'Save sender to Contacts',confidence:'high',suggestedAction:'Keep this sender available for future Mail and Calendar conversations without creating a Lead.',evidence:name?`${name} · ${peer}`:peer,actionLabel:'Create contact',actionHref:createContactHref});
  return NextResponse.json({messageId:m.id,mailThreadId:m.thread_id,peerAddress:peer,identity,crmMatch,explicitLinks:explicitLinks??[],createContactHref,createLeadHref,createCrmHref:identity.records.length?null:createLeadHref,contextHref:`/mail/crm-context/${m.id}`,intents:intents.slice(0,6),autonomousActions:false});
}
