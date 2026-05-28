(function(){
  const SUPABASE_URL='https://sjzfzloggabsmcuxktnl.supabase.co';
  const SUPABASE_ANON='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqemZ6bG9nZ2Fic21jdXhrdG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjgzMTYsImV4cCI6MjA4ODY0NDMxNn0.DvHcAw34QCFB00WtXJ95MRCHhtrZunDQvWlm9NQo-0w';
  const topics=window.SETU_DOC_TOPICS||[];
  const byId=new Map(topics.map(t=>[t.id,t]));
  const $=(id)=>document.getElementById(id);
  const state={active:null,full:false,filtered:topics};

  function grouped(list){return list.reduce((acc,t)=>{(acc[t.group] ||= []).push(t); return acc;},{});}
  function renderNav(){
    const root=$('navGroups'); if(!root) return;
    root.innerHTML='';
    const groups=grouped(state.filtered);
    for(const [group,items] of Object.entries(groups)){
      const title=document.createElement('div'); title.className='nav-group-title'; title.textContent=group; root.appendChild(title);
      items.forEach(t=>{ const btn=document.createElement('button'); btn.className='nav-topic'; btn.dataset.topic=t.id; btn.innerHTML=`<i>${t.icon}</i><span>${t.title}</span>`; btn.onclick=()=>openTopic(t.id); root.appendChild(btn); });
    }
    updateActiveMarks();
  }
  function renderTopicGrid(){
    const root=$('topicGrid'); if(!root) return;
    root.innerHTML='';
    state.filtered.forEach((t,idx)=>{ const card=document.createElement('button'); card.className='topic-card'; card.dataset.topic=t.id; card.innerHTML=`<div class="topic-card-head"><span class="topic-icon">${t.icon}</span><div><h3>${t.title}</h3><p>${t.description}</p></div></div><div class="topic-card-footer"><span>${t.group}</span><b>Open topic ${idx+1} →</b></div>`; card.onclick=()=>openTopic(t.id); root.appendChild(card); });
  }
  function renderRail(){
    const toc=$('railToc'); if(toc){ toc.innerHTML=''; topics.forEach(t=>{const b=document.createElement('button'); b.dataset.topic=t.id; b.textContent=t.title; b.onclick=()=>openTopic(t.id); toc.appendChild(b);}); }
  }
  function setSearch(q){
    const query=(q||'').trim().toLowerCase();
    state.filtered=!query?topics:topics.filter(t=>`${t.title} ${t.group} ${t.description}`.toLowerCase().includes(query));
    renderNav(); renderTopicGrid();
  }
  function openOverview(){
    state.active=null; state.full=false; location.hash='overview';
    $('overviewView')?.classList.remove('hidden'); $('topicView')?.classList.add('hidden'); $('fullDocView')?.classList.add('hidden');
    $('mobileTopicTitle').textContent='Docs Overview'; $('mobileProgress').textContent='Overview';
    $('railNextText').textContent='Start with Architecture, then follow the guided topic path.'; $('railNextBtn').textContent='Start Architecture →'; $('railNextBtn').onclick=()=>openTopic('s-arch');
    updateProgress(); updateActiveMarks(); closeDrawer();
  }
  function openTopic(id){
    const topic=byId.get(id)||topics[0]; if(!topic) return;
    state.active=topic.id; state.full=false; location.hash=topic.id;
    $('overviewView')?.classList.add('hidden'); $('fullDocView')?.classList.add('hidden'); $('topicView')?.classList.remove('hidden');
    $('topicGroup').textContent=topic.group; $('topicTitle').textContent=topic.title; $('topicDescription').textContent=topic.description;
    $('mobileTopicTitle').textContent=topic.title;
    const tpl=$('tpl-'+topic.id); const holder=$('topicContent'); holder.innerHTML=''; if(tpl) holder.appendChild(tpl.content.cloneNode(true));
    if(topic.id==='s-ui'){ renderScreenshotGallery(holder); $('topicSnapshotTools')?.classList.remove('hidden'); } else $('topicSnapshotTools')?.classList.add('hidden');
    enhanceTopicContent(holder); updateStepper(); updateProgress(); updateActiveMarks(); closeDrawer(); rerenderMermaid();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function openFullDoc(){
    state.full=true; state.active=null; location.hash='full-document';
    $('overviewView')?.classList.add('hidden'); $('topicView')?.classList.add('hidden'); $('fullDocView')?.classList.remove('hidden');
    const holder=$('fullDocContent'); holder.innerHTML=''; topics.forEach(t=>{ const tpl=$('tpl-'+t.id); if(tpl){ const block=document.createElement('div'); block.className='full-doc-block'; block.appendChild(tpl.content.cloneNode(true)); holder.appendChild(block); }});
    enhanceTopicContent(holder); rerenderMermaid(); closeDrawer();
  }
  function enhanceTopicContent(root){
    root.querySelectorAll('table').forEach(tbl=>{ if(tbl.parentElement && tbl.parentElement.classList.contains('table-wrap')) return; const wrap=document.createElement('div'); wrap.className='table-wrap'; tbl.parentNode.insertBefore(wrap,tbl); wrap.appendChild(tbl); });
    root.querySelectorAll('a[href^="#s-"]').forEach(a=>{ a.addEventListener('click',e=>{ const id=a.getAttribute('href').slice(1); if(byId.has(id)){ e.preventDefault(); openTopic(id); }}); });
  }
  async function renderScreenshotGallery(holder){
    let manifest=[];
    try{ const res=await fetch('docs-screenshots/manifest.json',{cache:'no-store'}); if(res.ok) manifest=await res.json(); }catch(e){}
    const gallery=document.createElement('section'); gallery.className='screenshot-gallery';
    if(!manifest.length){
      manifest=[
        {title:'Dashboard Command Center',route:'/dashboard',description:'KPI cards, world map, market performance, and live activity feed.',image:''},
        {title:'Pipeline Workspace',route:'/pipeline',description:'Kanban, swimlane, forecast, density, and global filters.',image:''},
        {title:'Quote Builder',route:'/quotes',description:'Versioned quote workflow, approval gates, PDF/send readiness.',image:''}
      ];
    }
    gallery.innerHTML=manifest.map(item=>`<article class="screenshot-card"><div class="screenshot-thumb">${item.image?`<img src="docs-screenshots/${item.image}" alt="${escapeHtml(item.title)}">`:'Screenshot Slot'}</div><div><b>${escapeHtml(item.title)}</b><p><code>${escapeHtml(item.route||'')}</code></p><p>${escapeHtml(item.description||'')}</p></div></article>`).join('');
    holder.prepend(gallery);
  }
  function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}
  function updateStepper(){
    const idx=topics.findIndex(t=>t.id===state.active); const prev=topics[(idx-1+topics.length)%topics.length]; const next=topics[(idx+1)%topics.length];
    $('prevTopic').textContent=`← ${prev.title}`; $('nextTopic').textContent=`${next.title} →`; $('prevTopic').onclick=()=>openTopic(prev.id); $('nextTopic').onclick=()=>openTopic(next.id);
    $('mobilePrev').textContent='← Previous'; $('mobileNext').textContent='Next →'; $('mobilePrev').onclick=()=>openTopic(prev.id); $('mobileNext').onclick=()=>openTopic(next.id);
    $('topicProgressLabel').textContent=`${idx+1} / ${topics.length}`; $('mobileProgress').textContent=`${idx+1} / ${topics.length}`;
    $('railNextText').textContent=`Next topic: ${next.title}. ${next.description}`; $('railNextBtn').textContent=`${next.title} →`; $('railNextBtn').onclick=()=>openTopic(next.id);
  }
  function updateProgress(){
    const idx=state.active?topics.findIndex(t=>t.id===state.active)+1:0; const pct=Math.round((idx/topics.length)*100);
    $('railProgressText').textContent=pct+'%'; $('railProgressFill').style.width=pct+'%'; $('railProgressSub').textContent=state.active?`${idx} of ${topics.length} topics`: 'Start at Docs Overview'; $('heroProgress').textContent=Math.max(66,pct)+'%';
  }
  function updateActiveMarks(){
    document.querySelectorAll('[data-topic]').forEach(el=>el.classList.toggle('active',el.dataset.topic===state.active));
  }
  function openDrawer(){ $('leftNav').classList.add('open'); $('drawerBackdrop').classList.add('open'); }
  function closeDrawer(){ $('leftNav').classList.remove('open'); $('drawerBackdrop').classList.remove('open'); }
  function rerenderMermaid(){ if(window.mermaid){ try{ mermaid.initialize({startOnLoad:false,theme:'base',themeVariables:{primaryColor:'#eff6ff',primaryTextColor:'#1e40af',primaryBorderColor:'#bfdbfe',lineColor:'#3b82f6',fontFamily:'Inter'}}); document.querySelectorAll('.topic-content .mermaid').forEach((el,i)=>{ if(el.dataset.processed) delete el.dataset.processed; }); mermaid.run({querySelector:'.topic-content .mermaid'}); }catch(e){ console.warn('Mermaid render skipped',e); } } }
  async function loadSupabaseMetrics(){
    try{
      const res=await fetch(`${SUPABASE_URL}/rest/v1/sprint_issues?select=status,severity,sprint_target,issue_type,parent_ref`,{headers:{apikey:SUPABASE_ANON,Authorization:`Bearer ${SUPABASE_ANON}`}});
      if(!res.ok) throw new Error('tracker fetch failed');
      const rows=await res.json(); const total=rows.length; const open=rows.filter(r=>r.status==='Open').length; const resolved=rows.filter(r=>r.status==='Resolved').length; const high=rows.filter(r=>r.status==='Open' && /critical|high/i.test(r.severity||'')).length; const lanes=[...new Set(rows.map(r=>r.sprint_target).filter(Boolean))];
      $('metricOpen').textContent=open; $('topIssueCount').textContent=open; $('issueBadge').textContent=open; $('metricSeverity').textContent=high?`${high} critical/high open`:'No critical/high open'; $('railOpenIssues').textContent=open; $('railResolvedIssues').textContent=resolved; $('metricMilestones').textContent=lanes.length; $('roadmapBadge').textContent=lanes.length; $('metricRoadmap').textContent=`${lanes.length} sprint lanes`; $('heroProgress').textContent=Math.round((resolved/Math.max(total,1))*100)+'%';
      $('roadmapMini').innerHTML=lanes.slice(0,4).map(l=>{const c=rows.filter(r=>r.sprint_target===l); const done=c.filter(r=>r.status==='Resolved').length; return `<div class="roadmap-item"><b>${escapeHtml(l)}</b><span>${done}/${c.length} resolved</span></div>`}).join('') || '<p>No roadmap lanes found.</p>';
    }catch(e){ $('metricOpen').textContent='Live'; $('metricMilestones').textContent='Live'; $('roadmapMini').innerHTML='<p>Open Roadmap for live milestones.</p>'; }
  }
  async function authCheck(){
    const params=new URLSearchParams(location.search); const token=params.get('share_token'); const gate=$('authGate');
    if(token){ try{ const d=JSON.parse(atob(token)); const revoked=JSON.parse(localStorage.getItem('sf_rev')||'[]'); if(!revoked.includes(token)&&Number(d.expiry)>Date.now()){ gate.classList.add('hidden'); $('sharedBanner').classList.add('visible'); const hours=Math.ceil((Number(d.expiry)-Date.now())/3600000); $('sharedMeta').textContent=`${d.recipient||'Reviewer'} · ${hours}h left`; document.querySelectorAll('.int-only').forEach(el=>el.style.display='none'); return; } }catch(e){} gate.classList.remove('hidden'); $('authError').textContent='Share link is invalid or expired.'; return; }
    try{ const res=await fetch('/api/internal/auth-check',{credentials:'include'}); if(!res.ok){gate.classList.remove('hidden'); return;} const data=await res.json(); const name=data.user?.name||data.user?.email||'Docs Admin'; $('userName').textContent=name; $('avatar').textContent=(name[0]||'R').toUpperCase(); $('topUser').style.display='flex'; gate.classList.add('hidden'); }catch(e){ gate.classList.add('hidden'); }
  }
  window.openShare=function(){ $('shareModal').classList.add('open'); renderTokenList(); };
  window.closeShare=function(){ $('shareModal').classList.remove('open'); };
  window.generateShareLink=function(){ const rec=$('shareRecipient').value.trim()||'External Reviewer'; const hours=Number($('shareDuration').value||72); const expiry=Date.now()+hours*3600000; const token=btoa(JSON.stringify({expiry,recipient:rec,issued:Date.now()})); const url=location.origin+location.pathname+'?share_token='+token; const list=JSON.parse(localStorage.getItem('sf_toks')||'[]'); list.push({token,recipient:rec,expiry}); localStorage.setItem('sf_toks',JSON.stringify(list)); $('shareOutput').value=url; $('shareExpiry').textContent=`Expires ${new Date(expiry).toLocaleString()} for ${rec}`; $('shareResult').classList.add('visible'); renderTokenList(); };
  window.copyShareLink=function(){ navigator.clipboard?.writeText($('shareOutput').value); };
  window.revokeToken=function(i){ const list=JSON.parse(localStorage.getItem('sf_toks')||'[]'); const rev=JSON.parse(localStorage.getItem('sf_rev')||'[]'); if(list[i]) rev.push(list[i].token); list.splice(i,1); localStorage.setItem('sf_toks',JSON.stringify(list)); localStorage.setItem('sf_rev',JSON.stringify(rev)); renderTokenList(); };
  function renderTokenList(){ const root=$('tokenList'); const list=JSON.parse(localStorage.getItem('sf_toks')||'[]').filter(t=>Number(t.expiry)>Date.now()); root.innerHTML=list.map((t,i)=>`<div class="token-item"><b>${escapeHtml(t.recipient)}</b><span>${new Date(t.expiry).toLocaleDateString()}</span><button onclick="revokeToken(${i})">Revoke</button></div>`).join(''); }
  function boot(){
    $('metricTopics').textContent=topics.length; renderNav(); renderTopicGrid(); renderRail(); loadSupabaseMetrics(); authCheck();
    ['globalSearch','heroSearch','navSearch'].forEach(id=>$(id)?.addEventListener('input',e=>setSearch(e.target.value)));
    $('menuBtn')?.addEventListener('click',openDrawer); $('mobileTopicBtn')?.addEventListener('click',openDrawer); $('closeNav')?.addEventListener('click',closeDrawer); $('drawerBackdrop')?.addEventListener('click',closeDrawer);
    $('overviewBtn')?.addEventListener('click',openOverview); $('fullDocToggle')?.addEventListener('click',openFullDoc); $('exitFullDoc')?.addEventListener('click',openOverview);
    $('copySnapshotTemplate')?.addEventListener('click',()=>{ const txt=JSON.stringify({title:'New Screen Name',route:'/route',description:'What this screen proves for testers or tech leads.',image:'new-screen.png',updated:new Date().toISOString().slice(0,10)},null,2); navigator.clipboard?.writeText(txt); });
    document.querySelectorAll('[data-topic]').forEach(el=>el.addEventListener('click',()=>openTopic(el.dataset.topic)));
    document.addEventListener('keydown',e=>{ if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){ e.preventDefault(); ($('globalSearch')||$('heroSearch')).focus(); } if(e.key==='Escape') closeDrawer(); });
    const hash=location.hash.replace('#',''); if(hash==='full-document') openFullDoc(); else if(byId.has(hash)) openTopic(hash); else openOverview();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
