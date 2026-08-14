import { getRouteHelpSummary, getBestSetuGuruHelpTopic } from './help-registry';
import { getSetuGuruPageContext } from './page-context';
import { classifySetuGuruResponse, type SetuGuruAnswerSource } from './guru-response-policy';

type SetuGuruBrainSourceType = SetuGuruAnswerSource | 'response_policy' | 'repo_doc' | 'database_schema';

export type SetuGuruBrainAnswerInput = {
  question: string;
  route?: string;
  pageText?: string;
  organizationName?: string | null;
  roleLabel?: string | null;
};

export type SetuGuruBrainSourceRow = {
  id: string;
  name: string;
  type: SetuGuruBrainSourceType;
  citation: string;
  url: string;
  next: string;
};

export type SetuGuruBrainConfidence = 'low' | 'medium' | 'high';

export type SetuGuruBrainAnswer = {
  answer: string;
  confidence: SetuGuruBrainConfidence;
  mode: 'brain_layer';
  sourceOrder: string[];
  intents: string[];
  requiresHumanApproval: boolean;
  rows: SetuGuruBrainSourceRow[];
  actions: string[];
  routeHelp: ReturnType<typeof getRouteHelpSummary>;
  topic: { id: string; title: string; helpFile: string };
};

type BrainSourceSeed = Omit<SetuGuruBrainSourceRow, 'id' | 'citation'> & { content: string };

type ScoredSource = { source: BrainSourceSeed; score: number };

const DEFAULT_ROUTE = '/dashboard';
const LOW_CONFIDENCE_ACTIONS = ['Ask what can you do on this page?', 'Open help source'];
const MIN_QUESTION_LENGTH_FOR_CONFIDENCE = 8;
const HIGH_CONFIDENCE_SCORE_THRESHOLD = 5;
const MIN_DISTINCT_TOKEN_MATCHES = 3;

const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
  'has', 'have', 'had', 'was', 'were', 'what', 'when', 'where',
  'which', 'who', 'why', 'how', 'this', 'that', 'these', 'those',
  'with', 'from', 'into', 'onto', 'use', 'used', 'using', 'get',
  'set', 'its', 'their', 'they', 'them', 'about', 'before', 'after',
  'than', 'then', 'will', 'would', 'should', 'could', 'does', 'did',
  'doing', 'each', 'any', 'may', 'must', 'shall', 'per', 'via',
]);

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens(value: string): string[] {
  return normalize(value)
    .split(' ')
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function scoreSource(question: string, source: BrainSourceSeed): number {
  const haystack = normalize(`${source.name} ${source.content} ${source.next}`);
  return tokens(question).reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function distinctMatchedTokenCount(question: string, sources: BrainSourceSeed[]): number {
  const combinedHaystack = normalize(
    sources.map((source) => `${source.name} ${source.content} ${source.next}`).join(' '),
  );
  const questionTokens = tokens(question);
  const matched = new Set(questionTokens.filter((token) => combinedHaystack.includes(token)));
  return matched.size;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sumScores(scored: ScoredSource[]): number {
  return scored.reduce((sum, item) => sum + item.score, 0);
}

function confidenceFor(question: string, totalScore: number): SetuGuruBrainConfidence {
  if (question.trim().length < MIN_QUESTION_LENGTH_FOR_CONFIDENCE || totalScore === 0) return 'low';
  if (totalScore >= HIGH_CONFIDENCE_SCORE_THRESHOLD) return 'high';
  return 'medium';
}

function sourceRows(sources: BrainSourceSeed[]): SetuGuruBrainSourceRow[] {
  return sources.slice(0, 6).map((source, index) => ({
    id: `R${index + 1}`,
    citation: `[R${index + 1}]`,
    name: source.name,
    type: source.type,
    url: source.url,
    next: source.next,
  }));
}

function buildRepoSources(input: SetuGuruBrainAnswerInput): BrainSourceSeed[] {
  const route = input.route || DEFAULT_ROUTE;
  const routeHelp = getRouteHelpSummary(route);
  const pageContext = getSetuGuruPageContext(route);
  const topic = getBestSetuGuruHelpTopic(input.question || routeHelp.summary, route);
  const policy = classifySetuGuruResponse(input.question, route);
  const activeTables = unique([...pageContext.dataSources, ...topic.dataSources]);
  const approvalRules = unique([...pageContext.approvalRequiredActions, ...topic.approvalRules, ...policy.reminders]);

  return [
    {
      name: `${routeHelp.routeTitle} page context`,
      type: 'page_context',
      url: `route:${pageContext.routes[0] ?? route}`,
      content: [pageContext.summary, ...pageContext.primaryQuestions, input.pageText ?? ''].join(' '),
      next: 'Use visible route context before generic guidance.',
    },
    {
      name: `${topic.title} help registry`,
      type: 'route_help_registry',
      url: topic.helpFile,
      content: [topic.summary, ...topic.answer, ...topic.commonBlockers, ...topic.tags].join(' '),
      next: 'Use the route help registry as the primary repo-backed product explanation.',
    },
    {
      name: 'Setu Guru response policy',
      type: 'response_policy',
      url: 'src/lib/setu-guru/guru-response-policy.ts',
      content: [policy.sourceOrder.join(' '), policy.intents.join(' '), ...approvalRules].join(' '),
      next: 'Preserve source order, live-data preference, and human approval boundaries.',
    },
    {
      name: 'Database schema and workflow tables',
      type: 'database_schema',
      url: activeTables.length ? `tables:${activeTables.join(',')}` : 'tables:page_context',
      content: activeTables.join(' '),
      next: activeTables.length
        ? `Check these org-scoped tables before making live claims: ${activeTables.slice(0, 8).join(', ')}.`
        : 'No route-specific tables were listed; keep the answer guidance-only.',
    },
    {
      name: 'SetuFlow workflow knowledge base',
      type: 'repo_doc',
      url: 'docs/setu-guru/SETUFLOW_WORKFLOWS.md',
      content: `${topic.summary} ${pageContext.allowedActions.join(' ')} ${routeHelp.suggestedPrompts.join(' ')}`,
      next: 'Use workflow documentation to explain the next safe route or operating step.',
    },
  ];
}

/**
 * REFACTORED: Smart, Agentic Fallback Handler.
 * Instead of a robotic "Data Not Found", this acts as a conversational co-pilot.
 * It acknowledges the user's input and gently guides them towards CRM data retrieval.
 */
function buildOutOfScopeAnswer(
  question: string,
  routeHelp: ReturnType<typeof getRouteHelpSummary>,
  policy: ReturnType<typeof classifySetuGuruResponse>,
  topic: ReturnType<typeof getBestSetuGuruHelpTopic>,
): SetuGuruBrainAnswer {
  
  // Extract key intent to sound natural (basic NLP heuristic for the fallback)
  const isProductOrLeadQuery = /(cost|price|product|lead|quote|supplier|buyer|banana|chips|corn)/i.test(question);
  
  // Clean up the question for a natural echo back to the user
  const sanitizedQuestion = question.trim().replace(/[?!.]+$/, '');

  let conversationalAnswer = '';
  let dynamicActions = [...LOW_CONFIDENCE_ACTIONS];

  if (isProductOrLeadQuery) {
    conversationalAnswer = `Aap "${sanitizedQuestion}" ke baare mein pooch rahe hain, right?\n\nMere paas iski static documentation abhi nahi hai, lekin SetuFlow CRM mein is se jude live leads, quotes, aur pricing hum check kar sakte hain.\n\nKya main aapke liye is product ki active leads ya pricing defaults pull karun?`;
    dynamicActions = ['Search CRM catalog', 'Check active leads', 'Show open quotes'];
  } else {
    conversationalAnswer = `Mujhe "${sanitizedQuestion}" se juda exact match knowledge base mein nahi mila.\n\nLekin fikar mat kijiye! Main aapki help leads, quotes, compliance, aur CRM workflows track karne mein kar sakta hoon.\n\nKya aap kisi specific lead ya quote ka status janna chahte hain?`;
    dynamicActions = ['Show my active tasks', 'View recent quotes', ...LOW_CONFIDENCE_ACTIONS];
  }

  return {
    answer: conversationalAnswer,
    confidence: 'low',
    mode: 'brain_layer',
    sourceOrder: policy.sourceOrder,
    intents: policy.intents,
    requiresHumanApproval: policy.requiresHumanApproval,
    rows: [],
    actions: dynamicActions,
    routeHelp,
    topic: { id: topic.id, title: topic.title, helpFile: topic.helpFile },
  };
}

function buildGroundedAnswer(
  routeHelp: ReturnType<typeof getRouteHelpSummary>,
  policy: ReturnType<typeof classifySetuGuruResponse>,
  topic: ReturnType<typeof getBestSetuGuruHelpTopic>,
  rows: SetuGuruBrainSourceRow[],
  confidence: SetuGuruBrainConfidence,
): SetuGuruBrainAnswer {
  const sourceList = rows.map((row) => `${row.citation} ${row.name}`).join('; ');
  const approvalBoundary = topic.approvalRules.length
    ? topic.approvalRules.join(' ')
    : 'Human approval is required before Setu Guru sends, waives, writes back, deletes, changes pricing, or advances execution.';

  // Natural language variations added here as well for grounded answers
  const answer = confidence === 'low'
    ? [
        `Mainne ${routeHelp.routeTitle} ke liye Setu Guru brain check kiya, par mujhe thode aur context ki zaroorat hai ekdam precise answer dene ke liye.`,
        `Best repo-backed starting point: ${topic.summary}`,
        `Evidence checked: ${sourceList}.`,
        `Approval boundary: ${approvalBoundary}`,
        'Recommended next step: Aap mujhse is page ke actions pooch sakte hain, ya related record open kar sakte hain taaki main live org data use kar sakun.',
      ].join('\n\n')
    : [
        `Mainne repo-backed Setu Guru sources check kar liye hain for ${routeHelp.routeTitle}.`,
        topic.summary,
        ...topic.answer.slice(0, 3),
        `Evidence checked: ${sourceList}.`,
        `Approval boundary: ${approvalBoundary}`,
        policy.reminders.length
          ? `Policy reminder: ${policy.reminders.join(' ')}`
          : 'Policy reminder: Use page context, live organization data, route help, then research before generic guidance.',
      ].join('\n\n');

  return {
    answer,
    confidence,
    mode: 'brain_layer',
    sourceOrder: policy.sourceOrder,
    intents: policy.intents,
    requiresHumanApproval: policy.requiresHumanApproval,
    rows,
    actions: confidence === 'low' ? LOW_CONFIDENCE_ACTIONS : topic.actions,
    routeHelp,
    topic: { id: topic.id, title: topic.title, helpFile: topic.helpFile },
  };
}

export function buildSetuGuruBrainAnswer(input: SetuGuruBrainAnswerInput): SetuGuruBrainAnswer {
  const question = input.question.trim();
  const route = input.route || DEFAULT_ROUTE;
  const routeHelp = getRouteHelpSummary(route);
  const topic = getBestSetuGuruHelpTopic(question || routeHelp.summary, route);
  const policy = classifySetuGuruResponse(question, route);

  const sources = buildRepoSources(input);

  if (distinctMatchedTokenCount(question, sources) < MIN_DISTINCT_TOKEN_MATCHES) {
    // QUESTION AB PASS HO RAHA HAI: AI ab blind nahi hai!
    return buildOutOfScopeAnswer(question, routeHelp, policy, topic);
  }

  const ranked: ScoredSource[] = sources
    .map((source) => ({ source, score: scoreSource(question, source) }))
    .sort((left, right) => right.score - left.score);

  const totalScore = sumScores(ranked);
  const confidence = confidenceFor(question, totalScore);
  const rows = sourceRows(ranked.map((item) => item.source));

  return buildGroundedAnswer(routeHelp, policy, topic, rows, confidence);
}