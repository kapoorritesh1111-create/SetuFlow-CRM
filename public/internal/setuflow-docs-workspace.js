const Docs = (() => {
  const shared = { active: false, token: null, recipient: null, expiry: null };
  let authUser = null;
  let screenshots = [];
  let metrics = { open: 9, resolved: 199, criticalHigh: 1, milestones: 3 };

  const topics = [
    { id: 'overview',         group: 'Get Started',        icon: '\u2302',   title: 'Product Overview',     tag: 'Start Here',    summary: 'What SETU Flow CRM is, why it exists, and how a tester or new tech lead should orient themselves.',                         accent: '#2563eb', next: 'architecture', sections: [] },
    { id: 'architecture',     group: 'System Overview',    icon: '\u2bec',   title: 'Architecture',         tag: 'System',        summary: 'App shell, database, auth, RLS, integration boundaries, route groups, and deployment topology.',                           accent: '#0d9488' },
    { id: 'modules',          group: 'System Overview',    icon: '\u25a6',   title: 'Module Reference',     tag: 'System',        summary: 'Routes, workspaces, source tables, and ownership responsibilities for every major module.',                               accent: '#2563eb' },
    { id: 'workflows',        group: 'Business Workflows', icon: '\u21c4',   title: 'Commercial Workflows', tag: 'Workflows',     summary: 'Full commercial lifecycle: Lead \u2192 Follow-up \u2192 Quote \u2192 Approval &amp; Send \u2192 Order Execution \u2192 Closeout.',                     accent: '#0d9488' },
    { id: 'diagrams',         group: 'Business Workflows', icon: '\u25c7',   title: 'Flow Diagrams',        tag: 'Diagrams',      summary: 'Mermaid flowcharts, swimlane diagrams, and slide-ready simplified flow diagrams.',                                        accent: '#7c3aed' },
    { id: 'operator-guides',  group: 'Operations',         icon: '\u2637',   title: 'Operator Guides',      tag: 'Operations',    summary: 'Six click-by-click operator guides with expected UI state, expected data writes, and do-not-break rules.',                 accent: '#f97316' },
    { id: 'guru-ai',          group: 'Operations',         icon: '\u2726',   title: 'Setu Guru AI',         tag: 'AI Assistant',  summary: 'Context-aware AI panel, business card scan, smart vCard, live org search \u2014 all with human approval guardrails.',          accent: '#db2777' },
    { id: 'data-security',    group: 'Security & Data',    icon: '\u2bcf',   title: 'Data & Security',      tag: 'Security',      summary: 'Organization-scoped data, RLS policies, membership, roles, audit trails, and safe integration boundaries.',               accent: '#059669' },
    { id: 'api-integrations', group: 'Integrations & API', icon: '</>',      title: 'API & Integrations',   tag: 'Integrations',  summary: 'Public APIs, webhook boundaries, WhatsApp/manual tracked links, finance/freight adapters, and provider rules.',           accent: '#2563eb' },
    { id: 'mobile',           group: 'Operations',         icon: '\u25af',   title: 'Mobile Workspace',     tag: 'Mobile',        summary: 'Business card scan, smart vCard, trade-show capture, and mobile role-aware lead workflows.',                              accent: '#14b8a6' },
    { id: 'quick-reference',  group: 'Reference',          icon: '\u2630',   title: 'Quick Reference',      tag: 'Reference',     summary: 'Fast rules, gates, routes, and checks for testers and technical leads.',                                                 accent: '#334155' },
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
    let html = '', g = '';
    topics.forEach(t => {
      if (t.group !== g) { g = t.group; html += `<div class="nav-group">${g}</div>`; }
      html += `<button class="nav-link" data-topic="${t.id}" onclick="Docs.openTopic('${t.id}')"><span class="dot">${t.icon}</span>${t.title}</button>`;
    });
    nav.innerHTML = html;
    markActive();
  }

  function markActive() {
    const id = idx();
    document.querySelectorAll('.nav-link').forEach(b => b.classList.toggle('active', b.dataset.topic === id));
    document.querySelectorAll('[data-rail-topic]').forEach(b => b.classList.toggle('active', b.dataset.railTopic === id));
    const i = currentIndex();
    document.getElementById('mobileProgress').textContent = (i + 1) + ' / ' + topics.length;
    document.getElementById('mobilePrev').textContent = i === 0 ? 'Overview' : '\u2190 ' + topics[i - 1].title;
    document.getElementById('mobileNext').textContent = i === topics.length - 1 ? 'Start over' : topics[i + 1].title + ' \u2192';
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
<section class="quick-grid">
  <div class="quick-card internal-only">
    <div class="quick-icon" style="background:#0d9488">&#x27A4;</div>
    <h3>Share Doc</h3>
    <p>Share this documentation with team members or external stakeholders.</p>
    <button onclick="Docs.openShare()">Share documentation</button>
    <div class="quick-card-arrow">&#x2192;</div>
  </div>
  <div class="quick-card internal-only">
    <div class="quick-icon" style="background:#2563eb">&#x25CE;</div>
    <h3>Issue Tracker <span class="quick-card-count" id="issueQuick">${openIssues}</span></h3>
    <p>View open issues, report bugs, or track documentation tasks and improvements.</p>
    <a href="setuflow-issue-tracker.html">Open issue tracker</a>
    <div class="quick-card-arrow">&#x2192;</div>
  </div>
  <div class="quick-card internal-only">
    <div class="quick-icon" style="background:#7c3aed">&#x2691;</div>
    <h3>Roadmap <span class="quick-card-count" style="background:#7c3aed">${milestones}</span></h3>
    <p>Explore upcoming features, milestones, and product delivery timelines.</p>
    <a href="setuflow-roadmap.html">Open roadmap</a>
    <div class="quick-card-arrow">&#x2192;</div>
  </div>
  <div class="quick-card">
    <div class="quick-icon" style="background:#db2777">&#x25a3;</div>
    <h3>${isInternal() ? 'Add / Review' : 'View'} Screenshots</h3>
    <p>Browse all documentation sections and live UI snapshots at a glance.</p>
    <button onclick="Docs.openTopic('live-ui')">Open snapshots</button>
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

    map['architecture'] = `<div class="pro-grid">
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
<tr><td><b>Email</b></td><td>Mailtrap (production-ready)</td><td>Order document sends, invitation emails, webhook delivery confirmation</td><td>link_created is not delivered. Delivery confirmation requires MAILTRAP_WEBHOOK_SECRET in Vercel.</td></tr>
<tr><td><b>PDF</b></td><td>puppeteer-core + @sparticuz/chromium</td><td>Document generation via free OSS path — no paid PDF API</td><td>Browser-print available as fallback. Server-side via approved OSS path only.</td></tr>
</tbody></table></div>
<div class="section-block"><h2>Route Groups</h2></div>
<div class="tbl-wrap"><table>
<thead><tr><th>Route</th><th>Module</th><th>Description</th></tr></thead>
<tbody>
<tr><td><code>/dashboard</code></td><td>Dashboard</td><td>Executive KPIs, market command map, activity feed, follow-up queue</td></tr>
<tr><td><code>/leads</code></td><td>Follow-up / Lead Command Center</td><td>Buyer/supplier records, qualification, product coverage, compliance</td></tr>
<tr><td><code>/pipeline</code></td><td>Pipeline</td><td>Kanban (11 stages), swimlane, forecast, density controls</td></tr>
<tr><td><code>/quotes</code></td><td>Quote Builder</td><td>Versioned quotes, FX, pricing, approval gates, send tracking</td></tr>
<tr><td><code>/orders</code></td><td>Order Execution Cockpit</td><td>Actual lines, documents, packing, freight, processing, dispatch, finance</td></tr>
<tr><td><code>/products</code></td><td>Catalog</td><td>Categories, products, variants, pricing rule sets, bulk CSV import</td></tr>
<tr><td><code>/admin/*</code></td><td>Admin</td><td>Org settings, users, invitations, roles, trade events, document templates</td></tr>
<tr><td><code>/mobile/*</code></td><td>Mobile Workspace</td><td>Business card scan, smart vCard, field capture, mobile leads/quotes</td></tr>
<tr><td><code>/contact-exchange/scan</code></td><td>Capture</td><td>Business card scan — creates reviewable lead drafts</td></tr>
<tr><td><code>/order-documents/preview/[token]</code></td><td>Document Preview</td><td>Tokenized buyer-facing document preview — tracks open count</td></tr>
</tbody></table></div>`;

    map['modules'] = `<div class="tbl-wrap"><table>
<thead><tr><th>Module</th><th>Route</th><th>What It Owns</th><th>Ready Signal</th></tr></thead>
<tbody>
<tr><td><b>Dashboard</b></td><td><code>/dashboard</code></td><td>Executive KPIs, market command map, commercial feed, follow-up queue</td><td>KPIs load without cross-org leakage.</td></tr>
<tr><td><b>Leads</b></td><td><code>/leads</code></td><td>Buyer/supplier records, Lead Command Center, product coverage, compliance posture, follow-up planning</td><td>Command Center opens with clear next actions. Quote CTA appears only when gate passes.</td></tr>
<tr><td><b>Pipeline</b></td><td><code>/pipeline</code></td><td>Kanban board (11 stages), swimlane view, forecast mode, density controls, stage filters</td><td>View controls do not break stage logic. Cards show overdue indicators.</td></tr>
<tr><td><b>Quotes</b></td><td><code>/quotes</code></td><td>Versioned quote workspace, FX snapshots, pricing rules, approval gates, send tracking</td><td>Sent quote versions are immutable. Accepted version cannot be edited.</td></tr>
<tr><td><b>Orders</b></td><td><code>/orders</code></td><td>Actual lines, first document, packing, freight, trade requirements, processing, shipment, finance closeout</td><td>No stage skips without gate approval. link_created is not delivered.</td></tr>
<tr><td><b>Products</b></td><td><code>/products</code></td><td>Categories, products, variants (pack size, UOM, MOQ), pricing rule sets, bulk CSV import</td><td>Pricing cascades: org then category then product.</td></tr>
<tr><td><b>Admin</b></td><td><code>/admin/*</code></td><td>Org settings, user invitations, role management, trade event setup, document template profiles</td><td>Role-based access enforced server-side. Non-admin users cannot invite.</td></tr>
<tr><td><b>Mobile</b></td><td><code>/mobile/*</code></td><td>Business card scan, smart vCard, field capture, mobile leads, mobile order view</td><td>Scan creates reviewable lead drafts — operators approve before commercial record created.</td></tr>
<tr><td><b>Analytics</b></td><td><code>/dashboard/analytics</code></td><td>Lead to Order funnel, quote performance, order execution stats, document send effectiveness, top markets</td><td>Charts render without crashing. Filters shared across panels.</td></tr>
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
</div>`;
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

  function topicContentGuides(id) {
    if (id !== 'operator-guides') return null;
    return `<div class="og-tabs-wrap">
<div class="og-tabs" role="tablist">
  <button class="og-tab og-active" onclick="Docs.switchGuideTab(0)"><span class="og-tab-n">1</span>Lead &rarr; Quote</button>
  <button class="og-tab" onclick="Docs.switchGuideTab(1)"><span class="og-tab-n">2</span>Build &amp; Send</button>
  <button class="og-tab" onclick="Docs.switchGuideTab(2)"><span class="og-tab-n">3</span>Quote &rarr; Order</button>
  <button class="og-tab" onclick="Docs.switchGuideTab(3)"><span class="og-tab-n">4</span>Documents</button>
  <button class="og-tab" onclick="Docs.switchGuideTab(4)"><span class="og-tab-n">5</span>Packing &amp; Freight</button>
  <button class="og-tab" onclick="Docs.switchGuideTab(5)"><span class="og-tab-n">6</span>Dispatch &amp; Closeout</button>
</div>
<div class="og-panel og-active">
  <div class="og-panel-meta"><span class="og-meta-lbl">6 steps</span><div class="og-pbar"><div class="og-pbar-fill" style="width:100%"></div></div><span class="og-meta-lbl">Lead &rarr; Quote</span></div>
  <div class="og-steps">
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">1</div><div><strong>Click Follow-up in main navigation</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Lead queue loads. All org leads visible per RLS.</p></div><div><span class="og-chip og-chip-db">DB</span><p><code>leads</code> table via RLS policy.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">2</div><div><strong>Click Open on the lead row</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Lead Command Center opens &mdash; four cards: qualification, coverage, follow-up, compliance.</p></div><div><span class="og-chip og-chip-db">Verify</span><p>Buyer/supplier context present. Lead not disqualified.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">3</div><div><strong>Click Open coverage manager if product coverage is missing</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Select product interest &rarr; Save. Quote CTA becomes dominant when gate passes.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>lead_product_interests</code> row created.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">4</div><div><strong>Click Plan follow-up if next action is missing</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Enter date and note. Overdue item clears from queue when complete.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>lead_follow_ups</code> row written.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">5</div><div><strong>Check compliance card for any quote-send blockers</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>If red &mdash; click Compliance check or Full screen. Choose: Attach evidence, Waive (with reason), or Defer to dispatch.</p></div><div><span class="og-chip og-chip-db">Requirement</span><p>Each resolution requires a written record.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">6</div><div><strong>Click Create quote or Continue quote</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Quote workspace opens with lead context pre-seeded.</p></div><div><span class="og-chip og-chip-db">Gate</span><p>Not disqualified &bull; Product interest exists &bull; Country/market set &bull; Compliance acceptable.</p></div></div></div>
  </div>
  <div class="og-donot"><strong>&otimes; Do NOT:</strong> Treat free-text product notes as saved coverage. Do not bypass compliance by creating a disconnected quote. Do not assume WhatsApp/email activity means delivery was confirmed.</div>
</div>
<div class="og-panel">
  <div class="og-panel-meta"><span class="og-meta-lbl">9 steps</span><div class="og-pbar"><div class="og-pbar-fill" style="width:100%"></div></div><span class="og-meta-lbl">Quote Build &amp; Send</span></div>
  <div class="og-steps">
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">1</div><div><strong>Click Quote in navigation or open from lead</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Select or create quote for the correct lead.</p></div><div><span class="og-chip og-chip-db">DB State</span><p>Draft <code>quote_versions</code> record exists or will be created.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">2</div><div><strong>Click Add product and select catalog products</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Pack size, MOQ, pricing defaults load from catalog.</p></div><div><span class="og-chip og-chip-db">Verify</span><p>Each line has product, quantity, unit, and price.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">3</div><div><strong>Confirm currency, pricing basis, validity, incoterm, freight profile</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>For non-USD: verify FX snapshot exists or manual FX enabled.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p>FX context in <code>quote_pricing_snapshots</code>.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">4</div><div><strong>Review pricing &mdash; enter override reasons for manual changes</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Override &gt;15% triggers pending approval. Send disabled until approved.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p>Approval flag set on <code>quote_versions</code>.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">5</div><div><strong>Click Save draft or Create quote</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Draft saved. All line items preserved.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>quotes</code>, <code>quote_versions</code>, <code>quote_version_line_items</code>, <code>quote_pricing_snapshots</code> all written.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">6</div><div><strong>Resolve any approval or compliance blockers</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Approval: admin approves from Quotes queue. Compliance: use Review card inside quote workspace.</p></div><div><span class="og-chip og-chip-db">Gate</span><p>Both gates must clear before Send is enabled.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">7</div><div><strong>Click Send quote</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Quote LOCKED from direct editing.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>quotes.sent_at</code> set &bull; <code>quote_versions.status = 'sent'</code> &bull; <code>communications</code> row created.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">8</div><div><strong>Click Open customer PDF to review output</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Verify</span><p>Logo &bull; Correct currency (not hardcoded USD if AUD/EUR/GBP/INR) &bull; All line items &bull; Incoterm &bull; Tax ID.</p></div><div><span class="og-chip og-chip-db">Status</span><p>Sent version is immutable from this point.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">9</div><div><strong>Record buyer outcome: Mark accepted or Mark rejected</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Timing</span><p>Only after actual buyer response &mdash; not immediately after send.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>quotes.accepted_version_id</code> set. Contract and order lineage created.</p></div></div></div>
  </div>
  <div class="og-donot"><strong>&otimes; Do NOT:</strong> Send while approval is pending. Do not treat a draft PDF as a sent customer document. Do not mark accepted before receiving actual buyer confirmation.</div>
</div>
<div class="og-panel">
  <div class="og-panel-meta"><span class="og-meta-lbl">5 steps</span><div class="og-pbar"><div class="og-pbar-fill" style="width:100%"></div></div><span class="og-meta-lbl">Accepted Quote &rarr; Order</span></div>
  <div class="og-steps">
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">1</div><div><strong>In /quotes, open a sent quote and click Mark accepted</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Status changes to Accepted. Order created in background.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>quotes.accepted_version_id</code> set &bull; contract/order RPCs called &bull; <code>orders</code> record created.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">2</div><div><strong>Navigate to /orders and click Open on the new order</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Order workspace shows stage strip. Stage 1 = Quote Approved.</p></div><div><span class="og-chip og-chip-db">Verify</span><p><code>orders.source_quote_id</code> and <code>source_quote_version_id</code> are set.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">3</div><div><strong>Click Prepare actual lines</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>System seeds order lines from accepted contract. Gate status set to prepared.</p></div><div><span class="og-chip og-chip-db">Critical</span><p>Quote version lines remain UNCHANGED after this point.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">4</div><div><strong>Review quote vs actual lines &mdash; save changes with reason</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Differences shown side by side. Reason field required for each variance.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>order_lines</code> reflect actual. <code>quote_version_line_items</code> unchanged.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">5</div><div><strong>Click Approve actual lines</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Order moves to Internal Approval stage.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>order_approval_gates</code> approved &bull; <code>order_stage_events</code> written.</p></div></div></div>
  </div>
  <div class="og-donot"><strong>&otimes; Do NOT:</strong> Modify quote version line items after send. Do not approve actual lines without reviewing every variance against the quote.</div>
</div>
<div class="og-panel">
  <div class="og-panel-meta"><span class="og-meta-lbl">5 steps</span><div class="og-pbar"><div class="og-pbar-fill" style="width:100%"></div></div><span class="og-meta-lbl">First Document &amp; Send Tracking</span></div>
  <div class="og-steps">
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">1</div><div><strong>Open the order and click Prepare document</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Order document draft created.</p></div><div><span class="og-chip og-chip-db">Type</span><p><code>proforma_invoice</code> (export) or <code>order_confirmation</code> (regional).</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">2</div><div><strong>Click Preview and review the rendered document</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Verify</span><p>Product &bull; Quantity &bull; Price &bull; Parties &bull; Incoterm &bull; Terms &bull; Logo &bull; Tax IDs &bull; Bank details.</p></div><div><span class="og-chip og-chip-db">Tracking</span><p>Preview open count tracked.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">3</div><div><strong>Click Approve</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Send button unlocked. Non-preview sends now permitted.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>order_documents.status = 'approved'</code>. Gate approved.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">4</div><div><strong>Click Send tracked, select channel, verify recipient</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Recipient defaults from lead contact info. Confirm before sending.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>order_document_sends</code> row with <code>status = 'link_created'</code>.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">5</div><div><strong>Use Download / Print PDF if a physical file is needed</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Browser print dialog opens. Toolbar hidden from PDF output.</p></div><div><span class="og-chip og-chip-db">Note</span><p>Browser-print only &mdash; not a server-generated PDF binary.</p></div></div></div>
  </div>
  <div class="og-critical"><strong>&#x26A0; Critical:</strong> <code>link_created</code> is NOT delivered. Do not treat a tracked link as confirmed email/WhatsApp delivery. Do not send unapproved documents to buyers.</div>
</div>
<div class="og-panel">
  <div class="og-panel-meta"><span class="og-meta-lbl">5 steps</span><div class="og-pbar"><div class="og-pbar-fill" style="width:100%"></div></div><span class="og-meta-lbl">Packing, Freight &amp; Trade</span></div>
  <div class="og-steps">
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">1</div><div><strong>After first document approval &mdash; click Prepare packing sheet</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Packing sheet created from actual order lines.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>packing_plans</code> and <code>packing_plan_lines</code> created.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">2</div><div><strong>Click Preview packing sheet then Approve packing sheet</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Packing stage complete. Processing and freight actions unlocked.</p></div><div><span class="og-chip og-chip-db">Gate</span><p>Packing approval gate written.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">3</div><div><strong>Click Prepare freight request</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Confirm</span><p>Origin &bull; Destination &bull; Incoterm &bull; Packing basis.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>freight_rate_requests</code> created.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">4</div><div><strong>Search and attach trade requirements &mdash; click Confirm source</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>No rule match = human review required. NOT automatic clearance.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>trade_requirements</code> and <code>trade_requirement_sources</code> created.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">5</div><div><strong>Resolve all blocking trade requirements before dispatch</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Required</span><p>Blocking severity = human review required.</p></div><div><span class="og-chip og-chip-db">Gate</span><p>Dispatch blocked until all blocking items resolved.</p></div></div></div>
  </div>
  <div class="og-donot"><strong>&otimes; Do NOT:</strong> Treat no rule-match as automatic clearance. Do not move to dispatch while any blocking trade requirement is unresolved.</div>
</div>
<div class="og-panel">
  <div class="og-panel-meta"><span class="og-meta-lbl">6 steps</span><div class="og-pbar"><div class="og-pbar-fill" style="width:100%"></div></div><span class="og-meta-lbl">Processing, Dispatch &amp; Closeout</span></div>
  <div class="og-steps">
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">1</div><div><strong>Open Processing stage &mdash; save picked/packed/QC checks</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Mark: Picked &bull; Packed &bull; QC Passed. Add notes for exceptions.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>order_processing_checks</code> metadata written.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">2</div><div><strong>Complete processing only when all three checks pass</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Delivery note and logistics actions unlocked.</p></div><div><span class="og-chip og-chip-db">Gate</span><p>Processing gate approved.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">3</div><div><strong>Approve logistics documents then click Create shipment draft</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Required</span><p>Mode &bull; Carrier &bull; Forwarder &bull; Booking/tracking reference.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>shipments</code> draft record created.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">4</div><div><strong>Resolve all blocking trade requirements then click Approve dispatch</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Order stage moves to Dispatch/Invoice.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>shipments.status = 'dispatched'</code>.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">5</div><div><strong>Prepare / Preview / Approve final invoice &mdash; click Approve invoice</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Critical</span><p>Final invoice must reflect actual dispatched quantities &mdash; NOT quoted quantities.</p></div><div><span class="og-chip og-chip-db">Gate</span><p>Invoice approval gate required before closeout.</p></div></div></div>
    <div class="og-sc"><div class="og-sc-l"><div class="og-sc-n">6</div><div><strong>Enter payment reference, reconcile, confirm outstanding = 0 &mdash; Generate receipt + close</strong></div></div><div class="og-sc-r"><div><span class="og-chip og-chip-ui">Expected UI</span><p>Order status changes to Completed. All gates closed.</p></div><div><span class="og-chip og-chip-db">DB Write</span><p><code>orders.status = 'completed'</code> &bull; <code>finance_sync_records</code> written &bull; Closeout gate approved.</p></div></div></div>
  </div>
  <div class="og-donot"><strong>&otimes; Do NOT:</strong> Invoice for quoted quantities if actual dispatch differed. Do not close the order before payment reconciliation is complete and outstanding = 0.</div>
</div>
</div>
<div class="callout" style="margin-top:20px"><b>Gate rule:</b> All gate approvals are required and auditable. Do not bypass any stage gate. Do not create disconnected quotes, assume WhatsApp activity means delivery, or treat a draft PDF as a sent customer document.</div>`;
  }

  function switchGuideTab(n) {
    document.querySelectorAll('.og-tab').forEach((b, i) => b.classList.toggle('og-active', i === n));
    document.querySelectorAll('.og-panel').forEach((p, i) => p.classList.toggle('og-active', i === n));
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
</tbody></table></div>`;
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
</tbody></table></div>`;
    if (id === 'mobile') return `<div class="feature-strip">
  <div class="feature-card"><div class="big-icon" style="background:#0d9488">&#x1F4F7;</div><h3>Business Card Scan</h3><p>Scan, parse, review, and save buyer/supplier leads from trade shows or field meetings. AI parses the card &mdash; operators approve before any commercial record is created.</p></div>
  <div class="feature-card"><div class="big-icon" style="background:#2563eb">&#x1F4C7;</div><h3>Smart vCard</h3><p>Share a professional contact card and preserve event/source context for later follow-up. Buyer submissions automatically link to the event and lead flow.</p></div>
  <div class="feature-card"><div class="big-icon" style="background:#7c3aed">&#x26A1;</div><h3>Mobile Action Footer</h3><p>Critical next actions remain accessible without forcing desktop-style navigation. Role-aware controls shown only to appropriate users.</p></div>
</div>
<div class="doc-card-grid">
  <div class="doc-card"><div class="doc-card-title">Camera &amp; Capture</div><ul><li>Camera permission handling and fallback manual entry</li><li>Upload size limits and image quality requirements</li><li>Parsed data review UI before saving</li><li>Lead save from scan creates correct database rows</li></ul></div>
  <div class="doc-card"><div class="doc-card-title">vCard &amp; QR</div><ul><li>vCard generation from profile data</li><li>QR code display and scanning</li><li>Public capture form submission creates lead draft</li><li>Event source metadata preserved on link</li></ul></div>
  <div class="doc-card"><div class="doc-card-title">Role &amp; Access</div><ul><li>Mobile workspace shows role-appropriate modules</li><li>Leads, pipeline, and orders visible per membership</li><li>No admin controls on mobile for non-admin users</li><li>Offline behavior and sync on reconnect</li></ul></div>
</div>`;
    if (id === 'quick-reference') return `<div class="quick-ref-grid">
  <div class="ref-card"><h3>Never Break</h3><ul><li>No service-role key in client code.</li><li>No external live provider calls outside approved adapters.</li><li>No sent quote version mutation &mdash; create new version.</li><li>No order stage skip without explicit gate approval.</li><li>No cross-org data visible to org members.</li></ul></div>
  <div class="ref-card"><h3>Always Verify</h3><ul><li>GitHub main contains the change.</li><li>Vercel deployment is green before tracker closes.</li><li>Tracker notes include commit/deploy proof.</li><li>RLS remains organization-scoped after any schema change.</li><li>Sent/accepted quote version is not mutated.</li></ul></div>
  <div class="ref-card"><h3>Core Routes</h3><ul><li><code>/leads</code> &mdash; command center &amp; follow-up queue</li><li><code>/pipeline</code> &mdash; kanban, swimlane, forecast</li><li><code>/quotes</code> &mdash; versioned quote workspace</li><li><code>/orders</code> &mdash; execution cockpit</li><li><code>/admin/*</code> &mdash; org, users, catalog admin</li></ul></div>
  <div class="ref-card"><h3>Signals of Quality</h3><ul><li>Clear next action visible to operator.</li><li>Blocker explains why and what to do next.</li><li>Data write matches UI state.</li><li>Audit record exists for every sensitive move.</li><li>link_created &ne; delivered &mdash; never conflate.</li></ul></div>
</div>`;
    if (id === 'live-ui') return `<div class="screenshot-toolbar"><div><h2>Live UI Screenshot Library</h2><p>Clickable screenshots of key modules and workflows. Upload from this workspace to share with testers and tech leads.</p></div><button class="internal-only" onclick="Docs.openScreenshotModal()">+ Add Screenshot</button></div><div id="screenshotGrid" class="screenshot-grid"></div>`;
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
    if (id === 'diagrams' && window.mermaid) {
      _initDiagViewer();
      setTimeout(() => { try { mermaid.run({ nodes: Array.from(document.querySelectorAll('.mermaid')) }); } catch (e) {} setTimeout(_injectExpandButtons, 900); }, 80);
    }
    if (shared.active) document.querySelectorAll('.internal-only').forEach(e => e.classList.add('hidden'));
  }

  function renderRail() {
    const id = idx(), i = currentIndex(), pct = Math.round((i / (topics.length - 1)) * 100);
    const next = topics[(i + 1) % topics.length];
    const ovRail = id === 'overview' ? `<div class="rail-block"><h4>On This Page</h4><div style="display:flex;flex-direction:column;gap:4px">
<a class="rail-section-link" style="cursor:pointer" onclick="Docs.openTopic('overview')"><span class="rail-section-dot active"></span>Quick Access</a>
<a class="rail-section-link" style="cursor:pointer" onclick="Docs.openTopic('overview')"><span class="rail-section-dot"></span>Overview Stats</a>
<a class="rail-section-link" style="cursor:pointer" onclick="Docs.openTopic('architecture')"><span class="rail-section-dot"></span>Architecture Overview</a>
<a class="rail-section-link" style="cursor:pointer" onclick="Docs.openTopic('workflows')"><span class="rail-section-dot"></span>Commercial Workflows</a>
<a class="rail-section-link" style="cursor:pointer" onclick="Docs.openTopic('api-integrations')"><span class="rail-section-dot"></span>API &amp; Integrations</a>
<a class="rail-section-link" style="cursor:pointer" onclick="Docs.openTopic('data-security')"><span class="rail-section-dot"></span>Security &amp; Data Model</a>
<a class="rail-section-link" style="cursor:pointer" onclick="Docs.openTopic('operator-guides')"><span class="rail-section-dot"></span>Operator Guides</a>
<a class="rail-section-link" style="cursor:pointer" onclick="Docs.openTopic('live-ui')"><span class="rail-section-dot"></span>Live UI Snapshots</a>
</div></div>
<div class="rail-block"><h4>Doc Progress</h4><div class="progress-line"><span>Overall Progress</span><b>66%</b></div><div class="bar"><div class="fill" style="width:66%"></div></div><p style="color:#64748b;font-size:11.5px;margin-top:6px">342 / 500 topics</p><a href="setuflow-issue-tracker.html" style="display:inline-block;margin-top:8px;font-size:11.5px;color:#2563eb;font-weight:800">View full progress \u2192</a></div>
<div class="rail-block"><h4>Recent Changes</h4>
<div class="rail-change"><span class="rail-change-badge">DOC</span><div><div class="rail-change-text">Updated API Authentication</div><span class="rail-change-meta">May 14, 2026 &middot; v2025.05.14</span></div></div>
<div class="rail-change"><span class="rail-change-badge">DOC</span><div><div class="rail-change-text">New Webhook Events</div><span class="rail-change-meta">May 13, 2026 &middot; v2025.05.13</span></div></div>
<div class="rail-change"><span class="rail-change-badge">DOC</span><div><div class="rail-change-text">Operator Guide: Alerts</div><span class="rail-change-meta">May 12, 2026 &middot; v2025.05.12</span></div></div>
<a href="setuflow-issue-tracker.html" style="display:inline-block;margin-top:8px;font-size:11.5px;color:#2563eb;font-weight:800">View all changes \u2192</a></div>
<div class="rail-block"><h4>Roadmap Highlights</h4>
<div class="roadmap-item"><div class="roadmap-dot" style="background:#0d9488"></div><div><div class="roadmap-label">Q2 2025</div><div class="roadmap-item-title">AI/Guru Enhancements &mdash; In Progress</div></div></div>
<div class="roadmap-item"><div class="roadmap-dot" style="background:#64748b"></div><div><div class="roadmap-label">Q3 2025</div><div class="roadmap-item-title">Mobile App v2 &mdash; Planned</div></div></div>
<div class="roadmap-item"><div class="roadmap-dot" style="background:#64748b"></div><div><div class="roadmap-label">Q3 2025</div><div class="roadmap-item-title">Advanced Reporting &mdash; Planned</div></div></div>
<a href="setuflow-roadmap.html" style="display:inline-block;margin-top:8px;font-size:11.5px;color:#2563eb;font-weight:800">View full roadmap \u2192</a></div>
<div class="rail-block"><h4>Top Contributors</h4>
<div class="contrib-avatars">
<div class="contrib-av" style="--c1:#0d9488;--c2:#2563eb">R</div>
<div class="contrib-av" style="--c1:#7c3aed;--c2:#db2777">A</div>
<div class="contrib-av" style="--c1:#f97316;--c2:#f59e0b">M</div>
<div class="contrib-av" style="--c1:#059669;--c2:#0d9488">K</div>
</div>
<a href="#" style="font-size:11.5px;color:#2563eb;font-weight:800">View all contributors \u2192</a></div>` : '';
    document.getElementById('rightRail').innerHTML = ovRail + `<div class="rail-block"><h4>Topics</h4><div class="rail-list">${topics.map(t => `<button data-rail-topic="${t.id}" onclick="Docs.openTopic('${t.id}')">${t.title}</button>`).join('')}</div></div><div class="rail-block"><h4>Progress</h4><div class="progress-line"><span>Current path</span><b>${pct}%</b></div><div class="bar"><div class="fill" style="width:${pct}%"></div></div><p style="color:#64748b;font-size:12px;margin-top:4px">${id === 'overview' ? 'Start at Docs Overview' : 'Topic ' + (i + 1) + ' of ' + topics.length}</p><div class="next-card"><b>Next</b><p>${next.title}</p><button onclick="Docs.openTopic('${next.id}')">Open ${next.title} \u2192</button></div></div>${isInternal() ? `<div class="rail-block"><h4>Live Tracker</h4><div class="progress-line"><span>Open</span><b>${metrics.open}</b></div><div class="progress-line"><span>Resolved</span><b>${metrics.resolved}</b></div><a href="setuflow-issue-tracker.html" style="color:#2563eb;font-weight:900;font-size:12px;display:block;margin-top:6px">Open issue tracker \u2192</a></div><div class="rail-block"><h4>Roadmap</h4><div style="border-left:3px solid #14b8a6;padding-left:10px"><b style="font-size:12px">Sprint 19</b><p style="margin:4px 0 0;color:#64748b;font-size:11.5px">UX enhancement and documentation workspace cleanup.</p></div></div>` : ''}<div class="rail-block"><h4>Contributor</h4><div class="person"><div class="avatar">R</div><div><b>Ritesh Kapoor</b><p style="margin:2px 0 0;color:#64748b;font-size:12px">Product owner, architect, builder</p></div></div></div>`;
    markActive();
  }

  async function loadMetrics() {
    if (shared.active) return;
    try {
      const r = await fetch('/api/internal/docs-metrics', { credentials: 'include' });
      if (!r.ok) return;
      const d = await r.json();
      metrics = { ...metrics, ...d };
      const pill = document.getElementById('issuePill');
      if (pill) pill.textContent = metrics.open;
      render();
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
    // Remove fixed dimensions so SVG scales naturally
    clone.removeAttribute('width'); clone.removeAttribute('height');
    clone.style.cssText = 'display:block;max-width:90vw;max-height:80vh;width:auto;height:auto';
    const canvas = document.getElementById('diagCanvas');
    canvas.innerHTML = ''; canvas.appendChild(clone);
    document.getElementById('diagModalTitle').textContent = title;
    dv.scale = 1; dv.tx = 0; dv.ty = 0;
    _diagApply();
    document.getElementById('diagZoomPct').textContent = '100%';
    document.getElementById('diagModal').classList.add('dm-open');
    document.body.style.overflow = 'hidden';
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

    function render() { const id = idx(); renderNav(); if (id === 'overview') renderOverview(); renderTopic(); renderRail(); markActive(); }
  function goPrev() { let i = currentIndex(); openTopic(i === 0 ? 'overview' : topics[i - 1].id); }
  function goNext() { let i = currentIndex(); openTopic(i === topics.length - 1 ? 'overview' : topics[i + 1].id); }
  function toggleNav() { document.getElementById('leftNav').classList.toggle('open'); }
  function search(q) { q = String(q || '').toLowerCase(); document.querySelectorAll('.nav-link').forEach(b => { const t = byId(b.dataset.topic); b.style.display = !q || t.title.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q) ? 'flex' : 'none'; }); document.querySelectorAll('.topic-card').forEach(c => { c.style.display = !q || c.innerText.toLowerCase().includes(q) ? 'flex' : 'none'; }); }
  function openShare() { document.getElementById('shareModal').classList.remove('hidden'); }
  function closeShare() { document.getElementById('shareModal').classList.add('hidden'); }
  function generateShareLink() { const rec = document.getElementById('shareRecipient').value || 'External reviewer', hrs = Number(document.getElementById('shareDuration').value || 72), data = { recipient: rec, expiry: Date.now() + hrs * 3600000, issued: Date.now() }, tok = btoa(JSON.stringify(data)), url = location.origin + location.pathname + '?share_token=' + encodeURIComponent(tok); document.getElementById('shareOutput').value = url; document.getElementById('shareMeta').textContent = `For ${rec}. Expires ${new Date(data.expiry).toLocaleString()}. Issue tracker and roadmap are hidden.`; document.getElementById('shareResult').classList.remove('hidden'); }
  function copyShareLink() { navigator.clipboard?.writeText(document.getElementById('shareOutput').value); }
  function showFullDocument() { const w = window.open('', '_blank'); w.document.write('<html><head><title>SETU Flow Full Documentation</title><link rel="stylesheet" href="setuflow-docs-workspace.css"></head><body><main class="main" style="max-width:980px;margin:auto">' + topics.filter(t => t.id !== 'overview').map(t => `<section class="topic-view" style="margin:18px 0"><div class="topic-head" style="--accent:${t.accent}"><span class="tag">${t.tag}</span><h1>${t.title}</h1><p>${t.summary}</p></div><div class="topic-body">${getTopicContent(t.id)}</div></section>`).join('') + '</main></body></html>'); }

  window.addEventListener('hashchange', () => { render(); openHashSnapshot(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { document.getElementById('leftNav').classList.remove('open'); document.querySelectorAll('.modal,.lightbox').forEach(m => m.classList.add('hidden')); }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); document.getElementById('globalSearch')?.focus(); }
  });
  document.addEventListener('click', e => { if (innerWidth < 760 && !document.getElementById('leftNav').contains(e.target) && !e.target.closest('.mobile-only')) document.getElementById('leftNav').classList.remove('open'); });

  async function init() {
    await initAuth();
    if (window.mermaid) mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { primaryColor: '#dbeafe', primaryTextColor: '#1e3a8a', primaryBorderColor: '#2563eb', lineColor: '#64748b', secondaryColor: '#f0fdf4', tertiaryColor: '#faf5ff' } });
    render();
    await loadMetrics();
    await loadScreenshots();
  }

  init();
  return { openTopic, goPrev, goNext, toggleNav, search, openShare, closeShare, generateShareLink, copyShareLink, showFullDocument, openScreenshotModal, closeScreenshotModal, uploadScreenshot, openLightbox, closeLightbox, copySnapshotLink, switchGuideTab, openDiagramViewer, closeDiagramViewer, diagZoom, diagReset, downloadDiagram };
})();

