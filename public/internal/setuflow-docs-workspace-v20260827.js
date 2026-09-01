const Docs = (() => {
  const topics = [
    { id: 'overview', group: 'Get Started', title: 'Product Overview', icon: '⌂', tag: 'Start Here', summary: 'Current SETU Flow platform orientation: CRM, sourcing, packaging, trade events, growth, AI, integrations, academy, and internal operations.' },
    { id: 'architecture', group: 'Platform Architecture', title: 'Architecture', icon: '⬡', tag: 'System', summary: 'Next.js application architecture, Supabase tenant boundary, capability model, integrations, background jobs, and deployment.' },
    { id: 'modules', group: 'Platform Architecture', title: 'Module Reference', icon: '▦', tag: 'System', summary: 'Current product modules, major routes, vertical capability ownership, and operator responsibilities.' },
    { id: 'data-security', group: 'Platform Architecture', title: 'Data & Security', icon: '◈', tag: 'Security', summary: 'Organization scoping, RLS, role boundaries, entitlement-aware navigation, credentials, service-role operations, and pricing security.' },

    { id: 'workflows', group: 'CRM Workflows', title: 'Commercial Workflows', icon: '⇄', tag: 'Workflows', summary: 'Buyer, supplier, inbound, quote, approval, order, and closeout workflows.' },
    { id: 'pipeline', group: 'CRM Workflows', title: 'Pipeline & Follow-up', icon: '◫', tag: 'Pipeline', summary: 'Configurable stages, next steps, contact state, reminders, suggested follow-up, and buyer/supplier progression.' },
    { id: 'quotes-orders', group: 'CRM Workflows', title: 'Quotes & Orders', icon: '▤', tag: 'Commercial', summary: 'Quote creation, approval/send gates, immutable versions, order conversion, execution, job tickets, and closeout.' },
    { id: 'documents', group: 'CRM Workflows', title: 'Documents & Compliance', icon: '▧', tag: 'Documents', summary: 'Generated documents, storage, evidence, compliance gates, quote artifacts, and packaging KLD/document relationships.' },
    { id: 'supplier-sourcing', group: 'Supplier & Sourcing', title: 'Supplier Journey & RFQs', icon: '◇', tag: 'Sourcing', summary: 'Supplier capture, verification, capability mapping, compliance, RFQs, response review, comparison, and approval.' },

    { id: 'packaging-overview', group: 'Packaging Workspace', title: 'Packaging Overview', icon: '▣', tag: 'Vertical', summary: 'How the Packaging vertical changes capture, products, pricing, quote, design, dispatch, analytics, and Setu Guru behavior.' },
    { id: 'packaging-capture', group: 'Packaging Workspace', title: 'Packaging Lead Capture', icon: '✎', tag: 'Capture', summary: 'Packaging-specific discovery fields across manual capture, trade events, and conversational intake.' },
    { id: 'packaging-products', group: 'Packaging Workspace', title: 'Packaging Products & KLD', icon: '▦', tag: 'Products', summary: 'Families, approved sizes, variations, quote options, artwork/KLD ownership, and packaging reference data.' },
    { id: 'packaging-pricing', group: 'Packaging Workspace', title: 'Packaging Pricing v4', icon: '₹', tag: 'Pricing', summary: 'Server-authoritative packaging pricing, recipe inputs, pricing components, matrices, commercial bands, charges, and snapshots.' },
    { id: 'packaging-quote', group: 'Packaging Workspace', title: 'Packaging Quote Workflow', icon: '▤', tag: 'Quote', summary: 'Guided configuration, authoritative preview, charges, KLD selection, quote persistence, versions, and customer output.' },
    { id: 'packaging-operations', group: 'Packaging Workspace', title: 'Design & Operations', icon: '⚙', tag: 'Execution', summary: 'Design Queue, job tickets, dispatch board, packaging history, artwork handoff, and operations flow.' },
    { id: 'packaging-intelligence', group: 'Packaging Workspace', title: 'Packaging Intelligence', icon: '✦', tag: 'AI', summary: 'Setu Guru packaging assistance, discovery, compliance research, evidence scoring, FAQ knowledge, and learning loop.' },
    { id: 'packaging-admin', group: 'Packaging Workspace', title: 'Packaging Admin & Security', icon: '⚿', tag: 'Admin', summary: 'Packaging Products, Pricing Components, Pricing Builder, protected cost/rate data, feature flags, testing, and rollback.' },

    { id: 'trade-events', group: 'Trade Events', title: 'Trade Events', icon: '★', tag: 'Events', summary: 'Event setup, scan/quick capture, offline capture, packaging fields, attribution, analytics, and post-show follow-up.' },
    { id: 'trade-show-trial', group: 'Trade Events', title: 'Trade Show Trial', icon: '⚡', tag: 'Acquisition', summary: 'Public trial provisioning, booth capture, limits, ROI, and conversion into internal/client follow-up.' },

    { id: 'growth', group: 'Growth & Acquisition', title: 'Growth Center', icon: '↗', tag: 'Growth', summary: 'ICP discovery, opportunities, lead enrichment, Growth Lead Manager, work queue, and conversion into CRM.' },
    { id: 'mail-outreach', group: 'Growth & Acquisition', title: 'Mail Outreach', icon: '✉', tag: 'Outreach', summary: 'First inquiry, follow-up, personalized bulk outreach, authenticated-user signatures, activity state, and delivery workflow.' },
    { id: 'seo-growth', group: 'Growth & Acquisition', title: 'SEO Command Center', icon: '⌕', tag: 'SEO', summary: 'Search Console telemetry, ranking progress, target-page audits, SEO bot review, PR generation, and controlled publishing to main.' },
    { id: 'linkedin-growth', group: 'Growth & Acquisition', title: 'LinkedIn Distribution', icon: 'in', tag: 'Distribution', summary: 'Scheduled LinkedIn distribution readiness and growth publishing boundaries.' },

    { id: 'guru-ai', group: 'Setu Guru AI', title: 'Setu Guru Core', icon: '✦', tag: 'AI Assistant', summary: 'Context-aware assistance, live organization search, research, safe actions, pricing intelligence, and operator-approved writes.' },
    { id: 'guru-learning', group: 'Setu Guru AI', title: 'Learning & Knowledge', icon: '◎', tag: 'Knowledge', summary: 'Knowledge manifests, source-backed research, feedback, organization learning loop, and vertical knowledge packs.' },

    { id: 'products', group: 'Operations', title: 'Products & Catalog', icon: '▱', tag: 'Catalog', summary: 'Core product catalog, categories, variants, price lists, brochure sharing, secure buyer rooms, and quote conversion.' },
    { id: 'tasks', group: 'Operations', title: 'Tasks', icon: '✓', tag: 'Tasks', summary: 'Task list/calendar, entity linking, assignment, due-date grouping, and mobile completion.' },
    { id: 'reports', group: 'Operations', title: 'Reports & Analytics', icon: '▦', tag: 'Reports', summary: 'Commercial analytics plus packaging, Growth, SEO, market, product, order, and engagement reporting.' },
    { id: 'notifications', group: 'Operations', title: 'Notifications', icon: '◉', tag: 'Alerts', summary: 'In-app and configured notification channels, workspace preferences, user overrides, and operational alerts.' },
    { id: 'profile', group: 'Operations', title: 'Profile & My Card', icon: '○', tag: 'Profile', summary: 'User profile, vCard identity, share slug, Smart/Offline QR, and public contact exchange.' },
    { id: 'team-chat', group: 'Operations', title: 'Team Chat & Discussions', icon: '✉', tag: 'Collaboration', summary: 'Channels, DMs, entity-linked discussions, reactions, presence, read state, and system messages.' },
    { id: 'mobile', group: 'Operations', title: 'Mobile Workspace', icon: '▯', tag: 'Mobile', summary: 'Business card scan, contact exchange, trade-show/offline capture, pipeline, quote, and operational mobile workflows.' },

    { id: 'integrations', group: 'Integrations & API', title: 'Integration Hub', icon: '⬡', tag: 'Integrations', summary: 'Organization-specific integrations, connection health, last sync/event, credentials, and operator controls.' },
    { id: 'interakt', group: 'Integrations & API', title: 'Interakt / WhatsApp Inbound', icon: '◌', tag: 'Inbound', summary: 'Webhook intake, signature verification, qualification, Sales Desk, conversational review, and CRM conversion.' },
    { id: 'indiamart', group: 'Integrations & API', title: 'IndiaMART', icon: '↧', tag: 'Inbound', summary: 'Organization-scoped IndiaMART CRM key, pull-v2 configuration, readiness, health, and inbound-lead boundary.' },
    { id: 'api-integrations', group: 'Integrations & API', title: 'API Keys & Webhooks', icon: '</>', tag: 'API', summary: 'Scoped Setu Flow API keys, hashing, revocation, webhook boundaries, provider secrets, and service-role operations.' },

    { id: 'client-management', group: 'Administration', title: 'Client Management & Entitlements', icon: '◈', tag: 'Admin', summary: 'Organization provisioning, plans, modules, verticals, seats, usage, feature flags, shell visibility, and client health.' },
    { id: 'mission-control', group: 'SETU Internal', title: 'Mission Control', icon: '⌖', tag: 'Internal Ops', summary: 'SMC overview, delivery, clients, Growth, intelligence, config, issues, QA, deployments, SEO, leads, revenue, and internal operations.' },

    { id: 'academy', group: 'Academy & Operator Guides', title: 'Core Academy', icon: '◫', tag: 'Training', summary: 'Public/guided Core Academy, workflow evidence, test mode, progress, and issue logging.' },
    { id: 'packaging-academy', group: 'Academy & Operator Guides', title: 'Packaging Academy', icon: '▣', tag: 'Training', summary: 'Packaging-specific guided learning, workflow screenshots, evidence mapping, testing, and hostname isolation.' },
    { id: 'operator-guides', group: 'Academy & Operator Guides', title: 'Operator Guides', icon: '☷', tag: 'Guides', summary: 'Click-by-click operational guides with expected UI state, data writes, evidence, and do-not-break rules.' },

    { id: 'quick-reference', group: 'Reference', title: 'Quick Reference', icon: '☰', tag: 'Reference', summary: 'Current rules, gates, route families, security boundaries, and tester checks.' },
    { id: 'api-reference', group: 'Reference', title: 'API Reference', icon: '</>', tag: 'API', summary: 'Reference by API family. Counts must be generated from main rather than maintained as hard-coded July-era numbers.' },
    { id: 'live-ui', group: 'Reference', title: 'Live UI Snapshots', icon: '▣', tag: 'Screenshots', summary: 'Current screenshot library for Core CRM, Packaging, Growth, integrations, Academy, and internal operations.' },
    { id: 'roadmap', group: 'Reference', title: 'Roadmap', icon: '↗', tag: 'Product', summary: 'Product horizons and release state. Status should be sourced from the live roadmap rather than manually maintained constants.' },
    { id: 'glossary', group: 'Reference', title: 'Glossary', icon: '◎', tag: 'Glossary', summary: 'Current CRM, sourcing, packaging, Growth, Academy, integration, and AI terminology.' },
  ];

  const content = {
    overview: `<div class="doc-alert doc-alert-teal"><strong>Documentation baseline refreshed 27 Aug 2026.</strong> The hub now reflects SETU Flow as a multi-workspace trade operating platform, not only a CRM.</div>
      <div class="section-block"><h2>What SETU Flow is now</h2><p>SETU Flow connects commercial CRM execution with supplier sourcing, packaging-specific pricing and operations, trade-show capture, Growth acquisition, Setu Guru AI, organization-specific integrations, training, and SETU Mission Control.</p></div>
      ${cards([
        ['Core CRM','Capture → follow-up → quote → approval/send → order execution → closeout.'],
        ['Supplier & Sourcing','Supplier verification, capability mapping, RFQs, response review, comparison, and approval.'],
        ['Packaging Workspace','Packaging discovery, products/KLDs, server pricing, quote versioning, design queue, dispatch, analytics, and vertical AI.'],
        ['Trade Events','Event setup, fast capture, offline support, attribution, analytics, and follow-up.'],
        ['Growth & Acquisition','ICP/opportunity discovery, Growth Lead Manager, Mail Outreach, SEO Command Center, and distribution.'],
        ['Setu Guru AI','Contextual operator assistance with research, knowledge, safe actions, and vertical intelligence.'],
        ['Integrations','Org-specific provider credentials, health, webhooks, IndiaMART, Interakt, and scoped API keys.'],
        ['Academy & SMC','Core/Packaging Academy plus internal delivery, client, Growth, intelligence, and configuration operations.']
      ])}`,

    architecture: `${section('Current architecture','Next.js App Router provides the application shell and server-rendered workspaces. Supabase Postgres remains the organization-scoped system of record with RLS as the final tenant boundary. Capabilities are layered through module grants, verticals, feature flags, server actions, provider adapters, and service-role-only operations where required.')}
      ${cards([['Application','Next.js App Router, route-aware server components, controlled client interactivity.'],['Tenant boundary','organization_id filtering + Supabase RLS + membership/role checks.'],['Capability boundary','Plans, org module grants, vertical capability, feature flags, and entitlement-aware shell visibility.'],['Integration boundary','Provider-specific credential storage, webhook verification, integration events, health state, and auditable adapters.'],['AI boundary','Read-rich context, source-backed research, preview-first actions, explicit operator approval for writes.'],['Deployment','GitHub main → CI/build gates → Vercel production with Supabase migrations applied through managed migration history.']])}`,

    modules: `${section('Major module families','The platform has expanded beyond the July-era route inventory. This reference is organized by product ownership rather than hard-coded route totals.')}
      ${table(['Module family','Examples','Primary owner'],[
        ['CRM','Leads, pipeline, quotes, approval/send, orders, documents','Commercial execution'],
        ['Supplier & Sourcing','Supplier command center, RFQs, response comparison','Sourcing'],
        ['Packaging','Products, pricing v4, design queue, dispatch board, packaging analytics','Packaging vertical'],
        ['Trade Events','Events, capture, offline capture, attribution, trial','Field acquisition'],
        ['Growth','Growth Center, Lead Manager, Mail Outreach, SEO','Acquisition'],
        ['Setu Guru','Core assistant, research, knowledge, packaging intelligence','AI copilot'],
        ['Integrations','Interakt, IndiaMART, API keys, provider health','Connectivity'],
        ['Academy','Core Academy, Packaging Academy, evidence/test mode','Training'],
        ['SMC','Delivery, clients, Growth, intelligence, config','SETU internal operations']
      ])}`,

    'data-security': `${section('Security model','Security is now both tenant-scoped and capability-scoped. UI visibility is not the security boundary; server authorization and RLS remain authoritative.')}
      ${bullets(['Every tenant-owned record is organization-scoped.','Module entitlements now influence the application shell and route availability.','Integration credentials are stored separately from visible integration metadata.','Generated Setu Flow API keys store only a SHA-256 hash after one-time display.','Packaging pricing v4 protects Cost Master, Charge Master, margins/wastage, matrix internals, and full pricing snapshots from Sales users.','Pricing persistence and other sensitive operations use server/service-role boundaries rather than trusting browser-submitted commercial values.','Historical quote versions retain frozen evidence so later admin rate or KLD changes do not rewrite prior commercial truth.'])}`,

    workflows: `${section('Commercial operating spine','Core CRM still follows Capture → Follow-up → Quote → Approval & Send → Order Execution → Closeout, but there are now parallel entry and sourcing paths.')}
      ${table(['Path','Flow'],[
        ['Buyer','Capture → qualification → follow-up → quote → approval/send → accepted → order'],
        ['Inbound','Provider webhook/pull → staging/review → qualification/conversation → CRM lead → pipeline'],
        ['Supplier','Capture → verification → capability → compliance/docs → RFQ → response review → approval'],
        ['Packaging','Packaging capture → product/size/KLD configuration → server price → quote version → design/production/dispatch'],
        ['Trade event','Event capture → attributed lead → follow-up queue → quote/order'],
        ['Growth','Discovery/enrichment → Growth Lead Manager → outreach → qualified CRM opportunity']
      ])}`,

    pipeline: `${section('Pipeline today','Pipeline stages and next steps are organization-configurable. Buyer and supplier work remain distinct, while packaging organizations can layer vertical-specific follow-up and discovery expectations on top of the commercial pipeline.')}
      ${bullets(['Stage and next-step administration must expose explicit add/save/cancel/delete actions.','Contact/follow-up state is surfaced in Growth/lead management to distinguish first inquiry from follow-up.','Suggested follow-up messaging can accompany configured next steps such as scheduling an in-person meeting.','Pipeline behavior must continue to honor organization module entitlements and role boundaries.'])}`,

    'quotes-orders': `${section('Quote and order lifecycle','Quotes are versioned commercial records with approval/send gates. Accepted commercial truth flows into order execution rather than being rebuilt from mutable current catalog data.')}
      ${bullets(['Quote versions freeze commercial line state and evidence.','Packaging v4 persists separate canonical charge lines and pricing evidence.','Approval and compliance gates remain authoritative before customer send.','Orders support operational documents, actual lines, packing/freight execution, processing, and closeout.','Packaging quotes can produce job-ticket/production artifacts and maintain KLD evidence with the quote version.'])}`,

    documents: `${section('Documents & compliance','Document generation and compliance now intersect with supplier sourcing and Packaging in addition to the original quote/order flow.')}
      ${bullets(['Customer-facing quote/order documents remain version-bound.','Evidence upload, waive/defer actions, and compliance requirements can block send.','Packaging KLD/artwork is operational evidence and must remain linked to the selected product/variation and historical quote version.','Admin-only pricing snapshots are not customer documents and must never leak cost internals.'])}`,

    'supplier-sourcing': `${section('Supplier-first workflow','Supplier is a first-class sourcing workflow, separate from the buyer lead → quote → order path.')}
      ${table(['Stage','Purpose'],[['Supplier Capture','Create supplier identity and source attribution.'],['Profile & Verification','Validate organization/contact and commercial legitimacy.'],['Capability Mapping','Map products, manufacturing/service capability, markets and constraints.'],['Compliance & Documents','Collect required evidence and readiness state.'],['RFQ / Cost Request','Create structured sourcing request and line items.'],['Response Review','Capture and normalize supplier responses.'],['Comparison & Approval','Compare options and select/approve sourcing direction.']])}`,

    'packaging-overview': `${section('Packaging Workspace','Packaging is now a dedicated vertical operating layer rather than a collection of custom fields. It changes capture, product modeling, pricing, quote evidence, design/operations, analytics, training, and Setu Guru behavior.')}
      ${cards([['Capture','Fast discovery with artwork, application, material/structure, dimensions when known, quantity and urgency.'],['Products','Packaging families, approved sizes, variations, quote options and KLD ownership.'],['Pricing','Server-authoritative v4 pricing with recipes, matrices, bands, centralized charges and protected internals.'],['Quote','Guided configuration, authoritative preview, frozen evidence and versioned KLD/charges.'],['Operations','Design Queue, job ticket, packaging history and Dispatch Board.'],['Intelligence','Packaging-specific Guru assistance, research, evidence and organization learning.']])}`,

    'packaging-capture': `${section('Packaging discovery without questionnaire fatigue','Capture is intentionally progressive. Ask only what advances the sale; do not force a customer to know technical dimensions before Sales can engage.')}
      ${table(['Field','Approach'],[['What packaging do you need?','Required commercial intent.'],['Do you have artwork?','High-value early question; allow upload/share later.'],['Application / product packed','Helps material and structure guidance.'],['Approx. quantity','Needed for commercial band/pricing direction.'],['Dimensions','Ask when known; allow unknown / help me determine.'],['Material / structure','Optional if customer knows; otherwise guided.'],['Timeline / urgency','Use only when it materially changes follow-up.'],['Source / event / WhatsApp','Captured automatically wherever possible.']])}`,

    'packaging-products': `${section('Packaging Products owns quoteable structure','The v4 model separates quoteable packaging products from reusable pricing components.')}
      ${bullets(['Packaging Products owns product families, approved sizes, variations/quote options and KLDs.','KLD selection is validated against organization, family and variation before quote persistence.','Packaging product/size management should expose customer-safe descriptors; cost-master identifiers remain admin-only.','Core Catalog remains separate and continues to serve normal product/price-list use cases.'])}`,

    'packaging-pricing': `${section('Packaging Pricing v4','Pricing v4 is server-authoritative and protects internal costing from Sales/browser manipulation.')}
      ${table(['Area','Current behavior'],[['Stand Up Pouches','Formula-driven pricing using approved sizes, recipe inputs, centralized charges and commercial bands.'],['Center Seal','Workbook-derived fixed-orientation matrix pricing.'],['3SS Roll Form','Workbook-derived fixed-orientation matrix pricing.'],['3SS Pouch Form','Matrix pricing with formed-to-open geometry relationships.'],['Pricing Components','Reusable materials, production processes, finishes/extras and other charges.'],['Pricing Builder','Step-based recipe UX with sticky authoritative preview and Price Per Pouch as primary KPI.'],['Security','Master rates/IDs, COGS, wastage/margin and snapshot internals are hidden from Sales.'],['Persistence','Separate charges and pricing evidence persist with the quote version.']])}`,

    'packaging-quote': `${section('Packaging quote flow','Sales configures quoteable options; the server calculates and persists commercial truth.')}
      ${bullets(['Select published family/product/variation and approved size.','Select customer-safe material/construction/print/finish/zipper/etc. options.','Enter quantity and other allowed commercial inputs.','Server returns authoritative unit price and totals; browser-entered price is never trusted.','Select valid KLD/artwork evidence when required.','Persist canonical charge lines and pricing snapshot with the quote/version.','Later master-rate or KLD changes affect new previews only; historical versions remain reproducible.'])}`,

    'packaging-operations': `${section('Design & operations','Packaging execution now has dedicated operational screens in addition to the commercial quote workspace.')}
      ${cards([['Design Queue','Track artwork/KLD readiness and design handoff.'],['Job Ticket','Production-facing artifact from accepted/versioned quote context.'],['Packaging History','Lead-level history of packaging configuration and quote progression.'],['Dispatch Board','Operational dispatch visibility for packaging work.'],['Analytics','Packaging-specific admin/dashboard analytics.']])}`,

    'packaging-intelligence': `${section('Setu Guru for Packaging','Packaging intelligence combines CRM context with vertical-specific knowledge and source-backed research.')}
      ${bullets(['Packaging Operations workspace provides contextual help inside the vertical.','Sales discovery assistant helps translate customer language into useful packaging requirements.','Compliance/research library supports source-backed regulatory and market questions.','Evidence scoring improves confidence in externally discovered information.','Packaging FAQ knowledge provides organization-specific repeatable answers.','Organization learning-loop design captures feedback without allowing uncontrolled autonomous writes.'])}`,

    'packaging-admin': `${section('Packaging admin & release controls','Packaging pricing configuration is intentionally separated from Sales-facing quote configuration.')}
      ${bullets(['Packaging Products: products, sizes, options and KLDs.','Pricing Components: materials, production processes, finishes/extras and other charges.','Pricing Builder: recipe and source configuration with server preview.','Raw source matrices stay behind admin/source views rather than normal Sales UX.','Feature-flag rollout supports controlled organization allowlisting and rollback.','Packaging test suites are part of the production build gate.','Rollback first disables the v4 feature flag; historical quote evidence must not be rewritten.'])}`,

    'trade-events': `${section('Trade Events today','Trade Events includes event administration, fast capture, offline resilience, attribution, analytics and packaging-aware discovery.')}
      ${bullets(['Quick entry and scan remain optimized for booth speed.','Offline capture queues lead payloads for sync after reconnect.','Sprint 51 added optional packaging capture fields rather than forcing a long technical form.','Captured leads retain event/source attribution into CRM follow-up.','Post-show analytics and follow-up support conversion measurement.'])}`,

    'trade-show-trial': `${section('Trade Show Trial','The public trial path provisions a constrained workspace for booth use, tracks acquisition/ROI context and can create follow-up for SETU/client conversion.')}`,

    growth: `${section('Growth Center','Growth is now a real acquisition workspace rather than only an AI panel.')}
      ${bullets(['ICP and opportunity discovery feed prospecting.','Prospects can be enriched before contact.','Growth Lead Manager shows contact state and pipeline context.','Growth work can move into Mail Outreach for first inquiry/follow-up.','Qualified prospects convert into normal CRM workflow rather than creating a parallel permanent CRM.'])}`,

    'mail-outreach': `${section('Mail Outreach','Outreach has been normalized as a product workflow independent of provider branding.')}
      ${bullets(['Lead Manager can compose and send mail.','First inquiry and follow-up are distinct states.','Personalized bulk outreach is supported.','Inquiry links can be enforced where required.','Generated/sent email uses the authenticated operator signature and canonical SETU Flow marketing site.','Provider-specific implementation details stay behind the application boundary.'])}`,

    'seo-growth': `${section('SEO Command Center','SMC Growth now contains live SEO operations and controlled publication into GitHub main.')}
      ${bullets(['Google Search Console telemetry and trend charts.','Baseline-relative progress and non-brand ranking bands.','Target-page audits and crawler/indexing visibility.','First-touch demo attribution for organic acquisition.','SEO bot creates reviewable changes rather than silently modifying production.','Approved SEO changes can be published through PR/main workflow.','Canonical and crawl-policy fixes are part of the operational feedback loop.'])}`,

    'linkedin-growth': `${section('LinkedIn distribution','The Growth stack includes scheduled LinkedIn distribution readiness. Credential/provider setup remains an integration concern; generated content and publishing policy remain operator-governed.')}`,

    'guru-ai': `${section('Setu Guru Core','Setu Guru is the contextual operator assistant across CRM and vertical workspaces.')}
      ${bullets(['Live organization context/search for leads, quotes, orders and blockers.','Source-backed research for tariff/HSN/compliance/market questions.','Safe action previews before writes.','Contextual follow-up, quote and workflow assistance.','Vertical intelligence such as Packaging uses the same approval and data-boundary principles.'])}`,

    'guru-learning': `${section('Knowledge & learning','Knowledge is composed from curated documents/manifests, organization context, research sources and explicit feedback. The design goal is better answers over time without converting operator feedback into unsafe autonomous mutations.')}`,

    products: `${section('Core Products & Catalog','Core Catalog continues to own general product/category/variant management, pricing presentation, CSV/spreadsheet workflows, price lists, brochures and buyer sharing. Packaging Products is deliberately documented separately because its size/KLD/pricing model is different.')}`,
    tasks: `${section('Tasks','Tasks provide list/calendar planning, due-date grouping, assignment, entity linking and mobile completion. Use tasks for operator commitments; use pipeline next steps for commercial stage progression.')}`,
    reports: `${section('Reports & Analytics','Reporting now spans CRM funnel and execution plus Packaging, Growth/SEO, trade-event attribution, market/product performance and document/share engagement. Static documentation should describe metric ownership rather than freeze counts that quickly drift.')}`,
    notifications: `${section('Notifications','Notifications remain preference-aware and operator-scoped. Exact alert/channel counts should be generated from code/config rather than manually frozen in this hub.')}`,
    profile: `${section('Profile & My Card','Profile covers user identity, avatar/vCard information, share slug, Smart vs Offline QR, public card intake and downloadable contact exchange.')}`,
    'team-chat': `${section('Team Chat','Multi-organization collaboration supports channels, DMs, entity-linked conversations, reactions, presence/read tracking and system events while preserving organization boundaries.')}`,
    mobile: `${section('Mobile Workspace','Mobile workflows cover contact/business-card capture, public card exchange, trade-show/offline capture, lead/pipeline follow-up, quotes and selected operational views. Offline trade-event recovery is part of the supported field workflow.')}`,

    integrations: `${section('Organization-specific Integration Hub','Integration administration is now tenant-specific, showing provider connections, health and activity for the selected client organization.')}
      ${bullets(['Live/paused/needs-attention connection state.','Last sync and last event visibility.','Credentials stored independently from visible configuration.','Interakt/WhatsApp health from signed webhook processing.','IndiaMART credential/configuration prepared per organization.','Scoped Setu Flow API key generation and revocation.'])}`,

    interakt: `${section('Interakt / WhatsApp inbound','Interakt is an inbound sales workflow, not just a WhatsApp link.')}
      ${table(['Layer','Purpose'],[['Webhook','Receives provider events and verifies signatures.'],['Intake staging','Stores inbound inquiry safely before CRM promotion.'],['Qualification','Extracts/reviews useful sales and packaging context.'],['Conversation state','Maintains live inquiry/sales desk status.'],['Review actions','Lets operators correct/approve interpretation.'],['Sales messaging','Supports suggested/operator messages from the inbound workspace.'],['CRM conversion','Promotes qualified inquiry into lead/pipeline with source continuity.']])}`,

    indiamart: `${section('IndiaMART integration','IndiaMART setup is organization-specific. The current admin UI stores the client CRM key securely and prepares a pull-v2 inbound configuration without silently enabling sync.')}
      ${bullets(['CRM key is stored through integration credential storage, not displayed back in plaintext.','Configuration records mode pull_v2, API v2, inbound lead purpose and sync state.','Health/last activity is shown in the organization Integration Hub.','Adapter activation remains an explicit step after client credential/setup validation.'])}`,

    'api-integrations': `${section('API keys & webhooks','Setu Flow exposes controlled integration boundaries rather than allowing external systems direct database access.')}
      ${bullets(['Organization admins can create scoped API keys for lead/quote/order use cases.','Only the generated key is shown once; the database stores a SHA-256 hash and prefix.','Keys can be revoked and track last use.','Webhook providers use provider-specific verification and event logging.','Sensitive provider and pricing operations remain server-side/service-role controlled.'])}`,

    'client-management': `${section('Client management & entitlements','Client configuration now affects what users actually see and can open in the application shell.')}
      ${bullets(['Organization onboarding/provisioning.','Plan, seat and usage entitlements.','Module grants and vertical capability.','Per-organization feature flags and controlled rollout.','Entitlement-aware application navigation.','Client health and integration readiness in SMC.'])}`,

    'mission-control': `${section('Mission Control','SMC is the SETU internal operating console, now broader than the earlier issue/QA dashboard.')}
      ${table(['Area','Current scope'],[['Overview','Portfolio/client/system status.'],['Delivery','Issues, QA, incidents, deployments, release evidence.'],['Clients','Organizations, access, entitlement, health.'],['Growth','Lead Manager, Mail Outreach, SEO Command Center, acquisition telemetry.'],['Intelligence','Internal analysis/AI operating views.'],['Config','Feature flags, product/internal configuration and operational controls.']])}`,

    academy: `${section('Core Academy','Core Academy provides a guided learning journey independent of the Packaging Academy host. It includes workflow screenshots, test mode, progress/evidence and issue logging for failed/blocked steps.')}`,
    'packaging-academy': `${section('Packaging Academy','Packaging Academy is a separate vertical training experience with packaging-specific workflows, screenshots, evidence mapping, learning content and hostname isolation from Core Academy.')}`,
    'operator-guides': `${section('Operator Guides','Operator guides should align with Academy and current UI evidence. Each guide should state where to click, expected visible state, expected data write/side effect, and the rule that must not break.')}`,

    'quick-reference': `${section('Quick reference','Use this page for stable rules—not volatile hard-coded counts.')}
      ${bullets(['Tenant security: organization filter + RLS.','Capability security: membership/role + module/vertical entitlement + server authorization.','Commercial truth: version accepted quotes; do not rebuild historical records from current mutable prices.','Packaging price: server authoritative; protected cost/rate internals never trusted from the browser.','Inbound: stage/review provider data before CRM promotion.','AI: research/read richly; require explicit operator review for writes.','Integrations: organization-specific credentials and health.','Docs metadata: generate route/API/status counts from main.'])}`,

    'api-reference': `${section('API reference policy','The previous hub froze route/API totals from 12 Jul 2026. That information is already stale. This refreshed hub intentionally removes those numbers until they are generated from current main during build/test.')}
      ${table(['API family','Examples'],[['Inbound/webhooks','Interakt and provider event ingestion.'],['Integrations/admin','API keys, provider credential/configuration, health.'],['CRM','Leads, quotes, products, orders, compliance.'],['Setu Guru','Brain/context, search, research, feedback, safe actions.'],['Growth/SEO','Acquisition, telemetry and controlled publishing.'],['Academy','Progress/evidence/issue flows.'],['Internal/SMC','Issues, QA, client and operational endpoints.']])}`,

    'live-ui': `${section('Live UI snapshot coverage','The snapshot library should include the current Core CRM plus Packaging dashboard/admin/pricing/design/dispatch, Growth Center/Lead Manager/SEO, inbound Sales Desk, Integration Hub, Core Academy, Packaging Academy and Mission Control. Existing July screenshots should be marked historical when the current screen materially differs.')}`,
    roadmap: `${section('Roadmap status','Roadmap status must come from the live roadmap source. The old documentation runtime used manually maintained milestone counts and dated comments; those should not be treated as source of truth.')}`,
    glossary: `${section('Glossary additions','The refreshed glossary must include Packaging Products, KLD, Pricing Components, Pricing Builder, commercial band, pricing snapshot, Growth Lead Manager, Mail Outreach, SEO Command Center, inbound staging, Interakt Sales Desk, IndiaMART pull-v2, module entitlement, vertical capability, Core Academy and Packaging Academy.')}`,
  };

  let active = 'overview';
  let shared = false;

  function section(title, body) { return `<div class="section-block"><h2>${title}</h2><p>${body}</p></div>`; }
  function bullets(items) { return `<div class="section-block"><ul>${items.map(x => `<li>${x}</li>`).join('')}</ul></div>`; }
  function cards(items) { return `<div class="doc-card-grid">${items.map(([t,b]) => `<div class="doc-card border-blue"><div class="doc-card-title">${t}</div><p>${b}</p></div>`).join('')}</div>`; }
  function table(headers, rows) { return `<div class="tbl-wrap"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`; }
  function topicById(id) { return topics.find(t => t.id === id) || topics[0]; }

  function renderNav(filter = '') {
    const root = document.getElementById('topicNav');
    if (!root) return;
    const q = filter.trim().toLowerCase();
    const filtered = q ? topics.filter(t => `${t.title} ${t.group} ${t.summary} ${t.tag}`.toLowerCase().includes(q)) : topics;
    const groups = [];
    filtered.forEach(t => { if (!groups.includes(t.group)) groups.push(t.group); });
    root.innerHTML = groups.map((group, i) => {
      const rows = filtered.filter(t => t.group === group).map(t => `<button class="nav-link${t.id === active ? ' active' : ''}" data-topic="${t.id}" onclick="Docs.openTopic('${t.id}')"><span class="dot">${t.icon}</span>${t.title}</button>`).join('');
      return `<button class="nav-group-btn" onclick="Docs.toggleNavGroup('ref-ng-${i}','${group}')" aria-expanded="true"><span>${group}</span><span class="nav-group-chevron">›</span></button><div class="nav-group-items" id="ref-ng-${i}">${rows}</div>`;
    }).join('');
  }

  function renderOverview() {
    active = 'overview';
    const ov = document.getElementById('overviewView');
    const tv = document.getElementById('topicView');
    if (tv) tv.classList.add('hidden');
    if (ov) {
      ov.classList.remove('hidden');
      ov.innerHTML = `<div class="topic-head"><div><span class="topic-tag">REFRESHED 27 AUG 2026</span><h1>SETU Flow Documentation Hub</h1><p>Current platform documentation organized around how SETU Flow operates today.</p></div></div>
        <div class="doc-alert doc-alert-teal"><strong>Major refresh:</strong> Packaging now has a dedicated documentation group. Growth/Acquisition, inbound integrations, Academy, entitlement-aware administration, and current Mission Control are also first-class sections.</div>
        ${cards([['Packaging Workspace','Dedicated documentation for capture, products/KLD, pricing v4, quotes, design/operations, intelligence and admin/security.'],['Growth & Acquisition','Growth Center, Lead Manager, Mail Outreach, SEO Command Center and LinkedIn distribution.'],['Integrations & API','Interakt inbound, IndiaMART, org-specific health and scoped API keys.'],['Academy','Core and Packaging Academy plus operator evidence and guided testing.']])}
        ${section('Documentation freshness rule','Volatile route/API totals, roadmap counts and other operational metrics should be generated from main or live sources. The hub should not preserve manually maintained July-era numbers as technical truth.')}`;
    }
    updateChrome();
  }

  function openTopic(id) {
    if (id === 'overview') { location.hash = 'overview'; renderOverview(); return; }
    active = topicById(id).id;
    location.hash = active;
    const topic = topicById(active);
    const ov = document.getElementById('overviewView');
    const tv = document.getElementById('topicView');
    if (ov) ov.classList.add('hidden');
    if (tv) {
      tv.classList.remove('hidden');
      tv.innerHTML = `<div class="topic-head"><div><span class="topic-tag">${topic.tag}</span><h1>${topic.title}</h1><p>${topic.summary}</p></div></div>${content[active] || section(topic.title, topic.summary)}<div class="doc-alert doc-alert-blue"><strong>Source-of-truth rule:</strong> when this page conflicts with current main, current main wins and the docs must be updated.</div>`;
    }
    updateChrome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateChrome() {
    const topic = topicById(active);
    const crumb = document.getElementById('crumbCurrent');
    if (crumb) crumb.textContent = topic.title;
    document.querySelectorAll('.nav-link').forEach(el => el.classList.toggle('active', el.dataset.topic === active));
    const i = Math.max(0, topics.findIndex(t => t.id === active));
    const progress = document.getElementById('mobileProgress');
    const prev = document.getElementById('mobilePrev');
    const next = document.getElementById('mobileNext');
    if (progress) progress.textContent = `${i + 1} / ${topics.length}`;
    if (prev) prev.textContent = i === 0 ? 'Overview' : `← ${topics[i - 1].title}`;
    if (next) next.textContent = i === topics.length - 1 ? 'Start over' : `${topics[i + 1].title} →`;
    renderRightRail();
  }

  function renderRightRail() {
    const rail = document.getElementById('rightRail');
    if (!rail) return;
    const t = topicById(active);
    rail.innerHTML = `<div class="rail-card"><span class="rail-kicker">Current section</span><h3>${t.title}</h3><p>${t.summary}</p></div><div class="rail-card"><span class="rail-kicker">Freshness</span><p>Baseline: 27 Aug 2026. Validate fast-moving implementation details against <code>main</code>.</p></div>`;
  }

  function goPrev() { const i = topics.findIndex(t => t.id === active); openTopic(i <= 0 ? 'overview' : topics[i - 1].id); }
  function goNext() { const i = topics.findIndex(t => t.id === active); openTopic(i < 0 || i === topics.length - 1 ? 'overview' : topics[i + 1].id); }
  function toggleNav() { document.getElementById('leftNav')?.classList.toggle('open'); }
  function toggleNavGroup(id) { document.getElementById(id)?.classList.toggle('nav-collapsed'); }
  function search(value) { renderNav(value); }
  function showFullDocument() {
    const tv = document.getElementById('topicView'); const ov = document.getElementById('overviewView');
    if (ov) ov.classList.add('hidden');
    if (!tv) return;
    tv.classList.remove('hidden');
    tv.innerHTML = `<div class="topic-head"><div><span class="topic-tag">FULL DOCUMENT</span><h1>SETU Flow Documentation</h1><p>All refreshed topics in one continuous view.</p></div></div>` + topics.map(t => `<div class="section-block"><h2>${t.title}</h2><p>${t.summary}</p></div>${content[t.id] || ''}`).join('');
  }

  function openShare() { document.getElementById('shareModal')?.classList.remove('hidden'); }
  function closeShare() { document.getElementById('shareModal')?.classList.add('hidden'); }
  function generateShareLink() {
    const recipient = document.getElementById('shareRecipient')?.value?.trim() || 'External reviewer';
    const hours = Number(document.getElementById('shareDuration')?.value || 72);
    const token = btoa(JSON.stringify({ recipient, expiry: Date.now() + hours * 3600000 }));
    const url = `${location.origin}${location.pathname}?share_token=${encodeURIComponent(token)}#${active}`;
    const output = document.getElementById('shareOutput'); if (output) output.value = url;
    document.getElementById('shareResult')?.classList.remove('hidden');
    const meta = document.getElementById('shareMeta'); if (meta) meta.textContent = `Reviewer link for ${recipient}; expires in ${hours} hours.`;
  }
  function copyShareLink() { const el = document.getElementById('shareOutput'); if (el?.value) navigator.clipboard?.writeText(el.value); }
  function closeScreenshotModal() { document.getElementById('screenshotModal')?.classList.add('hidden'); }
  function uploadScreenshot() { const s = document.getElementById('shotStatus'); if (s) s.textContent = 'Screenshot upload remains handled by the legacy screenshot service; use the existing evidence workflow until this control is rewired.'; }
  function closeLightbox() { document.getElementById('imageLightbox')?.classList.add('hidden'); }
  function switchArchTab() {}
  function diagZoom() {}
  function diagReset() {}
  function downloadDiagram() {}
  function closeDiagramViewer() { document.getElementById('diagModal')?.classList.remove('open'); }

  async function initAuth() {
    const params = new URLSearchParams(location.search);
    const token = params.get('share_token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token));
        if (payload.expiry > Date.now()) {
          shared = true;
          document.body.classList.add('shared-mode');
          document.getElementById('sharedBanner')?.classList.remove('hidden');
          const name = document.getElementById('sharedRecipient'); if (name) name.textContent = payload.recipient || 'External reviewer';
          const exp = document.getElementById('sharedExpiry'); if (exp) exp.textContent = `Expires ${new Date(payload.expiry).toLocaleString()}`;
          document.querySelectorAll('.internal-only').forEach(el => el.classList.add('hidden'));
          document.getElementById('authGate')?.classList.add('hidden');
          return;
        }
      } catch (_) {}
    }
    try {
      const r = await fetch('/api/internal/auth-check', { credentials: 'include' });
      if (!r.ok) throw new Error('auth');
      const d = await r.json();
      const name = d?.user?.name || 'SETU User';
      const userName = document.getElementById('userName'); if (userName) userName.textContent = name;
      const initial = document.getElementById('userInitial'); if (initial) initial.textContent = name.charAt(0).toUpperCase();
      document.getElementById('authGate')?.classList.add('hidden');
    } catch (_) {
      document.getElementById('authGate')?.classList.remove('hidden');
    }
  }

  async function init() {
    await initAuth();
    const hash = (location.hash || '#overview').slice(1);
    active = topics.some(t => t.id === hash) ? hash : 'overview';
    renderNav();
    if (active === 'overview') renderOverview(); else openTopic(active);
    window.addEventListener('hashchange', () => {
      const id = (location.hash || '#overview').slice(1);
      if (topics.some(t => t.id === id) && id !== active) id === 'overview' ? renderOverview() : openTopic(id);
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  return { openTopic, goPrev, goNext, toggleNav, toggleNavGroup, search, showFullDocument, openShare, closeShare, generateShareLink, copyShareLink, closeScreenshotModal, uploadScreenshot, closeLightbox, switchArchTab, diagZoom, diagReset, downloadDiagram, closeDiagramViewer };
})();
