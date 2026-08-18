import { WorkspaceState } from '@/components/ui/workspace-state';
import { TradeEventsCommandCenter } from '@/features/trade-events/components/trade-events-command-center';
import { getTradeEventsCommandCenterData } from '@/lib/trade-events/query';
import { getTradeEventRecommendations } from '@/lib/trade-events/recommendations';
import { createClient } from '@/lib/supabase/server';
import { getTradeShowTrialCapabilityState } from '@/lib/trial/trade-show-trial-capabilities';
import { requireWorkspace } from '@/lib/workspace/auth';

type PageSearchParams = { notice?: string | string[]; mode?: string | string[]; locked?: string | string[]; view?: string | string[] };
const first = (value?: string | string[]) => Array.isArray(value) ? value[0] ?? '' : value ?? '';

export default async function TradeEventsPage({ searchParams }: { searchParams?: PageSearchParams }) {
  const workspace = await requireWorkspace();
  if (!workspace.membership || !workspace.organization) return <WorkspaceState eyebrow="Trade events" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to dashboard" />;

  const supabase = await createClient();
  const trialState = await getTradeShowTrialCapabilityState(supabase as any, workspace.organization.id);
  const data = await getTradeEventsCommandCenterData(workspace.organization.id);
  const view = first(searchParams?.view);
  const recommendations = view === 'discover' ? await getTradeEventRecommendations(workspace.organization.id, data) : [];

  return <TradeEventsCommandCenter data={data} recommendations={recommendations} isTradeShowTrial={Boolean(trialState?.isTradeShowTrial)} notice={first(searchParams?.notice)} lockedModule={first(searchParams?.locked)} view={view} />;
}
