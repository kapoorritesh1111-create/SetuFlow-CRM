"use client";

import React from 'react';

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