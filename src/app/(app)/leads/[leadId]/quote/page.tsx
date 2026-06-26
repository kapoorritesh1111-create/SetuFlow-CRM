import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { getLeadProfileData } from '@/lib/queries/leads';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import CanonicalQuoteBuilderApprovalQueueV2 from '@/features/quotes/canonical/CanonicalQuoteBuilderApprovalQueueV2';

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default async function QuotePage({
  params,
  searchParams,
}: {
  params: { leadId: string };
  searchParams?: { quoteId?: string | string[]; step?: string | string[]; quoteDraftError?: string | string[]; quoteActionError?: string | string[]; saved?: string | string[] };
}) {
  let workspace: Awaited<ReturnType<typeof getWorkspaceAccess>> | null = null;
  try {
    workspace = await getWorkspaceAccess();
  } catch {
    return <EmptyState title="Workspace unavailable" description="We were unable to load your workspace. Please refresh or try again later." />;
  }

  if (!hasSupabaseEnv || workspace?.missingEnv) {
    return <EmptyState title="Configuration required" description="SETU Flow needs Supabase environment values in the current environment." />;
  }

  if (!workspace?.membership || !workspace?.organization) {
    return <EmptyState title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." />;
  }

  const data = await getLeadProfileData(workspace.organization.id, params.leadId);
  if (!data?.lead) {
    return <EmptyState title="Lead not found" description="The requested lead could not be loaded from the active workspace." />;
  }

  return (
    <CanonicalQuoteBuilderApprovalQueueV2
      data={data}
      quoteId={readParam(searchParams?.quoteId).trim() || null}
      step={readParam(searchParams?.step).trim() || null}
      quoteDraftError={readParam(searchParams?.quoteDraftError).trim() || null}
      quoteActionError={readParam(searchParams?.quoteActionError).trim() || null}
      saved={readParam(searchParams?.saved).trim() || null}
    />
  );
}
