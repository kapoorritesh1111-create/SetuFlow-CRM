import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { getLeadProfileData } from '@/lib/queries/leads';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import LeadCommandCenterPremium from '@/features/leads/canonical/LeadCommandCenterPremium';
import WorkflowToast from '@/features/leads/canonical/WorkflowToast';
import { StarkCommunicationsLauncher } from '@/features/leads/canonical/StarkCommunicationsDrawer';
import { ResearchDrawerLauncher } from '@/features/setu-guru/research-drawer';
import { OutreachGeneratorLauncher } from '@/features/setu-guru/outreach-generator-panel';
import { ReplyAnalyzerLauncher } from '@/features/setu-guru/reply-analyzer-modal';
import { QuoteAssistantLauncher } from '@/features/setu-guru/quote-assistant-panel';
import { SupplierRfqAssistantLauncher } from '@/features/setu-guru/supplier-rfq-assistant-panel';
import { LeadGuruTools } from '@/features/setu-guru/lead-guru-tools';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const WHATSAPP_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;
function readParam(value?: string | string[]) { return Array.isArray(value) ? value[0] ?? '' : value ?? ''; }
function leadsBackHref(value?: string | string[]) { const mode=readParam(value).trim(); return mode?`/leads?mode=${encodeURIComponent(mode)}`:'/leads'; }
function savedMessage(value?: string | string[]) { const saved=readParam(value).trim(); if(saved==='lead')return'Lead details saved.';if(saved==='follow-up')return'Follow-up updated.';if(saved==='qualification')return'Qualification and mapping saved.';if(saved==='stage')return'Lead stage updated.';if(saved==='owner')return'Lead owner reassigned.';return''; }
function occurredAt(item:any){return item.sent_at||item.received_at||item.created_at||new Date().toISOString();}

async function getStarkCommunicationContext(organizationId:string,leadId:string,data:any){
 const db=createAdminSupabaseClient() as any;
 const base=(data.communications??[]).map((item:any)=>({id:`comm-${item.id}`,channel:String(item.channel||'system').toLowerCase(),direction:String(item.direction||'internal').toLowerCase(),body:item.body||item.summary||'',subject:item.subject||null,occurredAt:occurredAt(item),actorName:null,status:item.email_delivery_status||item.status||null}));
 if(!db)return{items:base,linkedInterakt:false,whatsappReplyWindowOpen:false};
 const{data:intake}=await db.from('lead_intake_staging').select('id,last_inbound_at').eq('organization_id',organizationId).eq('source_provider','interakt').eq('qualified_lead_id',leadId).order('last_inbound_at',{ascending:false}).limit(1).maybeSingle();
 let items=[...base];
 if(intake?.id){
   const{data:messages}=await db.from('lead_intake_messages').select('id,direction,actor_name,message_type,message_text,media_url,status,received_at,sent_at,created_at').eq('organization_id',organizationId).eq('intake_id',intake.id).order('created_at',{ascending:true}).limit(500);
   const existingProviderIds=new Set((data.communications??[]).map((x:any)=>String(x.provider_message_id||'')).filter(Boolean));
   for(const msg of messages??[]){if(existingProviderIds.has(String(msg.id)))continue;items.push({id:`wa-${msg.id}`,channel:'whatsapp',direction:String(msg.direction||'inbound').toLowerCase(),body:msg.message_text||msg.message_type||'WhatsApp activity',occurredAt:occurredAt(msg),actorName:msg.actor_name||null,status:msg.status||null,attachmentName:msg.media_url?'WhatsApp attachment':null});}
 }
 const seen=new Set<string>();items=items.sort((a:any,b:any)=>new Date(a.occurredAt).getTime()-new Date(b.occurredAt).getTime()).filter((x:any)=>{const key=`${x.channel}|${x.direction}|${x.body}|${x.occurredAt}`;if(seen.has(key))return false;seen.add(key);return true;});
 const lastInbound=intake?.last_inbound_at?new Date(intake.last_inbound_at).getTime():NaN;
 return{items,linkedInterakt:Boolean(intake?.id),whatsappReplyWindowOpen:Number.isFinite(lastInbound)&&Date.now()-lastInbound>=0&&Date.now()-lastInbound<=WHATSAPP_REPLY_WINDOW_MS};
}

export default async function Page({params,searchParams}:{params:{leadId:string};searchParams?:{saved?:string|string[];stageError?:string|string[];mode?:string|string[]}}){
 let workspace:Awaited<ReturnType<typeof getWorkspaceAccess>>|null=null;try{workspace=await getWorkspaceAccess();}catch{return<EmptyState title="Workspace unavailable" description="We were unable to load your workspace. Please refresh or try again later."/>;}
 if(!hasSupabaseEnv||workspace?.missingEnv)return<EmptyState title="Configuration required" description="SETU Flow needs Supabase environment values in the current environment."/>;
 if(!workspace?.membership||!workspace?.organization)return<EmptyState title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded."/>;
 const data=await getLeadProfileData(workspace.organization.id,params.leadId);if(!data?.lead)return<EmptyState title="Lead not found" description="The requested lead could not be loaded from the active workspace."/>;
 const toastMessage=savedMessage(searchParams?.saved),hasStageError=Boolean(readParam(searchParams?.stageError).trim()),teamMembers=data.profiles.map((profile:any)=>({id:profile.id,name:profile.full_name||profile.username||'Team member'}));
 const isStark=workspace.organization.id===STARK_PACKMATE_ORG_ID||String(workspace.organization.slug??'').toLowerCase()==='starkpackmate';
 const communications=isStark?await getStarkCommunicationContext(workspace.organization.id,data.lead.id,data):null;
 return<>
  {toastMessage?<WorkflowToast kind="success" message={toastMessage}/>:null}{hasStageError?<WorkflowToast kind="warning" message="Lead action needs attention. Please refresh and try again."/>:null}
  <div className="mx-auto mb-3 flex w-full max-w-[1180px] justify-end px-1">
   {isStark&&communications?<StarkCommunicationsLauncher leadId={data.lead.id} companyName={data.lead.company_name||data.lead.contact_name||'Lead'} contactName={data.lead.contact_name||'Customer'} email={data.lead.email} whatsappNumber={data.lead.whatsapp_number||data.lead.phone} items={communications.items as any} linkedInterakt={communications.linkedInterakt} whatsappReplyWindowOpen={communications.whatsappReplyWindowOpen}/>:null}
  </div>
  <LeadGuruTools><ResearchDrawerLauncher leadId={data.lead.id} leadType={data.lead.lead_type}/><OutreachGeneratorLauncher leadId={data.lead.id} email={data.lead.email} phone={data.lead.phone} whatsappNumber={data.lead.whatsapp_number}/><ReplyAnalyzerLauncher leadId={data.lead.id}/>{String(data.lead.lead_type??'').toLowerCase()==='supplier'?<SupplierRfqAssistantLauncher leadId={data.lead.id}/>:<QuoteAssistantLauncher leadId={data.lead.id}/>}</LeadGuruTools>
  <LeadCommandCenterPremium data={data} canReassignOwner={workspace.canAccessAdmin} teamMembers={teamMembers} backHref={leadsBackHref(searchParams?.mode)}/>
 </>;
}
