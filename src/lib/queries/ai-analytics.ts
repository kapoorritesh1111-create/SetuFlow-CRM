import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import {
  getSuggestionFamily,
  getSuggestionFamilyLabel,
  getSuggestionLabel,
  normalizeSuggestionType,
  type SuggestionFamily,
} from '@/lib/ai/suggestion-types';

const SUPPORTED_WINDOWS = [7, 30, 90] as const;

type SupportedWindow = (typeof SUPPORTED_WINDOWS)[number];

type SuggestionRow = {
  id: string;
  lead_id: string | null;
  suggestion_type: string;
  status: string;
  created_at: string;
  suggested_by: string | null;
  reviewed_by: string | null;
  decided_by: string | null;
  operator_notes: string | null;
  applied_communication_id: string | null;
  reviewed_at: string | null;
  decided_at: string | null;
  updated_at: string | null;
};

export type NeedsAttentionData = {
  thresholds: {
    highDismissalRate: number;
    lowApprovalToApplyRate: number;
    agingApprovedNotAppliedDays: number;
  };
  highDismissalWorkflows: Array<{
    suggestionType: string;
    label: string;
    family: SuggestionFamily;
    generated: number;
    dismissed: number;
    dismissalRate: number;
  }>;
  lowApplyAfterApprovalWorkflows: Array<{
    suggestionType: string;
    label: string;
    family: SuggestionFamily;
    approved: number;
    applied: number;
    pendingApprovedSuggestions: number;
    approvalToApplyConversionRate: number;
    averageApprovalToApplyLagHours: number;
  }>;
  agingApprovedNotApplied: {
    totalApprovedNotApplied: number;
    olderThanThreshold: number;
    buckets: Array<{
      label: string;
      count: number;
    }>;
    suggestions: Array<{
      suggestionId: string;
      suggestionType: string;
      suggestionLabel: string;
      family: SuggestionFamily;
      leadId: string | null;
      leadName: string | undefined;
      approvedAt: string;
      ageDays: number;
    }>;
  };
};

export type AiAnalyticsData = {
  queryIssues: string[];
  windowDays: SupportedWindow;
  summary: {
    totalSuggestions: number;
    suggestionsInWindow: number;
    generatedPerDay: number;
    approvalRate: number;
    applyRate: number;
    overrideRate: number;
    averageApprovalToApplyLagHours: number;
    reviewedRate: number;
    approvalToApplyConversionRate: number;
  };
  workflows: Array<{
    suggestionType: string;
    label: string;
    family: SuggestionFamily;
    generated: number;
    reviewed: number;
    approved: number;
    applied: number;
    dismissed: number;
    reviewedWithNotes: number;
    approvalRate: number;
    applyRate: number;
    reviewRate: number;
    approvalToApplyConversionRate: number;
    averageApprovalToApplyLagHours: number;
  }>;
  workflowFamilies: Array<{
    family: SuggestionFamily;
    label: string;
    generated: number;
    reviewed: number;
    approved: number;
    applied: number;
    dismissed: number;
    approvalRate: number;
    applyRate: number;
    dropOffRate: number;
  }>;
  operators: Array<{
    operatorId: string;
    operatorName: string;
    generated: number;
    reviewed: number;
    approved: number;
    applied: number;
    dismissed: number;
    overrideActions: number;
    reviewToApplyRate: number;
  }>;
  leadHotspots: Array<{
    leadId: string;
    leadName: string;
    totalSuggestions: number;
    complianceSuggestions: number;
    quoteSuggestions: number;
    appliedSuggestions: number;
    overrideActions: number;
    latestSuggestionAt: string | null;
  }>;

  /**
   * Trend data for suggestions within the selected window. Each entry represents
   * a calendar day and aggregates how many suggestions were generated and how
   * many reached review, approval, apply, dismissal, or contain operator
   * feedback. The client can render this into a time series chart. Dates are
   * ISO strings truncated to `YYYY-MM-DD` (UTC) for comparison.
   */
  trend: Array<{
    /** ISO date string for the day (YYYY-MM-DD). */
    date: string;
    generated: number;
    reviewed: number;
    approved: number;
    applied: number;
    dismissed: number;
    withNotes: number;
  }>;

  /**
   * Aggregated feedback information derived from operator notes on AI
   * suggestions. This surface helps admins understand how often operators add
   * feedback, the average note length, and includes a short list of recent
   * notes to allow deeper review. All operator notes remain stored in
   * `ai_suggestions` and no mutation occurs here.
   */
  feedback: {
    /** Total number of suggestions in the window that contain operator notes. */
    totalWithNotes: number;
    /** Average note length in characters across suggestions with notes. */
    averageNoteLength: number;
    /** Most recent suggestions with notes, limited to five entries. */
    recentNotes: Array<{
      /** Suggestion identifier. */
      suggestionId: string;
      /** Normalized suggestion type. */
      suggestionType: string;
      /** Human-friendly label for the suggestion type. */
      suggestionLabel: string;
      /** Associated lead identifier. */
      leadId: string | null;
      /** Associated lead name, if available. */
      leadName: string | undefined;
      /** Operator note text, trimmed. */
      note: string;
      /** Creation timestamp of the suggestion. */
      createdAt: string;
    }>;
  };

  /**
   * Read-only interpretability signals derived from existing suggestion records.
   * These callouts help admins spot workflows that likely need intervention
   * without creating a new workflow state or persistence layer.
   */
  needsAttention: NeedsAttentionData;
};

function pct(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

function roundToOne(value: number) {
  return Math.round(value * 10) / 10;
}

function addIssue(issues: string[], label: string, error: { message?: string } | null) {
  if (error?.message) issues.push(`${label}: ${error.message}`);
}

function normalizeWindow(windowDays?: number): SupportedWindow {
  if (SUPPORTED_WINDOWS.includes((windowDays ?? 30) as SupportedWindow)) {
    return (windowDays ?? 30) as SupportedWindow;
  }
  return 30;
}

function inWindow(timestamp: string | null | undefined, start: number) {
  if (!timestamp) return false;
  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) && value >= start;
}

const HIGH_DISMISSAL_RATE_THRESHOLD = 60;
const LOW_APPROVAL_TO_APPLY_RATE_THRESHOLD = 40;
const AGING_APPROVED_NOT_APPLIED_DAYS_THRESHOLD = 7;
const MAX_NEEDS_ATTENTION_ROWS = 5;

function computeLagHours(row: SuggestionRow) {
  if (!row.decided_at || !row.updated_at) return null;
  const decidedAt = new Date(row.decided_at).getTime();
  const appliedAt = new Date(row.updated_at).getTime();
  if (!Number.isFinite(decidedAt) || !Number.isFinite(appliedAt) || appliedAt < decidedAt) return null;
  return (appliedAt - decidedAt) / (1000 * 60 * 60);
}

function computeAgeDays(timestamp: string, now: number) {
  const value = new Date(timestamp).getTime();
  if (!Number.isFinite(value) || value > now) return 0;
  return Math.floor((now - value) / (1000 * 60 * 60 * 24));
}

export async function getAiAnalyticsData(organizationId: string, windowDaysInput?: number): Promise<AiAnalyticsData | null> {
  if (!hasSupabaseEnv) return null;
  const windowDays = normalizeWindow(windowDaysInput);
  const supabase = await createClient();
  const issues: string[] = [];

  const [aiSuggestions, profiles, leads] = await Promise.all([
    (supabase as any)
      .from('ai_suggestions')
      .select('id, lead_id, suggestion_type, status, created_at, suggested_by, reviewed_by, decided_by, operator_notes, applied_communication_id, reviewed_at, decided_at, updated_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(1500),
    supabase.from('profiles').select('id, full_name, username').limit(1000),
    supabase.from('leads').select('id, company_name').eq('organization_id', organizationId).limit(1000),
  ]);

  addIssue(issues, 'ai analytics suggestions', aiSuggestions.error as any);
  addIssue(issues, 'ai analytics profiles', profiles.error as any);
  addIssue(issues, 'ai analytics leads', leads.error as any);

  const suggestions = ((aiSuggestions.data ?? []) as SuggestionRow[]);
  const profileMap = new Map(((profiles.data ?? []) as Array<{ id: string; full_name: string | null; username: string | null }>).map((item) => [item.id, item]));
  const leadMap = new Map(((leads.data ?? []) as Array<{ id: string; company_name: string | null }>).map((item) => [item.id, item.company_name || `Lead ${item.id.slice(0, 8)}`]));

  const now = Date.now();
  const windowStart = now - windowDays * 24 * 60 * 60 * 1000;
  const inRangeSuggestions = suggestions.filter((item) => inWindow(item.created_at, windowStart));

  const grouped = new Map<string, AiAnalyticsData['workflows'][number]>();
  const families = new Map<SuggestionFamily, AiAnalyticsData['workflowFamilies'][number]>();
  const operators = new Map<string, AiAnalyticsData['operators'][number]>();
  const leadHotspots = new Map<string, AiAnalyticsData['leadHotspots'][number]>();

  let approvedCount = 0;
  let appliedCount = 0;
  let reviewedCount = 0;
  let overrideCount = 0;
  let lagSum = 0;
  let lagCount = 0;
  let approvalToApplyCount = 0;

  for (const row of inRangeSuggestions) {
    const normalizedType = normalizeSuggestionType(row.suggestion_type);
    const family = getSuggestionFamily(normalizedType);
    const isReviewed = row.status === 'reviewed' || row.status === 'approved' || row.status === 'dismissed' || row.status === 'applied';
    const isApproved = row.status === 'approved' || row.status === 'applied';
    const isApplied = row.status === 'applied' || Boolean(row.applied_communication_id);
    const isDismissed = row.status === 'dismissed';
    const hasNotes = Boolean(row.operator_notes?.trim());

    const workflow = grouped.get(normalizedType) ?? {
      suggestionType: normalizedType,
      label: getSuggestionLabel(normalizedType),
      family,
      generated: 0,
      reviewed: 0,
      approved: 0,
      applied: 0,
      dismissed: 0,
      reviewedWithNotes: 0,
      approvalRate: 0,
      applyRate: 0,
      reviewRate: 0,
      approvalToApplyConversionRate: 0,
      averageApprovalToApplyLagHours: 0,
    };
    workflow.generated += 1;
    if (isReviewed) workflow.reviewed += 1;
    if (isApproved) workflow.approved += 1;
    if (isApplied) workflow.applied += 1;
    if (isDismissed) workflow.dismissed += 1;
    if (hasNotes) workflow.reviewedWithNotes += 1;

    const lagHours = isApplied ? computeLagHours(row) : null;
    if (lagHours != null) {
      workflow.averageApprovalToApplyLagHours += lagHours;
    }
    grouped.set(normalizedType, workflow);

    const familyRow = families.get(family) ?? {
      family,
      label: getSuggestionFamilyLabel(normalizedType),
      generated: 0,
      reviewed: 0,
      approved: 0,
      applied: 0,
      dismissed: 0,
      approvalRate: 0,
      applyRate: 0,
      dropOffRate: 0,
    };
    familyRow.generated += 1;
    if (isReviewed) familyRow.reviewed += 1;
    if (isApproved) familyRow.approved += 1;
    if (isApplied) familyRow.applied += 1;
    if (isDismissed) familyRow.dismissed += 1;
    families.set(family, familyRow);

    if (row.lead_id) {
      const leadRow = leadHotspots.get(row.lead_id) ?? {
        leadId: row.lead_id,
        leadName: leadMap.get(row.lead_id) ?? `Lead ${row.lead_id.slice(0, 8)}`,
        totalSuggestions: 0,
        complianceSuggestions: 0,
        quoteSuggestions: 0,
        appliedSuggestions: 0,
        overrideActions: 0,
        latestSuggestionAt: null,
      };
      leadRow.totalSuggestions += 1;
      if (family === 'compliance') leadRow.complianceSuggestions += 1;
      if (family === 'quote') leadRow.quoteSuggestions += 1;
      if (isApplied) leadRow.appliedSuggestions += 1;
      if (hasNotes || isDismissed) leadRow.overrideActions += 1;
      if (!leadRow.latestSuggestionAt || row.created_at > leadRow.latestSuggestionAt) {
        leadRow.latestSuggestionAt = row.created_at;
      }
      leadHotspots.set(row.lead_id, leadRow);
    }

    const actorIds = [row.suggested_by, row.reviewed_by, row.decided_by].filter(Boolean) as string[];
    for (const actorId of actorIds) {
      const profile = profileMap.get(actorId);
      const operator = operators.get(actorId) ?? {
        operatorId: actorId,
        operatorName: profile?.full_name || profile?.username || actorId.slice(0, 8),
        generated: 0,
        reviewed: 0,
        approved: 0,
        applied: 0,
        dismissed: 0,
        overrideActions: 0,
        reviewToApplyRate: 0,
      };
      if (row.suggested_by === actorId) operator.generated += 1;
      if (row.reviewed_by === actorId) operator.reviewed += 1;
      if (row.decided_by === actorId && row.status === 'approved') operator.approved += 1;
      if (row.decided_by === actorId && row.status === 'dismissed') operator.dismissed += 1;
      if (row.reviewed_by === actorId && hasNotes) operator.overrideActions += 1;
      if (row.applied_communication_id && row.decided_by === actorId) operator.applied += 1;
      operators.set(actorId, operator);
    }

    if (isReviewed) reviewedCount += 1;
    if (isApproved) approvedCount += 1;
    if (isApplied) appliedCount += 1;
    if (hasNotes || isDismissed) overrideCount += 1;
    if (isApproved && isApplied) approvalToApplyCount += 1;
    if (lagHours != null) {
      lagSum += lagHours;
      lagCount += 1;
    }
  }

  const workflows = Array.from(grouped.values())
    .map((workflow) => {
      const workflowSuggestions = inRangeSuggestions.filter((item) => normalizeSuggestionType(item.suggestion_type) === workflow.suggestionType);
      const workflowLagRows = workflowSuggestions
        .filter((item) => item.status === 'applied' || item.applied_communication_id)
        .map((item) => computeLagHours(item))
        .filter((value): value is number => value != null);
      const avgLag = workflowLagRows.length ? roundToOne(workflowLagRows.reduce((sum, value) => sum + value, 0) / workflowLagRows.length) : 0;
      return {
        ...workflow,
        approvalRate: pct(workflow.approved, workflow.generated),
        applyRate: pct(workflow.applied, workflow.generated),
        reviewRate: pct(workflow.reviewed, workflow.generated),
        approvalToApplyConversionRate: pct(workflow.applied, workflow.approved),
        averageApprovalToApplyLagHours: avgLag,
      };
    })
    .sort((left, right) => right.generated - left.generated || left.label.localeCompare(right.label));

  const workflowFamilies = Array.from(families.values())
    .map((family) => ({
      ...family,
      approvalRate: pct(family.approved, family.generated),
      applyRate: pct(family.applied, family.generated),
      dropOffRate: pct(family.generated - family.applied, family.generated),
    }))
    .sort((left, right) => right.generated - left.generated || left.label.localeCompare(right.label));

  const operatorRows = Array.from(operators.values())
    .map((operator) => ({
      ...operator,
      reviewToApplyRate: pct(operator.applied, operator.reviewed),
    }))
    .sort((left, right) => right.reviewed - left.reviewed || right.generated - left.generated || left.operatorName.localeCompare(right.operatorName));

  const hotspotRows = Array.from(leadHotspots.values())
    .sort((left, right) => right.totalSuggestions - left.totalSuggestions || right.overrideActions - left.overrideActions || left.leadName.localeCompare(right.leadName))
    .slice(0, 12);

  const totalSuggestions = suggestions.length;
  const suggestionsInWindow = inRangeSuggestions.length;
  // Build trend data for each day in the window. We construct an entry per calendar
  // day in the selected time window (UTC) to ensure contiguous coverage even on
  // days with zero suggestions. Each date key aggregates how many suggestions
  // were generated, reviewed, approved, applied, dismissed, or include notes.
  const trendMap = new Map<string, { date: string; generated: number; reviewed: number; approved: number; applied: number; dismissed: number; withNotes: number }>();
  // Populate counts based on in-range suggestions
  for (const row of inRangeSuggestions) {
    const date = new Date(row.created_at).toISOString().slice(0, 10);
    const entry = trendMap.get(date) ?? { date, generated: 0, reviewed: 0, approved: 0, applied: 0, dismissed: 0, withNotes: 0 };
    entry.generated += 1;
    // Determine state flags consistent with earlier logic
    const isReviewed = row.status === 'reviewed' || row.status === 'approved' || row.status === 'dismissed' || row.status === 'applied';
    const isApproved = row.status === 'approved' || row.status === 'applied';
    const isApplied = row.status === 'applied' || Boolean(row.applied_communication_id);
    const isDismissed = row.status === 'dismissed';
    const hasNotes = Boolean(row.operator_notes?.trim());
    if (isReviewed) entry.reviewed += 1;
    if (isApproved) entry.approved += 1;
    if (isApplied) entry.applied += 1;
    if (isDismissed) entry.dismissed += 1;
    if (hasNotes) entry.withNotes += 1;
    trendMap.set(date, entry);
  }
  // Fill missing days with zero values
  const trendArray: AiAnalyticsData['trend'] = [];
  const currentDate = new Date();
  currentDate.setUTCHours(0, 0, 0, 0);
  for (let i = windowDays - 1; i >= 0; i--) {
    const date = new Date(currentDate.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const existing = trendMap.get(date);
    trendArray.push(
      existing ?? {
        date,
        generated: 0,
        reviewed: 0,
        approved: 0,
        applied: 0,
        dismissed: 0,
        withNotes: 0,
      },
    );
  }

  // Aggregate feedback information from operator notes. Notes come from
  // suggestions within the window that include non-empty operator_notes. We do
  // not mutate any records; this is purely a read-only aggregation for analytics.
  const noteRows = inRangeSuggestions.filter((row) => Boolean(row.operator_notes?.trim()));
  const totalWithNotes = noteRows.length;
  const averageNoteLength = totalWithNotes
    ? Math.round(
        noteRows.reduce((sum, r) => sum + (r.operator_notes?.trim().length ?? 0), 0) / totalWithNotes,
      )
    : 0;
  // Sort by creation timestamp descending to pick the most recent notes
  const recentNotes = noteRows
    .sort((a, b) => {
      const tsA = new Date(a.created_at).getTime();
      const tsB = new Date(b.created_at).getTime();
      return tsB - tsA;
    })
    .slice(0, 5)
    .map((row) => {
      const normalizedType = normalizeSuggestionType(row.suggestion_type);
      return {
        suggestionId: row.id,
        suggestionType: normalizedType,
        suggestionLabel: getSuggestionLabel(normalizedType),
        leadId: row.lead_id,
        leadName: row.lead_id ? leadMap.get(row.lead_id) : undefined,
        note: row.operator_notes?.trim() ?? '',
        createdAt: row.created_at,
      };
    });

  const highDismissalWorkflows: NeedsAttentionData['highDismissalWorkflows'] = workflows
    .map((workflow) => ({
      suggestionType: workflow.suggestionType,
      label: workflow.label,
      family: workflow.family,
      generated: workflow.generated,
      dismissed: workflow.dismissed,
      dismissalRate: pct(workflow.dismissed, workflow.generated),
    }))
    .filter((workflow) => workflow.dismissalRate >= HIGH_DISMISSAL_RATE_THRESHOLD)
    .sort((left, right) => right.dismissalRate - left.dismissalRate || right.dismissed - left.dismissed || left.label.localeCompare(right.label))
    .slice(0, MAX_NEEDS_ATTENTION_ROWS);

  const lowApplyAfterApprovalWorkflows: NeedsAttentionData['lowApplyAfterApprovalWorkflows'] = workflows
    .filter((workflow) => workflow.approved > 0)
    .map((workflow) => ({
      suggestionType: workflow.suggestionType,
      label: workflow.label,
      family: workflow.family,
      approved: workflow.approved,
      applied: workflow.applied,
      pendingApprovedSuggestions: Math.max(workflow.approved - workflow.applied, 0),
      approvalToApplyConversionRate: workflow.approvalToApplyConversionRate,
      averageApprovalToApplyLagHours: workflow.averageApprovalToApplyLagHours,
    }))
    .filter((workflow) => workflow.approvalToApplyConversionRate <= LOW_APPROVAL_TO_APPLY_RATE_THRESHOLD)
    .sort((left, right) => left.approvalToApplyConversionRate - right.approvalToApplyConversionRate || right.pendingApprovedSuggestions - left.pendingApprovedSuggestions || left.label.localeCompare(right.label))
    .slice(0, MAX_NEEDS_ATTENTION_ROWS);

  const approvedNotAppliedSuggestions = inRangeSuggestions
    .filter((row) => row.status === 'approved' && !row.applied_communication_id && row.decided_at)
    .map((row) => {
      const normalizedType = normalizeSuggestionType(row.suggestion_type);
      const approvedAt = row.decided_at as string;
      return {
        suggestionId: row.id,
        suggestionType: normalizedType,
        suggestionLabel: getSuggestionLabel(normalizedType),
        family: getSuggestionFamily(normalizedType),
        leadId: row.lead_id,
        leadName: row.lead_id ? leadMap.get(row.lead_id) : undefined,
        approvedAt,
        ageDays: computeAgeDays(approvedAt, now),
      };
    })
    .sort((left, right) => right.ageDays - left.ageDays || right.approvedAt.localeCompare(left.approvedAt));

  const agingApprovedNotApplied: NeedsAttentionData['agingApprovedNotApplied'] = {
    totalApprovedNotApplied: approvedNotAppliedSuggestions.length,
    olderThanThreshold: approvedNotAppliedSuggestions.filter((row) => row.ageDays >= AGING_APPROVED_NOT_APPLIED_DAYS_THRESHOLD).length,
    buckets: [
      {
        label: '0-3d',
        count: approvedNotAppliedSuggestions.filter((row) => row.ageDays <= 3).length,
      },
      {
        label: '4-7d',
        count: approvedNotAppliedSuggestions.filter((row) => row.ageDays >= 4 && row.ageDays <= 7).length,
      },
      {
        label: '8-14d',
        count: approvedNotAppliedSuggestions.filter((row) => row.ageDays >= 8 && row.ageDays <= 14).length,
      },
      {
        label: '15d+',
        count: approvedNotAppliedSuggestions.filter((row) => row.ageDays >= 15).length,
      },
    ],
    suggestions: approvedNotAppliedSuggestions
      .filter((row) => row.ageDays >= AGING_APPROVED_NOT_APPLIED_DAYS_THRESHOLD)
      .slice(0, MAX_NEEDS_ATTENTION_ROWS),
  };

  return {
    queryIssues: issues,
    windowDays,
    summary: {
      totalSuggestions,
      suggestionsInWindow,
      generatedPerDay: roundToOne(suggestionsInWindow / windowDays),
      approvalRate: pct(approvedCount, suggestionsInWindow),
      applyRate: pct(appliedCount, suggestionsInWindow),
      overrideRate: pct(overrideCount, suggestionsInWindow),
      averageApprovalToApplyLagHours: lagCount ? roundToOne(lagSum / lagCount) : 0,
      reviewedRate: pct(reviewedCount, suggestionsInWindow),
      approvalToApplyConversionRate: pct(approvalToApplyCount, approvedCount),
    },
    workflows,
    workflowFamilies,
    operators: operatorRows,
    leadHotspots: hotspotRows,
    trend: trendArray,
    feedback: {
      totalWithNotes,
      averageNoteLength,
      recentNotes,
    },
    needsAttention: {
      thresholds: {
        highDismissalRate: HIGH_DISMISSAL_RATE_THRESHOLD,
        lowApprovalToApplyRate: LOW_APPROVAL_TO_APPLY_RATE_THRESHOLD,
        agingApprovedNotAppliedDays: AGING_APPROVED_NOT_APPLIED_DAYS_THRESHOLD,
      },
      highDismissalWorkflows,
      lowApplyAfterApprovalWorkflows,
      agingApprovedNotApplied,
    },
  };
}
