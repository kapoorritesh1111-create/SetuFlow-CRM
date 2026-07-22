import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingFamilyBySlug, getPackagingTemplateBySlug } from '@/lib/packaging/queries';
import { getFamilyVisual } from '@/lib/packaging/family-visuals';
import { estimateStartingPrice } from '@/lib/packaging/pricing-engine';
import { SetuIcon } from '@/components/ui/setu-icon';

/**
 * S24-SPEN-218 — Product/service detail page (doc page 21, screen "C").
 * One level below the category page: a single configurable packaging
 * service (pricing template) with the quote-time inputs it collects.
 */

export default async function PackagingProductDetailPage({ params }: { params: { familySlug: string; templateSlug: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Catalog" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to Overview" />;
  }

  const supabase = await createClient();
  const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
  if (!verticals.packagingEnabled) notFound();

  const family = await getPackagingFamilyBySlug(workspace.organization.id, params.familySlug, supabase);
  const template = await getPackagingTemplateBySlug(workspace.organization.id, params.templateSlug, supabase);
  if (!family || !template || template.family_id !== family.id) notFound();

  const visual = getFamilyVisual(family.slug);
  const price = estimateStartingPrice(template);
  const canManageCatalog = hasWorkspaceCapability(workspace.currentRoles, 'catalog.manage');

  return (
    <div className="space-y-4 pb-16">
      <p className="text-sm text-content-muted">
        <Link href="/products" className="hover:underline">Catalog</Link> / <Link href={`/products/${family.slug}`} className="hover:underline">{family.name}</Link> / <span className="text-content-primary">{template.name}</span>
      </p>

      <section className="rounded-panel border border-line bg-surface-1 p-5">
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${visual.bg} ${visual.fg}`}>
            <SetuIcon name={visual.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-content-primary">{template.name}</h1>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${template.is_active ? 'bg-success-bg text-success-fg' : 'bg-warning-bg text-warning-fg'}`}>
                {template.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="mt-1 text-sm text-content-secondary">{template.description}</p>
          </div>
        </div>

        <p className="mt-4 rounded-ctl bg-info-bg px-3 py-2 text-sm font-medium text-info-fg">
          This is a configurable packaging service. Price is calculated at quote time.
        </p>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Quote-time inputs</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {family.quote_time_inputs.map((input) => (
              <span key={input.key} className="rounded-full border border-line bg-surface-app px-3 py-1 text-xs font-semibold text-content-primary">{input.label}</span>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Unit</p>
            <p className="mt-1 text-sm font-semibold text-content-primary">{family.default_unit}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Lead time</p>
            <p className="mt-1 text-sm font-semibold text-content-primary">{template.lead_time_rules_json?.standard ?? family.default_lead_time ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Pricing template</p>
            {canManageCatalog ? (
              <Link href="/admin/packaging-templates" className="mt-1 inline-block text-sm font-semibold text-brand-700 hover:underline">{template.name} →</Link>
            ) : (
              <p className="mt-1 text-sm font-semibold text-content-primary">{template.name}</p>
            )}
          </div>
        </div>

        {price ? (
          <p className="mt-4 text-sm font-semibold text-content-muted">From {price.currency} {price.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {family.default_unit} — final price depends on your quote inputs.</p>
        ) : null}

        <Link
          href={`/leads?packagingFamily=${family.slug}`}
          className="mt-5 flex w-full items-center justify-center rounded-ctl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white sm:w-auto"
        >
          Create quote line →
        </Link>
      </section>
    </div>
  );
}
