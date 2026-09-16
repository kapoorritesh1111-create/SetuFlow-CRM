import { notFound } from 'next/navigation';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import ProofDecisionForm from '@/app/proof-approval/[token]/proof-decision-form';

export const dynamic = 'force-dynamic';

function titleCase(value: unknown) {
  return String(value ?? '').replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

export default async function CustomerDesignReviewPage({ params }: { params: { token: string } }) {
  const admin = createAdminSupabaseClient() as any;
  if (!admin) notFound();
  const token = String(params.token || '').trim();
  if (!token) notFound();

  const { data: lines } = await admin
    .from('quote_line_items')
    .select('id,quote_id,notes,input_snapshot_json')
    .contains('input_snapshot_json', { design_request: { customer_review_token: token } })
    .limit(1);
  const line = lines?.[0];
  if (!line?.id) notFound();

  const { data: quote } = await admin
    .from('quotes')
    .select('id,organization_id,lead_id,quote_number,status')
    .eq('id', line.quote_id)
    .maybeSingle();
  if (!quote?.id) notFound();

  const [{ data: org }, { data: lead }, { data: proofs }, { data: attachments }] = await Promise.all([
    admin.from('organizations').select('name,logo_url').eq('id', quote.organization_id).maybeSingle(),
    quote.lead_id ? admin.from('leads').select('company_name,contact_name').eq('id', quote.lead_id).eq('organization_id', quote.organization_id).maybeSingle() : Promise.resolve({ data: null }),
    admin.from('packaging_proofs').select('id,version,file_path,file_name,mime_type,status,reviewed_at,review_comment,approval_token,token_expires_at,design_source,uploaded_at').eq('organization_id', quote.organization_id).eq('quote_line_item_id', line.id).order('version', { ascending: false }),
    quote.lead_id ? admin.from('lead_attachments').select('id,file_name,mime_type,attachment_type,storage_path,legacy_file_url,created_at').eq('organization_id', quote.organization_id).eq('lead_id', quote.lead_id).in('attachment_type', ['customer_artwork','design_in_progress']).order('created_at', { ascending: false }) : Promise.resolve({ data: [] }),
  ]);

  const snapshot = line.input_snapshot_json ?? {};
  const request = snapshot.design_request ?? {};
  const specSummary = snapshot.spec_summary ?? line.notes ?? 'Packaging design';
  const latestProof = proofs?.[0] ?? null;
  let latestFileUrl: string | null = null;
  if (latestProof?.file_path) {
    const { data } = await admin.storage.from('lead-attachments').createSignedUrl(latestProof.file_path, 60 * 60);
    latestFileUrl = data?.signedUrl ?? null;
  }

  const designStage = latestProof
    ? latestProof.status === 'approved' ? 'Final design approved' : latestProof.status === 'rejected' ? 'Changes requested' : `Proof v${latestProof.version} awaiting review`
    : 'Design in progress';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-300">{org?.name || 'Stark Packmate'} · Design Collaboration</p>
              <h1 className="mt-2 text-3xl font-black">Your Packaging Design Workspace</h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-300">This is separate from your commercial quote link. Use this page with the Design Team before or after quote approval to review artwork, follow revisions, approve the current proof, or request design changes.</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-300">Quote reference</div>
              <div className="text-lg font-black">{quote.quote_number || 'Packaging quote'}</div>
              <div className="mt-1 text-xs font-semibold text-slate-300">Commercial status: {titleCase(quote.status)}</div>
            </div>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-black uppercase tracking-wide text-slate-400">Customer</div><div className="mt-1 font-black">{lead?.company_name || lead?.contact_name || 'Customer'}</div>{lead?.contact_name ? <div className="text-sm text-slate-500">{lead.contact_name}</div> : null}</div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="text-xs font-black uppercase tracking-wide text-slate-400">Design item</div><div className="mt-1 font-black">{specSummary}</div></div>
          <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 shadow-sm"><div className="text-xs font-black uppercase tracking-wide text-cyan-700">Current design status</div><div className="mt-1 font-black text-cyan-950">{designStage}</div></div>
        </section>

        {attachments?.length ? (
          <section className="rounded-3xl border border-violet-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-700">Shared Artwork</p>
            <h2 className="mt-1 text-xl font-black">Customer artwork & design-in-progress files</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">These are the working files attached to this lead. Each opens in a new tab.</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {attachments.map((attachment: any) => (
                <a key={attachment.id} href={`/api/public/design-attachment/${token}/${attachment.id}`} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-violet-300 hover:bg-violet-50">
                  <div className="text-[10px] font-black uppercase tracking-wide text-violet-600">{titleCase(attachment.attachment_type)}</div>
                  <div className="mt-1 text-sm font-black text-slate-900">{attachment.file_name}</div>
                  <div className="mt-2 text-xs font-bold text-slate-500">Open attachment ↗</div>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-700">Current Proof</p>
          {!latestProof ? (
            <div className="mt-3 rounded-2xl border border-dashed border-cyan-300 bg-cyan-50 p-6">
              <h2 className="text-xl font-black text-cyan-950">Design work has started</h2>
              <p className="mt-2 text-sm font-semibold text-cyan-900/70">The Design Team is preparing the first customer proof. Keep this same link — when v1 is uploaded it will appear here automatically.</p>
              {request.due_date ? <p className="mt-3 text-xs font-black uppercase tracking-wide text-cyan-700">Target date: {request.due_date}</p> : null}
            </div>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black">Proof v{latestProof.version}</h2><p className="text-sm font-semibold text-slate-500">{latestProof.file_name} · {titleCase(latestProof.design_source)}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{titleCase(latestProof.status)}</span></div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                {latestFileUrl ? ((latestProof.mime_type || '').startsWith('image/') ? <img src={latestFileUrl} alt={latestProof.file_name} className="max-h-[620px] w-full object-contain" /> : <div className="flex flex-col items-center gap-3 p-10"><p className="text-sm font-black">{latestProof.file_name}</p><a href={latestFileUrl} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white">Open proof in new tab ↗</a></div>) : <p className="p-10 text-center text-sm font-semibold text-slate-500">The proof preview could not be loaded. Contact your Stark Packmate representative.</p>}
              </div>
              <ProofDecisionForm token={latestProof.approval_token} initialStatus={latestProof.status} initialComment={latestProof.review_comment} reviewedAt={latestProof.reviewed_at} />
            </>
          )}
        </section>

        {proofs?.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Revision History</p>
            <h2 className="mt-1 text-xl font-black">Design versions</h2>
            <div className="mt-4 space-y-2">{proofs.map((proof: any, index: number) => <div key={proof.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 p-3"><div><span className="font-black">v{proof.version}</span><span className="ml-2 text-sm font-semibold text-slate-600">{proof.file_name}</span>{index === 0 ? <span className="ml-2 rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-black text-cyan-700">Current</span> : null}</div><div className="text-xs font-black text-slate-500">{titleCase(proof.status)}{proof.review_comment ? ` · ${proof.review_comment}` : ''}</div></div>)}</div>
          </section>
        ) : null}

        <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">One persistent design link</p>
          <p className="mt-2 text-sm font-semibold text-emerald-950/75">Keep using this URL throughout the design process. New proof versions replace the current proof above while the revision history remains visible. Commercial quote approval is handled separately through the Quote Review link.</p>
        </section>
      </div>
    </main>
  );
}
