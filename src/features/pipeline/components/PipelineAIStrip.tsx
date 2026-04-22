'use client';

import { AICompactActionBrief } from '@/features/ai/ui/intelligence-panels';

interface PipelineAIStripProps {
  message: string;
}

function deriveBrief(message: string) {
  const normalized = message.trim();
  const lower = normalized.toLowerCase();
  const blocker = lower.includes('blocked') || lower.includes('risk')
    ? normalized
    : `The current rescue board message is "${normalized}".`;
  const tone = lower.includes('critical') || lower.includes('blocked')
    ? 'critical'
    : lower.includes('risk') || lower.includes('follow-up') || lower.includes('quote')
      ? 'warning'
      : 'neutral';
  const nextAction = lower.includes('follow-up')
    ? 'Open the top at-risk card and clear the follow-up owner, timing, or blocker first.'
    : lower.includes('quote')
      ? 'Open the most exposed commercial card and move it to the next governed quote step.'
      : 'Open the highest-risk lane and clear the first visible blocker before moving another stage.';
  return { blocker, tone, nextAction };
}

export function PipelineAIStrip({ message }: PipelineAIStripProps) {
  const brief = deriveBrief(message);
  return (
    <AICompactActionBrief
      lane="Pipeline / Risks"
      where="Rescue board"
      blocker={brief.blocker}
      nextAction={brief.nextAction}
      guardrail="AI explains lane pressure and sequencing. It cannot move stages, bypass readiness, or invent evidence."
      details={[
        message,
        'Use the rescue board as a prioritization surface first, then route into the lead command center for the real governed fix.',
      ]}
      tone={brief.tone}
    />
  );
}
