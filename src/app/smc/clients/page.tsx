import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Org = { id:string; name:string; slug:string; created_at:string };

async function getData() {
  const supabase = await createClient();
  const [orgsRes, membersRes, grantsRes, onbRes] = await Promise.all([
    supabase.from('organizations').select('*'),
    supabase.from('organization_members').select('organization_id'),
    supabase.from('org_module_grants').select('organization_id, module_key'),
    supabase.from('client_onboarding_requests').select('*'),
  ]);
  const orgs = (orgsRes.data ?? []) as Org[];
  const members = (membersRes.data ?? []) as {organization_id:string}[];
  const grants = (grantsRes.data ?? []) as {organization_id:string;module_key:string}[];
  const onb = (onbRes.data ?? []) as {linked_organization_id:string|null;status:string;requested_plan:string;requested_seat_count:number}[];
  return { orgs, members, grants, onb };
}

export default async function SmcClientsPage() {
  const { orgs, members, grants, onb } = await getData();

  const SETU_ORG = '3327b9a7-aadb-44b0-9793-30c4045d3c92';
  const isInternal = (id:string) => id === SETU_ORG;

  return (
    <>
      <div className="smc-ph"><div><div className="bc">Growth</div><h1>Client Orgs</h1></div></div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{orgs.length}</div><div className="l">Total Orgs</div></div>
        <div className="smc-kp teal"><div className="v">{orgs.filter(o=>!isInternal(o.id)).length}</div><div className="l">Client Orgs</div></div>
        <div className="smc-kp"><div className="v">{members.length}</div><div className="l">Total Members</div></div>
        <div className="smc-kp"><div className="v">{grants.length}</div><div className="l">Module Grants</div></div>
      </div>
      <div className="smc-client-grid">
        {orgs.map(org => {
          const memberCount = members.filter(m=>m.organization_id===org.id).length;
          const moduleCount = grants.filter(g=>g.organization_id===org.id).length;
          const onbReq = onb.find(o=>o.linked_organization_id===org.id);
          const internal = isInternal(org.id);
          return (
            <div key={org.id} className="smc-client-card">
              <h3>
                {org.name}
                {internal && <span className="smc-lb" style={{background:'#e6f5f4',color:'#279491',fontSize:9}}>Platform</span>}
                {!internal && <span className="smc-lb" style={{background:'#ecfdf5',color:'#10b981',fontSize:9}}>{onbReq?.status==='live'?'Active':'Setup'}</span>}
              </h3>
              <div className="cc-meta">
                <div><span className="cc-label">Org ID</span><br/><span className="cc-val" style={{fontFamily:"'DM Mono',monospace",fontSize:11}}>{org.id.slice(0,8)}</span></div>
                <div><span className="cc-label">Slug</span><br/><span className="cc-val">{org.slug}</span></div>
                <div><span className="cc-label">Members</span><br/><span className="cc-val">{memberCount}</span></div>
                <div><span className="cc-label">Modules</span><br/><span className="cc-val">{moduleCount} granted</span></div>
                <div><span className="cc-label">Plan</span><br/><span className="cc-val">{onbReq?.requested_plan??'—'}</span></div>
                <div><span className="cc-label">Seats</span><br/><span className="cc-val">{onbReq?.requested_seat_count??'—'}</span></div>
                <div><span className="cc-label">Created</span><br/><span className="cc-val" style={{fontSize:11}}>{new Date(org.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
