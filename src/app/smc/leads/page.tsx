import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { LeadsBoard } from './leads-board';

export const dynamic = 'force-dynamic';

type Lead = {
  id:string; company_name:string; company_slug:string|null; workspace_domain:string|null;
  primary_admin_name:string|null; primary_admin_email:string|null; primary_phone:string|null;
  headquarters_country:string|null; status:string; requested_seat_count:number; requested_plan:string;
  trial_template_key:string|null; pipeline_stage:string|null; lead_score:number|null; is_trial_request:boolean;
  created_at:string; website:string|null; industry:string|null; source:string|null; source_detail:string|null;
  internal_notes:string|null; last_contact_at:string|null; next_follow_up_at:string|null; assigned_to_name:string|null;
  demo_scheduled_at:string|null; demo_completed_at:string|null; demo_outcome:string|null; demo_notes:string|null;
  lead_origin?:string|null; contact_title?:string|null; linkedin_url?:string|null; employee_size_signal?:string|null;
  evidence_urls?:string[]|null; fit_reasons?:string|null; pain_signals?:string|null; outreach_status?:string|null;
  research_notes?:string|null; research_last_verified_at?:string|null;
  activity_log:Array<{id:string;kind:string;note:string;actor_name:string;created_at:string}>;
};
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
function numberValue(v: FormDataEntryValue | null, fb: number) { const n=Number.parseInt(textValue(v),10); return Number.isFinite(n)&&n>=0?n:fb; }
function firstParam(p: SearchParams|undefined, k: string) { const v=p?.[k]; return Array.isArray(v)?v[0]:v; }
function lines(v: FormDataEntryValue | null) { return textValue(v).split(/\r?\n|,/).map(s=>s.trim()).filter(Boolean); }

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
  const origin = textValue(formData.get('lead_origin')) || 'inbound';
  const slugBase = slugify(companyName);
  const companySlug = `${slugBase}-${Date.now().toString(36).slice(-6)}`.slice(0,60).replace(/-+$/g,'');
  const isTrialRequest = formData.get('is_trial')==='on' || textValue(formData.get('plan'))==='trial';
  const templateKey = normalizeTrialTemplate(formData.get('trial_template_key'));
  const source = textValue(formData.get('source')) || (origin === 'researched' ? 'web_research' : 'internal');
  const score = Math.min(100, Math.max(0, numberValue(formData.get('lead_score'), origin === 'researched' ? 50 : isTrialRequest ? 40 : 20)));
  const evidence = lines(formData.get('evidence_urls'));
  const researchNotes = textValue(formData.get('research_notes'));
  const fitReasons = textValue(formData.get('fit_reasons'));
  const painSignals = textValue(formData.get('pain_signals'));

  const { error } = await db.from('client_onboarding_requests').insert({
    company_name: companyName, company_slug: companySlug,
    workspace_domain: `${companySlug}.setuflowcrm.com`,
    primary_admin_name: textValue(formData.get('contact_name')) || null,
    primary_admin_email: email || null,
    primary_phone: textValue(formData.get('phone')) || null,
    headquarters_country: textValue(formData.get('country')) || null,
    website: textValue(formData.get('website')) || null,
    industry: textValue(formData.get('industry')) || null,
    requested_plan: textValue(formData.get('plan')) || 'starter',
    requested_seat_count: numberValue(formData.get('seats'),5),
    is_trial_request: isTrialRequest, trial_template_key: templateKey,
    requested_modules: source==='trade_show' ? ['full_crm','trade_show'] : ['full_crm'],
    pipeline_stage: isTrialRequest ? 'trial' : 'inquiry',
    lead_score: score, status: 'submitted', source,
    source_detail: textValue(formData.get('source_detail')) || null,
    internal_notes: textValue(formData.get('notes')) || null,
    wants_trade_events: source==='trade_show',
    tags: [templateKey, textValue(formData.get('plan'))||'starter', isTrialRequest?'trial':'lead', origin].filter(Boolean),
    lead_origin: origin,
    contact_title: textValue(formData.get('contact_title')) || null,
    linkedin_url: textValue(formData.get('linkedin_url')) || null,
    employee_size_signal: textValue(formData.get('employee_size_signal')) || null,
    evidence_urls: evidence,
    fit_reasons: fitReasons || null,
    pain_signals: painSignals || null,
    outreach_status: origin === 'researched' ? 'ready' : 'not_started',
    research_notes: researchNotes || null,
    research_last_verified_at: evidence.length || researchNotes || fitReasons || painSignals ? new Date().toISOString() : null,
  });
  if (error) redirect(`/smc/leads?lead_notice=save-error&lead_error=${encodeURIComponent(error.message)}`);
  revalidatePath('/smc/leads');
  redirect('/smc/leads?lead_notice=created');
}

const field = {width:'100%',marginTop:4,border:'1px solid #dbe6ef',borderRadius:10,padding:'9px 11px',fontSize:12} as const;
const label = {fontSize:11,color:'#475569',fontWeight:600} as const;

export default async function SmcLeadsPage({ searchParams }: { searchParams?: SearchParams | Promise<SearchParams> }) {
  const params = await searchParams;
  const leads = await getLeads();
  const notice = firstParam(params,'lead_notice');
  const noticeError = firstParam(params,'lead_error');
  const inbound = leads.filter(l => !l.lead_origin || l.lead_origin === 'inbound').length;
  const researched = leads.filter(l => l.lead_origin === 'researched').length;
  const demos = leads.filter(l => l.demo_scheduled_at && !l.demo_completed_at).length;

  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Growth</div><h1>Lead Manager</h1><div style={{fontSize:12,color:'#64748b',marginTop:4}}>Inbound demand + researched prospects → outreach → demo → trial → client.</div></div>
        <div className="ha"><span style={{fontSize:11,color:'#64748b'}}>{leads.length} total · {inbound} inbound · {researched} researched · {demos} demos scheduled</span></div>
      </div>

      {notice==='created'&&(
        <div style={{margin:'0 16px 12px',border:'1px solid #bbf7d0',background:'#ecfdf5',color:'#047857',borderRadius:14,padding:'12px 14px',fontSize:12,fontWeight:700}}>
          Lead saved<span style={{display:'block',fontWeight:500,marginTop:3}}>It is ready for qualification, outreach and demo scheduling.</span>
        </div>
      )}
      {notice==='save-error'&&(
        <div style={{margin:'0 16px 12px',border:'1px solid #fecaca',background:'#fef2f2',color:'#991b1b',borderRadius:14,padding:'12px 14px',fontSize:12,fontWeight:700}}>
          Lead was not saved<span style={{display:'block',fontWeight:500,marginTop:3}}>{noticeError||'Check the required fields and try again.'}</span>
        </div>
      )}

      <details style={{margin:'0 16px 16px',background:'#fff',border:'1px solid #dbe6ef',borderRadius:18,boxShadow:'0 8px 24px rgba(15,23,42,.05)'}}>
        <summary style={{padding:'14px 18px',cursor:'pointer',fontWeight:700,fontSize:14,color:'#1F487C',listStyle:'none',display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:28,height:28,borderRadius:8,background:'#279491',color:'#fff',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:900}}>+</span>
          Add Inbound Lead or Researched Prospect
        </summary>
        <form action={createLead} style={{padding:'0 18px 18px',display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:12}}>
          <label style={label}>Lead Origin<select name="lead_origin" defaultValue="researched" style={field}><option value="researched">Researched prospect</option><option value="inbound">Inbound</option><option value="referral">Referral</option><option value="imported">Imported</option></select></label>
          <label style={label}>Company Name *<input name="company_name" required style={field} placeholder="Acme Exports Pvt Ltd" /></label>
          <label style={label}>ICP / Fit Score<input name="lead_score" type="number" min={0} max={100} defaultValue={50} style={field} /></label>

          <label style={label}>Contact Name<input name="contact_name" style={field} placeholder="Founder / Export Manager" /></label>
          <label style={label}>Title / Role<input name="contact_title" style={field} placeholder="Director, Export Sales" /></label>
          <label style={label}>Email<input name="email" type="email" style={field} placeholder="sales@company.com" /></label>
          <label style={label}>Phone / WhatsApp<input name="phone" type="tel" style={field} placeholder="+91 ..." /></label>
          <label style={label}>LinkedIn<input name="linkedin_url" type="url" style={field} placeholder="https://linkedin.com/in/..." /></label>
          <label style={label}>Website<input name="website" style={field} placeholder="https://company.com" /></label>

          <label style={label}>Country<input name="country" style={field} placeholder="India" /></label>
          <label style={label}>Industry<input name="industry" style={field} placeholder="Spices / Packaging / Textiles" /></label>
          <label style={label}>Company Size Signal<input name="employee_size_signal" style={field} placeholder="10–25 employees / founder-led" /></label>

          <label style={label}>Source<select name="source" defaultValue="web_research" style={field}><option value="web_research">Web research</option><option value="website">Website inbound</option><option value="linkedin">LinkedIn</option><option value="indiamart">IndiaMART</option><option value="tradeindia">TradeIndia</option><option value="trade_show">Trade Show</option><option value="referral">Referral</option><option value="cold_outreach">Cold outreach</option><option value="internal">Internal</option></select></label>
          <label style={label}>Source Detail<input name="source_detail" style={field} placeholder="Job post, directory, event, Google search..." /></label>
          <label style={label}>Suggested Plan<select name="plan" style={field}><option value="starter">Starter</option><option value="growth">Growth</option><option value="professional">Professional</option><option value="enterprise">Enterprise</option></select></label>

          <label style={{...label,gridColumn:'span 3'}}>Public Evidence URLs<textarea name="evidence_urls" rows={2} style={{...field,resize:'vertical'}} placeholder={'One URL per line: company website, job post, exporter directory, LinkedIn company page...'} /></label>
          <label style={{...label,gridColumn:'span 3'}}>Why SETU Flow Fits<textarea name="fit_reasons" rows={2} style={{...field,resize:'vertical'}} placeholder="Small trade house, multiple countries, quote-driven sales, WhatsApp + email inquiries..." /></label>
          <label style={{...label,gridColumn:'span 3'}}>Pain Signals<textarea name="pain_signals" rows={2} style={{...field,resize:'vertical'}} placeholder="Hiring sales coordinator for quotations/follow-ups, Excel/Sheets, IndiaMART lead handling, manual export documentation..." /></label>
          <label style={{...label,gridColumn:'span 3'}}>Research Notes<textarea name="research_notes" rows={2} style={{...field,resize:'vertical'}} placeholder="Best person to approach, markets served, product lines, outreach angle..." /></label>

          <label style={label}>Seats<input name="seats" type="number" min={1} defaultValue={5} style={field} /></label>
          <label style={label}>Trial Template<select name="trial_template_key" defaultValue="" style={field}>{TRIAL_TEMPLATES.map(t=><option key={t.key||'common'} value={t.key}>{t.label}</option>)}</select></label>
          <label style={{...label,display:'flex',alignItems:'center',gap:8,marginTop:18}}><input name="is_trial" type="checkbox" /> Trial already requested</label>
          <label style={{...label,gridColumn:'span 3'}}>Internal Notes<textarea name="notes" rows={2} style={{...field,resize:'vertical'}} placeholder="Commercial context, urgency, next step..." /></label>
          <div style={{gridColumn:'span 3',display:'flex',justifyContent:'flex-end',gap:8,marginTop:4}}>
            <button type="submit" style={{padding:'10px 24px',background:'#279491',color:'#fff',border:'none',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer'}}>Add to Growth Pipeline</button>
          </div>
        </form>
      </details>

      <LeadsBoard initialLeads={leads as any} />
    </>
  );
}
