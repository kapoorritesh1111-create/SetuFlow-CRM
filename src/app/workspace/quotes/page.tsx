export const dynamic = 'force-dynamic';

import { QuoteBuilderLaunchpad } from '@/features/quotes/components/quote-builder-launchpad';

export default function WorkspaceQuotesPage() {
  return (
    <QuoteBuilderLaunchpad
      eyebrow="Workspace preview · Quote builder core"
      title="Quotes workspace preview"
      description="The approved Sprint 4 starting point is the guided quote-builder flow. Use the lead-owned quote workspace for live buyer context and keep this page aligned to that roadmap truth."
    />
  );
}
