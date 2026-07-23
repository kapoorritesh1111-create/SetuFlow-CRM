import Link from 'next/link';
import { notFound } from 'next/navigation';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingFamilyBySlug, getPackagingTemplates } from '@/lib/packaging/queries';
import { getFamilyVisual } from '@/lib/packaging/family-visuals';
import { estimateStartingPrice } from '@/lib/packaging/pricing-engine';
import { SetuIcon } from '@/components/ui/setu-icon';

/**
 * S24-SPEN-218 — Catalog category detail page (doc page 21, screen "B").
 * One level below the catalog landing: a bookmarkable page per service
 * family showing its rules at a glance and every configurable
 * product/service (pricing template) offered under it.
 */

const PRICING_MODE_LABEL: Record<string, string> = { dimensional: 'Dimensional pricing', service: 'Service pricing' };

export default async function PackagingCategoryDetailPage({ params }: { params: { familySlug: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Catalog" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to Overview" />;
  }

  const supabase = await createClient();
  const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
  if (!verticals.packagingEnabled) notFound();

  const family = await getPackagingFamilyBySlug(workspace.organization.id, params.familySlug, supabase);
  if (!family) notFound();

  const allTemplates = await getPackagingTemplates(workspace.organization.id, supabase);
  const templates = allTemplates.filter((template) => template.family_id === family.id && template.is_active);
  const linkedTemplate = templates[0] ?? null;
  const visual = getFamilyVisual(family.slug, family.icon_key);

  return (
    <div className="space-y-4 pb-16">
      <p className="text-sm text-content-muted">
        <Link href="/products" className="hover:underline">Catalog</Link> / <span className="text-content-primary">{family.name}</span>
      </p>

      <section className="rounded-panel border border-line bg-surface-1 p-5">
        <div className="flex items-start gap-3">
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${visual.bg} ${visual.fg}`}>
            <SetuIcon name={visual.icon} className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-content-primary">{family.name}</h1>
              <span className="rounded-full bg-info-bg px-2.5 py-1 text-xs font-semibold text-info-fg">{PRICING_MODE_LABEL[family.pricing_mode]}</span>
            </div>
            <p className="mt-1 text-sm text-content-secondary">{family.description}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Pricing mode</p>
            <p className="mt-1 text-sm font-semibold text-content-primary">{PRICING_MODE_LABEL[family.pricing_mode]}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Default unit</p>
            <p className="mt-1 text-sm font-semibold text-content-primary">{family.default_unit}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">MOQ</p>
            <p className="mt-1 text-sm font-semibold text-content-primary">{linkedTemplate?.moq_tiers_json?.moq ? linkedTemplate.moq_tiers_json.moq.toLocaleString() : 'Depends on quantity tier'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Lead time</p>
            <p className="mt-1 text-sm font-semibold text-content-primary">{family.default_lead_time ?? linkedTemplate?.lead_time_rules_json?.standard ?? '—'}</p>
          </div>
        </div>

        {linkedTemplate ? (
          <p className="mt-4 text-sm text-content-secondary">
            Linked pricing template: <span className="font-semibold text-content-primary">{linkedTemplate.name}</span>
          </p>
        ) : null}
      </section>

      <section className="rounded-panel border border-line bg-surface-1 p-5">
        <h2 className="text-sm font-bold text-content-primary">Products in this Category</h2>
        <p className="text-sm text-content-secondary">Each row is a configurable packaging service. Price is calculated at quote time — none of these are fixed SKUs.</p>

        {templates.length ? (
          <ul className="mt-3 divide-y divide-line rounded-card border border-line">
            {templates.map((template) => {
              const price = estimateStartingPrice(template);
              return (
                <li key={template.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-content-primary">{template.name}</p>
                    <p className="text-sm text-content-secondary">{template.description}</p>
                    {price ? (
                      <p className="mt-1 text-xs font-semibold text-content-muted">From {price.currency} {price.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / {family.default_unit}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full bg-info-bg px-2.5 py-1 text-xs font-semibold text-info-fg">Configurable</span>
                    <Link href={`/products/${family.slug}/${template.slug}`} className="rounded-ctl border border-line bg-surface-app px-3 py-1.5 text-sm font-semibold text-content-primary hover:border-brand-200">
                      View details →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 rounded-ctl bg-warning-bg px-3 py-2 text-sm font-medium text-warning-fg">No active pricing template yet for this family — an admin should configure one before quoting it.</p>
        )}
      </section>

      <p className="rounded-ctl bg-info-bg px-3 py-2 text-sm font-medium text-info-fg">No need to enter sizes, materials, finishes, quantities, or prices in the catalog. Those are entered during quote creation.</p>
    </div>
  );
}
