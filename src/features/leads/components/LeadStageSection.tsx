"use client";

import React, { useMemo } from 'react';

// Local copies of the types used in the stage and ownership section.  We
// duplicate these definitions rather than importing from the drawer to avoid
// circular dependencies.  Keep these in sync with the types defined
// elsewhere in the leads feature.
type Stage = { id: string; name: string; pipeline_id: string; sort_order?: number };
type Pipeline = { id: string; name: string };
type Option = { id: string; name: string };
type Profile = { id: string; full_name: string | null; username: string | null };

interface LeadStageSectionProps {
  isQuickMode: boolean;
  availablePipelines: Pipeline[];
  pipelineId: string;
  setPipelineId: (id: string) => void;
  availableStages: Stage[];
  stageId: string;
  setStageId: (id: string) => void;
  followUpAt: string;
  setFollowUpAt: (value: string) => void;
  nextSteps: Option[];
  nextStepId: string;
  setNextStepId: (value: string) => void;
  profiles: Profile[];
  ownerUserId: string;
  setOwnerUserId: (value: string) => void;
  /**
   * Returns the CSS class string for inputs.  Provided by the parent to
   * ensure consistent styling.
   */
  inputClassName: () => string;
}

function isInPersonMeetingStep(name: string) {
  const normalized = name.trim().toLowerCase();
  return normalized.includes('meeting') && (normalized.includes('person') || normalized.includes('in-person') || normalized.includes('in person'));
}

function formatMeetingDateTime(value: string) {
  if (!value) return 'the scheduled date and time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'the scheduled date and time';
  return parsed.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * LeadStageSection encapsulates the pipeline, stage, follow‑up, next step and
 * owner selectors used in the lead drawer.  Extracting this block into
 * its own component reduces the size of lead‑drawer.tsx and makes the
 * form structure easier to reason about.  All state is managed by the
 * parent and passed in via props.
 */
export default function LeadStageSection({
  isQuickMode,
  availablePipelines,
  pipelineId,
  setPipelineId,
  availableStages,
  stageId,
  setStageId,
  followUpAt,
  setFollowUpAt,
  nextSteps,
  nextStepId,
  setNextStepId,
  profiles,
  ownerUserId,
  setOwnerUserId,
  inputClassName,
}: LeadStageSectionProps) {
  // Helper for computing a profile label.  We cannot import labelForProfile
  // from the drawer due to circular dependencies, so we duplicate the logic
  // here.
  const profileLabel = (profile: Profile) => {
    return profile.full_name ?? profile.username ?? 'Unassigned';
  };

  const selectedNextStep = useMemo(
    () => nextSteps.find((step) => step.id === nextStepId) ?? null,
    [nextStepId, nextSteps],
  );

  const suggestedMeetingMessage = useMemo(() => {
    if (!selectedNextStep || !isInPersonMeetingStep(selectedNextStep.name)) return null;
    const when = formatMeetingDateTime(followUpAt);
    return `Hi, just confirming our in-person meeting for ${when}. Looking forward to meeting you and discussing your requirements. Please let me know if there are any changes to the schedule.`;
  }, [followUpAt, selectedNextStep]);

  return (
    <section className="rounded-3xl border border-slate-200 p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {!isQuickMode && (
          <>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Pipeline</span>
              <select value={pipelineId} onChange={(e) => setPipelineId(e.target.value)} className={inputClassName()}>
                {availablePipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Stage</span>
              <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={inputClassName()}>
                {availableStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Follow-up</span>
          <input
            name="next_follow_up_at"
            type="datetime-local"
            value={followUpAt}
            onChange={(e) => setFollowUpAt(e.target.value)}
            className={inputClassName()}
            required
          />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Next step</span>
          <select
            name="next_step_id"
            value={nextStepId}
            onChange={(e) => setNextStepId(e.target.value)}
            className={inputClassName()}
          >
            {nextSteps.map((step) => (
              <option key={step.id} value={step.id}>
                {step.name}
              </option>
            ))}
          </select>
        </label>
        {suggestedMeetingMessage ? (
          <div className="sm:col-span-2 rounded-2xl border border-teal-200 bg-teal-50/70 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">Suggested follow-up message</span>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-teal-700">In-person meeting</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{suggestedMeetingMessage}</p>
          </div>
        ) : null}
        <label className="space-y-2 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Owner</span>
          <select
            name="owner_user_id"
            value={ownerUserId}
            onChange={(e) => setOwnerUserId(e.target.value)}
            className={inputClassName()}
          >
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profileLabel(profile)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
