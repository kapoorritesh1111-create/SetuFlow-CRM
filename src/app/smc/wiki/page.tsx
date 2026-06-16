import { createClient } from '@/lib/supabase/server';
export const dynamic = 'force-dynamic';
async function getPages() {
  const supabase = await createClient();
  const { data } = await (supabase as any).from('smc_wiki_pages').select('*').order('updated_at', { ascending: false });
  return (data ?? []) as {id:string;title:string;slug:string;category:string;content:string;author_name:string;updated_at:string;pinned:boolean}[];
}
export default async function SmcWikiPage() {
  const pages = await getPages();
  const categories = ['Architecture','Runbooks','Onboarding','Process','Reference'];
  return (<>
    <div className="smc-ph"><div><div className="bc">Knowledge</div><h1>Internal Wiki</h1></div>
      <div className="ha"><button className="smc-btn smc-btn-p">+ New Page</button></div>
    </div>
    <div className="smc-content-page">
      {pages.length>0?<div className="smc-content-grid">{pages.map(p=>(
        <div key={p.id} className="smc-content-card">
          <div style={{display:'flex',justifyContent:'space-between'}}><h4>{p.title}</h4><span className="smc-lb doc">{p.category}</span></div>
          <p>{p.content.slice(0,120)}…</p>
          <p style={{marginTop:6,fontSize:10,color:'#94a3b8'}}>By {p.author_name} · Updated {new Date(p.updated_at).toLocaleDateString()}</p>
        </div>
      ))}</div>
      :<>
        <h2>Quick Start</h2>
        <p style={{color:'#64748b',marginBottom:16}}>Create wiki pages to document architecture decisions, runbooks, and onboarding guides.</p>
        <div className="smc-content-grid">{categories.map(c=>(
          <div key={c} className="smc-content-card" style={{cursor:'pointer'}}>
            <h4>{c}</h4><p>Create the first {c.toLowerCase()} page</p>
          </div>
        ))}</div>
      </>}
    </div>
  </>);
}
