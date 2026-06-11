// S24-TRIAL-205 Pass C: Setu Guru trial coach.
// Pure, deterministic guidance composed from the trial capability snapshot,
// the derived journey (deriveTrialJourney), and the tour registry. The org
// must be a guided trial — resolveTrialCoachContext returns null otherwise,
// which is the hard rule that keeps trial context out of paying-org answers.

import { createClient } from '@/lib/supabase/server';
import { getTrialCapability, type TrialCapability } from '@/lib/trial/capability';
import { getTrialTemplateConfig } from '@/lib/trial/templates';
import {
  deriveTrialJourney,
  getTourStep,
  isTourStepId,
  TOUR_STEPS,
  type TourStep,
  type TrialJourneyMilestone,
} from '@/lib/trial/tour-registry';

export type TrialShowStepAction = {
  type: 'show_step';
  stepId: string;
  route: string;
  title: string;
};

export type TrialCoachContext = {
  capability: TrialCapability;
  journey: TrialJourneyMilestone[];
  nextMilestone: TrialJourneyMilestone | null;
  suggestedStep: TourStep | null;
};

const JOURNEY_QUESTION_PHRASES = [
  'what next',
  'what do i do next',
  'what should i do next',
  'what do i do now',
  'what should i do',
  'next step',
  'where do i start',
  'how do i start',
  'how do i begin',
  'guide me',
  'walk me through',
  'show me what to do',
  'i am stuck',
  "i'm stuck",
  'stuck',
  'trial journey',
  'trial guide',
  'guided trial',
  'replay the tour',
  'show the tour',
  'start the tour',
];

export function isTrialJourneyQuestion(question: string): boolean {
  const q = question.toLowerCase();
  return JOURNEY_QUESTION_PHRASES.some((phrase) => q.includes(phrase));
}

function remainingLabel(value: number | null) {
  return value === null ? 'unlimited' : String(value);
}

export function buildShowStepAction(stepId: string): TrialShowStepAction | null {
  if (!isTourStepId(stepId)) return null;
  const step = getTourStep(stepId);
  if (!step) return null;
  return { type: 'show_step', stepId: step.id, route: step.route, title: step.title };
}

/**
 * Loads trial coach context for an organization. Returns null for any org that
 * is not an active guided trial — callers can treat null as "no trial context".
 */
export async function resolveTrialCoachContext(organizationId: string): Promise<TrialCoachContext | null> {
  const { capability } = await getTrialCapability(organizationId);
  if (!capability?.is_trial || !capability.guided_mode_enabled) return null;

  let hasDispatchedOrder = false;
  try {
    const db: any = await createClient();
    const { count } = await db
      .from('contracts')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('execution_state', ['dispatched', 'completed']);
    hasDispatchedOrder = Boolean(count && count > 0);
  } catch {
    // Dispatch milestone stays pending if the count query fails — never block coaching.
  }

  const journey = deriveTrialJourney(capability, { hasDispatchedOrder });
  const nextMilestone = journey.find((milestone) => !milestone.done) ?? null;
  const suggestedStep = nextMilestone
    ? TOUR_STEPS.filter((step) => step.milestone === nextMilestone.id).sort((a, b) => a.order - b.order)[0] ?? null
    : null;

  return { capability, journey, nextMilestone, suggestedStep };
}

export type TrialCoachAnswer = {
  answer: string;
  confidence: 'high';
  mode: 'trial_journey';
  rows: Array<Record<string, unknown>>;
  actions: string[];
  actionHref: string | null;
  actionHrefs: Record<string, string | null>;
  trialAction: TrialShowStepAction | null;
};

export function buildTrialCoachAnswer(context: TrialCoachContext, organizationName: string): TrialCoachAnswer {
  const { capability, journey, nextMilestone, suggestedStep } = context;
  const template = getTrialTemplateConfig(capability.trial_template_key);
  const done = journey.filter((milestone) => milestone.done).length;

  const progressLine = `Trial journey for ${organizationName} (${template.label}): ${done} of ${journey.length} milestones complete — ${journey
    .map((milestone) => `${milestone.done ? '✓' : '○'} ${milestone.label}`)
    .join(' · ')}.`;

  const limitsLine = `Remaining on this guided trial: ${remainingLabel(capability.remaining_leads)} lead(s), ${remainingLabel(capability.remaining_quotes)} quote(s), ${remainingLabel(capability.remaining_orders)} order(s)${capability.trial_ends_at ? `, until ${capability.trial_ends_at.slice(0, 10)}` : ''}.`;

  const nextLine = nextMilestone
    ? `Your next step: ${nextMilestone.label}. ${nextMilestone.detail}${suggestedStep ? ` Tap “Show me” and I will highlight the exact button on the ${suggestedStep.route.replace('/', '')} page.` : ''}`
    : 'You have completed the full lead-to-dispatch journey — explore Products, Tasks, and Trade Events, or convert this workspace to keep your data.';

  const rows = journey.map((milestone, index) => ({
    id: milestone.id,
    step: index + 1,
    milestone: milestone.label,
    status: milestone.done ? 'Complete' : 'Pending',
    next: milestone.detail,
  }));

  const actions = ['Open trial guide'];
  const actionHrefs: Record<string, string | null> = { 'Open trial guide': '/trial' };
  if (suggestedStep) {
    actions.unshift(`Go to ${suggestedStep.route.replace('/', '')}`);
    actionHrefs[`Go to ${suggestedStep.route.replace('/', '')}`] = suggestedStep.route;
  }

  return {
    answer: [progressLine, limitsLine, nextLine].join('\n\n'),
    confidence: 'high',
    mode: 'trial_journey',
    rows,
    actions,
    actionHref: suggestedStep?.route ?? '/trial',
    actionHrefs,
    trialAction: suggestedStep ? buildShowStepAction(suggestedStep.id) : null,
  };
}
