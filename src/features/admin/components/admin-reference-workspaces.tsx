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
  return <div id="markets" className="space-y-6"><SectionCard title="Markets" eyebrow="Operational coverage" description="Review market coverage in a read-only table. Use Add market or Edit to open the focused drawer form." actions={<a href="#add-market" className={buttonClass}>+ Add market</a>}><div className="overflow-x-auto rounded-3xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Market</th><th className="px-4 py-3">Code</th><th className="px-4 py-3">Countries</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Sort</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Edit</th></tr></thead><tbody>{markets.map((market) => <tr key={market.id} className="border-t border-slate-100 align-middle transition hover:bg-slate-50"><td className="px-4 py-3 font-semibold text-slate-900">{market.name}</td><td className="px-4 py-3 font-mono text-xs uppercase text-slate-500">{market.market_code ?? '-'}</td><td className="px-4 py-3"><StatusBadge label="Linked by countries" tone="neutral" dot={false} /></td><td className="px-4 py-3"><BoolBadge value={market.is_active} /></td><td className="px-4 py-3 text-slate-500">#{market.sort_order ?? 0}</td><td className="px-4 py-3 text-slate-600">{market.updated_at ? formatDate(market.updated_at) : '-'}</td><td className="px-4 py-3"><a href={`#market-${market.id}`} className={secondaryButtonClass}>Edit</a></td></tr>)}</tbody></table></div>{markets.length === 0 ? <p className="mt-4 text-sm text-slate-500">No markets configured yet. Add the first market to unlock market-aware workflows.</p> : null}</SectionCard>{markets.map((market) => <div key={`drawer-${market.id}`} id={`market-${market.id}`} className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block"><a href="#markets" className="absolute inset-0" aria-label="Close market drawer" /><aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Market setup</p><h2 className="mt-1 text-lg font-bold text-slate-950">{market.name}</h2><p className="mt-1 text-sm text-slate-500">Code: {market.market_code ?? 'Not set'}</p></div><a href="#markets" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50" aria-label="Close market drawer">X</a></div><form action={updateMarket} className="flex flex-1 flex-col overflow-hidden"><input type="hidden" name="id" value={market.id} /><div className="flex-1 space-y-4 overflow-y-auto px-6 py-5"><label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Market name<input className={`${inputClass} mt-1 w-full`} name="name" defaultValue={market.name} required /></label><label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Market code<input className={`${inputClass} mt-1 w-full uppercase`} name="market_code" defaultValue={market.market_code ?? ''} /></label><label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sort order<input className={`${inputClass} mt-1 w-full`} name="sort_order" type="number" defaultValue={market.sort_order ?? 0} /></label><label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" name="is_active" defaultChecked={market.is_active ?? true} /> Active market</label></div><div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4"><a href="#markets" className={secondaryButtonClass}>Cancel</a><button type="submit" className={buttonClass}>Save market</button></div></form></aside></div>)}<div id="add-market" className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block"><a href="#markets" className="absolute inset-0" aria-label="Close add market drawer" /><aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Market setup</p><h2 className="mt-1 text-lg font-bold text-slate-950">Add market</h2><p className="mt-1 text-sm text-slate-500">Create a market used by leads, catalog pricing, quotes, and routing.</p></div><a href="#markets" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50" aria-label="Close add market drawer">X</a></div><form action={createMarket} className="flex flex-1 flex-col overflow-hidden"><div className="flex-1 space-y-4 overflow-y-auto px-6 py-5"><label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Market name<input className={`${inputClass} mt-1 w-full`} name="name" placeholder="Market name, e.g. GCC" required /></label><label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Market code<input className={`${inputClass} mt-1 w-full uppercase`} name="market_code" placeholder="Code" /></label><label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sort order<input className={`${inputClass} mt-1 w-full`} name="sort_order" type="number" defaultValue="0" /></label></div><div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4"><a href="#markets" className={secondaryButtonClass}>Cancel</a><button type="submit" className={buttonClass}>Add market</button></div></form></aside></div></div>;
}

export function CategoriesAdminWorkspace({ categories }: { categories: AnyRow[] }) {
  return <div className="space-y-6"><SectionCard title="Add category" eyebrow="Catalog taxonomy" description="Categories power catalog grouping, quote line context, product imports, and buyer-facing product organization."><form action={createProductCategory} className="grid gap-3 md:grid-cols-[1fr_140px_auto]"><input className={inputClass} name="name" placeholder="Category name, e.g. Fruit powders" required /><input className={inputClass} name="sort_order" type="number" defaultValue="0" /><button className={buttonClass} type="submit">Add category</button></form></SectionCard><SectionCard title="Current categories" eyebrow="Live category list" description="Edit names, order, and active state without changing product records or live Supabase data until an admin submits a form."><div className="overflow-x-auto rounded-3xl border border-slate-200"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Products</th><th className="px-4 py-3">Sort</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Save</th></tr></thead><tbody>{categories.map((category) => <tr key={category.id} className="border-t border-slate-100 align-top"><td className="px-4 py-3"><input form={`category-${category.id}`} className={inputClass} name="name" defaultValue={category.name} required /></td><td className="px-4 py-3 text-slate-600">{category.product_count ?? 0}</td><td className="px-4 py-3"><input form={`category-${category.id}`} className={`${inputClass} w-24`} name="sort_order" type="number" defaultValue={category.sort_order ?? 0} /></td><td className="px-4 py-3"><BoolBadge value={category.is_active} /><label className="mt-2 flex items-center gap-2 text-xs text-slate-500"><input form={`category-${category.id}`} type="checkbox" name="is_active" defaultChecked={category.is_active ?? true} /> Active</label></td><td className="px-4 py-3"><form id={`category-${category.id}`} action={updateProductCategory}><input type="hidden" name="id" value={category.id} /><button type="submit" className={secondaryButtonClass}>Save</button></form></td></tr>)}</tbody></table></div>{categories.length === 0 ? <p className="mt-4 text-sm text-slate-500">No categories configured yet.</p> : null}</SectionCard></div>;
}

export function StagesAdminWorkspace({ pipelines, stages, nextSteps }: { pipelines: AnyRow[]; stages: AnyRow[]; nextSteps: AnyRow[] }) {
  return (
    <div className="space-y-6">
      {/* Visual pipeline boards */}
      {pipelines.map((pipeline) => {
        const pipelineStages = stages.filter((s) => s.pipeline_id === pipeline.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
        return (
          <SectionCard key={pipeline.id} title={pipeline.name} eyebrow="Operations · Pipeline" actions={
            <div className="flex items-center gap-2">
              {pipeline.is_default && <StatusBadge label="Default" tone="success" dot={false} />}
              <StatusBadge label={pipeline.lead_type} tone="info" dot={false} />
              <a href={`#edit-pipeline-${pipeline.id}`} className={secondaryButtonClass}>Edit pipeline</a>
              <a href={`#add-stage-${pipeline.id}`} className={secondaryButtonClass}>+ Stage</a>
            </div>
          }>
            {/* Stage pills board */}
            <div className="flex overflow-x-auto rounded-2xl border border-slate-200 overflow-hidden">
              {pipelineStages.map((stage) => (
                <a key={stage.id} href={`#stage-${stage.id}`} className="group flex-1 min-w-[100px] px-3 py-3 border-r border-slate-100 bg-white hover:bg-slate-50 text-left no-underline cursor-pointer transition" style={{ textDecoration: 'none' }}>
                  <div className="h-1 rounded-full mb-2" style={{ backgroundColor: stage.color || '#94a3b8' }} />
                  <div className="text-sm font-bold text-slate-900">{stage.name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">#{stage.sort_order ?? 0}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {stage.is_won && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">Won</span>}
                    {stage.is_lost && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700">Lost</span>}
                    {stage.is_closed && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">Closed</span>}
                  </div>
                </a>
              ))}
              <a href={`#add-stage-${pipeline.id}`} className="min-w-[44px] bg-slate-50 text-teal-600 text-xl flex items-center justify-center hover:bg-teal-50 border-l border-slate-100 no-underline transition" style={{ textDecoration: 'none' }}>+</a>
            </div>
            {pipelineStages.length === 0 && <p className="mt-3 text-sm text-slate-500">No stages yet. Click + to add the first stage.</p>}

            {/* Edit stage drawers */}
            {pipelineStages.map((stage) => (
              <div key={`drawer-${stage.id}`} id={`stage-${stage.id}`} className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block">
                <a href={`#pipeline-${pipeline.id}`} className="absolute inset-0" aria-label="Close stage drawer" />
                <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Edit stage</p>
                      <h2 className="mt-1 text-lg font-bold text-slate-950">{stage.name}</h2>
                      <p className="mt-0.5 text-xs text-slate-400">Pipeline: {pipeline.name}</p>
                    </div>
                    <a href="#stages-top" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50" aria-label="Close">X</a>
                  </div>
                  <form action={updatePipelineStage} className="flex flex-1 flex-col overflow-hidden">
                    <input type="hidden" name="id" value={stage.id} />
                    <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Stage name<input className={`${inputClass} mt-1 w-full`} name="name" defaultValue={stage.name} required /></label>
                      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sort order<input className={`${inputClass} mt-1 w-full`} name="sort_order" type="number" defaultValue={stage.sort_order ?? 0} /></label>
                      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Color (hex or token)<input className={`${inputClass} mt-1 w-full`} name="color" defaultValue={stage.color ?? ''} placeholder="#3b82f6" /></label>
                      <div className="flex flex-wrap gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="is_won" defaultChecked={stage.is_won ?? false} /> <span className="font-semibold text-emerald-700">Won stage</span></label>
                        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="is_lost" defaultChecked={stage.is_lost ?? false} /> <span className="font-semibold text-rose-700">Lost stage</span></label>
                        <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="is_closed" defaultChecked={stage.is_closed ?? false} /> <span className="font-semibold text-slate-600">Closed stage</span></label>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
                      <a href="#stages-top" className={secondaryButtonClass}>Cancel</a>
                      <button type="submit" className={buttonClass}>Save stage</button>
                    </div>
                  </form>
                </aside>
              </div>
            ))}

            {/* Add stage drawer for this pipeline */}
            <div id={`add-stage-${pipeline.id}`} className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block">
              <a href="#stages-top" className="absolute inset-0" aria-label="Close add stage drawer" />
              <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                  <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Add stage</p><h2 className="mt-1 text-lg font-bold text-slate-950">New stage for {pipeline.name}</h2></div>
                  <a href="#stages-top" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50" aria-label="Close">X</a>
                </div>
                <form action={createPipelineStage} className="flex flex-1 flex-col overflow-hidden">
                  <input type="hidden" name="pipeline_id" value={pipeline.id} />
                  <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Stage name<input className={`${inputClass} mt-1 w-full`} name="name" placeholder="e.g. Qualified" required /></label>
                    <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sort order<input className={`${inputClass} mt-1 w-full`} name="sort_order" type="number" defaultValue="0" /></label>
                    <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Color (hex)<input className={`${inputClass} mt-1 w-full`} name="color" placeholder="#3b82f6" /></label>
                    <div className="flex flex-wrap gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="is_won" /> <span className="font-semibold text-emerald-700">Won</span></label>
                      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="is_lost" /> <span className="font-semibold text-rose-700">Lost</span></label>
                      <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" name="is_closed" /> <span className="font-semibold text-slate-600">Closed</span></label>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
                    <a href="#stages-top" className={secondaryButtonClass}>Cancel</a>
                    <button type="submit" className={buttonClass}>Add stage</button>
                  </div>
                </form>
              </aside>
            </div>

            {/* Edit pipeline drawer */}
            <div id={`edit-pipeline-${pipeline.id}`} className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block">
              <a href="#stages-top" className="absolute inset-0" aria-label="Close pipeline drawer" />
              <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                  <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Edit pipeline</p><h2 className="mt-1 text-lg font-bold text-slate-950">{pipeline.name}</h2></div>
                  <a href="#stages-top" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50" aria-label="Close">X</a>
                </div>
                <form action={updatePipeline} className="flex flex-1 flex-col overflow-hidden">
                  <input type="hidden" name="id" value={pipeline.id} />
                  <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                    <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Pipeline name<input className={`${inputClass} mt-1 w-full`} name="name" defaultValue={pipeline.name} required /></label>
                    <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Lead type<select className={`${inputClass} mt-1 w-full`} name="lead_type" defaultValue={pipeline.lead_type}><option value="buyer">Buyer</option><option value="supplier">Supplier</option><option value="both">Both</option></select></label>
                    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" name="is_default" defaultChecked={pipeline.is_default ?? false} /> Default pipeline</label>
                  </div>
                  <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
                    <a href="#stages-top" className={secondaryButtonClass}>Cancel</a>
                    <button type="submit" className={buttonClass}>Save pipeline</button>
                  </div>
                </form>
              </aside>
            </div>
          </SectionCard>
        );
      })}

      {/* Add pipeline */}
      <SectionCard title="Add pipeline" eyebrow="Pipeline setup" description="Create buyer, supplier, or shared pipelines." actions={<a href="#add-pipeline-drawer" className={buttonClass}>+ Add pipeline</a>}>
        {pipelines.length === 0 && <p className="text-sm text-slate-500">No pipelines yet. Add one to unlock the pipeline board.</p>}
      </SectionCard>
      <div id="add-pipeline-drawer" className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block">
        <a href="#stages-top" className="absolute inset-0" aria-label="Close" />
        <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Pipeline setup</p><h2 className="mt-1 text-lg font-bold text-slate-950">Add pipeline</h2></div>
            <a href="#stages-top" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50" aria-label="Close">X</a>
          </div>
          <form action={createPipeline} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Pipeline name<input className={`${inputClass} mt-1 w-full`} name="name" placeholder="e.g. Buyers pipeline" required /></label>
              <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Lead type<select className={`${inputClass} mt-1 w-full`} name="lead_type" defaultValue="buyer"><option value="buyer">Buyer</option><option value="supplier">Supplier</option><option value="both">Both</option></select></label>
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" name="is_default" /> Default pipeline</label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <a href="#stages-top" className={secondaryButtonClass}>Cancel</a>
              <button type="submit" className={buttonClass}>Add pipeline</button>
            </div>
          </form>
        </aside>
      </div>

      {/* Next steps */}
      <SectionCard title="Next steps" eyebrow="Follow-up actions" description="Drag-and-drop list of next actions operators can assign to leads in the Command Center." actions={<a href="#add-next-step-drawer" className={buttonClass}>+ Add next step</a>}>
        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500">
              <tr><th className="px-4 py-3">Next step</th><th className="px-4 py-3">Sort</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Edit</th></tr>
            </thead>
            <tbody>
              {nextSteps.map((step) => (
                <tr key={step.id} className="border-t border-slate-100 align-middle hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{step.name}</td>
                  <td className="px-4 py-3 text-slate-500">#{step.sort_order ?? 0}</td>
                  <td className="px-4 py-3"><StatusBadge label={step.is_active ? 'Active' : 'Inactive'} tone={step.is_active ? 'success' : 'neutral'} dot={false} /></td>
                  <td className="px-4 py-3"><a href={`#next-step-${step.id}`} className={secondaryButtonClass}>Edit</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {nextSteps.length === 0 && <p className="mt-3 text-sm text-slate-500">No next steps yet.</p>}
        {nextSteps.map((step) => (
          <div key={`ns-drawer-${step.id}`} id={`next-step-${step.id}`} className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block">
            <a href="#stages-top" className="absolute inset-0" aria-label="Close" />
            <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
                <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Edit next step</p><h2 className="mt-1 text-lg font-bold text-slate-950">{step.name}</h2></div>
                <a href="#stages-top" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50">X</a>
              </div>
              <form action={updateNextStep} className="flex flex-1 flex-col overflow-hidden">
                <input type="hidden" name="id" value={step.id} />
                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Name<input className={`${inputClass} mt-1 w-full`} name="name" defaultValue={step.name} required /></label>
                  <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sort order<input className={`${inputClass} mt-1 w-full`} name="sort_order" type="number" defaultValue={step.sort_order ?? 0} /></label>
                  <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" name="is_active" defaultChecked={step.is_active ?? true} /> Active</label>
                </div>
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
                  <a href="#stages-top" className={secondaryButtonClass}>Cancel</a>
                  <button type="submit" className={buttonClass}>Save</button>
                </div>
              </form>
            </aside>
          </div>
        ))}
      </SectionCard>
      <div id="add-next-step-drawer" className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block">
        <a href="#stages-top" className="absolute inset-0" aria-label="Close" />
        <aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
            <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Next step setup</p><h2 className="mt-1 text-lg font-bold text-slate-950">Add next step</h2></div>
            <a href="#stages-top" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50">X</a>
          </div>
          <form action={createNextStep} className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Name<input className={`${inputClass} mt-1 w-full`} name="name" placeholder="e.g. Send sample" required /></label>
              <label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sort order<input className={`${inputClass} mt-1 w-full`} name="sort_order" type="number" defaultValue="0" /></label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <a href="#stages-top" className={secondaryButtonClass}>Cancel</a>
              <button type="submit" className={buttonClass}>Add</button>
            </div>
          </form>
        </aside>
      </div>
      <span id="stages-top" />
    </div>
  );
}

export function PipelinesAdminWorkspace({ pipelines }: { pipelines: AnyRow[] }) {
  return <div className="space-y-6"><SectionCard title="Add pipeline" eyebrow="Pipeline setup" description="Create buyer, supplier, or shared pipelines."><form action={createPipeline} className="grid gap-3 md:grid-cols-[1fr_160px_140px_auto] md:items-center"><input className={inputClass} name="name" placeholder="Pipeline name" required /><select className={inputClass} name="lead_type" defaultValue="buyer"><option value="buyer">Buyer</option><option value="supplier">Supplier</option><option value="both">Both</option></select><label className="text-sm text-slate-600"><input type="checkbox" name="is_default" /> Default</label><button className={buttonClass} type="submit">Add pipeline</button></form></SectionCard><div className="grid gap-4 xl:grid-cols-2">{pipelines.map((pipeline) => <SectionCard key={pipeline.id} title={pipeline.name} eyebrow="Pipeline" actions={<StatusBadge label={pipeline.is_default ? 'Default' : pipeline.lead_type} tone={pipeline.is_default ? 'success' : 'info'} dot={false} />}><form action={updatePipeline} className="grid gap-3"><input type="hidden" name="id" value={pipeline.id} /><input className={inputClass} name="name" defaultValue={pipeline.name} required /><select className={inputClass} name="lead_type" defaultValue={pipeline.lead_type}><option value="buyer">Buyer</option><option value="supplier">Supplier</option><option value="both">Both</option></select><label className="text-sm text-slate-600"><input type="checkbox" name="is_default" defaultChecked={pipeline.is_default ?? false} /> Default pipeline</label><button type="submit" className={secondaryButtonClass}>Save pipeline</button></form><div className="mt-5 space-y-2"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Stages</p>{(pipeline.pipeline_stages ?? []).map((stage: AnyRow) => <div key={stage.id} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 text-sm"><span className="font-medium text-slate-900">{stage.name}</span><span className="text-xs text-slate-500">#{stage.sort_order ?? 0}</span></div>)}{(pipeline.pipeline_stages ?? []).length === 0 ? <p className="text-sm text-slate-500">No stages configured.</p> : null}</div></SectionCard>)}</div></div>;
}

export function TradeEventsAdminWorkspace({ events }: { events: AnyRow[] }) {
  return <div className="space-y-6"><SectionCard title="Capture defaults lane" eyebrow="Trade capture" description="New captures inherit event source, market review, owner assignment, and duplicate-check expectations before they become leads."><div className="grid gap-3 md:grid-cols-4"><StatusBadge label="Source event required" tone="info" dot={false} /><StatusBadge label="Market review" tone="warning" dot={false} /><StatusBadge label="Owner assignment" tone="info" dot={false} /><StatusBadge label="Duplicate check" tone="success" dot={false} /></div></SectionCard><SectionCard title="Add trade event" eyebrow="Capture source" description="Trade Events drive source attribution for scanned contacts and lead creation."><form action={createTradeEvent} className="grid gap-3 xl:grid-cols-[1fr_150px_150px_150px_150px]"><input className={inputClass} name="name" placeholder="Event name" required /><input className={inputClass} name="city" placeholder="City" /><input className={inputClass} name="country" placeholder="Country" /><input className={inputClass} name="starts_on" type="date" /><input className={inputClass} name="ends_on" type="date" /><textarea className={`${inputClass} xl:col-span-4`} name="notes" placeholder="Notes" /><button className={buttonClass} type="submit">Add event</button></form></SectionCard><div className="grid gap-4 xl:grid-cols-2">{events.map((event) => <SectionCard key={event.id} title={event.name} eyebrow="Trade event" actions={<StatusBadge label={event.starts_on ? formatDate(event.starts_on) : 'Unscheduled'} tone={event.starts_on ? 'info' : 'warning'} dot={false} />}><form action={updateTradeEvent} className="grid gap-3"><input type="hidden" name="id" value={event.id} /><input className={inputClass} name="name" defaultValue={event.name} required /><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} name="city" defaultValue={event.city ?? ''} placeholder="City" /><input className={inputClass} name="country" defaultValue={event.country ?? ''} placeholder="Country" /></div><div className="grid gap-3 sm:grid-cols-2"><input className={inputClass} name="starts_on" type="date" defaultValue={event.starts_on ?? ''} /><input className={inputClass} name="ends_on" type="date" defaultValue={event.ends_on ?? ''} /></div><textarea className={inputClass} name="notes" defaultValue={event.notes ?? ''} placeholder="Notes" /><button type="submit" className={secondaryButtonClass}>Save event</button></form></SectionCard>)}</div></div>;
}

export const PERMISSION_GROUPS = [
  { label: 'Leads', permissions: [
    { key: 'leads.view',   label: 'View leads',   description: 'See lead list, details, and activities' },
    { key: 'leads.create', label: 'Create leads',  description: 'Add new leads and contacts' },
    { key: 'leads.edit',   label: 'Edit leads',    description: 'Update lead fields, stage, and assignment' },
    { key: 'leads.delete', label: 'Delete leads',  description: 'Permanently remove lead records' },
  ]},
  { label: 'Quotes', permissions: [
    { key: 'quotes.view',    label: 'View quotes',           description: 'See all org quotes and versions' },
    { key: 'quotes.create',  label: 'Create & send quotes',  description: 'Draft, generate, and send to buyers' },
    { key: 'quotes.approve', label: 'Approve quotes',        description: 'Override the approval gate for margin exceptions' },
  ]},
  { label: 'Orders', permissions: [
    { key: 'orders.view',    label: 'View orders',           description: 'See order records and documents' },
    { key: 'orders.advance', label: 'Advance order stages',  description: 'Move orders through the execution workflow' },
  ]},
  { label: 'Admin', permissions: [
    { key: 'admin.access', label: 'Admin workspace access', description: 'View and modify Admin Settings pages' },
  ]},
] as const;

export function SecurityAdminWorkspace({ roles, members, approvalThresholdPct = 15 }: { roles: AnyRow[]; members: AnyRow[]; approvalThresholdPct?: number | null }) {
  function roleBadgeStyle(name: string): { bg: string; border: string; color: string } {
    const l = (name ?? '').toLowerCase();
    if (l.includes('owner'))  return { bg: '#f5f3ff', border: '#ddd6fe', color: '#5b21b6' };
    if (l.includes('admin'))  return { bg: '#e0f2fe', border: '#bae6fd', color: '#0369a1' };
    if (l.includes('sales'))  return { bg: '#f0fdf4', border: '#a7f3d0', color: '#15803d' };
    if (l.includes('sourc'))  return { bg: '#fffbeb', border: '#fde68a', color: '#92400e' };
    return { bg: '#f1f5f9', border: '#e2e8f0', color: '#475569' };
  }
  return (
    <div className="space-y-6">
      <SectionCard title="Approval threshold" eyebrow="Commercial governance" description="Quotes deviating above this % require manager approval before they can be sent.">
        <form action={updateApprovalThreshold} className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm font-semibold text-slate-700"><span>Threshold percentage</span><div className="flex items-center gap-2"><input className={`${inputClass} w-32`} name="threshold_pct" type="number" min="0" max="100" step="0.5" defaultValue={approvalThresholdPct ?? 15} /><span className="text-sm text-slate-500">%</span></div></label>
          <button className={buttonClass} type="submit">Save threshold</button>
          {!approvalThresholdPct && <p className="w-full text-xs text-amber-600">⚠ Threshold not set — any pricing override bypasses the approval flow.</p>}
        </form>
      </SectionCard>
      <SectionCard title="Roles & permissions" eyebrow="Access control" description="Click Edit to open the visual permission matrix for a role." actions={<a href="#add-role-drawer" className={buttonClass}>+ Create role</a>}>
        <div className="overflow-x-auto rounded-3xl border border-slate-200">
          <table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-4 py-3">Role</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Permissions</th><th className="px-4 py-3">Members</th><th className="px-4 py-3">Edit</th></tr></thead>
          <tbody>{roles.map((role) => { const s = roleBadgeStyle(role.name); const rolePerms = (role.role_permissions ?? []).map((item: AnyRow) => item.permission).filter(Boolean) as string[]; return (<tr key={role.id} className="border-t border-slate-100 align-middle hover:bg-slate-50"><td className="px-4 py-3"><span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 9px', borderRadius: '999px', background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{role.name}</span></td><td className="px-4 py-3 text-xs text-slate-500">{role.description ?? (role.organization_id ? 'Org role' : 'Global role')}</td><td className="px-4 py-3"><div className="flex flex-wrap gap-1 max-w-[200px]">{rolePerms.slice(0, 3).map((p) => <span key={p} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">{p}</span>)}{rolePerms.length > 3 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">+{rolePerms.length - 3}</span>}{rolePerms.length === 0 && <span className="text-xs text-slate-400">None</span>}</div></td><td className="px-4 py-3"><StatusBadge label={`${role.user_roles?.length ?? 0}`} tone="neutral" dot={false} /></td><td className="px-4 py-3"><a href={`#role-${role.id}`} className={secondaryButtonClass}>Edit</a></td></tr>); })}</tbody></table>
        </div>
        {roles.map((role) => { const rolePerms = new Set((role.role_permissions ?? []).map((item: AnyRow) => item.permission).filter(Boolean) as string[]); return (<div key={`role-drawer-${role.id}`} id={`role-${role.id}`} className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block"><a href="#security-top" className="absolute inset-0" aria-label="Close role drawer" /><aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[500px] flex-col border-l border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Permission matrix</p><h2 className="mt-1 text-lg font-bold text-slate-950">{role.name}</h2><p className="mt-0.5 text-xs text-slate-500">{role.description ?? (role.organization_id ? 'Organization role' : 'Global role')}</p></div><a href="#security-top" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50">X</a></div><form action={updateRolePermissions} className="flex flex-1 flex-col overflow-hidden"><input type="hidden" name="role_id" value={role.id} /><div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">{PERMISSION_GROUPS.map((group) => (<div key={group.label}><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">{group.label}</p><div className="rounded-2xl border border-slate-200 overflow-hidden">{group.permissions.map((perm, idx) => (<label key={perm.key} className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition ${idx > 0 ? 'border-t border-slate-100' : ''}`}><input type="checkbox" name="permissions" value={perm.key} defaultChecked={rolePerms.has(perm.key)} className="mt-0.5 h-4 w-4 rounded" /><div className="flex-1 min-w-0"><p className="text-sm font-semibold text-slate-900">{perm.label}</p><p className="text-xs text-slate-500">{perm.description}</p></div></label>))}</div></div>))}</div><div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4"><a href="#security-top" className={secondaryButtonClass}>Cancel</a><button type="submit" className={buttonClass}>Save permissions</button></div></form></aside></div>); })}
      </SectionCard>
      <div id="add-role-drawer" className="fixed inset-0 z-50 hidden bg-slate-950/30 backdrop-blur-sm target:block"><a href="#security-top" className="absolute inset-0" aria-label="Close" /><aside className="absolute bottom-0 right-0 top-0 flex w-full max-w-[440px] flex-col border-l border-slate-200 bg-white shadow-2xl"><div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Security model</p><h2 className="mt-1 text-lg font-bold text-slate-950">Create role</h2></div><a href="#security-top" className="rounded-full border border-slate-200 px-2 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50">X</a></div><form action={createRole} className="flex flex-1 flex-col overflow-hidden"><div className="flex-1 space-y-4 overflow-y-auto px-6 py-5"><label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Role name<input className={`${inputClass} mt-1 w-full`} name="name" placeholder="e.g. Sales Rep" required /></label><label className="block text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Description<input className={`${inputClass} mt-1 w-full`} name="description" placeholder="Brief description" /></label></div><div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4"><a href="#security-top" className={secondaryButtonClass}>Cancel</a><button type="submit" className={buttonClass}>Create role</button></div></form></aside></div>
      <SectionCard title="Member role coverage" eyebrow="Workspace access" description="Review active memberships and role assignment coverage.">
        <div className="space-y-3">{members.map((member) => { const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles; const memberRoles = (member.user_roles ?? []).map((row: AnyRow) => row.roles?.name).filter(Boolean) as string[]; return (<div key={member.id} className="rounded-3xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{profile?.full_name ?? profile?.email ?? 'Unnamed member'}</p><p className="text-sm text-slate-500">{profile?.email ?? 'No email'}</p></div><BoolBadge value={member.is_active} /></div><div className="mt-3 flex flex-wrap gap-1.5">{memberRoles.length > 0 ? memberRoles.map(r => { const s = roleBadgeStyle(r); return <span key={r} style={{ fontSize: '10px', fontWeight: 700, padding: '2px 9px', borderRadius: '999px', background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>{r}</span>; }) : <span className="text-xs text-slate-400">No role assigned</span>}</div></div>); })}</div>
      </SectionCard>
      <span id="security-top" />
    </div>
  );
}
