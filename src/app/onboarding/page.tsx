import Link from 'next/link';
import { submitClientOnboardingRequest } from '@/features/client-onboarding/server/actions';

const defaultPipelineStages = ['New lead', 'Qualified', 'Samples / documents', 'Quote sent', 'Negotiation', 'Won', 'Lost'];
const defaultPipelines = ['Buyer pipeline', 'Supplier pipeline'];
const defaultNextSteps = ['Call back', 'Send catalog', 'Send quote', 'Share sample details', 'Follow up after trade show', 'Schedule meeting'];
const defaultMarkets = ['North America', 'Middle East', 'Europe', 'Asia Pacific'];

function Field({ label, name, placeholder, required = false, type = 'text' }: { label: string; name: string; placeholder?: string; required?: boolean; type?: string }) {
  return <label className="block"><span className="text-sm font-semibold text-slate-800">{label}{required ? <span className="text-rose-600"> *</span> : null}</span><input name={name} required={required} type={type} placeholder={placeholder} className="mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></label>;
}
function TextArea({ label, name, placeholder, defaultValue, rows = 4 }: { label: string; name: string; placeholder?: string; defaultValue?: string; rows?: number }) {
  return <label className="block"><span className="text-sm font-semibold text-slate-800">{label}</span><textarea name={name} rows={rows} placeholder={placeholder} defaultValue={defaultValue} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100" /></label>;
}
function DefaultList({ title, items, note }: { title: string; items: string[]; note: string }) {
  return <div className="rounded-3xl border border-blue-100 bg-blue-50/70 p-4"><p className="text-sm font-bold text-slate-950">{title}</p><p className="mt-1 text-xs leading-5 text-slate-600">{note}</p><div className="mt-3 flex flex-wrap gap-2">{items.map((item) => <span key={item} className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-semibold text-blue-800">{item}</span>)}</div></div>;
}

export default function ClientOnboardingPage({ searchParams }: { searchParams?: { notice?: string } }) {
  const notice = searchParams?.notice;
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div><div className="flex items-center gap-3"><img src="/logos/setu-flow-logo.png" alt="Setu Flow" width={52} height={52} className="rounded-2xl" /><div><p className="text-xs font-extrabold uppercase tracking-[0.22em] text-blue-600">Setu Flow Client Onboarding</p><h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Create your workspace request</h1></div></div><p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">Fill this out once. Our team uses it to create your company workspace, apply default workflow lists, configure markets and countries, then send the first admin login.</p></div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 lg:max-w-sm"><p className="font-bold text-slate-950">Workspace URL format</p><p className="mt-1"><span className="font-semibold text-blue-700">companyname.setuflowcrm.com</span></p><p className="mt-2 text-xs text-slate-500">If no logo is supplied, the Setu Flow logo is used until your team uploads a brand asset.</p></div>
          </div>
        </header>
        {notice === 'missing-required' ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Company name and primary admin email are required.</div> : null}
        <section className="grid gap-4 lg:grid-cols-2"><DefaultList title="Pipeline stages" items={defaultPipelineStages} note="We preload these. Your admin can edit or remove them after setup." /><DefaultList title="Pipelines" items={defaultPipelines} note="Buyer and supplier pipelines are editable/removable in Admin." /><DefaultList title="Next steps" items={defaultNextSteps} note="Follow-up labels are editable/removable in Admin." /><DefaultList title="Markets" items={defaultMarkets} note="Markets and countries are prefilled from this form, then editable/removable in Admin." /></section>
        <form action={submitClientOnboardingRequest} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] sm:p-8"><div className="grid gap-8">
          <section><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">1. Company identity</p><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Company name" name="company_name" required placeholder="Blue Orbit International" /><Field label="Website" name="website" placeholder="https://example.com" /><Field label="Logo URL" name="logo_url" placeholder="Optional. Leave blank to use Setu Flow logo." /><Field label="Headquarters country" name="headquarters_country" placeholder="India" /></div></section>
          <section><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">2. First admin login</p><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Primary admin name" name="primary_admin_name" placeholder="Full name" /><Field label="Primary admin email" name="primary_admin_email" type="email" required placeholder="admin@example.com" /><Field label="Phone / WhatsApp" name="primary_phone" placeholder="Optional" /></div></section>
          <section><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">3. Markets, countries, and workflow</p><div className="mt-5 grid gap-4 md:grid-cols-2"><TextArea label="Markets to configure" name="requested_markets" defaultValue={defaultMarkets.join('\n')} /><TextArea label="Countries to configure" name="requested_countries" placeholder={'United States\nCanada\nUnited Arab Emirates'} /><TextArea label="Pipelines to preload" name="requested_pipelines" defaultValue={defaultPipelines.join('\n')} /><TextArea label="Pipeline stages to preload" name="requested_pipeline_stages" defaultValue={defaultPipelineStages.join('\n')} /><TextArea label="Next steps to preload" name="requested_next_steps" defaultValue={defaultNextSteps.join('\n')} /><TextArea label="Pricing rules notes" name="pricing_rules_notes" placeholder="FOB/CIF/EXW rules, customer tiers, currency preferences, approval thresholds..." /></div><label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700"><input name="wants_trade_events" type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" /><span><strong className="text-slate-950">Enable trade events during setup.</strong> Use this when the client wants show/event capture, contact exchange, and follow-up workflows from day one.</span></label></section>
          <section><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-600">4. Products and categories</p><div className="mt-5 grid gap-4 md:grid-cols-2"><TextArea label="Product category notes" name="product_category_notes" placeholder="Categories are client-created. Tell us how you want to organize products, but final categories are created in your workspace." /><TextArea label="Additional setup notes" name="additional_notes" placeholder="Anything else the Setu Flow team should know before setup." /></div></section>
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl text-sm leading-6 text-slate-600">After submission, Setu Flow creates the workspace, preloads editable defaults, and sends the first admin invitation.</p><button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800">Submit onboarding form</button></div>
        </div></form>
        <p className="text-center text-sm text-slate-500">Already invited? <Link className="font-semibold text-blue-700 hover:text-blue-900" href="/client-login">Open client login</Link></p>
      </div>
    </main>
  );
}
