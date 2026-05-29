import { getRouteHelpSummary, getBestSetuGuruHelpTopic } from './help-registry';
import { getSetuGuruPageContext } from './page-context';
import { classifySetuGuruResponse, type SetuGuruAnswerSource } from './guru-response-policy';

type SetuGuruBrainSourceType = SetuGuruAnswerSource | 'repo_doc' | 'database_schema';

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

type BrainSourceSeed = Omit<SetuGuruBrainSourceRow, 'id' | 'citation'> & { content: string };

const DEFAULT_ROUTE = '/dashboard';
const LOW_CONFIDENCE_ACTIONS = ['Ask what can you do on this page?', 'Open help source'];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokens(value: string) {
  return normalize(value).split(' ').filter((token) => token.length > 2);
}

function scoreSource(question: string, source: BrainSourceSeed) {
  const haystack = normalize(`${source.name} ${source.content} ${source.next}`);
  return tokens(question).reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

function unique(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function confidenceFor(question: string, scores: number[]) {
  const totalScore = scores.reduce((sum, score) => sum + score, 0);
  if (question.trim().length < 8 || totalScore === 0) return 'low' as const;
  if (totalScore >= 5) return 'high' as const;
  return 'medium' as const;
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
      next: activeTables.length ? `Check these org-scoped tables before making live claims: ${activeTables.slice(0, 8).join(', ')}.` : 'No route-specific tables were listed; keep the answer guidance-only.',
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

export function buildSetuGuruBrainAnswer(input: SetuGuruBrainAnswerInput) {
  const question = input.question.trim();
  const route = input.route || DEFAULT_ROUTE;
  const routeHelp = getRouteHelpSummary(route);
  const topic = getBestSetuGuruHelpTopic(question || routeHelp.summary, route);
  const policy = classifySetuGuruResponse(question, route);
  const ranked = buildRepoSources(input)
    .map((source) => ({ source, score: scoreSource(question, source) }))
    .sort((left, right) => right.score - left.score);
  const rows = sourceRows(ranked.map((item) => item.source));
  const confidence = confidenceFor(question, ranked.map((item) => item.score));
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
        policy.reminders.length ? `Policy reminder: ${policy.reminders.join(' ')}` : 'Policy reminder: use page context, live organization data, route help, then research before generic guidance.',
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
