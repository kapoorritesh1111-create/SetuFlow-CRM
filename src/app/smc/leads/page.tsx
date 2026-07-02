import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { LeadsBoard } from './leads-board';

export const dynamic = 'force-dynamic';

type Lead = { id:string; company_name:string; company_slug:string|null; workspace_domain:string|null; primary_admin_name:string|null; primary_admin_email:string; primary_phone:string|null; headquarters_country:string|null; status:string; requested_seat_count:number; requested_plan:string; trial_template_key:string|null; pipeline_stage:string|null; lead_score:number|null; is_trial_request:boolean; created_at:string; website:string|null; industry:string|null; source:string|null; source_detail:string|null; internal_notes:string|null; last_contact_at:string|null; next_follow_up_at:string|null; assigned_to_name:string|null; demo_scheduled_at:string|null; demo_completed_at:string|null; demo_outcome:string|null; demo_notes:string|null; activity_log:Array<{id:string;kind:string;note:string;actor_name:string;created_at:string}> };
type SearchParams = Record<string, string | string[] | undefined>;

const TRIAL_TEMPLATES = [
  { key: '', label: 'Common template / Export foods basic' },
  { key: 'export_foods_basic', label: 'Export foods basic' },
  { key: 'ingredient_trader', label: 'Ingredient trader' },
  { key: 'distributor_importer', label: 'Distributor / importer' },
  { key: 'packaging_converter', label: 'Packaging converter / Stark Packmate' },
] as const;

function textValue(v: FormDataEntryValue | null) { return typeof v === 'string' ? v.trim() : ''; }
function slugify(v: string) { return (v.toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,42)) || `lead-${Date.now().toString(36)}`; }
function normalizeTrialTemplate(v: FormDataEntryValue | null) { const k=textValue(v); return ['export_foods_basic','ingredient_trader','distributor_importer','packaging_converter'].includes(k) ? k : 'export_foods_basic'; }
function numberValue(v: FormDataEntryValue | null, fb: number) { const n=Number.parseInt(textValue(v),10); return Number.isFinite(n)&&n>0?n:fb; }
function firstParam(p: SearchParams|undefined, k: string) { const v=p?.[k]; return Array.isArray(v)?v[0]:v; }

async function getLeads() {
  const sb = await createClient();
  const { data } = await (sb as any).from('client_onboarding_requests').select('*').order('created_at', { ascending: false });
  return (data as Lead[]) ?? [];
}

async function createLead(formData: FormData) {
  'use server';
  const sb = await createClient();
  const db = sb as any;
  const companyName = textValue(formData.get('company_name'));
  const email = textValue(formData.get('email'));
  const slugBase = slugify(companyName);
  const companySlug = `${slugBase}-${Date.now().toString(36).slice(-6)}`.slice(0,60).replace(/-+$/g,'');
  const isTrialRequest = formData.get('is_trial')==='on' || textValue(formData.get('plan'))==='trial';
  const templateKey = normalizeTrialTemplate(formData.get('trial_template_key'));
  const source = textValue(formData.get('source')) || 'internal';
  const { error } = await db.from('client_onboarding_requests').insert({
    company_name: companyName, company_slug: companySlug,
    workspace_domain: `${companySlug}.setuflowcrm.com`,
    primary_admin_name: textValue(formData.get('contact_name')) || null,
    primary_admin_email: email,
    primary_phone: textValue(formData.get('phone')) || null,
    headquarters_country: textValue(formData.get('country')) || null,
    website: textValue(formData.get('website')) || null,
    industry: textValue(formData.get('industry')) || null,
    requested_plan: textValue(formData.get('plan')) || 'starter',
    requested_seat_count: numberValue(formData.get('seats'),5),
    is_trial_request: isTrialRequest, trial_template_key: templateKey,
    requested_modules: source==='trade_show' ? ['full_crm','trade_show'] : ['full_crm'],
    pipeline_stage: isTrialRequest ? 'trial' : 'inquiry',
    lead_score: isTrialRequest ? 40 : 20, status: 'submitted', source,
    source_detail: textValue(formData.get('source_detail')) || null,
    internal_notes: textValue(formData.get('notes')) || null,
    wants_trade_events: source==='trade_show',
    tags: [templateKey, textValue(formData.get('plan'))||'starter', isTrialRequest?'trial':'lead'].filter(Boolean),
  });
  if (error) redirect(`/smc/leads?lead_notice=save-error&lead_error=${encodeURIComponent(error.message)}`);
  revalidatePath('/smc/leads');
  redirect('/smc/leads?lead_notice=created');
}

export default async function SmcLeadsPage({ searchParams }: { searchParams?: SearchParams | Promise<SearchParams> }) {
  const params = await searchParams;
  const leads = await getLeads();
  const notice = firstParam(params,'lead_notice');
  const noticeError = firstParam(params,'lead_error');
  const inp = 'width:100%;margin-top:4px;border:1px solid #dbe6ef;border-radius:10px;padding:9px 11px;font-size:12px';
  const lbl = 'font-size:11px;color:#475569;font-weight:600';

  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Growth</div><h1>Internal Leads</h1></div>
        <div className="ha"><span style={{fontSize:11,color:'#64748b'}}>{leads.length} leads in pipeline</span></div>
      </div>

      {notice==='created'&&(
        <div style={{margin:'0 16px 12px',border:'1px solid #bbf7d0',background:'#ecfdf5',color:'#047857',borderRadius:14,padding:'12px 14px',fontSize:12,fontWeight:700}}>
          Lead saved<span style={{display:'block',fontWeight:500,marginTop:3}}>The lead is ready for review in the pipeline.</span>
        </div>
      )}
      {notice==='save-error'&&(
        <div style={{margin:'0 16px 12px',border:'1px solid #fecaca',background:'#fef2f2',color:'#991b1b',borderRadius:14,padding:'12px 14px',fontSize:12,fontWeight:700}}>
          Lead was not saved<span style={{display:'block',fontWeight:500,marginTop:3}}>{noticeError||'Check the required fields and try again.'}</span>
        </div>
      )}

      {/* New Lead collapsible form */}
      <details style={{margin:'0 16px 16px',background:'#fff',border:'1px solid #dbe6ef',borderRadius:18,boxShadow:'0 8px 24px rgba(15,23,42,.05)'}}>
        <summary style={{padding:'14px 18px',cursor:'pointer',fontWeight:700,fontSize:14,color:'#1F487C',listStyle:'none',display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:28,height:28,borderRadius:8,background:'#279491',color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900}}>+</span>
          New Internal Lead
        </summary>
        <form action={createLead} style={{padding:'0 18px 18px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Company Name *<input name="company_name" required style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="Acme Foods Ltd" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Contact Name<input name="contact_name" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="John Doe" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Email *<input name="email" type="email" required style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="john@acme.com" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Phone / WhatsApp<input name="phone" type="tel" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="+1 555 123 4567" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Country<input name="country" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="United States" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Website<input name="website" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="https://acme.com" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Industry<input name="industry" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="Food Import/Export" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Plan<select name="plan" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}}><option value="starter">Starter</option><option value="growth">Growth</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Seats<input name="seats" type="number" min={1} defaultValue={5} style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Trial Template<select name="trial_template_key" defaultValue="" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}}>{TRIAL_TEMPLATES.map(t=><option key={t.key||'common'} value={t.key}>{t.label}</option>)}</select></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Source<select name="source" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}}><option value="internal">Internal / Referral</option><option value="trade_show">Trade Show</option><option value="website">Website</option><option value="cold_outreach">Cold Outreach</option><option value="linkedin">LinkedIn</option></select></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600}}>Source Detail<input name="source_detail" style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12}} placeholder="Gulfood 2026, Booth A12" /></label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600,display:'flex',alignItems:'center',gap:8,marginTop:18}}><input name="is_trial" type="checkbox" /> Trial Request</label>
          <label style={{fontSize:11,color:'#475569',fontWeight:600,gridColumn:'span 3'}}>Internal Notes<textarea name="notes" rows={2} style={{width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12,resize:'vertical'}} placeholder="Context, next steps, urgency..." /></label>
          <div style={{gridColumn:'span 3',display:'flex',justifyContent:'flex-end',gap:8,marginTop:4}}>
            <button type="submit" style={{padding:'10px 24px',background:'#279491',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer'}}>Create Lead</button>
          </div>
        </form>
      </details>

      {/* Client board (handles drag/drop, edit drawer, lost stage) */}
      <LeadsBoard initialLeads={leads} />
    </>
  );
}
