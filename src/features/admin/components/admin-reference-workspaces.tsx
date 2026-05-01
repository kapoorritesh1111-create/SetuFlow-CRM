import { SectionCard } from '@/components/ui/section-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { formatDate } from '@/lib/utils';
import { createMarket, createNextStep, createPipeline, createPipelineStage, createProductCategory, createRole, createTradeEvent, updateApprovalThreshold, updateMarket, updateNextStep, updatePipeline, updatePipelineStage, updateProductCategory, updateRolePermissions, updateTradeEvent } from '@/features/admin/server/actions';

const inputClass = 'min-h-11 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100';
const buttonClass = 'inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800';
const secondaryButtonClass = 'inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50';

type AnyRow = Record<string, any>;
function BoolBadge({ value, trueLabel = 'Active', falseLabel = 'Inactive' }: { value: boolean | null | undefined; trueLabel?: string; falseLabel?: string }) { return <StatusBadge label={value ? trueLabel : falseLabel} tone={value ? 'success' : 'neutral'} dot={false} />; }

export function MarketsAdminWorkspace({ markets }: { markets: AnyRow[] }) {
  return <div className="space-y-6"><SectionCard title="Add market" eyebrow="Reference list" description="Markets are used by leads, catalog prices, quotes, and country-level routing."><form action={createMarket} className="grid gap-3 md:grid-cols-[1fr_160px_120px_auto]"><input className={inputClass} name="name" placeholder="Market name, e.g. GCC" required /><input className={inputClass} name="market_code" placeholder="Code" /><input className={inputClass} name="sort_order" type="number" defaultValue="0" /><button className={buttonClass} type="submit">Add market</button></form></SectionCard><SectionCard title="Markets" eyebrow="Operational coverage" description="Edit active markets without touching downstream lead or quote records."><div className="overflow-x-auto rounded-3xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Market</th><th className="px-4 py-3">Code</th><th className="px-4 py-3">Sort</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Save</th></tr></thead><tbody>{markets.map((market) => <tr key={market.id} className="border-t border-slate-100 align-top"><td className="px-4 py-3"><input form={`market-${market.id}`} className={inputClass} name="name" defaultValue={market.name} required /></td><td className="px-4 py-3"><input form={`market-${market.id}`} className={inputClass} name="market_code" defaultValue={market.market_code ?? ''} /></td><td className="px-4 py-3"><input form={`market-${market.id}`} className={`${inputClass} w-24`} name="sort_order" type="number" defaultValue={market.sort_order ?? 0} /></td><td className="px-4 py-3"><BoolBadge value={market.is_active} /><label className="mt-2 flex items-center gap-2 text-xs text-slate-500"><input form={`market-${market.id}`} type="checkbox" name="is_active" defaultChecked={market.is_active ?? true} /> Active</label></td><td className="px-4 py-3 text-slate-600">{market.updated_at ? formatDate(market.updated_at) : '—'}</td><td className="px-4 py-3"><form id={`market-${market.id}`} action={updateMarket}><input type="hidden" name="id" value={market.id} /><button type="submit" className={secondaryButtonClass}>Save</button></form></td></tr>)}</tbody></table></div></SectionCard></div>;
}


export function CategoriesAdminWorkspace({ categories }: { categories: AnyRow[] }) {
  return <div className="space-y-6"><SectionCard title="Add category" eyebrow="Catalog taxonomy" description="Categories power catalog grouping, quote line context, product imports, and buyer-facing product organization."><form action={createProductCategory} className="grid gap-3 md:grid-cols-[1fr_140px_auto]"><input className={inputClass} name="name" placeholder="Category name, e.g. Fruit powders" required /><input className={inputClass} name="sort_order" type="number" defaultValue="0" /><button className={buttonClass} type="submit">Add category</button></form></SectionCard><SectionCard title="Current categories" eyebrow="Live category list" description="Edit names, order, and active state without changing product records or live Supabase data until an admin submits a form."><div className="overflow-x-auto rounded-3xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Products</th><th className="px-4 py-3">Sort</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Save</th></tr></thead><tbody>{categories.map((category) => <tr key={category.id} className="border-t border-slate-100 align-top"><td className="px-4 py-3"><input form={`category-${category.id}`} className={inputClass} name="name" defaultValue={category.name} required /></td><td className="px-4 py-3 text-slate-600">{category.product_count ?? 0}</td><td className="px-4 py-3"><input form={`category-${category.id}`} className={`${inputClass} w-24`} name="sort_order" type="number" defaultValue={category.sort_order ?? 0} /></td><td className="px-4 py-3"><BoolBadge value={category.is_active} /><label className="mt-2 flex items-center gap-2 text-xs text-slate-500"><input form={`category-${category.id}`} type="checkbox" name="is_active" defaultChecked={category.is_active ?? true} /> Active</label></td><td className="px-4 py-3"><form id={`category-${category.id}`} action={updateProductCategory}><input type="hidden" name="id" value={category.id} /><button type="submit" className={secondaryButtonClass}>Save</button></form></td></tr>)}</tbody></table></div>{categories.length === 0 ? <p className="mt-4 text-sm text-slate-500">No categories configured yet.</p> : null}</SectionCard></div>;
}

export function StagesAdminWorkspace({ pipelines, stages, nextSteps }: { pipelines: AnyRow[]; stages: AnyRow[]; nextSteps: AnyRow[] }) {
  return <div className="space-y-6"><div className="grid gap-6 xl:grid-cols-2"><SectionCard title="Add pipeline stage" eyebrow="Pipeline readiness" description="Stages control pipeline board order and lead workflow positioning."><form action={createPipelineStage} className="grid gap-3"><select className={inputClass} name="pipeline_id" required>{pipelines.map((pipeline) => <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>)}</select><input className={inputClass} name="name" placeholder="Stage name" required /><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} name="color" placeholder="Color token / hex" /><input className={inputClass} name="sort_order" type="number" defaultValue="0" /></div><div className="flex flex-wrap gap-3 text-sm text-slate-600"><label><input type="checkbox" name="is_closed" /> Closed</label><label><input type="checkbox" name="is_won" /> Won</label><label><input type="checkbox" name="is_lost" /> Lost</label></div><button className={buttonClass} type="submit">Add stage</button></form></SectionCard><SectionCard title="Add next step" eyebrow="Lead command" description="Next Steps keep follow-up action language standardized."><form action={createNextStep} className="grid gap-3"><input className={inputClass} name="name" placeholder="Next step name" required /><input className={inputClass} name="sort_order" type="number" defaultValue="0" /><button className={buttonClass} type="submit">Add next step</button></form></SectionCard></div><SectionCard title="Pipeline stages" eyebrow="Board lanes" description="Edit stage labels and terminal-state flags by pipeline."><div className="space-y-4">{pipelines.map((pipeline) => { const pipelineStages = stages.filter((stage) => stage.pipeline_id === pipeline.id); return <div key={pipeline.id} className="rounded-3xl border border-slate-200 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-slate-900">{pipeline.name}</h3><StatusBadge label={pipeline.lead_type} tone="info" dot={false} /></div><div className="mt-3 grid gap-3">{pipelineStages.map((stage) => <form key={stage.id} action={updatePipelineStage} className="grid gap-3 rounded-2xl bg-slate-50 p-3 lg:grid-cols-[1fr_110px_120px_250px_auto] lg:items-center"><input type="hidden" name="id" value={stage.id} /><input className={inputClass} name="name" defaultValue={stage.name} required /><input className={inputClass} name="sort_order" type="number" defaultValue={stage.sort_order ?? 0} /><input className={inputClass} name="color" defaultValue={stage.color ?? ''} placeholder="Color" /><div className="flex flex-wrap gap-2 text-xs text-slate-600"><label><input type="checkbox" name="is_closed" defaultChecked={stage.is_closed ?? false} /> Closed</label><label><input type="checkbox" name="is_won" defaultChecked={stage.is_won ?? false} /> Won</label><label><input type="checkbox" name="is_lost" defaultChecked={stage.is_lost ?? false} /> Lost</label></div><button type="submit" className={secondaryButtonClass}>Save</button></form>)}{pipelineStages.length === 0 ? <p className="text-sm text-slate-500">No stages yet.</p> : null}</div></div>; })}</div></SectionCard><SectionCard title="Next steps" eyebrow="Follow-up actions" description="Keep the action list short and operator-friendly."><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{nextSteps.map((step) => <form key={step.id} action={updateNextStep} className="rounded-3xl border border-slate-200 p-4"><input type="hidden" name="id" value={step.id} /><input className={`${inputClass} w-full`} name="name" defaultValue={step.name} required /><div className="mt-3 flex items-center gap-3"><input className={`${inputClass} w-24`} name="sort_order" type="number" defaultValue={step.sort_order ?? 0} /><label className="text-sm text-slate-600"><input type="checkbox" name="is_active" defaultChecked={step.is_active ?? true} /> Active</label><button className={secondaryButtonClass} type="submit">Save</button></div></form>)}</div></SectionCard></div>;
}

export function PipelinesAdminWorkspace({ pipelines }: { pipelines: AnyRow[] }) {
  return <div className="space-y-6"><SectionCard title="Add pipeline" eyebrow="Pipeline setup" description="Create buyer, supplier, or shared pipelines."><form action={createPipeline} className="grid gap-3 md:grid-cols-[1fr_160px_140px_auto] md:items-center"><input className={inputClass} name="name" placeholder="Pipeline name" required /><select className={inputClass} name="lead_type" defaultValue="buyer"><option value="buyer">Buyer</option><option value="supplier">Supplier</option><option value="both">Both</option></select><label className="text-sm text-slate-600"><input type="checkbox" name="is_default" /> Default</label><button className={buttonClass} type="submit">Add pipeline</button></form></SectionCard><div className="grid gap-4 xl:grid-cols-2">{pipelines.map((pipeline) => <SectionCard key={pipeline.id} title={pipeline.name} eyebrow="Pipeline" actions={<StatusBadge label={pipeline.is_default ? 'Default' : pipeline.lead_type} tone={pipeline.is_default ? 'success' : 'info'} dot={false} />}><form action={updatePipeline} className="grid gap-3"><input type="hidden" name="id" value={pipeline.id} /><input className={inputClass} name="name" defaultValue={pipeline.name} required /><select className={inputClass} name="lead_type" defaultValue={pipeline.lead_type}><option value="buyer">Buyer</option><option value="supplier">Supplier</option><option value="both">Both</option></select><label className="text-sm text-slate-600"><input type="checkbox" name="is_default" defaultChecked={pipeline.is_default ?? false} /> Default pipeline</label><button type="submit" className={secondaryButtonClass}>Save pipeline</button></form><div className="mt-5 space-y-2"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Stages</p>{(pipeline.pipeline_stages ?? []).map((stage: AnyRow) => <div key={stage.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm"><span className="font-medium text-slate-900">{stage.name}</span><span className="text-xs text-slate-500">#{stage.sort_order ?? 0}</span></div>)}{(pipeline.pipeline_stages ?? []).length === 0 ? <p className="text-sm text-slate-500">No stages configured.</p> : null}</div></SectionCard>)}</div></div>;
}

export function TradeEventsAdminWorkspace({ events }: { events: AnyRow[] }) {
  return <div className="space-y-6"><SectionCard title="Capture defaults lane" eyebrow="Trade capture" description="New captures inherit event source, market review, owner assignment, and duplicate-check expectations before they become leads."><div className="grid gap-3 md:grid-cols-4"><StatusBadge label="Source event required" tone="info" dot={false} /><StatusBadge label="Market review" tone="warning" dot={false} /><StatusBadge label="Owner assignment" tone="info" dot={false} /><StatusBadge label="Duplicate check" tone="success" dot={false} /></div></SectionCard><SectionCard title="Add trade event" eyebrow="Capture source" description="Trade Events drive source attribution for scanned contacts and lead creation."><form action={createTradeEvent} className="grid gap-3 xl:grid-cols-[1fr_150px_150px_150px_150px]"><input className={inputClass} name="name" placeholder="Event name" required /><input className={inputClass} name="city" placeholder="City" /><input className={inputClass} name="country" placeholder="Country" /><input className={inputClass} name="starts_on" type="date" /><input className={inputClass} name="ends_on" type="date" /><textarea className={`${inputClass} xl:col-span-4`} name="notes" placeholder="Notes" /><button className={buttonClass} type="submit">Add event</button></form></SectionCard><div className="grid gap-4 xl:grid-cols-2">{events.map((event) => <SectionCard key={event.id} title={event.name} eyebrow="Trade event" actions={<StatusBadge label={event.starts_on ? formatDate(event.starts_on) : 'Unscheduled'} tone={event.starts_on ? 'info' : 'warning'} dot={false} />}><form action={updateTradeEvent} className="grid gap-3"><input type="hidden" name="id" value={event.id} /><input className={inputClass} name="name" defaultValue={event.name} required /><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} name="city" defaultValue={event.city ?? ''} placeholder="City" /><input className={inputClass} name="country" defaultValue={event.country ?? ''} placeholder="Country" /></div><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} name="starts_on" type="date" defaultValue={event.starts_on ?? ''} /><input className={inputClass} name="ends_on" type="date" defaultValue={event.ends_on ?? ''} /></div><textarea className={inputClass} name="notes" defaultValue={event.notes ?? ''} placeholder="Notes" /><button type="submit" className={secondaryButtonClass}>Save event</button></form></SectionCard>)}</div></div>;
}

export function SecurityAdminWorkspace({ roles, members, approvalThresholdPct = 15 }: { roles: AnyRow[]; members: AnyRow[]; approvalThresholdPct?: number | null }) {
  function roleBadgeStyle(name: string): { bg: string; border: string; color: string } {
    const l = (name ?? '').toLowerCase();
    if (l.includes('owner'))   return { bg: '#f5f3ff', border: '#ddd6fe', color: '#5b21b6' };
    if (l.includes('admin'))   return { bg: '#e0f2fe', border: '#bae6fd', color: '#0369a1' };
    if (l.includes('sales'))   return { bg: '#f0fdf4', border: '#a7f3d0', color: '#15803d' };
    if (l.includes('sourc'))   return { bg: '#fffbeb', border: '#fde68a', color: '#92400e' };
    return { bg: '#f1f5f9', border: '#e2e8f0', color: '#475569' };
  }

  return (
    <div className="space-y-6">
      {/* Approval threshold */}
      <SectionCard title="Approval threshold" eyebrow="Commercial governance" description="Quotes deviating above this % require manager approval before they can be sent.">
        <form action={updateApprovalThreshold} className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            <span>Threshold percentage</span>
            <div className="flex items-center gap-2">
              <input className={`${inputClass} w-32`} name="threshold_pct" type="number" min="0" max="100" step="0.5" defaultValue={approvalThresholdPct ?? 15} />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </label>
          <button className={buttonClass} type="submit">Save threshold</button>
          {!approvalThresholdPct && (
            <p className="w-full text-xs text-amber-600">⚠ Threshold not set — any pricing override bypasses the approval flow.</p>
          )}
        </form>
      </SectionCard>
      {/* Create role */}
      <SectionCard title="Create organization role" eyebrow="Security model" description="Roles stay organization-scoped unless they are seeded global roles.">
        <form action={createRole} className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input className={inputClass} name="name" placeholder="Role name" required />
          <input className={inputClass} name="description" placeholder="Description" />
          <button className={buttonClass} type="submit">Create role</button>
        </form>
      </SectionCard>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        {/* Roles & permissions */}
        <SectionCard title="Roles & permissions" eyebrow="Access control" description="Edit permissions as newline-separated keys.">
          <div className="space-y-4">
            {roles.map((role) => {
              const s = roleBadgeStyle(role.name);
              return (
                <form key={role.id} action={updateRolePermissions} className="rounded-3xl border border-slate-200 p-4">
                  <input type="hidden" name="role_id" value={role.id} />
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{role.name}</p>
                        <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{role.name}</span>
                      </div>
                      <p className="text-sm text-slate-500">{role.description ?? (role.organization_id ? 'Organization role' : 'Global role')}</p>
                    </div>
                    <StatusBadge label={`${role.user_roles?.length ?? 0} assigned`} tone="neutral" dot={false} />
                  </div>
                  <textarea className={`${inputClass} mt-3 min-h-28 w-full font-mono text-xs`} name="permissions" defaultValue={(role.role_permissions ?? []).map((item: AnyRow) => item.permission).filter(Boolean).join('\n')} placeholder="quotes.read&#10;quotes.approve" />
                  <button type="submit" className={`${secondaryButtonClass} mt-3`}>Save permissions</button>
                </form>
              );
            })}
          </div>
        </SectionCard>
        {/* Member role coverage */}
        <SectionCard title="Member role coverage" eyebrow="Workspace access" description="Review active memberships and role assignment coverage.">
          <div className="space-y-3">
            {members.map((member) => {
              const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
              const memberRoles = (member.user_roles ?? []).map((row: AnyRow) => row.roles?.name).filter(Boolean) as string[];
              return (
                <div key={member.id} className="rounded-3xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{profile?.full_name ?? profile?.email ?? 'Unnamed member'}</p>
                      <p className="text-sm text-slate-500">{profile?.email ?? 'No email'}</p>
                    </div>
                    <BoolBadge value={member.is_active} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {memberRoles.length > 0 ? memberRoles.map(r => {
                      const s = roleBadgeStyle(r);
                      return <span key={r} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 9px', borderRadius: '999px', background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{r}</span>;
                    }) : <span className="text-xs text-slate-400">No role assigned</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
