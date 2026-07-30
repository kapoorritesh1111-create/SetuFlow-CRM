// PR65 wrapper that preserves reviewable OpenAI companies in External Discovery.
// A claimed URL is retained for human inspection, while source_evidence records whether
// it matched an opened Responses API web-search source.

import { registerDiscoveryProvider, type ExternalDiscoveryProvider } from '@/lib/setu-guru/discovery-providers';
import { openAiReviewableProvider } from '@/lib/setu-guru/discovery-providers/openai-reviewable';

export const openAiVisibleReviewProvider: ExternalDiscoveryProvider = {
  ...openAiReviewableProvider,
  key: 'openai_visible_review',
  label: 'OpenAI review queue research',
  async search(input) {
    const result = await openAiReviewableProvider.search(input);
    return {
      ...result,
      candidates: result.candidates.map((candidate) => {
        const firstEvidence = candidate.evidence[0] ?? {};
        const claimedSource = String(firstEvidence.claimed_source_url ?? '').trim();
        const validationState = String(firstEvidence.source_validation_state ?? '').trim();
        if (candidate.sourceUrl || !claimedSource || validationState !== 'provider_stated_not_tool_cited') return candidate;
        return {
          ...candidate,
          sourceUrl: claimedSource,
          sourceLabel: 'Research lead — source verification required',
          evidence: candidate.evidence.map((entry) => ({
            ...entry,
            source_validation_state: 'provider_stated_not_tool_cited',
            source_validation_reason: 'OpenAI returned this company and URL, but the URL did not reconcile to the provider web-search source list. Review the website and evidence before verifying, approving, or converting it.',
          })),
        };
      }),
    };
  },
};

registerDiscoveryProvider(openAiVisibleReviewProvider);
