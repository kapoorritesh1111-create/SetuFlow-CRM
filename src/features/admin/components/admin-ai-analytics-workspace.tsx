import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { QueryIssuesAlert } from '@/components/ui/query-issues-alert';
import { StatCard } from '@/components/ui/stat-card';
import type { AiAnalyticsData } from '@/lib/queries/ai-analytics';
import { getSuggestionBadgeClasses } from '@/lib/ai/suggestion-types';

function pct(value: number) {
  return `${value.toFixed(1)}%`;
}

function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function windowHref(days: number) {
  return `/admin/ai-analytics?window=${days}`;
}

export function AdminAiAnalyticsWorkspace({ data }: { data: AiAnalyticsData }) {
  const highDismissalWorkflows = data.needsAttention.highDismissalWorkflows;
  const lowApplyAfterApprovalWorkflows = data.needsAttention.lowApplyAfterApprovalWorkflows;
  const agingApprovedNotApplied = data.needsAttention.agingApprovedNotApplied;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="AI analytics"
        title="Read-only AI performance and review analytics"
        description="Track generation, review, approval, apply, override behavior, and workflow friction without changing any operational records."
        actions={[
          { label: 'AI assist', href: '/ai-suggestions' },
          { label: 'Audit log', href: '/admin/audit' },
          { label: 'Reports', href: '/reports', type: 'primary' },
        ]}
      />
      <QueryIssuesAlert issues={data.queryIssues} title="Some AI analytics sources could not be loaded" />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Time window</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">Decision view for operators and admins</h2>
            <p className="mt-1 text-sm text-slate-600">Use the same time filter across all charts and tables so approval/apply behavior is comparable.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[7, 30, 90].map((days) => {
              const active = data.windowDays === days;
              return (
                <Link
                  key={days}
                  href={windowHref(days)}
                  className={`rounded-2xl border px-4 py-2 text-sm font-medium ${active ? 'border-brand-300 bg-brand-50 text-brand-800' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  {days}d
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Suggestions (${data.windowDays}d)`} value={data.summary.suggestionsInWindow} helper={`${data.summary.generatedPerDay} generated per day`} />
        <StatCard label="Reviewed rate" value={pct(data.summary.reviewedRate)} helper="Suggestions that reached explicit review state" />
        <StatCard label="Approval rate" value={pct(data.summary.approvalRate)} helper="Approved or applied suggestions / generated" />
        <StatCard label="Apply rate" value={pct(data.summary.applyRate)} helper="Suggestions converted into communication drafts" />
        <StatCard label="Approval → apply" value={pct(data.summary.approvalToApplyConversionRate)} helper="Applied suggestions / approved suggestions" />
        <StatCard label="Override rate" value={pct(data.summary.overrideRate)} helper="Dismissed or operator-noted suggestions" />
        <StatCard label="Avg apply lag" value={`${data.summary.averageApprovalToApplyLagHours.toFixed(1)}h`} helper="Average time from approval to communication draft creation" />
        <StatCard label="Workflow types" value={data.workflows.length} helper={`Total suggestion records in org: ${data.summary.totalSuggestions}`} />
      </div>

      <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">Needs attention</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Read-only callouts from the current analytics payload</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-700">These callouts read directly from the existing analytics payload and its derived needs-attention signals. They highlight likely friction without writing data or changing review workflows.</p>
          </div>
          <Link href="/ai-suggestions" className="rounded-2xl border border-amber-200 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100">Open review console</Link>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <article className="rounded-[1.75rem] border border-amber-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">High dismissal workflows</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Where AI is being rejected most often</h3>
            <p className="mt-2 text-sm text-slate-600">Flags workflows at or above the current dismissal threshold in the analytics payload.</p>
            {highDismissalWorkflows.length ? (
              <ul className="mt-4 space-y-3">
                {highDismissalWorkflows.map((workflow) => (
                  <li key={workflow.suggestionType} className="rounded-2xl border border-amber-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{workflow.label}</p>
                        <p className="text-sm text-slate-600">{workflow.dismissed} dismissed out of {workflow.generated} generated · threshold {pct(data.needsAttention.thresholds.highDismissalRate)}</p>
                      </div>
                      <span className="text-sm font-semibold text-amber-800">{pct(workflow.dismissalRate)}</span>
                    </div>
                    <Link href={`/ai-suggestions?type=${workflow.suggestionType}&status=dismissed`} className="mt-3 inline-flex text-xs font-medium text-brand-700 hover:underline">Review dismissed drafts</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-600">No workflow crossed the {pct(data.needsAttention.thresholds.highDismissalRate)} dismissal threshold in this window.</p>
            )}
          </article>

          <article className="rounded-[1.75rem] border border-amber-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Low apply after approval</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Approved drafts that stall before use</h3>
            <p className="mt-2 text-sm text-slate-600">Flags approved workflows that fall below the conversion threshold already derived in analytics.</p>
            {lowApplyAfterApprovalWorkflows.length ? (
              <ul className="mt-4 space-y-3">
                {lowApplyAfterApprovalWorkflows.map((workflow) => (
                  <li key={workflow.suggestionType} className="rounded-2xl border border-amber-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{workflow.label}</p>
                        <p className="text-sm text-slate-600">{workflow.applied} applied from {workflow.approved} approved · {countLabel(workflow.pendingApprovedSuggestions, 'approved draft')} still pending</p>
                      </div>
                      <span className="text-sm font-semibold text-amber-800">{pct(workflow.approvalToApplyConversionRate)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Threshold {pct(data.needsAttention.thresholds.lowApprovalToApplyRate)} · avg lag {workflow.averageApprovalToApplyLagHours.toFixed(1)}h</p>
                    <Link href={`/ai-suggestions?type=${workflow.suggestionType}&status=approved`} className="mt-3 inline-flex text-xs font-medium text-brand-700 hover:underline">Open approved drafts</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-600">No workflow fell below the {pct(data.needsAttention.thresholds.lowApprovalToApplyRate)} apply-after-approval threshold in this window.</p>
            )}
          </article>

          <article className="rounded-[1.75rem] border border-amber-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">Aging approved-not-applied</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">Approved work that still has not been applied</h3>
            <p className="mt-2 text-sm text-slate-600">Uses the derived aging buckets already returned in the analytics payload.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {agingApprovedNotApplied.buckets.map((bucket) => (
                <div key={bucket.label} className="rounded-2xl border border-amber-100 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">{bucket.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{bucket.count}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-slate-600">{countLabel(agingApprovedNotApplied.olderThanThreshold, 'approved suggestion')} older than {data.needsAttention.thresholds.agingApprovedNotAppliedDays} days · {countLabel(agingApprovedNotApplied.totalApprovedNotApplied, 'approved suggestion')} pending overall</p>
            {agingApprovedNotApplied.suggestions.length ? (
              <ul className="mt-4 space-y-3">
                {agingApprovedNotApplied.suggestions.map((suggestion) => (
                  <li key={suggestion.suggestionId} className="rounded-2xl border border-amber-100 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{suggestion.suggestionLabel}</p>
                        <p className="text-sm text-slate-600">{suggestion.leadName ?? 'Lead unavailable'} · approved {suggestion.ageDays} days ago</p>
                      </div>
                      <span className="text-sm font-semibold text-amber-800">{suggestion.ageDays}d</span>
                    </div>
                    <Link href={`/ai-suggestions?type=${suggestion.suggestionType}&status=approved`} className="mt-3 inline-flex text-xs font-medium text-brand-700 hover:underline">Inspect approval backlog</Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-600">No approved suggestions are older than the {data.needsAttention.thresholds.agingApprovedNotAppliedDays}-day threshold in this window.</p>
            )}
          </article>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Workflow-family summaries</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">General vs quote vs compliance</h2>
            <p className="mt-2 text-sm text-slate-600">This view is meant for decision usefulness: where AI is trusted, where it gets reviewed but not applied, and where friction is concentrated.</p>
          </div>
          <Link href="/ai-suggestions" className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Open review console</Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {data.workflowFamilies.map((family) => (
            <article key={family.family} className="rounded-[1.75rem] border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getSuggestionBadgeClasses(family.family === 'quote' ? 'quote_cover_note' : family.family === 'compliance' ? 'compliance_next_step' : 'follow_up_assistant')}`}>{family.label}</p>
                  <h3 className="mt-3 text-lg font-semibold text-slate-900">{family.generated} generated</h3>
                </div>
                <Link href={`/ai-suggestions?family=${family.family}`} className="text-sm font-medium text-brand-700 hover:underline">Review</Link>
              </div>
              <dl className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-3"><dt>Reviewed</dt><dd>{family.reviewed}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt>Approved</dt><dd>{pct(family.approvalRate)}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt>Applied</dt><dd>{pct(family.applyRate)}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt>Drop-off</dt><dd>{pct(family.dropOffRate)}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Per-workflow insights</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">Workflow performance</h2>
            <p className="mt-2 text-sm text-slate-600">Includes review rate, approval-to-apply conversion, and average lag so admins can see whether a workflow is trusted but slow, or fast but rarely approved.</p>
          </div>
        </div>
        <div className="mt-5 overflow-x-auto rounded-[1.75rem] border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Workflow</th>
                <th className="px-4 py-3">Family</th>
                <th className="px-4 py-3">Generated</th>
                <th className="px-4 py-3">Reviewed</th>
                <th className="px-4 py-3">Approved</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3">Override notes</th>
                <th className="px-4 py-3">Review rate</th>
                <th className="px-4 py-3">Approval → apply</th>
                <th className="px-4 py-3">Avg lag</th>
              </tr>
            </thead>
            <tbody>
              {data.workflows.map((workflow) => (
                <tr key={workflow.suggestionType} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <div className="flex flex-col gap-1">
                      <span>{workflow.label}</span>
                      <Link href={`/ai-suggestions?type=${workflow.suggestionType}`} className="text-xs font-medium text-brand-700 hover:underline">Open matching drafts</Link>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{workflow.family}</td>
                  <td className="px-4 py-3 text-slate-600">{workflow.generated}</td>
                  <td className="px-4 py-3 text-slate-600">{workflow.reviewed}</td>
                  <td className="px-4 py-3 text-slate-600">{workflow.approved}</td>
                  <td className="px-4 py-3 text-slate-600">{workflow.applied}</td>
                  <td className="px-4 py-3 text-slate-600">{workflow.reviewedWithNotes}</td>
                  <td className="px-4 py-3 text-slate-600">{pct(workflow.reviewRate)}</td>
                  <td className="px-4 py-3 text-slate-600">{pct(workflow.approvalToApplyConversionRate)}</td>
                  <td className="px-4 py-3 text-slate-600">{workflow.averageApprovalToApplyLagHours.toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lead-level hotspots</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Where AI is concentrated</h2>
          <p className="mt-2 text-sm text-slate-600">Use this to spot compliance-heavy leads, high-touch negotiations, or leads where operator overrides are piling up.</p>
          <div className="mt-5 overflow-x-auto rounded-[1.75rem] border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">AI uses</th>
                  <th className="px-4 py-3">Compliance AI</th>
                  <th className="px-4 py-3">Quote AI</th>
                  <th className="px-4 py-3">Applied</th>
                  <th className="px-4 py-3">Overrides</th>
                </tr>
              </thead>
              <tbody>
                {data.leadHotspots.map((lead) => (
                  <tr key={lead.leadId} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="flex flex-col gap-1">
                        <Link href={`/leads/${lead.leadId}`} className="hover:underline">{lead.leadName}</Link>
                        <Link href={`/ai-suggestions?leadId=${lead.leadId}`} className="text-xs font-medium text-brand-700 hover:underline">Open lead drafts</Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.totalSuggestions}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.complianceSuggestions}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.quoteSuggestions}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.appliedSuggestions}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.overrideActions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Per-operator insights</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Review and override behavior</h2>
          <p className="mt-2 text-sm text-slate-600">Operator notes and dismissal behavior remain observational only. This surface does not change workflow behavior.</p>
          <div className="mt-5 overflow-x-auto rounded-[1.75rem] border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Operator</th>
                  <th className="px-4 py-3">Generated</th>
                  <th className="px-4 py-3">Reviewed</th>
                  <th className="px-4 py-3">Applied</th>
                  <th className="px-4 py-3">Overrides</th>
                  <th className="px-4 py-3">Review → apply</th>
                </tr>
              </thead>
              <tbody>
                {data.operators.map((operator) => (
                  <tr key={operator.operatorId} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-medium text-slate-900">{operator.operatorName}</td>
                    <td className="px-4 py-3 text-slate-600">{operator.generated}</td>
                    <td className="px-4 py-3 text-slate-600">{operator.reviewed}</td>
                    <td className="px-4 py-3 text-slate-600">{operator.applied}</td>
                    <td className="px-4 py-3 text-slate-600">{operator.overrideActions}</td>
                    <td className="px-4 py-3 text-slate-600">{pct(operator.reviewToApplyRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trend and feedback sections for phase 5 analytics */}
      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* Trend table */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft overflow-x-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Trend over time</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Daily AI suggestion activity</h2>
          <p className="mt-2 text-sm text-slate-600">Generated vs reviewed, approved, applied and dismissed suggestions across the selected window. Use this to spot surges or lulls in AI usage.</p>
          <table className="mt-5 min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Generated</th>
                <th className="px-4 py-2">Reviewed</th>
                <th className="px-4 py-2">Approved</th>
                <th className="px-4 py-2">Applied</th>
                <th className="px-4 py-2">Dismissed</th>
                <th className="px-4 py-2">With notes</th>
              </tr>
            </thead>
            <tbody>
              {data.trend.map((day) => (
                <tr key={day.date} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-700 whitespace-nowrap">{day.date}</td>
                  <td className="px-4 py-2 text-slate-700">{day.generated}</td>
                  <td className="px-4 py-2 text-slate-700">{day.reviewed}</td>
                  <td className="px-4 py-2 text-slate-700">{day.approved}</td>
                  <td className="px-4 py-2 text-slate-700">{day.applied}</td>
                  <td className="px-4 py-2 text-slate-700">{day.dismissed}</td>
                  <td className="px-4 py-2 text-slate-700">{day.withNotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Feedback summary */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Operator feedback</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Notes on AI suggestions</h2>
          <p className="mt-2 text-sm text-slate-600">Summarises how often operators leave notes on AI drafts and surfaces the latest examples. Notes help uncover friction or training opportunities.</p>
          <dl className="mt-4 flex flex-col gap-2 text-sm text-slate-700">
            <div className="flex items-center justify-between gap-3">
              <dt className="font-medium">Suggestions with notes</dt>
              <dd className="font-semibold text-slate-950">{data.feedback.totalWithNotes}</dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="font-medium">Average note length</dt>
              <dd className="font-semibold text-slate-950">{data.feedback.averageNoteLength}</dd>
            </div>
          </dl>
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-slate-900">Recent notes</h3>
            {data.feedback.recentNotes.length ? (
              <ul className="mt-2 space-y-3 text-sm text-slate-700">
                {data.feedback.recentNotes.map((item) => (
                  <li key={item.suggestionId} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{item.suggestionLabel}</span>
                        {item.leadId && (
                          <Link href={`/leads/${item.leadId}`} className="text-xs font-medium text-brand-700 hover:underline">
                            {item.leadName || `Lead ${item.leadId.slice(0, 8)}`}
                          </Link>
                        )}
                        <span className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="ml-2 flex-1 text-slate-700">{item.note}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-600">No operator notes in this window.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
