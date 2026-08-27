(() => {
  'use strict';

  const VERIFIED_AT = '2026-08-27';
  const VERIFIED_COMMIT = '04192bd';

  const DOMAINS = [
    ['Start Here', ['overview','workflows','quick-reference']],
    ['Platform Architecture', ['architecture','diagrams','data-security','modules']],
    ['Core CRM', ['pipeline','documents','compliance','contracts','products','tasks','reports','notifications']],
    ['Vertical Workspaces', ['supplier-sourcing-2026','packaging-overview-2026','packaging-products-2026','packaging-pricing-2026','packaging-operations-2026']],
    ['Acquisition & Growth', ['trade-events','trade-show-trial','growth-acquisition-2026','seo-linkedin-2026']],
    ['Setu Guru & Intelligence', ['guru-ai','ai-suggestions','packaging-intelligence-2026']],
    ['Integrations', ['integrations','api-integrations','inbound-integrations-2026']],
    ['Operations & Administration', ['client-management','mission-control','academy-2026','mobile','profile','team-chat','operator-guides']],
    ['Engineering Reference', ['api-reference','live-ui','roadmap','glossary']]
  ];

  const INDEX = {
    overview:{title:'Product Overview',summary:'What SETU Flow is, how the Trade OS is organized, and how to orient to the platform.',keywords:'platform overview start here trade os commercial system',icon:'⌂'},
    workflows:{title:'Commercial Workflows',summary:'Lead through follow-up, quote, approval, order execution and closeout.',keywords:'lead quote order approval commercial lifecycle',icon:'⇄'},
    'quick-reference':{title:'Quick Reference',summary:'Fast rules, gates, routes and checks for operators, testers and technical leads.',keywords:'rules gates routes checks quality',icon:'☰'},
    architecture:{title:'System Architecture',summary:'Application, data, security, integration and deployment architecture.',keywords:'nextjs vercel supabase rls server actions architecture deployment',icon:'⬡'},
    diagrams:{title:'Flow Diagrams',summary:'Visual architecture, workflow and state diagrams for the platform.',keywords:'mermaid flowchart architecture workflow diagrams',icon:'◇'},
    'data-security':{title:'Data & Security',summary:'Organization scope, RLS, membership, roles, audit and safe data boundaries.',keywords:'security rls organization permissions audit auth',icon:'◈'},
    modules:{title:'Module Reference',summary:'Routes, workspaces, source tables and ownership for major modules.',keywords:'routes modules workspaces tables ownership',icon:'▦'},
    pipeline:{title:'Pipeline',summary:'Kanban, swimlanes, stages, follow-up, forecast and buyer/supplier views.',keywords:'pipeline kanban stage next step follow up forecast',icon:'▰'},
    documents:{title:'Documents',summary:'PDF generation, storage, versioning, previews and document templates.',keywords:'pdf storage versioning quote documents templates',icon:'▤'},
    compliance:{title:'Compliance',summary:'Evidence, requirements, waive/defer actions and quote-send gates.',keywords:'compliance evidence requirement waive defer send gate',icon:'☑'},
    contracts:{title:'Contracts',summary:'Contract lifecycle, commercial lock, continuity, audit and closeout.',keywords:'contract lifecycle audit commercial lock closeout',icon:'⚖'},
    products:{title:'Products & Catalog',summary:'Products, variants, pricing, price lists and secure catalog sharing.',keywords:'catalog products price list variants sharing',icon:'□'},
    tasks:{title:'Tasks',summary:'Operational tasks, entity linking, due dates, assignment and mobile completion.',keywords:'tasks due assignment follow up calendar',icon:'✓'},
    reports:{title:'Reports & Analytics',summary:'Commercial funnel, quote/order performance, trends and exportable analytics.',keywords:'reports analytics funnel quote order trend csv',icon:'▦'},
    notifications:{title:'Notifications',summary:'Alert types, user preferences and multi-channel notification behavior.',keywords:'notifications alerts preferences push whatsapp',icon:'◎'},
    'supplier-sourcing-2026':{title:'Supplier Journey & Sourcing',summary:'Supplier capture, verification, capability mapping, RFQ, response review and approval.',keywords:'supplier sourcing rfq capability verification response approval',icon:'⇆'},
    'packaging-overview-2026':{title:'Packaging Overview',summary:'Packaging-specific journey from conversational intake through design and dispatch.',keywords:'packaging lead quote kld artwork design dispatch',icon:'▦'},
    'packaging-products-2026':{title:'Packaging Products & KLD',summary:'Products, approved sizes, quote options and KLD/artwork references.',keywords:'kld artwork sizes center seal pouch packaging products',icon:'□'},
    'packaging-pricing-2026':{title:'Packaging Pricing v4',summary:'Server-authoritative pricing matrices, quantity breaks, charge controls and quote snapshots.',keywords:'pricing v4 sup center seal q1 q5 cogs margin wastage snapshot',icon:'₹'},
    'packaging-operations-2026':{title:'Packaging Design & Operations',summary:'Artwork queue, proof/revision, packaging history and dispatch continuity.',keywords:'artwork design proof dispatch packaging history operations',icon:'↗'},
    'packaging-intelligence-2026':{title:'Packaging Intelligence',summary:'Setu Guru support for packaging qualification, pricing context and follow-up.',keywords:'guru packaging intelligence pricing qualification',icon:'✦'},
    'trade-events':{title:'Trade Events',summary:'Event setup, field capture, attribution, analytics and lead conversion.',keywords:'trade show events business card capture analytics conversion',icon:'★'},
    'trade-show-trial':{title:'Trade Show Trial',summary:'Public booth trial, workspace provisioning, trial limits and ROI capture.',keywords:'trade show booth trial signup roi',icon:'⚡'},
    'growth-acquisition-2026':{title:'Growth, Outreach & Acquisition',summary:'Growth Center, lead manager, mail outreach, research and guided discovery.',keywords:'growth center outreach lead manager campaign research',icon:'↑'},
    'seo-linkedin-2026':{title:'SEO & LinkedIn Distribution',summary:'Search Console evidence, SEO bot workflow, GitHub review and publishing readiness.',keywords:'seo search console canonical crawl sitemap linkedin',icon:'⌁'},
    'guru-ai':{title:'Setu Guru AI',summary:'Context-aware AI, research, RAG/intelligence and operator-approved actions.',keywords:'setu guru ai rag research intelligence growth',icon:'✦'},
    'ai-suggestions':{title:'AI Suggestions',summary:'Review-gated drafts for follow-up, quote notes and evidence summaries.',keywords:'ai suggestions drafts follow up review',icon:'✶'},
    integrations:{title:'Integration Hub',summary:'Governed connection status and provider health across the platform.',keywords:'integrations provider health status',icon:'⬢'},
    'api-integrations':{title:'API & Integrations',summary:'API boundaries, webhooks, adapters and external-provider rules.',keywords:'api webhooks adapters email whatsapp external',icon:'⟨/⟩'},
    'inbound-integrations-2026':{title:'Interakt & IndiaMART Inbound',summary:'Org-scoped inbound, credentials, staging, qualification, health and CRM conversion.',keywords:'interakt indiamart whatsapp webhook pull_v2 crm_key',icon:'↔'},
    'client-management':{title:'Client Management & Entitlements',summary:'Org onboarding, module grants, plans, seats, usage and feature flags.',keywords:'client org entitlements modules seats plans feature flags',icon:'◆'},
    'mission-control':{title:'Mission Control',summary:'SETU internal command center for issues, QA, incidents, deployments, growth and client health.',keywords:'smc mission control issues qa deployments seo client health',icon:'⌖'},
    'academy-2026':{title:'Core & Packaging Academy',summary:'Maintained operator learning with walkthroughs, screenshots and test evidence.',keywords:'academy training operator guides screenshots packaging',icon:'◎'},
    mobile:{title:'Mobile Workspace',summary:'Business-card scan, vCard, trade capture, offline/mobile actions and qualification.',keywords:'mobile pwa offline scan vcard trade event',icon:'▯'},
    profile:{title:'Profile & My Card',summary:'Profile identity, avatar, vCard and QR sharing controls.',keywords:'profile avatar vcard qr my card',icon:'○'},
    'team-chat':{title:'Team Chat & Discussions',summary:'Channels, DMs, entity-linked discussions, reactions, presence and read state.',keywords:'chat discussion channels dm reactions presence',icon:'✉'},
    'operator-guides':{title:'Operator Guides',summary:'Click-by-click guidance with expected UI, writes and do-not-break rules.',keywords:'operator guides click by click expected state',icon:'☷'},
    'api-reference':{title:'API Reference',summary:'Application/API routes, background jobs and endpoint reference.',keywords:'api routes endpoints cron jobs reference',icon:'⟨/⟩'},
    'live-ui':{title:'Live UI Snapshots',summary:'Curated, zoomable screenshots of major workspaces.',keywords:'screenshots ui snapshots gallery',icon:'▣'},
    roadmap:{title:'Roadmap',summary:'Product roadmap, delivery horizons, statuses and value framing.',keywords:'roadmap now next later product',icon:'↗'},
    glossary:{title:'Glossary',summary:'Definitions for domain terms, tables, fields, statuses and acronyms.',keywords:'glossary definitions fields acronyms tables',icon:'◉'}
  };

  const META = {
    architecture:{owner:'Platform',routes:'System-wide',related:['diagrams','data-security','api-integrations','modules']},
    diagrams:{owner:'Platform',routes:'Visual index',related:['architecture','workflows','packaging-overview-2026','inbound-integrations-2026']},
    'data-security':{owner:'Platform / Security',routes:'All org-scoped routes',related:['architecture','client-management','api-integrations']},
    pipeline:{owner:'Core CRM',routes:'/pipeline',related:['workflows','tasks','reports']},
    documents:{owner:'Core CRM',routes:'/documents · /api/*/pdf',related:['compliance','contracts','api-reference']},
    'supplier-sourcing-2026':{owner:'Sourcing',routes:'Supplier workspace',related:['workflows','compliance','growth-acquisition-2026']},
    'packaging-overview-2026':{owner:'Packaging',routes:'Packaging workspace',related:['packaging-products-2026','packaging-pricing-2026','packaging-operations-2026']},
    'packaging-products-2026':{owner:'Packaging',routes:'Packaging Products',related:['packaging-overview-2026','packaging-pricing-2026','live-ui']},
    'packaging-pricing-2026':{owner:'Packaging / Pricing',routes:'Pricing Builder',related:['packaging-products-2026','packaging-operations-2026','diagrams']},
    'packaging-operations-2026':{owner:'Packaging / Operations',routes:'Design · Dispatch',related:['packaging-overview-2026','packaging-pricing-2026','live-ui']},
    'growth-acquisition-2026':{owner:'Growth',routes:'/growth-agent',related:['seo-linkedin-2026','trade-events','guru-ai']},
    'seo-linkedin-2026':{owner:'Growth / SMC',routes:'/smc/seo',related:['growth-acquisition-2026','mission-control','roadmap']},
    'guru-ai':{owner:'AI / Platform',routes:'/growth-agent · /api/setu-guru/*',related:['growth-acquisition-2026','packaging-intelligence-2026','data-security']},
    'inbound-integrations-2026':{owner:'Integrations',routes:'Interakt webhook · IndiaMART pull_v2',related:['api-integrations','integrations','pipeline']},
    'mission-control':{owner:'SETU Internal',routes:'/smc',related:['seo-linkedin-2026','client-management','roadmap']},
    'academy-2026':{owner:'Product / Enablement',routes:'Academy',related:['operator-guides','live-ui','packaging-overview-2026']}
  };

  function domainFor(id){
    const hit = DOMAINS.find(([,ids]) => ids.includes(id));
    return hit ? hit[0] : 'Engineering Reference';
  }
  function currentId(){ return (location.hash || '#overview').replace('#','').split('=')[0] || 'overview'; }
  function navigate(id){
    closeSearch();
    if (id === 'overview') location.hash = '#overview'; else location.hash = '#' + id;
  }

  function reorganizeNav(){
    const nav = document.getElementById('topicNav');
    if (!nav) return;
    const buttons = new Map();
    nav.querySelectorAll('.nav-link[data-topic]').forEach(btn => buttons.set(btn.dataset.topic, btn));
    if (!buttons.size) return;
    nav.innerHTML = '';
    DOMAINS.forEach(([name, ids], i) => {
      const available = ids.filter(id => buttons.has(id));
      if (!available.length) return;
      const wrap = document.createElement('div');
      wrap.className = 'docs-v2-domain';
      const expanded = i < 3;
      wrap.innerHTML = `<button class="nav-group-btn" aria-expanded="${expanded ? 'true':'false'}"><span>${name}</span><span class="nav-group-chevron">›</span></button><div class="nav-group-items${expanded ? '' : ' nav-collapsed'}"></div>`;
      const list = wrap.querySelector('.nav-group-items');
      available.forEach(id => list.appendChild(buttons.get(id)));
      wrap.querySelector('.nav-group-btn').addEventListener('click', () => {
        const collapsed = list.classList.toggle('nav-collapsed');
        wrap.querySelector('.nav-group-btn').setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      });
      nav.appendChild(wrap);
    });
    updateNavActive();
  }

  function updateNavActive(){
    const id = currentId();
    document.querySelectorAll('.nav-link[data-topic]').forEach(b => b.classList.toggle('active', b.dataset.topic === id));
    const active = document.querySelector(`.nav-link[data-topic="${CSS.escape(id)}"]`);
    const list = active?.closest('.nav-group-items');
    if (list) {
      list.classList.remove('nav-collapsed');
      list.previousElementSibling?.setAttribute('aria-expanded','true');
    }
  }

  function allIds(){ return DOMAINS.flatMap(([,ids]) => ids).filter(id => document.querySelector(`.nav-link[data-topic="${CSS.escape(id)}"]`) || INDEX[id]); }

  function wireMobileStepper(){
    const ids = allIds();
    const id = currentId();
    const i = Math.max(0, ids.indexOf(id));
    const progress = document.getElementById('mobileProgress');
    const prev = document.getElementById('mobilePrev');
    const next = document.getElementById('mobileNext');
    if (progress) progress.textContent = `${i + 1} / ${ids.length}`;
    if (prev) {
      prev.removeAttribute('onclick');
      prev.textContent = i === 0 ? 'Overview' : `← ${(INDEX[ids[i-1]]?.title || ids[i-1])}`;
      prev.onclick = () => navigate(i === 0 ? 'overview' : ids[i-1]);
    }
    if (next) {
      next.removeAttribute('onclick');
      next.textContent = i >= ids.length - 1 ? 'Start over' : `${INDEX[ids[i+1]]?.title || ids[i+1]} →`;
      next.onclick = () => navigate(i >= ids.length - 1 ? 'overview' : ids[i+1]);
    }
  }

  function slug(s){return String(s||'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');}
  function enhanceHeadings(){
    const body = document.querySelector('#topicView:not(.hidden) .topic-body');
    if (!body) return [];
    const seen = new Set();
    return Array.from(body.querySelectorAll('h2,h3')).map((h,idx) => {
      let id = h.id || slug(h.textContent) || `section-${idx+1}`;
      while(seen.has(id)) id += '-2';
      seen.add(id); h.id = id;
      return {id,text:h.textContent.trim(),level:h.tagName};
    }).filter(x => x.text);
  }

  function renderRail(){
    const rail = document.getElementById('rightRail');
    if (!rail) return;
    const id = currentId();
    const info = INDEX[id] || {title:id,summary:''};
    const meta = META[id] || {owner:domainFor(id),routes:'See module reference',related:DOMAINS.find(([,ids])=>ids.includes(id))?.[1].filter(x=>x!==id).slice(0,3) || []};
    const headings = enhanceHeadings().slice(0,9);
    const related = (meta.related || []).filter(x => INDEX[x]);
    rail.innerHTML = `
      <div class="docs-v2-rail-card"><div class="docs-v2-rail-kicker">Documentation status</div><div class="docs-v2-status"><span class="docs-v2-status-dot"></span><b>Current against main</b></div><div class="docs-v2-meta"><div><small>Verified</small><b>${VERIFIED_AT}</b></div><div><small>Commit</small><b>${VERIFIED_COMMIT}</b></div><div><small>Owner</small><b>${meta.owner}</b></div><div><small>Route / scope</small><b>${meta.routes}</b></div></div></div>
      ${headings.length ? `<div class="docs-v2-rail-card"><div class="docs-v2-rail-kicker">On this page</div><div class="docs-v2-rail-list">${headings.map(h=>`<button class="docs-v2-rail-link" data-scroll="${h.id}">${h.text}</button>`).join('')}</div></div>`:''}
      ${related.length ? `<div class="docs-v2-rail-card"><div class="docs-v2-rail-kicker">Related documentation</div><div class="docs-v2-rail-list">${related.map(r=>`<button class="docs-v2-rail-link" data-related="${r}">${INDEX[r].title}</button>`).join('')}</div></div>`:''}
      <div class="docs-v2-rail-card internal-only"><div class="docs-v2-rail-kicker">Engineering history</div><a class="docs-v2-change-link" href="setuflow-docs-current-updates.html"><span>Archived update view</span><span>→</span></a></div>`;
    rail.querySelectorAll('[data-scroll]').forEach(b => b.addEventListener('click',()=>document.getElementById(b.dataset.scroll)?.scrollIntoView({behavior:'smooth',block:'start'})));
    rail.querySelectorAll('[data-related]').forEach(b => b.addEventListener('click',()=>navigate(b.dataset.related)));
    if (document.body.classList.contains('shared-mode')) rail.querySelectorAll('.internal-only').forEach(e=>e.classList.add('hidden'));
  }

  function injectArchitectureNavigator(){
    if (currentId() !== 'architecture') return;
    const body = document.querySelector('#topicView .topic-body');
    if (!body || document.getElementById('docsV2ArchNavigator')) return;
    body.insertAdjacentHTML('afterbegin', `<div id="docsV2ArchNavigator"><div class="section-block"><h2>Architecture map</h2><p>Use these views to move from a 20-second system model into implementation detail. The complete architecture and historical technical detail remain below.</p></div><div class="docs-v2-arch-grid">
      <div class="docs-v2-arch-card" data-arch="system-context"><span>01</span><b>System Context</b><p>People, workspaces and external boundaries.</p></div>
      <div class="docs-v2-arch-card" data-arch="application-architecture"><span>02</span><b>Application Architecture</b><p>Core CRM, verticals, growth, AI and internal operations.</p></div>
      <div class="docs-v2-arch-card" data-arch="data-security-architecture"><span>03</span><b>Data & Security</b><p>Auth, organization membership, server controls and RLS.</p></div>
      <div class="docs-v2-arch-card" data-arch="integration-architecture"><span>04</span><b>Integration Architecture</b><p>Inbound staging, provider adapters and governed outbound actions.</p></div>
      <div class="docs-v2-arch-card" data-arch="deployment-architecture"><span>05</span><b>Deployment Architecture</b><p>GitHub, checks, Vercel previews, main and production.</p></div>
    </div>
    <div class="mermaid-wrap"><div class="diagram-title" id="system-context">System Context</div><pre class="mermaid">flowchart LR\n  Buyer[Buyers / Customers] --> SF[SETU Flow Trade OS]\n  Sales[Sales Teams] --> SF\n  Ops[Operations] --> SF\n  Internal[SETU Internal] --> SF\n  SF --> Core[Core CRM]\n  SF --> Vertical[Packaging + Supplier]\n  SF --> Growth[Growth + Trade Events]\n  SF --> Guru[Setu Guru]\n  Core & Vertical & Growth & Guru --> Data[Supabase + Governed Services]\n  Data --> Providers[Interakt · IndiaMART · Email · External APIs]</pre></div>
    <div class="mermaid-wrap"><div class="diagram-title" id="application-architecture">Application Architecture</div><pre class="mermaid">flowchart TD\n  App[Next.js App Router] --> CRM[Core CRM]\n  App --> V[Vertical Workspaces]\n  App --> G[Growth & Acquisition]\n  App --> AI[Setu Guru]\n  App --> ADM[Administration]\n  App --> SMC[Mission Control]\n  CRM --> L[Leads · Pipeline · Quotes · Orders]\n  V --> P[Packaging]\n  V --> S[Supplier / Sourcing]\n  G --> T[Trade Events · Outreach · SEO]\n  AI --> R[Research · RAG · Intelligence]</pre></div>
    <div class="mermaid-wrap"><div class="diagram-title" id="data-security-architecture">Data & Security Architecture</div><pre class="mermaid">flowchart LR\n  U[User] --> A[Supabase Auth]\n  A --> M[Organization Membership]\n  M --> S[Server Action / API Validation]\n  S --> O[organization_id Scope]\n  O --> RLS[Postgres RLS]\n  RLS --> DB[(Workflow Data)]\n  S --> AUD[Audit Trail]</pre></div>
    <div class="mermaid-wrap"><div class="diagram-title" id="integration-architecture">Integration Architecture</div><pre class="mermaid">flowchart LR\n  IM[IndiaMART] --> IA[Pull Adapter]\n  WA[Interakt / WhatsApp] --> WH[Webhook Adapter]\n  IA & WH --> ST[Inbound Staging]\n  ST --> Q[Qualification / Review]\n  Q --> CRM[CRM Lead]\n  CRM --> OUT[Approved Outbound Actions]\n  OUT --> EM[Email]\n  OUT --> API[External APIs]\n  CRM --> GURU[Setu Guru Assist]</pre></div>
    <div class="mermaid-wrap"><div class="diagram-title" id="deployment-architecture">Deployment Architecture</div><pre class="mermaid">flowchart LR\n  G[GitHub Branch] --> PR[Pull Request]\n  PR --> CI[Automated Checks]\n  CI --> VP[Vercel Preview]\n  VP --> RV[Review]\n  RV --> M[main]\n  M --> PROD[Vercel Production]\n  PROD --> WEB[setuflowcrm.com]\n  PROD <--> SB[(Supabase)]</pre></div></div>`);
    body.querySelectorAll('[data-arch]').forEach(c => c.addEventListener('click',()=>document.getElementById(c.dataset.arch)?.scrollIntoView({behavior:'smooth',block:'start'})));
    setTimeout(() => { try { if (window.mermaid) window.mermaid.run({nodes:Array.from(body.querySelectorAll('pre.mermaid')).filter(n=>!n.dataset.processed)}); } catch(e){} },120);
  }

  let palette, paletteInput, paletteBody, activeIndex = 0, currentResults = [];
  function ensureSearch(){
    if (palette) return;
    const back = document.createElement('div'); back.className='docs-v2-search-backdrop';
    palette = document.createElement('div'); palette.className='docs-v2-search-panel';
    palette.innerHTML = `<div class="docs-v2-search-head"><span class="docs-v2-search-icon">⌕</span><input class="docs-v2-search-input" placeholder="Search Setu Flow documentation…" autocomplete="off"><kbd>ESC</kbd></div><div class="docs-v2-search-body"></div><div class="docs-v2-search-foot"><span><kbd>↑↓</kbd> Navigate</span><span><kbd>Enter</kbd> Open</span><span><kbd>Esc</kbd> Close</span></div>`;
    document.body.append(back,palette); paletteInput=palette.querySelector('input'); paletteBody=palette.querySelector('.docs-v2-search-body');
    back.addEventListener('click',closeSearch); paletteInput.addEventListener('input',()=>renderSearch(paletteInput.value));
    paletteInput.addEventListener('keydown',e=>{
      if(e.key==='ArrowDown'){e.preventDefault();activeIndex=Math.min(activeIndex+1,currentResults.length-1);paintActive();}
      if(e.key==='ArrowUp'){e.preventDefault();activeIndex=Math.max(activeIndex-1,0);paintActive();}
      if(e.key==='Enter'&&currentResults[activeIndex]){e.preventDefault();navigate(currentResults[activeIndex].id);}
      if(e.key==='Escape') closeSearch();
    });
    window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openSearch('');}else if(e.key==='Escape'&&palette.classList.contains('open'))closeSearch();});
    document.querySelectorAll('#globalSearch,.hero-search input').forEach(input=>{
      input.addEventListener('focus',()=>openSearch(input.value));
      input.addEventListener('input',()=>{if(input.value.trim())openSearch(input.value);});
    });
  }
  function score(item,q){
    if(!q)return 1; const t=item.title.toLowerCase(), s=item.summary.toLowerCase(), k=item.keywords.toLowerCase();
    if(t===q)return 100;if(t.startsWith(q))return 80;if(t.includes(q))return 60;if(k.includes(q))return 35;if(s.includes(q))return 25;return 0;
  }
  function searchItems(q){
    q=String(q||'').trim().toLowerCase();
    return Object.entries(INDEX).map(([id,v])=>({id,...v,domain:domainFor(id),score:score(v,q)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score||a.title.localeCompare(b.title)).slice(0,10);
  }
  function renderSearch(q){
    currentResults=searchItems(q);activeIndex=0;
    if(!currentResults.length){paletteBody.innerHTML='<div class="docs-v2-search-empty">No matching documentation. Try a module, workflow, route, provider or business term.</div>';return;}
    paletteBody.innerHTML=currentResults.map((r,i)=>`<div class="docs-v2-result${i===0?' active':''}" data-result="${r.id}"><div class="docs-v2-result-icon">${r.icon||'•'}</div><div><div class="docs-v2-result-title">${r.title}</div><div class="docs-v2-result-path">${r.domain}</div><div class="docs-v2-result-snippet">${r.summary}</div></div><div class="docs-v2-result-arrow">↗</div></div>`).join('');
    paletteBody.querySelectorAll('[data-result]').forEach(el=>el.addEventListener('click',()=>navigate(el.dataset.result)));
  }
  function paintActive(){paletteBody.querySelectorAll('.docs-v2-result').forEach((el,i)=>el.classList.toggle('active',i===activeIndex));paletteBody.querySelector('.docs-v2-result.active')?.scrollIntoView({block:'nearest'});}
  function openSearch(q=''){ensureSearch();document.querySelector('.docs-v2-search-backdrop')?.classList.add('open');palette.classList.add('open');paletteInput.value=q||'';renderSearch(q);setTimeout(()=>paletteInput.focus(),0);}
  function closeSearch(){document.querySelector('.docs-v2-search-backdrop')?.classList.remove('open');palette?.classList.remove('open');}

  function polishOverview(){
    const hero = document.querySelector('.overview-view .hero-search input');
    if(hero) hero.placeholder='Search products, workflows, architecture, APIs…';
    const eyebrow = document.querySelector('.overview-view .eyebrow');
    if(eyebrow) eyebrow.textContent='SETU Flow product & engineering documentation';
  }

  function refresh(){
    setTimeout(()=>{
      reorganizeNav(); updateNavActive(); wireMobileStepper(); ensureSearch(); polishOverview(); injectArchitectureNavigator(); renderRail();
    },180);
  }

  window.addEventListener('hashchange',refresh);
  window.addEventListener('popstate',refresh);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();
})();
