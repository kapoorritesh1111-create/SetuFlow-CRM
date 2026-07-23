import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getPackagingProofByToken } from '@/lib/packaging/queries';
import ProofDecisionForm from './proof-decision-form';

/**
 * S27-STARK-D3 — Public artwork proof approval page. No authentication.
 * Access is gated entirely by the approval_token in the URL — a long random
 * value, the only lookup key ever used against packaging_proofs here. Always
 * uses the admin (service-role) client, never a session client, since there
 * is no logged-in user on this route. Shows spec context and the artwork
 * file only — no selling price anywhere on this page.
 */

export default async function ProofApprovalPage({ params }: { params: { token: string } }) {
  const admin = createAdminSupabaseClient();
  if (!admin) {
    return <ErrorShell title="Service unavailable" message="This link can't be processed right now. Please contact your Stark Packmate representative." />;
  }

  const proof = await getPackagingProofByToken(params.token, admin);
  if (!proof) {
    return <ErrorShell title="Link not found" message="This approval link is invalid. Please ask your representative for a new one." />;
  }
  if (new Date(proof.token_expires_at).getTime() < Date.now()) {
    return <ErrorShell title="Link expired" message="This approval link has expired. Please ask your representative to send a new one." />;
  }

  const [{ data: line }, { data: org }] = await Promise.all([
    admin.from('quote_line_items').select('input_snapshot_json, notes').eq('id', proof.quote_line_item_id).maybeSingle(),
    admin.from('organizations').select('name, logo_url').eq('id', proof.organization_id).maybeSingle(),
  ]);
  const specSummary = (line as any)?.input_snapshot_json?.spec_summary ?? (line as any)?.notes ?? 'Packaging artwork';

  const { data: signedUrlData } = await admin.storage.from('lead-attachments').createSignedUrl(proof.file_path, 60 * 60);
  const fileUrl = signedUrlData?.signedUrl ?? null;
  const isImage = (proof.mime_type ?? '').startsWith('image/');

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-slate-50 px-4 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{(org as any)?.name ?? 'Packaging'} · Artwork Proof</p>
        <h1 className="mt-1 text-xl font-bold text-slate-900">{specSummary}</h1>
        <p className="mt-1 text-sm text-slate-500">Version {proof.version} · {proof.file_name}</p>

        <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {fileUrl ? (
            isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fileUrl} alt={proof.file_name} className="max-h-[520px] w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-3 p-10">
                <p className="text-sm font-semibold text-slate-700">{proof.file_name}</p>
                <a href={fileUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">View PDF proof</a>
              </div>
            )
          ) : (
            <p className="p-10 text-center text-sm text-slate-500">Could not load the file preview. Contact your representative.</p>
          )}
        </div>

        <ProofDecisionForm token={proof.approval_token} initialStatus={proof.status} initialComment={proof.review_comment} reviewedAt={proof.reviewed_at} />

        <p className="mt-6 text-xs text-slate-400">This is a private link sent to you for one packaging job. No pricing is shown on this page.</p>
      </div>
    </main>
  );
}

function ErrorShell({ title, message }: { title: string; message: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-slate-50 px-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      </div>
    </main>
  );
}
