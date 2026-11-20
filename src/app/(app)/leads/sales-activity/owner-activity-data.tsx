import Link from 'next/link';
import { SalesActivityView } from './SalesActivityView';
import { redirect } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';
import { classifyInboundNextAction } from '@/features/integrations/interakt/inbound-action-classification';

export const dynamic = 'force-dynamic';
const STARK = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const ZONE = 'Asia/Kolkata';
const OWNER_ROLES = new Set(['owner', 'admin']);
type Bucket = {
  id: string; name: string; inboundAttempted: number; inboundConnected: number; inboundUnanswered: number;
  crmAttempted: number; crmConnected: number; crmUnanswered: number; crmUnknown: number; inboundFollowUps: number; crmFollowUps: number; verifiedQuoteSends: number;
  meetingsScheduled: number; meetingsDone: number; walkIns: number; noShow: number; cancelled: number; rescheduled: number; converted: number; won: number; lost: number;
};
function localDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function startOfDay(date: string): string {
  return new Date(date + 'T00:00:00+05:30').toISOString();
}
function nextDay(date: string): string {
  const [year,month,day] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0,10);
}
function normalizedDisposition(value: unknown) {
  return String(value ?? '').trim().toLowerCase().replace(/[_-]/g, ' ');
}
async function allRows(query: () => any): Promise<{rows:any[]; capped:boolean}> {
  const rows: any[] = [];
  for (let page=0; page<20; page++) {
    const {data,error} = await query().range(page*1000,page*1000+999);
    if (error) throw error;
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < 1000) return {rows,capped:false};
  }
  return {rows,capped:true};
}

export async function StarkSalesActivityDashboard({searchParams = {}}: {searchParams?:{period?:string;from?:string;to?:string;user?:string;tab?:string;metric?:string;queue?:string;review?:string;outcome?:string}}) {
  const workspace = await requireWorkspace();
  if (workspace.organization?.id !== STARK || !workspace.user) redirect('/dashboard');
  if (!workspace.currentRoles.some(role=>OWNER_ROLES.has(String(role).toLowerCase()))) redirect('/dashboard?mode=all');
  const db = createAdminSupabaseClient() as any;
  if (!db) throw new Error('Database not available');
  const today = localDate(new Date());
  const period = ['today','7','30','custom'].includes(searchParams.period||'') ? String(searchParams.period) : '7';
  const tab = searchParams.tab === 'crm' ? 'crm' : 'inbound';
  const days = period==='today'?1:period==='30'?30:7;
  const computedFrom = localDate(new Date(Date.now()-(days-1)*86400000));
  const validDate = (v:string|undefined) => /^\d{4}-\d{2}-\d{2}$/.test(v||'') && Number.isFinite(new Date(String(v)).getTime());
  const fromDate = period==='custom' && validDate(searchParams.from) ? String(searchParams.from) : computedFrom;
  const toDate = period==='custom' && validDate(searchParams.to) ? String(searchParams.to) : today;
  const span = (Date.parse(toDate)-Date.parse(fromDate))/86400000;
  if (span<0 || span>30) return <main className="p-6"><p>Choose a date range of up to 31 days.</p><Link href="/dashboard">Reset filters</Link></main>;
  const from = startOfDay(fromDate), until = startOfDay(nextDay(toDate));
  const [inbound,crm,meetings,converted,history,crmFollows,inboundFollowEvents,quoteEvents] = await Promise.all([
    allRows(()=>db.from('lead_intake_messages').select('id,intake_id,message_payload,sent_at,created_at').eq('organization_id',STARK).eq('event_type','call_logged').gte('created_at',from).lt('created_at',until).order('created_at',{ascending:true})),
    allRows(()=>db.from('crm_call_logs').select('id,actor_user_id,lead_id,intake_id,source_path,status,disposition,created_at,completed_at').eq('organization_id',STARK).gte('created_at',from).lt('created_at',until).order('created_at',{ascending:true})),
    allRows(()=>db.from('calendar_events').select('id,owner_user_id,created_by,created_at,meeting_metadata,starts_at').eq('organization_id',STARK).eq('meeting_metadata->>sales_meeting','true').order('created_at',{ascending:true}).limit(20000)),
    allRows(()=>db.from('lead_intake_staging').select('id,qualified_by,qualified_at,qualified_lead_id').eq('organization_id',STARK).not('qualified_lead_id','is',null).gte('qualified_at',from).lt('qualified_at',until).order('qualified_at',{ascending:true})),
    allRows(()=>db.from('lead_stage_history').select('id,lead_id,to_stage_id,changed_by,changed_at').eq('organization_id',STARK).gte('changed_at',from).lt('changed_at',until).order('changed_at',{ascending:true})),
    allRows(()=>db.from('lead_activities').select('id,lead_id,actor_user_id,occurred_at').eq('organization_id',STARK).eq('kind','follow_up_completed').gte('occurred_at',from).lt('occurred_at',until).order('occurred_at',{ascending:true})),
    allRows(()=>db.from('lead_intake_messages').select('id,intake_id,message_payload,created_at').eq('organization_id',STARK).eq('event_type','follow_up_completed').gte('created_at',from).lt('created_at',until).order('created_at',{ascending:true})),
    allRows(()=>db.from('quote_negotiation_events').select('id,quote_id,actor_user_id,created_at').eq('event_type','sent').gte('created_at',from).lt('created_at',until).order('created_at',{ascending:true}))
  ]);
  const stageIds=[...new Set(history.rows.map((r:any)=>r.to_stage_id).filter(Boolean))];
  let stageById=new Map<string,{is_won:boolean;is_lost:boolean}>();
  if(stageIds.length){
    const {data,error}=await db.from('pipeline_stages').select('id,is_won,is_lost').in('id',stageIds);
    if(error)throw error;
    stageById=new Map((data||[]).map((r:any)=>[r.id,{is_won:!!r.is_won,is_lost:!!r.is_lost}]));
  }
  const drill: Array<{type:string;metric:string;actor:string;when:string;record:string;url:string;outcome:string}> = [];
  const eventIds = new Set<string>();
  const buckets = new Map<string,Bucket>();
  function get(id: unknown): Bucket {
    const key = String(id||'unknown');
    let b=buckets.get(key);
    if (!b){b={id:key,name:key==='unknown'?'Unattributed activity':key,inboundAttempted:0,inboundConnected:0,inboundUnanswered:0,crmAttempted:0,crmConnected:0,crmUnanswered:0,crmUnknown:0,inboundFollowUps:0,crmFollowUps:0,verifiedQuoteSends:0,meetingsScheduled:0,meetingsDone:0,walkIns:0,noShow:0,cancelled:0,rescheduled:0,converted:0,won:0,lost:0};buckets.set(key,b);}
    return b;
  }
  const isPeriod = (v:unknown)=>{const d=Date.parse(String(v||''));return Number.isFinite(d)&&d>=Date.parse(from)&&d<Date.parse(until);};
  for(const event of inbound.rows){
    if(eventIds.has('inbound:'+event.id)) continue;
    eventIds.add('inbound:'+event.id);
    const b=get(event.message_payload?.actor_user_id);
    b.inboundAttempted++;
    const outcome=normalizedDisposition(event.message_payload?.disposition);
    if(outcome==='connected')b.inboundConnected++;
    if(outcome==='no answer')b.inboundUnanswered++;
    drill.push({type:'Inbound call',metric:outcome==='connected'?'inboundConnected':outcome==='no answer'?'inboundUnanswered':'inboundAttempted',actor:b.id,when:event.sent_at||event.created_at,record:event.intake_id,url:'/leads/inbound?review='+encodeURIComponent(event.intake_id),outcome:outcome||'Unknown'});
  }
  const inboundMessageCalls=inbound.rows.map((event:any)=>({
    actor:String(event.message_payload?.actor_user_id||'unknown'),
    intake:String(event.intake_id||''),
    at:Date.parse(event.created_at)
  }));
  for(const event of crm.rows){
    if(eventIds.has('crm:'+event.id)) continue;
    eventIds.add('crm:'+event.id);
    const b=get(event.actor_user_id);
    const inboundContext=String(event.source_path||'').startsWith('/leads/inbound') || (event.intake_id&&!event.lead_id);
    const duplicateInbound=inboundContext&&inboundMessageCalls.some(message=>
      message.actor===b.id && message.intake===String(event.intake_id||'') &&
      Math.abs(message.at-Date.parse(event.created_at))<=120000);
    if(duplicateInbound)continue;
    if(inboundContext)b.inboundAttempted++;else b.crmAttempted++;
    const outcome=normalizedDisposition(event.disposition);
    if(outcome==='connected'){if(inboundContext)b.inboundConnected++;else b.crmConnected++;}
    else if(outcome==='no answer'){if(inboundContext)b.inboundUnanswered++;else b.crmUnanswered++;}
    else if(!outcome&&!inboundContext)b.crmUnknown++;
    const record=event.lead_id||event.intake_id||'';
    drill.push({type:inboundContext?'Inbound call':'CRM call',metric:inboundContext?(outcome==='connected'?'inboundConnected':outcome==='no answer'?'inboundUnanswered':'inboundAttempted'):(outcome==='connected'?'crmConnected':outcome==='no answer'?'crmUnanswered':!outcome?'crmUnknown':'crmAttempted'),actor:b.id,when:event.completed_at||event.created_at,record,url:event.lead_id?'/leads/'+encodeURIComponent(event.lead_id):event.intake_id?'/leads/inbound?review='+encodeURIComponent(event.intake_id):'',outcome:outcome||'Unknown'});
  }
  for(const event of meetings.rows){
    const meta=event.meeting_metadata||{};
    if(meta.sales_meeting!==true)continue;
    const creator=get(event.created_by||event.owner_user_id);
    if(isPeriod(event.created_at)) creator.meetingsScheduled++;
    if(meta.meeting_status==='completed' && isPeriod(meta.completed_at)){
      const completed=get(meta.completed_by||(meta.booking_type==='walk_in'?event.created_by:null));
      completed.meetingsDone++;
      drill.push({type:'Meeting Done',metric:'meetingsDone',actor:completed.id,when:String(meta.completed_at),record:String(meta.entity_id||event.id),url:meta.entity_type==='lead'?'/leads/'+encodeURIComponent(String(meta.entity_id)):'/leads/inbound?review='+encodeURIComponent(String(meta.entity_id||'')),outcome:String(meta.outcome||'Completed')});
      if(meta.booking_type==='walk_in') completed.walkIns++;
    }
    const history=Array.isArray(meta.history)?meta.history:[];
    for(const h of history){
      if(!isPeriod(h.at))continue;
      const actor=get(h.by);
      if(h.action==='rescheduled')actor.rescheduled++;
      else if(h.action==='no_show')actor.noShow++;
      else if(h.action==='cancelled')actor.cancelled++;
    }
  }
  for(const row of converted.rows){
    const b=get(row.qualified_by); b.converted++;
    drill.push({type:'Converted lead',metric:'converted',actor:b.id,when:row.qualified_at,record:row.qualified_lead_id,url:'/leads/'+encodeURIComponent(row.qualified_lead_id),outcome:'Converted to CRM'});
  }
  for(const row of history.rows){
    const stage=stageById.get(row.to_stage_id);
    if(!stage || (!stage.is_won&&!stage.is_lost))continue;
    const b=get(row.changed_by);
    const metric=stage.is_won?'won':'lost';
    b[metric]++;
    drill.push({type:'Lead outcome',metric,actor:b.id,when:row.changed_at,record:row.lead_id,url:'/leads/'+encodeURIComponent(row.lead_id),outcome:stage.is_won?'Won':'Lost'});
  }
  const [activeInbound,activeCrm] = await Promise.all([
    allRows(()=>db.from('lead_intake_staging').select('id,source_provider,contact_name,person_name,company_name,full_phone_number,setu_assigned_user_id,last_inbound_at,last_outbound_at,intake_status,qualified_lead_id,sales_queue_suppressed,browsing_only').eq('organization_id',STARK).in('source_provider',['interakt','indiamart']).order('created_at',{ascending:true})),
    allRows(()=>db.from('leads').select('id,owner_user_id,stage_id').eq('organization_id',STARK).order('created_at',{ascending:true}))
  ]);
  type Workload={inbound:number;replyNow:number;reconnect:number;crm:number;wonCurrent:number;lostCurrent:number;convertedWon:number};
  const workload=new Map<string,Workload>();
  function currentOwner(id:unknown):Workload {
    const key=String(id||'unknown');
    get(key);
    let w=workload.get(key);
    if(!w){w={inbound:0,replyNow:0,reconnect:0,crm:0,wonCurrent:0,lostCurrent:0,convertedWon:0};workload.set(key,w);}
    return w;
  }
  for(const row of activeInbound.rows) {
    if(row.qualified_lead_id||row.sales_queue_suppressed||row.browsing_only||['qualified','duplicate','existing_customer','not_relevant','ignored'].includes(row.intake_status)) continue;
    const w=currentOwner(row.setu_assigned_user_id);
    w.inbound++;
    const action=classifyInboundNextAction(row);
    if(action==='reply_now')w.replyNow++;
    else if(action==='reconnect')w.reconnect++;
  }
  const currentStageIds=[...new Set(activeCrm.rows.map((row:any)=>row.stage_id).filter(Boolean))];
  // Stage changes during the period and current pipeline status are different metrics.
  const allStageIds=[...new Set([...stageIds,...currentStageIds])];
  if(allStageIds.length){
    const {data,error}=await db.from('pipeline_stages').select('id,is_won,is_lost').in('id',allStageIds);
    if(error)throw error;
    stageById=new Map((data||[]).map((row:any)=>[row.id,{is_won:!!row.is_won,is_lost:!!row.is_lost}]));
  }
  const leadById=new Map<string,any>(activeCrm.rows.map((row:any)=>[row.id,row]));
  for(const row of activeCrm.rows){
    const current=currentOwner(row.owner_user_id);
    current.crm++;
    const stage=stageById.get(row.stage_id);
    if(stage?.is_won)current.wonCurrent++;
    else if(stage?.is_lost)current.lostCurrent++;
  }
  const [allConvertedIntakes]=await Promise.all([allRows(()=>db.from('lead_intake_staging').select('qualified_lead_id').eq('organization_id',STARK).not('qualified_lead_id','is',null).order('created_at',{ascending:true}))]);
  const uniqueConvertedLeadIds=new Set(allConvertedIntakes.rows.map((row:any)=>String(row.qualified_lead_id)).filter(Boolean));
  const outcomeRows=activeCrm.rows.flatMap((lead:any)=>{
    const stage=stageById.get(lead.stage_id);
    const outcome=stage?.is_won?'won':stage?.is_lost?'lost':null;
    if(!outcome)return [];
    return [{id:lead.id,ownerId:String(lead.owner_user_id||'unknown'),outcome,
      convertedFromInbound:uniqueConvertedLeadIds.has(lead.id)}];
  });

  for(const leadId of uniqueConvertedLeadIds){
    const lead=leadById.get(leadId);
    if(lead && stageById.get(lead.stage_id)?.is_won) currentOwner(lead.owner_user_id).convertedWon++;
  }
  for(const event of crmFollows.rows){
    const b=get(event.actor_user_id); b.crmFollowUps++;
    drill.push({type:'CRM follow-up',metric:'crmFollowUps',actor:b.id,when:event.occurred_at,record:event.lead_id,url:'/leads/'+encodeURIComponent(event.lead_id),outcome:'Completed'});
  }
  for(const event of inboundFollowEvents.rows){
    const b=get(event.message_payload?.actor_user_id); b.inboundFollowUps++;
    drill.push({type:'Inbound follow-up',metric:'inboundFollowUps',actor:b.id,when:event.created_at,record:event.intake_id,url:'/leads/inbound?review='+encodeURIComponent(event.intake_id),outcome:'Completed'});
  }
  // Quote event rows do not carry an organization ID. Verify every quote against the Stark tenant.
  const quoteIds=[...new Set(quoteEvents.rows.map((e:any)=>e.quote_id).filter(Boolean))];
  const quoteLead=new Map<string,string>();
  for(let i=0;i<quoteIds.length;i+=300){
    const {data,error}=await db.from('quotes').select('id,lead_id').eq('organization_id',STARK).in('id',quoteIds.slice(i,i+300));
    if(error)throw error;
    for(const q of data||[])quoteLead.set(q.id,q.lead_id);
  }
  const countedQuote=new Set<string>();
  for(const event of quoteEvents.rows){
    if(!quoteLead.has(event.quote_id)||countedQuote.has(event.quote_id))continue;
    countedQuote.add(event.quote_id);
    const b=get(event.actor_user_id);b.verifiedQuoteSends++;
    const leadId=quoteLead.get(event.quote_id);
    drill.push({type:'Quote sent',metric:'verifiedQuoteSends',actor:b.id,when:event.created_at,record:event.quote_id,url:leadId?'/leads/'+encodeURIComponent(leadId):'',outcome:'Sent'});
  }
  const ownerQueueType=searchParams.queue==='reconnect'?'reconnect':'reply_now';
  const matchingQueue=activeInbound.rows.filter((row:any)=>!row.qualified_lead_id&&!row.sales_queue_suppressed&&!row.browsing_only && classifyInboundNextAction(row)===ownerQueueType && (!searchParams.user||row.setu_assigned_user_id===searchParams.user)).sort((a:any,b:any)=>String(b.last_inbound_at||'').localeCompare(String(a.last_inbound_at||'')));
  const ownerReviewRows=matchingQueue.slice(0,50).map((row:any)=>({...row,nextAction:ownerQueueType}));
  const chosenRecord=ownerReviewRows.find((r:any)=>r.id===searchParams.review)||ownerReviewRows[0];
  const recentMessages: Array<{id:string;direction:string;message_text:string|null;created_at:string;event_type:string}> = [];
  if(searchParams.queue && chosenRecord){
    const {data,error}=await db.from('lead_intake_messages').select('id,direction,message_text,created_at,event_type')
      .eq('organization_id',STARK).eq('intake_id',chosenRecord.id)
      .in('direction',['inbound','outbound']).order('created_at',{ascending:false}).limit(12);
    if(error)throw error;
    recentMessages.push(...(data||[]).reverse());
  }

  const ids=[...buckets.keys()].filter(x=>x!=='unknown');
  if(ids.length){
    const {data:profiles,error}=await db.from('profiles').select('id,full_name,email').in('id',ids);
    if(error)throw error;
    for(const p of profiles||[]){const b=buckets.get(p.id);if(b)b.name=p.full_name||p.email||p.id;}
  }
  const all=[...buckets.values()].sort((a,b)=>a.name.localeCompare(b.name));
  const selected = searchParams.user ? all.filter(b=>b.id===searchParams.user):all;
  const metric=String(searchParams.metric||'');
  const allowedMetric=new Set(['inboundAttempted','inboundConnected','inboundUnanswered','crmAttempted','crmConnected','crmUnanswered','crmUnknown','meetingsDone','converted','won','lost','inboundFollowUps','crmFollowUps','verifiedQuoteSends']);
  const drillRows=allowedMetric.has(metric)?drill.filter(r=>(!searchParams.user||r.actor===searchParams.user)&&(r.metric===metric||(metric==='inboundAttempted'&&r.type==='Inbound call')||(metric==='crmAttempted'&&r.type==='CRM call'))).sort((a,b)=>String(b.when).localeCompare(String(a.when))):[];
  const drillLink=(which:string)=>'/leads/sales-activity?'+new URLSearchParams({period,from:fromDate,to:toDate,tab,metric:which,...(searchParams.user?{user:searchParams.user}:{})}).toString();
  const fmt=(n:number)=>n.toLocaleString('en-IN');

  const capped=inbound.capped||crm.capped||meetings.capped||converted.capped||history.capped||crmFollows.capped||inboundFollowEvents.capped||quoteEvents.capped;
  const total=(key:keyof Bucket)=>selected.reduce((sum,row)=>sum+(typeof row[key]==='number'?row[key] as number:0),0);
  return <SalesActivityView tab={tab} period={period} fromDate={fromDate} toDate={toDate} searchParams={searchParams} all={all} selected={selected} workload={workload} capped={capped} buckets={buckets} drillRows={drillRows} metric={metric} allowedMetric={allowedMetric} total={total} fmt={fmt} drillLink={drillLink} ownerReviewRows={ownerReviewRows} ownerQueueCount={matchingQueue.length} recentMessages={recentMessages} outcomeRows={outcomeRows} />;
}
