export type SetuGuruLiteAction = {
  label: string;
  href: string;
};

export type SetuGuruLiteTopic = {
  id: string;
  title: string;
  intent: string;
  keywords: string[];
  summary: string;
  answer: string[];
  actions: SetuGuruLiteAction[];
};

export type SetuGuruLitePage = {
  path: string;
  title: string;
  summary: string;
  safeActions: SetuGuruLiteAction[];
  topics: SetuGuruLiteTopic[];
};

export type SetuGuruLiteMatch = {
  page: SetuGuruLitePage;
  topic: SetuGuruLiteTopic;
  confidence: 'high' | 'medium' | 'low';
  answered: boolean;
  fallbackReason?: string;
};

const SITE_BOUNDARY = 'Setu Guru Lite can answer from Setu Flow public marketing pages and training content only. It cannot access workspace records, customer data, pricing defaults, HSN research, compliance decisions, or external websites.';

const commonActions: SetuGuruLiteAction[] = [
  { label: 'Explore platform', href: '/platform' },
  { label: 'Open training', href: '/training' },
  { label: 'Book demo', href: '/book-demo' },
];

export const publicSitePages: SetuGuruLitePage[] = [
  {
    path: '/',
    title: 'Home',
    summary: 'Setu Flow is a trade execution CRM that connects first contact, event capture, quotes, documents, orders, and dispatch readiness.',
    safeActions: commonActions,
    topics: [
      {
        id: 'home-overview',
        title: 'Setu Flow overview',
        intent: 'overview',
        keywords: ['what does setu flow do', 'overview', 'crm', 'trade execution', 'who is it for', 'home'],
        summary: 'Setu Flow keeps import-export workflow context connected from first contact to final dispatch.',
        answer: [
          'Setu Flow is built for trade teams that need more than a generic sales pipeline.',
          'The public product story is first contact, vCard or event capture, lead follow-up, quote control, document readiness, order handoff, and dispatch tracking.',
          'Use the Platform page for the workflow tour, Training for the product overview, and Book Demo when you want the workflow mapped to your team.'
        ],
        actions: commonActions,
      },
      {
        id: 'home-proof',
        title: 'Product proof points',
        intent: 'proof',
        keywords: ['proof', 'screenshots', 'lost deals', 'trade events', 'quote control', 'document readiness'],
        summary: 'The home page highlights where deals are usually lost: post-event follow-up, quote drift, and document gaps.',
        answer: [
          'The home page proof section focuses on three risk moments: event leads that leak after shows, quote terms that drift across versions, and documents discovered missing too late.',
          'Setu Flow positions these as connected operating workflows instead of disconnected spreadsheets and emails.'
        ],
        actions: [
          { label: 'See platform proof', href: '/platform' },
          { label: 'Compare options', href: '/compare' },
        ],
      },
    ],
  },
  {
    path: '/platform',
    title: 'Platform',
    summary: 'The platform page explains the full trade execution workflow: vCard, trade events, lead follow-up, quote management, documents, orders, dispatch, and Setu Guru AI.',
    safeActions: [
      { label: 'Open mobile page', href: '/field-mobile' },
      { label: 'Open training', href: '/training' },
      { label: 'Book demo', href: '/book-demo' },
    ],
    topics: [
      {
        id: 'platform-workflow',
        title: 'Platform workflow',
        intent: 'platform_workflow',
        keywords: ['platform', 'workflow', 'operating system', 'vcard', 'events', 'quotes', 'documents', 'orders', 'dispatch'],
        summary: 'Platform guidance covers the connected workflow sequence public visitors see on the product tour.',
        answer: [
          'The Platform page presents Setu Flow as one operating system for trade execution.',
          'The sequence is capture contacts, manage trade events, follow up leads, prepare controlled quotes, check documents, hand off orders, track dispatch, and use Setu Guru for guidance.',
          'Setu Guru Lite can explain these public modules but cannot open or search private workspace records.'
        ],
        actions: [
          { label: 'Open training modules', href: '/training' },
          { label: 'See mobile capture', href: '/field-mobile' },
        ],
      },
      {
        id: 'platform-quotes-docs',
        title: 'Quotes and documents',
        intent: 'quote_document_workflow',
        keywords: ['quote', 'quotes', 'documents', 'order', 'dispatch', 'incoterms', 'approval'],
        summary: 'Quote and document workflow guidance is informational in public mode.',
        answer: [
          'Public guidance can explain that quotes need buyer context, pricing, terms, incoterms, and approval readiness before being sent.',
          'Documents are positioned as readiness checks so teams know what is missing before shipment risk appears.',
          'Public mode will not create quotes, approve terms, waive documents, or change order status.'
        ],
        actions: [
          { label: 'Train on quote workflow', href: '/training' },
          { label: 'Compare workflow depth', href: '/compare' },
        ],
      },
    ],
  },
  {
    path: '/solutions',
    title: 'Solutions',
    summary: 'The solutions page maps Setu Flow to trade team use cases across sales, operations, field capture, and leadership.',
    safeActions: [
      { label: 'Explore platform', href: '/platform' },
      { label: 'Open training', href: '/training' },
      { label: 'Book demo', href: '/book-demo' },
    ],
    topics: [
      {
        id: 'solutions-roles',
        title: 'Role-based solutions',
        intent: 'solutions_roles',
        keywords: ['solutions', 'sales', 'operations', 'manager', 'leadership', 'team', 'roles'],
        summary: 'Solutions guidance helps visitors connect public product modules to team roles.',
        answer: [
          'For sales, Setu Flow focuses on lead capture, follow-up, quote creation, and buyer context.',
          'For operations, it focuses on documents, order readiness, dispatch, and handoff visibility.',
          'For leaders, it provides a clearer view of pipeline pressure, ownership, readiness, and workflow gaps.'
        ],
        actions: [
          { label: 'Open role training', href: '/training' },
          { label: 'Book role walkthrough', href: '/book-demo' },
        ],
      },
    ],
  },
  {
    path: '/setu-guru-ai',
    title: 'Setu Guru AI',
    summary: 'The Setu Guru AI page explains the public AI concept and how the assistant supports trade workflows with clear human boundaries.',
    safeActions: [
      { label: 'Open training', href: '/training' },
      { label: 'Explore platform', href: '/platform' },
    ],
    topics: [
      {
        id: 'guru-ai-public',
        title: 'Setu Guru AI public overview',
        intent: 'setu_guru_ai',
        keywords: ['setu guru', 'guru ai', 'ai', 'assistant', 'what can guru do', 'lite'],
        summary: 'Setu Guru AI is positioned publicly as guidance with human approval boundaries.',
        answer: [
          'Setu Guru AI is the workflow guide for Setu Flow. On the public site, Setu Guru Lite answers only from marketing and training content.',
          'Inside the authenticated CRM, Setu Guru can support contextual workflow guidance, but human review remains required for commercial, compliance, and data-changing decisions.',
          'Public Lite mode does not access live CRM records or external research.'
        ],
        actions: [
          { label: 'Learn in training', href: '/training' },
          { label: 'Book AI walkthrough', href: '/book-demo' },
        ],
      },
    ],
  },
  {
    path: '/field-mobile',
    title: 'Mobile',
    summary: 'The mobile page explains field capture, mobile leads, QR/vCard workflows, and quick follow-up for trade teams.',
    safeActions: [
      { label: 'Open training', href: '/training' },
      { label: 'Book demo', href: '/book-demo' },
    ],
    topics: [
      {
        id: 'mobile-capture',
        title: 'Mobile capture',
        intent: 'mobile_capture',
        keywords: ['mobile', 'field', 'quick lead', 'vcard', 'qr', 'scan', 'business card', 'event'],
        summary: 'Mobile guidance covers capture speed and follow-up discipline without touching live data.',
        answer: [
          'Setu Flow mobile is for field and event situations where contacts need to become CRM-ready follow-up records quickly.',
          'The public story includes quick lead capture, mobile lead review, QR/vCard sharing, and verification before follow-up.',
          'Setu Guru Lite can explain the workflow, but it cannot capture a real lead from public mode.'
        ],
        actions: [
          { label: 'Train on mobile capture', href: '/training' },
          { label: 'Explore platform', href: '/platform' },
        ],
      },
    ],
  },
  {
    path: '/pricing',
    title: 'Pricing',
    summary: 'The pricing page explains public package positioning only. It is not a pricing-default calculator.',
    safeActions: [
      { label: 'Book pricing walkthrough', href: '/book-demo' },
      { label: 'Compare plans', href: '/compare' },
    ],
    topics: [
      {
        id: 'pricing-public',
        title: 'Public pricing',
        intent: 'pricing_public',
        keywords: ['pricing', 'price', 'cost', 'starter', 'growth', 'enterprise', 'plan'],
        summary: 'Pricing Lite answers are limited to public page language and demo routing.',
        answer: [
          'I can explain the public pricing page and help you decide which page to review next.',
          'I cannot calculate private pricing defaults, discounts, freight assumptions, margin defaults, or custom commercial terms in public mode.',
          'For real commercial fit, use Book Demo so the team can map requirements safely.'
        ],
        actions: [
          { label: 'Book demo', href: '/book-demo' },
          { label: 'Compare Setu Flow', href: '/compare' },
        ],
      },
    ],
  },
  {
    path: '/compare',
    title: 'Compare',
    summary: 'The compare page explains where Setu Flow goes deeper than generic CRMs and spreadsheets for trade execution.',
    safeActions: [
      { label: 'Explore platform', href: '/platform' },
      { label: 'Book demo', href: '/book-demo' },
    ],
    topics: [
      {
        id: 'compare-public',
        title: 'Comparison guidance',
        intent: 'comparison',
        keywords: ['compare', 'hubspot', 'pipedrive', 'spreadsheet', 'generic crm', 'difference'],
        summary: 'Comparison guidance stays on public positioning and avoids claims outside approved page content.',
        answer: [
          'The public comparison is that generic CRMs are strong around pipeline tracking, while Setu Flow continues into quote control, document readiness, order handoff, and dispatch tracking.',
          'Setu Guru Lite can explain this positioning and route you to the platform walkthrough or demo page.'
        ],
        actions: [
          { label: 'See platform workflow', href: '/platform' },
          { label: 'Book comparison demo', href: '/book-demo' },
        ],
      },
    ],
  },
  {
    path: '/book-demo',
    title: 'Book Demo',
    summary: 'The book-demo page helps visitors request a focused walkthrough.',
    safeActions: [
      { label: 'Explore platform first', href: '/platform' },
      { label: 'Open training', href: '/training' },
    ],
    topics: [
      {
        id: 'book-demo-help',
        title: 'Demo request help',
        intent: 'demo_help',
        keywords: ['book demo', 'demo', 'walkthrough', 'contact sales', 'form'],
        summary: 'Demo guidance explains what to prepare and what public workflows to review.',
        answer: [
          'A good Setu Flow demo should map your lead capture, quote control, document readiness, order handoff, and dispatch needs.',
          'Setu Guru Lite can help you decide what to ask, but it should not submit or alter form data for you.'
        ],
        actions: [
          { label: 'Review platform', href: '/platform' },
          { label: 'Review training', href: '/training' },
        ],
      },
    ],
  },
  {
    path: '/training',
    title: 'Product Overview Training',
    summary: 'The training page teaches role-based Setu Flow workflows across dashboard, capture, trade shows, mobile, tasks, Setu Guru, quotes, documents, orders, and dispatch.',
    safeActions: [
      { label: 'Start training', href: '/training' },
      { label: 'Explore platform', href: '/platform' },
    ],
    topics: [
      {
        id: 'training-workflow',
        title: 'Training workflow',
        intent: 'training_workflow',
        keywords: ['training', 'product overview', 'module', 'lesson', 'workflow', 'role', 'quiz'],
        summary: 'Training guidance explains modules and role paths from public training content.',
        answer: [
          'The training page is a guided product overview. It covers dashboard, lead capture, trade show capture, mobile/vCard, tasks, Setu Guru, quotes, documents, order readiness, and dispatch tracking.',
          'Sales should focus on capture, follow-up, Setu Guru, and quotes. Operations should focus on tasks, documents, orders, and dispatch. Managers should review the full path.',
          'Setu Guru Lite can guide you to the right module, but it cannot change training progress for you.'
        ],
        actions: [
          { label: 'Open training', href: '/training' },
          { label: 'Book workflow demo', href: '/book-demo' },
        ],
      },
      {
        id: 'training-quotes',
        title: 'Quote workflow training',
        intent: 'training_quote_workflow',
        keywords: ['quote workflow', 'quote training', 'approval gate', 'approved quote', 'quote builder'],
        summary: 'Quote training covers list, builder, draft review, approval, send, and accepted quote to order handoff.',
        answer: [
          'The quote workflow training path covers quote list review, quote builder, draft validation, approval gate, approved quote send, and accepted quote to order creation.',
          'The key principle is that sending a quote is a real commercial action and should happen only after approval and final recipient/PDF review.',
          'Public Lite mode explains the workflow only. It cannot approve, send, price, or create records.'
        ],
        actions: [
          { label: 'Open training', href: '/training' },
          { label: 'Explore platform quote module', href: '/platform' },
        ],
      },
    ],
  },
  {
    path: '/client-login',
    title: 'Workspace Login',
    summary: 'The login page is for authenticated workspace access.',
    safeActions: [
      { label: 'Return home', href: '/' },
      { label: 'Book demo', href: '/book-demo' },
    ],
    topics: [
      {
        id: 'login-public',
        title: 'Workspace access help',
        intent: 'login_public',
        keywords: ['login', 'workspace', 'account', 'password', 'access'],
        summary: 'Public login guidance is limited to explaining workspace access.',
        answer: [
          'The workspace login page is for users who already have Setu Flow access.',
          'Setu Guru Lite cannot recover accounts, inspect users, or access private workspace data.',
          'For demo access, use the Book Demo page or contact the Setu team.'
        ],
        actions: [
          { label: 'Book demo', href: '/book-demo' },
          { label: 'Return home', href: '/' },
        ],
      },
    ],
  },
];

export function isSetuGuruLiteAllowedPath(pathname: string) {
  return publicSitePages.some((page) => pathname === page.path || (page.path !== '/' && pathname.startsWith(`${page.path}/`)));
}

export function getSetuGuruLitePage(pathname: string) {
  return publicSitePages.find((page) => pathname === page.path || (page.path !== '/' && pathname.startsWith(`${page.path}/`))) ?? publicSitePages[0];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function scoreTopic(question: string, topic: SetuGuruLiteTopic, page: SetuGuruLitePage) {
  const q = normalize(question);
  const haystack = normalize(`${topic.title} ${topic.summary} ${topic.keywords.join(' ')} ${page.title} ${page.summary}`);
  let score = 0;
  topic.keywords.forEach((keyword) => {
    const normalizedKeyword = normalize(keyword);
    if (normalizedKeyword && q.includes(normalizedKeyword)) score += 6;
  });
  q.split(' ').filter((token) => token.length > 2).forEach((token) => {
    if (haystack.includes(token)) score += 1;
  });
  return score;
}

export function isSetuGuruLiteBlockedQuestion(question: string) {
  const q = normalize(question);
  return [
    'search outside',
    'google',
    'web search',
    'live crm',
    'customer data',
    'buyer record',
    'supplier record',
    'lead record',
    'order record',
    'update order',
    'create lead',
    'send quote',
    'approve quote',
    'waive compliance',
    'hsn',
    'hs code',
    'pricing default',
    'discount',
    'margin default',
  ].some((phrase) => q.includes(phrase));
}

export function matchSetuGuruLiteTopic(question: string, pathname: string): SetuGuruLiteMatch {
  const page = getSetuGuruLitePage(pathname);
  const pageTopics = page.topics.map((topic) => ({ topic, score: scoreTopic(question, topic, page) }));
  const allTopics = publicSitePages.flatMap((candidatePage) => candidatePage.topics.map((topic) => ({ page: candidatePage, topic, score: scoreTopic(question, topic, candidatePage) })));
  const pageBest = pageTopics.sort((a, b) => b.score - a.score)[0];
  const globalBest = allTopics.sort((a, b) => b.score - a.score)[0];
  const bestPage = pageBest && pageBest.score >= (globalBest?.score ?? 0) - 1 ? page : globalBest?.page ?? page;
  const bestTopic = pageBest && pageBest.score >= (globalBest?.score ?? 0) - 1 ? pageBest.topic : globalBest?.topic ?? page.topics[0];
  const score = Math.max(pageBest?.score ?? 0, globalBest?.score ?? 0);

  if (isSetuGuruLiteBlockedQuestion(question)) {
    return {
      page,
      topic: bestTopic,
      confidence: 'medium',
      answered: false,
      fallbackReason: 'outside_public_marketing_training_scope',
    };
  }

  return {
    page: bestPage,
    topic: bestTopic,
    confidence: score >= 8 ? 'high' : score >= 3 ? 'medium' : 'low',
    answered: score >= 3,
    fallbackReason: score >= 3 ? undefined : 'no_strong_public_topic_match',
  };
}

export function buildSetuGuruLiteAnswer(question: string, pathname: string) {
  const match = matchSetuGuruLiteTopic(question, pathname);
  const boundary = SITE_BOUNDARY;
  if (!match.answered) {
    return {
      answer: [
        'I can help with Setu Flow public pages, product overview, and training content.',
        'I cannot access live CRM records, customer data, pricing defaults, HSN research, compliance decisions, or external searches from Setu Guru Lite.',
        `For this page: ${match.page.summary}`,
        'Try asking about the platform workflow, mobile capture, pricing page, comparison page, Setu Guru AI, or training modules.',
      ].join('\n\n'),
      actions: match.page.safeActions,
      pageTitle: match.page.title,
      topicId: match.topic.id,
      intent: match.topic.intent,
      matchedPublicSource: `${match.page.path}#${match.topic.id}`,
      answered: false,
      fallbackReason: match.fallbackReason,
      policy: boundary,
    };
  }

  return {
    answer: [`For ${match.page.title}: ${match.topic.summary}`, ...match.topic.answer, boundary].join('\n\n'),
    actions: match.topic.actions.length ? match.topic.actions : match.page.safeActions,
    pageTitle: match.page.title,
    topicId: match.topic.id,
    intent: match.topic.intent,
    matchedPublicSource: `${match.page.path}#${match.topic.id}`,
    answered: true,
    fallbackReason: null,
    policy: boundary,
  };
}
