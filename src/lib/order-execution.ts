export type OrderExecutionState = 'draft' | 'ready' | 'released' | 'dispatched' | 'completed';

export type OrderExecutionInput = {
  quoteAccepted: boolean;
  hasContract: boolean;
  contractStatus?: string | null;
  contractSignedAt?: string | null;
  commercialLockState?: string | null;
  lineCount: number;
  openDocumentBlockers: number;
  openComplianceBlockers: number;
  currentState?: string | null;
  releasedAt?: string | null;
  dispatchedAt?: string | null;
  completedAt?: string | null;
};

export type OrderExecutionEvaluation = {
  currentState: OrderExecutionState;
  stateLabel: string;
  headline: string;
  summary: string;
  blockers: string[];
  actionItems: string[];
  nextState: OrderExecutionState | null;
  nextStateLabel: string | null;
  canAdvance: boolean;
  releaseBlockers: string[];
  readyBlockers: string[];
  dispatchBlockers: string[];
  completionBlockers: string[];
};

function normalize(value: string | null | undefined) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizeOrderExecutionState(value: string | null | undefined): OrderExecutionState | null {
  const normalized = normalize(value);
  if (normalized === 'draft' || normalized === 'ready' || normalized === 'released' || normalized === 'dispatched' || normalized === 'completed') {
    return normalized;
  }
  return null;
}

export function getOrderExecutionStateLabel(value: string | null | undefined) {
  const state = normalizeOrderExecutionState(value) ?? 'draft';
  if (state === 'ready') return 'Ready for release';
  if (state === 'released') return 'Released to operations';
  if (state === 'dispatched') return 'Dispatched';
  if (state === 'completed') return 'Completed';
  return 'Draft execution';
}

function isSignedContract(status: string | null | undefined, signedAt: string | null | undefined) {
  const normalized = normalize(status);
  return Boolean(signedAt) || ['signed', 'active', 'completed'].includes(normalized);
}

export function evaluateOrderExecution(input: OrderExecutionInput): OrderExecutionEvaluation {
  const persistedState = normalizeOrderExecutionState(input.currentState) ?? 'draft';
  const readyBlockers: string[] = [];
  if (!input.quoteAccepted) readyBlockers.push('Quote must remain accepted before execution can progress.');
  if (!input.hasContract) readyBlockers.push('Contract record is missing from this order handoff.');
  if (!isSignedContract(input.contractStatus, input.contractSignedAt)) readyBlockers.push('Signed contract posture is still missing.');
  if (normalize(input.commercialLockState) !== 'accepted_locked') readyBlockers.push('Commercial lock snapshot is not fully locked yet.');
  if (input.lineCount <= 0) readyBlockers.push('Confirmed quote lines are missing from the order contract.');

  const releaseBlockers = [
    ...readyBlockers,
    ...(input.openDocumentBlockers > 0 ? [`${input.openDocumentBlockers} document blocker${input.openDocumentBlockers === 1 ? '' : 's'} still open.`] : []),
    ...(input.openComplianceBlockers > 0 ? [`${input.openComplianceBlockers} compliance blocker${input.openComplianceBlockers === 1 ? '' : 's'} still open.`] : []),
  ];

  const dispatchBlockers = [
    ...(persistedState === 'released' || persistedState === 'dispatched' || persistedState === 'completed' ? [] : ['Release the order to operations before dispatch.']),
    ...(input.openDocumentBlockers > 0 ? [`${input.openDocumentBlockers} document blocker${input.openDocumentBlockers === 1 ? '' : 's'} still open.`] : []),
    ...(input.openComplianceBlockers > 0 ? [`${input.openComplianceBlockers} compliance blocker${input.openComplianceBlockers === 1 ? '' : 's'} still open.`] : []),
  ];

  const completionBlockers = [
    ...(persistedState === 'dispatched' || persistedState === 'completed' ? [] : ['Mark the order dispatched before completing execution.']),
  ];

  let blockers: string[] = [];
  let actionItems: string[] = [];
  let nextState: OrderExecutionState | null = null;
  let headline = '';
  let summary = '';

  if (persistedState === 'draft') {
    blockers = readyBlockers;
    nextState = 'ready';
    headline = blockers.length === 0 ? 'Order can move to ready posture.' : 'Order is still in draft execution posture.';
    summary = blockers.length === 0 ? 'Commercial continuity is locked and the order can be marked ready for release.' : 'Resolve the commercial and contract prerequisites before release planning begins.';
    actionItems = blockers.length === 0 ? ['Mark the order ready so operations can prepare release.'] : blockers.map((b) => b.replace(/\.$/, ''));
  } else if (persistedState === 'ready') {
    blockers = releaseBlockers;
    nextState = 'released';
    headline = blockers.length === 0 ? 'Order can be released to operations.' : 'Order is ready commercially but not yet releasable operationally.';
    summary = blockers.length === 0 ? 'Document and compliance posture are clear enough to release this order into active operations.' : 'Release is blocked until documents and compliance are fully clear.';
    actionItems = blockers.length === 0 ? ['Release the order to operations.'] : blockers.map((b) => b.replace(/\.$/, ''));
  } else if (persistedState === 'released') {
    blockers = dispatchBlockers;
    nextState = 'dispatched';
    headline = blockers.length === 0 ? 'Order can be marked dispatched.' : 'Order has been released, but dispatch is still blocked.';
    summary = blockers.length === 0 ? 'The order has cleared release and is ready for dispatch confirmation.' : 'Dispatch requires zero open document and compliance blockers.';
    actionItems = blockers.length === 0 ? ['Mark the order dispatched when shipment leaves control.'] : blockers.map((b) => b.replace(/\.$/, ''));
  } else if (persistedState === 'dispatched') {
    blockers = completionBlockers;
    nextState = 'completed';
    headline = blockers.length === 0 ? 'Order can be completed.' : 'Order dispatch is recorded, but completion is still blocked.';
    summary = blockers.length === 0 ? 'Complete the order once dispatch has landed and downstream handoff is satisfied.' : 'Completion depends on dispatch first.';
    actionItems = blockers.length === 0 ? ['Mark the order completed when fulfilment closes.'] : blockers.map((b) => b.replace(/\.$/, ''));
  } else {
    blockers = [];
    nextState = null;
    headline = 'Order execution is complete.';
    summary = 'Commercial continuity remains visible while execution has reached completed posture.';
    actionItems = ['Review downstream compliance and dispatch records if follow-up evidence is still needed.'];
  }

  return {
    currentState: persistedState,
    stateLabel: getOrderExecutionStateLabel(persistedState),
    headline,
    summary,
    blockers,
    actionItems,
    nextState,
    nextStateLabel: nextState ? getOrderExecutionStateLabel(nextState) : null,
    canAdvance: Boolean(nextState) && blockers.length === 0,
    releaseBlockers,
    readyBlockers,
    dispatchBlockers,
    completionBlockers,
  };
}

export function buildOrderExecutionSnapshot(input: OrderExecutionInput) {
  const evaluation = evaluateOrderExecution(input);
  return {
    state: evaluation.currentState,
    state_label: evaluation.stateLabel,
    blockers: evaluation.blockers,
    action_items: evaluation.actionItems,
    next_state: evaluation.nextState,
    next_state_label: evaluation.nextStateLabel,
    ready_blockers: evaluation.readyBlockers,
    release_blockers: evaluation.releaseBlockers,
    dispatch_blockers: evaluation.dispatchBlockers,
    completion_blockers: evaluation.completionBlockers,
    computed_at: new Date().toISOString(),
  };
}
