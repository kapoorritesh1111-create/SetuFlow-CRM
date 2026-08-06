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

/**
 * Minimum number of DISTINCT question tokens that must match somewhere
 * across all candidate sources before a question is treated as in-scope.
 * A threshold of 1 is too weak: in a large concatenated corpus, a single
 * generic word (e.g. "capital" appearing in unrelated "working capital
 * financing" content) can coincidentally match and make a completely
 * off-topic question look relevant. Requiring 3+ distinct matches makes
 * that kind of accidental single-word overlap much less likely to pass.
 */
const MIN_DISTINCT_TOKEN_MATCHES = 3;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Common English function words. These appear in almost every source's
 * content ("use", "the", "for", "what", ...) so leaving them in the
 * token set would inflate overlap scores regardless of topical relevance.
 */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can',
  'has', 'have', 'had', 'was', 'were', 'what', 'when', 'where',
  'which', 'who', 'why', 'how', 'this', 'that', 'these', 'those',
  'with', 'from', 'into', 'onto', 'use', 'used', 'using', 'get',
  'set', 'its', 'their', 'they', 'them', 'about', 'before', 'after',
  'than', 'then', 'will', 'would', 'should', 'could', 'does', 'did',
  'doing', 'each', 'any', 'may', 'must', 'shall', 'per', 'via',
]);

function tokens(value: string): string[] {
  return normalize(value)
    .split(' ')
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

function scoreSource(question: string, source: BrainSourceSeed): number {
  const haystack = normalize(`${source.name} ${source.content} ${source.next}`);
  return tokens(question).reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

/**
 * Counts how many DISTINCT question tokens match anywhere across the
 * full set of candidate sources. Unlike scoreSource (which sums matches
 * per source and can be inflated by the same token matching in several
 * sources), this counts each token at most once — it answers "how many
 * different concepts from the question does the corpus recognize?"
 * rather than "how many total hits were there?".
 */
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

/**
 * Confidence is driven by total keyword overlap across all candidate
 * sources. Whether the question is in-scope at all is decided separately
 * in buildSetuGuruBrainAnswer via distinctMatchedTokenCount — this only
 * grades relevance once in-scope has already been established.
 */
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
 * Response for questions that don't clear MIN_DISTINCT_TOKEN_MATCHES.
 * `getBestSetuGuruHelpTopic` always returns *some* topic even when
 * nothing is genuinely relevant, so this branch exists specifically to
 * avoid presenting that default topic as if it answered the question —
 * the caller gets an explicit out-of-scope message and no fabricated
 * evidence rows instead.
 */
function buildOutOfScopeAnswer(
  routeHelp: ReturnType<typeof getRouteHelpSummary>,
  policy: ReturnType<typeof classifySetuGuruResponse>,
  topic: ReturnType<typeof getBestSetuGuruHelpTopic>,
): SetuGuruBrainAnswer {
  const answer = [
    'Data Not Found - this question does not match any Setu Guru product, workflow, or page topic in the current knowledge base.',
    'Setu Guru can help with leads, quotes, compliance, pricing defaults, HS codes, and CRM workflow questions.',
    'Recommended next step: ask a question related to a lead, quote, or CRM workflow, or open the relevant record for context.',
  ].join('\n\n');

  return {
    answer,
    confidence: 'low',
    mode: 'brain_layer',
    sourceOrder: policy.sourceOrder,
    intents: policy.intents,
    requiresHumanApproval: policy.requiresHumanApproval,
    rows: [],
    actions: LOW_CONFIDENCE_ACTIONS,
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

  const answer = confidence === 'low'
    ? [
        `I checked the Setu Guru brain layer for ${routeHelp.routeTitle}, but the question needs more route or record context before I can give a precise product answer.`,
        `Best repo-backed starting point: ${topic.summary}`,
        `Evidence checked: ${sourceList}.`,
        `Approval boundary: ${approvalBoundary}`,
        'Recommended next step: ask what can you do on this page, or open the related record so I can use live organization context before answering.',
      ].join('\n\n')
    : [
        `I checked repo-backed Setu Guru sources for ${routeHelp.routeTitle} before answering.`,
        topic.summary,
        ...topic.answer.slice(0, 3),
        `Evidence checked: ${sourceList}.`,
        `Approval boundary: ${approvalBoundary}`,
        policy.reminders.length
          ? `Policy reminder: ${policy.reminders.join(' ')}`
          : 'Policy reminder: use page context, live organization data, route help, then research before generic guidance.',
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
    return buildOutOfScopeAnswer(routeHelp, policy, topic);
  }

  const ranked: ScoredSource[] = sources
    .map((source) => ({ source, score: scoreSource(question, source) }))
    .sort((left, right) => right.score - left.score);

  const totalScore = sumScores(ranked);
  const confidence = confidenceFor(question, totalScore);
  const rows = sourceRows(ranked.map((item) => item.source));

  return buildGroundedAnswer(routeHelp, policy, topic, rows, confidence);
}