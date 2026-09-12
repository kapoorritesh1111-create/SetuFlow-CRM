import Link from 'next/link';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic='force-dynamic';
export default async function MailCrmLinkPage({searchParams}:{searchParams:{thread?:string;entityType?:string;entityId?:string;label?:string;returnTo?:string}}){
  await requireWorkspace();
  const thread=String(searchParams.thread||''),entityType=String(searchParams.entityType||''),entityId=String(searchParams.entityId||''),label=String(searchParams.label||'CRM record'),returnTo=String(searchParams.returnTo||'/mail');
  return <div className="mx-auto max-w-xl p-8"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="text-[10px] font-black uppercase tracking-[.14em] text-blue-600">Setu Mail · CRM link</div><h1 className="mt-1 text-xl font-black text-slate-950">Link this conversation?</h1><p className="mt-3 text-sm leading-6 text-slate-600">Link the Mail thread to <strong>{label}</strong>. This does not create a Contact or Lead and does not change the CRM record.</p><form action="/api/mail/crm-links" method="post" className="mt-6 flex gap-2"><input type="hidden" name="threadId" value={thread}/><input type="hidden" name="entityType" value={entityType}/><input type="hidden" name="entityId" value={entityId}/><input type="hidden" name="returnTo" value={returnTo}/><button disabled={!thread||!entityId} className="rounded-lg bg-[#0b2e4a] px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Link conversation</button><Link href={returnTo} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600">Cancel</Link></form></div></div>;
}
