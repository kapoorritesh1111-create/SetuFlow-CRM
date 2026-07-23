import Link from 'next/link';
import { redirect } from 'next/navigation';
import { EmptyState } from '@/components/ui/empty-state';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient as createServerClientCR } from '@/lib/supabase/server';
import { getEnabledModuleSet as getEnabledCR, normalizeModuleKey as normKeyCR } from '@/lib/modules/module-grants';
import { getLeadProfileData } from '@/lib/queries/leads';
import { createRfq } from '@/features/rfqs/server/actions';

export default async function SupplierCostRequestPage({
  params,
  searchParams,
}: {
  params: { leadId: string };
  searchParams?: { request?: string; mode?: string };
}) {
  let workspace: Awaited<ReturnType<typeof getWorkspaceAccess>> | null = null;
  try { workspace = await getWorkspaceAccess(); } catch {
    return <EmptyState title="Workspace unavailable" description="Could not load workspace. Please refresh." />;
  }
  if (!hasSupabaseEnv || workspace?.missingEnv)
    return <EmptyState title="Configuration required" description="Supabase environment values missing." />;
  if (!workspace?.membership || !workspace?.organization)
    return <EmptyState title="Workspace needed" description="No active organization membership found." />;

  // Module gate: supplier cost requests require supplier_procurement
  {
    const _dbCR = await createServerClientCR();
    const { data: _gCR } = await (_dbCR as any).from('org_module_grants')
      .select('module_key, enabled').eq('organization_id', workspace.organization.id);
    if (Array.isArray(_gCR) && _gCR.length > 0) {
      const _emCR = getEnabledCR(_gCR.map((r: any) => ({ module_key: normKeyCR(r.module_key) ?? r.module_key, enabled: r.enabled })));
      if (!_emCR.has('supplier_procurement')) {
        return <EmptyState title="Supplier Procurement required" description="Creating supplier cost requests requires the Supplier Procurement add-on. Contact your account manager to enable it." />;
      }
    }
  }

  const { leadId } = params;
  let data: Awaited<ReturnType<typeof getLeadProfileData>> | null = null;
  try { data = await getLeadProfileData(workspace.organization.id, leadId); } catch {
    return <EmptyState title="Error loading lead" description="Could not load supplier profile." />;
  }
  if (!data?.lead) return <EmptyState title="Lead not found" description="Supplier profile could not be loaded." />;

  const lead = data.lead;
  // Only supplier leads use this page
  if (String(lead.lead_type ?? '').toLowerCase() !== 'supplier') {
    redirect(`/leads/${leadId}/rfq/new`);
  }

  const isRequestSample = searchParams?.request === 'sample';
  const backHref = `/leads/${leadId}?mode=suppliers`;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-accent-600">Supplier Sourcing</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
          {isRequestSample ? 'Request Sample' : 'Create Cost Request'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isRequestSample
            ? `Send a sample request to ${lead.company_name} before committing to a full sourcing order.`
            : `Send a cost request to ${lead.company_name} to initiate the sourcing conversation.`}
        </p>
      </div>

      {/* Supplier summary */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-sm font-black text-white">
            {String(lead.company_name ?? 'S').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-slate-900">{lead.company_name}</p>
            <p className="text-xs text-slate-500">{lead.country || 'Country not set'} · {lead.email || 'No email'}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form
        action={async (formData: FormData) => {
          'use server';
          // Inject supplier-specific defaults
          if (!formData.get('title')) {
            formData.set('title', isRequestSample
              ? `Sample Request — ${lead.company_name}`
              : `Cost Request — ${lead.company_name}`);
          }
          if (!formData.get('request_summary')) {
            formData.set('request_summary', isRequestSample
              ? `Sample request for quality review`
              : `Sourcing cost request`);
          }
          formData.set('lead_id', leadId);
          const result = await createRfq(undefined, formData);
          if (!result?.error) {
            redirect(`/leads/${leadId}?mode=suppliers#cost_requests`);
          }
        }}
        className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <input type="hidden" name="lead_id" value={leadId} />
        <input type="hidden" name="line_items" value="[]" />
        <input type="hidden" name="supplier_responses" value="[]" />

        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400" htmlFor="cr-title">
            {isRequestSample ? 'Sample Request Title' : 'Cost Request Title'} <span className="text-rose-500">*</span>
          </label>
          <input
            id="cr-title"
            name="title"
            required
            defaultValue={isRequestSample
              ? `Sample Request — ${lead.company_name}`
              : `Cost Request — ${lead.company_name}`}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400" htmlFor="cr-summary">
            {isRequestSample ? 'Sample Details' : 'What do you need? (MOQ, specs, lead time)'} <span className="text-rose-500">*</span>
          </label>
          <textarea
            id="cr-summary"
            name="request_summary"
            required
            rows={4}
            placeholder={isRequestSample
              ? 'Describe the sample required — quantity, spec, packaging, inspection notes...'
              : 'Describe sourcing requirements — product category, MOQ, target price, delivery terms, lead time expected...'}
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400" htmlFor="cr-currency">
              Currency
            </label>
            <select
              id="cr-currency"
              name="currency"
              defaultValue="USD"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
            >
              {['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'INR', 'AED', 'SGD'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-400" htmlFor="cr-needed-by">
              Needed By
            </label>
            <input
              id="cr-needed-by"
              name="needed_by"
              type="date"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400" htmlFor="cr-validity">
            Response Deadline
          </label>
          <input
            id="cr-validity"
            name="validity_date"
            type="date"
            className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
          />
        </div>

        <input type="hidden" name="status" value="draft" />

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-800 transition-colors"
          >
            {isRequestSample ? 'Send Sample Request' : 'Create Cost Request'}
          </button>
          <Link
            href={backHref}
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300 transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>

      {/* Guidance */}
      <div className="rounded-2xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-800">
        <p className="font-semibold">Next steps after saving</p>
        <ul className="mt-2 space-y-1 text-xs">
          <li>· The request will appear in the Cost Requests tab on this supplier&apos;s profile</li>
          <li>· Track supplier responses in the Responses tab</li>
          <li>· Once a response is received, compare offers and move to Approval</li>
        </ul>
      </div>
    </div>
  );
}
