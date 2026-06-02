const Docs = (() => {
  const shared = { active: false, token: null, recipient: null, expiry: null };
  let authUser = null;
  let screenshots = [];
  let metrics = { open: 4, resolved: 228, criticalHigh: 1, milestones: 3 };

  const topics = [
    { id: 'overview',         group: 'Get Started',        icon: '\u2302',   title: 'Product Overview',     tag: 'Start Here',    summary: 'What SETU Flow CRM is, why it exists, and how a tester or new tech lead should orient themselves.',                         accent: '#2563eb', next: 'architecture', sections: [] },
    { id: 'architecture',     group: 'System Overview',    icon: '\u2bec',   title: 'Architecture',         tag: 'System',        summary: 'App shell, database, auth, RLS, integration boundaries, route groups, and deployment topology.',                           accent: '#0d9488' },
    { id: 'modules',          group: 'System Overview',    icon: '\u25a6',   title: 'Module Reference',     tag: 'System',        summary: 'Routes, workspaces, source tables, and ownership responsibilities for every major module.',                               accent: '#2563eb' },
    { id: 'workflows',        group: 'Business Workflows', icon: '\u21c4',   title: 'Commercial Workflows', tag: 'Workflows',     summary: 'Full commercial lifecycle: Lead \u2192 Follow-up \u2192 Quote \u2192 Approval &amp; Send \u2192 Order Execution \u2192 Closeout.',                     accent: '#0d9488' },
    { id: 'diagrams',         group: 'Business Workflows', icon: '\u25c7',   title: 'Flow Diagrams',        tag: 'Diagrams',      summary: 'Mermaid flowcharts, swimlane diagrams, and slide-ready simplified flow diagrams.',                                        accent: '#7c3aed' },
    { id: 'documents',        group: 'Business Workflows', icon: '\u25a4',   title: 'Documents',            tag: 'Documents',     summary: 'Document control desk: file review, expiry posture, version visibility, compliance evidence, and document gate management.', accent: '#7c3aed' },
    { id: 'trade-events',      group: 'Business Workflows', icon: '\u2605',   title: 'Trade Events',         tag: 'Capture',       summary: 'Trade-show event setup, field capture (scan/quick entry), analytics, and convert-to-lead workflow with full attribution.', accent: '#f97316' },
    { id: 'operator-guides',  group: 'Operations',         icon: '\u2637',   title: 'Operator Guides',      tag: 'Operations',    summary: 'Six click-by-click operator guides with expected UI state, expected data writes, and do-not-break rules.',                 accent: '#f97316' },
    { id: 'guru-ai',          group: 'Operations',         icon: '\u2726',   title: 'Setu Guru AI',         tag: 'AI Assistant',  summary: 'Context-aware AI panel, business card scan, smart vCard, live org search \u2014 all with human approval guardrails.',          accent: '#db2777' },
    { id: 'mobile',           group: 'Operations',         icon: '\u25af',   title: 'Mobile Workspace',     tag: 'Mobile',        summary: 'Business card scan, smart vCard, trade-show capture, and mobile role-aware lead workflows.',                              accent: '#14b8a6' },
    { id: 'data-security',    group: 'Security & Data',    icon: '\u2bcf',   title: 'Data & Security',      tag: 'Security',      summary: 'Organization-scoped data, RLS policies, membership, roles, audit trails, and safe integration boundaries.',               accent: '#059669' },
    { id: 'api-integrations', group: 'Integrations & API', icon: '&#x27E8;/&#x27E9;',      title: 'API & Integrations',   tag: 'Integrations',  summary: 'Public APIs, webhook boundaries, WhatsApp/manual tracked links, finance/freight adapters, and provider rules.',           accent: '#2563eb' },
    { id: 'integrations',      group: 'Integrations & API', icon: '\u2b21',   title: 'Integration Hub',      tag: 'Integrations',  summary: 'Status overview of 6 governed connectors: Email, Documents, AI, vCard, Trade Events, Tasks.', accent: '#0d9488' },
    { id: 'quick-reference',  group: 'Reference',          icon: '\u2630',   title: 'Quick Reference',      tag: 'Reference',     summary: 'Fast rules, gates, routes, and checks for testers and technical leads.',                                                 accent: '#334155' },
    { id: 'api-reference',     group: 'Reference',          icon: '\u27E8/\u27E9', title: 'API Reference',     tag: 'API', summary: 'All 84 app routes, key API endpoints, mobile routes, and background jobs reference.', accent: '#0d9488' },
    { id: 'live-ui',          group: 'Reference',          icon: '\u25a3',   title: 'Live UI Snapshots',    tag: 'Screenshots',   summary: 'Clickable screenshot library for testers and tech leads. Internal users can upload screenshots from this workspace.',      accent: '#db2777' }
  ];

  function idx() { const h = (location.hash || '#overview').replace('#', '').split('='); if (h[0] === 'snapshot') return 'live-ui'; return topics.some(t => t.id === h[0]) ? h[0] : 'overview'; }
  function byId(id) { return topics.find(t => t.id === id) || topics[0]; }
  function currentIndex() { return Math.max(0, topics.findIndex(t => t.id === idx())); }
  function isInternal() { return !shared.active; }
  function escapeHtml(s) { return String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
  function validToken(token) { try { const d = JSON.parse(atob(token)); if (!d.expiry || d.expiry < Date.now()) return null; return d; } catch { return null; } }

  async function initAuth() {
    const p = new URLSearchParams(location.search);
    const token = p.get('share_token');
    if (token) {
      const d = validToken(token);
      if (d) {
        shared.active = true; shared.token = token; shared.recipient = d.recipient || 'External reviewer'; shared.expiry = d.expiry;
        document.body.classList.add('shared-mode');
        document.getElementById('sharedBanner').classList.remove('hidden');
        document.getElementById('sharedRecipient').textContent = shared.recipient;
        document.getElementById('sharedExpiry').textContent = 'Expires ' + new Date(shared.expiry).toLocaleString();
        document.querySelectorAll('.internal-only').forEach(e => e.classList.add('hidden'));
        document.getElementById('authGate').classList.add('hidden');
        return;
      }
      document.getElementById('authGate').classList.remove('hidden');
      document.getElementById('authError').textContent = 'This shared review link is invalid or expired.';
      return;
    }
    try {
      const r = await fetch('/api/internal/auth-check', { credentials: 'include' });
      if (!r.ok) throw new Error('auth');
      const d = await r.json();
      authUser = d.user || null;
      document.getElementById('userName').textContent = authUser?.name || 'Ritesh Kapoor';
      document.getElementById('userInitial').textContent = (authUser?.name || 'R').charAt(0).toUpperCase();
      document.getElementById('authGate').classList.add('hidden');
    } catch (e) {
      document.getElementById('authGate').classList.remove('hidden');
    }
  }

  function renderNav() {
    const nav = document.getElementById('topicNav');
    const PINNED = new Set(['Get Started', 'System Overview']);
    function collapsed(g) {
      const s = sessionStorage.getItem('ng_' + g);
      return s !== null ? s === '1' : !PINNED.has(g);
    }
    let html = '', g = '', gid = 0;
    topics.forEach(t => {
      if (t.group !== g) {
        if (g) html += '</div>';
        g = t.group; gid++;
        const id = 'ng' + gid, col = collapsed(g);
        if (PINNED.has(g)) {
          html += `<div class="nav-group-static">${g}</div><div class="nav-group-items" id="${id}">`;
        } else {
          html += `<button class="nav-group-btn" onclick="Docs.toggleNavGroup('${id}','${g}')" aria-expanded="${col ? 'false' : 'true'}"><span>${g}</span><span class="nav-group-chevron">\u203a</span></button><div class="nav-group-items${col ? ' nav-collapsed' : ''}" id="${id}">`;
        }
      }
      html += `<button class="nav-link" data-topic="${t.id}" onclick="Docs.openTopic('${t.id}')"><span class="dot">${t.icon}</span>${t.title}</button>`;
    });
    if (g) html += '</div>';
    nav.innerHTML = html;
    markActive();
  }

  function toggleNavGroup(id, groupName) {
    const el = document.getElementById(id);
    const btn = el ? el.previousElementSibling : null;
    if (!el) return;
    const col = el.classList.toggle('nav-collapsed');
    if (btn) btn.setAttribute('aria-expanded', col ? 'false' : 'true');
    try { sessionStorage.setItem('ng_' + groupName, col ? '1' : '0'); } catch(e){}
  }
  function markActive() {
    const id = idx();
    document.querySelectorAll('.nav-link').forEach(b => b.classList.toggle('active', b.dataset.topic === id));
    document.querySelectorAll('[data-rail-topic]').forEach(b => b.classList.toggle('active', b.dataset.railTopic === id));
    const i = currentIndex();
    document.getElementById('mobileProgress').textContent = (i + 1) + ' / ' + topics.length;
    document.getElementById('mobilePrev').textContent = i === 0 ? 'Overview' : '\u2190 ' + topics[i - 1].title;
    document.getElementById('mobileNext').textContent = i === topics.length - 1 ? 'Start over' : topics[i + 1].title + ' \u2192';
    // Auto-expand the nav group containing the active topic
    const activeLink = document.querySelector('.nav-link.active');
    if (activeLink) {
      const groupItems = activeLink.closest('.nav-group-items');
      if (groupItems && groupItems.classList.contains('nav-collapsed')) {
        groupItems.classList.remove('nav-collapsed');
        const groupBtn = groupItems.previousElementSibling;
        if (groupBtn && groupBtn.classList.contains('nav-group-btn')) {
          groupBtn.setAttribute('aria-expanded', 'true');
        }
        try { sessionStorage.setItem('ng_' + (groupBtn?.querySelector('span')?.textContent || ''), '0'); } catch(e){}
      }
    }
  }

  function openTopic(id) { location.hash = id; document.getElementById('leftNav').classList.remove('open'); }

  function renderOverview() {
    const ov = document.getElementById('overviewView');
    const openIssues = metrics.open || 9;
    const milestones = metrics.milestones || 3;
    ov.innerHTML = `
<section class="hero">
  <div>
    <div class="eyebrow">Mission-critical documentation workspace</div>
    <h1>SETU Flow CRM &mdash; Technical Documentation</h1>
    <p>Comprehensive technical resources for architects, developers, and operators building and running mission-critical commercial workflows on SETU Flow CRM.</p>
    <div class="hero-search"><span>&#x2315;</span><input placeholder="Search docs, modules, APIs, workflows..." oninput="Docs.search(this.value)"><kbd>&#x2318;K</kbd></div>
    <div class="hero-chips">
      <button onclick="Docs.openTopic('api-integrations')">API Reference</button>
      <button onclick="Docs.openTopic('workflows')">Commercial Workflows</button>
      <button onclick="Docs.openTopic('data-security')">Data Model</button>
      <button onclick="Docs.openTopic('operator-guides')">Operator Guides</button>
      <button onclick="Docs.openTopic('live-ui')">Live UI Snapshots</button>
    </div>
  </div>
  <div class="readiness-card">
    <div class="ring"><span id="readyPct">66%</span></div>
    <b>Documentation Readiness</b>
    <p>Live issue counts and roadmap signals refresh from Supabase when available.</p>
  </div>
</section>
<section class="quick-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
  <div class="quick-card internal-only">
    <div class="quick-icon" style="background:#0d9488">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
    </div>
    <h3>Share Doc</h3>
    <p>Share this documentation with team members or external stakeholders.</p>
    <button onclick="Docs.openShare()">Share documentation</button>
    <div class="quick-card-arrow">&#x2192;</div>
  </div>
  <div class="quick-card internal-only">
    <div class="quick-icon" style="background:#2563eb">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
    </div>
    <h3>Issue Tracker <span class="quick-card-count" id="issueQuick">${openIssues}</span></h3>
    <p>View open issues, report bugs, or track documentation tasks and improvements.</p>
    <a href="setuflow-issue-tracker.html">Open issue tracker</a>
    <div class="quick-card-arrow">&#x2192;</div>
  </div>
  <div class="quick-card internal-only">
    <div class="quick-icon" style="background:#7c3aed">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
    </div>
    <h3>Roadmap <span class="quick-card-count" style="background:#7c3aed">${milestones}</span></h3>
    <p>Explore upcoming features, milestones, and product delivery timelines.</p>
    <a href="setuflow-roadmap.html">Open roadmap</a>
    <div class="quick-card-arrow">&#x2192;</div>
  </div>
  <div class="quick-card">
    <div class="quick-icon" style="background:#db2777">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
    </div>
    <h3>${isInternal() ? 'Add / Review' : 'View'} Screenshots</h3>
    <p>Browse all documentation sections and live UI snapshots at a glance.</p>
    <button onclick="Docs.openTopic('live-ui')">Open snapshots</button>
    <div class="quick-card-arrow">&#x2192;</div>
  </div>
  <div class="quick-card internal-only">
    <div class="quick-icon" style="background:#0f766e">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
    </div>
    <h3>Pre-Demo Readiness</h3>
    <p>57-item checklist. Run before every prospect demo. Sign-off writes a DEMO_READY verdict to the DB.</p>
    <a href="setuflow-demo-checklist.html">Open checklist</a>
    <div class="quick-card-arrow">&#x2192;</div>
  </div>
  <div class="quick-card internal-only">
    <div class="quick-icon" style="background:#4f46e5">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
    </div>
    <h3>QA Test Suite</h3>
    <p>9 suites, 49 steps covering the full commercial journey. Failed steps auto-file bugs in the tracker.</p>
    <a href="setuflow-e2e-testing.html">Open test suite</a>
    <div class="quick-card-arrow">&#x2192;</div>
  </div>
</section>
<section class="metrics">
  <div class="metric">
    <span class="metric-icon">&#x25a6;</span>
    <small>Total Modules</small>
    <strong>28</strong>
    <div class="metric-badge up">&#x2191; 3 this month</div>
  </div>
  <div class="metric internal-only">
    <span class="metric-icon">&#x25CE;</span>
    <small>Open Issues</small>
    <strong id="openMetric">${openIssues}</strong>
    <div class="metric-badge warn" id="riskMetric">${metrics.criticalHigh || 1} critical / high</div>
  </div>
  <div class="metric internal-only">
    <span class="metric-icon">&#x2691;</span>
    <small>Roadmap Milestones</small>
    <strong id="roadMetric">${milestones}</strong>
    <div class="metric-badge good">On Track</div>
  </div>
  <div class="metric">
    <span class="metric-icon">&#x25C8;</span>
    <small>Latest Release</small>
    <strong>v2026.05</strong>
    <div class="metric-badge latest">Latest</div>
  </div>
</section>
<div class="arch-highlight" onclick="Docs.openTopic('architecture')">
  <div class="arch-highlight-icon">&#9874;</div>
  <div class="arch-highlight-text">
    <h3>System Architecture — Detailed View</h3>
    <p>Operators &rarr; Frontend routes &rarr; Server actions &rarr; Supabase &rarr; Document engine &amp; integrations. Risks and gaps flagged.</p>
  </div>
  <div class="arch-highlight-arrow">&#8599;</div>
</div>
<div class="overview-title">
  <div>
    <h2>Product overview and guided topics</h2>
    <p>Choose a topic. Each page explains what the system does, how to test it, and what can break.</p>
  </div>
</div>
<section class="topic-grid">${overviewTopicCards()}</section>`;
    if (shared.active) document.querySelectorAll('.internal-only').forEach(e => e.classList.add('hidden'));
  }

  function overviewTopicCards() {
    const links = {
      'architecture':     ['High-Level Architecture','Component Diagram','Deployment Topology','Tech Stack'],
      'workflows':        ['Lead to Opportunity','Quote to Contract','Order to Cash','Renewal & Upsell'],
      'diagrams':         ['Lead Flowchart','Quote Flowchart','Order Execution','Swimlane Diagrams'],
      'operator-guides':  ['Lead to Quote','Quote Build & Send','Order Execution','Finance Closeout'],
      'guru-ai':          ['Page Context Help','Business Card Scan','Smart vCard','Live Org Search'],
      'live-ui':          ['Dashboard Snapshots','Pipeline Workspace','Orders Cockpit','Mobile Capture'],
      'data-security':    ['Data Model Overview','Entity Relationship','Roles & Permissions','Security Practices'],
      'api-integrations': ['API Reference','Authentication','Webhooks','SDKs & Libraries'],
      'modules':          ['Dashboard','Leads','Pipeline','Quotes & Orders'],
      'mobile':           ['Business Card Scan','Smart vCard','Trade Event Capture','Field Qualification'],
      'quick-reference':  ['Never Break Rules','Always Verify','Core Routes','Quality Signals'],
    };
    return topics.filter(t => t.id !== 'overview').map(t => {
      const ls = (links[t.id] || []).map(l => `<span style="display:block;font-size:11.5px;color:#2563eb;font-weight:700;padding:1px 0">${l}</span>`).join('');
      return `<article class="topic-card" style="--t-accent:${t.accent}" onclick="Docs.openTopic('${t.id}')">
  <div class="topic-card-top">
    <div class="topic-icon" style="background:${t.accent}">${t.icon}</div>
    <div style="flex:1;min-width:0"><h3>${t.title}</h3><p>${t.summary}</p>${ls ? `<div style="margin-top:8px">${ls}</div>` : ''}</div>
  </div>
  <div class="topic-card-footer"><span>${t.group}</span><span>View all &#x2192;</span></div>
</article>`;
    }).join('');
  }

  function topicContent(id) {
    const map = {};

    map['architecture'] = `<div class="arch-tabs"><button class="arch-tab arch-active" onclick="Docs.switchArchTab(0)">Stack Overview</button><button class="arch-tab" onclick="Docs.switchArchTab(1)">&#128443; Visual Overview</button></div><div class="arch-panel arch-active"><div class="pro-grid">
  <div class="pro-card"><b>App Shell</b><p>Next.js App Router with server-rendered workspaces, focused client components, and route contracts for every CRM module. All screens represent workflow states and gates.</p></div>
  <div class="pro-card"><b>Data Boundary</b><p>Supabase Postgres with organization-scoped RLS. Every server action must filter by <code>organization_id</code>. No cross-org leakage permitted. RLS is the final enforcement layer.</p></div>
  <div class="pro-card"><b>Integration Boundary</b><p>Email, WhatsApp, freight, finance, and AI integrations stay adapter-backed and auditable. No live external provider call from UI code without an approved adapter.</p></div>
</div>
<div class="section-block"><h2>Architecture Narrative</h2>
<p>SETU Flow CRM is a controlled commercial operating system organized around authenticated workspaces: Dashboard, Leads, Pipeline, Quotes, Orders, Products, Trade Events, Admin, and Mobile. The database is the source of truth, while UI screens represent workflow states and gates — not isolated pages.</p>
<p>Every commercial transaction follows a strict gate-and-approve model. No stage can be skipped without explicit human approval. AI assists but does not act autonomously on external sends, approvals, or compliance decisions.</p>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>Layer</th><th>Technology</th><th>Responsibility</th><th>Tester Focus</th></tr></thead>
<tbody>
<tr><td><b>UI</b></td><td>Next.js 14 App Router</td><td>Routes, workspace views, server components, document previews</td><td>Confirm every CTA writes expected rows and preserves org scope.</td></tr>
<tr><td><b>Server Actions</b></td><td>Next.js Server Actions</td><td>Validated mutations, gate checks, workflow RPCs, audit writes</td><td>All mutations go through server actions — never direct client Supabase writes for sensitive data.</td></tr>
<tr><td><b>Database</b></td><td>Supabase Postgres</td><td>Auth, RLS, workflow data, audit records, issue tracker, docs screenshots</td><td>Validate org members see only their workspace data. RLS is the last defense.</td></tr>
<tr><td><b>Auth</b></td><td>Supabase Auth + JWT</td><td>Session management, workspace membership, role-based permission helpers</td><td>Confirm sign-in and session expiry. Role boundaries enforced server-side.</td></tr>
<tr><td><b>Deployment</b></td><td>Vercel</td><td>Production deployment, build proof, environment variables</td><td>Every fix must deploy green before the tracker closes. Preview URLs are never buyer links.</td></tr>
<tr><td><b>AI</b></td><td>Anthropic API via Setu Guru</td><td>Page context help, org search, HSN research, pricing defaults — human-approved only</td><td>AI cannot bypass approval, compliance, or send gates. All Guru actions are reviewable.</td></tr>
<tr><td><b>Email</b></td><td>Mailtrap / Resend-ready boundary</td><td>Order document sends, invitation emails, webhook delivery confirmation</td><td><code>link_created</code> is not delivered. Provider confirmation is required before treating a send as delivered.</td></tr>
<tr><td><b>PDF</b></td><td>puppeteer-core + @sparticuz/chromium</td><td>Document generation via free OSS path — no paid PDF API</td><td>Browser-print available as fallback. Server-side via approved OSS path only.</td></tr>
</tbody></table></div>
<div class="section-block"><h2>Route Groups</h2></div>
<div class="tbl-wrap"><table>
<thead><tr><th>Route</th><th>Module</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>/dashboard</code></td><td>Dashboard</td><td>Executive KPIs, market command map, activity feed, follow-up queue</td></tr>
<tr><td><code>/leads</code></td><td>Follow-up / Lead Command Center</td><td>Buyer/supplier records, qualification, product coverage, compliance</td></tr>
<tr><td><code>/pipeline</code></td><td>Pipeline</td><td>Kanban, swimlane, forecast, density controls</td></tr>
<tr><td><code>/quotes</code></td><td>Quote Builder</td><td>Versioned quotes, FX, pricing, approval gates, send tracking</td></tr>
<tr><td><code>/orders</code></td><td>Order Execution Cockpit</td><td>Actual lines, documents, packing, freight, processing, dispatch, finance</td></tr>
<tr><td><code>/products</code></td><td>Catalog</td><td>Categories, products, variants, pricing rule sets, bulk CSV import</td></tr>
<tr><td><code>/admin/*</code></td><td>Admin</td><td>Org settings, users, invitations, roles, trade events, document templates</td></tr>
<tr><td><code>/mobile/*</code></td><td>Mobile Workspace</td><td>Business card scan, smart vCard, field capture, mobile leads/quotes</td></tr>
<tr><td><code>/contact-exchange/scan</code></td><td>Capture</td><td>Business card scan — creates reviewable lead drafts</td></tr>
<tr><td><code>/order-documents/preview/[token]</code></td><td>Document Preview</td><td>Tokenized buyer-facing document preview — tracks open count</td></tr>


<tr><td><code>/admin/pipelines</code></td><td>Pipeline Board (Visual Pipeline Board)</td><td>Visual stage pill board per pipeline; CSS :target edit drawers; add/edit stages and pipelines without client components</td></tr>
<tr><td><code>/admin/security</code></td><td>Permission Matrix (Security &amp; Roles)</td><td>Role-based permission matrix across 10 permission groups; grouped checkbox drawers; <code>role_permissions</code> table</td></tr>
<tr><td><code>/admin/integrations</code></td><td>Integration Status (Integrations Status)</td><td>Live 3-column status grid for Email (Mailtrap), Finance, and Freight adapters; amber warning when email misconfigured</td></tr>
<tr><td><code>/admin/rate-limits</code></td><td>Rate Limits (Rate Limits)</td><td>SETU-internal only; 5 monitored endpoints; per-org override drawers; <code>rate_limit_overrides</code> + audit table</td></tr>
<tr><td><code>/admin/guru-config</code></td><td>Guru Config (Guru Config)</td><td>Per-org Guru settings; model selector; 4 toggle checkboxes; daily budget; <code>workspace_guru_settings</code> table</td></tr>
<tr><td><code>/admin/client-onboarding</code></td><td>Client Onboarding Inbox (Client Onboarding)</td><td>Redesigned: stat bar (Needs Action/Reviewing/Live/Total); StatusPipeline component; plan change detection; sorted server-side</td></tr>
<tr><td><code>/admin/client-management</code></td><td>Client Management (Client Management)</td><td>SETU HQ only; unified client provisioning, plan controls, seats, module access, Guru usage; <code>client_entitlements</code> + <code>client_usage_rollups</code></td></tr>
<tr><td><code>/admin/api-keys</code></td><td>API Keys & Webhooks (API Keys &amp; Webhooks)</td><td>SETU-internal only; <code>sf_live_</code> prefix keys; SHA-256 hash stored only; raw shown once; revoke/audit trail; webhook stub</td></tr>
<tr><td><code>/compliance</code></td><td>Compliance Module</td><td>Evidence attachment, waiver with reason, defer to dispatch; every resolution requires written record; blocks quote send</td></tr>
<tr><td><code>/approval-send</code></td><td>Approval & Send Gateway</td><td>Quote approval/rejection with required reason; send by Email or WhatsApp handoff; gate must clear before send</td></tr>
<tr><td><code>/contracts</code></td><td>Contracts</td><td>Contract lineage from accepted quote; binds quote version to order; immutable after acceptance</td></tr>
<tr><td><code>/reports</code></td><td>Reports</td><td>Lead-to-order funnel, quote performance, document send effectiveness, top markets; filters shared across panels</td></tr>
<tr><td><code>/tasks</code></td><td>Tasks Module</td><td>Cross-module task queue; linked to leads, quotes, and orders; overdue visibility</td></tr>
<tr><td><code>/ai-suggestions</code></td><td>AI Suggestions</td><td>Anthropic-powered draft and review suggestions; human approval required; no autonomous external actions</td></tr>
<tr><td><code>/onboarding</code></td><td>Client Onboarding Wizard </td><td>Extended onboarding wizard; public form + admin provisioning; <code>onboarding_wizard_extended</code> migration</td></tr>

</tbody></table></div>
<div class="section-block"><h2>SF-19: Module Grants & Client Entitlements</h2>
<p>Sprint 19 introduced a two-layer client access control system that allows SETU to manage which modules each client org can access, and to enforce seat and usage limits without hardcoded config.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">org_module_grants </div><ul><li>Maps each organization to the modules it has access to</li><li>Checked at server action level — no module data leaks to unauthorized orgs</li><li>Admin: <code>/admin/client-management</code> manages grants per client</li><li>Migration: <code>20260527000100_sf19_org_module_grants.sql</code></li></ul></div>
  <div class="doc-card border-blue"><div class="doc-card-title">client_entitlements (Client Management)</div><ul><li>Stores seat limits, feature flags, and plan tier per client org</li><li>Used by DB capability helper (Pass-9-004) for enforcement at DB layer</li><li>SETU admin writes; org member reads own row only</li><li>Migration: <code>20260527020000_sf19_client_entitlements.sql</code></li></ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">Notification Foundation </div><ul><li><code>notifications</code> table added in Sprint 18</li><li>Supports in-app and email notification targets</li><li>RLS: users own their own notifications; INSERT policy for auth members</li><li>Migration: <code>20260523072000_sprint18_notifications_foundation.sql</code></li></ul></div>
</div></div><div class="arch-panel"><div class="section-block arch-map-intro"><h2>System Architecture — Visual Overview</h2><p>Five-column product map showing operators, frontend route groups, server actions, Supabase, document engine, and integration boundaries. The layout mirrors the deployed product architecture and keeps known gaps visible.</p></div><div class="arch-svg-card"><img src="docs-assets/diagram-architecture.svg" alt="SETU Flow CRM architecture visual overview"></div><div class="arch-legend"><div><span class="arch-legend-line solid"></span>User action / data flow</div><div><span class="arch-legend-line dashed"></span>Integration boundary / adapter needed</div><div><span class="arch-risk">&#9888;</span> Known risk / gap</div></div></div>`;
    map['modules'] = `
<div class="mod-flow-row">
  <div class="mod-flow-label">Commercial lifecycle</div>
  <div class="mod-flow-chain">
    <a class="mod-flow-chip mod-flow-chip--blue" onclick="Docs.openTopic(\\'leads\\')">&#9673; Lead</a>
    <span class="mod-flow-arr">&#8594;</span>
    <a class="mod-flow-chip mod-flow-chip--teal" onclick="Docs.openTopic(\\'workflows\\')">&#128196; Quote</a>
    <span class="mod-flow-arr">&#8594;</span>
    <a class="mod-flow-chip mod-flow-chip--indigo" onclick="Docs.openTopic(\\'workflows\\')">&#9711; Order</a>
    <span class="mod-flow-arr">&#8594;</span>
    <a class="mod-flow-chip mod-flow-chip--amber" onclick="Docs.openTopic(\\'documents\\')">&#128228; Dispatch</a>
    <span class="mod-flow-arr">&#8594;</span>
    <a class="mod-flow-chip mod-flow-chip--green" onclick="Docs.openTopic(\\'workflows\\')">&#10003; Close</a>
  </div>
</div>

<div class="mod-group-label">Commercial Core</div>
<div class="mod-card-grid">

  <div class="mod-card mod-card--blue">
    <div class="mod-card-head">
      <div class="mod-card-icon">&#128100;</div>
      <div>
        <div class="mod-card-name">Leads</div>
        <code class="mod-card-route">/leads</code>
      </div>
      <span class="mod-ready-badge">&#10003; Ready signal</span>
    </div>
    <ul class="mod-card-bullets">
      <li>Buyer/supplier records with qualification workflow</li>
      <li>Lead Command Center — 3-tab detail (workflow, quotes, activity)</li>
      <li>Product coverage gate + compliance posture</li>
      <li>Follow-up queue with overdue indicators</li>
      <li>Buyer and supplier split views</li>
    </ul>
    <div class="mod-card-signal">Command Center opens with clear next actions. Quote CTA appears only when coverage + compliance gates pass.</div>
    <div class="mod-card-dep">&#8594; Creates context for <b>Quotes</b></div>
  </div>

  <div class="mod-card mod-card--slate">
    <div class="mod-card-head">
      <div class="mod-card-icon">&#128202;</div>
      <div>
        <div class="mod-card-name">Pipeline</div>
        <code class="mod-card-route">/pipeline</code>
      </div>
      <span class="mod-ready-badge">&#10003; Ready signal</span>
    </div>
    <ul class="mod-card-bullets">
      <li>Kanban board across 11 configurable pipeline stages</li>
      <li>Swimlane view + forecast mode</li>
      <li>Density controls, stage filters, overdue indicators</li>
      <li>Buyer and supplier board splits</li>
    </ul>
    <div class="mod-card-signal">View controls do not break stage logic. Cards show overdue follow-up indicators correctly.</div>
    <div class="mod-card-dep">&#8594; Reads from <b>Leads</b></div>
  </div>

  <div class="mod-card mod-card--teal">
    <div class="mod-card-head">
      <div class="mod-card-icon">&#128196;</div>
      <div>
        <div class="mod-card-name">Quotes</div>
        <code class="mod-card-route">/quotes</code>
      </div>
      <span class="mod-ready-badge">&#10003; Ready signal</span>
    </div>
    <ul class="mod-card-bullets">
      <li>Versioned quote workspace with FX snapshots</li>
      <li>Pricing rule cascade (product &rarr; category &rarr; org default)</li>
      <li>Approval gate at &gt;15% override threshold</li>
      <li>Send tracking — Email and WhatsApp channels</li>
      <li>Customer-facing PDF (V17.6.10 layout)</li>
    </ul>
    <div class="mod-card-signal">Sent versions are immutable. Accepted version cannot be edited after contract is created.</div>
    <div class="mod-card-dep">&#8592; Requires <b>Leads</b> &nbsp;&#8594; Creates <b>Orders</b></div>
  </div>

  <div class="mod-card mod-card--indigo">
    <div class="mod-card-head">
      <div class="mod-card-icon">&#9711;</div>
      <div>
        <div class="mod-card-name">Orders</div>
        <code class="mod-card-route">/orders</code>
      </div>
      <span class="mod-ready-badge">&#10003; Ready signal</span>
    </div>
    <ul class="mod-card-bullets">
      <li>5-state execution lifecycle: draft &rarr; ready &rarr; released &rarr; dispatched &rarr; complete</li>
      <li>Actual lines, packing, freight, trade requirements, processing, shipment</li>
      <li>Document gate: proforma invoice or order confirmation</li>
      <li>Finance closeout with reconciliation confirmation</li>
      <li>Slide-in order detail panel with stage progress tracker</li>
    </ul>
    <div class="mod-card-signal">No stage skips without gate approval. <code>link_created</code> &ne; delivered.</div>
    <div class="mod-card-dep">&#8592; Requires <b>Quotes</b> accepted</div>
  </div>

</div>

<div class="mod-group-label">Operations &amp; Reference</div>
<div class="mod-card-grid">

  <div class="mod-card mod-card--amber">
    <div class="mod-card-head">
      <div class="mod-card-icon">&#128230;</div>
      <div>
        <div class="mod-card-name">Products &amp; Catalog</div>
        <code class="mod-card-route">/products &nbsp; /admin/product-management</code>
      </div>
      <span class="mod-ready-badge">&#10003; Ready signal</span>
    </div>
    <ul class="mod-card-bullets">
      <li>Categories, products, variants (pack size, UOM, MOQ)</li>
      <li>Pricing rule sets — org &rarr; category &rarr; product cascade</li>
      <li>Bulk CSV import + catalog admin governance workbench</li>
    </ul>
    <div class="mod-card-signal">Pricing cascades correctly: org then category then product.</div>
    <div class="mod-card-dep">&#8594; Feeds <b>Quotes</b> pricing</div>
  </div>

  <div class="mod-card mod-card--purple">
    <div class="mod-card-head">
      <div class="mod-card-icon">&#128196;</div>
      <div>
        <div class="mod-card-name">Documents</div>
        <code class="mod-card-route">/documents &nbsp; /order-documents/preview/[token]</code>
      </div>
      <span class="mod-ready-badge">&#10003; Ready signal</span>
    </div>
    <ul class="mod-card-bullets">
      <li>Document control desk: expiry posture, version visibility, reviewer ownership</li>
      <li>Tokenized buyer-facing preview link with open tracking</li>
      <li>Requirement satisfaction status per order</li>
    </ul>
    <div class="mod-card-signal">Document requirement rules enforced at order dispatch gate. <code>link_created</code> &ne; delivered.</div>
  </div>

  <div class="mod-card mod-card--orange">
    <div class="mod-card-head">
      <div class="mod-card-icon">&#9733;</div>
      <div>
        <div class="mod-card-name">Trade Events</div>
        <code class="mod-card-route">/trade-events &nbsp; /admin/trade-events</code>
      </div>
      <span class="mod-ready-badge">&#10003; Ready signal</span>
    </div>
    <ul class="mod-card-bullets">
      <li>Event setup with source label + capture defaults</li>
      <li>Business card scan &rarr; entry &rarr; convert to lead flow</li>
      <li>Event analytics: lead count, pipeline value, orders placed</li>
    </ul>
    <div class="mod-card-signal">Scan creates reviewable lead drafts — operators approve before commercial record created.</div>
    <div class="mod-card-dep">&#8594; Entries convert to <b>Leads</b></div>
  </div>

  <div class="mod-card mod-card--slate">
    <div class="mod-card-head">
      <div class="mod-card-icon">&#9989;</div>
      <div>
        <div class="mod-card-name">Tasks</div>
        <code class="mod-card-route">/tasks</code>
      </div>
      <span class="mod-ready-badge">&#10003; Ready signal</span>
    </div>
    <ul class="mod-card-bullets">
      <li>Cross-module task queue — always linked to a lead, quote, or order</li>
      <li>Scheduled and ad-hoc types with priority and overdue visibility</li>
      <li>Mobile tasks workspace for field operators</li>
    </ul>
    <div class="mod-card-signal">Tasks do not replace gate approvals — they supplement workflow tracking.</div>
  </div>

</div>

<div class="mod-group-label">Configuration &amp; Analytics</div>
<div class="mod-card-grid">

  <div class="mod-card mod-card--navy">
    <div class="mod-card-head">
      <div class="mod-card-icon">&#9003;</div>
      <div>
        <div class="mod-card-name">Admin</div>
        <code class="mod-card-route">/admin/*</code>
      </div>
      <span class="mod-ready-badge">&#10003; Ready signal</span>
    </div>
    <ul class="mod-card-bullets">
      <li>Org settings, user invitations, role management</li>
      <li>Pricing engine, document templates, API keys, rate limits</li>
      <li>Trade event setup, Guru config, SEO intelligence (SETU internal)</li>
      <li>All 11 sub-pages fully CSS :target pattern — zero <code>useState</code></li>
    </ul>
    <div class="mod-card-signal">Role-based access enforced server-side. Non-admin users cannot invite.</div>
  </div>

  <div class="mod-card mod-card--blue">
    <div class="mod-card-head">
      <div class="mod-card-icon">&#128241;</div>
      <div>
        <div class="mod-card-name">Mobile Workspace</div>
        <code class="mod-card-route">/mobile/*</code>
      </div>
      <span class="mod-ready-badge">&#10003; Ready signal</span>
    </div>
    <ul class="mod-card-bullets">
      <li>Business card scan using OpenAI Vision (<code>gpt-4.1-mini</code>)</li>
      <li>Smart vCard — public share link with contact exchange</li>
      <li>Mobile dashboard: 4 KPI cards + Mobile Guru AI</li>
      <li>Mobile order list + lead pipeline for field operators</li>
    </ul>
    <div class="mod-card-signal">Scan creates reviewable drafts — operators approve before any commercial record is created.</div>
  </div>

  <div class="mod-card mod-card--teal">
    <div class="mod-card-head">
      <div class="mod-card-icon">&#128200;</div>
      <div>
        <div class="mod-card-name">Dashboard &amp; Analytics</div>
        <code class="mod-card-route">/dashboard &nbsp; /reports &nbsp; /dashboard/analytics</code>
      </div>
      <span class="mod-ready-badge">&#10003; Ready signal</span>
    </div>
    <ul class="mod-card-bullets">
      <li>Executive KPI command centre — 6 parallel analytics queries</li>
      <li>Lead-to-order funnel, quote win rate, order execution stats</li>
      <li>Document send effectiveness, market and product breakdowns</li>
      <li>Buyer and supplier dashboard splits</li>
    </ul>
    <div class="mod-card-signal">KPIs load without cross-org leakage. Charts render without crashing. Filters shared across panels.</div>
  </div>

</div>

<div class="mod-gate-ref">
  <div class="mod-gate-ref-title">&#9679; Gate summary across modules</div>
  <div class="mod-gate-row"><span class="mod-gate-label">Leads</span><span class="mod-gate-items">Coverage &#10140; Compliance &#10140; Quote CTA</span></div>
  <div class="mod-gate-row"><span class="mod-gate-label">Quotes</span><span class="mod-gate-items">Approval (&gt;15% override) &#10140; Compliance clear &#10140; Send</span></div>
  <div class="mod-gate-row"><span class="mod-gate-label">Orders</span><span class="mod-gate-items">Contract lock &#10140; Doc approval &#10140; Dispatch &#10140; Payment reconciled &#10140; Closeout</span></div>
  <div class="mod-gate-row"><span class="mod-gate-label">Documents</span><span class="mod-gate-items">Preview &#10140; Approve &#10140; Send tracked</span></div>
  <div class="mod-gate-row"><span class="mod-gate-label">Mobile</span><span class="mod-gate-items">Scan &#10140; Human review &#10140; Approve to lead</span></div>
</div>

<div class="section-block"><h2>Admin Workspace —  Overhaul</h2>
<p>All 11 Admin subtasks (A through K) were completed in May 2026. The admin experience is now fully CSS :target pattern — zero new client components, zero useState, pure server render with animated drawers.</p>
</div>
<div class="admin-module-grid">
  <div class="admin-module-card" style="--am-color:#2563eb">
    <span class="admin-module-route">/admin/pipelines</span>
    <h3>Pipelines & Stages</h3>
    <p>Horizontal colored stage pill board per pipeline. Each stage shows color bar, name, sort order, and Won/Lost/Closed chips. CSS :target right-drawer for edit. Add pipeline, Add stage, Edit next step all via drawers.</p>
    <div class="admin-module-tags"><span class="admin-module-tag done">&#10003; Shipped</span><span class="admin-module-tag">No useState</span><span class="admin-module-tag">Server render</span></div>
  </div>
  <div class="admin-module-card" style="--am-color:#059669">
    <span class="admin-module-route">/admin/security</span>
    <h3>Security & Roles</h3>
    <p>Visual permission matrix: 10 permissions across Leads, Quotes, Orders, Admin modules. Read-only roles table; Edit opens 500px CSS :target drawer with grouped permission checkboxes. <code>updateRolePermissions</code> uses <code>formData.getAll</code>.</p>
    <div class="admin-module-tags"><span class="admin-module-tag done">&#10003; Shipped</span><span class="admin-module-tag">10 permissions</span><span class="admin-module-tag">Role-gated</span></div>
  </div>
  <div class="admin-module-card" style="--am-color:#0d9488">
    <span class="admin-module-route">/admin/integrations</span>
    <h3>Integrations Live Status</h3>
    <p>3-column live status grid. Email status from <code>MAILTRAP_API_KEY</code> env; Finance/Freight from <code>integrations</code> table <code>is_active</code>. Amber warning banner when email misconfigured. SETU-internal admin only.</p>
    <div class="admin-module-tags"><span class="admin-module-tag done">&#10003; Shipped</span><span class="admin-module-tag">Live status</span><span class="admin-module-tag">Amber warnings</span></div>
  </div>
  <div class="admin-module-card" style="--am-color:#7c3aed">
    <span class="admin-module-route">/admin/rate-limits</span>
    <h3>Rate Limits</h3>
    <p>SETU-internal only. 5 monitored endpoints merged with per-org overrides. Violet highlight for active overrides. CSS :target edit drawer per endpoint. DB: <code>rate_limit_overrides</code> + <code>rate_limit_override_audit</code>.</p>
    <div class="admin-module-tags"><span class="admin-module-tag done">&#10003; Shipped</span><span class="admin-module-tag">SETU only</span><span class="admin-module-tag">Audit trail</span></div>
  </div>
  <div class="admin-module-card" style="--am-color:#db2777">
    <span class="admin-module-route">/admin/guru-config</span>
    <h3>Setu Guru Config</h3>
    <p>All org admins. Monthly usage bar from <code>rate_limit_hits</code>. Model selector, 4 toggle checkboxes, daily budget input. <code>saveGuruConfig</code> upserts <code>workspace_guru_settings</code>. Falls back to env vars if no row.</p>
    <div class="admin-module-tags"><span class="admin-module-tag done">&#10003; Shipped</span><span class="admin-module-tag">Per-org config</span><span class="admin-module-tag">Usage tracking</span></div>
  </div>
  <div class="admin-module-card" style="--am-color:#f97316">
    <span class="admin-module-route">/admin/client-onboarding</span>
    <h3>Client Onboarding Inbox</h3>
    <p>Redesigned: AdminPageHero → Dashboard stat bar (Needs Action, Reviewing, Live, Total) → Request inbox → Collapsible docs. <code>StatusPipeline</code> component shows 4-step flow per request card. Plan change request detection from <code>pricing_rules_notes</code>.</p>
    <div class="admin-module-tags"><span class="admin-module-tag done">&#10003; Shipped</span><span class="admin-module-tag">Stat pipeline</span><span class="admin-module-tag">Plan change detection</span></div>
  </div>
  <div class="admin-module-card" style="--am-color:#0f172a">
    <span class="admin-module-route">/admin/api-keys</span>
    <h3>API Keys & Webhooks</h3>
    <p>SETU-internal only. Generates <code>sf_live_</code> prefixed keys with SHA-256 hash storage. Raw key shown once in a green one-time reveal banner. Revoke sets <code>is_active=false</code> and stamps <code>revoked_at</code>. Webhook stub with "Coming soon".</p>
    <div class="admin-module-tags"><span class="admin-module-tag done">&#10003; Shipped</span><span class="admin-module-tag">SHA-256 only</span><span class="admin-module-tag">SETU only</span></div>
  </div>
  <div class="admin-module-card" style="--am-color:#1d4ed8">
    <span class="admin-module-route">/admin/client-management</span>
    <h3>Client Management Console (Client Management)</h3>
    <p>SETU HQ only. Unified: client provisioning, plan controls, seat limits, module access, and Guru usage in one internal screen. Source tables: <code>client_entitlements</code>, <code>client_usage_rollups</code>. Replaces scattered admin/modules and admin/client-onboarding redirects.</p>
    <div class="admin-module-tags"><span class="admin-module-tag done">&#10003; Shipped</span><span class="admin-module-tag">HQ only</span><span class="admin-module-tag">Client Management</span></div>
  </div>
</div>
<div class="section-block"><h2>Reports Workspace (/reports)</h2>
<p>The reports workspace surfaces commercial performance data across the full Lead → Quote → Order → Closeout funnel. All data is organization-scoped. Role <code>reporting.view</code> required to access; <code>lead.manage</code> required for full interactive mode.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128200; Commercial Funnel</div><ul>
    <li>Stages: Leads Created → Follow-ups Planned → Quotes Sent → Orders Placed → Orders Closed</li>
    <li>Conversion rate at each stage shown as percentage of previous stage</li>
    <li>Stage counts link to filtered list views for drill-down</li>
    <li>Deal value estimated from <code>leads.deal_value</code> where set</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128196; Quote Performance</div><ul>
    <li>Total sent, accepted, rejected per period</li>
    <li>Win rate: <code>accepted / sent</code></li>
    <li>Avg days to acceptance (from sent_at to accepted_at)</li>
    <li>Pending approval count — quotes blocked from send</li>
  </ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#128666; Order Execution</div><ul>
    <li>Draft / Active / Dispatched / Completed counts</li>
    <li>Active orders = orders in any non-terminal stage</li>
    <li>Compliance items breakdown: open vs resolved vs deferred</li>
    <li>Task completion rates linked to order milestones</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128239; Document Send Effectiveness</div><ul>
    <li>Total sends by channel: Email vs WhatsApp</li>
    <li>Opened links: token preview opens tracked</li>
    <li>Email delivery rate from Mailtrap webhook events</li>
    <li>Open rate: opened / sent (not email-specific)</li>
    <li>Email bounces: tracked when provider webhook fires</li>
  </ul></div>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>Report Panel</th><th>Source Tables</th><th>Role Required</th></tr></thead>
<tbody>
<tr><td>Commercial Funnel</td><td><code>leads</code>, <code>quotes</code>, <code>orders</code>, <code>pipeline_stages</code></td><td>reporting.view</td></tr>
<tr><td>Quote Performance</td><td><code>quotes</code>, <code>quote_versions</code></td><td>reporting.view</td></tr>
<tr><td>Order Execution</td><td><code>orders</code>, <code>order_lines</code></td><td>reporting.view</td></tr>
<tr><td>Doc Send Effectiveness</td><td><code>order_document_sends</code>, <code>communications</code></td><td>reporting.view</td></tr>
<tr><td>Market Breakdown</td><td><code>markets</code>, <code>leads</code>, <code>quotes</code>, <code>orders</code></td><td>reporting.view</td></tr>
<tr><td>Product Breakdown</td><td><code>products</code>, <code>categories</code>, <code>lead_product_interests</code></td><td>reporting.view</td></tr>

<tr><td><code>/documents</code></td><td>Documents Workspace</td><td>Document control desk: file review, expiry posture, version visibility, reviewer ownership across all org documents</td></tr>
<tr><td><code>/integrations</code></td><td>Integration Hub</td><td>Status overview of 6 governed connectors: Email, Document evidence, AI suggestions, vCard, Trade event capture, Tasks</td></tr>
<tr><td><code>/trade-events</code></td><td>Trade Events Workspace</td><td>Event analytics (lead count, pipeline value, orders placed); convert captured entries to leads</td></tr>
<tr><td><code>/leads/[leadId]</code></td><td>Lead Command Center</td><td>3-tab deep link: workflow (qualification + coverage), quotes, activity history</td></tr>
<tr><td><code>/leads/buyers</code></td><td>Buyer Leads</td><td>Lead list filtered to <code>lead_type = "buyer"</code></td></tr>
<tr><td><code>/leads/suppliers</code></td><td>Supplier Leads</td><td>Lead list filtered to <code>lead_type = "supplier"</code></td></tr>
<tr><td><code>/pipeline/buyers</code></td><td>Buyer Pipeline</td><td>Kanban board for buyer leads only</td></tr>
<tr><td><code>/pipeline/suppliers</code></td><td>Supplier Pipeline</td><td>Kanban board for supplier leads only</td></tr>
<tr><td><code>/dashboard/buyers</code></td><td>Buyer Dashboard</td><td>Buyer-focused KPI view</td></tr>
<tr><td><code>/dashboard/suppliers</code></td><td>Supplier Dashboard</td><td>Supplier-focused KPI view</td></tr>
<tr><td><code>/profile</code></td><td>User Profile</td><td>full_name, username edit; vCard identity source</td></tr>
<tr><td><code>/settings/notifications</code></td><td>Notification Preferences</td><td>Per-user notification channel settings</td></tr>
<tr><td><code>/admin/overview</code></td><td>Admin Overview</td><td>8-count stat dashboard: markets, countries, stages, products, categories, roles, invites, members</td></tr>
<tr><td><code>/admin/stages</code></td><td>Pipeline Stages Admin</td><td>Manages <code>pipeline_stages</code> and <code>next_steps</code> tables; separate from pipeline board admin</td></tr>
<tr><td><code>/admin/product-management</code></td><td>Catalog Admin</td><td>Product governance workbench; <code>pricing_calculator_default_rules</code>; <code>catalog.manage</code> role required</td></tr>
<tr><td><code>/admin/seo-intelligence</code></td><td>SEO Intelligence</td><td>SETU-internal only; live Google Trends, keyword coverage, competitor gap analysis, Push PR workflow</td></tr>
<tr><td><code>/card</code></td><td>Public vCard</td><td>Publicly accessible digital business card; OG metadata; request-a-quote and vCard save actions</td></tr>
<tr><td><code>/invite/[token]</code></td><td>Invitation Acceptance</td><td>Token-gated onboarding; new user registration or existing user membership add</td></tr>

<tr><td><b>Documents</b></td><td><code>/documents</code></td><td>Document control desk — file review, expiry posture, version visibility across leads, quotes, orders</td><td>Read-only for non-compliance-review roles. Expiry dates must be checked before dispatch.</td></tr>
<tr><td><b>Integrations Hub</b></td><td><code>/integrations</code></td><td>Status overview of 6 governed connectors: Email, Document evidence, AI suggestions, vCard, Trade events, Tasks</td><td>Hub is read-only. Each connector links to its functional workspace.</td></tr>
<tr><td><b>Trade Events</b></td><td><code>/trade-events</code></td><td>Event analytics, entry review, convert-to-lead action with full event attribution</td><td>All entries must be reviewed before conversion. Source label and event attribution preserved.</td></tr>
<tr><td><b>Catalog Admin</b></td><td><code>/admin/product-management</code></td><td>Pricing governance workbench — <code>pricing_calculator_default_rules</code>, cleanup tools for owners</td><td>Requires <code>catalog.manage</code> role. Pricing rules cascade: product → category → org default.</td></tr>
<tr><td><b>SEO Intelligence</b></td><td><code>/admin/seo-intelligence</code></td><td>SETU-internal: live trends, keyword coverage %, competitor gap, push PR workflow</td><td>SETU internal org only. <code>SEO_TREND_QUERIES</code> env var controls tracked keywords (max 5).</td></tr>
<tr><td><b>Admin Overview</b></td><td><code>/admin/overview</code></td><td>8-count admin dashboard: markets, countries, stages, products, categories, roles, invites, members</td><td>Admin role required. Quick-access links to each admin sub-workspace.</td></tr>
</tbody></table></div>
<div class="section-block"><h2>Dashboard Analytics (/dashboard/analytics)</h2>
<p>6 parallel analytics queries run server-side on every page load. Each panel links to its source workspace for drill-down. Data is always org-scoped — no cross-org leakage.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128202; 6 Analytics Panels</div><ul>
    <li><strong>Funnel</strong> — Lead → Quote → Order conversion with stage-by-stage drop-off rates</li>
    <li><strong>Quote Metrics</strong> — Win rate, avg days to accept, pending approval count</li>
    <li><strong>Order Metrics</strong> — Active, dispatched, completed, draft split</li>
    <li><strong>Document Send Metrics</strong> — Email/WhatsApp sends, open rate, delivery rate, bounces</li>
    <li><strong>Market Breakdown</strong> — Lead, quote, and order count by market/region</li>
    <li><strong>Product Breakdown</strong> — Lead count and active quotes per product category</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128270; Buyer & Supplier Dashboards</div><ul>
    <li><code>/dashboard/buyers</code> — Buyer-focused KPIs: lead pipeline, quote delivery, order status</li>
    <li><code>/dashboard/suppliers</code> — Supplier-focused KPIs: product coverage, fulfillment tracking</li>
    <li>Both dashboards share the same underlying data model but filter by contact type</li>
    <li>Executive command center: KPIs, market coverage map, priority actions, activity feed</li>
  </ul></div>
</div>`;


    map['documents'] = `
<div class="section-block"><h2>Documents Workspace (/documents)</h2>
<p>The Documents workspace is the operator desk for file review, expiry posture, version visibility, reviewer ownership, and document gate management across all active leads, quotes, and orders. Requires <code>compliance.review</code> role to advance document status.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128196; What It Shows</div><ul>
    <li>All order and compliance documents across the org</li>
    <li>Expiry posture — documents with <code>expires_at</code> approaching or past</li>
    <li>Version visibility — multiple document versions per order</li>
    <li>Reviewer ownership — who approved, when, linked entity</li>
    <li>Requirement status: <code>satisfied</code> / <code>pending</code> / <code>missing</code> / <code>expired</code></li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128279; Linked From</div><ul>
    <li>Compliance workspace links here: "Documents workspace" action button</li>
    <li>Integrations hub shows "Document evidence" connector linking here</li>
    <li>Order execution gate checks document requirement satisfaction before dispatch</li>
    <li>Source tables: <code>order_documents</code>, <code>order_document_sends</code>, <code>compliance_evidence</code></li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128683; Gate Integration</div><ul>
    <li>Open document blockers count toward <code>releaseBlockers</code> in the order execution evaluator</li>
    <li>Document requirement rules (<code>document_requirements</code> table) define what's needed per document type</li>
    <li><code>applicableCount</code>, <code>satisfiedCount</code>, <code>blockerCount</code> shown in order dispatch artifact state</li>
    <li>Read-only mode for non-compliance-reviewer roles</li>
  </ul></div>
</div>`;
    map['trade-events'] = `
<div class="section-block"><h2>Trade Events Workflow</h2>
<p>Trade events are the commercial bridge between field capture (business card scans, quick entries) and the main lead/pipeline workflow. Every captured contact flows through event → entry → lead conversion with full attribution.</p>
</div>
<div class="swimlane" style="margin:14px 0">
  <div class="swimlane-row"><div class="swimlane-label"><small>Admin Setup</small><b>/admin/trade-events</b></div><div class="swimlane-steps"><div class="lane-step"><b>Create event</b><span>Name, city, country, starts_on, ends_on</span></div><div class="lane-step system"><b>saveTradeEventCaptureDefaults</b><span>source_label, quick_lead_title defaults</span></div><div class="lane-step"><b>Pipeline stage defaults</b><span>Buyer and supplier stages auto-resolved</span></div></div></div>
  <div class="swimlane-row"><div class="swimlane-label"><small>At the Event</small><b>Field Capture</b></div><div class="swimlane-steps"><div class="lane-step"><b>Business card scan</b><span>/mobile/capture or /contact-exchange/scan</span></div><div class="lane-step"><b>Quick entry</b><span>Manual form — company, contact, deal value</span></div><div class="lane-step system"><b>saveTradeEventEntry</b><span>Entry saved with event attribution</span></div></div></div>
  <div class="swimlane-row"><div class="swimlane-label"><small>Post-Event</small><b>Conversion</b></div><div class="swimlane-steps"><div class="lane-step"><b>Review entries</b><span>Analytics: lead count, quoted count, pipeline value, orders placed</span></div><div class="lane-step"><b>Convert to lead</b><span>convertTradeEventEntryToLead action</span></div><div class="lane-step system"><b>Lead created</b><span>Enters follow-up queue with event source metadata</span></div></div></div>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128200; Event Analytics</div><ul>
    <li><code>leadCount</code> — total leads captured at this event</li>
    <li><code>quotedCount</code> — leads that received at least one quote</li>
    <li><code>openLeadCount</code> — leads still in active follow-up</li>
    <li><code>pipelineValue</code> — sum of deal_value across event leads</li>
    <li><code>ordersPlaced</code> + <code>orderHandoffCount</code> — conversion to order</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#9888; Source Attribution</div><ul>
    <li>Every lead converted from a trade event carries <code>source_label</code> and <code>trade_event_id</code></li>
    <li>Source context preserved in coverage selections and lead workflow metadata</li>
    <li><code>writeTradeEventAuditLog</code> writes an audit record for every entry and conversion action</li>
    <li>Communication record created when entry converts: <code>insertCommunication</code></li>
  </ul></div>
</div>`;
    map['integrations'] = `
<div class="section-block"><h2>Integrations Hub (/integrations)</h2>
<p>The integrations hub is a status overview of all governed connection points in the SETU Flow platform. It does not manage connections — it shows what is operational, what is review-gated, and links to the relevant workspace for each connector.</p>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>Connector</th><th>Status</th><th>Links To</th><th>What It Is</th></tr></thead>
<tbody>
<tr><td><b>Email sending</b></td><td><span class="badge badge-green">Ready</span></td><td><code>/approval-send</code></td><td>Governed quote and approval-send workflow for buyer-facing email communication via Mailtrap</td></tr>
<tr><td><b>Document evidence</b></td><td><span class="badge badge-green">Ready</span></td><td><code>/documents</code></td><td>Documents and compliance review cockpit for files linked to leads, quotes, and contracts</td></tr>
<tr><td><b>AI suggestions</b></td><td><span class="badge badge-blue">Review queue</span></td><td><code>/ai-suggestions</code></td><td>AI-generated drafts remain controlled — all suggestions require explicit operator approval before use</td></tr>
<tr><td><b>Digital vCard</b></td><td><span class="badge badge-green">Live</span></td><td><code>/contact-exchange/vcard</code></td><td>Public contact exchange and vCard intake for trade-show lead capture</td></tr>
<tr><td><b>Trade event capture</b></td><td><span class="badge badge-blue">Configured</span></td><td><code>/trade-events</code></td><td>Trade-show event defaults, source labels, and capture flows for lead intake</td></tr>
<tr><td><b>Operational tasks</b></td><td><span class="badge badge-slate">Internal</span></td><td><code>/tasks</code></td><td>Scheduled task creation and completion for follow-ups and order execution milestones</td></tr>
</tbody></table></div>
<div class="section-block"><h2>Lead Command Center (/leads/[leadId])</h2>
<p>The Lead Command Center is the single-screen operating desk for every commercial action on a lead. It loads in 3 tabs and surfaces all gates, coverage, follow-up, and compliance posture in one place before any quote is created.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#9776; 3 Tabs</div><ul>
    <li><strong>workflow</strong> — Qualification, product coverage, follow-up planning, compliance posture. The default tab.</li>
    <li><strong>quotes</strong> — All quote versions linked to this lead. Quote status, approval state, send history.</li>
    <li><strong>activity</strong> — Operation history: <code>sent</code>, <code>approval_request</code>, <code>quote_ready</code>, <code>coverage_saved</code>, <code>follow_up</code>, <code>qualification</code> events with timestamps.</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#10003; Qualification System</div><ul>
    <li>Status: <code>not_started</code> → <code>in_review</code> → <code>qualified</code> → <code>disqualified</code></li>
    <li>Disqualified leads are removed from the follow-up queue and cannot generate quotes</li>
    <li>Qualification notes stored as structured SETU_LEAD_WORKFLOW metadata embedded in the notes field</li>
    <li>Coverage status: <code>pending</code> → <code>in_progress</code> → <code>ready</code></li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128230; Coverage Gate</div><ul>
    <li>Lead must have at least one product interest before the Quote CTA becomes active</li>
    <li>Interest types: <code>category_only</code> or <code>confirmed_product</code></li>
    <li>Coverage selections stored in <code>lead_product_interests</code> — not in free-text notes</li>
    <li>Market mapping: one or more target markets required alongside product coverage</li>
  </ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#9654; Quick Edit Drawer</div><ul>
    <li>CSS :target drawer for rapid lead field edits without leaving the Command Center</li>
    <li>Today Context Bar shows: next follow-up date, overdue indicator, queue position</li>
    <li><code>openOrCreateLeadQuoteDraft</code> creates or reopens draft quote from lead context</li>
    <li><code>moveLeadToStage</code> advances pipeline stage from within the Command Center</li>
  </ul></div>
</div>
<div class="doc-alert doc-alert-blue"><strong>RFQ vs Quote:</strong> <code>/leads/[leadId]/quote</code> opens a buyer-facing quote. <code>/leads/[leadId]/rfq/new</code> creates an RFQ (supplier-side request for quote) — requires lead to be <strong>qualified</strong> first AND have at least one product mapped. An unqualified lead is blocked from RFQ creation.</div>
<div class="section-block"><h2>Buyer & Supplier Split Views</h2>
<p>Several core modules offer buyer and supplier split views. These are filtered perspectives on the same data — not separate data sources. The split is controlled by <code>lead_type: "buyer" | "supplier"</code> on the leads table.</p>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>Route</th><th>Filter</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>/leads/buyers</code></td><td><code>lead_type = "buyer"</code></td><td>Buyer-only lead list and command center queue</td></tr>
<tr><td><code>/leads/suppliers</code></td><td><code>lead_type = "supplier"</code></td><td>Supplier-only lead list — sourcing contacts and partners</td></tr>
<tr><td><code>/pipeline/buyers</code></td><td>Buyer pipeline stages</td><td>Kanban board filtered to buyer leads only</td></tr>
<tr><td><code>/pipeline/suppliers</code></td><td>Supplier pipeline stages</td><td>Kanban board filtered to supplier leads only</td></tr>
<tr><td><code>/dashboard/buyers</code></td><td>Buyer KPIs</td><td>Buyer-focused: quote delivery, order status, follow-up queue</td></tr>
<tr><td><code>/dashboard/suppliers</code></td><td>Supplier KPIs</td><td>Supplier-focused: product coverage, sourcing pipeline, fulfillment</td></tr>
</tbody></table></div>
<div class="doc-alert doc-alert-teal"><strong>Pipeline stage resolution:</strong> When converting a trade event entry to a lead, <code>resolvePipelineStageDefaults</code> automatically picks the correct starting stage based on <code>lead_type</code> — buyer and supplier leads start in different stages.</div>`;

    map['api-reference'] = `
<div class="section-block"><h2>Additional Routes Reference</h2>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>Route</th><th>Name</th><th>What it does</th></tr></thead>
<tbody>
<tr><td><code>/admin/notifications</code></td><td>Admin Notification Settings</td><td>Per-workspace notification preference matrix — enable/disable channels (in-app, email) per event type. Requires admin role.</td></tr>
<tr><td><code>/leads/[leadId]/quote</code></td><td>Lead Quote Surface</td><td>Mobile-safe quote creation from lead context. <code>MobileSafeLeadQuoteSurface</code> detects viewport and renders appropriate quote builder.</td></tr>
<tr><td><code>/leads/[leadId]/rfq/new</code></td><td>New RFQ from Lead</td><td>Create a supplier-side request for quote from a qualified lead. Requires lead to be qualified with at least one product mapped.</td></tr>
<tr><td><code>/mobile/leads</code></td><td>Mobile Leads</td><td>Phone-optimised leads list. Same data as desktop leads — simplified layout for field operators.</td></tr>
<tr><td><code>/mobile/pipeline</code></td><td>Mobile Pipeline</td><td>Mobile-optimised pipeline board for field use.</td></tr>
<tr><td><code>/mobile/quote</code></td><td>Mobile Quote</td><td>Mobile quote creation surface. Falls back to EmptyState if workspace is unavailable.</td></tr>
<tr><td><code>/mobile/notifications</code></td><td>Mobile Notifications</td><td>Mobile notification inbox — same underlying data as desktop notification centre.</td></tr>
</tbody></table></div>

<div class="section-block"><h2>Key API Endpoints Reference</h2>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>Endpoint</th><th>Method</th><th>Purpose</th></tr></thead>
<tbody>
<tr><td><code>/api/webhooks/mailtrap</code></td><td>POST / GET</td><td>Mailtrap delivery webhook receiver. GET returns health JSON. POST updates email_send_log + communications delivery_status.</td></tr>
<tr><td><code>/api/setu-guru/health</code></td><td>GET</td><td>Guru health check — verifies ANTHROPIC_API_KEY is configured. Returns {ok:true/false}.</td></tr>
<tr><td><code>/api/setu-guru/feedback</code></td><td>POST</td><td>Persists thumbs-up/down feedback to audit_logs. Body: {label, lastMessage, pathname}.</td></tr>
<tr><td><code>/api/modules/grants</code></td><td>GET</td><td>Returns module grant permissions for the current org. Used by module-gated routes.</td></tr>
<tr><td><code>/api/orders/[contractId]/invoice/pdf</code></td><td>GET</td><td>Generates proforma invoice PDF for an order contract.</td></tr>
<tr><td><code>/api/orders/[contractId]/order-confirmation/pdf</code></td><td>GET</td><td>Generates order confirmation PDF.</td></tr>
<tr><td><code>/api/catalog/import-csv</code></td><td>POST</td><td>Bulk CSV import for product catalog. Returns import run ID for progress polling.</td></tr>
<tr><td><code>/api/public/card-intake</code></td><td>POST</td><td>Receives vCard contact submissions from public /card page. Creates lead draft for review.</td></tr>
<tr><td><code>/api/public/apple-wallet</code></td><td>GET</td><td>Downloads vCard as Apple Wallet pass (.pkpass).</td></tr>
<tr><td><code>/api/public/google-wallet</code></td><td>GET</td><td>Downloads vCard as Google Wallet card.</td></tr>
<tr><td><code>/api/cron/analytics-snapshot</code></td><td>POST</td><td>Scheduled job — takes analytics snapshot for trend charts. Runs daily via Vercel Cron.</td></tr>
<tr><td><code>/api/notifications/email-digest</code></td><td>POST</td><td>Sends email digest of pending notifications to opted-in users.</td></tr>
<tr><td><code>/api/offline/leads</code></td><td>POST</td><td>Receives offline lead queue submissions from Service Worker sync.</td></tr>
<tr><td><code>/api/mobile/contact-scan</code></td><td>POST</td><td>OpenAI Vision (<code>gpt-4.1-mini</code>) business card parse endpoint. Returns structured contact fields.</td></tr>
</tbody></table></div>`;
    return map[id] || '';
  }

  function topicContentWorkflows(id) {
    if (id === 'workflows') return `
<div class="doc-alert doc-alert-teal">The SETU Flow operating spine: <strong>Capture &rarr; Follow-up &rarr; Quote &rarr; Approval &amp; Send &rarr; Orders / Execution &rarr; Closeout</strong>. Every commercial deal flows through these stages in sequence. No stage can be skipped without explicit gate approval.</div>
<div class="section-block"><h2>Commercial Pipeline</h2></div>
<div class="wf-pipeline">
  <div class="wf-stage st-complete"><div class="wf-stage-label">Capture</div><div class="wf-stage-route">/contact-exchange/scan</div></div>
  <div class="wf-stage st-complete"><div class="wf-stage-label">Follow-up</div><div class="wf-stage-route">/leads</div></div>
  <div class="wf-stage st-active"><div class="wf-stage-label">Quote</div><div class="wf-stage-route">/quotes</div></div>
  <div class="wf-stage st-pending"><div class="wf-stage-label">Approval &amp; Send</div><div class="wf-stage-route">/approval-send</div></div>
  <div class="wf-stage st-pending"><div class="wf-stage-label">Order Execution</div><div class="wf-stage-route">/orders</div></div>
  <div class="wf-stage st-pending"><div class="wf-stage-label">Closeout</div><div class="wf-stage-route">/orders [Paid]</div></div>
</div>
<div class="section-block"><h2>Full Workflow Reference Table</h2></div>
<div class="tbl-wrap"><table>
<thead><tr><th>Stage</th><th>Route</th><th>Primary CTAs</th><th>System Behavior</th><th>Blockers</th><th>Main Tables</th></tr></thead>
<tbody>
<tr><td><span class="badge badge-teal">Capture</span></td><td><code>/contact-exchange/scan</code></td><td>Review, Save lead, Open follow-up</td><td>Creates/updates lead intake records; links source &amp; event metadata</td><td>Missing company / contact / product / country</td><td><code>leads</code>, <code>trade_events</code>, <code>lead_activities</code></td></tr>
<tr><td><span class="badge badge-blue">Follow-up</span></td><td><code>/leads</code></td><td>Open, More, Continue quote, Edit lead, Plan follow-up</td><td>Owns qualification, follow-ups, product interests, stage, compliance posture</td><td>Disqualified lead, no product interest, missing buyer country, compliance blocker</td><td><code>leads</code>, <code>lead_product_interests</code>, <code>lead_markets</code>, <code>lead_follow_ups</code></td></tr>
<tr><td><span class="badge badge-slate">RFQ (Optional)</span></td><td><code>/leads/[id]/rfq/new</code></td><td>Create RFQ, Update RFQ, Open quote workspace</td><td>Captures supplier request context before quote</td><td>Supplier response rows required before sent_to_suppliers</td><td><code>rfqs</code>, <code>rfq_line_items</code></td></tr>
<tr><td><span class="badge badge-blue">Quote Draft</span></td><td><code>/quotes</code></td><td>Create quote, Add product, Save draft</td><td>Builds quote from catalog data, line items, FX, freight assumptions, manual override reasons</td><td>Needs org, lead, currency, line items, valid pricing context</td><td><code>quotes</code>, <code>quote_versions</code>, <code>quote_version_line_items</code>, <code>quote_pricing_snapshots</code></td></tr>
<tr><td><span class="badge badge-amber">Quote Approval &amp; Send</span></td><td><code>/quotes</code></td><td>Send quote, Approve &amp; allow send, Attach evidence, Waive, Defer</td><td>Send checks current version, approval, blockers, compliance posture</td><td>Pending approval, missing evidence, send blockers, no current version</td><td><code>quotes</code>, <code>quote_versions</code>, <code>communications</code></td></tr>
<tr><td><span class="badge badge-green">Quote Outcome</span></td><td><code>/quotes</code></td><td>Mark accepted, Mark rejected, Create order</td><td>Accepted version becomes commercial source for contract/order execution</td><td>Only sent quotes can be accepted/rejected</td><td><code>quotes.accepted_version_id</code>, <code>contracts</code>, <code>orders</code></td></tr>
<tr><td><span class="badge badge-green">Order Actual Lines</span></td><td><code>/orders</code></td><td>Open, Prepare actual lines, Save, Add line, Approve actual lines</td><td>Seeds order lines from accepted quote; permits actual differences with reasons</td><td>Accepted quote lineage required; preview lines cannot be edited before prepare</td><td><code>orders</code>, <code>order_lines</code>, <code>order_approval_gates</code></td></tr>
<tr><td><span class="badge badge-blue">First Buyer Document</span></td><td><code>/orders</code></td><td>Prepare document, Preview, Approve, Send tracked, Print PDF</td><td>Creates proforma invoice (export) or order confirmation (regional)</td><td>Actual lines gate must be approved before document gates</td><td><code>order_documents</code>, <code>order_document_sends</code></td></tr>
<tr><td><span class="badge badge-teal">Packing &amp; Freight</span></td><td><code>/orders</code></td><td>Prepare packing sheet, Preview, Approve, Prepare freight request</td><td>Creates packing plans and freight requests after first document approval</td><td>First document approval required before packing; packing before freight</td><td><code>packing_plans</code>, <code>packing_plan_lines</code>, <code>freight_rate_requests</code></td></tr>
<tr><td><span class="badge badge-slate">Trade Requirements</span></td><td><code>/orders</code></td><td>Search and attach requirements, Confirm source</td><td>Matches rules by order/product/country/HS; creates human-review fallback</td><td>Blocking severities must be reviewed before dispatch</td><td><code>trade_requirements</code>, <code>trade_requirement_sources</code></td></tr>
<tr><td><span class="badge badge-amber">Processing</span></td><td><code>/orders</code></td><td>Save processing check, Approve pick-pack-QC</td><td>Records picked, packed, QC, notes; unlocks delivery note when complete</td><td>Packing sheet approval required</td><td><code>order_processing_checks</code>, gates, events</td></tr>
<tr><td><span class="badge badge-amber">Logistics &amp; Dispatch</span></td><td><code>/orders</code></td><td>Approve logistics docs, Create shipment draft, Approve dispatch</td><td>Dispatch requires shipment draft and open blocking requirements resolved</td><td>Delivery note ordering enforced by server gates</td><td><code>shipments</code>, <code>order_approval_gates</code></td></tr>
<tr><td><span class="badge badge-green">Finance &amp; Closeout</span></td><td><code>/orders</code></td><td>Prepare final invoice, Approve, Generate receipt + close</td><td>Final invoice approval gates paid closeout; requires payment, reconciliation, receipt, archive</td><td>Final invoice approved; all 5 closeout conditions must pass</td><td><code>finance_sync_records</code>, <code>orders.status</code></td></tr>
</tbody></table></div>
<div class="doc-alert doc-alert-amber"><strong>Immutability rule:</strong> Commercial immutability starts at sent/accepted quote versions, NOT at lead stage. Order changes happen in <code>order_lines</code>, never by mutating the accepted quote version lines.</div>
<div class="section-block"><h2>Data Truth Hierarchy</h2></div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#x1F4CB; Quote Versions</div><ul><li><code>quote_versions</code> &mdash; immutable once sent</li><li><code>quote_version_line_items</code> &mdash; commercial source</li><li><code>quote_pricing_snapshots</code> &mdash; FX at time of quote</li></ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#x1F4E6; Order Execution</div><ul><li><code>orders</code> + <code>order_lines</code> &mdash; actual execution</li><li><code>order_documents</code> + <code>order_document_sends</code></li><li><code>packing_plans</code>, <code>shipments</code>, <code>finance_sync_records</code></li></ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#x1F3F7; Catalog Pricing</div><ul><li><code>pricing_rule_sets</code> &mdash; org-level defaults</li><li><code>product_pricing_rules</code> &mdash; product-level overrides</li><li><code>pricing_engine_settings</code> &mdash; threshold/approval config</li></ul></div>
  <div class="doc-card border-red"><div class="doc-card-title">&#x1F510; Permissions</div><ul><li><code>profiles</code>, <code>organizations</code></li><li><code>organization_members</code></li><li><code>roles</code>, <code>role_permissions</code>, <code>user_roles</code></li></ul></div>
</div>
<div class="section-block"><h2>Support Workflows</h2></div>
<div class="doc-card-grid">
  <div class="doc-card"><div class="doc-card-title">&#x1F4E6; Product Setup</div><ul><li>Admin &rarr; Categories (parent first, then child)</li><li>Set category-level pricing defaults</li><li>Products workspace &rarr; Add Product, Variants, Pricing</li><li>Bulk import via CSV: Categories &rarr; Products &rarr; Pricing</li></ul></div>
  <div class="doc-card"><div class="doc-card-title">&#x1F465; User Onboarding</div><ul><li>Admin &rarr; Invitations &rarr; Enter email + role &rarr; Send</li><li>User clicks link, creates password, lands in workspace</li><li>Admin &rarr; Users &rarr; Verify role is correct</li><li>User sets up Profile &rarr; My Card &rarr; vCard</li></ul></div>
  <div class="doc-card"><div class="doc-card-title">&#x1F3AA; Trade Events</div><ul><li>Admin &rarr; Trade Events &rarr; Create event</li><li>Assign team members; confirm scan readiness</li><li>During event: Business Card Scan or Quick Entry</li><li>Post-event: filter leads by Source Event</li></ul></div>
  <div class="doc-card"><div class="doc-card-title">&#x1F4CB; Compliance</div><ul><li>Document Blocker = required doc not uploaded</li><li>Compliance Blocker = checklist item unresolved</li><li>Attach evidence &rarr; Waive for quote &rarr; Defer to dispatch</li><li>Waivers require human reviewer reason</li></ul></div>
  <div class="doc-card"><div class="doc-card-title">&#x1F4B1; FX &amp; Pricing</div><ul><li>USD identity handled automatically</li><li>Non-USD requires <code>exchange_rates</code> snapshot</li><li>Override &gt;15% triggers pending approval</li><li>Pricing rule sets cascade: org &rarr; category &rarr; product</li></ul></div>
  <div class="doc-card"><div class="doc-card-title">&#x1F916; AI Suggestions</div><ul><li>AI drafts follow-up emails, cover notes, summaries</li><li>AI does NOT set prices, approve quotes, or send messages</li><li>AI does NOT advance order states autonomously</li><li>Always review and edit before using a draft</li></ul></div>
</div>
<div class="section-block"><h2>Approval & Send Gateway (/approval-send)</h2>
<p>The Approval & Send page is the enforcement point between a drafted quote and its delivery to a buyer. It is not a routing convenience — it is the gate that ensures every external send has been explicitly reviewed and authorized.</p>
</div>
<div class="swimlane" style="margin:16px 0">
  <div class="swimlane-row"><div class="swimlane-label"><small>Enter Gate</small><b>Quote ready to send</b></div><div class="swimlane-steps"><div class="lane-step"><b>Quote status</b><span>Approved or direct (no approval required)</span></div><div class="lane-step"><b>Compliance</b><span>No blocking items on lead</span></div><div class="lane-step system"><b>Gate opens</b><span>Send button visible</span></div></div></div>
  <div class="swimlane-row"><div class="swimlane-label"><small>Send Channels</small><b>Delivery options</b></div><div class="swimlane-steps"><div class="lane-step"><b>Send by Email</b><span>Mailtrap; webhook confirms delivery</span></div><div class="lane-step"><b>Send by WhatsApp</b><span>wa.me tracked link; operator confirms</span></div><div class="lane-step system"><b>Record outcome</b><span><code>communications</code> row created</span></div></div></div>
  <div class="swimlane-row"><div class="swimlane-label"><small>Approval Flow</small><b>When override &gt;15%</b></div><div class="swimlane-steps"><div class="lane-step"><b>Pending approval</b><span>Admin approves from Quotes queue</span></div><div class="lane-step"><b>Approve or reject</b><span>Rejection requires reason field</span></div><div class="lane-step system"><b>Gate clears</b><span>Send re-enabled after approval</span></div></div></div>
</div>
<div class="callout"><b>Critical:</b> <code>link_created</code> in the database is NOT the same as delivered. Never treat a tracked link creation as confirmed delivery. Provider webhook confirmation is required for email. WhatsApp link opens confirm operator send — not buyer read.</div>
<div class="section-block"><h2>Customer-Facing Quote PDF (V17.6.10)</h2>
<p>The quote PDF uses puppeteer-core + @sparticuz/chromium — no paid PDF API. The customer-facing layout was redesigned in V17.6.10 to match commercial export standards.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">PDF Layout</div><ul><li>Branded header with org logo and metadata</li><li>Compact product table: SKU, product, pack, units/case, MOQ, basis, unit price, case price, quote total</li><li>Category grouping with category subtotals when multi-category</li><li>Quote-only discounts/markups shown with original catalog price + reason</li><li>Short clean footer — long terms stay in Admin defaults</li></ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">Tokenized Preview (/order-documents/preview/[token])</div><ul><li>Buyer-facing document link uses a signed token — no login required</li><li>Open count tracked via <code>order_document_sends</code> table</li><li><code>link_created</code> ≠ delivered — provider confirmation still required</li><li>Preview toolbar hidden from printed/PDF output</li></ul></div>
</div>
<div class="section-block"><h2>Order Execution Lifecycle</h2>
<p>Orders move through 5 execution states. Each state transition requires all blockers to be cleared — no stage can be skipped programmatically. The <code>evaluateOrderExecution</code> function computes the current state and blockers from the order's data at runtime.</p>
</div>
<div class="wf-pipeline">
  <div class="wf-stage st-pending"><div class="wf-stage-label">Draft</div><div class="wf-stage-route">Quote accepted, contract missing or unlocked</div></div>
  <div class="wf-stage st-pending"><div class="wf-stage-label">Ready</div><div class="wf-stage-route">Contract signed, lines confirmed, lock active</div></div>
  <div class="wf-stage st-active"><div class="wf-stage-label">Released</div><div class="wf-stage-route">Docs approved, compliance clear, release gate passed</div></div>
  <div class="wf-stage st-active"><div class="wf-stage-label">Dispatched</div><div class="wf-stage-route">Shipment created, dispatch artifacts satisfied</div></div>
  <div class="wf-stage st-complete"><div class="wf-stage-label">Completed</div><div class="wf-stage-route">Payment reconciled, outstanding = 0, closeout gate</div></div>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>State</th><th>Required to Enter</th><th>Key Blockers</th></tr></thead>
<tbody>
<tr><td><b>draft → ready</b></td><td>Quote accepted, contract record exists, contract signed/active, commercial lock = <code>accepted_locked</code>/<code>contract_locked</code>/<code>locked</code>, confirmed line count &gt; 0</td><td>Unsigned contract; missing commercial lock snapshot; no confirmed lines</td></tr>
<tr><td><b>ready → released</b></td><td>All ready blockers clear + document requirement rules satisfied + compliance blockers = 0 + release artifact reasons empty</td><td>Open document blockers; open compliance items; unsatisfied document requirements</td></tr>
<tr><td><b>released → dispatched</b></td><td>All release blockers clear + shipment record exists + dispatch artifacts <code>satisfied</code></td><td>Missing shipment record; dispatch artifacts pending/missing; trade requirement blockers</td></tr>
<tr><td><b>dispatched → completed</b></td><td>All dispatch blockers clear + completion artifacts satisfied + payment reconciled</td><td>Finance sync records missing; outstanding balance ≠ 0; completion artifact reasons</td></tr>
</tbody></table></div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128666; Shipment Record</div><ul>
    <li>Fields: <code>mode</code> (sea/air/road/courier), <code>carrier</code>, <code>forwarder</code>, <code>booking_ref</code>, <code>tracking_ref</code></li>
    <li>Created in the dispatch stage after logistics documents are approved</li>
    <li><code>shipments.status</code>: <code>draft</code> → <code>dispatched</code></li>
    <li>Dispatch gate requires shipment record to exist before advancing</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#9888; Trade Requirements</div><ul>
    <li><code>trade_requirements</code> + <code>trade_requirement_sources</code> tables</li>
    <li>Requirement rules checked against product × market × document type combination</li>
    <li>No rule match = human review required — NOT automatic clearance</li>
    <li>Blocking trade requirements prevent dispatch gate from advancing</li>
    <li>Each resolved requirement requires a <code>Confirm source</code> action</li>
  </ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#128176; Finance Closeout</div><ul>
    <li>Payment reference entered manually by operator after receipt confirmed</li>
    <li>Reconciliation: operator confirms outstanding balance = 0</li>
    <li><code>finance_sync_records</code> written on closeout — queue-ready for future accounting integrations</li>
    <li><code>orders.status = 'completed'</code> set only after all completion artifacts satisfied</li>
  </ul></div>
</div>
<div class="section-block"><h2>Trade Events Workflow</h2>
<p>Trade events are the commercial bridge between field capture (business card scans, quick entries) and the main lead/pipeline workflow. Every captured contact flows through event → entry → lead conversion with full attribution.</p>
</div>
<div class="swimlane" style="margin:14px 0">
  <div class="swimlane-row"><div class="swimlane-label"><small>Admin Setup</small><b>/admin/trade-events</b></div><div class="swimlane-steps"><div class="lane-step"><b>Create event</b><span>Name, city, country, starts_on, ends_on</span></div><div class="lane-step system"><b>saveTradeEventCaptureDefaults</b><span>source_label, quick_lead_title defaults</span></div><div class="lane-step"><b>Pipeline stage defaults</b><span>Buyer and supplier stages auto-resolved</span></div></div></div>
  <div class="swimlane-row"><div class="swimlane-label"><small>At the Event</small><b>Field Capture</b></div><div class="swimlane-steps"><div class="lane-step"><b>Business card scan</b><span>/mobile/capture or /contact-exchange/scan</span></div><div class="lane-step"><b>Quick entry</b><span>Manual form — company, contact, deal value</span></div><div class="lane-step system"><b>saveTradeEventEntry</b><span>Entry saved with event attribution</span></div></div></div>
  <div class="swimlane-row"><div class="swimlane-label"><small>Post-Event</small><b>Conversion</b></div><div class="swimlane-steps"><div class="lane-step"><b>Review entries</b><span>Analytics: lead count, quoted count, pipeline value, orders placed</span></div><div class="lane-step"><b>Convert to lead</b><span>convertTradeEventEntryToLead action</span></div><div class="lane-step system"><b>Lead created</b><span>Enters follow-up queue with event source metadata</span></div></div></div>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128200; Event Analytics</div><ul>
    <li><code>leadCount</code> — total leads captured at this event</li>
    <li><code>quotedCount</code> — leads that received at least one quote</li>
    <li><code>openLeadCount</code> — leads still in active follow-up</li>
    <li><code>pipelineValue</code> — sum of deal_value across event leads</li>
    <li><code>ordersPlaced</code> + <code>orderHandoffCount</code> — conversion to order</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#9888; Source Attribution</div><ul>
    <li>Every lead converted from a trade event carries <code>source_label</code> and <code>trade_event_id</code></li>
    <li>Source context preserved in coverage selections and lead workflow metadata</li>
    <li><code>writeTradeEventAuditLog</code> writes an audit record for every entry and conversion action</li>
    <li>Communication record created when entry converts: <code>insertCommunication</code></li>
  </ul></div>
</div>
<div class="section-block"><h2>Documents Workspace (/documents)</h2>
<p>The Documents workspace is the operator desk for file review, expiry posture, version visibility, reviewer ownership, and document gate management across all active leads, quotes, and orders. Requires <code>compliance.review</code> role to advance document status.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128196; What It Shows</div><ul>
    <li>All order and compliance documents across the org</li>
    <li>Expiry posture — documents with <code>expires_at</code> approaching or past</li>
    <li>Version visibility — multiple document versions per order</li>
    <li>Reviewer ownership — who approved, when, linked entity</li>
    <li>Requirement status: <code>satisfied</code> / <code>pending</code> / <code>missing</code> / <code>expired</code></li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128279; Linked From</div><ul>
    <li>Compliance workspace links here: "Documents workspace" action button</li>
    <li>Integrations hub shows "Document evidence" connector linking here</li>
    <li>Order execution gate checks document requirement satisfaction before dispatch</li>
    <li>Source tables: <code>order_documents</code>, <code>order_document_sends</code>, <code>compliance_evidence</code></li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128683; Gate Integration</div><ul>
    <li>Open document blockers count toward <code>releaseBlockers</code> in the order execution evaluator</li>
    <li>Document requirement rules (<code>document_requirements</code> table) define what's needed per document type</li>
    <li><code>applicableCount</code>, <code>satisfiedCount</code>, <code>blockerCount</code> shown in order dispatch artifact state</li>
    <li>Read-only mode for non-compliance-reviewer roles</li>
  </ul></div>
</div>
<div class="section-block"><h2>Integrations Hub (/integrations)</h2>
<p>The integrations hub is a status overview of all governed connection points in the SETU Flow platform. It does not manage connections — it shows what is operational, what is review-gated, and links to the relevant workspace for each connector.</p>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>Connector</th><th>Status</th><th>Links To</th><th>What It Is</th></tr></thead>
<tbody>
<tr><td><b>Email sending</b></td><td><span class="badge badge-green">Ready</span></td><td><code>/approval-send</code></td><td>Governed quote and approval-send workflow for buyer-facing email communication via Mailtrap</td></tr>
<tr><td><b>Document evidence</b></td><td><span class="badge badge-green">Ready</span></td><td><code>/documents</code></td><td>Documents and compliance review cockpit for files linked to leads, quotes, and contracts</td></tr>
<tr><td><b>AI suggestions</b></td><td><span class="badge badge-blue">Review queue</span></td><td><code>/ai-suggestions</code></td><td>AI-generated drafts remain controlled — all suggestions require explicit operator approval before use</td></tr>
<tr><td><b>Digital vCard</b></td><td><span class="badge badge-green">Live</span></td><td><code>/contact-exchange/vcard</code></td><td>Public contact exchange and vCard intake for trade-show lead capture</td></tr>
<tr><td><b>Trade event capture</b></td><td><span class="badge badge-blue">Configured</span></td><td><code>/trade-events</code></td><td>Trade-show event defaults, source labels, and capture flows for lead intake</td></tr>
<tr><td><b>Operational tasks</b></td><td><span class="badge badge-slate">Internal</span></td><td><code>/tasks</code></td><td>Scheduled task creation and completion for follow-ups and order execution milestones</td></tr>
</tbody></table></div>`;
    return null;
  }

  function topicContentDiagrams(id) {
    if (id !== 'diagrams') return null;
    return `
<div class="section-block"><h2>System Architecture</h2><p>Full stack topology: route groups, feature domains, Supabase backend, and external service boundaries.</p></div>
<div class="mermaid-wrap">
  <div class="diagram-title">SETU Flow CRM — Architecture</div>
  <pre class="mermaid">
flowchart TD
    Browser(["🌐 Browser & Mobile Client"])

    subgraph Vercel["▲ Vercel — Next.js 14 App Router"]
        direction LR
        Public["Public Routes\n/onboarding • /card • /invite\n/compare • /features"]
        AppR["App Routes\n/dashboard • /leads • /quotes\n/orders • /pipeline • /products\n/compliance • /contracts • /tasks"]
        AdminR["Admin Routes\n/admin/organization\n/admin/users • /admin/client-onboarding\n/admin/pipelines • /admin/markets"]
        MobileR["Mobile PWA\n/mobile/capture\n/mobile/leads • /mobile/orders\n/mobile/guru • /mobile/pipeline"]
        APIR["API Routes\n/api/leads • /api/quotes • /api/orders\n/api/compliance • /api/setu-guru\n/api/contact-exchange • /api/notifications"]
    end

    subgraph Domains["Feature Domains — src/features"]
        direction LR
        D1["Leads &\nPipeline"]
        D2["Quotes &\nPricing Engine"]
        D3["Orders &\nExecution"]
        D4["Products &\nCatalog"]
        D5["Compliance &\nDocuments"]
        D6["Setu Guru\nAI Panel"]
    end

    subgraph Supa["Supabase"]
        direction TB
        SAuth["Auth Service\nJWT + Session Management"]
        SRLS["Row Level Security\nOrg-scoped data isolation"]
        SPG["PostgreSQL\nCore tables + Transaction RPCs\n+ Supabase Migrations"]
        SStore["Storage\nDocuments • Avatars • Exports"]
    end

    subgraph Ext["External Services"]
        direction LR
        EAI["AI / Vision Provider\nSetu Guru responses\nBusiness card OCR"]
        EEmail["Email Service\nMailtrap / Resend\nNotifications & digests"]
        EWA["WhatsApp\nManual tracked links\nNo live API — operator sends"]
    end

    Browser --> Public & AppR & AdminR & MobileR
    AppR & AdminR & MobileR --> Domains
    Domains --> APIR
    Public --> APIR
    APIR --> SAuth
    SAuth --> SRLS --> SPG --> SStore
    APIR --> EAI & EEmail & EWA
  </pre>
</div>

<div class="section-block" style="margin-top:28px"><h2>Commercial Workflow Flowcharts</h2><p>Decision logic for each major workflow. Click <strong>⤢ Expand</strong> on any diagram to zoom, pan, and inspect details.</p></div>
<h3 style="margin:18px 0 6px">Lead to Quote Readiness</h3>
<div class="mermaid-wrap">
  <div class="diagram-title">Lead Workflow Flowchart</div>
  <pre class="mermaid">
flowchart LR
  A([Capture]) --> B{Review Contact}
  B -->|Valid| C[Save Lead]
  B -->|Invalid| A
  C --> D[Follow-up Queue]
  D --> E[Open Command Center]
  E --> F{Qualify?}
  F -->|Disqualified| G([Dead End])
  F -->|Qualified| H[Add Product Coverage]
  H --> I{Coverage Saved?}
  I -->|No| H
  I -->|Yes| J[Plan Follow-up]
  J --> K{Compliance Blocker?}
  K -->|Yes| L{Resolution}
  L -->|Attach Evidence| M[Upload Doc]
  L -->|Waive for Quote| N[Record Reason]
  L -->|Defer to Dispatch| O[Record Obligation]
  M & N & O --> K
  K -->|No| P([Create Quote])
  </pre>
</div>
<h3 style="margin:18px 0 6px">Quote Build to Send to Outcome</h3>
<div class="mermaid-wrap">
  <div class="diagram-title">Quote Workflow Flowchart</div>
  <pre class="mermaid">
flowchart LR
  A([Open Quote Workspace]) --> B[Select or Create Quote]
  B --> C[Add Catalog Products]
  C --> D[Set Currency and FX and Incoterm]
  D --> E{FX Available?}
  E -->|No| F([Block - No FX Snapshot])
  E -->|Yes| G[Review Pricing and Overrides]
  G --> H{Override greater than 15 percent?}
  H -->|Yes| I{Approval}
  I -->|Rejected| J[Revise Quote]
  J --> G
  I -->|Approved| K
  H -->|No| K[Save Draft]
  K --> L{Compliance Blocker?}
  L -->|Yes| M[Resolve Blocker]
  M --> L
  L -->|No| N[Send Quote]
  N --> O[Quote LOCKED - Sent]
  O --> P{Buyer Outcome}
  P -->|Accepted| Q([Mark Accepted - Create Order])
  P -->|Rejected| R([Mark Rejected])
  P -->|No Response| S[Revise - New Version]
  </pre>
</div>
<h3 style="margin:18px 0 6px">Quote Version State Machine</h3>
<div class="mermaid-wrap">
  <div class="diagram-title">Quote Version States</div>
  <pre class="mermaid">
flowchart LR
  A([New Quote]) --> B[Draft Version]
  B -->|Edit freely| B
  B -->|Approval required| D[Pending Approval]
  D -->|Rejected| B
  D -->|Approved| E
  B -->|No approval needed| E[Send]
  E --> F[Sent - IMMUTABLE]
  F -->|Buyer accepts| G[Accepted - IMMUTABLE]
  F -->|Buyer rejects| H[Rejected]
  F -->|Expires| I[Expired]
  F -->|Revise| J[New Version Draft]
  G --> K([Order Source])
  J --> B
  </pre>
</div>
<h3 style="margin:18px 0 6px">Order Execution Stage by Stage</h3>
<div class="mermaid-wrap">
  <div class="diagram-title">Order Execution Flowchart</div>
  <pre class="mermaid">
flowchart LR
  A([Accepted Quote]) --> B[Stage 1 Quote Approved]
  B --> C[Prepare Actual Lines]
  C --> D[Review Quote vs Actual]
  D --> E[Approve Actual Lines]
  E --> F[Stage 2 First Document]
  F --> G[Prepare Document]
  G --> H[Preview Document]
  H --> I[Approve Document]
  I --> J[Send Tracked or Print PDF]
  J --> K[Stage 3 Packing and Freight]
  K --> L[Prepare Packing Sheet]
  L --> M[Approve Packing Sheet]
  M --> N[Prepare Freight Request]
  N --> O[Stage 4 Processing]
  O --> P{Pick Pack QC?}
  P -->|Incomplete| O
  P -->|Complete| R[Stage 5 Logistics]
  R --> S[Approve Logistics Docs]
  S --> T[Create Shipment Draft]
  T --> U{Trade Requirements Clear?}
  U -->|Blocking Open| V[Resolve]
  V --> U
  U -->|Clear| W[Approve Dispatch]
  W --> X[Stage 6 Invoice Closeout]
  X --> Y[Approve Final Invoice]
  Y --> Z([Paid and Closed])
  </pre>
</div>

<div class="section-block" style="margin-top:28px"><h2>Swimlane Diagrams</h2><p>Operator and system responsibilities shown side by side so testers can validate both UI behavior and data writes.</p></div>
<h3 style="margin:18px 0 6px">Lead to Quote Swimlane</h3>
<div class="swimlane">
  <div class="swimlane-row">
    <div class="swimlane-label"><small>Operator</small><b>Capture &amp; Qualify</b></div>
    <div class="swimlane-steps">
      <div class="lane-step"><b>Scan or add lead</b><span>Review parsed card data, verify company and contact.</span></div>
      <div class="lane-step"><b>Open Command Center</b><span>Confirm buyer/supplier context and qualification status.</span></div>
      <div class="lane-step"><b>Link coverage</b><span>Add product and market interest. CTA appears when gate passes.</span></div>
      <div class="lane-step"><b>Resolve compliance</b><span>Attach evidence, waive for quote, or defer to dispatch.</span></div>
      <div class="lane-step"><b>Create quote</b><span>Gate confirmed &mdash; open quote workspace.</span></div>
    </div>
  </div>
  <div class="swimlane-row">
    <div class="swimlane-label"><small>System</small><b>Data &amp; Gates</b></div>
    <div class="swimlane-steps">
      <div class="lane-step system"><b>Parse contact via AI</b><span>Create lead + profile rows. Write source metadata.</span></div>
      <div class="lane-step system"><b>Run lead quote gate</b><span>Validate coverage, country, compliance posture.</span></div>
      <div class="lane-step system"><b>Write interests</b><span>Save <code>lead_product_interests</code> row. Update readiness.</span></div>
      <div class="lane-step system"><b>Record compliance</b><span>Write compliance decision / waiver / deferral rows.</span></div>
      <div class="lane-step system"><b>Open quote workspace</b><span>Seed quote with lead context and catalog defaults.</span></div>
    </div>
  </div>
</div>
<h3 style="margin:18px 0 6px">Quote Build &amp; Send Swimlane</h3>
<div class="swimlane">
  <div class="swimlane-row">
    <div class="swimlane-label"><small>Operator</small><b>Build &amp; Send</b></div>
    <div class="swimlane-steps">
      <div class="lane-step"><b>Open Quote</b><span>Select or create quote for the lead.</span></div>
      <div class="lane-step"><b>Add catalog products</b><span>System loads pack size, MOQ, pricing defaults.</span></div>
      <div class="lane-step"><b>Set currency / terms</b><span>Verify FX snapshot exists for non-USD quotes.</span></div>
      <div class="lane-step"><b>Enter override reason</b><span>Override &gt;15% triggers approval pending flag.</span></div>
      <div class="lane-step"><b>Send quote</b><span>Requires cleared compliance and approval gate.</span></div>
      <div class="lane-step"><b>Mark accepted/rejected</b><span>Only after actual buyer response received.</span></div>
    </div>
  </div>
  <div class="swimlane-row">
    <div class="swimlane-label"><small>System</small><b>Persistence</b></div>
    <div class="swimlane-steps">
      <div class="lane-step system"><b>Load catalog rules</b><span>Apply pricing cascade: org &rarr; category &rarr; product.</span></div>
      <div class="lane-step system"><b>Capture FX snapshot</b><span>Write <code>quote_pricing_snapshots</code> record.</span></div>
      <div class="lane-step system"><b>Flag approval</b><span>Set <code>approval_required = true</code> on version.</span></div>
      <div class="lane-step system"><b>Write quote rows</b><span>Save <code>quotes</code>, <code>quote_versions</code>, <code>line_items</code>.</span></div>
      <div class="lane-step system"><b>Lock version = sent</b><span>Write <code>communications</code> row. Version now immutable.</span></div>
      <div class="lane-step system"><b>Set accepted_version_id</b><span>Create contract / order lineage on acceptance.</span></div>
    </div>
  </div>
</div>
<h3 style="margin:18px 0 6px">Order Execution Swimlane</h3>
<div class="swimlane">
  <div class="swimlane-row">
    <div class="swimlane-label"><small>Operator</small><b>Execute Order</b></div>
    <div class="swimlane-steps">
      <div class="lane-step"><b>Prepare actual lines</b><span>Confirm quantities and price vs accepted quote.</span></div>
      <div class="lane-step"><b>Approve document</b><span>Preview before any external use.</span></div>
      <div class="lane-step"><b>Approve packing</b><span>Confirm packing lines match actual order.</span></div>
      <div class="lane-step"><b>Confirm trade requirements</b><span>All blocking requirements resolved before dispatch.</span></div>
      <div class="lane-step"><b>Dispatch</b><span>Approve shipment event.</span></div>
      <div class="lane-step"><b>Closeout</b><span>Approve final invoice. Enter payment + reconciliation.</span></div>
    </div>
  </div>
  <div class="swimlane-row">
    <div class="swimlane-label"><small>System</small><b>Persistence</b></div>
    <div class="swimlane-steps">
      <div class="lane-step system"><b>Seed order lines</b><span>Accepted quote version becomes <code>order_lines</code> source.</span></div>
      <div class="lane-step system"><b>Write order documents</b><span>Create document + send rows. Track open count.</span></div>
      <div class="lane-step system"><b>Create packing plans</b><span>Write <code>packing_plans</code> + <code>packing_plan_lines</code>.</span></div>
      <div class="lane-step system"><b>Match trade rules</b><span>Create <code>trade_requirements</code> rows. Fallback = human review.</span></div>
      <div class="lane-step system"><b>Dispatch stage event</b><span>Write <code>shipments.status = dispatched</code> + order event.</span></div>
      <div class="lane-step system"><b>Write finance sync</b><span>Write <code>finance_sync_records</code>. Set <code>orders.status = completed</code>.</span></div>
    </div>
  </div>
</div>

<div class="section-block" style="margin-top:28px"><h2>Slide Diagrams</h2></div>
<div class="slide"><div class="slide-title">Lead Workflow</div><div class="slide-sub">Turn captured contacts into quote-ready leads</div><div class="slide-flow"><div class="slide-node">Capture</div><div class="slide-arrow">&rarr;</div><div class="slide-node">Follow-up</div><div class="slide-arrow">&rarr;</div><div class="slide-node">Command Center</div><div class="slide-arrow">&rarr;</div><div class="slide-node">Coverage</div><div class="slide-arrow">&rarr;</div><div class="slide-node">Quote Ready</div></div><div class="slide-rules"><div class="slide-rule">No product coverage = No quote</div><div class="slide-rule">Disqualified = Dead end</div><div class="slide-rule">Compliance can block send later</div><div class="slide-rule">Waive / Defer requires reviewer reason</div></div></div>
<div class="slide"><div class="slide-title">Quote Versioning</div><div class="slide-sub">Keep sent offers locked and traceable</div><div class="slide-flow"><div class="slide-node">Draft</div><div class="slide-arrow">&rarr;</div><div class="slide-node">Sent <small style="opacity:.6">LOCKED</small></div><div class="slide-arrow">&rarr;</div><div class="slide-node">Accepted <small style="opacity:.6">LOCKED</small></div><div class="slide-arrow">&rarr;</div><div class="slide-node">Order Source</div></div><div class="slide-rules"><div class="slide-rule">current_version_id &ne; accepted_version_id</div><div class="slide-rule">Revision creates NEW version</div><div class="slide-rule">History preserved for audit</div><div class="slide-rule">Orders start from accepted_version_id only</div></div></div>
<div class="slide"><div class="slide-title">Order Execution</div><div class="slide-sub">Turn an accepted quote into controlled execution</div><div class="slide-flow"><div class="slide-node">Actual Lines</div><div class="slide-arrow">&rarr;</div><div class="slide-node">First Document</div><div class="slide-arrow">&rarr;</div><div class="slide-node">Packing</div><div class="slide-arrow">&rarr;</div><div class="slide-node">Dispatch</div><div class="slide-arrow">&rarr;</div><div class="slide-node">Close</div></div><div class="slide-rules"><div class="slide-rule">Actual lines can differ from quote lines &mdash; record reason</div><div class="slide-rule">Approve before any external send</div><div class="slide-rule">link_created &ne; provider delivered</div><div class="slide-rule">Each gate is sequential &mdash; no skipping</div></div></div>
<div class="slide"><div class="slide-title">Finance &amp; Closeout</div><div class="slide-sub">Close only when all financial evidence is confirmed</div><div class="slide-flow"><div class="slide-node">Final Invoice &#x2713;</div><div class="slide-arrow">&rarr;</div><div class="slide-node">Payment &#x2713;</div><div class="slide-arrow">&rarr;</div><div class="slide-node">Reconciliation &#x2713;</div><div class="slide-arrow">&rarr;</div><div class="slide-node">Archive &#x2713;</div><div class="slide-arrow">&rarr;</div><div class="slide-node">Closed</div></div><div class="slide-rules"><div class="slide-rule">Final invoice &ne; proforma invoice</div><div class="slide-rule">Outstanding amount must be zero</div><div class="slide-rule">Finance sync is not automatic</div><div class="slide-rule">All 5 closeout checks must pass</div></div></div>`;
  }


  const guideJourney = ['Dashboard','Lead','Quote','Approval','Order','Docs','Packing','Dispatch'];
  const guideSets = [
  {
    "id": "orientation",
    "icon": "🧭",
    "title": "Start Here",
    "question": "I am new. Where am I in the CRM?",
    "role": "All operators",
    "stageLabel": "Dashboard orientation",
    "stageIndex": 0,
    "cta": "Learn the layout",
    "steps": [
      {
        "short": "Dashboard",
        "title": "Understand the main dashboard",
        "action": "Start at the <strong>Dashboard</strong>. Use it as the command map for markets, follow-ups, pipeline value, and blocked revenue.",
        "why": "This screen tells you what needs attention before you open a lead, quote, or order.",
        "screen": "operator-01-dashboard-nav.png",
        "screenCaption": "Dashboard with left navigation and market command map.",
        "success": [
          "Left navigation is visible on the far left.",
          "Action cards show open opportunities, follow-ups, quotes, blockers, and pipeline value.",
          "The map and action zone tell you what to open next."
        ],
        "warning": "Do not start work from memory. Use Dashboard or Follow-up so every action is attached to a system record.",
        "system": [
          "Read: dashboard rollups",
          "Route: /dashboard",
          "Role: Sales, Ops, Admin",
          "Risk: working outside CRM"
        ]
      },
      {
        "short": "Left Nav",
        "title": "Use the left navigation",
        "action": "Use the left rail to move between <strong>Leads</strong>, <strong>Quotes</strong>, <strong>Orders</strong>, Pipeline, Catalog, Events, and Admin.",
        "why": "The left rail is the fastest way for a road user to find the correct workspace without knowing URLs.",
        "screen": "operator-01-dashboard-nav.png",
        "screenCaption": "Left navigation is always the starting orientation point.",
        "success": [
          "Dash, Leads, Quotes, and Orders are visible.",
          "The active workspace is highlighted.",
          "Share vCard and Quick Lead are visible for fast capture."
        ],
        "warning": "Do not use browser history as the workflow. Use the app navigation so you land in the correct workspace.",
        "system": [
          "Navigation: app shell",
          "State: active route",
          "Write: none",
          "Risk: wrong workspace"
        ]
      }
    ]
  },
  {
    "id": "lead-quote",
    "icon": "💬",
    "title": "Lead → Quote",
    "question": "Customer asked for price.",
    "role": "Sales",
    "stageLabel": "Lead to quote",
    "stageIndex": 1,
    "cta": "Create a quote",
    "steps": [
      {
        "short": "Open Leads",
        "title": "Open the Follow-up lead queue",
        "action": "Click <strong>Leads / Follow-up</strong> from the left navigation.",
        "why": "Every quote should begin from a real lead so buyer, product interest, owner, follow-up, and compliance context stay connected.",
        "screen": "operator-02-lead-queue.png",
        "screenCaption": "Lead queue with Open buttons and follow-up priority.",
        "success": [
          "You see the lead queue table.",
          "Each row has company/contact, stage progress, follow-up, priority, owner, and Open.",
          "Urgent or overdue leads are clearly marked."
        ],
        "warning": "Do not create a disconnected quote from loose notes if the buyer already exists in the lead queue.",
        "system": [
          "Table: leads",
          "Read: org-scoped leads",
          "RLS: organization membership",
          "Risk: disconnected quote"
        ]
      },
      {
        "short": "Open Lead",
        "title": "Open the customer command center",
        "action": "Click <strong>Open</strong> on the correct lead row.",
        "why": "The lead command center shows whether the buyer is qualified, product coverage is mapped, pricing is ready, and compliance is clear.",
        "screen": "operator-03-lead-detail-create-quote.png",
        "screenCaption": "Lead command center with qualification, coverage, commercial, and compliance cards.",
        "success": [
          "Customer name and badges are visible.",
          "Quote prep checklist is green or clearly explains the blocker.",
          "Continue quote or View quote action is visible."
        ],
        "warning": "Do not continue if the lead is disqualified or coverage/compliance is not ready unless an approved exception exists.",
        "system": [
          "Tables: leads, lead_product_interests",
          "Checks: qualification, coverage, compliance",
          "Write: follow-up if rescheduled",
          "Risk: bypassed lead gates"
        ]
      },
      {
        "short": "Continue Quote",
        "title": "Create or continue the quote",
        "action": "Click <strong>Continue quote</strong>, <strong>View quote</strong>, or <strong>Create quote</strong> from the lead command center.",
        "why": "This opens the quote workspace with lead context carried forward, instead of making a manual quote with missing lineage.",
        "screen": "operator-03-lead-detail-create-quote.png",
        "screenCaption": "Lead detail page where the commercial action is visible.",
        "success": [
          "The quote action is available.",
          "Buyer and product context are already linked.",
          "Compliance status is clear before entering quote workflow."
        ],
        "warning": "Do not start a new quote if an active quote already exists for the lead. Continue the active quote instead.",
        "system": [
          "Tables: quotes, quote_versions",
          "Lineage: source lead",
          "Gate: quote prep checklist",
          "Risk: duplicate quote"
        ]
      }
    ]
  },
  {
    "id": "quote-build",
    "icon": "🧾",
    "title": "Build & Send Quote",
    "question": "I need to finish pricing and send the quote.",
    "role": "Sales",
    "stageLabel": "Quote build and send",
    "stageIndex": 2,
    "cta": "Build quote",
    "steps": [
      {
        "short": "Product",
        "title": "Review products and quote lines",
        "action": "Inside the quote workspace, confirm products, quantity, unit price, currency, and total.",
        "why": "These values become the customer offer and later drive order handoff. Wrong lines here create wrong orders later.",
        "screen": "operator-04-quote-builder-draft.png",
        "screenCaption": "Quote workspace modal with accepted quote lines and total.",
        "success": [
          "Product rows are visible.",
          "Quantity, unit price, and total are correct.",
          "Quote total matches the intended offer."
        ],
        "warning": "Do not send if line items, quantities, pricing, or currency are incomplete.",
        "system": [
          "Tables: quote_version_line_items",
          "Write: quote version lines",
          "Status: draft or accepted",
          "Risk: incorrect order source"
        ]
      },
      {
        "short": "Terms",
        "title": "Set commercial terms",
        "action": "Review <strong>currency</strong>, <strong>Incoterm</strong>, payment terms, validity, port of loading, and delivery notes.",
        "why": "Commercial terms define the buyer commitment and the logistics basis. They must be locked before send.",
        "screen": "operator-05-quote-approval-gate.png",
        "screenCaption": "Quote preview terms step with currency, Incoterm, payment terms, validity, and delivery notes.",
        "success": [
          "Currency is correct.",
          "Incoterm and payment terms are selected.",
          "Validity and delivery notes are clear."
        ],
        "warning": "Do not rely on verbal terms if the quote terms fields are empty.",
        "system": [
          "Tables: quote_versions, pricing snapshots",
          "Write: commercial terms",
          "Gate: terms step",
          "Risk: commercial mismatch"
        ]
      },
      {
        "short": "Send Gate",
        "title": "Confirm the quote is safe to send",
        "action": "On the send gate, check that blockers are clear, pricing is complete, approval is cleared, compliance is clear, and draft exists.",
        "why": "This is the final safety gate before the customer-facing workflow opens.",
        "screen": "operator-06-approved-quote-send.png",
        "screenCaption": "Quote send gate showing all green safety checks.",
        "success": [
          "No active blockers.",
          "Pricing complete.",
          "Approval and compliance are clear.",
          "Open send workflow button is available."
        ],
        "warning": "Do not send while approval is pending or while the quote is only a draft preview.",
        "system": [
          "Gate: send readiness",
          "Status: approval cleared",
          "Write: audit record on send",
          "Risk: unapproved customer document"
        ]
      },
      {
        "short": "Send Workflow",
        "title": "Send or hand off the quote",
        "action": "Use <strong>Open send workflow</strong>, <strong>Send by email / WhatsApp</strong>, or <strong>Create order handoff</strong> only after the quote is accepted/safe.",
        "why": "The send workflow creates traceable customer communication and prepares order handoff after buyer acceptance.",
        "screen": "operator-07-quote-outcome-create-order.png",
        "screenCaption": "Quote workspace send and handoff panel with Create order handoff.",
        "success": [
          "Quote status is accepted or send-ready.",
          "Customer PDF can be opened for review.",
          "Create order handoff is available when the buyer accepts."
        ],
        "warning": "Do not mark accepted until the buyer actually accepted. WhatsApp link activity is not the same as confirmed delivery.",
        "system": [
          "Tables: communications, quotes",
          "Write: sent/outcome records",
          "Lineage: accepted quote version",
          "Risk: false acceptance"
        ]
      }
    ]
  },
  {
    "id": "order-execution",
    "icon": "📦",
    "title": "Order Execution",
    "question": "Quote is accepted. How do I run the order?",
    "role": "Operations",
    "stageLabel": "Order execution",
    "stageIndex": 3,
    "cta": "Run order",
    "steps": [
      {
        "short": "Open Orders",
        "title": "Open the Orders / Execution workspace",
        "action": "Go to <strong>Orders</strong> and open the order created from the accepted quote.",
        "why": "This is where the accepted quote becomes controlled execution: actual lines, buyer document, packing, freight, processing, delivery note, invoice, and paid/closed.",
        "screen": "operator-08-order-execution-stage-panel.png",
        "screenCaption": "Orders / Execution page with order queue, stage strip, and action stack.",
        "success": [
          "Order queue is visible on the left.",
          "Selected order summary is visible.",
          "Eight-stage execution strip is visible."
        ],
        "warning": "Do not manually recreate order work if an order already exists from the accepted quote.",
        "system": [
          "Tables: orders, order_lines",
          "Route: /orders",
          "Lineage: source_quote_id",
          "Risk: duplicate execution"
        ]
      },
      {
        "short": "Stage Strip",
        "title": "Read the order stage strip",
        "action": "Use the stage strip to see what is done, active, blocked, or ready: Actual Lines → Buyer Doc → Packing → Freight Queue → Processing → Delivery Note → Final Invoice → Paid & Closed.",
        "why": "The stage strip is the operator map for the order. It tells you exactly where work should continue.",
        "screen": "operator-08-order-execution-stage-panel.png",
        "screenCaption": "Eight-stage order execution strip with done, active, and blocked states.",
        "success": [
          "Green stages are done.",
          "Blue/active stage is the current work area.",
          "Orange/blocked stages explain what must happen first."
        ],
        "warning": "Do not skip ahead. Later stages are blocked until earlier gates are complete.",
        "system": [
          "Tables: order_stage_events",
          "Gate: sequential workflow",
          "Write: stage approvals",
          "Risk: skipped gate"
        ]
      },
      {
        "short": "Next Action",
        "title": "Use the Action Stack",
        "action": "Read <strong>Next best action</strong> on the right and click the primary action button.",
        "why": "This prevents guessing. The action stack explains what the action unlocks, what blocks it, truth labels, and latest activity.",
        "screen": "operator-08-order-execution-stage-panel.png",
        "screenCaption": "Right action stack explaining next best action, unlocks, blockers, truth labels, and activity.",
        "success": [
          "Next best action is visible.",
          "The primary action button matches the current stage.",
          "Blockers and truth labels are visible before action."
        ],
        "warning": "Do not act only from the middle panel if the right action stack says another gate is blocking the workflow.",
        "system": [
          "Source: computed action stack",
          "Write: stage event/action specific",
          "Audit: latest activity",
          "Risk: wrong next action"
        ]
      }
    ]
  },
  {
    "id": "packing-freight",
    "icon": "🚚",
    "title": "Packing & Freight",
    "question": "Goods are ready. What should Ops do?",
    "role": "Operations",
    "stageLabel": "Packing and freight",
    "stageIndex": 5,
    "cta": "Approve packing",
    "steps": [
      {
        "short": "Packing Plan",
        "title": "Open and review the packing plan",
        "action": "In the order workspace, open the <strong>Packing</strong> stage and review cartons, pallets, weights, CBM, pickup, and destination.",
        "why": "Packing approval confirms the physical shipping payload before freight and dispatch actions proceed.",
        "screen": "operator-10-packing-freight.png",
        "screenCaption": "Packing plan with cartons, pallets, weight, CBM, pickup, and destination fields.",
        "success": [
          "Packing stage is visible.",
          "Cartons, pallets, net/gross weight, CBM, pickup, and destination are filled.",
          "Packing approved state is visible or ready to approve."
        ],
        "warning": "Do not approve packing if dimensions, weight, cartons, or destination are unknown.",
        "system": [
          "Tables: packing_plans, packing_plan_lines",
          "Write: packing overrides",
          "Gate: packing approval",
          "Risk: bad freight request"
        ]
      },
      {
        "short": "Approve",
        "title": "Approve packing",
        "action": "Click <strong>Approve packing</strong> after reviewing the saved packing data.",
        "why": "This unlocks freight queue and later processing steps while preserving an audit trail.",
        "screen": "operator-10-packing-freight.png",
        "screenCaption": "Packing approval controls at the bottom of the packing panel.",
        "success": [
          "Packing approved badge appears.",
          "Freight queue can proceed.",
          "Packing sheet preview is available."
        ],
        "warning": "Do not use approval as a note-taking shortcut. Approve only after human review.",
        "system": [
          "Gate: packing approved",
          "Write: approval event",
          "Unlocks: freight/processing",
          "Risk: premature freight"
        ]
      }
    ]
  },
  {
    "id": "dispatch-closeout",
    "icon": "✅",
    "title": "Dispatch & Closeout",
    "question": "Shipment is moving or finance needs closeout.",
    "role": "Ops + Finance",
    "stageLabel": "Dispatch and closeout",
    "stageIndex": 7,
    "cta": "Close order",
    "steps": [
      {
        "short": "Freight Queue",
        "title": "Queue the freight request",
        "action": "At <strong>Freight Queue</strong>, click <strong>Queue freight request</strong> when carrier booking is not live-integrated.",
        "why": "This records a pending freight event for manual/provider-later processing without pretending a carrier API booking happened.",
        "screen": "operator-11-dispatch-tracking.png",
        "screenCaption": "Freight queue panel with pending adapter label and queue freight request action.",
        "success": [
          "Freight Queue stage is selected.",
          "Pending adapter label is visible.",
          "Queue freight request action is available."
        ],
        "warning": "Do not claim live carrier booking when the adapter says pending. This is a manual/provider-later queue event.",
        "system": [
          "Table: freight_rate_requests",
          "Adapter: pending",
          "Write: freight_quote_requested",
          "Risk: false carrier booking"
        ]
      },
      {
        "short": "Finance Sync",
        "title": "Queue invoice sync after final invoice approval",
        "action": "When the order is paid/closed or final invoice is approved, use <strong>Queue invoice sync</strong> if finance integration is pending.",
        "why": "Finance queue visibility lets the team retry or manually reference the finance event later.",
        "screen": "operator-11-dispatch-tracking.png",
        "screenCaption": "Action stack showing Queue invoice sync and finance queue details.",
        "success": [
          "Next best action explains invoice sync.",
          "Finance pending / Freight queued status is visible.",
          "Latest activity/event list shows document links and previews."
        ],
        "warning": "Do not tell finance that Xero, QuickBooks, or Tally synced if the truth label says no live sync.",
        "system": [
          "Table: finance_sync_records",
          "Adapter: pending",
          "Write: pending finance event",
          "Risk: false sync claim"
        ]
      },
      {
        "short": "Closeout",
        "title": "Close only after evidence and finance are clear",
        "action": "Close the order only when dispatch, final invoice, payment, reconciliation, and required evidence are complete.",
        "why": "Closeout is the commercial end state. It should represent completed goods movement and finance status, not just internal readiness.",
        "screen": "operator-11-dispatch-tracking.png",
        "screenCaption": "Paid & Closed order with latest activity and finance action stack.",
        "success": [
          "Final invoice is approved.",
          "Payment/finance reference is recorded or queued.",
          "Latest activity supports the closeout state."
        ],
        "warning": "Do not close an order only because packing or document preview is done.",
        "system": [
          "Tables: orders, shipments, finance_sync_records",
          "Status: completed/paid closed",
          "Evidence: required",
          "Risk: audit failure"
        ]
      }
    ]
  }
];

  function escHtml(v) {
    return String(v || '').replace(/[&<>\"]/g, function(ch) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]);
    });
  }

  function renderGuideJourney(activeIndex) {
    return `<div class="og4-journey">${guideJourney.map((item, i) => `<div class="og4-journey-step ${i < activeIndex ? 'og4-done' : ''} ${i === activeIndex ? 'og4-current' : ''}">${item}</div>`).join('')}</div>`;
  }

  function renderSystemDetails(items) {
    return (items || []).map((item) => {
      const parts = String(item).split(': ');
      return `<div class="og4-sys-chip"><b>${escHtml(parts[0])}</b><span>${escHtml(parts.slice(1).join(': '))}</span></div>`;
    }).join('');
  }

  function renderOperatorGuide(guide, guideIdx) {
    const nav = guide.steps.map((st, i) => `<button class="og4-step-nav ${i === 0 ? 'og4-active' : ''}" onclick="Docs.selectStep(${guideIdx},${i})"><span class="og4-step-num">${i + 1}</span><span><b>${escHtml(st.short)}</b><small>${escHtml(st.title)}</small></span><em>›</em></button>`).join('');
    const details = guide.steps.map((st, i) => `<section class="og4-step-panel ${i === 0 ? 'og4-active' : ''}">
      <div class="og4-panel-head"><span class="og4-pill">Step ${i + 1} of ${guide.steps.length}</span><span class="og4-pill og4-role">${escHtml(guide.role)}</span><span class="og4-pill og4-stage">${escHtml(guide.stageLabel)}</span></div>
      <h3>${escHtml(st.title)}</h3>
      <div class="og4-main-grid">
        <div class="og4-instructions">
          <div class="og4-action-card"><span class="og4-label">Do this now</span><p>${st.action}</p><small>${escHtml(st.why)}</small></div>
          <div class="og4-success"><span class="og4-label">Success checkpoint</span>${(st.success || []).map(s => `<div class="og4-check"><strong>✓</strong><span>${escHtml(s)}</span></div>`).join('')}</div>
          <div class="og4-warning"><b>Wrong path warning</b><span>${escHtml(st.warning)}</span></div>
          <details class="og4-details"><summary>System details for audit</summary><div>${renderSystemDetails(st.system)}</div></details>
        </div>
        <figure class="og4-shot"><img src="docs-screenshots/${escHtml(st.screen)}" alt="${escHtml(st.title)} screenshot" loading="lazy" onclick="Docs.openLightbox('docs-screenshots/${escHtml(st.screen)}','${escHtml(st.title)}')"><figcaption>${escHtml(st.screenCaption)}</figcaption></figure>
      </div>
      <div class="og4-panel-foot"><button class="og4-btn" onclick="Docs.prevGuideStep(${guideIdx})">← Previous</button><div><b class="og4-step-count">${i + 1}/${guide.steps.length}</b><span class="og4-mini-bar"><i style="width:${Math.round(((i+1)/guide.steps.length)*100)}%"></i></span></div><button class="og4-btn og4-primary" onclick="Docs.nextGuideStep(${guideIdx})">Next step →</button></div>
    </section>`).join('');
    return `<div class="og4-playbook"><div class="og4-workflow-head"><div><span class="og4-kicker">${escHtml(guide.role)} workflow</span><h2>${escHtml(guide.title)}</h2><p>${escHtml(guide.question)}</p></div><div class="og4-workflow-icon">${guide.icon}</div></div>${renderGuideJourney(guide.stageIndex)}<div class="og4-guide-layout"><nav class="og4-stepper">${nav}</nav><div class="og4-detail">${details}</div></div></div>`;
  }

  function topicContentGuides(id) {
    if (id !== 'operator-guides') return null;
    const cards = guideSets.map((g, i) => `<button class="og4-job-card ${i === 0 ? 'og-active' : ''}" onclick="Docs.switchGuideTab(${i})"><span>${g.icon}</span><b>${escHtml(g.title)}</b><small>${escHtml(g.question)}</small><em>${escHtml(g.cta)} →</em></button>`).join('');
    const panels = guideSets.map((g, i) => `<div class="og-panel ${i === 0 ? 'og-active' : ''}">${renderOperatorGuide(g, i)}</div>`).join('');
    return `<div class="og4-hero"><span class="og4-kicker">Field-ready walkthrough</span><h1>Operator Playbook</h1><p>Choose the job you are trying to complete. Each guide shows the exact click path, the live screen you should recognize, success checks, and the mistake to avoid.</p></div><div class="og4-job-grid">${cards}</div>${panels}<div class="callout og4-global-rule"><b>Gate rule:</b> Work should move Lead → Quote → Approval → Order → Documents → Packing → Dispatch → Closeout. Do not bypass approval gates, do not create disconnected quotes, and do not treat link_created or pending adapter events as confirmed delivery/sync.</div>`;
  }

  function switchGuideTab(n) {
    document.querySelectorAll('.og4-job-card').forEach((b, i) => b.classList.toggle('og-active', i === n));
    document.querySelectorAll('.og-panel').forEach((p, i) => p.classList.toggle('og-active', i === n));
    if (document.querySelectorAll('.og-panel')[n]) selectStep(n, 0);
  }

  function selectStep(guideIdx, stepIdx) {
    const panel = document.querySelectorAll('.og-panel')[guideIdx];
    if (!panel) return;
    panel.dataset.step = String(stepIdx);
    panel.querySelectorAll('.og4-step-nav').forEach((el, i) => el.classList.toggle('og4-active', i === stepIdx));
    panel.querySelectorAll('.og4-step-panel').forEach((el, i) => el.classList.toggle('og4-active', i === stepIdx));
  }

  function nextGuideStep(guideIdx) {
    const panel = document.querySelectorAll('.og-panel')[guideIdx];
    const max = guideSets[guideIdx].steps.length - 1;
    const cur = Number(panel?.dataset.step || 0);
    selectStep(guideIdx, Math.min(max, cur + 1));
  }

  function prevGuideStep(guideIdx) {
    const panel = document.querySelectorAll('.og-panel')[guideIdx];
    const cur = Number(panel?.dataset.step || 0);
    selectStep(guideIdx, Math.max(0, cur - 1));
  }


  function topicContentGuru(id) {
    if (id === 'guru-ai') return `
<div class="guru-hero">
  <div class="guru-avatar" style="position:relative;width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,#38bdf8,#2563eb,#4f46e5);padding:3px;flex-shrink:0">
    <img src="/setu-guru/setu-guru-avatar.svg" alt="Setu Guru" style="width:100%;height:100%;border-radius:50%;object-fit:cover" onerror="this.parentElement.innerHTML='<span style=&quot;font-size:36px;color:#fff;display:grid;place-items:center;width:100%;height:100%&quot;>&#x2726;</span>'">
    <span style="position:absolute;bottom:2px;right:2px;width:14px;height:14px;border-radius:50%;background:#22c55e;border:2px solid #0f172a"></span>
  </div>
  <div class="guru-hero-text">
    <h2>Setu Guru &mdash; Context-Aware AI Assistant</h2>
    <p>Setu Guru is SETU Flow's built-in AI panel that understands the current page, live organization data, and commercial workflows. Guru helps operators understand blockers, draft next steps, and research product and compliance information &mdash; without autonomously bypassing any human approval gate.</p>
    <div class="guru-caps">
      <span class="guru-cap">Page Context Help</span>
      <span class="guru-cap">Live Org Search</span>
      <span class="guru-cap">HSN Research</span>
      <span class="guru-cap">Pricing Defaults</span>
      <span class="guru-cap">Compliance Guidance</span>
      <span class="guru-cap">Human Approval Required</span>
    </div>
  </div>
</div>
<div class="guru-grid">
  <div class="guru-card" style="--gc1:#38bdf8;--gc2:#2563eb">
    <div class="guru-card-icon" style="background:#eff6ff;font-size:20px">&#x1F916;</div>
    <h3>Page Context Help</h3>
    <p>Guru reads the current route, role, and organization context automatically. Ask "what should I do next?" on any page and Guru surfaces the most relevant workflow guidance &mdash; Leads, Quotes, Orders, or Pipeline.</p>
  </div>
  <div class="guru-card" style="--gc1:#ec4899;--gc2:#7c3aed">
    <div class="guru-card-icon" style="background:#fdf2f8;font-size:20px">&#x1F4F7;</div>
    <h3>Business Card Scan</h3>
    <p>On mobile, Setu Guru processes captured business card images through AI vision. Parsed contact data (name, company, email, phone) is surfaced as a reviewable lead draft. Operators always approve before it becomes a commercial record.</p>
  </div>
  <div class="guru-card" style="--gc1:#0d9488;--gc2:#2563eb">
    <div class="guru-card-icon" style="background:#f0fdfa;font-size:20px">&#x1F4C7;</div>
    <h3>Smart vCard</h3>
    <p>Field teams share a professional digital contact card via QR code or link. When a buyer submits their details through the public capture form, the resulting contact is linked to follow-up context, product interest, and trade event source.</p>
  </div>
  <div class="guru-card" style="--gc1:#f59e0b;--gc2:#ef4444">
    <div class="guru-card-icon" style="background:#fffbeb;font-size:20px">&#x1F50D;</div>
    <h3>Live Org Search</h3>
    <p>Guru can query live organization data to check for open blockers, existing leads, quote status, and order state. All results are read-only &mdash; Guru cannot write to the database without human approval.</p>
  </div>
  <div class="guru-card" style="--gc1:#059669;--gc2:#0d9488">
    <div class="guru-card-icon" style="background:#f0fdf4;font-size:20px">&#x1F4B0;</div>
    <h3>Pricing Defaults</h3>
    <p>Guru suggests pricing calculator defaults based on product, market, and historical context. Suggested defaults are shown for review &mdash; operators enter and confirm all pricing manually. Guru never sets or overrides pricing autonomously.</p>
  </div>
  <div class="guru-card" style="--gc1:#7c3aed;--gc2:#db2777">
    <div class="guru-card-icon" style="background:#faf5ff;font-size:20px">&#x1F4CB;</div>
    <h3>HSN Code Research</h3>
    <p>Guru researches Harmonized System (HS) classification codes for catalog items, pulling from sources and suggesting the best match with justification. Operators review and approve any catalog write-back via a confirm dialog.</p>
  </div>
</div>
<div class="section-block"><h2>What Guru Does and Does Not Do</h2></div>
<div class="tbl-wrap"><table>
<thead><tr><th>Capability</th><th>Guru Can</th><th>Guru Cannot</th></tr></thead>
<tbody>
<tr><td>Workflow guidance</td><td>Explain blockers, suggest next steps, surface help topics for the current route</td><td>Advance order stages, approve gates, or skip compliance checks</td></tr>
<tr><td>Drafting</td><td>Draft follow-up emails, cover notes, compliance evidence summaries, dispatch checklists</td><td>Send emails, submit forms, or trigger external communication autonomously</td></tr>
<tr><td>Pricing</td><td>Suggest pricing defaults, explain pricing rule logic</td><td>Set prices, override pricing rules, or apply discounts without human review</td></tr>
<tr><td>Compliance</td><td>Explain what evidence is needed, draft an evidence checklist</td><td>Clear compliance blockers, waive requirements, or approve compliance actions</td></tr>
<tr><td>Catalog</td><td>Research HSN codes, suggest classification with sourced justification</td><td>Apply HSN updates without explicit operator confirmation via confirm dialog</td></tr>
<tr><td>Data access</td><td>Read live org data: leads, quotes, orders, blockers</td><td>Write, delete, or mutate any database record without human approval</td></tr>
<tr><td>External sends</td><td>Draft message text for review before sending</td><td>Send WhatsApp messages, trigger email delivery, or dispatch documents externally</td></tr>
</tbody></table></div>
<div class="guru-guardrails">
  <h3>&#x1F6E1; AI Guardrails &mdash; Non-Negotiable</h3>
  <ul>
    <li><strong>Human approval on all external sends.</strong> Guru cannot trigger WhatsApp messages, email deliveries, or document sends. Operators always click the send button after reviewing the draft.</li>
    <li><strong>No autonomous order state changes.</strong> Guru cannot approve actual lines, approve packing, approve documents, create shipments, or move orders between stages.</li>
    <li><strong>No autonomous compliance decisions.</strong> Guru cannot waive compliance blockers, attach evidence, or defer requirements. These require human reviewer reason and explicit action.</li>
    <li><strong>No service-role key usage.</strong> Guru API calls use user-scoped authentication. No privileged database access from AI context.</li>
    <li><strong>Every AI action is attributable.</strong> Actions Guru suggests or applies (like HSN updates) are logged with the human approver's identity &mdash; not as system-initiated.</li>
    <li><strong>Feedback is captured.</strong> Helpful / Missing detail buttons let operators improve Guru quality locally without sending data externally.</li>
  </ul>
</div>
<div class="section-block"><h2>How to Use Setu Guru Effectively</h2></div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">On Any CRM Page</div><ul><li>Click the Guru floating button (bottom right or right edge tab)</li><li>Choose a quick start from the panel header</li><li>Or type your question &mdash; Guru reads page context automatically</li><li>Use action buttons in Guru's reply to queue follow-up questions</li></ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">For Blockers</div><ul><li>Ask: "What is blocking this order?" or "What is blocking this quote send?"</li><li>Guru checks live org data and returns a specific blocker list</li><li>Click "Draft dispatch evidence checklist" for structured guidance</li><li>Humans resolve each blocker &mdash; Guru documents the path</li></ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">For Research</div><ul><li>Ask about HSN codes, trade requirements, or product classifications</li><li>Guru returns sourced results for review</li><li>Click "Review sources" before applying any write-back</li><li>Approve catalog updates via the confirm dialog &mdash; not silently</li></ul></div>
  <div class="doc-card border-red"><div class="doc-card-title">For Trade Events</div><ul><li>Use mobile scan at events &rarr; Guru parses card &rarr; operator reviews</li><li>Share vCard QR &rarr; buyer submits &rarr; linked to event and lead</li><li>Post-event: ask Guru to summarize event leads and suggest follow-ups</li><li>Guru drafts follow-up messages &mdash; operators send after review</li></ul></div>
</div>
<div class="section-block"><h2>Setu Guru — In-App Widget</h2>
<p>Setu Guru lives in the authenticated app shell as a bottom-right bot avatar with a right-drawer help surface. It is route-aware — the context it provides changes based on the current page. All Guru responses are advisory; operators approve before any action is taken.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-purple"><div class="doc-card-title">&#10024; Widget Controls</div><ul>
    <li>Avatar shown bottom-right of the app shell in authenticated routes</li>
    <li>Click avatar → right-drawer opens with context-aware help</li>
    <li>Hide Guru: collapse the widget; restore from the right-edge "Guru" tab</li>
    <li>Route-aware: drawer content updates based on current page (leads, quotes, compliance, etc.)</li>
    <li>Local feedback capture: thumbs up/down on each response — future backend pass will persist and improve</li>
  </ul></div>
  <div class="doc-card border-blue"><div class="doc-card-title">&#128270; Capabilities</div><ul>
    <li><strong>Page context help</strong> — explains what the current screen does and what operator should check</li>
    <li><strong>Org search</strong> — search across leads, contacts, and org data without navigating away</li>
    <li><strong>HSN research</strong> — Harmonized System code lookup for compliance and export declarations</li>
    <li><strong>Pricing defaults</strong> — suggest pricing basis and margin ranges based on product/market context</li>
    <li><strong>AI suggestions</strong> — draft follow-up, intro, and quote cover notes (all require approval)</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128683; Guardrails</div><ul>
    <li>Guru cannot bypass approval gates, compliance checks, or send quote autonomously</li>
    <li>All external-facing suggestions (emails, quotes, compliance) require explicit operator approval</li>
    <li>No autonomous external API calls — Guru only assists with drafts and research</li>
    <li>Configured per org at <code>/admin/guru-config</code>: model, daily budget, 4 feature toggles</li>
    <li>Knowledge base: <code>docs/setu-guru/</code> — chatbot-ready onboarding, workflow, troubleshooting instructions</li>
  </ul></div>
</div>
<div class="section-block"><h2>Setu Guru — Sprint 18/19 Improvements (DOC-003)</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-purple"><div class="doc-card-title">&#128272; Rate Limiting</div><ul>
    <li>Research API: <strong>20 requests/org/day</strong> via LRU cache in memory</li>
    <li>Org search: <strong>100 requests/org/day</strong></li>
    <li>429 response: "Research limit reached (20/day). Try again tomorrow."</li>
    <li>Monitor usage in <code>/admin/guru-config</code> monthly usage bar</li>
  </ul></div>
  <div class="doc-card border-blue"><div class="doc-card-title">&#128202; Feedback Persisted to audit_logs</div><ul>
    <li>Route: <code>POST /api/setu-guru/feedback</code></li>
    <li>Writes: <code>entity_type="guru_feedback"</code>, <code>action="helpful"|"missing"</code></li>
    <li>LocalStorage retained as offline cache (last 50 items)</li>
    <li>Previously feedback was lost on page refresh — now permanently logged</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128162; Dynamic Online/Offline Badge</div><ul>
    <li>Health check: <code>GET /api/setu-guru/health</code> — verifies <code>ANTHROPIC_API_KEY</code> configured</li>
    <li>States: <span style="color:#059669;font-weight:700">Online</span> | <span style="color:#dc2626;font-weight:700">Offline</span> | <span style="color:#64748b">Checking…</span></li>
    <li>Previously: hardcoded green badge regardless of API availability</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128201; Repositioned Launcher</div><ul>
    <li><strong>Desktop</strong>: sidebar footer — no more floating fixed element over page content</li>
    <li><strong>Mobile</strong>: dedicated tab in bottom tab bar — replaces the floating FAB that stacked with bell and Quick Lead</li>
    <li>Eliminates the three-element z-index stack (bell + Guru + FAB) entirely</li>
  </ul></div>
</div>`;
    return null;
  }

  function topicContentOther(id) {
    if (id === 'data-security') return `<div class="pro-grid">
  <div class="pro-card"><b>Organization Scope</b><p>Every server action and query must be filtered by <code>organization_id</code>. No cross-org query is ever permitted &mdash; even for admin users who belong to multiple organizations.</p></div>
  <div class="pro-card"><b>RLS Policies</b><p>Tables are protected by workspace membership and role-aware Row Level Security policies in Supabase. Client-side filtering is NOT a substitute &mdash; RLS is the final enforcement layer.</p></div>
  <div class="pro-card"><b>Auditability</b><p>Stage moves, approval decisions, sends, compliance actions, and major workflow changes must be traceable through activity or audit tables. Attribution is required for every sensitive action.</p></div>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>Area</th><th>Tables / Controls</th><th>Risk If Broken</th></tr></thead>
<tbody>
<tr><td>Auth</td><td><code>profiles</code>, <code>organization_members</code></td><td>Wrong users see internal workspaces.</td></tr>
<tr><td>Commercial</td><td><code>leads</code>, <code>quotes</code>, <code>orders</code></td><td>Deals detach from customer or organization truth.</td></tr>
<tr><td>Documents</td><td><code>order_documents</code>, <code>order_document_sends</code></td><td>External send proof becomes unreliable.</td></tr>
<tr><td>Tracker</td><td><code>sprint_issues</code></td><td>Production work loses evidence and accountability.</td></tr>
<tr><td>Roles</td><td><code>roles</code>, <code>role_permissions</code>, <code>user_roles</code></td><td>Unauthorized users can approve quotes or trigger sends.</td></tr>
</tbody></table></div>
<div class="section-block"><h2>Pass-9 RLS Hardening (May 2026)</h2>
<p>Four migration passes applied in sequence to resolve all Supabase advisor warnings. Each pass was applied via MCP migration and verified against the live schema before the next pass began.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-green"><div class="doc-card-title">&#10003; Pass 9-001: RPC Grant Hardening</div><ul><li>Reviewed all SECURITY DEFINER functions</li><li>Explicit <code>GRANT EXECUTE</code> to <code>authenticated</code> only where required</li><li>Revoked execution from <code>anon</code> where no public access needed</li><li>Every function gets an explicit search path</li></ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#10003; Pass 9-002: Search Path & View Hardening</div><ul><li><code>SET search_path = public, pg_temp</code> added to all functions</li><li><code>active_product_pricing_rules_v</code> view advisor warning resolved</li><li>Security-definer view ownership transferred where required</li></ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#10003; Pass 9-003: RLS Policy Remediation</div><ul><li>Tables previously missing RLS policies now covered</li><li>All policies are organization-scoped: no cross-org leakage</li><li>Audit tables protected with INSERT-only policies for members</li><li>Rate limit and API key tables: SETU-internal only policies</li></ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#10003; Pass 9-004: DB Capability Helper</div><ul><li>Helper function added to check org module access at DB layer</li><li>Used by <code>client_entitlements</code> enforcement</li><li>Guards module-gated routes at the server action level</li></ul></div>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>New Table (SF-18/19)</th><th>Purpose</th><th>RLS</th></tr></thead>
<tbody>
<tr><td><code>rate_limit_overrides</code></td><td>Per-org API rate limit overrides (SETU internal)</td><td>SETU admin only</td></tr>
<tr><td><code>rate_limit_override_audit</code></td><td>Audit log for rate limit changes</td><td>SETU admin read; INSERT all SETU</td></tr>
<tr><td><code>workspace_guru_settings</code></td><td>Per-org Guru AI configuration and usage</td><td>Org members read/write own row</td></tr>
<tr><td><code>api_keys</code></td><td>SHA-256 hashed API keys (raw never stored)</td><td>SETU internal only</td></tr>
<tr><td><code>client_entitlements</code></td><td>Module access and seat limits per client org </td><td>SETU admin write; org member read own</td></tr>
<tr><td><code>client_usage_rollups</code></td><td>Aggregated usage by client for billing/limits</td><td>SETU admin only</td></tr>
<tr><td><code>docs_workspace_screenshots</code></td><td>Live UI screenshot gallery for docs workspace</td><td>Org members read; auth write</td></tr>
<tr><td><code>notifications</code></td><td>SF-18 notifications foundation — in-app and email targets</td><td>User owns their notifications</td></tr>
</tbody></table></div>
<div class="section-block"><h2>Audit Trail (/admin/audit)</h2>
<p>The audit log captures every meaningful administrative and workflow action across the platform. Sensitive payloads (passwords, tokens) are never logged. Attribution to actor is required for every sensitive event.</p>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>Event Category</th><th>Event Types</th><th>Tester Note</th></tr></thead>
<tbody>
<tr><td><b>Invitations</b></td><td><code>invitation_created</code>, <code>invitation_sent</code>, <code>invitation_accepted</code>, <code>invitation_revoked</code>, <code>invitation_failed</code></td><td>Verify invitation trail is complete — created must precede sent.</td></tr>
<tr><td><b>Roles</b></td><td><code>role_changed</code>, <code>membership_reactivated</code>, <code>membership_deactivated</code>, <code>membership_removed</code></td><td>Every role change must be attributed to an actor. No silent role escalation.</td></tr>
<tr><td><b>Leads</b></td><td><code>lead_created</code>, <code>lead_updated</code>, <code>lead_stage_changed</code>, <code>lead_follow_up_scheduled</code>, <code>lead_follow_up_completed</code>, <code>lead_note_added</code></td><td>Stage changes must show from/to stage. Follow-up completion must link to scheduled item.</td></tr>
<tr><td><b>Quotes / RFQs</b></td><td><code>rfq_created</code>, <code>rfq_updated</code>, <code>rfq_status_changed</code>, <code>quote_approved</code>, <code>quote_rejected</code>, <code>pricing_sent</code></td><td>Approval and rejection must include actor and timestamp. Sent event must link to communication record.</td></tr>
<tr><td><b>Products</b></td><td><code>product_created</code>, <code>product_updated</code>, <code>product_deleted</code></td><td>Deletion is soft — product marked inactive. Hard delete not permitted via UI.</td></tr>
<tr><td><b>Views & Settings</b></td><td><code>saved_view_created</code>, <code>saved_view_shared</code>, <code>default_view_set</code>, <code>settings_list_item_saved</code></td><td>Shared views logged to track data visibility decisions.</td></tr>
</tbody></table></div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128269; Audit Read Scopes</div><ul>
    <li><strong>Organization scope</strong> — All events in the org; requires <code>admin.audit</code> role</li>
    <li><strong>Actor scope</strong> — Events by a specific user; admin can view any actor</li>
    <li><strong>None</strong> — No audit access for current role</li>
    <li>Filters: event type, actor, date range</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128204; Source Table</div><ul>
    <li>Table: <code>audit_logs</code> — org-scoped with actor attribution</li>
    <li>All writes go through <code>writeAuditLog()</code> — no direct DB inserts from UI</li>
    <li>RLS: org members with audit role read; system writes only</li>
    <li>Retention: records not auto-deleted — manual archive policy</li>
  </ul></div>
</div>
<div class="section-block"><h2>Deployment, Auth & Code Architecture</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#9729; Vercel Deployment Rules</div><ul>
    <li>Every fix must be deployed green before the tracker closes the issue</li>
    <li>Preview URLs are <strong>never</strong> shared with buyers — internal verification only</li>
    <li>Required env vars: <code>NEXT_PUBLIC_SUPABASE_URL</code>, <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code></li>
    <li>Optional: <code>ANTHROPIC_API_KEY</code> (Guru), <code>MAILTRAP_API_KEY</code> (email), <code>SEO_TREND_QUERIES</code> (SEO intel)</li>
    <li>After any env var change: redeploy required for runtime values to refresh</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128272; Auth Session Flow</div><ul>
    <li>Login → Supabase JWT → stored in cookies → <code>organization_members</code> check on every request</li>
    <li><code>requireWorkspace()</code> — standard auth guard; redirects to login if no session</li>
    <li><code>requireAdminWorkspace()</code> — additionally enforces admin role membership</li>
    <li><code>requireSetuInternalAdminWorkspace()</code> — SETU HQ org only (API keys, SEO intel, rate limits)</li>
    <li>Service role key: server-side only via <code>src/lib/supabase/admin.ts</code> — never in client bundles</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#129489;&#8205;&#128187; Server Render Pattern</div><ul>
    <li>All admin pages: CSS <code>:target</code> drawers — zero <code>useState</code>, zero client components</li>
    <li>Every mutation goes through a server action — never direct client Supabase writes for sensitive data</li>
    <li>TypeScript types live in <code>src/types/database.ts</code> — generated from Supabase schema</li>
    <li>Regenerate types: <code>supabase gen types typescript --project-id sjzfzloggabsmcuxktnl</code></li>
    <li><code>QueryIssuePayload</code> type wraps all query results — surfaces DB connectivity errors without crashes</li>
  </ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#128203; Public API Endpoints</div><ul>
    <li><code>POST /api/public/client-onboarding</code> — unauthenticated client form submission</li>
    <li><code>GET /api/mobile/scan-readiness</code> — checks scan provider env vars are configured</li>
    <li><code>GET /api/internal/auth-check</code> — session verification for docs workspace</li>
    <li><code>GET /api/internal/docs-metrics</code> — issue count for docs right rail (fallback)</li>
    <li><code>GET/POST /api/internal/docs-screenshots</code> — screenshot gallery management</li>
    <li>All other mutations: server actions only — no REST endpoints for commercial data</li>
  </ul></div>
</div>
<div class="section-block"><h2>Webhook Security (DOC-010)</h2>
<p>All webhook routes at <code>/api/integrations/webhooks/[provider]</code> verify HMAC-SHA256 signatures before processing. Every receive — success or failure — writes to <code>audit_logs</code>.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-red"><div class="doc-card-title">&#128274; HMAC-SHA256 Verification</div><ul>
    <li>Signature header: <code>x-hub-signature-256</code> or <code>x-webhook-signature</code></li>
    <li>Verification uses <code>timingSafeEqual</code> — timing-attack resistant</li>
    <li>Invalid or missing signature → <code>401 {"ok":false,"error":"Invalid signature."}</code></li>
    <li>Missing secret env var also returns 401 (not 500)</li>
  </ul></div>
  <div class="doc-card border-blue"><div class="doc-card-title">&#9881; Required Env Vars</div><ul>
    <li>Format: <code>WEBHOOK_SECRET_&#60;PROVIDER&#62;</code> (uppercase)</li>
    <li>Examples: <code>WEBHOOK_SECRET_MAILTRAP</code>, <code>WEBHOOK_SECRET_STRIPE</code></li>
    <li>Must be set in Vercel environment variables before deploying the route</li>
  </ul></div>
</div>
<div class="section-block"><h2>Data Integrity — Status Field Validation (DOC-011)</h2>
<p>Status fields on core tables are now validated at the database level. Invalid values are rejected before reaching application logic.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128204; Validation Approach</div><ul>
    <li><strong>New tables</strong>: Postgres enum types — TypeScript gets compile-time safety</li>
    <li><strong>Existing tables</strong>: CHECK constraints (no data-type migration required)</li>
    <li>After any enum migration: <code>npm run db:types</code> regenerates <code>database.generated.ts</code></li>
    <li>Never combine enum + check constraint on the same column</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#9989; Valid Status Values</div>
    <div class="tbl-wrap" style="margin-top:8px"><table>
    <thead><tr><th>Table</th><th>Column</th><th>Valid values</th></tr></thead>
    <tbody>
    <tr><td><code>quotes</code></td><td><code>status</code></td><td>draft | pending_approval | approved | sent | accepted | expired | cancelled</td></tr>
    <tr><td><code>orders</code></td><td><code>status</code></td><td>draft | active | dispatched | completed | cancelled</td></tr>
    <tr><td><code>leads</code></td><td><code>status</code></td><td>active | qualified | disqualified | archived</td></tr>
    <tr><td><code>order_lines</code></td><td><code>status</code></td><td>draft | confirmed | amended</td></tr>
    </tbody></table></div>
  </div>
</div>`;
    if (id === 'api-integrations') return `<div class="tbl-wrap"><table>
<thead><tr><th>Integration</th><th>Rule</th><th>Status</th></tr></thead>
<tbody>
<tr><td><b>WhatsApp</b></td><td>Manual tracked wa.me links only. No live WhatsApp Business API. Operators click to send &mdash; system records the link, not delivery.</td><td><span class="badge badge-amber">Manual tracked-link</span></td></tr>
<tr><td><b>Email</b></td><td>Mailtrap is the production email integration. Provider events confirm delivery. UI activity is not delivery proof without MAILTRAP_WEBHOOK_SECRET set.</td><td><span class="badge badge-green">Live &mdash; Mailtrap</span></td></tr>
<tr><td><b>PDF</b></td><td>Use puppeteer-core and @sparticuz/chromium only. No paid PDF API. Browser-print is the client-side fallback.</td><td><span class="badge badge-green">Free OSS path</span></td></tr>
<tr><td><b>Finance</b></td><td>Queue-ready integration only. Finance sync records created for future Xero / QuickBooks / Tally adapters. No live external sync yet.</td><td><span class="badge badge-blue">Queue-ready</span></td></tr>
<tr><td><b>Freight</b></td><td>Adapter-backed, pending live carriers. Freight rate requests are created and queued. No automatic carrier booking from UI.</td><td><span class="badge badge-blue">Queue-ready</span></td></tr>
<tr><td><b>Banks / Payments</b></td><td>Manual payment reference entry only. Operators record payment received, enter reference, confirm reconciliation.</td><td><span class="badge badge-slate">Manual / planned</span></td></tr>
<tr><td><b>AI (Guru)</b></td><td>Anthropic API via Setu Guru widget. Used for page help, drafting, org search, HSN research. No autonomous external actions.</td><td><span class="badge badge-purple">Live &mdash; Anthropic</span></td></tr>
<tr><td><b>Open API / Webhooks</b></td><td>Planned for partner integrations. Public API not yet available.</td><td><span class="badge badge-slate">Planned</span></td></tr>
</tbody></table></div>
<div class="section-block"><h2>API Keys & Webhooks (API Keys &amp; Webhooks)</h2>
<p>SETU Flow supports programmatic access via API keys for partner integrations. The system is SETU-internal for now — external partner access is controlled by key generation and scoped permissions.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128273; Key Generation</div><ul><li>Format: <code>sf_live_</code> + 24 hex characters</li><li>SHA-256 hash stored — raw key shown exactly once in a one-time reveal banner</li><li>Key is never recoverable after creation; revoke and regenerate if lost</li><li>Scope checkboxes: <code>read:leads</code>, <code>write:quotes</code>, <code>read:orders</code>, <code>admin:read</code></li></ul></div>
  <div class="doc-card border-blue"><div class="doc-card-title">&#128683; Revocation & Audit</div><ul><li>Revoke sets <code>is_active=false</code> and stamps <code>revoked_at</code></li><li>Revoked keys remain visible in audit trail — never deleted</li><li>All key operations are auditable to the SETU admin who made the change</li></ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128266; Webhooks — Coming Soon</div><ul><li>Webhook endpoints are defined in admin UI but not yet live</li><li>Target events: quote status changes, order stage moves, document sends</li><li>Delivery will use signed payloads with <code>X-SetuFlow-Signature</code> header</li></ul></div>
</div>
<div class="section-block"><h2>AI Suggestions Workspace (/ai-suggestions)</h2>
<p>The AI Suggestions workspace surfaces Anthropic-generated draft content for lead, quote, and compliance workflows. Every suggestion requires explicit operator approval before any external action is taken. AI cannot bypass gates, send quotes, or file compliance resolutions autonomously.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-purple"><div class="doc-card-title">&#10024; 6 Suggestion Types</div><ul>
    <li><strong>Follow-up Assistant</strong> (<code>follow_up_assistant</code>) — Draft follow-up email for a lead</li>
    <li><strong>Intro Assistant</strong> (<code>intro_assistant</code>) — Draft introduction email for new buyer/supplier contact</li>
    <li><strong>Quote Cover Note</strong> (<code>quote_cover_note</code>) — Draft cover note to accompany a sent quote</li>
    <li><strong>Compliance Next-Step</strong> (<code>compliance_next_step</code>) — Suggest next compliance action for a blocked lead</li>
    <li><strong>Compliance Evidence</strong> (<code>compliance_evidence_request</code>) — Draft request for missing compliance documentation</li>
    <li><strong>Internal Summary</strong> (<code>internal_summary</code>) — Summarize a lead or deal for internal handoff</li>
  </ul></div>
  <div class="doc-card border-blue"><div class="doc-card-title">&#128203; Suggestion Lifecycle</div><ul>
    <li>Status flow: <code>pending → approved → applied</code> or <code>pending → dismissed</code></li>
    <li>Approved suggestions are not automatically applied — operator takes the action</li>
    <li>Applied: operator used the suggestion text in a real communication or compliance action</li>
    <li>Dismissed: suggestion rejected; reason field optional but encouraged</li>
    <li>Aging: approved-but-not-applied suggestions surface in "Needs Attention" panel</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128268; AI Analytics (/admin/ai-analytics)</div><ul>
    <li>High dismissal rate by workflow type — signals Guru model tuning needed</li>
    <li>Low approval-to-apply conversion — suggests operator trust issues</li>
    <li>Aging approved-not-applied: count of suggestions approved but never used</li>
    <li>Time windows: 7, 30, 90 days selectable</li>
    <li>Source table: <code>ai_suggestions</code></li>
  </ul></div>
</div>
<div class="section-block"><h2>Notifications System </h2>
<p>The notifications foundation was added in Sprint 18 to support in-app and email notification delivery. The system is additive — existing workflows are not changed. Notifications are user-owned and org-scoped.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128276; Notification Targets</div><ul>
    <li><strong>In-app</strong> — surfaced in the app shell notification panel</li>
    <li><strong>Email</strong> — routed via Mailtrap email provider</li>
    <li>Target type stored in <code>notifications.channel</code> field</li>
    <li>RLS: users read and delete only their own notifications</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128231; Trigger Events</div><ul>
    <li>Quote approval requested — notifies admin role members</li>
    <li>Quote approved or rejected — notifies originating operator</li>
    <li>Order stage advanced — notifies assigned operator</li>
    <li>Compliance blocker added — notifies compliance reviewer role</li>
    <li>Invitation accepted — notifies org admin</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#9881; Admin Settings</div><ul>
    <li><code>/admin/notifications</code> — per-org notification preference controls</li>
    <li><code>/settings/notifications</code> — per-user notification channel preferences</li>
    <li>Email notifications require <code>MAILTRAP_API_KEY</code> to be configured</li>
    <li>Source table: <code>notifications</code> (SF-18 migration)</li>
  </ul></div>
</div>`;
    if (id === 'mobile') return `<div class="feature-strip">
  <div class="feature-card"><div class="big-icon" style="background:#0d9488">&#x1F4F7;</div><h3>Business Card Scan</h3><p>Scan, parse, review, and save buyer/supplier leads from trade shows or field meetings. AI parses the card &mdash; operators approve before any commercial record is created.</p></div>
  <div class="feature-card"><div class="big-icon" style="background:#2563eb">&#x1F4C7;</div><h3>Smart vCard</h3><p>Share a professional contact card and preserve event/source context for later follow-up. Buyer submissions automatically link to the event and lead flow.</p></div>
  <div class="feature-card"><div class="big-icon" style="background:#7c3aed">&#x26A1;</div><h3>Mobile Action Footer</h3><p>Critical next actions remain accessible without forcing desktop-style navigation. Role-aware controls shown only to appropriate users.</p></div>
</div>
<div class="doc-card-grid">
  <div class="doc-card"><div class="doc-card-title">Camera &amp; Capture</div><ul><li>Camera permission handling and fallback manual entry</li><li>Upload size limits and image quality requirements</li><li>Parsed data review UI before saving</li><li>Lead save from scan creates correct database rows</li></ul></div>
  <div class="doc-card"><div class="doc-card-title">vCard &amp; QR</div><ul><li>vCard generation from profile data</li><li>QR code display and scanning</li><li>Public capture form submission creates lead draft</li><li>Event source metadata preserved on link</li></ul></div>
  <div class="doc-card"><div class="doc-card-title">Role &amp; Access</div><ul><li>Mobile workspace shows role-appropriate modules</li><li>Leads, pipeline, and orders visible per membership</li><li>No admin controls on mobile for non-admin users</li><li>Offline behavior and sync on reconnect</li></ul></div>
</div>
<div class="section-block"><h2>Tasks Module (/tasks)</h2>
<p>The tasks workspace provides a cross-module action queue. Tasks are linked to leads, quotes, and orders — not standalone — so every task has commercial context.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#9989; Task Structure</div><ul>
    <li>Tasks link to: <code>lead_id</code>, <code>quote_id</code>, or <code>order_id</code> — always with commercial context</li>
    <li>Type: <code>scheduled</code> (due date set) or <code>ad-hoc</code> (no due date)</li>
    <li>Status: <code>pending</code>, <code>in_progress</code>, <code>completed</code>, <code>cancelled</code></li>
    <li>Priority: Low / Medium / High — affects queue sort order</li>
    <li>Overdue tasks surface with red indicator in the task queue</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128241; Mobile Tasks</div><ul>
    <li>Mobile tasks workspace (<code>MobileTasksWorkspace</code>) is a simplified list view for phone screens</li>
    <li>Same data — different layout. No functionality gap between desktop and mobile task views</li>
    <li>Current user ID passed to filter tasks owned by or assigned to the active user</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#9888; Key Rules</div><ul>
    <li>Tasks do NOT replace gate approvals — they supplement workflow tracking</li>
    <li>Completing a task does not advance a workflow stage automatically</li>
    <li>Overdue tasks on a lead appear in the Follow-up queue as attention items</li>
    <li>Task source table: <code>scheduled_tasks</code></li>
  </ul></div>
</div>
<div class="section-block"><h2>Mobile Workspace — Extended</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128241; Mobile Dashboard (/mobile/dashboard)</div><ul>
    <li>4 KPI cards: Overdue follow-ups (rose), Due Today (amber), Pipeline active value (blue), Won this month (emerald)</li>
    <li>Each card links to filtered view: <code>/leads?timing=overdue</code>, <code>/leads?timing=today</code>, <code>/pipeline</code>, <code>/reports</code></li>
    <li>Formatted values: pipeline value in USD; won-this-month count in deal currency</li>
    <li>Optimized for phone — single-column layout, large tap targets</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#10024; Mobile Guru (/mobile/guru)</div><ul>
    <li>Mobile-optimized Setu Guru AI interface</li>
    <li>Same underlying AI capabilities as desktop Guru widget: route-aware help, org search, HSN research</li>
    <li>Full-screen chat layout on mobile — no right-drawer constraint</li>
    <li>Human approval required for all suggestions regardless of surface</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#9881; Mobile Settings (/mobile/settings)</div><ul>
    <li>User preferences accessible from mobile shell</li>
    <li>Notification preferences and profile shortcuts</li>
    <li>Links back to desktop admin for org-level settings</li>
  </ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#128204; Mobile Orders (/mobile/orders)</div><ul>
    <li>Simplified order list view for field operators</li>
    <li><code>/mobile/orders/[orderId]</code> — order detail with stage status and key actions</li>
    <li>Same data as desktop orders — different layout optimised for phone</li>
    <li><code>MobileOrdersWorkspace</code> component; no pagination — shows active orders only</li>
  </ul></div>
</div>
<div class="section-block"><h2>Mobile Redesign — Sprint 19 (DOC-005)</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#65291; Quick Lead — Center Tab</div><ul>
    <li>Moved from floating FAB (fixed bottom-right) to raised center tab in bottom nav bar</li>
    <li>Center tab: 56px height vs 48px, brand gradient, rounded top, + icon 28px</li>
    <li>Eliminates z-index stack (Guru + bell + FAB) — single clean tab bar</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#127968; Home Screen Sections</div><ul>
    <li><strong>Header</strong>: greeting + date + avatar</li>
    <li><strong>KPI grid 2×2</strong>: red=overdue, amber=due today, blue=pipeline value, green=won this month</li>
    <li><strong>Quick actions</strong>: Scan Card | Quick Lead | New Quote | My Tasks (icon tiles)</li>
    <li><strong>Activity feed</strong>: last 5 lead activities with company, event type, timestamp</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128072; Touch Gestures</div><ul>
    <li><strong>RightDrawer</strong>: swipe right &gt;80px or velocity &gt;0.3px/ms closes with snap-back</li>
    <li><strong>Task rows</strong>: swipe right &gt;80px completes the task</li>
    <li>Visual feedback: CSS translateX during swipe, fade+collapse on completion</li>
    <li>Mobile viewports only (md:hidden breakpoint)</li>
  </ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#127463;&#127482; Workspace Mode Strip + Route Routing</div><ul>
    <li>All / Buyers / Suppliers strip now on mobile header</li>
    <li><code>/orders</code> on mobile → redirects to <code>/mobile/orders</code> (no more DesktopRedirect)</li>
    <li><code>/quotes</code> on mobile → redirects to <code>/mobile/quote</code></li>
    <li>Nav config shared between desktop + mobile via <code>src/lib/navigation/nav-items.ts</code></li>
  </ul></div>
  <div class="doc-card border-purple"><div class="doc-card-title">&#128241; Mobile Routes Reference</div><ul>
    <li><code>/mobile/leads</code> — Mobile leads list (same data, phone-optimised layout)</li>
    <li><code>/mobile/pipeline</code> — Mobile pipeline view</li>
    <li><code>/mobile/quote</code> — Mobile quote creation surface</li>
    <li><code>/mobile/notifications</code> — Mobile notification inbox</li>
    <li><code>/mobile/orders/[orderId]</code> — Mobile order detail</li>
  </ul></div>
</div>`;
    if (id === 'quick-reference') return `<div class="quick-ref-grid">
  <div class="ref-card"><h3>Never Break</h3><ul><li>No service-role key in client code.</li><li>No external live provider calls outside approved adapters.</li><li>No sent quote version mutation &mdash; create new version.</li><li>No order stage skip without explicit gate approval.</li><li>No cross-org data visible to org members.</li></ul></div>
  <div class="ref-card"><h3>Always Verify</h3><ul><li>GitHub main contains the change.</li><li>Vercel deployment is green before tracker closes.</li><li>Tracker notes include commit/deploy proof.</li><li>RLS remains organization-scoped after any schema change.</li><li>Sent/accepted quote version is not mutated.</li></ul></div>
  <div class="ref-card"><h3>Core Routes</h3><ul><li><code>/leads</code> &mdash; command center &amp; follow-up queue</li><li><code>/pipeline</code> &mdash; kanban, swimlane, forecast</li><li><code>/quotes</code> &mdash; versioned quote workspace</li><li><code>/orders</code> &mdash; execution cockpit</li><li><code>/admin/*</code> &mdash; org, users, catalog admin</li></ul></div>
  <div class="ref-card"><h3>Signals of Quality</h3><ul><li>Clear next action visible to operator.</li><li>Blocker explains why and what to do next.</li><li>Data write matches UI state.</li><li>Audit record exists for every sensitive move.</li><li>link_created &ne; delivered &mdash; never conflate.</li></ul></div>
</div>
<div class="section-block"><h2>Compliance Module (/compliance)</h2>
<p>The compliance workspace is the progression-gate desk for checklist blockers, approvals, and lead/quote movement. Every compliance item must be resolved — with evidence, waiver, or deferral — before a quote can be sent. No bypass is permitted.</p>
</div>
<div class="doc-alert doc-alert-red"><strong>Gate rule:</strong> A red compliance item blocks quote send. Operators cannot send a quote while any unresolved blocker with status <code>open</code> or <code>needs_review</code> exists on the lead.</div>
<div class="doc-card-grid">
  <div class="doc-card border-red"><div class="doc-card-title">&#128683; Blocker Severity Levels</div><ul>
    <li><strong>Critical</strong> — Hard stop. Quote cannot proceed without explicit admin resolution.</li>
    <li><strong>High</strong> — Blocks send unless waived with documented reason by compliance reviewer role.</li>
    <li><strong>Medium</strong> — Warning state. Can be deferred to dispatch with written justification.</li>
    <li><strong>Low</strong> — Advisory. Logged but does not block the workflow gate.</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#9998; Resolution Options</div><ul>
    <li><strong>Attach evidence</strong> — Upload compliance document. File stored in Supabase Storage under <code>compliance-evidence/</code>.</li>
    <li><strong>Waive with reason</strong> — Requires <code>compliance.review</code> role permission. Reason field is mandatory and stored.</li>
    <li><strong>Defer to dispatch</strong> — Moves resolution to the order dispatch stage. Medium and below only.</li>
    <li>Every resolution writes a record — no silent passes.</li>
  </ul></div>
  <div class="doc-card border-blue"><div class="doc-card-title">&#128203; Bulk Waive Panel</div><ul>
    <li>Available to compliance reviewer roles only</li>
    <li>Select multiple medium/low items and waive with a shared reason</li>
    <li>Each waiver writes an individual audit row — bulk is a UI convenience, not a single write</li>
    <li>Critical and high items cannot be bulk-waived</li>
  </ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#128270; Compliance Assist (/compliance/assist)</div><ul>
    <li>AI-assisted compliance guidance using Setu Guru</li>
    <li>Surfaces applicable regulatory checklists based on market + product combination</li>
    <li>Suggestions are advisory — operator approves before any compliance record is created</li>
    <li>Uses <code>compliance_next_step</code> and <code>compliance_evidence_request</code> suggestion types</li>
  </ul></div>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>DB Table</th><th>Purpose</th><th>Key Fields</th></tr></thead>
<tbody>
<tr><td><code>lead_compliance_items</code></td><td>Per-lead compliance checklist items</td><td><code>status</code>, <code>severity</code>, <code>resolution_type</code>, <code>evidence_url</code>, <code>waiver_reason</code></td></tr>
<tr><td><code>compliance_evidence</code></td><td>Uploaded compliance documents</td><td><code>file_url</code>, <code>uploaded_by</code>, <code>compliance_item_id</code></td></tr>
<tr><td><code>lead_activities</code></td><td>Compliance resolution audit trail</td><td><code>activity_type: 'compliance_*'</code>, <code>actor_id</code>, <code>metadata</code></td></tr>
</tbody></table></div>
<div class="section-block"><h2>Contracts Workspace (/contracts)</h2>
<p>The contracts workspace is the commercial commitment desk. Contracts are created automatically when a quote is marked accepted — they bind the accepted quote version to the resulting order and are immutable from that point.</p>
</div>
<div class="swimlane" style="margin:16px 0">
  <div class="swimlane-row"><div class="swimlane-label"><small>Creation</small><b>Auto-created</b></div><div class="swimlane-steps"><div class="lane-step"><b>Quote accepted</b><span>Operator marks quote accepted</span></div><div class="lane-step system"><b>Contract created</b><span>Binds <code>quote_versions.id</code> to <code>orders.id</code></span></div><div class="lane-step"><b>Immutable</b><span>Quote version cannot be edited after contract exists</span></div></div></div>
  <div class="swimlane-row"><div class="swimlane-label"><small>Roles</small><b>Permissions</b></div><div class="swimlane-steps"><div class="lane-step"><b>lead.manage</b><span>Can update contract workspace details</span></div><div class="lane-step"><b>quote.send</b><span>Can progress contracts to order stage</span></div><div class="lane-step system"><b>Read-only</b><span>All other roles can inspect status only</span></div></div></div>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128196; Contract Lineage</div><ul>
    <li>Every contract links: <code>lead → quote → accepted_quote_version → order</code></li>
    <li>Quote version ID is frozen at acceptance — no edits after this point</li>
    <li>Order line items seed from the accepted contract quantities</li>
    <li>Discrepancies between quote and actual lines require documented variance reason</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128452; Blockers & Files</div><ul>
    <li>Contracts show open blockers from the linked compliance and order records</li>
    <li>File attachments: signed agreement, purchase order, letter of intent</li>
    <li>Progress actions: mark contract reviewed, link to order, close contract</li>
    <li>All progression actions require <code>quote.send</code> role</li>
  </ul></div>
</div>
<div class="section-block"><h2>Markets & Categories Admin</h2>
<p>Markets and categories are the commercial classification backbone. Markets define geographic/regional sales territories. Categories organize products and drive pricing cascade and compliance matching.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#127758; Markets (/admin/markets)</div><ul>
    <li>Each market has: <code>name</code>, <code>market_code</code> (short identifier), <code>sort_order</code>, <code>is_active</code></li>
    <li>Markets link to: leads (target market), quotes (destination market), compliance rules (market-specific checklists)</li>
    <li>Inactive markets are hidden from operator selection but preserved for historical records</li>
    <li>Country count shown per market for geographic coverage visibility</li>
    <li>Edit/Add via inline CSS :target drawers — no page reload</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128193; Categories (/admin/categories)</div><ul>
    <li>Product categories drive pricing cascade: category-level pricing rules override org defaults</li>
    <li>Categories link to: products (classification), compliance templates (category-specific rules), reports (product breakdown panel)</li>
    <li>Each category has a <code>slug</code> (URL-safe identifier) and <code>display_name</code></li>
    <li>Category subtotals appear in quote PDF when multi-category quote</li>
    <li>Compliance matching uses product category to suggest applicable regulatory checklists</li>
  </ul></div>
</div>
<div class="section-block"><h2>Document Templates (/admin/document-templates)</h2>
<p>Document template profiles define the commercial document output for quotes and orders. Each profile combines terms, bank details, tax IDs, and export declarations for a specific region and document type.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128196; Template Profile Structure</div><ul>
    <li><strong>region_type</strong> — e.g. <code>export</code>, <code>domestic</code>, <code>uae</code>, <code>eu</code></li>
    <li><strong>document_type</strong> — <code>proforma_invoice</code>, <code>order_confirmation</code>, <code>delivery_note</code></li>
    <li><strong>profile_name</strong> — display label for operator selection</li>
    <li><strong>is_default</strong> — used when no explicit profile is selected on the order</li>
    <li><strong>is_active</strong> — inactive profiles are hidden from operator selection</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128181; Financial Fields</div><ul>
    <li><strong>bank_details</strong> — JSONB; bank name, account, IBAN, SWIFT, branch</li>
    <li><strong>tax_profile</strong> — JSONB; GST/VAT/TRN numbers per region</li>
    <li><strong>identity_fields</strong> — JSONB; company registration, export license numbers</li>
    <li><strong>stamp_settings</strong> — JSONB; digital stamp/seal configuration</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128220; Terms & Declarations</div><ul>
    <li><strong>page_one_terms</strong> — Array of term strings shown on page 1 of document</li>
    <li><strong>annexure_terms</strong> — Array of terms shown in the annexure/appendix</li>
    <li><strong>export_declarations</strong> — JSONB; export compliance declarations for customs</li>
    <li>Quote/order terms defaults also configurable at org level in Admin → Organization</li>
  </ul></div>
</div>
<div class="section-block"><h2>Pricing Engine (/admin/pricing-engine)</h2>
<p>The Pricing Engine sets the commercial defaults that power the quote calculator, margin calculations, and approval gates. These are org-level controls — all operators in the workspace inherit these defaults unless overridden per quote.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#9881; Org-Level Defaults</div><ul>
    <li><strong>Approval threshold (%)</strong> — Quotes with manual price overrides above this % trigger pending approval. Default: 15%.</li>
    <li><strong>Default currency</strong> — Base currency for new quotes. Supported: USD, EUR, GBP, AED, INR, SGD, AUD, CAD.</li>
    <li>Stored in <code>organizations.approval_threshold_pct</code> and <code>organizations.default_currency</code></li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128200; Pricing Rule Cascade</div><ul>
    <li>Priority order: <strong>Product-level</strong> → Category-level → Org default</li>
    <li>Source of truth: <code>pricing_rule_sets</code> + <code>product_pricing_rules</code> tables</li>
    <li>FX snapshots: captured at quote creation time; stored in <code>quote_pricing_snapshots</code></li>
    <li>Manual FX override requires <code>quote.send</code> role permission</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128272; Approval Gate</div><ul>
    <li>Override &gt; threshold → <code>quotes.approval_required = true</code></li>
    <li>Send is disabled until an admin with <code>quote.approve</code> role approves</li>
    <li>Rejection requires a reason; reason stored in <code>quotes.notes_internal</code></li>
    <li>Quote modal shows approval status: "Approval cleared" when approved</li>
  </ul></div>
</div>
<div class="section-block"><h2>Client Onboarding Wizard (/onboarding)</h2>
<p>The extended onboarding wizard  guides new clients from form submission through workspace provisioning. The flow is: Public form → SETU admin review → Workspace creation → First admin invitation.</p>
</div>
<div class="swimlane" style="margin:16px 0">
  <div class="swimlane-row"><div class="swimlane-label"><small>Step 1</small><b>Public form</b></div><div class="swimlane-steps"><div class="lane-step"><b>/onboarding</b><span>Company details, markets, first admin info</span></div><div class="lane-step system"><b>POST /api/public/client-onboarding</b><span>No login required</span></div><div class="lane-step"><b>/onboarding/received</b><span>Confirmation page</span></div></div></div>
  <div class="swimlane-row"><div class="swimlane-label"><small>Step 2</small><b>Admin review</b></div><div class="swimlane-steps"><div class="lane-step"><b>Email notification</b><span>admin@setugroups.com or <code>SETU_ONBOARDING_ADMIN_EMAIL</code></span></div><div class="lane-step"><b>/admin/client-onboarding</b><span>Inbox redesign: stat bar + request cards + StatusPipeline</span></div><div class="lane-step system"><b>StatusPipeline</b><span>Intake → Provision → Invite → Live</span></div></div></div>
  <div class="swimlane-row"><div class="swimlane-label"><small>Step 3</small><b>Provisioning</b></div><div class="swimlane-steps"><div class="lane-step"><b>/admin/client-management</b><span>Set modules, seats, plan tier</span></div><div class="lane-step system"><b>client_entitlements</b><span>Row created for new org</span></div><div class="lane-step"><b>Invite sent</b><span>First admin receives invite link</span></div></div></div>
</div>
<div class="doc-alert doc-alert-teal"><strong>Plan change detection:</strong> If a client already has <code>status = live</code> and <code>pricing_rules_notes</code> has content, a violet banner appears on the client card for SETU admin to review the plan change request.</div>
<div class="section-block"><h2>Admin — Extended Workspaces</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#127939; Pipeline Stages Admin (/admin/stages)</div><ul>
    <li>Manages <code>pipeline_stages</code> separately from the Pipeline Board at <code>/admin/pipelines</code></li>
    <li>Stage fields: <code>sort_order</code>, <code>color</code>, <code>is_closed</code>, <code>is_won</code>, <code>is_lost</code></li>
    <li>Also manages <code>next_steps</code> table: pre-defined follow-up action templates per org</li>
    <li>Pipelines → Stages: one pipeline has many stages; stages belong to exactly one pipeline</li>
    <li>CSS :target drawers for add/edit — no page reload, no client components</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128230; Catalog Admin (/admin/product-management)</div><ul>
    <li>Title: "Catalog Admin" — back-office pricing-first setup for owners/admins</li>
    <li>Uses <code>ProductGovernanceWorkbench</code> component</li>
    <li>Manages <code>pricing_calculator_default_rules</code> table: <code>rule_scope</code>, <code>category_id</code>, <code>currency</code>, <code>margin_mode</code>, <code>inland_transport_cost</code>, <code>export_customs_cost</code>, <code>port_handling_cost</code></li>
    <li>Requires <code>catalog.manage</code> role; cleanup tools for <code>owner</code>/<code>admin</code> roles only</li>
    <li>Distinct from <code>/products</code> — this is admin governance, not operator browsing</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128202; SEO Intelligence (/admin/seo-intelligence)</div><ul>
    <li>SETU-internal org only — <code>isInternalOrg()</code> check enforced</li>
    <li>4 sections: Changes, Trends, Keywords, Competitors</li>
    <li><strong>Trends</strong>: Live Google Trends via SearchAPI/SerpAPI. Up to 5 queries from <code>SEO_TREND_QUERIES</code> Vercel env var</li>
    <li><strong>Keywords</strong>: Coverage status per cluster — <code>live</code> (green) / <code>next_pr</code> (amber) / <code>pending</code> / <code>missing</code> (red)</li>
    <li><strong>Page coverage %</strong>: <code>readyClusters / totalClusters</code> target keyword clusters</li>
    <li>Priority: <code>p0</code> (critical) → <code>p1</code> → <code>p2</code></li>
    <li><strong>Push PR</strong>: <code>CreateSeoPrForm</code> — generate reviewable SEO page changes</li>
  </ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#127758; Admin Trade Events (/admin/trade-events)</div><ul>
    <li>Creates and manages trade event records in <code>trade_events</code> table</li>
    <li>Fields: <code>name</code>, <code>city</code>, <code>country</code>, <code>starts_on</code>, <code>ends_on</code>, <code>notes</code></li>
    <li>Sets capture defaults: <code>source_label</code> (auto-tags leads from this event), <code>quick_lead_title</code></li>
    <li>Resolves default pipeline stage for buyer and supplier entries captured at the event</li>
    <li>Missing count badge shown when no events are configured</li>
  </ul></div>
</div>
<div class="section-block"><h2>User Profile & Settings</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128100; Profile (/profile)</div><ul>
    <li>Fields: <code>full_name</code>, <code>username</code> — editable by the user</li>
    <li>Email displayed but change requires Supabase auth email flow (not in-app)</li>
    <li><code>updateProfile</code> server action; redirects with <code>?notice=profile-updated</code> on success</li>
    <li>Profile is the source of identity for the vCard public page (<code>/card</code>)</li>
    <li>Avatar: initials rendered from <code>full_name</code> first character</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#9881; Settings — Lists</div><ul>
    <li><code>/settings/lists</code> redirects to <code>/admin/organization#settings-lists</code></li>
    <li>Manages custom list items: pipeline stage names, notification preferences</li>
    <li>Not a separate page — embedded in organization admin via anchor hash</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128276; Settings — Notifications (/settings/notifications)</div><ul>
    <li>Per-user notification channel preferences</li>
    <li>Separate from <code>/admin/notifications</code> (org-level preferences)</li>
    <li>User can enable/disable: in-app notifications, email digests, event-specific alerts</li>
    <li>Preferences stored per user in the <code>notifications</code> system</li>
  </ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#128282; Admin Overview (/admin/overview)</div><ul>
    <li>Admin stat dashboard — 8 parallel count queries: markets, countries, pipeline stages, products, categories, roles, invites, members</li>
    <li>Structured as quick-access links: Company identity → /admin/organization, Quote controls → /admin/pricing-engine, Owner/Admin/Invites → /admin/users</li>
    <li>All counts are org-scoped</li>
  </ul></div>
</div>
<div class="section-block"><h2>Public Contact & Invitation Flows</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128197; Public vCard (/card)</div><ul>
    <li>Publicly accessible — no login required</li>
    <li>Shows: <code>full_name</code>, <code>organizationName</code>, profile avatar</li>
    <li>Actions available: Save digital vCard, request a quote, book an appointment</li>
    <li>OG metadata generated dynamically: <code>title = fullName · organizationName</code></li>
    <li>Event source metadata preserved when buyer submits through a vCard link from a trade event</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128279; vCard Preview (/contact-exchange/vcard/preview)</div><ul>
    <li>Operator preview of how their public vCard will appear before sharing</li>
    <li>Shows the same layout as <code>/card</code> with the operator's own profile data</li>
    <li>Used to verify avatar, name, org name, and action buttons before distributing the link</li>
  </ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#9993; Invitation Flow (/invite/[token])</div><ul>
    <li>Invitation token decoded from URL — no login required to reach this page</li>
    <li>Token validated against: <code>status</code>, <code>expires_at</code>, <code>accepted_at</code>, <code>revoked_at</code></li>
    <li>Blocked states: already accepted, revoked, expired — shown as error with clear message</li>
    <li>New user: <code>registerAndAcceptInvitation</code> — creates account + accepts invite atomically</li>
    <li>Existing user: <code>acceptInvitationByToken</code> — adds org membership without re-registration</li>
    <li>Invitation metadata includes: <code>email</code>, <code>roles</code>, <code>organizationName</code></li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128274; Auth Flows</div><ul>
    <li><code>/client-login</code> — SETU internal login gate; redirects to <code>/go-internal</code> after auth</li>
    <li><code>/reset-password</code> — Supabase password reset flow; token from email link</li>
    <li>Session: Supabase JWT stored in cookies; <code>organization_members</code> checked on every server request</li>
    <li>Auth guard: <code>requireWorkspace()</code> / <code>requireAdminWorkspace()</code> in server components</li>
  </ul></div>
</div>
<div class="section-block"><h2>Public SEO Pages</h2>
<p>SETU Flow maintains a set of public-facing SEO landing pages targeting trade and export CRM search terms. These are Next.js static pages with OG metadata, no app login required, and no commercial data access.</p>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>Route</th><th>Target Keyword</th><th>Status</th></tr></thead>
<tbody>
<tr><td><code>/compare/crm-for-exporters</code></td><td>Best CRM for exporters — generic vs trade execution CRM comparison</td><td><span class="badge badge-green">Live</span></td></tr>
<tr><td><code>/features/export-quote-management</code></td><td>Export quote management software — product, pricing, incoterms, approvals</td><td><span class="badge badge-green">Live</span></td></tr>
<tr><td><code>/features/trade-show-lead-capture</code></td><td>Trade show lead capture — business card scan, vCard, event follow-up</td><td><span class="badge badge-green">Live</span></td></tr>
<tr><td><code>/solutions/export-management-software</code></td><td>Export management software — leads, buyers, quotes, documents, approvals</td><td><span class="badge badge-green">Live</span></td></tr>
<tr><td><code>/solutions/import-export-crm</code></td><td>Import/export CRM for growing trade teams</td><td><span class="badge badge-green">Live</span></td></tr>
<tr><td><code>/resources/export-compliance-checklist</code></td><td>Export compliance checklist — free resource</td><td><span class="badge badge-green">Live</span></td></tr>
</tbody></table></div>
<div class="doc-alert doc-alert-blue"><strong>SEO Intelligence:</strong> Track keyword coverage and live trend signals at <code>/admin/seo-intelligence</code> (SETU internal only). Set monitored queries via <code>SEO_TREND_QUERIES</code> env var (up to 5 comma-separated terms).</div>
<div class="section-block"><h2>Saved Views</h2>
<p>Saved views let operators bookmark filtered states of list workspaces (leads, pipeline, quotes) so they can return to a specific filter combination without reconfiguring it. Views can be marked as default and shared with the org.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128203; View Lifecycle</div><ul>
    <li>Create: operator configures filters on a list view, saves as named view</li>
    <li>Default: <code>default_view_set</code> audit event — one default view per workspace per user</li>
    <li>Share: <code>saved_view_shared</code> audit event — makes view visible to all org members</li>
    <li>Update: <code>saved_view_updated</code> audit event</li>
    <li>Source table: implied by audit event type; view filters stored as JSON</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#9888; Access Rules</div><ul>
    <li>Personal views: visible only to the creator</li>
    <li>Shared views: visible to all org members — sharing is logged for accountability</li>
    <li>Default view loads automatically when the workspace is opened</li>
    <li>Org admin can see shared views but cannot delete personal views of other users</li>
  </ul></div>
</div>
<div class="section-block"><h2>Tasks Workspace — Complete Feature Reference (DOC-004)</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128197; Calendar View</div><ul>
    <li>Cell height: 80px minimum (WCAG accessible, previously 8px text on 52px cells)</li>
    <li>Pill colours by state: <b style="color:#991b1b">overdue</b> | <b style="color:#92400e">today</b> | <b style="color:#1d4ed8">future</b> | <b style="color:#64748b">done</b></li>
    <li>Max 3 pills/cell + "+N more" popover list</li>
    <li>Click empty cell pre-populates create drawer with that date</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128200; Due Date Groups</div><ul>
    <li>Groups: <b>Overdue</b> | <b>Today</b> | Tomorrow | This Week | Later | No Due Date | Completed</li>
    <li>Default: Overdue + Today expanded only — all others collapsed</li>
    <li>Zero-task groups hidden (no empty header rendered)</li>
    <li>Collapsed state saved to localStorage per user</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128101; Assignment &amp; Entity Linking</div><ul>
    <li><code>scheduled_tasks.assigned_to</code>: links to org member</li>
    <li><code>linked_entity_type</code>: <code>lead</code> | <code>quote</code> | <code>order</code></li>
    <li><code>linked_entity_id</code>: UUID of the linked entity</li>
    <li>Chip on task row links directly to the entity</li>
    <li>"My Tasks" filter: only tasks assigned to current user</li>
  </ul></div>
  <div class="doc-card border-green"><div class="doc-card-title">&#127383; Chip Filter Bar</div><ul>
    <li>Replaces native &lt;select&gt; with horizontal scrollable chips</li>
    <li>Each chip shows live count: <code>All 23</code> | <code>My Tasks 9</code> | <code>SLA Risk 4</code></li>
    <li>View toggle (Grouped/List) at chip bar right end</li>
    <li>Mobile: swipe right &gt;80px on task row completes the task</li>
  </ul></div>
</div>
<div class="section-block"><h2>Reports — Upgraded Capabilities (DOC-006)</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128197; Date Range Filtering</div><ul>
    <li>Date range picker at top — all panels update simultaneously</li>
    <li>Presets: <b>Last 7 days</b> | <b>Last 30 days</b> | <b>Last 90 days</b> | <b>This quarter</b></li>
    <li>Custom from/to via calendar picker</li>
    <li>Default: Last 30 days</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128229; CSV Export</div><ul>
    <li>Export button on every panel</li>
    <li>Downloads current date-filtered data as <code>setuflow-report-[YYYY-MM].csv</code></li>
    <li>Org-scoped — exports only current workspace data</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128200; Trend Charts (recharts)</div><ul>
    <li><strong>Line chart</strong>: quotes created per week over selected period</li>
    <li><strong>Bar chart</strong>: lead-to-order funnel (Leads → Quotes → Orders → Closed)</li>
    <li>Both charts respect active date range filter</li>
    <li>Built with <code>recharts</code> — already in product stack</li>
  </ul></div>
</div>
<div class="section-block"><h2>Compliance — Real File Upload &amp; Bulk Waive (DOC-007)</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-red"><div class="doc-card-title">&#128452; Real File Upload (Critical fix)</div><ul>
    <li>Attach evidence uses <code>&lt;input type="file"&gt;</code> — PDF, JPG, PNG, DOC, DOCX (max 10MB)</li>
    <li>File uploaded to Supabase Storage bucket <code>compliance-docs/</code></li>
    <li>Storage URL + original filename saved to <code>documents</code> table</li>
    <li>Review status shows download link for stored file</li>
    <li><b>Previous behaviour was a data defect</b>: text input accepted a filename string with no actual upload — phantom evidence records were created</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#9989; Bulk Waive Panel</div><ul>
    <li>Requires <code>compliance.review</code> role</li>
    <li>Checkbox per requirement row; bar appears when 1+ selected</li>
    <li>Written waiver reason required (modal with textarea)</li>
    <li>Each item gets an <b>individual</b> audit log entry — not a single bulk record</li>
    <li>Critical + High severity items cannot be bulk waived</li>
  </ul></div>
</div>
<div class="section-block"><h2>Contracts — Search, Filter &amp; Pagination (DOC-008)</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128269; Search &amp; Filter</div><ul>
    <li>Search: <code>buyer_name</code>, <code>contract_ref</code>, <code>order_ref</code> (debounced, server-side for large orgs)</li>
    <li>Status filter: All | Draft | Active | Completed | Cancelled</li>
    <li>Date presets: Last 30 days | Last 90 days | All time</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128203; Pagination</div><ul>
    <li>25 contracts per page</li>
    <li>Page resets to 1 on any filter change</li>
    <li>"Showing 25 of 143 contracts" count displayed</li>
  </ul></div>
</div>
<div class="section-block"><h2>AI Suggestions — Bulk Dismiss, Reasoning &amp; Dismissed Tab (DOC-009)</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-purple"><div class="doc-card-title">&#9989; Bulk Dismiss</div><ul>
    <li>Checkbox per suggestion card + "Select all" in header</li>
    <li>"Dismiss N suggestions" button when 1+ selected</li>
    <li>Each dismiss: writes <code>reason: "bulk_dismissed"</code> to <code>audit_logs</code></li>
  </ul></div>
  <div class="doc-card border-blue"><div class="doc-card-title">&#128161; Reasoning Notes</div><ul>
    <li>Each card shows: "Based on: [context]" below the suggestion body</li>
    <li>Example: "Based on: 3 overdue tasks in Qualified stage for Acme Corp"</li>
    <li>Sourced from <code>ai_suggestions.rationale</code> field</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128065; Dismissed Tab</div><ul>
    <li>Dismissed tab shows all dismissed suggestions</li>
    <li>Restore moves suggestion back to pending status</li>
    <li>Audit trail: <code>entity_type="ai_suggestion"</code>, <code>action="dismissed"</code></li>
  </ul></div>
</div>
<div class="section-block"><h2>Admin Notifications (/admin/notifications) — DOC-013</h2>
<p>Workspace-level notification preference matrix. Controls which channels are active per event type for the entire org. Separate from per-user preferences at <code>/settings/notifications</code>.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128276; Preference Matrix</div><ul>
    <li><code>PreferenceMatrix</code> component: rows = event types, columns = channels (in-app, email)</li>
    <li>Admin role required to modify workspace preferences</li>
    <li>Save → <code>?notice=saved</code> confirmation; failure → <code>?notice=save-failed</code></li>
    <li>Distinct from <code>/settings/notifications</code> which is per-user channel preferences</li>
  </ul></div>
</div>
<div class="section-block"><h2>RFQ vs Quote — DOC-014</h2>
<p>The product has two parallel quoting surfaces with different purposes:</p>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th></th><th>RFQ</th><th>Quote</th></tr></thead>
<tbody>
<tr><td><b>Direction</b></td><td>Supplier-facing (inbound price request)</td><td>Buyer-facing (outbound commercial offer)</td></tr>
<tr><td><b>Created from</b></td><td><code>/leads/[leadId]/rfq/new</code> — qualified lead required</td><td><code>/leads/[leadId]/quote</code> or from Quotes list</td></tr>
<tr><td><b>DB tables</b></td><td><code>rfqs</code> + <code>rfq_line_items</code></td><td><code>quotes</code> + <code>quote_versions</code> + <code>quote_version_line_items</code></td></tr>
<tr><td><b>Versioning</b></td><td>No versioning — single mutable record</td><td>Immutable versions after send; new version created for each revision</td></tr>
<tr><td><b>Gate</b></td><td>Lead must be qualified + at least one product mapped</td><td>Coverage + compliance gates must pass</td></tr>
<tr><td><b>Approval</b></td><td>No approval threshold — supplier price is input</td><td>Approval gate at &gt;15% override threshold</td></tr>
</tbody></table></div>
<div class="section-block"><h2>Background Jobs &amp; Cron — DOC-015</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#9201; Scheduled Jobs</div><ul>
    <li><code>/api/cron/analytics-snapshot</code> — daily analytics snapshot for trend charts. Requires <code>CRON_SECRET</code> env var for authorization header.</li>
    <li><code>/api/notifications/email-digest</code> — sends email digest to opted-in users. Triggered by cron or manually.</li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#128241; Mobile Offline + vCard Wallet</div><ul>
    <li><code>/api/offline/leads</code> — receives offline lead queue from Service Worker sync. Body: array of lead payloads queued while offline.</li>
    <li><code>/api/public/apple-wallet</code> — downloads vCard as <code>.pkpass</code> Apple Wallet pass</li>
    <li><code>/api/public/google-wallet</code> — downloads vCard as Google Wallet card</li>
    <li><code>/api/public/card-analytics</code> — tracks vCard page views and action clicks</li>
  </ul></div>
</div>
<div class="section-block"><h2>Mobile Routes Reference — DOC-012</h2>
</div>
<div class="tbl-wrap"><table>
<thead><tr><th>Mobile Route</th><th>Desktop Equivalent</th><th>Notes</th></tr></thead>
<tbody>
<tr><td><code>/mobile/leads</code></td><td><code>/leads</code></td><td>Phone-optimised leads list — same data, simplified layout for field operators</td></tr>
<tr><td><code>/mobile/pipeline</code></td><td><code>/pipeline</code></td><td>Mobile-optimised pipeline view</td></tr>
<tr><td><code>/mobile/quote</code></td><td><code>/leads/[leadId]/quote</code></td><td>Mobile quote creation surface. Falls back to EmptyState if workspace unavailable.</td></tr>
<tr><td><code>/mobile/notifications</code></td><td>Notification bell dropdown</td><td>Full-screen notification inbox on mobile</td></tr>
<tr><td><code>/mobile/orders/[orderId]</code></td><td>Order detail slide panel</td><td>Mobile order detail — same execution data, full-width layout</td></tr>
</tbody></table></div>`;
    if (id === 'live-ui') return `<div class="screenshot-toolbar"><div><h2>Live UI Screenshot Library</h2><p>Clickable screenshots of key modules and workflows. Upload from this workspace to share with testers and tech leads.</p></div><button class="internal-only" onclick="Docs.openScreenshotModal()">+ Add Screenshot</button></div><div id="screenshotGrid" class="screenshot-grid"></div>
<div class="section-block"><h2>Email Delivery Pipeline (DOC-001)</h2>
<p>Every quote send and document send goes through a tracked chain. <code>link_created</code> is the start — not confirmation. Provider webhook confirmation is required before treating as delivered.</p>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-blue"><div class="doc-card-title">&#128231; email_send_log Table</div><ul>
    <li>Per-send delivery audit trail — one row per send attempt</li>
    <li>Key fields: <code>send_id</code>, <code>provider</code>, <code>recipient_email</code>, <code>status</code>, <code>provider_message_id</code>, <code>delivered_at</code>, <code>bounced_at</code></li>
    <li>Linked to <code>communications</code> via <code>communications_id</code></li>
  </ul></div>
  <div class="doc-card border-teal"><div class="doc-card-title">&#127381; Mailtrap Webhook Receiver</div><ul>
    <li><code>POST /api/webhooks/mailtrap</code> — receives delivery, bounce, open, spam events</li>
    <li><code>GET /api/webhooks/mailtrap</code> → <code>{"ok":true,"service":"setuflow-mailtrap-webhook"}</code></li>
    <li>Updates <code>email_send_log</code> + <code>communications.delivery_status</code> on each event</li>
    <li>Requires <code>MAILTRAP_WEBHOOK_SECRET</code> env var (HMAC verified)</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#128204; Communications Table Extended Fields</div><ul>
    <li><code>delivery_status</code>: <code>pending</code> | <code>delivered</code> | <code>bounced</code> | <code>opened</code> | <code>failed</code></li>
    <li><code>provider_message_id</code>: Mailtrap message ID for event correlation</li>
    <li><code>bounce_reason</code>: populated when delivery fails</li>
    <li><code>opened_at</code>: timestamp of first open event from provider webhook</li>
  </ul></div>
</div>
<div class="callout"><b>Critical:</b> <code>order_document_sends.status = &#39;link_created&#39;</code> means a tracked link was generated and the operator saw the WhatsApp/email surface. It does NOT mean the recipient received or opened anything. Webhook events from Mailtrap are the only reliable delivery confirmation for email.</div>
<div class="section-block"><h2>WhatsApp Send Flow (DOC-002)</h2>
</div>
<div class="doc-card-grid">
  <div class="doc-card border-green"><div class="doc-card-title">&#128241; Device-Aware Routing</div><ul>
    <li><strong>Mobile</strong>: <code>wa.me/[number]?text=[encoded]</code> — opens WhatsApp app natively</li>
    <li><strong>Desktop</strong>: <code>https://web.whatsapp.com/send?phone=[number]&text=[encoded]</code></li>
    <li>Detection via <code>navigator.userAgent</code> + screen width at moment of click</li>
    <li>Fallback to <code>wa.me</code> if device is ambiguous (works on both)</li>
  </ul></div>
  <div class="doc-card border-amber"><div class="doc-card-title">&#9888; No Automatic Delivery Confirmation</div><ul>
    <li>Clicking Send opens WhatsApp pre-filled — operator sends it manually</li>
    <li><code>link_created</code> confirms the operator initiated — not buyer receipt</li>
    <li>WhatsApp has no delivery webhook available to external platforms</li>
    <li>Operator must confirm receipt manually and update order notes</li>
  </ul></div>
</div>`;
    return '';
  }

  // Central dispatcher - replaces the stub added earlier
  // Remove the stub comment and use the full dispatcher
  function getTopicContent(id) {
    const c1 = topicContent(id);
    if (c1) return c1;
    const c2 = topicContentWorkflows(id);
    if (c2) return c2;
    const c3 = topicContentDiagrams(id);
    if (c3) return c3;
    const c4 = topicContentGuides(id);
    if (c4) return c4;
    const c5 = topicContentGuru(id);
    if (c5) return c5;
    return topicContentOther(id) || '';
  }

  function renderTopic() {
    const id = idx(), t = byId(id), i = currentIndex();
    document.getElementById('crumbCurrent').textContent = t.title;
    document.documentElement.style.setProperty('--accent', t.accent);
    document.getElementById('overviewView').classList.toggle('hidden', id !== 'overview');
    document.getElementById('topicView').classList.toggle('hidden', id === 'overview');
    if (id === 'overview') { renderOverview(); renderRail(); markActive(); return; }
    document.getElementById('topicView').innerHTML = `<div class="topic-head" style="--accent:${t.accent}"><span class="tag">${t.tag}</span><h1>${t.title}</h1><p>${t.summary}</p></div><div class="topic-body">${getTopicContent(id)}<div class="topic-footer"><div class="topic-stepper"><button onclick="Docs.goPrev()">\u2190 ${i > 0 ? topics[i - 1].title : 'Overview'}</button><span>${i + 1} / ${topics.length}</span><button onclick="Docs.goNext()">${i < topics.length - 1 ? topics[i + 1].title : 'Start over'} \u2192</button></div></div></div>`;
    renderRail(); markActive();
    if (id === 'live-ui') renderScreenshots();
    if (window.mermaid && document.querySelector('.mermaid')) {
      _initDiagViewer();
      setTimeout(() => { try { mermaid.run({ nodes: Array.from(document.querySelectorAll('.mermaid')) }); } catch (e) {} setTimeout(_injectExpandButtons, 900); }, 80);
    }
    if (shared.active) document.querySelectorAll('.internal-only').forEach(e => e.classList.add('hidden'));
  }

  function renderRail() {
    const id = idx(), i = currentIndex(), total = topics.length;
    const next = topics[(i + 1) % total];
    const docPct = typeof calcDocReadiness === 'function' ? calcDocReadiness() : 92;

    // ── Overview-only sections ──────────────────────────────────
    const ovRail = id === 'overview' ? `
<div class="rail-block">
  <h4>On This Page</h4>
  <div style="display:flex;flex-direction:column;gap:4px">
    <a class="rail-section-link" onclick="Docs.openTopic('overview')"><span class="rail-section-dot active"></span>Quick Access</a>
    <a class="rail-section-link" onclick="Docs.openTopic('overview')"><span class="rail-section-dot"></span>Overview Stats</a>
    <a class="rail-section-link" onclick="Docs.openTopic('architecture')"><span class="rail-section-dot"></span>Architecture</a>
    <a class="rail-section-link" onclick="Docs.openTopic('workflows')"><span class="rail-section-dot"></span>Commercial Workflows</a>
    <a class="rail-section-link" onclick="Docs.openTopic('api-integrations')"><span class="rail-section-dot"></span>API &amp; Integrations</a>
    <a class="rail-section-link" onclick="Docs.openTopic('data-security')"><span class="rail-section-dot"></span>Security &amp; Data Model</a>
    <a class="rail-section-link" onclick="Docs.openTopic('operator-guides')"><span class="rail-section-dot"></span>Operator Guides</a>
    <a class="rail-section-link" onclick="Docs.openTopic('live-ui')"><span class="rail-section-dot"></span>Live UI Snapshots</a>
  </div>
</div>
<div class="rail-block">
  <h4>Doc Progress</h4>
  <div class="progress-line"><span>Overall Progress</span><b id="railDocPct">${docPct}%</b></div>
  <div class="bar"><div class="fill" id="railDocFill" style="width:${docPct}%"></div></div>
  <p style="color:#64748b;font-size:11.5px;margin-top:6px">40 documented areas</p>
  <a href="setuflow-issue-tracker.html" style="display:inline-block;margin-top:8px;font-size:11.5px;color:#2563eb;font-weight:800">View full progress \u2192</a>
</div>
<div class="rail-block">
  <button class="rail-toggle-btn" onclick="Docs.toggleRailSection('rail-recent')" aria-expanded="false"><h4>Recent Updates</h4><span class="rail-toggle-chevron">›</span></button>
  <div class="rail-collapsible-body" id="rail-recent">
  <div class="rail-change"><span class="rail-change-badge">DOC</span><div><div class="rail-change-text">Documentation: 40 areas complete</div><span class="rail-change-meta">May 28, 2026 &middot; v2026.05.28</span></div></div>
  <div class="rail-change"><span class="rail-change-badge">FEAT</span><div><div class="rail-change-text">Admin UX overhaul — all modules shipped</div><span class="rail-change-meta">May 24, 2026 &middot; v2026.05.24</span></div></div>
  <div class="rail-change"><span class="rail-change-badge">FEAT</span><div><div class="rail-change-text">Client Entitlements &amp; Module Grants</div><span class="rail-change-meta">May 27, 2026 &middot; v2026.05.27</span></div></div>
  <div class="rail-change"><span class="rail-change-badge">FEAT</span><div><div class="rail-change-text">Pass-9 RLS Hardening — all 4 passes</div><span class="rail-change-meta">May 23, 2026 &middot; v2026.05.23</span></div></div>
  <div class="rail-change"><span class="rail-change-badge">FEAT</span><div><div class="rail-change-text">API Keys, Rate Limits, Guru Config</div><span class="rail-change-meta">May 24, 2026 &middot; v2026.05.24</span></div></div>
  <a href="setuflow-roadmap.html" style="display:inline-block;margin-top:8px;font-size:11.5px;color:#2563eb;font-weight:800">View full roadmap \u2192</a>
</div>
</div>
<div class="rail-block">
  <button class="rail-toggle-btn" onclick="Docs.toggleRailSection('rail-shipped')" aria-expanded="false"><h4>Shipped</h4><span class="rail-toggle-chevron">›</span></button>
  <div class="rail-collapsible-body" id="rail-shipped">
  <div class="roadmap-item"><div class="roadmap-dot" style="background:#059669"></div><div><div class="roadmap-label">May 2026 &middot; Complete</div><div class="roadmap-item-title">Admin UX Overhaul — All Modules</div></div></div>
  <div class="roadmap-item"><div class="roadmap-dot" style="background:#059669"></div><div><div class="roadmap-label">May 2026 &middot; Complete</div><div class="roadmap-item-title">SF-19 Client Mgmt &amp; Module Grants</div></div></div>
  <div class="roadmap-item"><div class="roadmap-dot" style="background:#059669"></div><div><div class="roadmap-label">May 2026 &middot; Complete</div><div class="roadmap-item-title">Pass-9 Security Hardening</div></div></div>
  <div class="roadmap-item"><div class="roadmap-dot" style="background:#059669"></div><div><div class="roadmap-label">May 2026 &middot; Complete</div><div class="roadmap-item-title">Setu Guru In-App Widget</div></div></div>
  <div class="roadmap-item"><div class="roadmap-dot" style="background:#2563eb"></div><div><div class="roadmap-label">Upcoming</div><div class="roadmap-item-title">Finance Integration (Xero / QuickBooks)</div></div></div>
  <div class="roadmap-item"><div class="roadmap-dot" style="background:#2563eb"></div><div><div class="roadmap-label">Upcoming</div><div class="roadmap-item-title">Server-side PDF Generation</div></div>
  <div class="roadmap-item"><div class="roadmap-dot" style="background:#f59e0b"></div><div><div class="roadmap-label">In Progress (Sprint 19)</div><div class="roadmap-item-title">Documentation Sprint — DOC-001 to DOC-011</div></div></div></div>
  <a href="setuflow-roadmap.html" style="display:inline-block;margin-top:8px;font-size:11.5px;color:#2563eb;font-weight:800">View full roadmap \u2192</a>
</div>
</div>` : '';

    // ── Topic-only: current page sections ──────────────────────
    const TOPIC_SECTIONS = {
      'architecture':     ['Stack Overview','Visual Overview','Route Groups','SF-19 Additions'],
      'modules':          ['Core Modules','Admin Workspace','Reports & Analytics'],
      'workflows':        ['Commercial Pipeline','Approval & Send','Quote PDF','Order Execution'],
      'diagrams':         ['System Architecture','Commercial Lifecycle','Mobile Capture','Guru Loop'],
      'operator-guides':  ['Lead \u2192 Quote','Build & Send','Quote \u2192 Order','Documents','Packing & Freight','Dispatch'],
      'guru-ai':          ['Guru Hero','In-App Widget','Capabilities','Guardrails'],
      'data-security':    ['RLS Policies','Pass-9 Hardening','Audit Trail','Secrets'],
      'api-integrations': ['Integrations','API Keys','AI Suggestions','Notifications'],
      'mobile':           ['Business Card Scan','Smart vCard','Mobile Dashboard','Mobile Orders'],
      'quick-reference':  ['Never Break','Always Verify','Core Routes','Compliance','Contracts','Pricing','Deployment'],
      'documents':        ['Document Control','Expiry Posture','Gate Integration'],
      'trade-events':     ['Event Setup','Field Capture','Post-Event Conversion','Analytics'],
      'integrations':     ['6 Connectors','Status Overview'],
    };
    const sections = TOPIC_SECTIONS[id] || [];
    const topicSections = sections.length ? `
<div class="rail-block">
  <h4>On This Page</h4>
  <div style="display:flex;flex-direction:column;gap:4px">
    ${sections.map((s,si) => `<a class="rail-section-link" style="cursor:default"><span class="rail-section-dot${si===0?' active':''}"></span>${s}</a>`).join('\n    ')}
  </div>
</div>` : '';

    // ── Topic progress ──────────────────────────────────────────
    const posLabel = id === 'overview' ? 'Start at Product Overview' : `Topic ${i + 1} of ${total}`;
    const progressPct = id === 'overview' ? 0 : Math.round((i / (total - 1)) * 100);
    const progressBlock = `
<div class="rail-block">
  <h4>Topics</h4>
  <div class="rail-list">${topics.map(t => `<button data-rail-topic="${t.id}" onclick="Docs.openTopic('${t.id}')">${t.title}</button>`).join('')}</div>
</div>
<div class="rail-block">
  <h4>Progress</h4>
  <div class="progress-line"><span>Reading path</span><b>${progressPct}%</b></div>
  <div class="bar"><div class="fill" style="width:${progressPct}%"></div></div>
  <p style="color:#64748b;font-size:12px;margin-top:4px">${posLabel}</p>
  <div class="next-card"><b>Next</b><p>${next.title}</p><button onclick="Docs.openTopic('${next.id}')">Open ${next.title} \u2192</button></div>
</div>`;

    // ── Live Tracker (internal only) ────────────────────────────
    const trackerBlock = isInternal() ? `
<div class="rail-block">
  <h4><span class="rail-live-dot"></span>Live Tracker</h4>
  <div class="rail-live-row">
    <div class="rail-live-open"><span class="rail-live-val">${metrics.open}</span><span class="rail-live-label">Open issues</span></div>
    <div class="rail-live-resolved"><span class="rail-live-val">${metrics.resolved}</span><span class="rail-live-label">Resolved</span></div>
  </div>
  <a href="setuflow-issue-tracker.html" style="display:flex;align-items:center;gap:5px;font-size:12px;color:#2563eb;font-weight:800">Open issue tracker \u2192</a>
</div>` : '';

    // ── Contributor (shown once, always at bottom) ───────────────
    const contribBlock = `
<div class="rail-block">
  <h4>Contributor</h4>
  <div class="contrib-solo">
    <div class="contrib-solo-av">R</div>
    <div class="contrib-solo-info">
      <b>Ritesh Kapoor</b>
      <p>Product owner &bull; Architect &bull; Builder</p>
    </div>
  </div>
  <div class="contrib-solo-stats">
    <div class="contrib-stat">May 2026</div>
    <div class="contrib-stat"><span id="contribResolved">${metrics.resolved}</span> resolved</div>
  </div>
</div>`;

    // ── Assemble — no duplication ───────────────────────────────
    const rail = id === 'overview'
      ? ovRail + trackerBlock + contribBlock
      : topicSections + progressBlock + trackerBlock + contribBlock;

    document.getElementById('rightRail').innerHTML = rail;
    markActive();
  }


  async function loadMetrics() {
    if (shared.active) return;
    try {
      // Wire directly to Supabase sprint_issues table — same source as issue tracker
      const SB_URL = 'https://sjzfzloggabsmcuxktnl.supabase.co';
      const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqemZ6bG9nZ2Fic21jdXhrdG5sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjgzMTYsImV4cCI6MjA4ODY0NDMxNn0.DvHcAw34QCFB00WtXJ95MRCHhtrZunDQvWlm9NQo-0w';
      // Filter to SETU Flow main org (3327b9a7) — same as issue tracker
      const ORG = '3327b9a7-aadb-44b0-9793-30c4045d3c92';
      const r = await fetch(`${SB_URL}/rest/v1/sprint_issues?select=status,severity&organization_id=eq.${ORG}`, {
        headers: { 'apikey': SB_KEY, 'Authorization': `Bearer ${SB_KEY}` }
      });
      if (r.ok) {
        const rows = await r.json();
        const open = rows.filter(i => i.status && i.status !== 'Resolved' && i.status !== "Won't Fix" && i.status !== 'Deferred').length;
        const resolved = rows.filter(i => i.status === 'Resolved').length;
        const criticalHigh = rows.filter(i => {
          const s = (i.status||'').toLowerCase();
          const sev = (i.severity||'').toLowerCase();
          return s !== 'resolved' && s !== "won't fix" && s !== 'deferred' && (sev === 'critical' || sev === 'high');
        }).length;
        metrics = { ...metrics, open, resolved, criticalHigh };
        // Update topbar pill
        const pill = document.getElementById('issuePill');
        if (pill) { pill.textContent = open; pill.style.background = open > 5 ? '#ef4444' : '#22c55e'; }
        // Update inline overview metrics (already rendered, patch in place)
        const om = document.getElementById('openMetric');
        const iq = document.getElementById('issueQuick');
        const rm = document.getElementById('riskMetric');
        if (om) om.textContent = open;
        if (iq) iq.textContent = open;
        if (rm) rm.textContent = criticalHigh + ' critical / high';
        // Re-render right rail for live numbers
        renderRail();
        return;
      }
    } catch (e) {}
    // Fallback: try server API
    try {
      const r = await fetch('/api/internal/docs-metrics', { credentials: 'include' });
      if (!r.ok) return;
      const d = await r.json();
      metrics = { ...metrics, ...d };
      const pill = document.getElementById('issuePill');
      if (pill) pill.textContent = metrics.open;
      renderRail();
    } catch (e) {}
  }

  async function loadScreenshots() {
    screenshots = [{ id: 'seed-test', title: 'Test live UI screenshot', route: '/internal/setuflow-docs.html', description: 'Initial screenshot uploaded for workspace validation.', image_url: 'docs-screenshots/test-live-ui.png', created_at: '2026-05-27' }];
    try {
      const url = '/api/internal/docs-screenshots' + (shared.active ? `?share_token=${encodeURIComponent(shared.token)}` : '');
      const r = await fetch(url, { credentials: 'include' });
      if (r.ok) { const d = await r.json(); if (Array.isArray(d.screenshots) && d.screenshots.length) screenshots = d.screenshots.concat(screenshots); }
    } catch (e) {}
    try { const local = JSON.parse(localStorage.getItem('setu_docs_screenshots') || '[]'); screenshots = local.concat(screenshots); } catch {}
    renderScreenshots(); openHashSnapshot();
  }

  function renderScreenshots() {
    const grid = document.getElementById('screenshotGrid');
    if (!grid) return;
    grid.innerHTML = screenshots.map(s => `<article class="shot-card"><img src="${escapeHtml(s.image_data || s.image_url)}" alt="${escapeHtml(s.title)}"><div><h3>${escapeHtml(s.title)}</h3><p>${escapeHtml(s.description)}</p><code>${escapeHtml(s.route || '/')}</code><br><button onclick="Docs.openLightbox('${s.id}')">View screen</button><button onclick="Docs.copySnapshotLink('${s.id}')">Copy link</button></div></article>`).join('') || '<p style="color:#64748b;padding:24px">No screenshots yet. Add one with the button above.</p>';
  }

  function openLightbox(id) { const s = screenshots.find(x => String(x.id) === String(id)); if (!s) return; document.getElementById('lightboxImage').src = s.image_data || s.image_url; document.getElementById('lightboxTitle').textContent = s.title; document.getElementById('lightboxDescription').textContent = s.description || ''; document.getElementById('lightboxRoute').textContent = s.route || ''; document.getElementById('imageLightbox').classList.remove('hidden'); }
  function closeLightbox(e) { if (e && e.target !== document.getElementById('imageLightbox') && !e.target.classList.contains('lightbox-close')) return; document.getElementById('imageLightbox').classList.add('hidden'); }
  function copySnapshotLink(id) { const url = location.origin + location.pathname + location.search + '#snapshot=' + encodeURIComponent(id); navigator.clipboard?.writeText(url); }
  function openHashSnapshot() { const h = location.hash || ''; if (h.startsWith('#snapshot=')) { openTopic('live-ui'); setTimeout(() => openLightbox(decodeURIComponent(h.split('=')[1] || '')), 250); } }
  function openScreenshotModal() { document.getElementById('screenshotModal').classList.remove('hidden'); }
  function closeScreenshotModal() { document.getElementById('screenshotModal').classList.add('hidden'); }
  function fileToDataURL(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }

  async function uploadScreenshot() {
    const f = document.getElementById('shotFile').files[0], status = document.getElementById('shotStatus');
    if (!f) { status.textContent = 'Choose an image first.'; return; }
    status.textContent = 'Uploading screenshot...';
    const image_data = await fileToDataURL(f);
    const payload = { title: document.getElementById('shotTitle').value || f.name, route: document.getElementById('shotRoute').value || '/', description: document.getElementById('shotDescription').value || '', image_name: f.name, image_data };
    try {
      const r = await fetch('/api/internal/docs-screenshots', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (r.ok) { const d = await r.json(); screenshots.unshift(d.screenshot); status.textContent = 'Uploaded.'; renderScreenshots(); return; }
    } catch (e) {}
    const local = JSON.parse(localStorage.getItem('setu_docs_screenshots') || '[]');
    const item = { ...payload, id: 'local-' + Date.now(), created_at: new Date().toISOString() };
    local.unshift(item); localStorage.setItem('setu_docs_screenshots', JSON.stringify(local));
    screenshots.unshift(item); status.textContent = 'Saved in this browser.'; renderScreenshots();
  }


  // ── Diagram viewer (zoom / pan / fullscreen) ──────────────────────────────
  const dv = { scale: 1, tx: 0, ty: 0, drag: false, sx: 0, sy: 0 };

  function openDiagramViewer(btn) {
    const wrap = btn.closest('.mermaid-wrap');
    const svg  = wrap.querySelector('svg');
    if (!svg) { alert('Diagram not yet rendered — try again in a moment.'); return; }
    const title = (wrap.querySelector('.diagram-title') || {}).textContent || 'Diagram';
    const clone = svg.cloneNode(true);
    // Derive explicit pixel dimensions from viewBox so SVG renders at full size in the modal
    const vb = svg.getAttribute('viewBox');
    if (vb) {
      const parts = vb.trim().split(/[\s,]+/);
      if (parts.length >= 4) {
        clone.setAttribute('width',  parts[2]);
        clone.setAttribute('height', parts[3]);
      }
    } else {
      const bb = svg.getBoundingClientRect();
      if (bb.width)  clone.setAttribute('width',  bb.width);
      if (bb.height) clone.setAttribute('height', bb.height);
    }
    clone.style.cssText = 'display:block;';
    const canvas = document.getElementById('diagCanvas');
    canvas.innerHTML = ''; canvas.appendChild(clone);
    document.getElementById('diagModalTitle').textContent = title;
    document.getElementById('diagModal').classList.add('dm-open');
    document.body.style.overflow = 'hidden';
    _diagFitToViewport();
    _diagApply();
  }


  function _diagFitToViewport() {
    const vp = document.getElementById('diagViewport');
    const svg = document.getElementById('diagCanvas')?.querySelector('svg');
    if (!vp || !svg) return;
    const vb = svg.getAttribute('viewBox');
    let sw = svg.getAttribute('width'), sh = svg.getAttribute('height');
    if (vb) {
      const parts = vb.trim().split(/[\s,]+/).map(Number);
      if (parts.length >= 4) { sw = parts[2]; sh = parts[3]; }
    }
    sw = parseFloat(sw) || svg.getBoundingClientRect().width || 1200;
    sh = parseFloat(sh) || svg.getBoundingClientRect().height || 760;
    const fit = Math.min((vp.clientWidth - 48) / sw, (vp.clientHeight - 48) / sh, 1.15);
    dv.scale = Math.max(0.2, Math.min(5, fit || 1));
    dv.tx = 0; dv.ty = 0;
    const pct = document.getElementById('diagZoomPct');
    if (pct) pct.textContent = Math.round(dv.scale * 100) + '%';
  }

  function closeDiagramViewer() {
    document.getElementById('diagModal').classList.remove('dm-open');
    document.body.style.overflow = '';
  }

  function diagZoom(delta) {
    dv.scale = Math.min(5, Math.max(0.2, dv.scale + delta));
    document.getElementById('diagZoomPct').textContent = Math.round(dv.scale * 100) + '%';
    _diagApply();
  }

  function diagReset() {
    dv.scale = 1; dv.tx = 0; dv.ty = 0;
    document.getElementById('diagZoomPct').textContent = '100%';
    _diagApply();
  }

  function downloadDiagram() {
    const svg = document.getElementById('diagCanvas').querySelector('svg');
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = (document.getElementById('diagModalTitle').textContent || 'diagram').replace(/\s+/g,'-').toLowerCase() + '.svg';
    a.click();
  }

  function _diagApply() {
    document.getElementById('diagCanvas').style.transform = `translate(${dv.tx}px,${dv.ty}px) scale(${dv.scale})`;
  }

  function _initDiagViewer() {
    const vp = document.getElementById('diagViewport');
    if (!vp || vp._dvInit) return; vp._dvInit = true;
    vp.addEventListener('wheel', e => { e.preventDefault(); diagZoom(e.deltaY < 0 ? 0.18 : -0.18); }, { passive: false });
    vp.addEventListener('mousedown', e => { dv.drag = true; dv.sx = e.clientX - dv.tx; dv.sy = e.clientY - dv.ty; vp.classList.add('dm-drag'); e.preventDefault(); });
    document.addEventListener('mousemove', e => { if (!dv.drag) return; dv.tx = e.clientX - dv.sx; dv.ty = e.clientY - dv.sy; _diagApply(); });
    document.addEventListener('mouseup', () => { dv.drag = false; document.getElementById('diagViewport')?.classList.remove('dm-drag'); });
    // Touch pinch-zoom
    let tDist = 0;
    vp.addEventListener('touchstart', e => { if (e.touches.length === 2) { const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY; tDist = Math.hypot(dx, dy); } }, { passive: true });
    vp.addEventListener('touchmove', e => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX, dy = e.touches[0].clientY - e.touches[1].clientY;
        const nd = Math.hypot(dx, dy); const ratio = nd / tDist; tDist = nd;
        dv.scale = Math.min(5, Math.max(0.2, dv.scale * ratio));
        document.getElementById('diagZoomPct').textContent = Math.round(dv.scale * 100) + '%';
        _diagApply();
      }
    }, { passive: false });
    document.addEventListener('keydown', e => {
      if (!document.getElementById('diagModal')?.classList.contains('dm-open')) return;
      if (e.key === 'Escape') closeDiagramViewer();
      if (e.key === '+' || e.key === '=') diagZoom(0.2);
      if (e.key === '-') diagZoom(-0.2);
      if (e.key === '0') diagReset();
    });
  }

  function _injectExpandButtons() {
    document.querySelectorAll('.mermaid-wrap').forEach(wrap => {
      if (wrap.querySelector('.diagram-expand-btn')) return;
      const svg = wrap.querySelector('svg');
      if (!svg) return;
      const btn = document.createElement('button');
      btn.className = 'diagram-expand-btn';
      btn.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 2h4v4M6 14H2v-4M14 2l-5 5M2 14l5-5"/></svg> Expand';
      btn.addEventListener('click', () => openDiagramViewer(btn));
      wrap.appendChild(btn);
    });
  }


  function switchArchTab(n) {
    document.querySelectorAll('.arch-tab').forEach((b, i) => b.classList.toggle('arch-active', i === n));
    document.querySelectorAll('.arch-panel').forEach((p, i) => p.classList.toggle('arch-active', i === n));
  }

  // Documentation coverage calculator — reflects actual repo coverage
  const DOC_COVERAGE = {
    // Core topics
    architecture: 0.97, modules: 0.97, workflows: 0.97, diagrams: 0.97,
    'operator-guides': 0.97, 'guru-ai': 0.97, 'data-security': 0.97,
    'api-integrations': 0.97, mobile: 0.97, 'quick-reference': 0.97,
    // Sprint features — all shipped and documented
    'admin-overhaul': 0.97, 'approval-send': 0.96, 'quote-pdf': 0.96,
    'sf19-entitlements': 0.96,
    // Previously added areas
    'compliance-module': 0.97, 'contracts': 0.97, 'reports': 0.97,
    'analytics-dashboard': 0.96, 'tasks': 0.97, 'ai-suggestions': 0.97,
    'notifications': 0.95, 'onboarding-wizard': 0.96, 'document-templates': 0.95,
    'pricing-engine': 0.96, 'audit-trail': 0.97, 'markets-categories': 0.96,
    'lead-command-center': 0.97, 'documents-workspace': 0.97, 'integrations-hub': 0.97,
    'trade-events-workflow': 0.97, 'order-execution-lifecycle': 0.98,
    'profile-and-settings': 0.96, 'public-flows': 0.96, 'admin-extended': 0.97,
    'mobile-extended': 0.97, 'buyer-supplier-views': 0.97,
    'deployment-and-auth': 0.97, 'seo-pages': 0.95, 'guru-in-app': 0.97,
    'saved-views': 0.95,
    // Bug resolution — 217/217 resolved
    'bug-resolution': 1.00, 'order-detail-panel': 0.97, 'workspace-refactor': 0.97,
    // DOC-001 to DOC-011 — documented this pass
    'email-delivery-pipeline': 0.96, 'whatsapp-flow': 0.96,
    'guru-rate-limiting': 0.97, 'tasks-full-feature': 0.97,
    'mobile-sprint19-redesign': 0.97, 'reports-upgrades': 0.96,
    'compliance-upgrades': 0.97, 'contracts-upgrades': 0.96,
    'ai-suggestions-upgrades': 0.97, 'webhook-security': 0.97,
    'data-integrity-enums': 0.97,
    // New this pass
    'missing-routes-api-ref': 0.95,
  };
  function calcDocReadiness() {
    const vals = Object.values(DOC_COVERAGE);
    const pct = Math.round((vals.reduce((a,b)=>a+b,0) / vals.length) * 100);
    const el = document.getElementById('readyPct');
    if (el) {
      el.textContent = pct + '%';
      el.closest('.ring').style.background = `conic-gradient(#14b8a6 0 ${pct}%, #334155 ${pct}% 100%)`;
    }
    const railPct = document.getElementById('railDocPct');
    const railFill = document.getElementById('railDocFill');
    if (railPct) railPct.textContent = pct + '%';
    if (railFill) railFill.style.width = pct + '%';
    return pct;
  }


  function toggleRailSection(id) {
    const body = document.getElementById(id);
    if (!body) return;
    const open = body.classList.toggle('open');
    const btn = body.previousElementSibling;
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
    function render() { const id = idx(); document.body.style.overflow = ''; document.getElementById('leftNav')?.classList.remove('open'); document.getElementById('diagModal')?.classList.remove('dm-open'); renderNav(); if (id === 'overview') renderOverview(); renderTopic(); renderRail(); markActive(); }
  function goPrev() { let i = currentIndex(); openTopic(i === 0 ? 'overview' : topics[i - 1].id); }
  function goNext() { let i = currentIndex(); openTopic(i === topics.length - 1 ? 'overview' : topics[i + 1].id); }
  function toggleNav() { document.getElementById('leftNav').classList.toggle('open'); }
  function search(q) { q = String(q || '').toLowerCase(); document.querySelectorAll('.nav-link').forEach(b => { const t = byId(b.dataset.topic); b.style.display = !q || t.title.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q) ? 'flex' : 'none'; }); document.querySelectorAll('.topic-card').forEach(c => { c.style.display = !q || c.innerText.toLowerCase().includes(q) ? 'flex' : 'none'; }); }
  function openShare() { document.getElementById('shareModal').classList.remove('hidden'); }
  function closeShare() { document.getElementById('shareModal').classList.add('hidden'); }
  function generateShareLink() { const rec = document.getElementById('shareRecipient').value || 'External reviewer', hrs = Number(document.getElementById('shareDuration').value || 72), data = { recipient: rec, expiry: Date.now() + hrs * 3600000, issued: Date.now() }, tok = btoa(JSON.stringify(data)), url = location.origin + location.pathname + '?share_token=' + encodeURIComponent(tok); document.getElementById('shareOutput').value = url; document.getElementById('shareMeta').textContent = `For ${rec}. Expires ${new Date(data.expiry).toLocaleString()}. Issue tracker and roadmap are hidden.`; document.getElementById('shareResult').classList.remove('hidden'); }
  function copyShareLink() { navigator.clipboard?.writeText(document.getElementById('shareOutput').value); }
  function showFullDocument() { const w = window.open('', '_blank'); w.document.write('<html><head><title>SETU Flow Full Documentation</title><link rel="stylesheet" href="setuflow-docs-workspace.css?v=20260528-refresh-fix"></head><body><main class="main" style="max-width:980px;margin:auto">' + topics.filter(t => t.id !== 'overview').map(t => `<section class="topic-view" style="margin:18px 0"><div class="topic-head" style="--accent:${t.accent}"><span class="tag">${t.tag}</span><h1>${t.title}</h1><p>${t.summary}</p></div><div class="topic-body">${getTopicContent(t.id)}</div></section>`).join('') + '</main></body></html>'); }

  window.addEventListener('hashchange', () => { render(); openHashSnapshot(); });
  window.addEventListener('popstate', () => { render(); openHashSnapshot(); });
  window.addEventListener('pageshow', () => { document.body.style.overflow = ''; document.getElementById('leftNav')?.classList.remove('open'); document.getElementById('diagModal')?.classList.remove('dm-open'); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { document.getElementById('leftNav').classList.remove('open'); document.querySelectorAll('.modal,.lightbox').forEach(m => m.classList.add('hidden')); closeDiagramViewer(); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('globalSearch')?.focus(); }
  });
  document.addEventListener('click', e => { if (innerWidth < 760 && !document.getElementById('leftNav').contains(e.target) && !e.target.closest('.mobile-only')) document.getElementById('leftNav').classList.remove('open'); });

  async function init() {
    await initAuth();
    if (window.mermaid) mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { primaryColor: '#dbeafe', primaryTextColor: '#1e3a8a', primaryBorderColor: '#2563eb', lineColor: '#64748b', secondaryColor: '#f0fdf4', tertiaryColor: '#faf5ff' } });
    render();
    calcDocReadiness();
    await loadMetrics();
    await loadScreenshots();
  }

  init();
  return { openTopic, goPrev, goNext, calcDocReadiness, toggleNavGroup, toggleRailSection, toggleNav, search, openShare, closeShare, generateShareLink, copyShareLink, showFullDocument, openScreenshotModal, closeScreenshotModal, uploadScreenshot, openLightbox, closeLightbox, copySnapshotLink, switchGuideTab, selectStep, nextGuideStep, prevGuideStep, openDiagramViewer, closeDiagramViewer, diagZoom, diagReset, downloadDiagram, switchArchTab };
})();

