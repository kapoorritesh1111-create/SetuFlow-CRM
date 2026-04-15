export const dynamic = 'force-dynamic';

import { QuoteBuilderLaunchpad } from '@/features/quotes/components/quote-builder-launchpad';

export default function WorkspaceQuotesPage() {
  return (
    <QuoteBuilderLaunchpad
      eyebrow="Workspace route · Quote builder core"
      title="Quotes workspace"
      description="The guided quote-builder flow is already the repo baseline. Use the lead-owned quote workspace for live buyer context and keep this route aligned to the closed Sprint 4 builder contract, not older preview language."
    />
  );
}
