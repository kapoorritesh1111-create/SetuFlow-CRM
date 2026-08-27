(() => {
  'use strict';

  const CUSTOM_TOPICS = [
    {
      id: 'supplier-sourcing-2026', group: 'Supplier & Sourcing', icon: '⇆', title: 'Supplier Journey & Sourcing', tag: 'Sourcing', accent: '#0d9488',
      summary: 'Current supplier-first sourcing workflow from supplier capture through verification, compliance, RFQ, response review, approval, and order linkage.',
      keywords: 'supplier sourcing rfq cost request capability mapping compliance verification response review approval order supplier lead'
    },
    {
      id: 'packaging-overview-2026', group: 'Packaging Workspace', icon: '▦', title: 'Packaging Overview', tag: 'Packaging', accent: '#2563eb',
      summary: 'Packaging-specific operating model spanning conversational lead capture, products, KLD, server-authoritative pricing, quotes, design, dispatch, and Setu Guru intelligence.',
      keywords: 'packaging stark packmate pouch film flexible packaging lead intake kld design dispatch pricing quote'
    },
    {
      id: 'packaging-products-2026', group: 'Packaging Workspace', icon: '□', title: 'Packaging Products & KLD', tag: 'Packaging', accent: '#7c3aed',
      summary: 'Packaging Products is the source of truth for products, approved sizes, quote options, and KLD/artwork references.',
      keywords: 'packaging products kld artwork approved sizes center seal 3ss roll pouch quote options dimensions'
    },
    {
      id: 'packaging-pricing-2026', group: 'Packaging Workspace', icon: '₹', title: 'Packaging Pricing v4', tag: 'Pricing', accent: '#0d9488',
      summary: 'Server-authoritative packaging pricing with approved size matrices, quantity breaks, controlled charges, frozen quote snapshots, and protected cost/margin inputs.',
      keywords: 'pricing v4 sup center seal 96 3ss 48 q1 q2 q3 q4 q5 cost master charge master cogs wastage margin snapshot'
    },
    {
      id: 'packaging-operations-2026', group: 'Packaging Workspace', icon: '↗', title: 'Packaging Design & Operations', tag: 'Operations', accent: '#f97316',
      summary: 'Artwork/design queue, proof handoff, packaging history, dispatch board, and downstream operational control after commercial approval.',
      keywords: 'design artwork proof queue operations dispatch board packaging history approval production'
    },
    {
      id: 'packaging-intelligence-2026', group: 'Packaging Workspace', icon: '✦', title: 'Packaging Intelligence', tag: 'Setu Guru', accent: '#db2777',
      summary: 'Packaging-specific intelligence that assists qualification, product matching, pricing context, follow-up, and operator decisions without bypassing approvals.',
      keywords: 'setu guru packaging intelligence qualification pricing follow up recommendations assistant'
    },
    {
      id: 'growth-acquisition-2026', group: 'Growth & Acquisition', icon: '↑', title: 'Growth, Outreach & Acquisition', tag: 'Growth', accent: '#2563eb',
      summary: 'Growth Center, Growth Lead Manager, Mail Outreach, guided research, follow-up, and operator-approved action flows.',
      keywords: 'growth center lead manager mail outreach campaign research follow up reply acquisition guided discovery'
    },
    {
      id: 'seo-linkedin-2026', group: 'Growth & Acquisition', icon: '⌁', title: 'SEO & LinkedIn Distribution', tag: 'Growth', accent: '#7c3aed',
      summary: 'Search Console trends, baseline/rank progress, SEO bot controls, reviewable SEO pull requests, canonical/crawl/sitemap health, and LinkedIn publishing readiness.',
      keywords: 'seo search console rank baseline canonical crawl sitemap bot pull request linkedin daily publishing distribution'
    },
    {
      id: 'inbound-integrations-2026', group: 'Integrations & API', icon: '↔', title: 'Interakt & IndiaMART Inbound', tag: 'Inbound', accent: '#0d9488',
      summary: 'Organization-scoped inbound integrations for WhatsApp/Interakt and IndiaMART, including credentials, webhook/pull boundaries, staging, qualification, health, and lead conversion.',
      keywords: 'interakt whatsapp indiamart inbound webhook crm key pull v2 qualification staging integration health last sync api key'
    },
    {
      id: 'academy-2026', group: 'Academy & Operator Guides', icon: '◎', title: 'Core & Packaging Academy', tag: 'Academy', accent: '#f97316',
      summary: 'Current operator-learning layer with evidence-backed walkthroughs, screenshots, test records, and packaging-specific guided journeys.',
      keywords: 'academy core packaging operator guide walkthrough screenshot evidence test record user journey training'
    }
  ];

  const OLD_KEYWORDS = {
    architecture: 'nextjs app router node 22 vercel supabase postgres rls auth server actions integration architecture deployment topology ai email pdf',
    diagrams: 'flowchart mermaid architecture lead quote order catalog growth supplier trade show',
    workflows: 'commercial buyer lead follow up quote approval send order execution closeout',
    pipeline: 'kanban stage next step follow up forecast buyer supplier',
    documents: 'pdf storage versions quote order compliance templates bank terms export',
    compliance: 'evidence waive defer document requirement quote send gate',
    contracts: 'contract lifecycle commercial lock audit trail closeout',
    'trade-events': 'trade event business card scan capture analytics conversion attribution booth trial',
    products: 'catalog variants csv price list catalog sharing buyer share room pricing',
    'guru-ai': 'setu guru growth center research pricing intelligence lead actions rag learning',
    'api-integrations': 'api webhook adapter integrations whatsapp email finance freight',
    integrations: 'integration hub provider health status',
    'data-security': 'security rls organization roles permissions audit',
    'mission-control': 'smc issues qa incidents deployments feature flags client health seo growth',
    'client-management': 'entitlements modules org organization client onboarding plans seats usage feature flags',
    mobile: 'pwa offline capture business card scan vcard trade events mobile actions'
  };

  function content(id) {
    const map = {
      'supplier-sourcing-2026': `
        <div class="section-block"><h2>Supplier is a first-class sourcing workflow</h2><p>The buyer journey remains Capture → Lead → Quote → Order → Execution. Supplier records now follow their own governed sourcing path so supplier qualification does not get forced into buyer pipeline semantics.</p></div>
        <div class="swimlane">
          <div class="swimlane-row"><div class="swimlane-label"><small>Capture</small><b>Supplier Intake</b></div><div class="swimlane-steps"><div class="lane-step"><b>Supplier Capture</b><span>Company/contact/source</span></div><div class="lane-step"><b>Profile & Verification</b><span>Identity and operational readiness</span></div><div class="lane-step system"><b>Capability Mapping</b><span>Products, processes, markets, capacity</span></div></div></div>
          <div class="swimlane-row"><div class="swimlane-label"><small>Qualification</small><b>Evidence</b></div><div class="swimlane-steps"><div class="lane-step"><b>Compliance & Documents</b><span>Evidence, requirements, exceptions</span></div><div class="lane-step"><b>RFQ / Cost Request</b><span>Controlled sourcing request</span></div><div class="lane-step system"><b>Response Review</b><span>Commercial + capability comparison</span></div></div></div>
          <div class="swimlane-row"><div class="swimlane-label"><small>Decision</small><b>Approval</b></div><div class="swimlane-steps"><div class="lane-step"><b>Approve Supplier / Response</b><span>Human decision gate</span></div><div class="lane-step"><b>Link to Commercial Need</b><span>Quote/order/sourcing context</span></div><div class="lane-step system"><b>Audit Trail</b><span>Decision and evidence retained</span></div></div></div>
        </div>
        <div class="doc-alert doc-alert-amber"><strong>Do not merge buyer and supplier semantics:</strong> buyer pipeline and supplier sourcing may share identity/contact infrastructure, but their stages, gates, evidence, and next actions remain distinct.</div>`,

      'packaging-overview-2026': `
        <div class="section-block"><h2>Packaging workspace operating model</h2><p>Packaging is a vertical workspace layered on SETU Flow's core CRM. It adds packaging-specific lead intake, product/KLD controls, pricing authority, design/artwork handoff, dispatch operations, and packaging intelligence while preserving the core audit, approval, RLS, quote, and order boundaries.</p></div>
        <div class="pro-grid">
          <div class="pro-card"><b>Conversational Capture</b><p>Collect enough to move the opportunity forward without creating abandonment. Artwork availability is asked explicitly; dimensions are helpful but may remain unknown during first contact.</p></div>
          <div class="pro-card"><b>Commercial Authority</b><p>Pricing is calculated server-side from approved matrices and controlled components. The UI requests a preview; it does not become the pricing authority.</p></div>
          <div class="pro-card"><b>Execution Continuity</b><p>Accepted commercial context continues into design/artwork, packaging history, and dispatch rather than becoming a disconnected quote record.</p></div>
        </div>
        <div class="tbl-wrap"><table><thead><tr><th>Capability</th><th>Primary owner</th><th>Important rule</th></tr></thead><tbody>
          <tr><td>Lead qualification</td><td>Packaging capture / Sales Desk</td><td>Prefer a short conversation; do not block on dimensions the buyer does not know.</td></tr>
          <tr><td>Products / sizes / KLD</td><td>Packaging Products</td><td>Approved product and size definitions are reused by quote and pricing workflows.</td></tr>
          <tr><td>Materials / processes / finishes / charges</td><td>Pricing Components</td><td>Internal cost inputs remain protected from buyer-facing surfaces.</td></tr>
          <tr><td>Price computation</td><td>Pricing Builder + server services</td><td>Server-authoritative preview and persistence.</td></tr>
          <tr><td>Artwork / design</td><td>Design queue</td><td>Proof status and evidence stay attached to the commercial record.</td></tr>
          <tr><td>Dispatch</td><td>Dispatch board</td><td>Operational status follows approved commercial/design context.</td></tr>
        </tbody></table></div>`,

      'packaging-products-2026': `
        <div class="section-block"><h2>Packaging Products is the commercial product authority</h2><p>This workspace owns packaging products, approved sizes, quote options, and KLD/artwork references. Pricing Components owns the commercial inputs used to price those products; Pricing Builder consumes both.</p></div>
        <div class="doc-card-grid">
          <div class="doc-card border-blue"><div class="doc-card-title">Products & approved sizes</div><ul><li>Product families and sellable packaging definitions</li><li>Approved dimensional combinations</li><li>Quote-safe labels and options</li><li>Reusable references instead of free-text reconstruction</li></ul></div>
          <div class="doc-card border-teal"><div class="doc-card-title">KLD / artwork evidence</div><ul><li>KLD is retained with product/size context</li><li>Artwork availability is captured during qualification</li><li>Design handoff should reuse the selected commercial definition</li><li>Do not ask buyers to re-enter known packaging information later</li></ul></div>
          <div class="doc-card border-amber"><div class="doc-card-title">Separation of concerns</div><ul><li>Products defines what can be sold</li><li>Pricing Components defines how it can be costed</li><li>Pricing Builder calculates the commercial outcome</li><li>Quote versions freeze the evidence used at that point in time</li></ul></div>
        </div>`,

      'packaging-pricing-2026': `
        <div class="section-block"><h2>Packaging Pricing v4</h2><p>Pricing v4 establishes a controlled, server-authoritative pricing model for Stark/packaging workflows. Approved matrices and charge lines are treated as commercial configuration, not editable buyer-facing arithmetic.</p></div>
        <div class="tbl-wrap"><table><thead><tr><th>Template / Matrix</th><th>Current governed coverage</th><th>Notes</th></tr></thead><tbody>
          <tr><td><b>SUP</b></td><td>Formula pricing with 15 approved sizes</td><td>Uses controlled packaging inputs and quantity break logic.</td></tr>
          <tr><td><b>Center Seal</b></td><td>96-row approved matrix</td><td>Server-selected from approved combinations.</td></tr>
          <tr><td><b>3SS Roll Form</b></td><td>48-row approved matrix</td><td>Governed matrix, not free-form client calculation.</td></tr>
          <tr><td><b>3SS Pouch Form</b></td><td>48-row approved matrix</td><td>Governed matrix, not free-form client calculation.</td></tr>
          <tr><td><b>Quantity breaks</b></td><td>Q1–Q5</td><td>Break selection belongs to pricing authority.</td></tr>
        </tbody></table></div>
        <div class="doc-card-grid">
          <div class="doc-card border-blue"><div class="doc-card-title">Protected internal inputs</div><ul><li>Cost Master</li><li>Charge Master</li><li>COGS</li><li>Margin</li><li>Wastage</li><li>Internal charge construction</li></ul></div>
          <div class="doc-card border-teal"><div class="doc-card-title">Quote evidence</div><ul><li>Canonical charge lines</li><li>Pricing/KLD evidence retained with quote version</li><li>Frozen commercial snapshot supports reproduction</li><li>Historical quotes must not silently reprice after master data changes</li></ul></div>
          <div class="doc-card border-amber"><div class="doc-card-title">Authority rule</div><ul><li>Client chooses valid commercial inputs</li><li>Server validates and prices</li><li>UI displays preview</li><li>Approved/persisted quote version becomes historical record</li></ul></div>
        </div>`,

      'packaging-operations-2026': `
        <div class="section-block"><h2>Design, artwork and dispatch continuity</h2><p>Packaging execution begins before manufacturing: commercial selections, KLD, buyer artwork, proof status, and internal design work must remain connected so the sales team and operations team are working from the same approved context.</p></div>
        <div class="swimlane">
          <div class="swimlane-row"><div class="swimlane-label"><small>Commercial</small><b>Approved scope</b></div><div class="swimlane-steps"><div class="lane-step"><b>Quote / product selection</b><span>Product, size, pricing evidence</span></div><div class="lane-step"><b>Artwork status</b><span>Buyer has artwork / needs support</span></div></div></div>
          <div class="swimlane-row"><div class="swimlane-label"><small>Design</small><b>Proof control</b></div><div class="swimlane-steps"><div class="lane-step"><b>Design queue</b><span>Assigned work and current state</span></div><div class="lane-step"><b>Proof / revision</b><span>Evidence and approval history</span></div></div></div>
          <div class="swimlane-row"><div class="swimlane-label"><small>Operations</small><b>Dispatch</b></div><div class="swimlane-steps"><div class="lane-step"><b>Packaging history</b><span>Commercial + design continuity</span></div><div class="lane-step"><b>Dispatch board</b><span>Execution status and handoff</span></div></div></div>
        </div>`,

      'packaging-intelligence-2026': `
        <div class="section-block"><h2>Packaging intelligence with human control</h2><p>Setu Guru can use packaging context to help the operator qualify, research, price, draft follow-ups, and identify missing information. It must not become an autonomous pricing, approval, compliance, or external-send authority.</p></div>
        <div class="pro-grid"><div class="pro-card"><b>Context</b><p>Lead, product, packaging requirements, artwork state, pricing selections, and prior activity.</p></div><div class="pro-card"><b>Assist</b><p>Next questions, product matching, research, pricing context, follow-up drafts, exception visibility.</p></div><div class="pro-card"><b>Control</b><p>Operators approve the final commercial decision, quote, compliance decision, and buyer-facing communication.</p></div></div>`,

      'growth-acquisition-2026': `
        <div class="section-block"><h2>Growth Center is an operating workspace, not a generic chatbot</h2><p>Growth work is organized around revenue attention, supplier readiness, research, trade events, pricing intelligence, lead management, mail outreach, and guided external discovery. Suggested actions remain reviewable.</p></div>
        <div class="tbl-wrap"><table><thead><tr><th>Capability</th><th>Purpose</th><th>Control</th></tr></thead><tbody>
          <tr><td>Growth Lead Manager</td><td>Organize acquisition and growth leads</td><td>Organization-scoped</td></tr>
          <tr><td>Mail Outreach</td><td>Draft/manage first inquiry and follow-up outreach</td><td>Operator-reviewed communication</td></tr>
          <tr><td>Guided discovery</td><td>Research targets and opportunities</td><td>Confirmed execution before external action</td></tr>
          <tr><td>Growth Center</td><td>Surface attention and convert context into next action</td><td>Human approval remains the final gate</td></tr>
        </tbody></table></div>`,

      'seo-linkedin-2026': `
        <div class="section-block"><h2>SEO and distribution control plane</h2><p>SMC now contains a stronger SEO operating layer: Search Console trend context, baseline/rank progress, performance visuals, bot controls, and reviewable code changes. LinkedIn readiness is tracked alongside distribution work.</p></div>
        <div class="doc-card-grid"><div class="doc-card border-blue"><div class="doc-card-title">Measure</div><ul><li>Search Console trends</li><li>Baseline and rank progress</li><li>SEO performance visuals</li><li>Crawl/index coverage signals</li></ul></div><div class="doc-card border-teal"><div class="doc-card-title">Act safely</div><ul><li>SEO bot proposes code updates</li><li>Changes are reviewable through GitHub PRs</li><li>Canonical, crawl and sitemap corrections are verified before treating them as complete</li></ul></div><div class="doc-card border-amber"><div class="doc-card-title">Distribute</div><ul><li>LinkedIn daily publishing readiness</li><li>Content/distribution state visible to operators</li><li>Publishing remains governed rather than invisible background behavior</li></ul></div></div>`,

      'inbound-integrations-2026': `
        <div class="section-block"><h2>Organization-scoped inbound integration model</h2><p>Inbound providers are configured per client organization. Credentials, sync state, last event/sync, and conversion activity must never leak across workspaces.</p></div>
        <div class="tbl-wrap"><table><thead><tr><th>Provider</th><th>Mode</th><th>Current boundary</th><th>Lead path</th></tr></thead><tbody>
          <tr><td><b>Interakt</b></td><td>Webhook inbound</td><td>Signature verification → inbound staging → qualification/review</td><td>Sales Desk / workspace review → CRM lead conversion</td></tr>
          <tr><td><b>IndiaMART</b></td><td><code>pull_v2</code></td><td>Org-specific <code>crm_key</code>, health, last sync/event; sync remains off until explicitly enabled</td><td>Provider payload → governed integration service → CRM lead</td></tr>
          <tr><td><b>Setu Flow API keys</b></td><td>Scoped access</td><td>Generated keys stored as SHA-256 hashes and revocable</td><td>Scope determines allowed integration behavior</td></tr>
        </tbody></table></div>
        <div class="doc-alert doc-alert-amber"><strong>Credential rule:</strong> integration credentials belong to the organization that purchased/configured the integration. Admin visibility does not make credentials global.</div>`,

      'academy-2026': `
        <div class="section-block"><h2>Academy is the maintained operator-learning layer</h2><p>Core Academy and Packaging Academy connect product behavior to evidence: walkthroughs, screenshots, expected UI state, expected writes, and test records. It should evolve with the product rather than become a static training deck.</p></div>
        <div class="pro-grid"><div class="pro-card"><b>Core Academy</b><p>Commercial CRM, pipeline, quote/order, trade events, mobile, and governed operating behaviors.</p></div><div class="pro-card"><b>Packaging Academy</b><p>Packaging lead intake, products/KLD, pricing, quote, design/artwork, operations, and intelligence.</p></div><div class="pro-card"><b>Evidence</b><p>Guides should include current screenshots, user-journey evidence, test records, and known do-not-break rules.</p></div></div>`
    };
    return map[id] || '';
  }

  const ARCHITECTURE_UPDATE = `
    <div id="currentArchitecture2026" class="premium-current-block">
      <div class="section-block"><h2>Current Architecture — August 2026</h2><p>This current-state layer sits above the original architectural documentation below. The older detail is intentionally retained for historical context and implementation depth.</p></div>
      <div class="mermaid-wrap"><div class="diagram-title">SETU Flow — Current Platform Architecture</div><pre class="mermaid">
flowchart TD
  U["Operators / Sales / Admin / Mobile"] --> NX["Next.js 14.2 App Router on Vercel\nNode 22 runtime"]
  NX --> UI["Core CRM Workspaces\nDashboard · Leads · Pipeline · Quotes · Orders · Catalog"]
  NX --> PKG["Packaging Workspace\nCapture · Products/KLD · Pricing v4 · Design · Dispatch"]
  NX --> GR["Growth & Acquisition\nGrowth Center · Outreach · SEO · LinkedIn"]
  NX --> AC["Academy / Operator Guides"]
  UI --> SA["Server Actions + API Routes\nvalidation · gates · audit"]
  PKG --> SA
  GR --> SA
  AC --> SA
  SA --> SB["Supabase\nPostgres · Auth · Storage · RLS"]
  SA --> DOC["Document Engine\nPuppeteer/Chromium + native PDF paths"]
  SA --> GURU["Setu Guru\ncontext · research · RAG/intelligence · reviewed actions"]
  SA --> IN["Inbound Integrations\nInterakt webhook · IndiaMART pull_v2 · scoped API keys"]
  SA --> OUT["Outbound / Adapters\nEmail · WhatsApp · external providers"]
  SB --> AUD["Org-scoped audit + historical evidence"]
  GURU --> HUMAN{"Human approval required?"}
  HUMAN -->|Yes| UI
  HUMAN -->|No autonomous bypass| UI
      </pre></div>
      <div class="tbl-wrap"><table><thead><tr><th>Architecture concern</th><th>Current rule</th></tr></thead><tbody>
        <tr><td>Runtime</td><td>Next.js <b>14.2.x</b>, React 18, TypeScript; Vercel deployment; Node <b>22.x</b>.</td></tr>
        <tr><td>Data boundary</td><td>Supabase Postgres/Auth/Storage with organization-scoped RLS. Server validation does not replace RLS.</td></tr>
        <tr><td>Commercial mutations</td><td>Governed server actions/API services own sensitive writes, pricing authority, workflow gates, and audit evidence.</td></tr>
        <tr><td>Packaging</td><td>Vertical capability reuses core CRM identity/quote/order controls but adds its own product, pricing, design and execution semantics.</td></tr>
        <tr><td>Integrations</td><td>Interakt and IndiaMART are organization-specific. Provider secrets and sync state are never global workspace configuration.</td></tr>
        <tr><td>AI</td><td>Setu Guru can assist, research, draft, and recommend. It cannot bypass approval, compliance, pricing authority, or external-send controls.</td></tr>
        <tr><td>Observability / internal ops</td><td>SMC provides issues, QA, incidents/deployments, client health, SEO/growth controls and operational visibility.</td></tr>
      </tbody></table></div>
    </div>`;

  const DIAGRAM_UPDATE = `
    <div id="currentFlowcharts2026" class="premium-current-block">
      <div class="section-block"><h2>Current 2026 Workflow Additions</h2><p>These diagrams extend the original commercial flowcharts below. Existing buyer, quote, order, catalog, Growth Center, supplier and trade-show diagrams remain preserved.</p></div>
      <h3 style="margin:18px 0 6px">Packaging — Inquiry to Dispatch</h3>
      <div class="mermaid-wrap"><div class="diagram-title">Packaging Commercial + Execution Flow</div><pre class="mermaid">
flowchart LR
  A([Inquiry / Interakt / Trade Event / Manual]) --> B[Conversational Qualification]
  B --> C{Artwork available?}
  C -->|Yes| D[Attach / retain artwork context]
  C -->|No| E[Mark design support needed]
  D --> F[Packaging Product + Approved Size]
  E --> F
  F --> G[Pricing Builder]
  G --> H[Server-authoritative Pricing v4 Preview]
  H --> I{Operator accepts commercial result?}
  I -->|Revise| G
  I -->|Yes| J[Freeze Quote Version + Pricing/KLD Evidence]
  J --> K[Approval + Buyer Send]
  K --> L{Accepted?}
  L -->|No| G
  L -->|Yes| M[Design / Proof Queue]
  M --> N[Packaging History]
  N --> O[Dispatch Board]
  O --> P([Execution / Closeout])
      </pre></div>
      <h3 style="margin:18px 0 6px">Interakt — WhatsApp to CRM Lead</h3>
      <div class="mermaid-wrap"><div class="diagram-title">Interakt Inbound Flow</div><pre class="mermaid">
flowchart LR
  A([WhatsApp message]) --> B[Interakt webhook]
  B --> C{Signature valid?}
  C -->|No| X([Reject / audit])
  C -->|Yes| D[Inbound staging]
  D --> E[Qualification / Sales Desk review]
  E --> F[Compose / suggested response]
  F --> G{Operator action}
  G -->|Continue conversation| E
  G -->|Qualified| H[Convert to CRM lead]
  H --> I[Pipeline / follow-up / quote]
      </pre></div>
      <h3 style="margin:18px 0 6px">IndiaMART — Org-scoped Pull to Lead</h3>
      <div class="mermaid-wrap"><div class="diagram-title">IndiaMART Integration Flow</div><pre class="mermaid">
flowchart LR
  A[Org Integration Settings] --> B[Store org-specific crm_key]
  B --> C{Sync explicitly enabled?}
  C -->|No| D([Configured / idle])
  C -->|Yes| E[pull_v2]
  E --> F[Normalize provider payload]
  F --> G[Integration health + last sync/event]
  F --> H[Lead staging / conversion]
  H --> I([CRM Lead with source attribution])
      </pre></div>
      <h3 style="margin:18px 0 6px">SEO — Evidence to Reviewed Deployment</h3>
      <div class="mermaid-wrap"><div class="diagram-title">SEO Command Flow</div><pre class="mermaid">
flowchart LR
  A[Search Console / crawl / rank evidence] --> B[SMC SEO analysis]
  B --> C[SEO bot proposal]
  C --> D[GitHub pull request]
  D --> E{Review / checks green?}
  E -->|No| C
  E -->|Yes| F[Merge to main]
  F --> G[Vercel deploy]
  G --> H[Measure indexing / rank / crawl result]
  H --> A
      </pre></div>
    </div>`;

  function customById(id) { return CUSTOM_TOPICS.find(t => t.id === id); }

  function injectNav() {
    const nav = document.getElementById('topicNav');
    if (!nav || nav.querySelector('[data-premium-current="1"]')) return;
    const groups = [];
    CUSTOM_TOPICS.forEach(t => { if (!groups.includes(t.group)) groups.push(t.group); });
    groups.forEach((group, index) => {
      const items = CUSTOM_TOPICS.filter(t => t.group === group);
      const wrap = document.createElement('div');
      wrap.dataset.premiumCurrent = '1';
      wrap.innerHTML = `<button class="nav-group-btn" aria-expanded="true" data-current-group="${group}"><span>${group}</span><span class="nav-group-chevron">›</span></button><div class="nav-group-items" id="pcg${index}">${items.map(t => `<button class="nav-link premium-current-link" data-topic="${t.id}" data-search="${escapeAttr(`${t.title} ${t.summary} ${t.keywords}`)}"><span class="dot">${t.icon}</span>${t.title}</button>`).join('')}</div>`;
      nav.appendChild(wrap);
      wrap.querySelector('.nav-group-btn').addEventListener('click', () => {
        const list = wrap.querySelector('.nav-group-items');
        const collapsed = list.classList.toggle('nav-collapsed');
        wrap.querySelector('.nav-group-btn').setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      });
      wrap.querySelectorAll('.premium-current-link').forEach(button => button.addEventListener('click', () => openCustom(button.dataset.topic)));
    });
  }

  function escapeAttr(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function openCustom(id) {
    if (!customById(id)) return;
    if (location.hash !== `#${id}`) history.pushState(null, '', `#${id}`);
    renderCustom(id);
  }

  function renderCustom(id) {
    const t = customById(id);
    if (!t) return false;
    injectNav();
    const overview = document.getElementById('overviewView');
    const view = document.getElementById('topicView');
    if (!view) return false;
    if (overview) overview.classList.add('hidden');
    view.classList.remove('hidden');
    view.innerHTML = `<div class="topic-head" style="--accent:${t.accent}"><span class="tag">${t.tag}</span><h1>${t.title}</h1><p>${t.summary}</p></div><div class="topic-body">${content(id)}<div class="topic-footer"><div class="topic-stepper"><button onclick="location.hash='#overview'">← Overview</button><span>Current platform documentation</span><button onclick="location.hash='#diagrams'">Flow diagrams →</button></div></div></div>`;
    const crumb = document.getElementById('crumbCurrent'); if (crumb) crumb.textContent = t.title;
    document.querySelectorAll('.nav-link').forEach(b => b.classList.toggle('active', b.dataset.topic === id));
    const progress = document.getElementById('mobileProgress'); if (progress) progress.textContent = 'Current';
    const rail = document.getElementById('rightRail');
    if (rail) rail.innerHTML = `<div class="rail-card"><div class="rail-kicker">CURRENT PLATFORM</div><h3>${t.title}</h3><p>${t.summary}</p></div><div class="rail-card"><div class="rail-kicker">PRESERVED</div><p>Original premium documentation remains intact. This page layers current capability into the established hub.</p></div>`;
    return true;
  }

  function prependCurrentSections() {
    const hash = (location.hash || '#overview').replace('#', '').split('=')[0];
    const body = document.querySelector('#topicView .topic-body');
    if (!body) return;
    if (hash === 'architecture' && !document.getElementById('currentArchitecture2026')) body.insertAdjacentHTML('afterbegin', ARCHITECTURE_UPDATE);
    if (hash === 'diagrams' && !document.getElementById('currentFlowcharts2026')) body.insertAdjacentHTML('afterbegin', DIAGRAM_UPDATE);
  }

  function runMermaid() {
    if (!window.mermaid) return;
    const nodes = Array.from(document.querySelectorAll('pre.mermaid')).filter(n => !n.dataset.processed);
    if (!nodes.length) return;
    setTimeout(() => { try { window.mermaid.run({ nodes }); } catch (e) { console.warn('Premium docs diagram render failed', e); } }, 120);
  }

  function markDeepSearch(query) {
    const q = String(query || '').trim().toLowerCase();
    injectNav();
    document.querySelectorAll('.premium-current-link').forEach(button => {
      const hit = !q || (button.dataset.search || button.textContent || '').toLowerCase().includes(q);
      button.style.display = hit ? 'flex' : 'none';
      const group = button.closest('[data-premium-current="1"]');
      if (hit && group) group.querySelector('.nav-group-items')?.classList.remove('nav-collapsed');
    });
    Object.entries(OLD_KEYWORDS).forEach(([id, keywords]) => {
      const button = document.querySelector(`.nav-link[data-topic="${id}"]`);
      if (!button || !q) return;
      if (`${button.textContent} ${keywords}`.toLowerCase().includes(q)) button.style.display = 'flex';
    });
    const currentText = document.querySelector('#topicView:not(.hidden) .topic-body')?.innerText?.toLowerCase() || '';
    document.body.dataset.deepSearchHit = q && currentText.includes(q) ? '1' : '0';
  }

  function enhanceSearch() {
    const inputs = Array.from(document.querySelectorAll('#globalSearch, .nav-search input, .hero-search input'));
    inputs.forEach(input => {
      if (input.dataset.premiumSearch === '1') return;
      input.dataset.premiumSearch = '1';
      input.addEventListener('input', event => markDeepSearch(event.target.value));
    });
    if (window.Docs && typeof window.Docs.search === 'function' && !window.Docs.__premiumSearchWrapped) {
      const original = window.Docs.search.bind(window.Docs);
      window.Docs.search = q => { original(q); setTimeout(() => markDeepSearch(q), 0); };
      window.Docs.__premiumSearchWrapped = true;
    }
  }

  function refresh() {
    injectNav();
    enhanceSearch();
    const id = (location.hash || '#overview').replace('#', '').split('=')[0];
    if (customById(id)) { renderCustom(id); return; }
    setTimeout(() => { injectNav(); prependCurrentSections(); runMermaid(); }, 40);
  }

  window.addEventListener('hashchange', () => setTimeout(refresh, 0));
  window.addEventListener('popstate', () => setTimeout(refresh, 0));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(refresh, 120));
  else setTimeout(refresh, 120);
})();
