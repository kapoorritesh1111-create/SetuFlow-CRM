import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { getLeadProfileData } from '@/lib/queries/leads';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import CanonicalLeadDetailCompactV2 from '@/features/leads/canonical/CanonicalLeadDetailCompactV2';
import WorkflowToast from '@/features/leads/canonical/WorkflowToast';

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function leadsBackHref(value?: string | string[]) {
  const mode = readParam(value).trim();
  return mode ? `/leads?mode=${encodeURIComponent(mode)}` : '/leads';
}

function savedMessage(value?: string | string[]) {
  const saved = readParam(value).trim();
  if (saved === 'lead') return 'Lead details saved.';
  if (saved === 'follow-up') return 'Follow-up updated.';
  if (saved === 'qualification') return 'Qualification and mapping saved.';
  if (saved === 'stage') return 'Lead stage updated.';
  return '';
}

export default async function Page({
  params,
  searchParams,
}: {
  params: { leadId: string };
  searchParams?: { saved?: string | string[]; stageError?: string | string[]; mode?: string | string[] };
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

  const toastMessage = savedMessage(searchParams?.saved);
  const hasStageError = Boolean(readParam(searchParams?.stageError).trim());

  return (
    <>
      {toastMessage ? <WorkflowToast kind="success" message={toastMessage} /> : null}
      {hasStageError ? <WorkflowToast kind="warning" message="Stage could not update. Try again or refresh before moving stage." /> : null}
      <CanonicalLeadDetailCompactV2
        data={data}
        saved={null}
        stageError={null}
        backHref={leadsBackHref(searchParams?.mode)}
      />
    </>
  );
}
