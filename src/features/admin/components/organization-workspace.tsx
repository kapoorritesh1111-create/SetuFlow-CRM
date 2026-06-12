import Link from 'next/link';
import { KitCompatSectionCard as SectionCard } from '@/features/admin/components/admin-ui-kit';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState } from '@/components/ui/empty-state';
import { AICompactActionBrief } from '@/features/ai/ui/intelligence-panels';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { WorkspaceHeader, ToolbarStat, WorkspaceToolbar } from '@/components/ui/workspace-toolbar';
import { formatDate, formatDateTime } from '@/lib/utils';
import type { AdminGovernanceSummaryItem, MissingGovernanceItem } from '@/features/admin/admin-governance';

type OverviewStat = {
  label: string;
  value: string | number;
  helper?: string;
};

type PreviewRow = {
  id: string;
  name: string;
  email: string | null;
  roleName: string | null;
  status: string;
  updatedAt: string | null;
  destination: '/admin/users' | '/admin/invitations';
};

type RoleSummary = {
  id: string;
  name: string;
  description: string | null;
  scope: 'organization' | 'global';
  activeAssignments: number;
  pendingInvites: number;
};

function getTone(status: string) {
  if (status === 'active' || status === 'accepted') return 'success' as const;
  if (status === 'sent') return 'info' as const;
  if (status === 'pending' || status === 'draft' || status === 'invited') return 'warning' as const;
  if (status === 'disabled' || status === 'revoked' || status === 'expired' || status === 'failed') return 'danger' as const;
  return 'neutral' as const;
}

export function OrganizationWorkspace({
  organizationName,
  organizationSlug,
  defaultCurrency,
  createdAt,
  updatedAt,
  myRoleLabel,
  canManageGovernance,
  governanceContext,
  overviewStats,
  userPreview,
  invitationPreview,
  roleSummaries,
  settingsSummaries,
}: {
  organizationName: string;
  organizationSlug: string;
  defaultCurrency: string | null;
  createdAt: string;
  updatedAt: string;
  myRoleLabel: string;
  canManageGovernance: boolean;
  governanceContext: {
    missingCount: number;
    isReady: boolean;
    missingItems: MissingGovernanceItem[];
  };
  overviewStats: OverviewStat[];
  userPreview: PreviewRow[];
  invitationPreview: PreviewRow[];
  roleSummaries: RoleSummary[];
  settingsSummaries: AdminGovernanceSummaryItem[];
}) {
  const blockerSummary = !governanceContext.isReady
    ? `${governanceContext.missingCount} governance gaps still need owner/admin attention.`
    : 'No critical governance blocker is visible on this overview.';
  const primaryLaneHref = !governanceContext.isReady
    ? governanceContext.missingItems[0]?.href ?? '/admin/organization#settings-lists'
    : '/admin/users';
  const primaryLaneLabel = !governanceContext.isReady
    ? `Fix ${governanceContext.missingItems[0]?.label ?? 'governance gap'}`
    : 'Open users';

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        eyebrow="Admin"
        title="Organization workspace"
        description={`Where am I: organization governance. What is blocking me: ${blockerSummary} What do I do next: ${primaryLaneLabel.toLowerCase()} first, then leave the rest alone.`}
        badge={organizationName}
        actions={
          <>
            <Link href={primaryLaneHref} className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">{primaryLaneLabel}</Link>
            <Link href="/admin/invitations" className="inline-flex min-h-12 items-center justify-center rounded-[9px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Invitations</Link>
            <Link href="/admin/organization#settings-lists" className="inline-flex min-h-12 items-center justify-center rounded-[9px] border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Settings lists</Link>
          </>
        }
        meta={
          <>
            <ToolbarStat label="My role" value={myRoleLabel} tone="info" />
            <ToolbarStat label="Governance gaps" value={String(governanceContext.missingCount)} tone={governanceContext.isReady ? 'success' : 'warning'} />
            <ToolbarStat label="Default currency" value={defaultCurrency ?? 'Unset'} tone={defaultCurrency ? 'default' : 'warning'} />
          </>
        }
      />

      <WorkspaceToolbar
        metaSlot={
          <div className="flex flex-wrap gap-2">
            <ToolbarStat label={blockerSummary} tone={governanceContext.isReady ? 'success' : 'warning'} />
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewStats.map((item) => (
          <StatCard key={item.label} label={item.label} value={item.value} helper={item.helper} />
        ))}
      </div>

      {!canManageGovernance ? (
        <StateMessage
          title="Admin-view state"
          description="You can review people, invitation health, audit visibility, and governance readiness from this screen, but owner-level governance changes remain protected. Use the linked admin routes for allowed actions and keep owner-only escalation contained."
          tone="warning"
        />
      ) : null}

      {!governanceContext.isReady ? (
        <SectionCard>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Missing governance context</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Some operational surfaces are running without full admin setup</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Open the first gap, fix it, then leave this overview. The list stays short so governance repair does not turn into a reading task.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge label={`${governanceContext.missingCount} gaps`} tone="warning" />
              <Link href="/reports" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Open reports</Link>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {governanceContext.missingItems.map((item) => (
              <div key={item.label} className="rounded-[1.5rem] border border-amber-200 bg-amber-50/70 p-4">
                <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{item.reason}</p>
                {item.href ? (
                  <Link href={item.href} className="mt-3 inline-flex text-sm font-semibold text-amber-800 hover:text-amber-900">Resolve in admin →</Link>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Organization overview</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{organizationName}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep organization identity, people access, and settings readiness visible from one admin surface without forcing a long scan first.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge label={myRoleLabel} tone="info" />
              <StatusBadge label={defaultCurrency ? `Default ${defaultCurrency}` : 'Currency unset'} tone="neutral" />
              <StatusBadge label={governanceContext.isReady ? 'Governance ready' : 'Governance incomplete'} tone={governanceContext.isReady ? 'success' : 'warning'} />
            </div>
          </div>

          <dl className="mt-6 grid gap-4 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Slug</dt>
              <dd className="mt-2 font-medium text-slate-900">{organizationSlug}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Created</dt>
              <dd className="mt-2 font-medium text-slate-900">{formatDate(createdAt)}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Last updated</dt>
              <dd className="mt-2 font-medium text-slate-900">{formatDateTime(updatedAt)}</dd>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Primary settings</dt>
              <dd className="mt-2 font-medium text-slate-900">Reference lists</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quick actions</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Manage organization workspace</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                One lane should win first. Use the primary action above, make the change, then leave unless a second admin move is truly needed.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/admin/users" className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:bg-slate-50">
              <p className="text-sm font-semibold text-slate-900">Users</p>
              <p className="mt-1 text-sm text-slate-600">Review members, reset access, and adjust roles inside the existing users workspace.</p>
            </Link>
            <Link href="/admin/invitations" className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:bg-slate-50">
              <p className="text-sm font-semibold text-slate-900">Invitations</p>
              <p className="mt-1 text-sm text-slate-600">Create, resend, revoke, and monitor open invites without leaving the admin lane.</p>
            </Link>
            <Link href="/contact-exchange/vcard" className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:bg-slate-50">
              <p className="text-sm font-semibold text-slate-900">My Card settings</p>
              <p className="mt-1 text-sm text-slate-600">Update the digital vCard, social links, QR destination, and public share details used by signed-in workspace users.</p>
            </Link>
            <Link href="/admin/organization#settings-lists" className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:bg-slate-50">
              <p className="text-sm font-semibold text-slate-900">Settings lists</p>
              <p className="mt-1 text-sm text-slate-600">Maintain organization-scoped reference data that powers pipelines, products, markets, and next steps.</p>
            </Link>
            <Link href="/admin/audit" className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:bg-slate-50">
              <p className="text-sm font-semibold text-slate-900">Audit log</p>
              <p className="mt-1 text-sm text-slate-600">Trace access-sensitive changes from the admin audit surface once deeper audit work is enabled.</p>
            </Link>
          </div>
        </SectionCard>
      </div>


      <div className="grid gap-3 lg:grid-cols-2">
        <AICompactActionBrief
          lane="Admin / Organization"
          where="Organization governance overview"
          blocker={!governanceContext.isReady ? 'At least one governance area still needs attention before downstream surfaces become easier to trust.' : 'No major governance drift is visible in the current admin summary.'}
          nextAction={governanceContext.missingItems[0]?.href ? `Open ${governanceContext.missingItems[0].label} and complete the missing setup.` : 'Use users, invitations, or settings lists only when a specific governance action is needed.'}
          guardrail="AI can explain the current admin status and point the team to the right page. It cannot assign roles, accept invitations, or change settings on its own."
          details={settingsSummaries.slice(0, 4).map((item) => `${item.label}: ${item.helper ?? item.value}`)}
          tone={!governanceContext.isReady ? 'warning' : 'neutral'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard className="xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cross-surface consistency</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Admin stays aligned with the pages it feeds</h2>
              <p className="mt-2 text-sm text-slate-600">Use this only to explain or repair governance drift. Do not turn it into a second reading layer once the first lane is clear.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Link href="/dashboard" className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 transition hover:bg-slate-100/80">
              <p className="text-sm font-semibold text-slate-900">Dashboard</p>
              <p className="mt-2 text-sm text-slate-600">Summary widgets now expose missing context instead of silently drifting from governance reality.</p>
            </Link>
            <Link href="/reports" className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 transition hover:bg-slate-100/80">
              <p className="text-sm font-semibold text-slate-900">Reports</p>
              <p className="mt-2 text-sm text-slate-600">Reporting totals stay explainable because governance gaps are surfaced here before operators trust exports or drill-through totals.</p>
            </Link>
            <Link href="/pipeline" className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 transition hover:bg-slate-100/80">
              <p className="text-sm font-semibold text-slate-900">Pipeline</p>
              <p className="mt-2 text-sm text-slate-600">Pipeline stage setup depends on settings readiness and remains linked from the admin lane instead of being reconfigured ad hoc.</p>
            </Link>
            <Link href="/products" className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 transition hover:bg-slate-100/80">
              <p className="text-sm font-semibold text-slate-900">Products</p>
              <p className="mt-2 text-sm text-slate-600">Catalog pricing and market coverage remain grounded in the same reference data tracked in this admin overview.</p>
            </Link>
          </div>
        </SectionCard>

        <SectionCard>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Governance summary</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Admin readiness</h2>
            <p className="mt-2 text-sm text-slate-600">Use this as the admin-facing mirror of the downstream missing-context safeguards.</p>
          </div>
          <div className="mt-5 grid gap-3">
            {settingsSummaries.map((item) => (
              <div key={item.label} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{item.value}</p>
                    {item.helper ? <p className="mt-1 text-sm text-slate-600">{item.helper}</p> : null}
                  </div>
                  {item.href ? <Link href={item.href} className="text-sm font-semibold text-brand-700 hover:text-brand-800">Open</Link> : null}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Users</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Recent member state</h2>
              <p className="mt-2 text-sm text-slate-600">A quick read on who is active, disabled, or still joining the workspace.</p>
            </div>
            <Link href="/admin/users" className="text-sm font-semibold text-brand-700 hover:text-brand-800">Open users</Link>
          </div>
          {userPreview.length ? (
            <div className="mt-5 space-y-3">
              {userPreview.map((row) => (
                <Link key={row.id} href={row.destination} className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 transition hover:bg-slate-100/80 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                    <p className="truncate text-sm text-slate-600">{row.email ?? 'No email available'}</p>
                    <p className="mt-1 text-xs text-slate-500">Updated {formatDateTime(row.updatedAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.roleName ? <StatusBadge label={row.roleName} tone="info" /> : null}
                    <StatusBadge label={row.status} tone={getTone(row.status)} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState title="No members yet" description="Invite your first teammate from the invitations workspace to begin assigning access." />
            </div>
          )}
        </SectionCard>

        <SectionCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Invitations</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Open onboarding queue</h2>
              <p className="mt-2 text-sm text-slate-600">Pending invitation state stays visible here while the detailed lifecycle remains in the invitations route.</p>
            </div>
            <Link href="/admin/invitations" className="text-sm font-semibold text-brand-700 hover:text-brand-800">Open invitations</Link>
          </div>
          {invitationPreview.length ? (
            <div className="mt-5 space-y-3">
              {invitationPreview.map((row) => (
                <Link key={row.id} href={row.destination} className="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4 transition hover:bg-slate-100/80 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{row.name}</p>
                    <p className="truncate text-sm text-slate-600">{row.email ?? 'No email available'}</p>
                    <p className="mt-1 text-xs text-slate-500">Updated {formatDateTime(row.updatedAt)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {row.roleName ? <StatusBadge label={row.roleName} tone="info" /> : null}
                    <StatusBadge label={row.status} tone={getTone(row.status)} />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState title="No open invitations" description="New invites will appear here once they are drafted, pending, or sent." />
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Roles and permissions</p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Available access roles</h2>
              <p className="mt-2 text-sm text-slate-600">Role scope and assignment pressure remain visible without changing the current role-edit workflow in the users workspace.</p>
            </div>
            <Link href="/admin/users" className="text-sm font-semibold text-brand-700 hover:text-brand-800">Manage role assignments</Link>
          </div>
          <div className="mt-5 space-y-3">
            {roleSummaries.map((role) => (
              <div key={role.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{role.name}</p>
                      <StatusBadge label={role.scope} tone={role.scope === 'organization' ? 'info' : 'neutral'} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{role.description ?? 'No description is stored for this role yet.'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge label={`${role.activeAssignments} active`} tone="success" />
                    <StatusBadge label={`${role.pendingInvites} invites`} tone="warning" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Organization settings</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">Reference data and defaults</h2>
            <p className="mt-2 text-sm text-slate-600">Use the existing settings lists workspace for safe schema-aligned edits. This summary keeps organization-level readiness visible from the admin lane.</p>
          </div>
          <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,0.05)]">
            <p className="text-sm font-semibold text-slate-900">Settings guidance</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Keep role changes in the users workspace, invitation actions in the invitations workspace, and reference data edits in settings lists so organization administration stays clear and schema-safe.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/admin/organization#settings-lists" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:bg-slate-50">Open settings lists</Link>
              <Link href="/approval-send" className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:bg-slate-50">Review approvals & sending</Link>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
