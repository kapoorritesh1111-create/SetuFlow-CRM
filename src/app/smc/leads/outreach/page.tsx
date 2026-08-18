import { createClient } from '@/lib/supabase/server';
import { OutreachConsole } from './outreach-console';

export const dynamic = 'force-dynamic';

type OutreachLead = {
  id: string;
  company_name: string;
  primary_admin_name: string | null;
  primary_admin_email: string | null;
  primary_phone: string | null;
  headquarters_country: string | null;
  industry: string | null;
  pipeline_stage: string | null;
  lead_score: number | null;
  source: string | null;
  source_detail: string | null;
  internal_notes: string | null;
  last_contact_at: string | null;
  next_follow_up_at: string | null;
  assigned_to_name: string | null;
  activity_log: Array<{ id:string; kind:string; note:string; actor_name:string; created_at:string }>;
};

async function getOutreachLeads() {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from('client_onboarding_requests')
    .select('id,company_name,primary_admin_name,primary_admin_email,primary_phone,headquarters_country,industry,pipeline_stage,lead_score,source,source_detail,internal_notes,last_contact_at,next_follow_up_at,assigned_to_name,activity_log')
    .order('lead_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  return (data as OutreachLead[] | null) ?? [];
}

export default async function SmcGrowthOutreachPage() {
  const leads = await getOutreachLeads();
  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="bc">Growth / Lead Manager</div>
          <h1>Mail Outreach</h1>
          <div style={{fontSize:12,color:'#64748b',marginTop:4}}>Create, review and send personalized outreach emails directly from SMC.</div>
        </div>
        <div className="ha"><a href="/smc/leads" style={{fontSize:11,color:'#1F487C',fontWeight:700,textDecoration:'none'}}>← Lead Manager</a></div>
      </div>
      <OutreachConsole initialLeads={leads} />
    </>
  );
}
