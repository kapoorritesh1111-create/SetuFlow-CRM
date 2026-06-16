import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

type Org = { id:string; name:string; slug:string; created_at:string };
type Member = { organization_id:string };
type Grant = { organization_id:string; module_key:string };

const SETU_ORG = '3327b9a7-aadb-44b0-9793-30c4045d3c92';

async function getData() {
  // Auth check with normal client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Use service role to bypass RLS and see all orgs
  const admin = createServiceRoleClient();
  if (!admin) return { orgs: [], members: [], grants: [], onb: [] };

  const [orgsRes, membersRes, grantsRes, onbRes] = await Promise.all([
    admin.from('organizations').select('*'),
    admin.from('organization_members').select('organization_id'),
    admin.from('org_module_grants').select('organization_id, module_key'),
    admin.from('client_onboarding_requests').select('*'),
  ]);

  return {
    orgs: (orgsRes.data ?? []) as Org[],
    members: (membersRes.data ?? []) as Member[],
    grants: (grantsRes.data ?? []) as Grant[],
    onb: (onbRes.data ?? []) as any[],
  };
}

export default async function SmcClientsPage() {
  const { orgs, members, grants, onb } = await getData();
  const clientOrgs = orgs.filter(o => o.id !== SETU_ORG);

  return (
    <>
      <div className="smc-ph"><div><div className="bc">Growth</div><h1>Client Orgs</h1></div></div>
      <div className="smc-kr">
        <div className="smc-kp"><div className="v">{orgs.length}</div><div className="l">Total Orgs</div></div>
        <div className="smc-kp teal"><div className="v">{clientOrgs.length}</div><div className="l">Client Orgs</div></div>
        <div className="smc-kp"><div className="v">{members.length}</div><div className="l">Total Members</div></div>
        <div className="smc-kp"><div className="v">{grants.length}</div><div className="l">Module Grants</div></div>
      </div>
      <div className="smc-client-grid">
        {orgs.map(org => {
          const mc = members.filter(m=>m.organization_id===org.id).length;
          const gc = grants.filter(g=>g.organization_id===org.id).length;
          const ob = onb.find((o:any)=>o.linked_organization_id===org.id);
          const internal = org.id === SETU_ORG;
          return (
            <div key={org.id} className="smc-client-card">
              <h3>{org.name} {internal
                ? <span className="smc-lb" style={{background:'#e6f5f4',color:'#279491',fontSize:9}}>Platform</span>
                : <span className="smc-lb" style={{background:'#ecfdf5',color:'#10b981',fontSize:9}}>{ob?.status==='live'?'Active':'Setup'}</span>
              }</h3>
              <div className="cc-meta">
                <div><span className="cc-label">Org ID</span><br/><span className="cc-val" style={{fontFamily:"'DM Mono',monospace",fontSize:11}}>{org.id.slice(0,8)}</span></div>
                <div><span className="cc-label">Slug</span><br/><span className="cc-val">{org.slug}</span></div>
                <div><span className="cc-label">Members</span><br/><span className="cc-val">{mc}</span></div>
                <div><span className="cc-label">Modules</span><br/><span className="cc-val">{gc} granted</span></div>
                <div><span className="cc-label">Plan</span><br/><span className="cc-val">{ob?.requested_plan??'—'}</span></div>
                <div><span className="cc-label">Seats</span><br/><span className="cc-val">{ob?.requested_seat_count??'—'}</span></div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
