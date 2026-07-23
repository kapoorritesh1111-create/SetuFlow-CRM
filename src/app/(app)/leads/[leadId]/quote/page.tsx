import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/ui/empty-state';
import { hasSupabaseEnv } from '@/lib/env';
import { getLeadProfileData } from '@/lib/queries/leads';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import WorkflowToast from '@/features/leads/canonical/WorkflowToast';
import CanonicalQuoteBuilderApprovalQueueV2 from '@/features/quotes/canonical/CanonicalQuoteBuilderApprovalQueueV2';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingFamilies, getPackagingTemplates, getQuoteOptionalCharges, getPackagingSavedSpecs } from '@/lib/packaging/queries';

function readParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function quoteFeedback(searchParams?: { quoteDraftError?: string | string[]; quoteActionError?: string | string[]; saved?: string | string[] }) {
  const actionError = readParam(searchParams?.quoteActionError).trim();
  const draftError = readParam(searchParams?.quoteDraftError).trim();
  const saved = readParam(searchParams?.saved).trim();
  if (actionError) return { kind: 'error' as const, message: `Action could not finish: ${decodeURIComponent(actionError)}` };
  if (draftError) return { kind: 'warning' as const, message: `Quote action needs attention: ${decodeURIComponent(draftError)}` };
  if (saved) return { kind: 'success' as const, message: `Saved ${saved}.` };
  return null;
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

  if (String(data.lead.lead_type || '').toLowerCase() === 'supplier') {
    redirect(`/leads/${params.leadId}?mode=suppliers&quoteDraftError=${encodeURIComponent('Supplier records use Cost Requests, not buyer quotes.')}`);
  }

  const quoteId = readParam(searchParams?.quoteId).trim() || null;
  const selectedQuote = quoteId ? data.quotes.find((quote: any) => quote.id === quoteId) : null;
  if (selectedQuote && String(selectedQuote.status || '').toLowerCase() === 'sent') {
    redirect(`/quotes?status=sent&mode=buyers&quoteId=${selectedQuote.id}`);
  }
  const feedback = quoteFeedback(searchParams);

  // S24-SPEN-203/208: packaging-vertical workspaces get the packaging section
  // inside the canonical builder. Everyone else sees no change.
  let packaging: { enabled: boolean; families: any[]; templates: any[]; charges: any[]; savedSpecs: any[] } | null = null;
  try {
    const supabase = await createClient();
    const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
    if (verticals.packagingEnabled) {
      const sorted = [...data.quotes].sort((a: any, b: any) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));
      const activeQuote = (quoteId ? sorted.find((quote: any) => quote.id === quoteId) : null) ?? sorted[0] ?? null;
      const [families, templates, charges, savedSpecs] = await Promise.all([
        getPackagingFamilies(workspace.organization.id, supabase),
        getPackagingTemplates(workspace.organization.id, supabase),
        activeQuote ? getQuoteOptionalCharges(workspace.organization.id, activeQuote.id, supabase) : Promise.resolve([]),
        getPackagingSavedSpecs(workspace.organization.id, params.leadId, supabase),
      ]);
      packaging = { enabled: true, families, templates, charges, savedSpecs };
    }
  } catch {
    packaging = null;
  }

  return (
    <>
      {feedback ? <WorkflowToast kind={feedback.kind} message={feedback.message} /> : null}
      <CanonicalQuoteBuilderApprovalQueueV2
        data={data}
        quoteId={quoteId}
        step={readParam(searchParams?.step).trim() || null}
        quoteDraftError={readParam(searchParams?.quoteDraftError).trim() ? decodeURIComponent(readParam(searchParams?.quoteDraftError).trim()) : null}
        quoteActionError={readParam(searchParams?.quoteActionError).trim() ? decodeURIComponent(readParam(searchParams?.quoteActionError).trim()) : null}
        saved={readParam(searchParams?.saved).trim() || null}
        packaging={packaging}
      />
    </>
  );
}
