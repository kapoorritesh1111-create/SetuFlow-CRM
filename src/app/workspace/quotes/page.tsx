export const dynamic = 'force-dynamic';

import { QuoteBuilderLaunchpad } from '@/features/quotes/components/quote-builder-launchpad';

export default function WorkspaceQuotesPage() {
  return (
    <QuoteBuilderLaunchpad
      eyebrow="Workspace preview · Quote builder"
      title="Quotes workspace preview"
      description="The approved quote-builder route is the guided quote-builder flow. Use the lead-owned quote workspace for live buyer context and keep this page aligned to the completed Sprint 4 baseline."
    />
  );
}
