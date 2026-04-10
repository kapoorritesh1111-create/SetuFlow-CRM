'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import {
  applyAiDraftToCommunication,
  generateAiDraft,
  updateAiDraftReview,
  type AiDraftActionState,
  type AiDraftRow,
} from '@/features/ai/server/actions';
import { CANONICAL_SUGGESTION_TYPES, getSuggestionLabel, normalizeSuggestionType } from '@/lib/ai/suggestion-types';

const initialState: AiDraftActionState = {};

function SubmitButton({
  idleLabel,
  busyLabel,
  tone = 'default',
}: {
  idleLabel: string;
  busyLabel: string;
  tone?: 'default' | 'approve' | 'reject' | 'apply';
}) {
  const { pending } = useFormStatus();
  const toneClass = tone === 'approve'
    ? 'border-emerald-200 text-emerald-700 hover:border-emerald-300'
    : tone === 'reject'
      ? 'border-rose-200 text-rose-700 hover:border-rose-300'
      : tone === 'apply'
        ? 'border-brand-200 bg-brand-50 text-brand-800 hover:border-brand-300'
        : 'border-slate-200 text-slate-700 hover:border-brand-300 hover:text-brand-700';
  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
    >
      {pending ? busyLabel : idleLabel}
    </button>
  );
}

function InlineMessage({ state }: { state: AiDraftActionState }) {
  if (state.error) return <p className="text-xs text-rose-600">{state.error}</p>;
  if (state.success) return <p className="text-xs text-emerald-700">{state.success}</p>;
  return null;
}

export function GenerateDraftButton({
  leadId,
  suggestionType,
  label,
  busyLabel,
  targetEntityType = 'lead',
  targetEntityId,
  compact = false,
}: {
  leadId: string;
  suggestionType: string;
  label: string;
  busyLabel: string;
  targetEntityType?: string;
  targetEntityId?: string;
  compact?: boolean;
}) {
  const [state, action] = useFormState(generateAiDraft, initialState);
  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      <form action={action}>
        <input type="hidden" name="lead_id" value={leadId} />
        <input type="hidden" name="suggestion_type" value={suggestionType} />
        <input type="hidden" name="target_entity_type" value={targetEntityType} />
        <input type="hidden" name="target_entity_id" value={targetEntityId ?? leadId} />
        <SubmitButton idleLabel={label} busyLabel={busyLabel} />
      </form>
      <InlineMessage state={state} />
    </div>
  );
}

export function GenerateLeadDraftControls({ leadId }: { leadId: string }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <GenerateDraftButton leadId={leadId} suggestionType={CANONICAL_SUGGESTION_TYPES.FOLLOW_UP} label="Draft follow-up" busyLabel="Drafting…" />
        <GenerateDraftButton leadId={leadId} suggestionType={CANONICAL_SUGGESTION_TYPES.INTRO} label="Draft intro" busyLabel="Drafting…" />
        <GenerateDraftButton leadId={leadId} suggestionType={CANONICAL_SUGGESTION_TYPES.INTERNAL_SUMMARY} label="Draft internal summary" busyLabel="Drafting…" />
      </div>
      <p className="text-xs text-slate-500">AI stays assistive. Drafts are review-only and never auto-send or change pricing/compliance state.</p>
    </div>
  );
}

export function GenerateFollowUpDraftButton({
  leadId,
  targetEntityType = 'lead',
  targetEntityId,
  compact = false,
}: {
  leadId: string;
  targetEntityType?: string;
  targetEntityId?: string;
  compact?: boolean;
}) {
  return (
    <GenerateDraftButton
      leadId={leadId}
      suggestionType={CANONICAL_SUGGESTION_TYPES.FOLLOW_UP}
      label={compact ? 'AI follow-up' : 'Generate follow-up draft'}
      busyLabel="Drafting…"
      targetEntityType={targetEntityType}
      targetEntityId={targetEntityId}
      compact={compact}
    />
  );
}


export function GenerateQuoteCoverNoteButton({
  leadId,
  quoteId,
  compact = false,
}: {
  leadId: string;
  quoteId: string;
  compact?: boolean;
}) {
  return (
    <GenerateDraftButton
      leadId={leadId}
      suggestionType={CANONICAL_SUGGESTION_TYPES.QUOTE_COVER}
      label={compact ? 'AI cover note' : 'Generate quote cover note'}
      busyLabel="Drafting…"
      targetEntityType="quote"
      targetEntityId={quoteId}
      compact={compact}
    />
  );
}


export function GenerateComplianceNextStepButton({ leadId, targetEntityType = 'lead', targetEntityId, compact = false }: { leadId: string; targetEntityType?: string; targetEntityId?: string; compact?: boolean; }) {
  return (
    <GenerateDraftButton
      leadId={leadId}
      suggestionType={CANONICAL_SUGGESTION_TYPES.COMPLIANCE_NEXT_STEP}
      label={compact ? 'AI next step' : 'Generate compliance next step'}
      busyLabel="Drafting…"
      targetEntityType={targetEntityType}
      targetEntityId={targetEntityId}
      compact={compact}
    />
  );
}

export function GenerateComplianceEvidenceButton({ leadId, targetEntityType = 'lead', targetEntityId, compact = false }: { leadId: string; targetEntityType?: string; targetEntityId?: string; compact?: boolean; }) {
  return (
    <GenerateDraftButton
      leadId={leadId}
      suggestionType={CANONICAL_SUGGESTION_TYPES.COMPLIANCE_EVIDENCE}
      label={compact ? 'AI evidence request' : 'Generate evidence request'}
      busyLabel="Drafting…"
      targetEntityType={targetEntityType}
      targetEntityId={targetEntityId}
      compact={compact}
    />
  );
}

export function SuggestionDecisionControls({ draft }: { draft: AiDraftRow }) {
  const [operatorNotes, setOperatorNotes] = useState(draft.operator_notes ?? '');
  const [reviewState, reviewAction] = useFormState(updateAiDraftReview, initialState);
  const [approveState, approveAction] = useFormState(updateAiDraftReview, initialState);
  const [dismissState, dismissAction] = useFormState(updateAiDraftReview, initialState);
  const [applyState, applyAction] = useFormState(applyAiDraftToCommunication, initialState);
  const canApply = ([
    CANONICAL_SUGGESTION_TYPES.FOLLOW_UP,
    CANONICAL_SUGGESTION_TYPES.INTRO,
    CANONICAL_SUGGESTION_TYPES.QUOTE_COVER,
    CANONICAL_SUGGESTION_TYPES.COMPLIANCE_NEXT_STEP,
    CANONICAL_SUGGESTION_TYPES.COMPLIANCE_EVIDENCE,
  ] as string[]).includes(normalizeSuggestionType(draft.suggestion_type)) && draft.status !== 'applied';

  return (
    <div className="space-y-3">
      <label className="grid gap-2 text-sm text-slate-600">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Operator notes</span>
        <textarea
          value={operatorNotes}
          onChange={(event) => setOperatorNotes(event.target.value)}
          rows={3}
          className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-300"
          placeholder="Add review notes, guardrails, or usage context."
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <form action={reviewAction}>
          <input type="hidden" name="draft_id" value={draft.id} />
          <input type="hidden" name="decision" value="reviewed" />
          <input type="hidden" name="operator_notes" value={operatorNotes} />
          <SubmitButton idleLabel="Mark reviewed" busyLabel="Saving…" />
        </form>
        <form action={approveAction}>
          <input type="hidden" name="draft_id" value={draft.id} />
          <input type="hidden" name="decision" value="approved" />
          <input type="hidden" name="operator_notes" value={operatorNotes} />
          <SubmitButton idleLabel="Approve" busyLabel="Approving…" tone="approve" />
        </form>
        <form action={dismissAction}>
          <input type="hidden" name="draft_id" value={draft.id} />
          <input type="hidden" name="decision" value="dismissed" />
          <input type="hidden" name="operator_notes" value={operatorNotes} />
          <SubmitButton idleLabel="Dismiss" busyLabel="Dismissing…" tone="reject" />
        </form>
        {canApply ? (
          <form action={applyAction}>
            <input type="hidden" name="draft_id" value={draft.id} />
            <input type="hidden" name="operator_notes" value={operatorNotes} />
            <SubmitButton idleLabel="Create communication draft" busyLabel="Applying…" tone="apply" />
          </form>
        ) : null}
      </div>
      <div className="space-y-1">
        <InlineMessage state={reviewState} />
        <InlineMessage state={approveState} />
        <InlineMessage state={dismissState} />
        <InlineMessage state={applyState} />
      </div>
    </div>
  );
}
